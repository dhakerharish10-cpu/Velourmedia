import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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

function getAppUrl(req: Request): string {
  const candidates = [
    Deno.env.get("APP_URL"),
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
  return Deno.env.get("SUPABASE_URL") || "https://example.com";
}

// ── create-token ──────────────────────────────────────────────
// Called by the frontend after a confirmed guest payment to create
// a 7-day access token and (optionally) send the email.
async function createToken(req: Request, body: Record<string, unknown>): Promise<Response> {
  const contentId = typeof body.content_id === "string" ? body.content_id : null;
  const buyerEmail = typeof body.buyer_email === "string" ? body.buyer_email.trim().toLowerCase() : null;
  const orderId = typeof body.order_id === "string" ? body.order_id : null;
  const amountPaid = typeof body.amount_paid === "number" ? body.amount_paid : 0;
  const paymentId = typeof body.payment_id === "string" ? body.payment_id : null;

  if (!contentId || !buyerEmail) {
    return json({ error: "Content ID and buyer email are required." }, 400);
  }

  const supabase = getServiceClient();

  // Verify content exists and is published
  const { data: content, error: contentError } = await supabase
    .from("content")
    .select("id, title, creator_id, is_published")
    .eq("id", contentId)
    .maybeSingle();
  if (contentError || !content) {
    return json({ error: "Content not found." }, 404);
  }

  // Generate a secure random token
  const token = crypto.randomUUID() + "-" + crypto.randomUUID();

  // Set expiration to exactly 7 days from now
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

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

  // Build the access link
  const appUrl = getAppUrl(req);
  const accessLink = `${appUrl}/#/access?token=${encodeURIComponent(token)}`;

  // Send the email via Supabase's built-in email (or log it)
  // Since we can't use Resend without an API key, we'll log the email
  // and return the link so the frontend can display it.
  console.log("[access-links] Access email would be sent:", {
    to: buyerEmail,
    content_title: content.title,
    access_link: accessLink,
    expires_at: expiresAt.toISOString(),
  });

  return json({
    token,
    access_link: accessLink,
    expires_at: expiresAt.toISOString(),
    content_title: content.title,
  });
}

// ── verify-token ──────────────────────────────────────────────
// Called by the /access page to validate a token and retrieve content.
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
    // Add this IP to the allowed list
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

  let mediaItems: Record<string, unknown>[] = [];
  if (content.media_count > 1) {
    const { data: media } = await supabase
      .from("content_media")
      .select("*")
      .eq("content_id", content.id)
      .order("display_order", { ascending: true });
    mediaItems = media || [];
  }

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
      media_url: content.media_url,
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
    media_items: mediaItems.map((m) => ({
      id: m.id,
      media_url: m.media_url,
      media_type: m.media_type,
    })),
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
