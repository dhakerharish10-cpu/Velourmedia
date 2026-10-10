import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const GUEST_DEVICE_KEY = 'velour_guest_device_id';

export function getGuestDeviceId(): string {
  let id = localStorage.getItem(GUEST_DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_DEVICE_KEY, id);
  }
  return id;
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

async function callWhop(route: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Payment service is not configured.');
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(`${SUPABASE_URL}/functions/v1/whop-payment/${route}`, {
    method: 'POST',
    headers: {
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof body.error === 'string' ? body.error : `Payment request failed (${response.status}).`;
    console.error(`[whop] ${route} failed`, { status: response.status, body });
    throw new Error(message);
  }
  return body;
}

export async function createWhopCheckout(payload: {
  creatorId: string;
  contentId?: string;
  tipAmount?: number;
}): Promise<CheckoutResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  const guestDeviceId = !session?.access_token ? getGuestDeviceId() : undefined;

  const result = await callWhop('create-checkout', {
    creator_id: payload.creatorId,
    ...(payload.contentId ? { kind: 'content', content_id: payload.contentId } : {}),
    ...(payload.tipAmount ? { kind: 'tip', tip_amount: payload.tipAmount } : {}),
    ...(guestDeviceId ? { guest_device_id: guestDeviceId } : {}),
  });
  if (typeof result.order_id !== 'string' || typeof result.invoice_url !== 'string') {
    console.error('[whop] create-checkout returned an invalid response', result);
    throw new Error(typeof result.error === 'string' ? result.error : 'The payment checkout could not be created.');
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

  const result = await callWhop('status', {
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
