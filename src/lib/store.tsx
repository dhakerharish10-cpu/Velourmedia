import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { findRestrictedKeyword, restrictedKeywordMessage } from './contentRules';
import type { Profile, Content, Purchase, CreatorEarnings, CreatorBalances, BankDetails, Payout, PlatformSettings } from './types';

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
  earnings: CreatorEarnings | null;
  balances: CreatorBalances | null;
  bankDetails: BankDetails | null;
  payouts: Payout[];
  platformSettings: PlatformSettings | null;
  salesVisibilityPercent: number;
  refreshSalesVisibility: () => Promise<void>;
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
  handlePayment: (contentId: string, creatorId: string) => Promise<void>;

  isUnlocked: (contentId: string) => boolean;
  handleTipPayment: (creatorId: string, contentId: string, amount: number) => Promise<void>;
  getProfileLink: (username: string) => string;
  deleteContent: (contentId: string) => Promise<{ error: string | null }>;
  togglePrivate: (contentId: string, isPrivate: boolean) => Promise<{ error: string | null }>;
  togglePublished: (contentId: string, isPublished: boolean) => Promise<{ error: string | null }>;
  duplicateContent: (contentId: string) => Promise<{ error: string | null }>;
  updateContent: (contentId: string, updates: { title?: string; description?: string | null; price?: number; blur_level?: 'low' | 'medium' | 'hard'; blur_percent?: number }) => Promise<{ error: string | null }>;
  addMediaToContent: (contentId: string, files: File[]) => Promise<{ error: string | null }>;
  removeMediaFromContent: (contentId: string, mediaId: string) => Promise<{ error: string | null }>;
  editPostId: string | null;
  openEditPost: (contentId: string) => void;
  closeEditPost: () => void;
  updateProfile: (updates: Partial<Pick<Profile, 'display_name' | 'bio' | 'avatar_url' | 'username' | 'email_sales_alerts' | 'email_payout_alerts' | 'email_account_alerts' | 'preferred_payout_method' | 'upi_id' | 'crypto_wallet_address' | 'crypto_network'>>) => Promise<{ error: string | null }>;
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

const ADMIN_EMAIL = 'dhakerharish10@gmail.com';

export function isAdminEmailCheck(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === ADMIN_EMAIL;
}

const StoreContext = createContext<StoreContextValue | null>(null);

