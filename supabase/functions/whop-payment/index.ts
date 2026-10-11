import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-guest-token",
};

const WHOP_API_BASE = "https://api.whop.com/api/v1";

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

async function activatePurchase(
  supabase: ReturnType<typeof getServiceClient>,
  intent: JsonRecord,
  paymentId: string | null,
  paidAmount: number,
): Promise<boolean> {
  const platformFee = Math.round(Number(intent.amount) * 0.3 * 100) / 100;
  const netToCreator = Math.round((Number(intent.amount) - platformFee) * 100) / 100;

  if (intent.buyer_id) {
    if (intent.checkout_type === "content") {
      const { error: purchaseError } = await supabase.from("purchases").upsert({
        buyer_id: intent.buyer_id,
        content_id: intent.content_id,
        amount_paid: intent.amount,
        payment_id: paymentId,
        payment_provider: "whop",
        platform_fee: platformFee,
        net_to_creator: netToCreator,
      }, { onConflict: "buyer_id,content_id", ignoreDuplicates: true });
      if (purchaseError) {
        console.error("[whop] purchase upsert failed", purchaseError);
        return false;
      }
    } else if (intent.checkout_type === "tip") {
      console.log("[whop] tip processed", { buyer: intent.buyer_id, creator: intent.creator_id, amount: intent.amount, net: netToCreator });
    }
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

  // Create a Whop checkout configuration with an inline plan
  const planType = "one_time";
  const whopPayload: JsonRecord = {
    mode: "payment",
    return_url: successUrl,
    metadata: {
      order_id: orderId,
      checkout_type: checkoutType,
      creator_id: creatorId,
      content_id: contentId,
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
  };

  console.log("[whop] create-checkout request", { orderId, amount, checkoutType, planType, buyer: buyerTag, successUrl, cancelUrl, apiKeyPrefix: apiKey.slice(0, 8) });

  const checkoutResponse = await fetch(`${WHOP_API_BASE}/checkout_configurations`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(whopPayload),
  });

  const checkoutText = await checkoutResponse.text();
  console.log("[whop] checkout response", { status: checkoutResponse.status, body: checkoutText });

  let checkoutResult: JsonRecord;
  try {
    checkoutResult = JSON.parse(checkoutText) as JsonRecord;
  } catch {
    checkoutResult = {};
  }

  if (!checkoutResponse.ok) {
    const apiMessage = typeof checkoutResult.message === "string"
      ? checkoutResult.message
      : typeof checkoutResult.error === "string"
        ? checkoutResult.error
        : `Whop returned ${checkoutResponse.status}: ${checkoutText.slice(0, 500)}`;
    console.error("[whop] checkout creation failed", { status: checkoutResponse.status, apiMessage, checkoutResult, requestPayload: whopPayload });
    return json({ error: `Unable to create the Whop checkout: ${apiMessage}` }, 502);
  }

  // Whop returns the checkout URL in the "purchase_url" field
  const checkoutUrl = typeof checkoutResult.purchase_url === "string"
    ? checkoutResult.purchase_url
    : typeof checkoutResult.url === "string"
      ? checkoutResult.url
      : typeof checkoutResult.checkout_url === "string"
        ? checkoutResult.checkout_url
        : "";

  if (!checkoutUrl) {
    console.error("[whop] no checkout URL in response", checkoutResult);
    return json({ error: "Whop checkout did not return a valid URL." }, 502);
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

  const activated = await activatePurchase(supabase, intentRecord, paymentId, Number(intentRecord.amount));
  if (!activated) return json({ error: "Failed to confirm purchase." }, 500);

  const { error: updateError } = await supabase
    .from("nowpayments_checkout_intents")
    .update({ status: "confirmed", payment_id: paymentId, updated_at: new Date().toISOString() })
    .eq("id", intentRecord.id);
  if (updateError) console.error("[whop] confirm-payment intent update failed", updateError);

  console.log("[whop] confirm-payment fallback activated for order", orderId);
  return json({ order_id: orderId, status: "confirmed", content_id: intentRecord.content_id, creator_id: intentRecord.creator_id });
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
    return json({ error: "Unknown route." }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    console.error("[whop] error", message);
    return json({ error: message }, 500);
  }
});
