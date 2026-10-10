import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile, Content, Purchase, Subscription, CreatorEarnings, CreatorBalances, BankDetails, Payout, PlatformSettings } from './types';
import { createWhopCheckout } from './whop';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface StoreContextValue {
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  profiles: Profile[];
  activeProfileId: string | null;
  isAgeVerified: boolean;
  isAdminEmail: boolean;
  isAuthModalOpen: boolean;
  authMode: 'signin' | 'signup';
  isProfileEditOpen: boolean;
  isUploadOpen: boolean;
  isPersonaSwitcherOpen: boolean;
  isRedirecting: boolean;
  toasts: Toast[];
  feed: Content[];
  myContent: Content[];
  myPurchases: Purchase[];
  mySubscriptions: Subscription[];
  earnings: CreatorEarnings | null;
  balances: CreatorBalances | null;
  bankDetails: BankDetails | null;
  payouts: Payout[];
  platformSettings: PlatformSettings | null;
  setAgeVerified: (v: boolean) => void;
  openAuth: (mode: 'signin' | 'signup') => void;
  closeAuth: () => void;
  setAuthMode: (mode: 'signin' | 'signup') => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshProfiles: () => Promise<void>;
  refreshMyContent: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  refreshPurchases: () => Promise<void>;
  refreshSubscriptions: () => Promise<void>;
  refreshEarnings: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  refreshBankDetails: () => Promise<void>;
  refreshPayouts: () => Promise<void>;
  refreshPlatformSettings: () => Promise<void>;
  updatePlatformFee: (percent: number) => Promise<{ error: string | null }>;
  saveBankDetails: (details: Pick<BankDetails, 'bank_name' | 'account_holder_name' | 'bank_account_number' | 'ifsc_code' | 'pan_card_number'>) => Promise<{ error: string | null }>;
  requestPayout: (amountUsd: number) => Promise<{ error: string | null }>;
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
  purchaseContent: (contentId: string, amount: number) => Promise<{ error: string | null }>;
  handlePayment: (contentId: string, creatorId: string) => Promise<void>;

  recordPurchase: (contentId: string, amount: number, paymentId: string) => Promise<{ error: string | null }>;
  isUnlocked: (contentId: string) => boolean;
  handleSubscriptionPayment: (creatorId: string) => Promise<void>;
  handleTipPayment: (creatorId: string, contentId: string, amount: number) => Promise<void>;
  recordSubscription: (creatorId: string, amount: number, paymentId: string) => Promise<{ error: string | null }>;
  isSubscribed: (creatorId: string) => boolean;
  checkSubscription: (creatorId: string) => Promise<boolean>;
  getSubscriptionLink: (username: string) => string;
  deleteContent: (contentId: string) => Promise<{ error: string | null }>;
  togglePrivate: (contentId: string, isPrivate: boolean) => Promise<{ error: string | null }>;
  togglePublished: (contentId: string, isPublished: boolean) => Promise<{ error: string | null }>;
  duplicateContent: (contentId: string) => Promise<{ error: string | null }>;
  updateContent: (contentId: string, updates: { title?: string; description?: string | null; price?: number; blur_level?: 'low' | 'medium' | 'hard' }) => Promise<{ error: string | null }>;
  addMediaToContent: (contentId: string, files: File[]) => Promise<{ error: string | null }>;
  removeMediaFromContent: (contentId: string, mediaId: string) => Promise<{ error: string | null }>;
  editPostId: string | null;
  openEditPost: (contentId: string) => void;
  closeEditPost: () => void;
  updateProfile: (updates: Partial<Pick<Profile, 'display_name' | 'bio' | 'avatar_url' | 'username' | 'subscription_price' | 'email_sales_alerts' | 'email_payout_alerts' | 'email_account_alerts' | 'preferred_payout_method' | 'upi_id' | 'crypto_wallet_address' | 'crypto_network'>>) => Promise<{ error: string | null }>;
  uploadAvatar: (file: File) => Promise<{ error: string | null; url: string | null }>;
  setActiveProfile: (profileId: string) => void;
  createSubProfile: (username: string, displayName: string) => Promise<{ error: string | null }>;
  deleteSubProfile: (profileId: string) => Promise<{ error: string | null }>;
  openProfileEdit: () => void;
  closeProfileEdit: () => void;
  openUpload: () => void;
  closeUpload: () => void;
  openPersonaSwitcher: () => void;
  closePersonaSwitcher: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isAgeVerified, setIsAgeVerified] = useState(false);
  const [isAdminEmail, setIsAdminEmail] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPersonaSwitcherOpen, setIsPersonaSwitcherOpen] = useState(false);
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [feed, setFeed] = useState<Content[]>([]);
  const [myContent, setMyContent] = useState<Content[]>([]);
  const [myPurchases, setMyPurchases] = useState<Purchase[]>([]);
  const [mySubscriptions, setMySubscriptions] = useState<Subscription[]>([]);
  const [earnings, setEarnings] = useState<CreatorEarnings | null>(null);
  const [balances, setBalances] = useState<CreatorBalances | null>(null);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    const targetId = activeProfileId || user.id;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetId)
      .maybeSingle();
    if (error) {
      console.error('Failed to load profile:', error.message);
      return;
    }
    setProfile(data);
  }, [user, activeProfileId]);

  const refreshProfiles = useCallback(async () => {
    if (!user) {
      setProfiles([]);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`id.eq.${user.id},owner_id.eq.${user.id}`)
      .order('is_primary', { ascending: false });
    if (error) {
      console.error('Failed to load profiles:', error.message);
      return;
    }
    setProfiles(data || []);
  }, [user]);

  const refreshMyContent = useCallback(async () => {
    if (!user) {
      setMyContent([]);
      return;
    }
    const creatorId = activeProfileId || user.id;
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to load content:', error.message);
      return;
    }
    setMyContent(data || []);
  }, [user, activeProfileId]);

  const refreshFeed = useCallback(async () => {
    const { data, error } = await supabase
      .from('content')
      .select('*, creator:profiles(*)')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      console.error('Failed to load feed:', error.message);
      return;
    }
    setFeed(data || []);
  }, []);

  const refreshPurchases = useCallback(async () => {
    if (!user) {
      setMyPurchases([]);
      return;
    }
    const { data, error } = await supabase
      .from('purchases')
      .select('*, content:content(*, creator:profiles(*))')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to load purchases:', error.message);
      return;
    }
    setMyPurchases(data || []);
  }, [user]);

  const refreshSubscriptions = useCallback(async () => {
    if (!user) {
      setMySubscriptions([]);
      return;
    }
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, creator:profiles(*)')
      .eq('subscriber_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to load subscriptions:', error.message);
      return;
    }
    setMySubscriptions(data || []);
  }, [user]);

  const refreshEarnings = useCallback(async () => {
    if (!user) {
      setEarnings(null);
      return;
    }
    const creatorId = activeProfileId || user.id;
    const { data, error } = await supabase
      .from('creator_earnings')
      .select('*')
      .eq('creator_id', creatorId)
      .maybeSingle();
    if (error) {
      console.error('Failed to load earnings:', error.message);
      return;
    }
    setEarnings(data);
  }, [user, activeProfileId]);

  const refreshBalances = useCallback(async () => {
    if (!user) {
      setBalances(null);
      return;
    }
    const creatorId = activeProfileId || user.id;
    const { data, error } = await supabase
      .rpc('get_creator_balances', { p_profile_id: creatorId });
    if (error) {
      console.error('Failed to load balances:', error.message);
      return;
    }
    setBalances(data as unknown as CreatorBalances);
  }, [user, activeProfileId]);

  const refreshBankDetails = useCallback(async () => {
    if (!user) {
      setBankDetails(null);
      return;
    }
    const creatorId = activeProfileId || user.id;
    const { data, error } = await supabase
      .from('bank_details')
      .select('*')
      .eq('profile_id', creatorId)
      .maybeSingle();
    if (error) {
      console.error('Failed to load bank details:', error.message);
      return;
    }
    setBankDetails(data);
  }, [user, activeProfileId]);

  const refreshPayouts = useCallback(async () => {
    if (!user) {
      setPayouts([]);
      return;
    }
    const creatorId = activeProfileId || user.id;
    const { data, error } = await supabase
      .from('payouts')
      .select('*')
      .eq('profile_id', creatorId)
      .order('requested_at', { ascending: false });
    if (error) {
      console.error('Failed to load payouts:', error.message);
      return;
    }
    setPayouts(data || []);
  }, [user, activeProfileId]);

  const refreshPlatformSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (error) {
      console.error('Failed to load platform settings:', error.message);
      return;
    }
    setPlatformSettings(data);
  }, []);

  const updatePlatformFee = useCallback(async (percent: number) => {
    if (!user) return { error: 'Not signed in.' };
    const clamped = Math.max(0, Math.min(100, percent));
    const { error } = await supabase
      .from('platform_settings')
      .update({ platform_fee_percent: clamped, updated_at: new Date().toISOString(), updated_by: user.id })
      .eq('id', 1);
    if (error) return { error: error.message };
    await refreshPlatformSettings();
    return { error: null };
  }, [user, refreshPlatformSettings]);

  // Auth init + onAuthStateChange
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Auto-bypass age gate when signed in
  useEffect(() => {
    if (user) {
      setIsAgeVerified(true);
    }
  }, [user]);

  // Load profile + content when user or activeProfileId changes
  useEffect(() => {
    if (user) {
      refreshProfile();
      refreshProfiles();
      refreshMyContent();
      refreshPurchases();
      refreshSubscriptions();
      refreshEarnings();
      refreshBalances();
      refreshBankDetails();
      refreshPayouts();
      refreshPlatformSettings();
    } else {
      setProfile(null);
      setProfiles([]);
      setMyContent([]);
      setMyPurchases([]);
      setMySubscriptions([]);
      setEarnings(null);
      setBankDetails(null);
      setPayouts([]);
      setPlatformSettings(null);
      setActiveProfileId(null);
    }
  }, [user, activeProfileId, refreshProfile, refreshProfiles, refreshMyContent, refreshPurchases, refreshSubscriptions, refreshEarnings, refreshBalances, refreshBankDetails, refreshPayouts, refreshPlatformSettings]);

  // Load feed on mount
  useEffect(() => {
    refreshFeed();
  }, [refreshFeed]);

  const openAuth = useCallback((mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuth = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    // Check if this is the configured admin email and auto-promote
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || '';
    const adminSecretKey = import.meta.env.VITE_ADMIN_SECRET_KEY || '';
    if (adminEmail && email.toLowerCase().trim() === adminEmail.toLowerCase().trim()) {
      setIsAdminEmail(true);
      if (adminSecretKey) {
        try {
          await supabase.rpc('promote_self_to_admin', { p_email: email, p_secret_key: adminSecretKey });
        } catch (e) {
          console.error('Admin auto-promotion failed:', e);
        }
      }
    }

    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) return { error: error.message };
    if (data.user) {
      await refreshProfile();
    }
    return { error: null };
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setProfiles([]);
    setMyContent([]);
    setMyPurchases([]);
    setMySubscriptions([]);
    setEarnings(null);
    setActiveProfileId(null);
    setIsAgeVerified(false);
  }, []);

  const purchaseContent = useCallback(async (contentId: string, amount: number) => {
    if (!user) return { error: 'You must be signed in to purchase.' };
    const { error } = await supabase
      .from('purchases')
      .insert({ buyer_id: user.id, content_id: contentId, amount_paid: amount });
    if (error) {
      if (error.code === '23505') return { error: 'You already own this content.' };
      return { error: error.message };
    }
    await refreshPurchases();
    return { error: null };
  }, [user, refreshPurchases]);

  const recordPurchase = useCallback(async (contentId: string, amount: number, paymentId: string) => {
    if (!user) return { error: 'You must be signed in.' };
    const feePercent = platformSettings?.platform_fee_percent ?? 30;
    const platformFee = Math.round(amount * feePercent / 100 * 100) / 100;
    const netToCreator = Math.round((amount - platformFee) * 100) / 100;
    const { error } = await supabase
      .from('purchases')
      .insert({
        buyer_id: user.id,
        content_id: contentId,
        amount_paid: amount,
        payment_id: paymentId,
        payment_provider: 'whop',
        platform_fee: platformFee,
        net_to_creator: netToCreator,
      });
    if (error) {
      if (error.code === '23505') return { error: 'You already own this content.' };
      return { error: error.message };
    }
    await refreshPurchases();
    await refreshFeed();
    return { error: null };
  }, [user, platformSettings, refreshPurchases, refreshFeed]);

  const handlePayment = useCallback(async (contentId: string, creatorId: string) => {
    try {
      const checkout = await createWhopCheckout({ creatorId, contentId });
      if (!checkout.invoice_url) {
        addToast('Payment checkout URL is missing. Please try again.', 'error');
        return;
      }
      if (checkout.guest_token) {
        sessionStorage.setItem('guest_checkout_token', checkout.guest_token);
      }
      setIsRedirecting(true);
      window.location.href = checkout.invoice_url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed to initialize.';
      addToast(message, 'error');
    }
  }, [addToast]);

  const isUnlocked = useCallback((contentId: string) => {
    return myPurchases.some((p) => p.content_id === contentId);
  }, [myPurchases]);

  const recordSubscription = useCallback(async (creatorId: string, amount: number, paymentId: string) => {
    if (!user) return { error: 'You must be signed in.' };
    const feePercent = platformSettings?.platform_fee_percent ?? 30;
    const platformFee = Math.round(amount * feePercent / 100 * 100) / 100;
    const netToCreator = Math.round((amount - platformFee) * 100) / 100;
    const { error } = await supabase
      .from('subscriptions')
      .insert({
        subscriber_id: user.id,
        creator_id: creatorId,
        amount,
        status: 'active',
        payment_id: paymentId,
        payment_provider: 'whop',
        platform_fee: platformFee,
        net_to_creator: netToCreator,
      });
    if (error) {
      if (error.code === '23505') return { error: 'You are already subscribed to this creator.' };
      return { error: error.message };
    }
    await refreshSubscriptions();
    await refreshEarnings();
    await refreshBalances();
    return { error: null };
  }, [user, platformSettings, refreshSubscriptions, refreshEarnings, refreshBalances]);

  const handleSubscriptionPayment = useCallback(async (creatorId: string) => {
    if (!user) {
      addToast('Please sign in to subscribe.', 'error');
      openAuth('signin');
      return;
    }

    try {
      const checkout = await createWhopCheckout({ creatorId });
      if (!checkout.invoice_url) {
        addToast('Payment checkout URL is missing. Please try again.', 'error');
        return;
      }
      setIsRedirecting(true);
      window.location.href = checkout.invoice_url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Subscription checkout failed to initialize.';
      addToast(message, 'error');
    }
  }, [user, addToast, openAuth]);

  const handleTipPayment = useCallback(async (creatorId: string, contentId: string, amount: number) => {
    try {
      const checkout = await createWhopCheckout({ creatorId, contentId, tipAmount: amount });
      if (!checkout.invoice_url) {
        addToast('Tip checkout URL is missing. Please try again.', 'error');
        return;
      }
      if (checkout.guest_token) {
        sessionStorage.setItem('guest_checkout_token', checkout.guest_token);
      }
      setIsRedirecting(true);
      window.location.href = checkout.invoice_url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tip payment failed to initialize.';
      addToast(message, 'error');
    }
  }, [addToast]);

  const isSubscribed = useCallback((creatorId: string) => {
    return mySubscriptions.some((s) => s.creator_id === creatorId && s.status === 'active');
  }, [mySubscriptions]);

  const checkSubscription = useCallback(async (creatorId: string): Promise<boolean> => {
    if (!user) return false;
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('subscriber_id', user.id)
      .eq('creator_id', creatorId)
      .eq('status', 'active')
      .maybeSingle();
    if (error) {
      console.error('Subscription check failed:', error.message);
      return mySubscriptions.some((s) => s.creator_id === creatorId && s.status === 'active');
    }
    const isActive = !!data;
    if (isActive && !mySubscriptions.some((s) => s.creator_id === creatorId)) {
      await refreshSubscriptions();
    }
    return isActive;
  }, [user, mySubscriptions, refreshSubscriptions]);

  const getSubscriptionLink = useCallback((username: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://velour.app';
    return `${origin}/#c/${username}/subscribe`;
  }, []);

  const saveBankDetails = useCallback(async (details: Pick<BankDetails, 'bank_name' | 'account_holder_name' | 'bank_account_number' | 'ifsc_code' | 'pan_card_number'>) => {
    if (!user) return { error: 'Not signed in.' };
    const creatorId = activeProfileId || user.id;
    const { error } = await supabase
      .from('bank_details')
      .upsert({ profile_id: creatorId, ...details, updated_at: new Date().toISOString() }, { onConflict: 'profile_id' });
    if (error) return { error: error.message };
    await refreshBankDetails();
    return { error: null };
  }, [user, activeProfileId, refreshBankDetails]);

  const requestPayout = useCallback(async (amountUsd: number) => {
    if (!user) return { error: 'Not signed in.' };
    if (amountUsd <= 0) return { error: 'Amount must be greater than zero.' };
    const creatorId = activeProfileId || user.id;
    if (!bankDetails) return { error: 'Please add your bank account details first.' };
    const amountInr = Math.round(amountUsd * 83 * 100) / 100;
    const { error } = await supabase
      .from('payouts')
      .insert({
        profile_id: creatorId,
        amount_usd: amountUsd,
        amount_inr: amountInr,
        status: 'processing',
        reference_id: `PO-${Date.now()}`,
      });
    if (error) return { error: error.message };
    await refreshPayouts();
    await refreshEarnings();
    await refreshBalances();
    addToast(`Payout request submitted for ${amountUsd.toFixed(2)} (₹${amountInr.toFixed(2)}). Status: Processing.`, 'success');
    return { error: null };
  }, [user, activeProfileId, bankDetails, refreshPayouts, refreshEarnings, refreshBalances, addToast]);

  const deleteContent = useCallback(async (contentId: string) => {
    const { error } = await supabase.from('content').delete().eq('id', contentId);
    if (error) return { error: error.message };
    await refreshMyContent();
    await refreshFeed();
    return { error: null };
  }, [refreshMyContent, refreshFeed]);

  const togglePrivate = useCallback(async (contentId: string, isPrivate: boolean) => {
    const { error } = await supabase.from('content').update({ is_private: isPrivate }).eq('id', contentId);
    if (error) return { error: error.message };
    await refreshMyContent();
    await refreshFeed();
    return { error: null };
  }, [refreshMyContent, refreshFeed]);

  const togglePublished = useCallback(async (contentId: string, isPublished: boolean) => {
    const { error } = await supabase.from('content').update({ is_published: isPublished }).eq('id', contentId);
    if (error) return { error: error.message };
    await refreshMyContent();
    await refreshFeed();
    return { error: null };
  }, [refreshMyContent, refreshFeed]);

  const duplicateContent = useCallback(async (contentId: string) => {
    const creatorId = activeProfileId || user?.id;
    if (!creatorId) return { error: 'Not signed in.' };
    const { data: original, error: fetchError } = await supabase
      .from('content')
      .select('*')
      .eq('id', contentId)
      .maybeSingle();
    if (fetchError) return { error: fetchError.message };
    if (!original) return { error: 'Content not found.' };
    const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = original;
    const { error: insertError } = await supabase
      .from('content')
      .insert({
        ...rest,
        creator_id: creatorId,
        title: `${original.title} (Copy)`,
        views_count: 0,
        is_private: false,
        is_published: false,
      });
    if (insertError) return { error: insertError.message };
    await refreshMyContent();
    return { error: null };
  }, [activeProfileId, user, refreshMyContent]);

  const updateProfile = useCallback(async (updates: Partial<Pick<Profile, 'display_name' | 'bio' | 'avatar_url' | 'username' | 'subscription_price' | 'email_sales_alerts' | 'email_payout_alerts' | 'email_account_alerts' | 'preferred_payout_method' | 'upi_id' | 'crypto_wallet_address' | 'crypto_network'>>) => {
    if (!user) return { error: 'Not signed in.' };
    const targetId = activeProfileId || user.id;
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', targetId);
    if (error) return { error: error.message };
    await refreshProfile();
    await refreshProfiles();
    await refreshFeed();
    return { error: null };
  }, [user, activeProfileId, refreshProfile, refreshProfiles, refreshFeed]);

  const uploadAvatar = useCallback(async (file: File) => {
    if (!user) return { error: 'Not signed in.', url: null };
    const profileScope = activeProfileId || user.id;
    const fileExt = file.name.split('.').pop();
    const fileName = `avatars/${profileScope}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('creator-media')
      .upload(fileName, file);
    if (uploadError) return { error: uploadError.message, url: null };
    const { data: urlData } = supabase.storage
      .from('creator-media')
      .getPublicUrl(fileName);
    return { error: null, url: urlData.publicUrl };
  }, [user, activeProfileId]);

  const setActiveProfile = useCallback((profileId: string) => {
    setActiveProfileId(profileId);
  }, []);

  const createSubProfile = useCallback(async (username: string, displayName: string) => {
    if (!user) return { error: 'Not signed in.' };
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: crypto.randomUUID(),
        username,
        display_name: displayName,
        owner_id: user.id,
        is_primary: false,
      });
    if (error) return { error: error.message };
    await refreshProfiles();
    return { error: null };
  }, [user, refreshProfiles]);

  const deleteSubProfile = useCallback(async (profileId: string) => {
    if (!user) return { error: 'Not signed in.' };
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', profileId)
      .eq('owner_id', user.id)
      .eq('is_primary', false);
    if (error) return { error: error.message };
    if (activeProfileId === profileId) {
      setActiveProfileId(null);
    }
    await refreshProfiles();
    return { error: null };
  }, [user, activeProfileId, refreshProfiles]);

  const openProfileEdit = useCallback(() => setIsProfileEditOpen(true), []);
  const closeProfileEdit = useCallback(() => setIsProfileEditOpen(false), []);
  const openUpload = useCallback(() => setIsUploadOpen(true), []);
  const closeUpload = useCallback(() => setIsUploadOpen(false), []);
  const openPersonaSwitcher = useCallback(() => setIsPersonaSwitcherOpen(true), []);
  const closePersonaSwitcher = useCallback(() => setIsPersonaSwitcherOpen(false), []);
  const openEditPost = useCallback((contentId: string) => setEditPostId(contentId), []);
  const closeEditPost = useCallback(() => setEditPostId(null), []);

  const updateContent = useCallback(async (contentId: string, updates: { title?: string; description?: string | null; price?: number; blur_level?: 'low' | 'medium' | 'hard' }) => {
    const { error } = await supabase.from('content').update(updates).eq('id', contentId);
    if (error) return { error: error.message };
    await refreshMyContent();
    await refreshFeed();
    return { error: null };
  }, [refreshMyContent, refreshFeed]);

  const addMediaToContent = useCallback(async (contentId: string, files: File[]) => {
    const creatorId = activeProfileId || user?.id;
    if (!creatorId) return { error: 'Not signed in.' };
    const { data: existing } = await supabase.from('content_media').select('display_order').eq('content_id', contentId).order('display_order', { ascending: false }).limit(1).maybeSingle();
    let nextOrder = (existing?.display_order ?? -1) + 1;
    const uploadedUrls: { url: string; type: 'image' | 'video' }[] = [];
    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      const fileExt = file.name.split('.').pop();
      const fileName = `${creatorId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('creator-media').upload(fileName, file);
      if (uploadError) return { error: uploadError.message };
      const { data: urlData } = supabase.storage.from('creator-media').getPublicUrl(fileName);
      uploadedUrls.push({ url: urlData.publicUrl, type: isImage ? 'image' : 'video' });
    }
    if (uploadedUrls.length > 0) {
      const mediaRecords = uploadedUrls.map((m) => ({ content_id: contentId, media_url: m.url, media_type: m.type, display_order: nextOrder++ }));
      const { error: mediaError } = await supabase.from('content_media').insert(mediaRecords);
      if (mediaError) return { error: mediaError.message };
      const { data: content } = await supabase.from('content').select('media_count').eq('id', contentId).maybeSingle();
      const newCount = (content?.media_count ?? 1) + uploadedUrls.length;
      await supabase.from('content').update({ media_count: newCount }).eq('id', contentId);
    }
    await refreshMyContent();
    await refreshFeed();
    return { error: null };
  }, [activeProfileId, user, refreshMyContent, refreshFeed]);

  const removeMediaFromContent = useCallback(async (contentId: string, mediaId: string) => {
    const { error } = await supabase.from('content_media').delete().eq('id', mediaId).eq('content_id', contentId);
    if (error) return { error: error.message };
    const { data: content } = await supabase.from('content').select('media_count').eq('id', contentId).maybeSingle();
    const newCount = Math.max(1, (content?.media_count ?? 1) - 1);
    await supabase.from('content').update({ media_count: newCount }).eq('id', contentId);
    await refreshMyContent();
    await refreshFeed();
    return { error: null };
  }, [refreshMyContent, refreshFeed]);

  const value: StoreContextValue = {
    loading,
    user,
    session,
    profile,
    profiles,
    activeProfileId,
    isAgeVerified,
    isAdminEmail,
    isAuthModalOpen,
    authMode,
    isProfileEditOpen,
    isUploadOpen,
    isPersonaSwitcherOpen,
    isRedirecting,
    toasts,
    feed,
    myContent,
    myPurchases,
    mySubscriptions,
    earnings,
    balances,
    bankDetails,
    payouts,
    platformSettings,
    setAgeVerified: setIsAgeVerified,
    openAuth,
    closeAuth,
    setAuthMode,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    refreshProfiles,
    refreshMyContent,
    refreshFeed,
    refreshPurchases,
    refreshSubscriptions,
    refreshEarnings,
    refreshBalances,
    refreshBankDetails,
    refreshPayouts,
    refreshPlatformSettings,
    saveBankDetails,
    requestPayout,
    updatePlatformFee,
    addToast,
    removeToast,
    purchaseContent,
    handlePayment,
    recordPurchase,
    isUnlocked,
    handleSubscriptionPayment,
    handleTipPayment,
    recordSubscription,
    isSubscribed,
    checkSubscription,
    getSubscriptionLink,
    deleteContent,
  togglePrivate,
  togglePublished,
  duplicateContent,
    updateContent,
    addMediaToContent,
    removeMediaFromContent,
    editPostId,
    openEditPost,
    closeEditPost,
    updateProfile,
    uploadAvatar,
    setActiveProfile,
    createSubProfile,
    deleteSubProfile,
    openProfileEdit,
    closeProfileEdit,
    openUpload,
    closeUpload,
    openPersonaSwitcher,
    closePersonaSwitcher,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
