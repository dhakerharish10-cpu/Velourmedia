import { supabase, supabaseUrl, supabaseAnonKey } from './supabase';

const SUPABASE_URL = supabaseUrl;
const SUPABASE_ANON_KEY = supabaseAnonKey;

const GUEST_DEVICE_KEY = 'velour_guest_device_id';

/**
 * Stable anonymous device id for guest checkout.
 * - Stored only in localStorage (never a secret).
 * - Generated once per browser and reused.
 * - Safe to send to the server as a correlation id for guest purchases.
 */
export function getGuestDeviceId(): string {
  try {
    let id = localStorage.getItem(GUEST_DEVICE_KEY);
    if (!id || id.length < 8) {
      id = crypto.randomUUID();
      localStorage.setItem(GUEST_DEVICE_KEY, id);
    }
    return id;
  } catch {
    // localStorage blocked (private mode / iframe) – session-only fallback
    return `tmp_${crypto.randomUUID()}`;
  }
}

interface CheckoutResponse {
  order_id: string;
  invoice_url: string;
  guest_token?: string | null;
}

export interface PaymentStatus {
  order_id: string;
  status: string;
  creator_id: string;
  content_id?: string | null;
}

async function callPaymentApi(route: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Payment service is not configured.');
  const { data: { session } } = await supabase.auth.getSession();

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/whop-payment/${route}`, {
      method: 'POST',
      headers: {
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Could not connect to checkout. Please check your connection and try again.');
  }
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof body.error === 'string' ? body.error : `Payment request failed (${response.status}).`;
    console.error(`[payment] ${route} failed`, { status: response.status, body });
    throw new Error(message);
  }
  return body;
}

/**
 * Create a one-time checkout for a content item.
 * Currently routes through the existing Edge Function; will be switched
 * to an authorized provider in Phase B without changing call sites.
 */
export async function createWhopCheckout(payload: {
  creatorId: string;
  contentId?: string;
  tipAmount?: number;
  guestEmail?: string;
}): Promise<CheckoutResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  const guestDeviceId = !session?.access_token ? getGuestDeviceId() : undefined;

  const result = await callPaymentApi('create-checkout', {
    creator_id: payload.creatorId,
    ...(payload.contentId ? { kind: 'content', content_id: payload.contentId } : {}),
    ...(payload.tipAmount ? { kind: 'tip', tip_amount: payload.tipAmount } : {}),
    ...(guestDeviceId ? { guest_device_id: guestDeviceId } : {}),
    ...(payload.guestEmail ? { guest_email: payload.guestEmail } : {}),
  });
  if (typeof result.order_id !== 'string' || typeof result.invoice_url !== 'string') {
    console.error('[payment] create-checkout returned an invalid response', result);
    throw new Error(typeof result.error === 'string' ? result.error : 'The payment checkout could not be created.');
  }
  // Accept any https checkout URL (provider-agnostic for Phase B)
  if (!result.invoice_url.startsWith('https://')) {
    console.error('[payment] create-checkout returned an invalid URL', result.invoice_url);
    throw new Error('The payment checkout returned an invalid URL. Please try again.');
  }
  return {
    order_id: result.order_id,
    invoice_url: result.invoice_url,
    guest_token: typeof result.guest_token === 'string' ? result.guest_token : null,
  };
}

export async function getWhopStatus(orderId: string): Promise<PaymentStatus> {
  const { data: { session } } = await supabase.auth.getSession();
  const guestDeviceId = !session?.access_token ? getGuestDeviceId() : undefined;

  const result = await callPaymentApi('status', {
    order_id: orderId,
    ...(guestDeviceId ? { guest_device_id: guestDeviceId } : {}),
  });
  if (typeof result.order_id !== 'string' || typeof result.status !== 'string' || typeof result.creator_id !== 'string') {
    throw new Error('The payment status is unavailable.');
  }
  return {
    order_id: result.order_id,
    status: result.status,
    creator_id: result.creator_id,
    content_id: typeof result.content_id === 'string' ? result.content_id : null,
  };
}

export async function confirmPaymentFallback(orderId: string): Promise<PaymentStatus> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Payment service is not configured.');
  const { data: { session } } = await supabase.auth.getSession();
  const guestEmail = sessionStorage.getItem('guest_email');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/whop-payment/confirm-payment`, {
    method: 'POST',
    headers: {
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      ...(guestEmail ? { 'X-Buyer-Email': guestEmail } : {}),
    },
    body: JSON.stringify({ order_id: orderId }),
  });
  const result = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    console.error('[payment] confirm-payment failed', { status: response.status, result });
    throw new Error(typeof result.error === 'string' ? result.error : 'Payment confirmation failed.');
  }
  if (typeof result.order_id !== 'string' || typeof result.status !== 'string') {
    throw new Error('Payment confirmation failed.');
  }
  return {
    order_id: result.order_id,
    status: result.status,
    creator_id: typeof result.creator_id === 'string' ? result.creator_id : '',
    content_id: typeof result.content_id === 'string' ? result.content_id : null,
  };
}

export interface SyncResult {
  synced: number;
  historical: number;
  skipped: number;
  pages: number;
}

export async function syncWhopPayments(): Promise<SyncResult> {
  const result = await callPaymentApi('sync-whop-payments', {});
  return {
    synced: typeof result.synced === 'number' ? result.synced : 0,
    historical: typeof result.historical === 'number' ? result.historical : 0,
    skipped: typeof result.skipped === 'number' ? result.skipped : 0,
    pages: typeof result.pages === 'number' ? result.pages : 0,
  };
}
