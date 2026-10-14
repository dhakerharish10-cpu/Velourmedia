import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-guest-token, X-Buyer-Email",
};

const WHOP_API_BASE = "https://api.whop.com/api/v5";
const WHOP_CHECKOUT_API = "https://api.whop.com/api/v1";

type JsonRecord = Record<string, unknown>;

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

function getBearerToken(req: Request): string | null {
  const header = req.headers.get("Authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : null;
}

function getAppUrl(req: Request, fallback: string): string {
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
  return fallback;
}

async function requireUser(req: Request) {
  const token = getBearerToken(req);
  if (!token) return null;
  const supabase = getServiceClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

async function sendSaleAlertEmail(
  supabase: ReturnType<typeof getServiceClient>,
  intent: JsonRecord,
  netToCreator: number,
): Promise<void> {
  try {
    const creatorId = typeof intent.creator_id === "string" ? intent.creator_id : "";
    if (!creatorId) return;

    const { data: creator } = await supabase
      .from("profiles")
      .select("email_sales_alerts, display_name, username, owner_id")
      .eq("id", creatorId)
      .maybeSingle();
    if (!creator) return;
    if (!creator.email_sales_alerts) return;

    const ownerId = creator.owner_id || creatorId;
    const { data: ownerAuth } = await supabase.auth.admin.getUserById(ownerId);
    const creatorEmail = ownerAuth?.user?.email;
    if (!creatorEmail) return;

    let contentTitle = "Your content";
    let contentType = "content";
    if (intent.checkout_type === "content" && intent.content_id) {
      const { data: content } = await supabase
        .from("content")
        .select("title")
        .eq("id", intent.content_id)
        .maybeSingle();
      if (content?.title) contentTitle = content.title;
    } else if (intent.checkout_type === "tip") {
      contentType = "tip";
      contentTitle = "Tip from a fan";
    }

    const grossAmount = Number(intent.amount).toFixed(2);
    const netAmount = netToCreator.toFixed(2);
    const creatorName = creator.display_name || creator.username || "Creator";
    const appUrl = Deno.env.get("APP_URL") || "https://velourmedia.com";
    const dashboardLink = `${appUrl}/#/dashboard`;

    const subject = contentType === "tip"
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
            <tr><td style="padding: 8px 0; color: #64748b;">Post Title</td><td style="padding: 8px 0; text-align: right;">${contentTitle}</td></tr>
          </table>
          <a href="${dashboardLink}" style="display: inline-block; margin-top: 20px; padding: 12px 28px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px;">Go to Dashboard</a>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px;">VelourMedia — Premium Creator Content Platform</p>
      </div>
    `;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.warn("[whop] RESEND_API_KEY not configured — skipping sale alert email");
      return;
    }

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "VelourMedia <noreply@velourmedia.com>",
        to: [creatorEmail],
        subject,
        html,
      }),
    });
    console.log("[whop] sale alert email sent to", creatorEmail);
  } catch (err) {
    console.error("[whop] sendSaleAlertEmail error", err);
  }
}

function extractNetAmount(payment: JsonRecord): number {
  // Extract the net amount Whop received after their internal fee deductions
  // v5 API: net_amount is in cents, gross_amount is in cents
  // v1 API: net_amount may be in dollars, net_cents in cents
  if (typeof payment.net_amount === "number" && payment.net_amount > 0) {
    // v5 returns cents; v1 may return dollars — detect based on magnitude
    return payment.net_amount > 1000 ? payment.net_amount / 100 : payment.net_amount;
  }
  if (typeof payment.net_cents === "number" && payment.net_cents > 0) return payment.net_cents / 100;
  const data = payment.data as JsonRecord | undefined;
  if (data) {
    if (typeof data.net_amount === "number" && data.net_amount > 0) {
      return data.net_amount > 1000 ? data.net_amount / 100 : data.net_amount;
    }
    if (typeof data.net_cents === "number" && data.net_cents > 0) return data.net_cents / 100;
  }
  // Fallback: use gross amounts (less ideal since this is pre-fee)
  if (typeof payment.gross_amount === "number" && payment.gross_amount > 0) {
    return payment.gross_amount > 1000 ? payment.gross_amount / 100 : payment.gross_amount;
  }
  if (typeof payment.gross_cents === "number" && payment.gross_cents > 0) return payment.gross_cents / 100;
  if (typeof payment.total_cents === "number" && payment.total_cents > 0) return payment.total_cents / 100;
  if (typeof payment.subtotal_cents === "number" && payment.subtotal_cents > 0) return payment.subtotal_cents / 100;
  if (typeof payment.final_amount === "number" && payment.final_amount > 0) return payment.final_amount;
  if (data) {
    if (typeof data.initial_price === "number" && data.initial_price > 0) return data.initial_price;
    if (typeof data.final_amount === "number" && data.final_amount > 0) return data.final_amount;
  }
  return 0;
}

// Hybrid attribution: metadata-first (strict), plan_id/product_id fallback ONLY for historical payments with no metadata
async function resolveAttribution(
  supabase: ReturnType<typeof getServiceClient>,
  payment: JsonRecord,
): Promise<{ creator_id: string | null; content_id: string | null }> {
  const metadata = (payment.metadata ?? {}) as JsonRecord;

  // STEP 1 (PRIMARY): Strict metadata attribution — handles all NEW sales with 100% accuracy
  const customPostId = typeof metadata.custom_post_id === "string" ? metadata.custom_post_id : null;
  const customCreatorId = typeof metadata.custom_creator_id === "string" ? metadata.custom_creator_id : null;
  if (customPostId && customCreatorId) {
    return { creator_id: customCreatorId, content_id: customPostId };
  }
  const metaCreatorId = typeof metadata.creator_id === "string" ? metadata.creator_id : null;
  const metaContentId = typeof metadata.content_id === "string" ? metadata.content_id : null;
  if (metaCreatorId && metaContentId) {
    return { creator_id: metaCreatorId, content_id: metaContentId };
  }

  // STEP 2 (HISTORICAL FALLBACK): ONLY if metadata is completely empty — for past payments created before the metadata engine
  const hasMetadata = Object.keys(metadata).length > 0;
  if (hasMetadata) {
    // Metadata exists but doesn't contain our IDs — don't guess, skip
    return { creator_id: metaCreatorId, content_id: metaContentId };
  }

  // No metadata at all — try plan_id lookup against content.whop_plan_id
  const planId = typeof payment.plan_id === "string" ? payment.plan_id
    : typeof (payment.data as JsonRecord | undefined)?.id === "string" ? (payment.data as JsonRecord).id as string
    : null;
  if (planId) {
    const { data: content } = await supabase
      .from("content")
      .select("id, creator_id")
      .eq("whop_plan_id", planId)
      .maybeSingle();
    if (content) {
      return { creator_id: content.creator_id as string, content_id: content.id as string };
    }
  }

  // Try product_id lookup against content.whop_product_id
  const productId = typeof payment.product_id === "string" ? payment.product_id
    : typeof (payment.data as JsonRecord | undefined)?.product_id === "string" ? (payment.data as JsonRecord).product_id as string
    : null;
  if (productId) {
    const { data: content } = await supabase
      .from("content")
      .select("id, creator_id")
      .eq("whop_product_id", productId)
      .maybeSingle();
    if (content) {
      return { creator_id: content.creator_id as string, content_id: content.id as string };
    }
  }

  return { creator_id: null, content_id: null };
}

async function activatePurchase(
  supabase: ReturnType<typeof getServiceClient>,
  intent: JsonRecord,
  paymentId: string | null,
  paidAmount: number,
  buyerEmail?: string | null,
  whopNetAmount?: number,
): Promise<boolean> {
  // Use the Whop net_amount if available, otherwise fall back to the intent amount
  const baseAmount = whopNetAmount && whopNetAmount > 0 ? whopNetAmount : Number(intent.amount);
  const platformFee = Math.round(baseAmount * 0.3 * 100) / 100;
  const netToCreator = Math.round(baseAmount * 0.7 * 100) / 100;

  // Save to transactions table with creator_earnings and platform_earnings
  const creatorId = typeof intent.creator_id === "string" ? intent.creator_id : null;
  const contentId = typeof intent.content_id === "string" ? intent.content_id : null;
  if (paymentId && creatorId) {
    const { data: existingTx } = await supabase
      .from("transactions")
      .select("id")
      .eq("payment_id", paymentId)
      .maybeSingle();
    if (!existingTx) {
      await supabase.from("transactions").insert({
        payment_id: paymentId,
        order_id: typeof intent.order_id === "string" ? intent.order_id : paymentId,
        creator_id: creatorId,
        content_id: contentId,
        buyer_id: typeof intent.buyer_id === "string" ? intent.buyer_id : null,
        event_type: "payment.succeeded",
        checkout_type: typeof intent.checkout_type === "string" ? intent.checkout_type : "content",
        amount: baseAmount,
        currency: "usd",
        status: "succeeded",
        creator_earnings: netToCreator,
        platform_earnings: platformFee,
        raw_payload: { data: { net_amount: whopNetAmount, initial_price: Number(intent.amount) } },
      });
    }
  }

  if (intent.checkout_type === "content") {
    const buyerId = typeof intent.buyer_id === "string" ? intent.buyer_id : null;
    const { error: purchaseError } = await supabase.from("purchases").upsert({
      buyer_id: buyerId,
      content_id: contentId,
      amount_paid: baseAmount,
      payment_id: paymentId,
      payment_provider: "whop",
      platform_fee: platformFee,
      net_to_creator: netToCreator,
      buyer_email: buyerEmail ?? null,
    }, {
      onConflict: buyerId ? "buyer_id,content_id" : "payment_id,content_id",
      ignoreDuplicates: true,
    });
    if (purchaseError) {
      console.error("[whop] purchase upsert failed", purchaseError);
      return false;
    }
  } else if (intent.checkout_type === "tip") {
    console.log("[whop] tip processed", { buyer: intent.buyer_id, creator: creatorId, amount: baseAmount, net: netToCreator });
  }

  await sendSaleAlertEmail(supabase, intent, netToCreator);
  return true;
}

async function createCheckout(req: Request, body: JsonRecord): Promise<Response> {
  const checkoutType = body.kind === "content" ? "content" : body.kind === "tip" ? "tip" : "content";
  const creatorId = typeof body.creator_id === "string" ? body.creator_id : "";
  const contentId = typeof body.content_id === "string" ? body.content_id : null;
  const tipAmount = typeof body.tip_amount === "number" && body.tip_amount > 0 ? body.tip_amount : null;
  const guestDeviceId = typeof body.guest_device_id === "string" ? body.guest_device_id : null;
  if (!creatorId) return json({ error: "Creator is required." }, 400);
  if (!contentId) return json({ error: "Content is required." }, 400);
  if (checkoutType === "tip" && !tipAmount) return json({ error: "Tip amount is required." }, 400);
  if (checkoutType === "tip" && tipAmount < 1) return json({ error: "Minimum tip amount is $1.00." }, 400);

  const user = await requireUser(req);
  if (checkoutType === "tip" && !user && !guestDeviceId) {
    return json({ error: "Either a user session or a guest device ID is required." }, 400);
  }
  if (checkoutType === "content" && !user && !guestDeviceId) {
    return json({ error: "Either a user session or a guest device ID is required." }, 400);
  }

  const supabase = getServiceClient();
  const { data: creator, error: creatorError } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .eq("id", creatorId)
    .maybeSingle();
  if (creatorError || !creator) return json({ error: "Creator not found." }, 404);

  let amount = 0;
  let description = `Tip to ${creator.display_name || creator.username}`;
  if (checkoutType === "tip") {
    amount = tipAmount!;
  } else {
    const { data: content } = await supabase
      .from("content")
      .select("id, title, price, creator_id")
      .eq("id", contentId)
      .eq("creator_id", creatorId)
      .eq("is_published", true)
      .maybeSingle();
    if (!content || Number(content.price) <= 0) return json({ error: "Content is not available for purchase." }, 404);
    if (user) {
      const { data: owned } = await supabase
        .from("purchases")
        .select("id")
        .eq("buyer_id", user.id)
        .eq("content_id", contentId)
        .maybeSingle();
      if (owned) return json({ error: "You already own this content." }, 409);
    }
    amount = Number(content.price);
    description = content.title;
  }
  if (!contentId) return json({ error: "Content is required." }, 400);

  const apiKey = Deno.env.get("WHOP_API_KEY");
  const companyId = Deno.env.get("WHOP_COMPANY_ID");
  if (!apiKey) return json({ error: "Whop is not configured (WHOP_API_KEY missing)." }, 500);
  if (!companyId) return json({ error: "Whop is not configured (WHOP_COMPANY_ID missing)." }, 500);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) return json({ error: "Supabase URL is not configured." }, 500);

  const appUrl = getAppUrl(req, supabaseUrl);

  const buyerTag = user ? user.id : `g_${guestDeviceId}`;
  const orderId = checkoutType === "content"
    ? `con_${buyerTag.slice(0, 12)}_${crypto.randomUUID()}`
    : `tip_${buyerTag.slice(0, 12)}_${crypto.randomUUID()}`;

  const successUrl = `${appUrl}/#/payment/success?order_id=${encodeURIComponent(orderId)}`;
  const cancelUrl = `${appUrl}/#/u/${encodeURIComponent(contentId!)}`;

  // Fetch the content's whop_plan_id if it exists — we'll use it for a direct purchase_url fallback
  let existingPlanId: string | null = null;
  let existingPurchaseUrl: string | null = null;
  if (checkoutType === "content" && contentId) {
    const { data: contentRow } = await supabase
      .from("content")
      .select("whop_plan_id")
      .eq("id", contentId)
      .maybeSingle();
    existingPlanId = typeof contentRow?.whop_plan_id === "string" ? contentRow.whop_plan_id : null;
  }

  // Create a Whop checkout configuration with an inline plan
  const planType = "one_time";
  const whopPayload: JsonRecord = {
    metadata: {
      order_id: orderId,
      checkout_type: checkoutType,
      creator_id: creatorId,
      content_id: contentId,
      custom_post_id: contentId,
      custom_creator_id: creatorId,
      buyer_id: user ? user.id : null,
      guest_device_id: guestDeviceId,
    },
    plan: {
      company_id: companyId,
      plan_type: planType,
      initial_price: amount,
      currency: "usd",
      title: description,
      billing_period: undefined,
      adaptive_pricing_enabled: false,
    },
    redirect_url: successUrl,
  };

  console.log("[whop] create-checkout request", { orderId, amount, checkoutType, planType, buyer: buyerTag, successUrl, cancelUrl, apiKeyPrefix: apiKey.slice(0, 8), existingPlanId });

  const checkoutResponse = await fetch(`${WHOP_CHECKOUT_API}/checkout_configurations`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(whopPayload),
  });

  const checkoutText = await checkoutResponse.text();
  console.log("[whop] checkout response", { status: checkoutResponse.status, body: checkoutText.slice(0, 1000) });

  let checkoutResult: JsonRecord;
  try {
    checkoutResult = JSON.parse(checkoutText) as JsonRecord;
  } catch {
    checkoutResult = {};
  }

  // Parse the checkout URL from the response — Whop v1 returns redirect_url
  // Per docs, redirect_url is a relative path like "/checkout/ch_xxxx/"
  // We must prepend the Whop base domain to get a usable absolute URL
  let rawCheckoutUrl = typeof checkoutResult.redirect_url === "string"
    ? checkoutResult.redirect_url
    : typeof checkoutResult.purchase_url === "string"
      ? checkoutResult.purchase_url
      : typeof checkoutResult.url === "string"
        ? checkoutResult.url
        : "";

  // Normalize to an absolute URL — Whop returns relative paths like "/checkout/ch_xxx/"
  let checkoutUrl = "";
  if (rawCheckoutUrl) {
    if (rawCheckoutUrl.startsWith("http://") || rawCheckoutUrl.startsWith("https://")) {
      checkoutUrl = rawCheckoutUrl;
    } else if (rawCheckoutUrl.startsWith("/")) {
      checkoutUrl = `https://whop.com${rawCheckoutUrl}`;
    } else {
      checkoutUrl = `https://whop.com/${rawCheckoutUrl}`;
    }
  }

  if (!checkoutResponse.ok) {
    const apiMessage = typeof checkoutResult.message === "string"
      ? checkoutResult.message
      : typeof checkoutResult.error === "string"
        ? checkoutResult.error
        : `Whop returned ${checkoutResponse.status}: ${checkoutText.slice(0, 500)}`;
    console.error("[whop] checkout creation failed", { status: checkoutResponse.status, apiMessage, checkoutResult, requestPayload: whopPayload });

    // FALLBACK: If we have an existing plan_id, construct a direct Whop checkout URL with metadata params
    if (existingPlanId) {
      existingPurchaseUrl = `https://whop.com/checkout/${existingPlanId}`;
      const metaParams = new URLSearchParams({
        "metadata[order_id]": orderId,
        "metadata[creator_id]": creatorId,
        "metadata[content_id]": contentId ?? "",
        "metadata[checkout_type]": checkoutType,
        "metadata[custom_post_id]": contentId ?? "",
        "metadata[custom_creator_id]": creatorId,
      });
      if (user) metaParams.set("metadata[buyer_id]", user.id);
      if (guestDeviceId) metaParams.set("metadata[guest_device_id]", guestDeviceId);
      checkoutUrl = `${existingPurchaseUrl}?${metaParams.toString()}`;
      console.log("[whop] fallback to direct purchase_url with metadata", { existingPlanId, checkoutUrl });
    } else {
      return json({ error: `Unable to create the Whop checkout: ${apiMessage}` }, 502);
    }
  }

  if (!checkoutUrl) {
    console.error("[whop] no checkout URL in response", checkoutResult);
    // Last-resort fallback: try direct plan purchase URL
    if (existingPlanId) {
      const metaParams = new URLSearchParams({
        "metadata[order_id]": orderId,
        "metadata[creator_id]": creatorId,
        "metadata[content_id]": contentId ?? "",
        "metadata[checkout_type]": checkoutType,
        "metadata[custom_post_id]": contentId ?? "",
        "metadata[custom_creator_id]": creatorId,
      });
      if (user) metaParams.set("metadata[buyer_id]", user.id);
      if (guestDeviceId) metaParams.set("metadata[guest_device_id]", guestDeviceId);
      checkoutUrl = `https://whop.com/checkout/${existingPlanId}?${metaParams.toString()}`;
      console.log("[whop] last-resort fallback to direct purchase_url", { existingPlanId, checkoutUrl });
    } else {
      return json({ error: "Whop checkout did not return a valid URL." }, 502);
    }
  }

  // Store the checkout intent in the database (reusing the nowpayments_checkout_intents table)
  const insertResult = await supabase.from("nowpayments_checkout_intents").insert({
    order_id: orderId,
    buyer_id: user ? user.id : null,
    guest_device_id: user ? null : guestDeviceId,
    creator_id: creatorId,
    content_id: contentId,
    checkout_type: checkoutType,
    amount,
    status: "pending",
    invoice_url: checkoutUrl,
  }).select("guest_token").single();
  if (insertResult.error) {
    console.error("[whop] insert intent failed", insertResult.error);
    return json({ error: "Unable to save checkout state." }, 500);
  }

  return json({
    order_id: orderId,
    invoice_url: checkoutUrl,
    guest_token: insertResult.data?.guest_token ?? null,
  });
}

async function confirmPayment(req: Request, orderId: string): Promise<Response> {
  if (!orderId) return json({ error: "Order ID is required." }, 400);
  const supabase = getServiceClient();
  const { data: intent, error } = await supabase
    .from("nowpayments_checkout_intents")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();
  if (error) return json({ error: "Unable to read checkout state." }, 500);
  if (!intent) return json({ error: "Checkout not found." }, 404);

  const intentRecord = intent as JsonRecord;

  // If already confirmed, just return success
  if (intentRecord.status === "confirmed") {
    return json({ order_id: orderId, status: "confirmed", content_id: intentRecord.content_id, creator_id: intentRecord.creator_id, already_confirmed: true });
  }

  // Authenticate the buyer
  if (intentRecord.buyer_id) {
    const user = await requireUser(req);
    if (!user || user.id !== intentRecord.buyer_id) return json({ error: "Authentication required." }, 401);
  }

  // Force-confirm the intent and activate the purchase (fallback for webhook delays)
  const paymentId = typeof intentRecord.payment_id === "string" ? intentRecord.payment_id : `fallback_${orderId}`;
  const buyerEmail = typeof req.headers.get("X-Buyer-Email") === "string" ? req.headers.get("X-Buyer-Email") : null;

  const activated = await activatePurchase(supabase, intentRecord, paymentId, Number(intentRecord.amount), buyerEmail);
  if (!activated) return json({ error: "Failed to confirm purchase." }, 500);

  const { error: updateError } = await supabase
    .from("nowpayments_checkout_intents")
    .update({ status: "confirmed", payment_id: paymentId, updated_at: new Date().toISOString() })
    .eq("id", intentRecord.id);
  if (updateError) console.error("[whop] confirm-payment intent update failed", updateError);

  console.log("[whop] confirm-payment fallback activated for order", orderId);
  return json({ order_id: orderId, status: "confirmed", content_id: intentRecord.content_id, creator_id: intentRecord.creator_id });
}

const ADMIN_EMAIL = "dhakerharish10@gmail.com";

async function requireAdmin(req: Request): Promise<boolean> {
  const user = await requireUser(req);
  if (!user) return false;
  if (user.email && user.email.toLowerCase().trim() === ADMIN_EMAIL) return true;
  const supabase = getServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return !!profile?.is_admin;
}

async function syncWhopPayments(req: Request): Promise<Response> {
  const isAdmin = await requireAdmin(req);
  if (!isAdmin) return json({ error: "Admin access required." }, 403);

  const apiKey = Deno.env.get("WHOP_API_KEY");
  const companyId = Deno.env.get("WHOP_COMPANY_ID");
  if (!apiKey) return json({ error: "WHOP_API_KEY is not configured." }, 500);

  const supabase = getServiceClient();

  // Resolve the primary active creator for historical payments that have no metadata and no plan_id match
  const { data: primaryCreator } = await supabase
    .from("profiles")
    .select("id, username")
    .or("username.eq.kellyisdancinggg,username.eq.kellyisdancing")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const primaryCreatorId = primaryCreator?.id ?? null;
  console.log("[whop] sync primary creator fallback", { primaryCreatorId, username: primaryCreator?.username });

  let synced = 0;
  let historical = 0;
  let skipped = 0;
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 20) {
    // v5 API supports status=succeeded filter directly
    const params = new URLSearchParams({ per: "100", page: String(page), status: "succeeded" });
    if (companyId) params.set("company_id", companyId);
    const url = `${WHOP_API_BASE}/payments?${params.toString()}`;
    console.log("[whop] sync fetching page", page, url);

    const response = await fetch(url, {
      headers: { "Authorization": `Bearer ${apiKey}`, "Accept": "application/json" },
    });
    if (!response.ok) {
      const text = await response.text();
      console.error("[whop] sync API error", response.status, text.slice(0, 500));
      break;
    }

    const result = await response.json().catch(() => ({})) as JsonRecord;
    const payments = Array.isArray(result.data) ? result.data as JsonRecord[] : [];
    console.log("[whop] sync page", page, "got", payments.length, "payments");

    for (const payment of payments) {
      // v5 API already filters by status=succeeded, but double-check
      const paymentStatus = typeof payment.status === "string" ? payment.status : "";
      if (!["succeeded", "paid", "complete", "completed"].includes(paymentStatus)) {
        skipped++;
        continue;
      }

      const paymentId = typeof payment.id === "string" ? payment.id : null;
      if (!paymentId) { skipped++; continue; }

      // Extract the Whop net amount (after Whop's internal fees)
      const netAmount = extractNetAmount(payment);
      // Fall back to gross amount extraction if net_amount not present
      const totalCents = typeof payment.total_cents === "number" ? payment.total_cents
        : typeof payment.subtotal_cents === "number" ? payment.subtotal_cents
        : typeof payment.final_amount === "number" ? payment.final_amount * 100
        : 0;
      const grossAmount = Math.round(totalCents) / 100;
      const baseAmount = netAmount > 0 ? netAmount : grossAmount;

      const buyerEmail = typeof payment.email === "string" ? payment.email
        : typeof (payment.user as JsonRecord | undefined)?.email === "string" ? (payment.user as JsonRecord).email as string
        : typeof (payment.customer as JsonRecord | undefined)?.email === "string" ? (payment.customer as JsonRecord).email as string
        : null;

      const metadata = (payment.metadata ?? {}) as JsonRecord;
      const orderId = typeof metadata.order_id === "string" ? metadata.order_id : null;

      // --- Path 1: We have a matching checkout intent ---
      if (orderId) {
        const { data: intent } = await supabase
          .from("nowpayments_checkout_intents")
          .select("*")
          .eq("order_id", orderId)
          .maybeSingle();

        if (intent) {
          const intentRecord = intent as JsonRecord;
          if (intentRecord.status === "confirmed") { skipped++; continue; }

          const activated = await activatePurchase(supabase, intentRecord, paymentId, Number(intentRecord.amount), buyerEmail, baseAmount);
          if (activated) {
            await supabase
              .from("nowpayments_checkout_intents")
              .update({ status: "confirmed", payment_id: paymentId, updated_at: new Date().toISOString() })
              .eq("id", intentRecord.id);
            synced++;
          } else {
            skipped++;
          }
          continue;
        }
      }

      // --- Path 2: Historical payment with no intent — write directly to transactions table ---
      if (baseAmount <= 0) { skipped++; continue; }

      // Resolve creator_id and content_id: metadata-first, plan_id/product_id fallback, then primary creator
      const attribution = await resolveAttribution(supabase, payment);
      const creatorId = attribution.creator_id ?? primaryCreatorId;

      if (!creatorId) { skipped++; continue; }

      // Check if already synced by payment_id
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("payment_id", paymentId)
        .maybeSingle();
      if (existing) { skipped++; continue; }

      const platformFee = Math.round(baseAmount * 0.3 * 100) / 100;
      const netToCreator = Math.round(baseAmount * 0.7 * 100) / 100;

      // Upsert into transactions table with creator_earnings and platform_earnings
      await supabase.from("transactions").insert({
        payment_id: paymentId,
        order_id: orderId ?? paymentId,
        creator_id: creatorId,
        content_id: attribution.content_id,
        buyer_id: null,
        event_type: "payment.succeeded",
        checkout_type: "content",
        amount: baseAmount,
        currency: typeof payment.currency === "string" ? payment.currency : "usd",
        status: "succeeded",
        creator_earnings: netToCreator,
        platform_earnings: platformFee,
        raw_payload: payment,
      });

      // Also upsert into purchases table so it shows in the admin panel
      if (attribution.content_id) {
        await supabase.from("purchases").upsert({
          buyer_id: null,
          content_id: attribution.content_id,
          amount_paid: baseAmount,
          payment_id: paymentId,
          payment_provider: "whop",
          platform_fee: platformFee,
          net_to_creator: netToCreator,
          buyer_email: buyerEmail ?? null,
        }, { onConflict: "payment_id,content_id", ignoreDuplicates: true });
      }

      historical++;
    }

    hasMore = typeof result.pagination?.total_page === "number"
      ? page < result.pagination.total_page
      : typeof result.has_more === "boolean"
        ? result.has_more
        : payments.length === 100;
    page++;
  }

  console.log("[whop] sync complete", { synced, historical, skipped, pages: page - 1 });
  return json({ synced, historical, skipped, pages: page - 1 });
}

async function getCheckoutStatus(req: Request, orderId: string): Promise<Response> {
  if (!orderId) return json({ error: "Order ID is required." }, 400);
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("nowpayments_checkout_intents")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();
  if (error) return json({ error: "Unable to read payment status." }, 500);
  if (!data) return json({ error: "Checkout not found." }, 404);

  const intent = data as JsonRecord;
  if (intent.buyer_id) {
    const user = await requireUser(req);
    if (!user || user.id !== intent.buyer_id) return json({ error: "Authentication required." }, 401);
  }

  return json({ order_id: orderId, status: intent.status, creator_id: intent.creator_id, content_id: intent.content_id });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

    const body = await req.json().catch(() => ({})) as JsonRecord;
    if (action === "create-checkout") return await createCheckout(req, body);
    if (action === "status") return await getCheckoutStatus(req, typeof body.order_id === "string" ? body.order_id : "");
    if (action === "confirm-payment") return await confirmPayment(req, typeof body.order_id === "string" ? body.order_id : "");
    if (action === "sync-whop-payments") return await syncWhopPayments(req);
    return json({ error: "Unknown route." }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    console.error("[whop] error", message);
    return json({ error: message }, 500);
  }
});
