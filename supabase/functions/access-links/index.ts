import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Buyer-Email",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase service configuration is missing.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

const SITE_URL = "https://velourmedia.site";

function getAppUrl(req: Request): string {
  const candidates = [
    Deno.env.get("APP_URL"),
    Deno.env.get("SITE_URL"),
    req.headers.get("Origin"),
    req.headers.get("Referer"),
  ];
  for (const candidate of candidates) {
    if (!candidate?.trim()) continue;
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.origin;
    } catch {
      continue;
    }
  }
  return SITE_URL;
}

// Generate a signed URL for a paid-media storage path (valid for 2 hours).
// If the path is already a full URL (free content), return it as-is.
async function resolveMediaUrl(
  supabase: ReturnType<typeof getServiceClient>,
  mediaUrl: string,
): Promise<string> {
  if (/^https?:\/\//i.test(mediaUrl)) return mediaUrl;
  // mediaUrl is a storage path like "creatorId/12345-abc.jpg" in paid-media
  const { data, error } = await supabase.storage
    .from("paid-media")
    .createSignedUrl(mediaUrl, 7200);
  if (error || !data?.signedUrl) {
    console.error("[access-links] signed URL error:", mediaUrl, error?.message);
    return mediaUrl;
  }
  return data.signedUrl;
}

// ── create-token ──────────────────────────────────────────────
// Called by the frontend after a confirmed guest payment to create
// a 7-day access token. Requires a verified purchases record.
async function createToken(req: Request, body: Record<string, unknown>): Promise<Response> {
  const contentId = typeof body.content_id === "string" ? body.content_id : null;
  const buyerEmail = typeof body.buyer_email === "string" ? body.buyer_email.trim().toLowerCase() : null;
  const orderId = typeof body.order_id === "string" ? body.order_id : null;
  const paymentId = typeof body.payment_id === "string" ? body.payment_id : null;

  if (!contentId || !buyerEmail) {
    return json({ error: "Content ID and buyer email are required." }, 400);
  }

  const supabase = getServiceClient();

  // ── SECURITY: Verify a completed purchase exists for this content + buyer ──
  // Look up by buyer_email (guest) or buyer_id (authenticated).
  // The purchase must have a payment_id and status 'active' (not refunded/disputed).
  let purchaseQuery = supabase
    .from("purchases")
    .select("id, payment_id, status, amount_paid")
    .eq("content_id", contentId)
    .eq("status", "active")
    .not("payment_id", "is", null)
    .limit(1);

  // Try by buyer_email first (guest flow), then by payment_id if provided
  if (paymentId) {
    purchaseQuery = purchaseQuery.eq("payment_id", paymentId);
  } else {
    purchaseQuery = purchaseQuery.eq("buyer_email", buyerEmail);
  }

  const { data: purchase, error: purchaseError } = await purchaseQuery.maybeSingle();

  if (purchaseError || !purchase) {
    // Also check by buyer_email without payment_id filter (in case payment_id wasn't passed)
    if (paymentId) {
      const { data: altPurchase } = await supabase
        .from("purchases")
        .select("id, payment_id, status")
        .eq("content_id", contentId)
        .eq("buyer_email", buyerEmail)
        .eq("status", "active")
        .not("payment_id", "is", null)
        .limit(1)
        .maybeSingle();
      if (!altPurchase) {
        console.error("[access-links] create-token denied: no verified purchase for", contentId, buyerEmail);
        return json({ error: "No verified purchase found for this content and buyer." }, 403);
      }
    } else {
      console.error("[access-links] create-token denied: no verified purchase for", contentId, buyerEmail);
      return json({ error: "No verified purchase found for this content and buyer." }, 403);
    }
  }

  // Verify content exists and is published
  const { data: content, error: contentError } = await supabase
    .from("content")
    .select("id, title, is_published")
    .eq("id", contentId)
    .maybeSingle();
  if (contentError || !content) {
    return json({ error: "Content not found." }, 404);
  }

  // Generate a secure random token
  const token = crypto.randomUUID() + "-" + crypto.randomUUID();

  // Set expiration to 7 days from now
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const amountPaid = purchase?.amount_paid ?? 0;

  const { data: tokenRecord, error: insertError } = await supabase
    .from("access_tokens")
    .insert({
      token,
      content_id: contentId,
      buyer_email: buyerEmail,
      order_id: orderId,
      amount_paid: amountPaid,
      payment_provider: "whop",
      payment_id: paymentId,
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString(),
      is_active: true,
    })
    .select("*")
    .single();

  if (insertError || !tokenRecord) {
    console.error("[access-links] Failed to create access token:", insertError);
    return json({ error: "Failed to create access token." }, 500);
  }

  // Build the access link — history routing (no #/)
  const appUrl = getAppUrl(req);
  const accessLink = `${appUrl}/access?token=${encodeURIComponent(token)}`;

  // Send the email via Resend if configured
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFrom = Deno.env.get("RESEND_FROM") ?? "VelourMedia <access@velourmedia.site>";
  if (resendApiKey) {
    try {
      const safeTitle = content.title
        ? content.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
        : null;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          from: resendFrom,
          to: [buyerEmail],
          subject: "Your VelourMedia access link",
          html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111"><h2 style="margin:0 0 12px">Your purchase is ready</h2>${safeTitle ? `<p style="margin:0 0 16px">Thanks for your purchase of <strong>${safeTitle}</strong>.</p>` : `<p style="margin:0 0 16px">Thanks for your purchase.</p>`}<p style="margin:0 0 20px">Use the button below to open it on any device. Keep this email: the link is your proof of purchase.</p><p style="margin:0 0 24px"><a href="${accessLink}" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Open my purchase</a></p><p style="font-size:12px;color:#666;margin:0">Anyone with this link can open your purchase, so please do not share it.</p></div>`,
          text: `Your purchase is ready.\n\nOpen it here:\n${accessLink}\n\nAnyone with this link can open your purchase, so please do not share it.`,
        }),
      });
    } catch (err) {
      console.error("[access-links] Resend email failed:", err);
    }
  }

  return json({
    token,
    access_link: accessLink,
    expires_at: expiresAt.toISOString(),
    content_title: content.title,
  });
}

