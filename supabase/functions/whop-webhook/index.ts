import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type JsonRecord = Record<string, unknown>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function ok(): Response {
  return new Response(null, { status: 200, headers: corsHeaders });
}

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase service configuration is missing.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Verify the Whop webhook signature.
 *
 * Whop signs the string `{webhook-id}.{webhook-timestamp}.{raw-body}` with
 * HMAC-SHA256 using the `ws_...` secret. The `webhook-signature` header
 * contains the result in the format `v1,<base64>`.
 */
async function verifyWhopSignature(
  rawBody: string,
  headers: Headers,
  secret: string,
): Promise<boolean> {
  const signatureHeader = headers.get("webhook-signature");
  if (!signatureHeader) {
    console.warn("[whop-webhook] missing webhook-signature header");
    return false;
  }

  const webhookId = headers.get("webhook-id");
  const webhookTimestamp = headers.get("webhook-timestamp");
  if (!webhookId || !webhookTimestamp) {
    console.warn("[whop-webhook] missing webhook-id or webhook-timestamp header");
    return false;
  }

  // Reject timestamps older than 5 minutes to prevent replay attacks
  const ts = Number(webhookTimestamp);
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    console.warn("[whop-webhook] timestamp out of range", webhookTimestamp);
    return false;
  }

  // The signed content is: {webhook-id}.{webhook-timestamp}.{raw-body}
  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedContent));
  const expectedBase64 = btoa(String.fromCharCode(...new Uint8Array(sigBytes)));

  // The header can contain multiple signatures: "v1,xxx v1,yyy"
  // We check if any match our expected value
  const signatures = signatureHeader.split(" ").map((s) => s.trim());
  for (const sig of signatures) {
    const parts = sig.split(",");
    if (parts.length === 2 && parts[0] === "v1" && parts[1] === expectedBase64) {
      return true;
    }
  }

  console.warn("[whop-webhook] signature mismatch", { expected: expectedBase64.slice(0, 16), got: signatureHeader.slice(0, 32) });
  return false;
}

async function activatePurchase(
  supabase: ReturnType<typeof getServiceClient>,
  intent: JsonRecord,
  paymentId: string | null,
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
        console.error("[whop-webhook] purchase upsert failed", purchaseError);
        return false;
      }
    } else if (intent.checkout_type === "tip") {
      console.log("[whop-webhook] tip processed", { buyer: intent.buyer_id, creator: intent.creator_id, amount: intent.amount, net: netToCreator });
    } else {
      const { error: subscriptionError } = await supabase.from("subscriptions").upsert({
        subscriber_id: intent.buyer_id,
        creator_id: intent.creator_id,
        amount: intent.amount,
        status: "active",
        payment_id: paymentId,
        payment_provider: "whop",
        platform_fee: platformFee,
        net_to_creator: netToCreator,
      }, { onConflict: "subscriber_id,creator_id", ignoreDuplicates: true });
      if (subscriptionError) {
        console.error("[whop-webhook] subscription upsert failed", subscriptionError);
        return false;
      }
    }
  }

  return true;
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
    if (!creator || !creator.email_sales_alerts) return;

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
    } else if (intent.checkout_type === "subscription") {
      contentType = "subscription";
      contentTitle = "Monthly subscription";
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
            <tr><td style="padding: 8px 0; color: #64748b;">${contentType === "subscription" ? "Subscriber" : "Post Title"}</td><td style="padding: 8px 0; text-align: right;">${contentTitle}</td></tr>
          </table>
          <a href="${dashboardLink}" style="display: inline-block; margin-top: 20px; padding: 12px 28px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px;">Go to Dashboard</a>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px;">VelourMedia — Premium Creator Content Platform</p>
      </div>
    `;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.warn("[whop-webhook] RESEND_API_KEY not configured — skipping sale alert email");
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
    console.log("[whop-webhook] sale alert email sent to", creatorEmail);
  } catch (err) {
    console.error("[whop-webhook] sendSaleAlertEmail error", err);
  }
}

async function processWebhookEvent(payload: JsonRecord): Promise<void> {
  const eventType = typeof payload.event === "string"
    ? payload.event
    : typeof payload.type === "string"
      ? payload.type
      : "";

  const data = (payload.data ?? payload) as JsonRecord;
  const metadata = (data.metadata ?? {}) as JsonRecord;
  const orderId = typeof metadata.order_id === "string" ? metadata.order_id : "";

  console.log("[whop-webhook] received event", { eventType, orderId });

  const successEvents = [
    "payment.captured",
    "payment.succeeded",
    "checkout.session.completed",
    "order.completed",
    "membership.started",
    "payment.completed",
  ];

  if (!successEvents.includes(eventType)) {
    console.log("[whop-webhook] ignoring event type", eventType);
    return;
  }

  if (!orderId) {
    console.warn("[whop-webhook] no order_id in metadata", payload);
    return;
  }

  const supabase = getServiceClient();
  const { data: intent, error: intentError } = await supabase
    .from("nowpayments_checkout_intents")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();
  if (intentError || !intent) {
    console.error("[whop-webhook] checkout not found for order", orderId, intentError);
    return;
  }

  const intentRecord = intent as JsonRecord;
  const paymentId = typeof data.id === "string" ? data.id : null;
  const paidAmount = Number(intentRecord.amount);

  const activated = await activatePurchase(supabase, intentRecord, paymentId);
  if (!activated) {
    console.error("[whop-webhook] failed to activate purchase for order", orderId);
    return;
  }

  const platformFee = Math.round(paidAmount * 0.3 * 100) / 100;
  const netToCreator = Math.round((paidAmount - platformFee) * 100) / 100;
  await sendSaleAlertEmail(supabase, intentRecord, netToCreator);

  const { error: updateError } = await supabase
    .from("nowpayments_checkout_intents")
    .update({ status: "confirmed", payment_id: paymentId, updated_at: new Date().toISOString() })
    .eq("id", intentRecord.id);
  if (updateError) console.error("[whop-webhook] intent update failed", updateError);

  console.log("[whop-webhook] successfully processed order", orderId);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  // Always return 200 OK so Whop doesn't mark the webhook as failing
  if (req.method !== "POST") return ok();

  try {
    const rawBody = await req.text();

    // Verify Whop webhook signature
    const whopWebhookSecret = Deno.env.get("WHOP_WEBHOOK_SECRET");
    if (whopWebhookSecret) {
      const isValid = await verifyWhopSignature(rawBody, req.headers, whopWebhookSecret);
      if (!isValid) {
        console.warn("[whop-webhook] signature verification failed — returning 200 anyway to avoid retries");
        return ok();
      }
    } else {
      console.warn("[whop-webhook] WHOP_WEBHOOK_SECRET not configured — skipping verification");
    }

    const payload = JSON.parse(rawBody) as JsonRecord;

    // Process the event but always return 200 OK so Whop doesn't retry
    await processWebhookEvent(payload);
    return ok();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    console.error("[whop-webhook] error", message);
    // Return 200 even on errors to prevent Whop from marking the webhook as failing
    return ok();
  }
});