async function loadCreators(ids: Array<string | null | undefined>): Promise> {
  const unique = Array.from(new Set(ids.filter((id): id is string => !!id)));
  const map = new Map<string, Profile>();
  if (unique.length === 0) return map;
  const { data, error } = await supabase.from('public_profiles').select('*').in('id', unique);
  if (error) {
    console.error('Failed to load creators:', error.message);
    return map;
  }
  (data || []).forEach((p) => map.set(p.id as string, p as Profile));
  return map;
}

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
  const [earnings, setEarnings] = useState<CreatorEarnings | null>(null);
  const [balances, setBalances] = useState<CreatorBalances | null>(null);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [salesVisibilityPercent, setSalesVisibilityPercent] = useState(100);

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
    if (data && data.length > 0 && !activeProfileId) {
      setActiveProfileId(data[0].id);
    }
  }, [user, activeProfileId]);

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
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      console.error('Failed to load feed:', error.message);
      return;
    }
    const rows = data || [];
    const creators = await loadCreators(rows.map((c) => c.creator_id));
    setFeed(rows.map((c) => ({ ...c, creator: creators.get(c.creator_id) })) as unknown as Content[]);
  }, []);

  const refreshPurchases = useCallback(async () => {
    if (!user) {
      setMyPurchases([]);
      return;
    }
    const { data, error } = await supabase
      .from('purchases')
      .select('*, content:content(*)')
      .eq('buyer_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to load purchases:', error.message);
      return;
    }
    const rows = data || [];
    const creators = await loadCreators(rows.map((p) => p.content?.creator_id));
    setMyPurchases(
      rows.map((p) =>
        p.content ? { ...p, content: { ...p.content, creator: creators.get(p.content.creator_id) } } : p
      ) as unknown as Purchase[]
    );
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
    const { error } = await supabase.rpc('admin_set_platform_fee', { p_percent: clamped });
    if (error) return { error: error.message };
    await refreshPlatformSettings();
    return { error: null };
  }, [user, refreshPlatformSettings]);

  const refreshSalesVisibility = useCallback(async () => {
    if (!activeProfileId && !user) return;
    const creatorId = activeProfileId || user?.id;
    if (!creatorId) return;
    const { data, error } = await supabase.rpc('get_creator_sales_visibility', { p_profile_id: creatorId });
    if (error || !data || data.length === 0) return;
    const row = data[0] as { visible_ratio: number; sales_hidden: boolean };
    if (row.sales_hidden) setSalesVisibilityPercent(0);
    else setSalesVisibilityPercent(row.visible_ratio);
  }, [user, activeProfileId]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setIsAdminEmail(isAdminEmailCheck(session?.user?.email));
      setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsAdminEmail(isAdminEmailCheck(session?.user?.email));
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (user) {
      setIsAgeVerified(true);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshProfile();
      refreshProfiles();
      refreshMyContent();
      refreshPurchases();
      refreshEarnings();
      refreshBalances();
      refreshBankDetails();
      refreshPayouts();
      refreshPlatformSettings();
      refreshSalesVisibility();
    } else {
      setProfile(null);
      setProfiles([]);
      setMyContent([]);
      setMyPurchases([]);
      setEarnings(null);
      setBankDetails(null);
      setPayouts([]);
      setPlatformSettings(null);
      setActiveProfileId(null);
      setSalesVisibilityPercent(100);
    }
  }, [user, activeProfileId, refreshProfile, refreshProfiles, refreshMyContent, refreshPurchases, refreshEarnings, refreshBalances, refreshBankDetails, refreshPayouts, refreshPlatformSettings, refreshSalesVisibility]);

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
    setIsAdminEmail(isAdminEmailCheck(email));
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
    setEarnings(null);
    setActiveProfileId(null);
    setIsAgeVerified(false);
    setIsAdminEmail(false);
  }, []);

  const handlePayment = useCallback(async (contentId: string, _creatorId: string) => {
    setIsRedirecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { content_id: contentId },
      });
      if (error || !data?.url) throw new Error('Unable to start checkout. Please try again.');
      window.location.href = data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to start checkout. Please try again.';
      addToast(message, 'error');
      setIsRedirecting(false);
    }
  }, [addToast]);

  const isUnlocked = useCallback((contentId: string) => {
    return myPurchases.some((p) => p.content_id === contentId);
  }, [myPurchases]);

  const handleTipPayment = useCallback(async (_creatorId: string, _contentId: string, _tipAmount: number) => {
    addToast('Tips are not available yet.', 'error');
  }, [addToast]);

  const getProfileLink = useCallback((username: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://velour.app';
    return `${origin}/#c/${username}`;
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
    if (!user || !creatorId) return { error: 'Not signed in.' };
    const { data: original, error: fetchError } = await supabase
      .from('content')
      .select('*')
      .eq('id', contentId)
      .maybeSingle();
    if (fetchError) return { error: fetchError.message };
    if (!original) return { error: 'Content not found.' };

    const ownsOriginal = original.creator_id === user.id || profiles.some((p) => p.id === original.creator_id);
    if (!ownsOriginal) return { error: 'You can only duplicate your own posts.' };

    const copyTitle = `${original.title} (Copy)`;
    const bad = findRestrictedKeyword(copyTitle, original.description);
    if (bad) return { error: restrictedKeywordMessage(bad) };

    const { data: copy, error: insertError } = await supabase
      .from('content')
      .insert({
        creator_id: creatorId,
        title: copyTitle,
        description: original.description,
        media_url: original.media_url,
        media_type: original.media_type,
        thumbnail_url: original.thumbnail_url,
        price: original.price,
        media_count: original.media_count,
        blur_level: original.blur_level,
        blur_percent: original.blur_percent,
        views_count: 0,
        is_published: false,
        is_adult: false,
      })
      .select('id')
      .single();
    if (insertError || !copy) return { error: insertError?.message ?? 'Could not duplicate the post.' };

    if (Number(original.media_count) > 1) {
      const { data: mediaRows, error: mediaFetchError } = await supabase
        .from('content_media')
        .select('media_url, media_type, display_order, preview_url')
        .eq('content_id', contentId)
        .order('display_order', { ascending: true });
      if (mediaFetchError) {
        await supabase.from('content').delete().eq('id', copy.id);
        return { error: mediaFetchError.message };
      }
      if (mediaRows && mediaRows.length > 0) {
        const { error: mediaInsertError } = await supabase
          .from('content_media')
          .insert(mediaRows.map((m) => ({ ...m, content_id: copy.id })));
        if (mediaInsertError) {
          await supabase.from('content').delete().eq('id', copy.id);
          return { error: `Could not copy the media: ${mediaInsertError.message}` };
        }
      }
    }

    await refreshMyContent();
    return { error: null };
  }, [activeProfileId, user, profiles, refreshMyContent]);

  const updateProfile = useCallback(async (updates: Partial<Pick<Profile, 'display_name' | 'bio' | 'avatar_url' | 'username' | 'email_sales_alerts' | 'email_payout_alerts' | 'email_account_alerts' | 'preferred_payout_method' | 'upi_id' | 'crypto_wallet_address' | 'crypto_network'>>) => {
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

  const updateContent = useCallback(async (contentId: string, updates: { title?: string; description?: string | null; price?: number; blur_level?: 'low' | 'medium' | 'hard'; blur_percent?: number }) => {
    const bad = findRestrictedKeyword(updates.title, updates.description);
    if (bad) return { error: restrictedKeywordMessage(bad) };
    const { error } = await supabase.from('content').update(updates).eq('id', contentId);
    if (error) return { error: error.message };
    await refreshMyContent();
    await refreshFeed();
    return { error: null };
  }, [refreshMyContent, refreshFeed]);

  const addMediaToContent = useCallback(async (contentId: string, files: File[]) => {
    if (!user) return { error: 'Not signed in.' };
    if (files.length === 0) return { error: null };

    const { data: post, error: postError } = await supabase
      .from('content')
      .select('creator_id, price, title, description, media_url, media_type, thumbnail_url, media_count')
      .eq('id', contentId)
      .maybeSingle();
    if (postError) return { error: postError.message };
    if (!post) return { error: 'Post not found.' };

    const bad = findRestrictedKeyword(post.title, post.description, ...files.map((f) => f.name));
    if (bad) return { error: restrictedKeywordMessage(bad) };

    const isPaid = Number(post.price) > 0;
    const bucket = isPaid ? 'paid-media' : 'creator-media';
    const folder = post.creator_id;

    const uploaded: string[] = [];
    const insertedIds: string[] = [];
    const cleanup = async () => {
      if (insertedIds.length > 0) await supabase.from('content_media').delete().in('id', insertedIds);
      if (uploaded.length > 0) await supabase.storage.from(bucket).remove(uploaded);
    };

    try {
      const { count: existingCount, error: countError } = await supabase
        .from('content_media').select('id', { count: 'exact', head: true }).eq('content_id', contentId);
      if (countError) return { error: countError.message };

      const { data: last } = await supabase.from('content_media').select('display_order')
        .eq('content_id', contentId).order('display_order', { ascending: false }).limit(1).maybeSingle();
      let nextOrder = (last?.display_order ?? -1) + 1;

      if ((existingCount ?? 0) === 0) {
        const { data: firstRow, error: firstError } = await supabase.from('content_media').insert({
          content_id: contentId,
          media_url: post.media_url,
          media_type: post.media_type,
          display_order: 0,
          preview_url: isPaid ? post.thumbnail_url : null,
        }).select('id').single();
        if (firstError) return { error: firstError.message };
        insertedIds.push(firstRow.id);
        nextOrder = 1;
      }

      const rows: { content_id: string; media_url: string; media_type: 'image' | 'video'; display_order: number }[] = [];
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const isImage = file.type.startsWith('image/');
        const ext = (file.name.split('.').pop() || (isImage ? 'jpg' : 'mp4')).toLowerCase();
        const path = `${folder}/${Date.now()}-${index}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
          contentType: file.type || (isImage ? 'image/jpeg' : 'video/mp4'),
          cacheControl: '3600',
          upsert: false,
        });
        if (uploadError) {
          await cleanup();
          return { error: `Failed to upload ${file.name}: ${uploadError.message}` };
        }
        uploaded.push(path);
        const url = isPaid ? path : supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
        rows.push({ content_id: contentId, media_url: url, media_type: isImage ? 'image' : 'video', display_order: nextOrder++ });
      }

      const { data: inserted, error: mediaError } = await supabase.from('content_media').insert(rows).select('id');
      if (mediaError) {
        await cleanup();
        return { error: `Could not save the new media: ${mediaError.message}` };
      }
      (inserted ?? []).forEach((r) => insertedIds.push(r.id));

      const { count: total } = await supabase
        .from('content_media').select('id', { count: 'exact', head: true }).eq('content_id', contentId);
      const { error: countUpdateError } = await supabase
        .from('content').update({ media_count: Math.max(1, total ?? 1) }).eq('id', contentId);
      if (countUpdateError) {
        await cleanup();
        return { error: `Could not update the post: ${countUpdateError.message}` };
      }
    } catch (e) {
      await cleanup();
      return { error: e instanceof Error ? e.message : 'Could not add media.' };
    }

    await refreshMyContent();
    await refreshFeed();
    return { error: null };
  }, [user, refreshMyContent, refreshFeed]);

  const removeMediaFromContent = useCallback(async (contentId: string, mediaId: string) => {
    const { error } = await supabase.from('content_media').delete().eq('id', mediaId).eq('content_id', contentId);
    if (error) return { error: error.message };
    const { count: remaining } = await supabase
      .from('content_media').select('id', { count: 'exact', head: true }).eq('content_id', contentId);
    await supabase.from('content').update({ media_count: Math.max(1, remaining ?? 1) }).eq('id', contentId);
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
    earnings,
    balances,
    bankDetails,
    payouts,
    platformSettings,
    salesVisibilityPercent,
    refreshSalesVisibility,
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
    handlePayment,
    isUnlocked,
    handleTipPayment,
    getProfileLink,
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
