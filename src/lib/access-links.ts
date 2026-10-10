import { supabase, supabaseUrl, supabaseAnonKey } from './supabase';

const SUPABASE_URL = supabaseUrl;
const SUPABASE_ANON_KEY = supabaseAnonKey;

export interface AccessContent {
  id: string;
  title: string;
  description: string | null;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url: string | null;
  media_count: number;
  blur_level: 'low' | 'medium' | 'hard';
  creator: {
    display_name: string | null;
    username: string;
    avatar_url: string | null;
  } | null;
}

export interface AccessMediaItem {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
}

export interface AccessReceipt {
  order_id: string | null;
  buyer_email: string;
  amount_paid: number;
  payment_provider: string;
  payment_id: string | null;
}

export interface VerifyTokenResponse {
  valid: boolean;
  content: AccessContent;
  media_items: AccessMediaItem[];
  receipt: AccessReceipt;
  expires_at: string;
  remaining: { days: number; hours: number; minutes: number };
}

export interface CreateTokenResponse {
  token: string;
  access_link: string;
  expires_at: string;
  content_title: string;
}

export async function verifyAccessToken(token: string): Promise<VerifyTokenResponse> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Access service is not configured.');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/access-links/verify-token`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  const body = await response.json().catch(() => ({})) as Record<string, unknown>;

  if (!response.ok) {
    const message = typeof body.error === 'string' ? body.error : `Verification failed (${response.status}).`;
    const expired = body.expired === true;
    const contentId = typeof body.content_id === 'string' ? body.content_id : null;
    const error = new Error(message) as Error & { expired?: boolean; contentId?: string | null };
    error.expired = expired;
    error.contentId = contentId;
    throw error;
  }

  return body as unknown as VerifyTokenResponse;
}

export async function createAccessToken(params: {
  contentId: string;
  buyerEmail: string;
  orderId?: string;
  amountPaid?: number;
  paymentId?: string;
}): Promise<CreateTokenResponse> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Access service is not configured.');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/access-links/create-token`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content_id: params.contentId,
      buyer_email: params.buyerEmail,
      order_id: params.orderId,
      amount_paid: params.amountPaid,
      payment_id: params.paymentId,
    }),
  });

  const body = await response.json().catch(() => ({})) as Record<string, unknown>;

  if (!response.ok) {
    const message = typeof body.error === 'string' ? body.error : `Token creation failed (${response.status}).`;
    throw new Error(message);
  }

  return body as unknown as CreateTokenResponse;
}

export { supabase };
