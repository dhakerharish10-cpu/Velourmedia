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

  const ts = Number(webhookTimestamp);
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    console.warn("[whop-webhook] timestamp out of range", webhookTimestamp);
    return false;
  }

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

  const signatures = signatureHeader.split(" ").map((s) => s.trim());
  for (const sig of signatures) {
    const parts = sig.split(",");
    if (parts.length === 2 && parts[0] === "v1" && parts[1] === expectedBase64) {
      return true;
    }
  }

  console.warn("[whop-webhook] signature mismatch");
  return false;
}

function extractNetAmount(data: JsonRecord): number {
  // v5 API: net_amount may be in cents; v1 API: may be in dollars
  if (typeof data.net_amount === "number" && data.net_amount > 0) {
    return data.net_amount > 1000 ? data.net_amount / 100 : data.net_amount;
  }
  if (typeof data.net_cents === "number" && data.net_cents > 0) return data.net_cents / 100;
  if (typeof data.gross_amount === "number" && data.gross_amount > 0) {
    return data.gross_amount > 1000 ? data.gross_amount / 100 : data.gross_amount;
  }
  if (typeof data.gross_cents === "number" && data.gross_cents > 0) return data.gross_cents / 100;
  if (typeof data.total_cents === "number" && data.total_cents > 0) return data.total_cents / 100;
  if (typeof data.subtotal_cents === "number" && data.subtotal_cents > 0) return data.subtotal_cents / 100;
  if (typeof data.final_amount === "number" && data.final_amount > 0) return data.final_amount;
  if (typeof data.initial_price === "number" && data.initial_price > 0) return data.initial_price;
  return 0;
}

// Resolve creator_id and content_id STRICTLY from payment metadata — no title/plan/product matching
async function resolveAttribution(
  _supabase: ReturnType<typeof getServiceClient>,
  payment: JsonRecord,
): Promise<{ creator_id: string | null; content_id: string | null }> {
  const metadata = (payment.metadata ?? {}) as JsonRecord;
  // Priority 1: custom_post_id / custom_creator_id from our checkout metadata
  const customPostId = typeof metadata.custom_post_id === "string" ? metadata.custom_post_id : null;
  const customCreatorId = typeof metadata.custom_creator_id === "string" ? metadata.custom_creator_id : null;
  if (customPostId && customCreatorId) {
    return { creator_id: customCreatorId, content_id: customPostId };
  }
  // Priority 2: creator_id / content_id from metadata
  const metaCreatorId = typeof metadata.creator_id === "string" ? metadata.creator_id : null;
  const metaContentId = typeof metadata.content_id === "string" ? metadata.content_id : null;
  if (metaCreatorId && metaContentId) {
    return { creator_id: metaCreatorId, content_id: metaContentId };
  }
  // No fallback — return whatever we have (may be null)
  return { creator_id: metaCreatorId, content_id: metaContentId };
}

function extractEmail(data: JsonRecord): string | null {
  const customer = data.customer as JsonRecord | undefined;
  if (customer) {
    if (typeof customer.email === "string") return customer.email;
  }
  if (typeof data.email === "string") return data.email;
  if (typeof data.buyer_email === "string") return data.buyer_email;
  return null;
}