// ── verify-token ──────────────────────────────────────────────
// Called by the /access page to validate a token and retrieve content.
// Generates signed URLs for paid-media storage paths.
async function verifyToken(req: Request, body: Record<string, unknown>): Promise<Response> {
  const token = typeof body.token === "string" ? body.token.trim() : null;
  if (!token) return json({ error: "Token is required." }, 400);

  const supabase = getServiceClient();

  const { data: tokenRecord, error: tokenError } = await supabase
    .from("access_tokens")
    .select("*")
    .eq("token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (tokenError || !tokenRecord) {
    return json({ error: "Invalid or revoked access token." }, 404);
  }

  const now = new Date();
  const expiresAt = new Date(tokenRecord.expires_at);

  if (now > expiresAt) {
    return json({
      error: "Access Link Expired — The 7-day viewing period for this content has ended.",
      expired: true,
      content_id: tokenRecord.content_id,
    }, 403);
  }

  // ── Concurrent IP enforcement ──
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown";

  const allowedIps: string[] = Array.isArray(tokenRecord.allowed_ips) ? tokenRecord.allowed_ips : [];
  const maxIps: number = typeof tokenRecord.max_concurrent_ips === "number" ? tokenRecord.max_concurrent_ips : 2;

  if (clientIp !== "unknown" && !allowedIps.includes(clientIp)) {
    if (allowedIps.length >= maxIps) {
      return json({
        error: "Access limit reached — This link has been opened from the maximum number of devices permitted.",
        content_id: tokenRecord.content_id,
      }, 429);
    }
    allowedIps.push(clientIp);
    await supabase
      .from("access_tokens")
      .update({ allowed_ips: allowedIps })
      .eq("id", tokenRecord.id);
  }

  // Fetch content + media + creator
  const { data: content, error: contentError } = await supabase
    .from("content")
    .select("*, creator:profiles(*)")
    .eq("id", tokenRecord.content_id)
    .maybeSingle();

  if (contentError || !content) {
    return json({ error: "Content not found." }, 404);
  }

  // ── Generate signed URL for the main media_url if it's a paid-media path ──
  const signedMediaUrl = await resolveMediaUrl(supabase, content.media_url);

  let mediaItems: Record<string, unknown>[] = [];
  if (content.media_count > 1) {
    const { data: media, error: mediaError } = await supabase
      .from("content_media")
      .select("*")
      .eq("content_id", content.id)
      .order("display_order", { ascending: true });
    if (mediaError) console.error("[access-links] media fetch error:", mediaError.message);
    mediaItems = media || [];
  }

  // ── Generate signed URLs for each media item ──
  const signedMediaItems = await Promise.all(
    mediaItems.map(async (m) => ({
      id: m.id,
      media_url: await resolveMediaUrl(supabase, m.media_url as string),
      media_type: m.media_type,
    }))
  );

  // Update accessed_at
  await supabase
    .from("access_tokens")
    .update({ accessed_at: now.toISOString() })
    .eq("id", tokenRecord.id);

  // Calculate remaining time
  const remainingMs = expiresAt.getTime() - now.getTime();
  const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

  return json({
    valid: true,
    content: {
      id: content.id,
      title: content.title,
      description: content.description,
      media_url: signedMediaUrl,
      media_type: content.media_type,
      thumbnail_url: content.thumbnail_url,
      media_count: content.media_count,
      blur_level: content.blur_level,
      creator: content.creator ? {
        display_name: content.creator.display_name,
        username: content.creator.username,
        avatar_url: content.creator.avatar_url,
      } : null,
    },
    media_items: signedMediaItems,
    receipt: {
      order_id: tokenRecord.order_id,
      buyer_email: tokenRecord.buyer_email,
      amount_paid: Number(tokenRecord.amount_paid),
      payment_provider: tokenRecord.payment_provider,
      payment_id: tokenRecord.payment_id,
    },
    expires_at: tokenRecord.expires_at,
    remaining: { days, hours, minutes },
  });
}

// ── Main handler ──────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;

    if (action === "create-token") return await createToken(req, body);
    if (action === "verify-token") return await verifyToken(req, body);

    return json({ error: "Unknown route." }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    console.error("[access-links] error:", message);
    return json({ error: message }, 500);
  }
});
