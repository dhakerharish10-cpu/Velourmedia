export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_primary: boolean;
  owner_id: string | null;
  email_sales_alerts: boolean;
  email_payout_alerts: boolean;
  email_account_alerts: boolean;
  preferred_payout_method: string;
  upi_id: string;
  crypto_wallet_address: string;
  crypto_network: string;
  kyc_status: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  is_suspended: boolean;
  is_banned: boolean;
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
  whop_product_id: string | null;
  whop_plan_id: string | null;
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
  buyer_email: string | null;
  created_at: string;
  content?: Content;
}

export interface CreatorEarnings {
  creator_id: string;
  content_revenue: number;
  total_revenue: number;
  gross_revenue: number;
  platform_fees_paid: number;
  total_sales: number;
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

export interface ContentReport {
  id: string;
  content_id: string | null;
  reporter_id: string | null;
  reason: string;
  description: string | null;
  status: 'pending' | 'actioned' | 'dismissed';
  created_at: string;
  actioned_by: string | null;
  actioned_at: string | null;
  content?: Content;
}

export interface SalesVisibility {
  id: number;
  profile_id: string | null;
  visible_ratio: number;
  sales_hidden: boolean;
  updated_at: string;
  updated_by: string | null;
}
