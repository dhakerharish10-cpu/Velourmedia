import { createClient } from 'npm:@supabase/supabase-js@2'

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
)

const SITE_URL = (Deno.env.get('SITE_URL') ?? Deno.env.get('APP_URL') ?? 'https://velourmedia.site').replace(/\/+$/, '')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'VelourMedia <access@velourmedia.site>'
const ACCESS_LINK_DAYS = Math.max(1, Number(Deno.env.get('ACCESS_LINK_DAYS') ?? '365') || 365)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const HASH_RE = /^[0-9a-f]{64}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function verifyWhopSignature(rawBody: string, headers: Headers, secret: string): Promise<boolean> {
  const signatureHeader = headers.get('webhook-signature')
  const webhookId = headers.get('webhook-id')
  const webhookTimestamp = headers.get('webhook-timestamp')
  if (!signatureHeader || !webhookId || !webhookTimestamp) {
    console.warn('whop-webhook: missing signature headers')
    return false
  }

  const ts = Number(webhookTimestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    console.warn('whop-webhook: timestamp out of range', webhookTimestamp)
    return false
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${webhookId}.${webhookTimestamp}.${rawBody}`),
  )
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)))

  for (const part of signatureHeader.split(' ')) {
    const [version, value] = part.trim().split(',')
    if (version === 'v1' && value && timingSafeEqual(value, expected)) return true
  }
  console.warn('whop-webhook: signature mismatch')
  return false
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function toCents(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null
}

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function newAccessToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function pickEmail(p: any, m: any): string | null {
  const candidates = [
    m?.buyer_email,
    p?.user?.email,
    p?.member?.user?.email,
    p?.customer?.email,
    p?.customer_email,
    p?.email,
    p?.billing_address?.email,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && EMAIL_RE.test(c.trim())) return c.trim().toLowerCase()
  }
  return null
}

async function sendAccessEmail(to: string, link: string, title: string | null): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY is not set' }
  const safeTitle = title ? escapeHtml(title) : null
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">` +
    `<h2 style="margin:0 0 12px">Your purchase is ready</h2>` +
    (safeTitle
      ? `<p style="margin:0 0 16px">Thanks for your purchase of <strong>${safeTitle}</strong>.</p>`
      : `<p style="margin:0 0 16px">Thanks for your purchase.</p>`) +
    `<p style="margin:0 0 20px">Use the button below to open it on any device. Keep this email: the link is your proof of purchase.</p>` +
    `<p style="margin:0 0 24px"><a href="${link}" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Open my purchase</a></p>` +
    `<p style="font-size:12px;color:#666;margin:0">If the button does not work, copy this address into your browser:<br>${escapeHtml(link)}</p>` +
    `<p style="font-size:12px;color:#666;margin:16px 0 0">Anyone with this link can open your purchase, so please do not share it.</p>` +
    `</div>`
  const text =
    `Your purchase is ready.\n\n` +
    (title ? `Item: ${title}\n\n` : '') +
    `Open it here (keep this email, the link is your proof of purchase):\n${link}\n\n` +
    `Anyone with this link can open your purchase, so please do not share it.`
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ from: RESEND_FROM, to: [to], subject: 'Your VelourMedia access link', html, text }),
    })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      console.error('whop-webhook: Resend error', res.status, t.slice(0, 300))
      return { ok: false, error: `Resend returned ${res.status}` }
    }
    return { ok: true }
  } catch (e) {
    const timedOut = e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError')
    console.error('whop-webhook: Resend request failed:', timedOut ? 'timeout' : e)
    return { ok: false, error: timedOut ? 'Resend timed out' : 'Resend request failed' }
  }
}

