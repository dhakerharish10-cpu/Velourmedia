import { createClient } from '@supabase/supabase-js';

export type JsonRecord = Record<string, unknown>;

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, x-guest-token',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// The frontend is built against VITE_SUPABASE_URL, so fall back to it to make sure
// the functions always talk to the same Supabase project as the browser.
export function getSupabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
}

export function getServiceClient() {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('Payment backend is not configured (SUPABASE_URL missing).');
  if (!key) throw new Error('Payment backend is not configured (SUPABASE_SERVICE_ROLE_KEY missing).');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export type ServiceClient = ReturnType<typeof getServiceClient>;

export async function sendSaleAlertEmail(
  supabase: ServiceClient,
  intent: JsonRecord,
  netToCreator: number,
): Promise<void> {
  try {
    const creatorId = typeof intent.creator_id === 'string' ? intent.creator_id : '';
    if (!creatorId) return;

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn('[whop] RESEND_API_KEY not configured — skipping sale alert email');
      return;
    }

    const { data: creator } = await supabase
      .from('profiles')
      .select('email_sales_alerts, display_name, username, owner_id')
      .eq('id', creatorId)
      .maybeSingle();
    if (!creator || !creator.email_sales_alerts) return;

    const ownerId = creator.owner_id || creatorId;
    const { data: ownerAuth } = await supabase.auth.admin.getUserById(ownerId);
    const creatorEmail = ownerAuth?.user?.email;
    if (!creatorEmail) return;

    let contentTitle = 'Your content';
    let contentType = 'content';
    if (intent.checkout_type === 'content' && intent.content_id) {
      const { data: content } = await supabase
        .from('content')
        .select('title')
        .eq('id', intent.content_id)
        .maybeSingle();
      if (content?.title) contentTitle = content.title;
    } else if (intent.checkout_type === 'tip') {
      contentType = 'tip';
      contentTitle = 'Tip from a fan';
    } else if (intent.checkout_type === 'subscription') {
      contentType = 'subscription';
      contentTitle = 'Monthly subscription';
    }

    const grossAmount = Number(intent.amount).toFixed(2);
    const netAmount = netToCreator.toFixed(2);
    const creatorName = creator.display_name || creator.username || 'Creator';
    const appUrl = process.env.APP_URL || process.env.URL || 'https://velourmedia.site';
    const dashboardLink = `${appUrl}/#/dashboard`;

    const subject = contentType === 'tip'
      ? `New Tip Alert! You earned ${netAmount} USD on VelourMedia`
      : `New Sale Alert! You earned ${netAmount} USD on VelourMedia`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); border-radius: 16px; padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 22px; margin: 0 0 8px;">You made a sale!</h1>
          <p style="color: #c7d2fe; font-size: 14px; margin: 0;">Hi ${creatorName}, you just earned ${netAmount} USD.</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-top: 16px;">
          <table style="width: 100%; font-size: 14px; color: #334155;">
            <tr><td style="padding: 8px 0; color: #64748b;">Sale Amount</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${grossAmount}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Platform Fee (30%)</td><td style="padding: 8px 0; text-align: right; color: #ef4444;">-${(Number(grossAmount) - Number(netAmount)).toFixed(2)}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; border-top: 1px solid #f1f5f9;">Your Net Earnings (70%)</td><td style="padding: 8px 0; text-align: right; font-weight: 700; color: #059669; border-top: 1px solid #f1f5f9;">${netAmount}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">${contentType === 'subscription' ? 'Subscriber' : 'Post Title'}</td><td style="padding: 8px 0; text-align: right;">${contentTitle}</td></tr>
          </table>
          <a href="${dashboardLink}" style="display: inline-block; margin-top: 20px; padding: 12px 28px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px;">Go to Dashboard</a>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px;">VelourMedia — Premium Creator Content Platform</p>
      </div>
    `;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'VelourMedia <noreply@velourmedia.com>',
        to: [creatorEmail],
        subject,
        html,
      }),
    });
    console.log('[whop] sale alert email sent', { creatorId });
  } catch (err) {
    console.error('[whop] sendSaleAlertEmail error', err);
  }
}

export async function activatePurchase(
  supabase: ServiceClient,
  intent: JsonRecord,
  paymentId: string | null,
): Promise<boolean> {
  const platformFee = Math.round(Number(intent.amount) * 0.3 * 100) / 100;
  const netToCreator = Math.round((Number(intent.amount) - platformFee) * 100) / 100;

  if (intent.buyer_id) {
    if (intent.checkout_type === 'content') {
      const { error } = await supabase.from('purchases').upsert({
        buyer_id: intent.buyer_id,
        content_id: intent.content_id,
        amount_paid: intent.amount,
        payment_id: paymentId,
        payment_provider: 'whop',
        platform_fee: platformFee,
        net_to_creator: netToCreator,
      }, { onConflict: 'buyer_id,content_id', ignoreDuplicates: true });
      if (error) {
        console.error('[whop] purchase upsert failed', error);
        return false;
      }
    } else if (intent.checkout_type === 'tip') {
      console.log('[whop] tip processed', { buyer: intent.buyer_id, creator: intent.creator_id, amount: intent.amount, net: netToCreator });
    } else {
      const { error } = await supabase.from('subscriptions').upsert({
        subscriber_id: intent.buyer_id,
        creator_id: intent.creator_id,
        amount: intent.amount,
        status: 'active',
        payment_id: paymentId,
        payment_provider: 'whop',
        platform_fee: platformFee,
        net_to_creator: netToCreator,
      }, { onConflict: 'subscriber_id,creator_id', ignoreDuplicates: true });
      if (error) {
        console.error('[whop] subscription upsert failed', error);
        return false;
      }
    }
  }

  await sendSaleAlertEmail(supabase, intent, netToCreator);
  return true;
}