async function activatePurchase(
  supabase: ReturnType<typeof getServiceClient>,
  intent: JsonRecord,
  paymentId: string | null,
  buyerEmail: string | null,
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
      buyer_email: buyerEmail,
    }, {
      onConflict: buyerId ? "buyer_id,content_id" : "payment_id,content_id",
      ignoreDuplicates: true,
    });
    if (purchaseError) {
      console.error("[whop-webhook] purchase upsert failed", purchaseError);
      return false;
    }
  } else if (intent.checkout_type === "tip") {
    console.log("[whop-webhook] tip processed", { buyer: intent.buyer_id, creator: creatorId, amount: baseAmount, net: netToCreator });
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
    "payment.completed",
    "checkout.session.completed",
    "order.completed",
    "action.succeeded",
    "membership.started",
  ];

  if (!successEvents.includes(eventType)) {
    console.log("[whop-webhook] ignoring event type", eventType);
    return;
  }

  if (!orderId) {
    // No order_id in metadata — try to resolve attribution from custom fields or plan_id
    console.log("[whop-webhook] no order_id in metadata, attempting direct attribution", { eventType });
    const supabase = getServiceClient();
    const paymentId = typeof data.id === "string" ? data.id : null;
    if (!paymentId) {
      console.warn("[whop-webhook] no payment ID in data", payload);
      return;
    }

    // Check if already synced
    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("payment_id", paymentId)
      .maybeSingle();
    if (existing) {
      console.log("[whop-webhook] transaction already exists for payment", paymentId);
      return;
    }

    const attribution = await resolveAttribution(supabase, data);
    if (!attribution.creator_id) {
      console.warn("[whop-webhook] could not resolve creator for payment", paymentId);
      return;
    }

    const netAmount = extractNetAmount(data);
    const baseAmount = netAmount > 0 ? netAmount : 0;
    if (baseAmount <= 0) {
      console.warn("[whop-webhook] could not extract amount from payment", paymentId);
      return;
    }

    const platformFee = Math.round(baseAmount * 0.3 * 100) / 100;
    const netToCreator = Math.round(baseAmount * 0.7 * 100) / 100;

    await supabase.from("transactions").insert({
      payment_id: paymentId,
      order_id: paymentId,
      creator_id: attribution.creator_id,
      content_id: attribution.content_id,
      buyer_id: null,
      event_type: "payment.succeeded",
      checkout_type: "content",
      amount: baseAmount,
      currency: "usd",
      status: "succeeded",
      creator_earnings: netToCreator,
      platform_earnings: platformFee,
      raw_payload: payload,
    });

    if (attribution.content_id) {
      await supabase.from("purchases").upsert({
        buyer_id: null,
        content_id: attribution.content_id,
        amount_paid: baseAmount,
        payment_id: paymentId,
        payment_provider: "whop",
        platform_fee: platformFee,
        net_to_creator: netToCreator,
        buyer_email: extractEmail(data),
      }, { onConflict: "payment_id,content_id", ignoreDuplicates: true });
    }

    console.log("[whop-webhook] directly attributed payment", { paymentId, creator: attribution.creator_id, content: attribution.content_id, amount: baseAmount });
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
    // Fallback: try direct attribution from the payment data
    const paymentId = typeof data.id === "string" ? data.id : null;
    if (paymentId) {
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("payment_id", paymentId)
        .maybeSingle();
      if (!existing) {
        const attribution = await resolveAttribution(supabase, data);
        if (attribution.creator_id) {
          const netAmt = extractNetAmount(data);
          if (netAmt > 0) {
            const pFee = Math.round(netAmt * 0.3 * 100) / 100;
            const nCreator = Math.round(netAmt * 0.7 * 100) / 100;
            await supabase.from("transactions").insert({
              payment_id: paymentId,
              order_id: orderId,
              creator_id: attribution.creator_id,
              content_id: attribution.content_id,
              event_type: "payment.succeeded",
              checkout_type: "content",
              amount: netAmt,
              currency: "usd",
              status: "succeeded",
              creator_earnings: nCreator,
              platform_earnings: pFee,
              raw_payload: payload,
            });
            console.log("[whop-webhook] fallback attribution for orphaned order", orderId, { paymentId, creator: attribution.creator_id });
          }
        }
      }
    }
    return;
  }

  const intentRecord = intent as JsonRecord;
  const paymentId = typeof data.id === "string" ? data.id : null;
  const buyerEmail = extractEmail(data);
  const paidAmount = Number(intentRecord.amount);
  const netAmount = extractNetAmount(data);

  const activated = await activatePurchase(supabase, intentRecord, paymentId, buyerEmail, netAmount > 0 ? netAmount : paidAmount);
  if (!activated) {
    console.error("[whop-webhook] failed to activate purchase for order", orderId);
    return;
  }

  const baseAmount = netAmount > 0 ? netAmount : paidAmount;
  const platformFee = Math.round(baseAmount * 0.3 * 100) / 100;
  const netToCreator = Math.round(baseAmount * 0.7 * 100) / 100;
  await sendSaleAlertEmail(supabase, intentRecord, netToCreator);

  const { error: updateError } = await supabase
    .from("nowpayments_checkout_intents")
    .update({ status: "confirmed", payment_id: paymentId, updated_at: new Date().toISOString() })
    .eq("id", intentRecord.id);
  if (updateError) console.error("[whop-webhook] intent update failed", updateError);

  console.log("[whop-webhook] successfully processed order", orderId, { paymentId, buyerEmail, paidAmount });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  if (req.method !== "POST") return ok();

  try {
    const rawBody = await req.text();

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

    await processWebhookEvent(payload);
    return ok();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    console.error("[whop-webhook] error", message);
    return ok();
  }
});