async function sendSaleAlertEmail(
  creatorId: string | null,
  contentTitle: string | null,
  grossAmount: number,
  feeAmount: number,
  netAmount: number,
): Promise<void> {
  if (!creatorId || !RESEND_API_KEY) return
  try {
    const { data: creator } = await admin
      .from('profiles')
      .select('email_sales_alerts, display_name, username, owner_id')
      .eq('id', creatorId)
      .maybeSingle()

    if (!creator || !creator.email_sales_alerts) return

    const ownerId = creator.owner_id || creatorId
    const { data: ownerAuth } = await admin.auth.admin.getUserById(ownerId)
    const creatorEmail = ownerAuth?.user?.email
    if (!creatorEmail) return

    const creatorName = escapeHtml(creator.display_name || creator.username || 'Creator')
    const safeTitle = escapeHtml(contentTitle || 'Your content')
    const grossStr = grossAmount.toFixed(2)
    const feeStr = feeAmount.toFixed(2)
    const netStr = netAmount.toFixed(2)
    const dashboardLink = `${SITE_URL}/dashboard`

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); border-radius: 16px; padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 22px; margin: 0 0 8px;">You made a sale!</h1>
          <p style="color: #c7d2fe; font-size: 14px; margin: 0;">Hi ${creatorName}, you just earned $${netStr} USD.</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-top: 16px;">
          <table style="width: 100%; font-size: 14px; color: #334155;">
            <tr><td style="padding: 8px 0; color: #64748b;">Sale Amount</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">$${grossStr}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Platform Fee</td><td style="padding: 8px 0; text-align: right; color: #ef4444;">-$${feeStr}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; border-top: 1px solid #f1f5f9;">Your Net Earnings</td><td style="padding: 8px 0; text-align: right; font-weight: 700; color: #059669; border-top: 1px solid #f1f5f9;">$${netStr}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Post Title</td><td style="padding: 8px 0; text-align: right;">${safeTitle}</td></tr>
          </table>
          <a href="${dashboardLink}" style="display: inline-block; margin-top: 20px; padding: 12px 28px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px;">Go to Dashboard</a>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px;">VelourMedia — Premium Creator Content Platform</p>
      </div>
    `

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [creatorEmail],
        subject: `New Sale Alert! You earned $${netStr} USD on VelourMedia`,
        html,
      }),
    })
  } catch (err) {
    console.error('whop-webhook: sendSaleAlertEmail error', err)
  }
}

function safePayload(event: any) {
  const p = event?.data ?? {}
  const m = p?.metadata ?? p?.payment?.metadata ?? {}
  return {
    type: event?.type ?? null,
    id: p?.id ?? null,
    payment_id: p?.payment?.id ?? p?.payment_id ?? null,
    status: p?.status ?? null,
    subtotal: p?.subtotal ?? null,
    total: p?.total ?? null,
    currency: p?.currency ?? null,
    metadata: {
      type: m.type ?? null,
      content_id: m.content_id ?? null,
      creator_id: m.creator_id ?? null,
      buyer_id: m.buyer_id ?? null,
      price: m.price ?? null,
      has_email: !!pickEmail(p, m),
      has_claim: !!m.claim_hash,
    },
  }
}

async function logEvent(row: {
  event_type?: string | null
  payment_id?: string | null
  status: string
  error?: string | null
  payload?: unknown
}) {
  try {
    const { error } = await admin.from('webhook_events').insert({ provider: 'whop', ...row })
    if (error) console.error('whop-webhook: could not write webhook_events', error.message)
  } catch (e) {
    console.error('whop-webhook: webhook_events write threw', e)
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  try {
  const secret = Deno.env.get('WHOP_WEBHOOK_SECRET')
  if (!secret) {
    console.error('whop-webhook: WHOP_WEBHOOK_SECRET is not set')
    return new Response('server not configured', { status: 500 })
  }

  const body = await req.text()
  if (!(await verifyWhopSignature(body, req.headers, secret))) {
    return new Response('invalid signature', { status: 400 })
  }

  let event: any
  try {
    event = JSON.parse(body)
  } catch {
    console.error('whop-webhook: verified request had invalid JSON')
    return new Response('bad json', { status: 400 })
  }

  const payload = safePayload(event)
  const eventType: string | null = event?.type ?? null

  // ---- Refunds and disputes: revoke access and update status ----
  if (typeof eventType === 'string' && /^(refund|dispute)\./.test(eventType)) {
    const d = event?.data ?? {}
    const paymentId: string | null = d?.payment?.id ?? d?.payment_id ?? null
    const refunded = eventType.startsWith('refund.') && d?.status === 'succeeded'
    const disputed = eventType === 'dispute.created'
    if (paymentId && (refunded || disputed)) {
      const { error } = await admin
        .from('purchases')
        .update({ status: refunded ? 'refunded' : 'disputed', status_changed_at: new Date().toISOString() })
        .eq('payment_id', paymentId)
      if (error) {
        console.error('whop-webhook: could not mark purchase', paymentId, error.message)
        await logEvent({
          event_type: eventType,
          payment_id: paymentId,
          status: 'failed',
          error: `db error: ${error.message}`,
          payload,
        })
        return new Response('db error', { status: 500 })
      }
      console.log('whop-webhook: purchase marked', { payment: paymentId, status: refunded ? 'refunded' : 'disputed' })
    } else if (!paymentId) {
      console.warn('whop-webhook: refund/dispute event without a payment reference', eventType)
    }
    await logEvent({
      event_type: eventType,
      payment_id: paymentId,
      status: paymentId && (refunded || disputed) ? 'needs_review' : 'ignored',
      error:
        paymentId && (refunded || disputed)
          ? `${eventType}: access removed, review the payout`
          : paymentId
          ? 'no status change'
          : 'no payment reference',
      payload,
    })
    return new Response('ok')
  }

  if (event.type !== 'payment.succeeded') {
    await logEvent({
      event_type: eventType,
      payment_id: event?.data?.id ?? null,
      status: 'ignored',
      error: 'not a payment.succeeded event',
      payload,
    })
    return new Response('ignored')
  }

  const p = event.data
  const m = p?.metadata ?? {}
  if (m.type !== 'content_unlock' || !m.content_id) {
    console.log('whop-webhook: ignored event without content_unlock metadata', p?.id)
    await logEvent({
      event_type: eventType,
      payment_id: p?.id ?? null,
      status: 'ignored',
      error: 'no content_unlock metadata',
      payload,
    })
    return new Response('ignored')
  }

  if (!UUID_RE.test(String(m.content_id))) {
    console.error('whop-webhook: invalid content_id in metadata', p?.id)
    await logEvent({
      event_type: eventType,
      payment_id: p?.id ?? null,
      status: 'ignored',
      error: 'invalid content_id in metadata',
      payload,
    })
    return new Response('ignored')
  }

  // Deduplication check
  const { data: existing } = await admin.from('purchases').select('id').eq('payment_id', p.id).limit(1)
  if (existing && existing.length > 0) {
    await logEvent({ event_type: eventType, payment_id: p.id, status: 'duplicate', payload })
    return new Response('ok')
  }

  const rawBuyer = typeof m.buyer_id === 'string' ? m.buyer_id.trim() : ''
  const buyerId: string | null = UUID_RE.test(rawBuyer) ? rawBuyer : null
  const buyerEmail: string | null = pickEmail(p, m)
  const claimHash: string | null =
    typeof m.claim_hash === 'string' && HASH_RE.test(m.claim_hash.trim()) ? m.claim_hash.trim().toLowerCase() : null
  const unreachable = !buyerId && !buyerEmail && !claimHash
  if (unreachable) console.warn('whop-webhook: purchase has no buyer_id, email or claim', p?.id)

  const isGuest = !buyerId
  let rawToken: string | null = null
  let tokenHash: string | null = null
  let expiresAt: string | null = null
  if (isGuest && buyerEmail) {
    rawToken = newAccessToken()
    tokenHash = await sha256Hex(rawToken)
    expiresAt = new Date(Date.now() + ACCESS_LINK_DAYS * 86400000).toISOString()
  }

  const subtotalCents = toCents(p.subtotal)
  const totalCents = toCents(p.total)

  // Fetch content details (price, title, creator_id)
  const { data: contentRow } = await admin
    .from('content')
    .select('price, title, creator_id')
    .eq('id', m.content_id)
    .maybeSingle()

  let priceCents = toCents(m.price)
  if (priceCents === null) priceCents = subtotalCents
  if (priceCents === null) priceCents = toCents(contentRow?.price)

  if (priceCents === null) {
    console.error('whop-webhook: could not determine price for payment', p?.id)
    await logEvent({
      event_type: eventType,
      payment_id: p?.id ?? null,
      status: 'failed',
      error: 'could not determine price',
      payload,
    })
    return new Response('amount error', { status: 500 })
  }

  if (subtotalCents !== null && Math.abs(subtotalCents - priceCents) > 1) {
    console.warn('whop-webhook: PRICE MISMATCH', {
      payment: p.id,
      intended_cents: priceCents,
      whop_subtotal_raw: p.subtotal,
      whop_total_raw: p.total,
    })
  }

  // Platform fee % (default 30 => 70% to creator)
  const { data: settings } = await admin
    .from('platform_settings')
    .select('platform_fee_percent')
    .eq('id', 1)
    .maybeSingle()
  let pct = Number(settings?.platform_fee_percent ?? 30)
  if (!Number.isFinite(pct)) pct = 30
  pct = Math.min(100, Math.max(0, pct))
  const pctBp = Math.round(pct * 100)

  const feeCents = Math.floor((priceCents * pctBp + 5000) / 10000)
  const netCents = priceCents - feeCents

  const amountPaid = priceCents / 100
  const platformFee = feeCents / 100
  const netToCreator = netCents / 100
  const creatorId =
    typeof m.creator_id === 'string' && UUID_RE.test(m.creator_id)
      ? m.creator_id
      : (contentRow?.creator_id as string | null) ?? null

  // Check duplicate buyer + content purchase
  let isSecondPayment = false
  if (buyerId || buyerEmail) {
    let dupQuery = admin
      .from('purchases')
      .select('payment_id')
      .eq('content_id', m.content_id)
      .neq('payment_id', p.id)
      .limit(1)
    dupQuery = buyerId
      ? dupQuery.eq('buyer_id', buyerId)
      : dupQuery.is('buyer_id', null).eq('buyer_email', buyerEmail as string)
    const { data: dup } = await dupQuery
    if (dup && dup.length > 0) {
      isSecondPayment = true
      console.warn('whop-webhook: DUPLICATE PURCHASE, review for refund', {
        payment: p.id,
        existing: dup[0].payment_id,
      })
    }
  }

  // Record purchase
  const { error } = await admin.from('purchases').upsert(
    {
      buyer_id: buyerId,
      content_id: m.content_id,
      payment_id: p.id,
      payment_provider: 'whop',
      amount_paid: amountPaid,
      gross_paid: totalCents !== null ? totalCents / 100 : null,
      platform_fee: platformFee,
      net_to_creator: netToCreator,
      buyer_email: buyerEmail,
      claim_hash: claimHash,
      access_token_hash: tokenHash,
      expires_at: expiresAt,
      status: 'active',
    },
    { onConflict: 'payment_id', ignoreDuplicates: true },
  )

  if (error) {
    console.error('whop-webhook: db error', error)
    await logEvent({
      event_type: eventType,
      payment_id: p.id,
      status: 'failed',
      error: `db error: ${error.message}`,
      payload,
    })
    return new Response('db error', { status: 500 })
  }

  // Record in transactions table if applicable
  if (creatorId) {
    const { data: existingTx } = await admin
      .from('transactions')
      .select('id')
      .eq('payment_id', p.id)
      .maybeSingle()
    if (!existingTx) {
      const { error: txErr } = await admin
        .from('transactions')
        .insert({
          payment_id: p.id,
          order_id: typeof m.order_id === 'string' && m.order_id ? m.order_id : p.id,
          creator_id: creatorId,
          content_id: m.content_id,
          buyer_id: buyerId,
          event_type: 'payment.succeeded',
          checkout_type: 'content',
          amount: amountPaid,
          currency: 'usd',
          status: 'succeeded',
          creator_earnings: netToCreator,
          platform_earnings: platformFee,
          raw_payload: payload,
        })
      if (txErr) console.warn('whop-webhook: transactions insert skipped/failed', txErr.message)
    }
  }

  console.log('whop-webhook: purchase recorded', {
    payment: p.id,
    guest: isGuest,
    price_cents: priceCents,
    gross_cents: totalCents,
    fee_cents: feeCents,
    net_cents: netCents,
  })

  // Send buyer access email to ALL buyers (guest and logged-in)
  let emailProblem: string | null = null
  if (buyerEmail) {
    if (isGuest) {
      // Guest: use the token-based access link
      if (rawToken && tokenHash) {
        const { data: stored } = await admin
          .from('purchases')
          .select('id')
          .eq('payment_id', p.id)
          .eq('access_token_hash', tokenHash)
          .limit(1)
        if (stored && stored.length > 0) {
          const link = `${SITE_URL}/access?token=${encodeURIComponent(rawToken)}`
          const sent = await sendAccessEmail(buyerEmail, link, contentRow?.title ?? null)
          if (sent.ok) {
            console.log('whop-webhook: guest access email sent', { payment: p.id })
          } else {
            emailProblem = `access email failed: ${sent.error ?? 'unknown error'}`
          }
        }
      } else {
        emailProblem = 'guest purchase without an email address: no access link was sent'
      }
    } else {
      // Logged-in buyer: send a link to the content in their library
      const contentLink = `${SITE_URL}/u/${m.content_id}`
      const sent = await sendAccessEmail(buyerEmail, contentLink, contentRow?.title ?? null)
      if (sent.ok) {
        console.log('whop-webhook: buyer access email sent', { payment: p.id })
      } else {
        emailProblem = `buyer email failed: ${sent.error ?? 'unknown error'}`
      }
    }
  } else if (isGuest) {
    emailProblem = 'guest purchase without an email address: no access link was sent'
  }

  // Send creator sale alert email
  await sendSaleAlertEmail(creatorId, contentRow?.title ?? null, amountPaid, platformFee, netToCreator)

  const notes: string[] = []
  if (unreachable) notes.push('no buyer_id, email or claim: this purchase cannot be unlocked by anyone')
  if (emailProblem) notes.push(emailProblem + (claimHash ? " (the buyer's browser can still unlock it)" : ''))
  if (isSecondPayment) notes.push('second payment for the same buyer and content: review for refund')

  if (notes.length > 0) {
    await logEvent({ event_type: eventType, payment_id: p.id, status: 'needs_review', error: notes.join('; '), payload })
  } else {
    await logEvent({ event_type: eventType, payment_id: p.id, status: 'recorded', payload })
  }

  return new Response('ok')
  } catch (err) {
    console.error('whop-webhook: unhandled error', err)
    try {
      await logEvent({ event_type: 'unknown', status: 'failed', error: err instanceof Error ? err.message : String(err) })
    } catch {}
    return new Response('internal error', { status: 500 })
  }
})
