export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_primary: boolean;
  owner_id: string | null;
  subscription_price: number | null;
  email_sales_alerts: boolean;
  email_payout_alerts: boolean;
  email_account_alerts: boolean;
  preferred_payout_method: string;
  upi_id: string;
  crypto_wallet_address: string;
  crypto_network: string;
  kyc_status: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  is_suspended: boolean;
  created_at: string;
}

export interface Content {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url: string | null;
  price: number;
  is_published: boolean;
  is_private: boolean;
  blur_level: 'low' | 'medium' | 'hard';
  blur_percent: number;
  views_count: number;
  sales_count: number;
  earned_amount: number;
  media_count: number;
  created_at: string;
  updated_at: string;
  creator?: Profile;
  media?: ContentMedia[];
}

export interface ContentMedia {
  id: string;
  content_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  display_order: number;
  created_at: string;
}

export interface Purchase {
  id: string;
  buyer_id: string;
  content_id: string;
  amount_paid: number;
  payment_id: string | null;
  payment_provider: string | null;
  platform_fee: number;
  net_to_creator: number;
  created_at: string;
  content?: Content;
}

export interface Subscription {
  id: string;
  subscriber_id: string;
  creator_id: string;
  amount: number;
  status: 'active' | 'cancelled';
  payment_id: string | null;
  payment_provider: string | null;
  platform_fee: number;
  net_to_creator: number;
  created_at: string;
  creator?: Profile;
}

export interface CreatorEarnings {
  creator_id: string;
  content_revenue: number;
  subscription_revenue: number;
  total_revenue: number;
  gross_revenue: number;
  platform_fees_paid: number;
  total_sales: number;
  total_subscribers: number;
}

export interface CreatorBalances {
  pending_balance: number;
  available_balance: number;
  lifetime_balance: number;
  total_paid_out: number;
  total_pending_payouts: number;
}

export interface PlatformSettings {
  id: number;
  platform_fee_percent: number;
  updated_at: string;
  updated_by: string | null;
}

export interface BankDetails {
  id: string;
  profile_id: string;
  bank_name: string;
  account_holder_name: string;
  bank_account_number: string;
  ifsc_code: string;
  pan_card_number: string;
  updated_at: string;
}

export interface Payout {
  id: string;
  profile_id: string;
  amount_usd: number;
  amount_inr: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
  requested_at: string;
  processed_at: string | null;
  reference_id: string | null;
}

export type ContentType = 'image' | 'video';
