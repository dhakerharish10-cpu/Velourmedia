import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { Navbar } from '../components/Navbar';
import { AuthModal } from '../components/AuthModal';
import type { Profile, Content, Purchase, Payout, BankDetails, ContentReport } from '../lib/types';
import {
  Shield, Users, DollarSign, ArrowLeft, Percent, Save, TrendingUp, Wallet,
  CheckCircle, XCircle, Clock, Ban, Power, Eye, EyeOff, Trash2, FileCheck,
  Banknote, Bitcoin, Flag, Receipt, SlidersHorizontal, RefreshCw,
} from 'lucide-react';
import { syncWhopPayments } from '../lib/whop';
import { DmcaTab } from '../components/admin/DmcaTab';
import { TransactionsTab } from '../components/admin/TransactionsTab';
import { SecurityTab } from '../components/admin/SecurityTab';
import { SalesManagementTab } from '../components/admin/SalesManagementTab';

interface AdminStats {
  total_gross_volume: number;
  total_platform_profit: number;
  active_creators_count: number;
  pending_kyc_count: number;
  pending_payouts_count: number;
}

type Tab = 'overview' | 'kyc' | 'payouts' | 'creators' | 'content' | 'dmca' | 'transactions' | 'security' | 'sales';

interface AdminPanelProps {
  onNavigate: (path: string) => void;
}

export function AdminPanel({ onNavigate }: AdminPanelProps) {
  const { user, profile, platformSettings, updatePlatformFee, addToast, isAdminEmail } = useStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [allContent, setAllContent] = useState<Content[]>([]);
  const [allPurchases, setAllPurchases] = useState<Purchase[]>([]);
  const [payouts, setPayouts] = useState<(Payout & { profile?: Profile })[]>([]);
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [bankDetailsMap, setBankDetailsMap] = useState<Record<string, BankDetails>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [feeInput, setFeeInput] = useState(String(platformSettings?.platform_fee_percent ?? 30));
  const [savingFee, setSavingFee] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setFeeInput(String(platformSettings?.platform_fee_percent ?? 30));
  }, [platformSettings]);

  const loadData = useCallback(async () => {
    const [p, c, pu, pa, bd, cr] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('content').select('*, creator:profiles(*)').order('created_at', { ascending: false }),
      supabase.from('purchases').select('*, content:content(*, creator:profiles(*))').order('created_at', { ascending: false }),
      supabase.from('payouts').select('*, profile:profiles(*)').order('requested_at', { ascending: false }),
      supabase.from('bank_details').select('*'),
      supabase.from('content_reports').select('*, content:content(*)').order('created_at', { ascending: false }),
    ]);

    setProfiles((p.data || []) as Profile[]);
    setAllContent((c.data || []) as Content[]);
    setAllPurchases((pu.data || []) as Purchase[]);
    setPayouts((pa.data || []) as unknown as (Payout & { profile?: Profile })[]);
    const bdMap: Record<string, BankDetails> = {};
    (bd.data || []).forEach((b: BankDetails) => { bdMap[b.profile_id] = b; });
    setBankDetailsMap(bdMap);
    setReports((cr.data || []) as ContentReport[]);
  }, []);

  const hasAdminAccess = !!profile?.is_admin || isAdminEmail;

  useEffect(() => {
    if (!hasAdminAccess) return;
    let active = true;
    (async () => {
      setLoading(true);
      await loadData();
      await reloadStats();
      if (!active) return;
      setLoading(false);
    })();
    return () => { active = false; };
  }, [hasAdminAccess, loadData]);

  // Auto-sync Whop payments on first admin page mount
  const [autoSynced, setAutoSynced] = useState(false);
  useEffect(() => {
    if (!hasAdminAccess || autoSynced) return;
    setAutoSynced(true);
    (async () => {
      setSyncing(true);
      try {
        const result = await syncWhopPayments();
        if (result.synced > 0) {
          addToast(`Auto-synced ${result.synced} payment(s) from Whop.`, 'success');
          await loadData();
          await reloadStats();
        }
      } catch {
        // Silent failure on auto-sync — manual button still available
      } finally {
        setSyncing(false);
      }
    })();
  }, [hasAdminAccess, autoSynced, addToast, loadData]);

  const handleSyncWhop = async () => {
    setSyncing(true);
    try {
      const result = await syncWhopPayments();
      const totalNew = result.synced + result.historical;
      addToast(
        totalNew > 0
          ? `Synced ${result.synced} checkout payment(s) + ${result.historical} historical payment(s) from Whop.`
          : `Whop sync complete — all payments already up to date.`,
        'success',
      );
      await loadData();
      await reloadStats();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to sync Whop payments.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const reloadStats = async () => {
    // Query transactions table directly — extract amount from raw_payload.data.initial_price when amount column is 0
    const [txRes, profRes, payoutRes] = await Promise.all([
      supabase.from('transactions').select('amount, raw_payload, status'),
      supabase.from('profiles').select('is_primary, is_suspended, kyc_status'),
      supabase.from('payouts').select('status'),
    ]);

    const txRows = (txRes.data || []) as Array<Record<string, unknown>>;
    let grossVolume = 0;
    for (const t of txRows) {
      let amt = Number(t.amount || 0);
      if (amt === 0) {
        const raw = t.raw_payload as Record<string, unknown> | undefined;
        const rawData = raw?.data as Record<string, unknown> | undefined;
        const initialPrice = rawData ? Number(rawData.initial_price || 0) : 0;
        if (initialPrice > 0) amt = initialPrice;
      }
      grossVolume += amt;
    }
    const platformProfit = Math.round(grossVolume * 0.3 * 100) / 100;

    const profRows = (profRes.data || []) as Array<Record<string, unknown>>;
    const activeCreators = profRows.filter((p) => p.is_primary === true && p.is_suspended === false).length;
    const pendingKyc = profRows.filter((p) => p.kyc_status === 'pending').length;

    const payoutRows = (payoutRes.data || []) as Array<Record<string, unknown>>;
    const pendingPayouts = payoutRows.filter((p) => p.status === 'pending' || p.status === 'processing').length;

    setStats({
      total_gross_volume: grossVolume,
      total_platform_profit: platformProfit,
      active_creators_count: activeCreators,
      pending_kyc_count: pendingKyc,
      pending_payouts_count: pendingPayouts,
    });
  };

  // Redirect non-admins to dashboard with access denied message
  useEffect(() => {
    if (user && profile && !hasAdminAccess) {
      addToast('Access denied. Admin privileges required.', 'error');
      onNavigate('dashboard');
    }
  }, [user, profile, hasAdminAccess, addToast, onNavigate]);

  if (!user || !hasAdminAccess) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950">
        <Navbar onNavigate={onNavigate} />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <Shield size={32} className="mx-auto text-slate-400 dark:text-zinc-600 mb-3" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Admin Access Required</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            {user ? 'Redirecting to dashboard...' : 'You don\'t have permission to view this page.'}
          </p>
          <button onClick={() => onNavigate(user ? 'dashboard' : '')} className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
            {user ? 'Go to Dashboard' : 'Back to Discover'}
          </button>
        </div>
      </div>
    );
  }

  const handleSaveFee = async () => {
    const val = parseFloat(feeInput);
    if (isNaN(val) || val < 0 || val > 100) {
      addToast('Enter a fee between 0 and 100.', 'error');
      return;
    }
    setSavingFee(true);
    const { error } = await updatePlatformFee(val);
    setSavingFee(false);
    if (error) addToast(error, 'error');
    else addToast(`Platform fee updated to ${val}%.`, 'success');
  };

  const handleKycAction = async (profileId: string, status: 'approved' | 'rejected') => {
    setActionLoading(`${profileId}-${status}`);
    const { error } = await supabase.rpc('admin_set_kyc_status', { p_profile_id: profileId, p_status: status });
    setActionLoading(null);
    if (error) {
      addToast(`Failed to ${status} KYC.`, 'error');
      return;
    }
    addToast(`KYC ${status} for creator.`, 'success');
    await loadData();
    await reloadStats();
  };

  const handlePayoutPaid = async (payoutId: string) => {
    setActionLoading(`payout-${payoutId}`);
    const { error } = await supabase.rpc('admin_mark_payout_paid', { p_payout_id: payoutId });
    setActionLoading(null);
    if (error) {
      addToast('Failed to mark payout as paid.', 'error');
      return;
    }
    addToast('Payout marked as paid. Creator notified.', 'success');
    await loadData();
    await reloadStats();
  };

  const handleSuspend = async (profileId: string, suspend: boolean) => {
    setActionLoading(`${profileId}-suspend`);
    const { error } = await supabase.rpc('admin_set_suspension', { p_profile_id: profileId, p_suspend: suspend });
    setActionLoading(null);
    if (error) {
      addToast(`Failed to ${suspend ? 'suspend' : 'activate'} account.`, 'error');
      return;
    }
    addToast(`Account ${suspend ? 'suspended' : 'activated'}.`, 'success');
    await loadData();
    await reloadStats();
  };

  const handleTogglePublish = async (contentId: string, publish: boolean) => {
    setActionLoading(`content-${contentId}`);
    const { error } = await supabase.from('content').update({ is_published: publish }).eq('id', contentId);
    setActionLoading(null);
    if (error) {
      addToast('Failed to update content.', 'error');
      return;
    }
    addToast(publish ? 'Content published.' : 'Content hidden.', 'success');
    await loadData();
  };

  const handleDeleteContent = async (contentId: string) => {
    if (!confirm('Permanently delete this content? This cannot be undone.')) return;
    setActionLoading(`del-${contentId}`);
    const { error } = await supabase.from('content').delete().eq('id', contentId);
    setActionLoading(null);
    if (error) {
      addToast('Failed to delete content.', 'error');
      return;
    }
    addToast('Content deleted.', 'success');
    await loadData();
  };

  const maskValue = (val: string, visible = 4) => {
    if (!val) return '—';
    if (val.length <= visible) return val;
    return val.slice(0, visible) + '••••' + val.slice(-2);
  };

  const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'sales', label: 'Sales Management', icon: SlidersHorizontal },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'kyc', label: 'KYC Review', icon: FileCheck },
    { id: 'payouts', label: 'Payouts', icon: Wallet },
    { id: 'dmca', label: 'DMCA / Reports', icon: Flag },
    { id: 'security', label: 'User Security', icon: Shield },
    { id: 'creators', label: 'Creators', icon: Users },
    { id: 'content', label: 'Content', icon: Eye },
  ];

  const pendingKycProfiles = profiles.filter((p) => p.kyc_status === 'pending' || p.kyc_status === 'approved' || p.kyc_status === 'rejected');
  const pendingPayouts = payouts.filter((p) => p.status === 'pending' || p.status === 'processing');

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Navbar onNavigate={onNavigate} currentPath="admin" />
      <AuthModal />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <button onClick={() => onNavigate('')} className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:text-white mb-6">
          <ArrowLeft size={16} /> Back
        </button>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
          <Shield size={22} className="text-indigo-600 dark:text-indigo-400" />
          Admin Panel
        </h1>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:border-indigo-500/50'
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
              {tab.id === 'kyc' && stats?.pending_kyc_count ? (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${activeTab === tab.id ? 'bg-white/20' : 'bg-amber-100 text-amber-600'}`}>{stats.pending_kyc_count}</span>
              ) : null}
              {tab.id === 'payouts' && stats?.pending_payouts_count ? (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${activeTab === tab.id ? 'bg-white/20' : 'bg-amber-100 text-amber-600'}`}>{stats.pending_payouts_count}</span>
              ) : null}
              {tab.id === 'dmca' && reports.filter((r) => r.status === 'pending').length > 0 ? (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${activeTab === tab.id ? 'bg-white/20' : 'bg-amber-100 text-amber-600'}`}>{reports.filter((r) => r.status === 'pending').length}</span>
              ) : null}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 dark:text-zinc-500">Loading...</div>
        ) : (
          <>
            {/* ============ OVERVIEW ============ */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Sync bar */}
                <div className="flex items-center justify-between rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 shadow-sm">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Whop Payment Sync</h3>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">Fetch all succeeded payments from Whop and sync them to the database.</p>
                  </div>
                  <button
                    onClick={handleSyncWhop}
                    disabled={syncing}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <StatCard icon={DollarSign} label="Gross Volume" value={`$${Number(stats?.total_gross_volume || 0).toFixed(2)}`} />
                  <StatCard icon={Wallet} label="Platform Profit (30%)" value={`$${Number(stats?.total_platform_profit || 0).toFixed(2)}`} accent />
                  <StatCard icon={Users} label="Active Creators" value={String(stats?.active_creators_count || 0)} />
                  <StatCard icon={FileCheck} label="Pending KYC" value={String(stats?.pending_kyc_count || 0)} />
                  <StatCard icon={Clock} label="Pending Payouts" value={String(stats?.pending_payouts_count || 0)} />
                </div>

                {/* Platform Fee Config */}
                <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Percent size={18} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">Platform Commission Fee</h3>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">
                    This percentage is automatically deducted from every content purchase. The remaining amount is credited to the creator's earnings balance.
                  </p>
                  <div className="flex items-center gap-3 max-w-xs">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={feeInput}
                        onChange={(e) => setFeeInput(e.target.value)}
                        min="0"
                        max="100"
                        step="0.5"
                        inputMode="decimal"
                        className="w-full rounded-lg bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:border-indigo-500 focus:outline-none pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 text-sm">%</span>
                    </div>
                    <button
                      onClick={handleSaveFee}
                      disabled={savingFee}
                      className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Save size={15} />
                      {savingFee ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                  {platformSettings?.updated_at && (
                    <p className="text-xs text-slate-400 dark:text-zinc-500 mt-3">
                      Last updated: {new Date(platformSettings.updated_at).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Creator Performance */}
                <CreatorPerformanceTable purchases={allPurchases} profiles={profiles} allContent={allContent} />

                {/* Recent Sales Log */}
                <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
                    Recent Sales Log
                    <span className="ml-2 text-xs font-normal text-slate-400 dark:text-zinc-500">({allPurchases.length} total)</span>
                  </h3>
                  {allPurchases.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-zinc-500 py-8 text-center">No sales yet. Click "Sync Now" to import from Whop.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-zinc-800 text-left">
                            <th className="py-2 px-3 text-xs font-medium text-slate-400 dark:text-zinc-500">Date</th>
                            <th className="py-2 px-3 text-xs font-medium text-slate-400 dark:text-zinc-500">Post Title</th>
                            <th className="py-2 px-3 text-xs font-medium text-slate-400 dark:text-zinc-500">Creator</th>
                            <th className="py-2 px-3 text-xs font-medium text-slate-400 dark:text-zinc-500">Buyer</th>
                            <th className="py-2 px-3 text-xs font-medium text-slate-400 dark:text-zinc-500 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allPurchases.slice(0, 30).map((p) => (
                            <tr key={p.id} className="border-b border-slate-100 dark:border-zinc-800/50 hover:bg-slate-50 dark:hover:bg-zinc-800/30">
                              <td className="py-2.5 px-3 text-xs text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                                {new Date(p.created_at).toLocaleDateString()}
                              </td>
                              <td className="py-2.5 px-3 max-w-[160px]">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.content?.title || 'Unknown'}</p>
                              </td>
                              <td className="py-2.5 px-3 text-xs text-slate-500 dark:text-zinc-400">
                                @{p.content?.creator?.username || '—'}
                              </td>
                              <td className="py-2.5 px-3 text-xs font-mono text-slate-500 dark:text-zinc-400 max-w-[140px] truncate">
                                {p.buyer_email || (p.buyer_id ? p.buyer_id.slice(0, 10) + '…' : 'Guest')}
                              </td>
                              <td className="py-2.5 px-3 text-right text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                ${Number(p.amount_paid).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-slate-200 dark:border-zinc-700">
                            <td colSpan={4} className="py-2.5 px-3 text-xs font-medium text-slate-500 dark:text-zinc-400 text-right">Total Gross Volume:</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                              ${allPurchases.reduce((s, p) => s + Number(p.amount_paid), 0).toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============ KYC ============ */}
            {activeTab === 'kyc' && (
              <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">KYC Submissions</h3>
                {pendingKycProfiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileCheck size={28} className="text-slate-300 dark:text-zinc-600 mb-2" />
                    <p className="text-sm text-slate-400 dark:text-zinc-500">No KYC submissions yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-zinc-800 text-left">
                          <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Creator</th>
                          <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Bank Details</th>
                          <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Crypto Wallet</th>
                          <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Submitted</th>
                          <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Status</th>
                          <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingKycProfiles.map((p) => {
                          const bd = bankDetailsMap[p.id];
                          return (
                            <tr key={p.id} className="border-b border-slate-100 dark:border-zinc-800/50 hover:bg-slate-50 dark:hover:bg-zinc-800/30">
                              <td className="py-3 px-3">
                                <p className="font-medium text-slate-900 dark:text-white">@{p.username}</p>
                                <p className="text-xs text-slate-400 dark:text-zinc-500">{p.display_name || '—'}</p>
                              </td>
                              <td className="py-3 px-3 text-slate-600 dark:text-zinc-300">
                                {bd ? (
                                  <div className="text-xs">
                                    <p>{bd.bank_name}</p>
                                    <p className="text-slate-400 dark:text-zinc-500">{maskValue(bd.bank_account_number)}</p>
                                  </div>
                                ) : <span className="text-slate-300 dark:text-zinc-600">—</span>}
                              </td>
                              <td className="py-3 px-3 text-slate-600 dark:text-zinc-300">
                                {p.crypto_wallet_address ? (
                                  <div className="text-xs">
                                    <p className="font-mono">{maskValue(p.crypto_wallet_address, 6)}</p>
                                    <p className="text-slate-400 dark:text-zinc-500">{p.crypto_network || 'TRC20'}</p>
                                  </div>
                                ) : <span className="text-slate-300 dark:text-zinc-600">—</span>}
                              </td>
                              <td className="py-3 px-3 text-xs text-slate-500 dark:text-zinc-400">
                                {new Date(p.created_at).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-3">
                                <KycStatusBadge status={p.kyc_status} />
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleKycAction(p.id, 'approved')}
                                    disabled={actionLoading === `${p.id}-approved` || p.kyc_status === 'approved'}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
                                  >
                                    <CheckCircle size={13} /> Approve
                                  </button>
                                  <button
                                    onClick={() => handleKycAction(p.id, 'rejected')}
                                    disabled={actionLoading === `${p.id}-rejected` || p.kyc_status === 'rejected'}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors disabled:opacity-40"
                                  >
                                    <XCircle size={13} /> Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ============ PAYOUTS ============ */}
            {activeTab === 'payouts' && (
              <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Payout Requests</h3>
                {pendingPayouts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Wallet size={28} className="text-slate-300 dark:text-zinc-600 mb-2" />
                    <p className="text-sm text-slate-400 dark:text-zinc-500">No pending payout requests.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-zinc-800 text-left">
                          <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Creator</th>
                          <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Amount</th>
                          <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Method</th>
                          <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Requested</th>
                          <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Status</th>
                          <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingPayouts.map((p) => {
                          const creator = p.profile;
                          const method = creator?.preferred_payout_method || 'bank';
                          return (
                            <tr key={p.id} className="border-b border-slate-100 dark:border-zinc-800/50 hover:bg-slate-50 dark:hover:bg-zinc-800/30">
                              <td className="py-3 px-3">
                                <p className="font-medium text-slate-900 dark:text-white">@{creator?.username || 'Unknown'}</p>
                              </td>
                              <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                                ${Number(p.amount_usd).toFixed(2)}
                                <span className="text-xs text-slate-400 dark:text-zinc-500 ml-1">/ ₹{Number(p.amount_inr).toFixed(0)}</span>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-300">
                                  {method === 'crypto' ? <Bitcoin size={13} /> : method === 'upi' ? <Banknote size={13} /> : <Banknote size={13} />}
                                  <span className="capitalize">{method}</span>
                                  {method === 'crypto' && creator?.crypto_wallet_address && (
                                    <span className="font-mono text-slate-400 dark:text-zinc-500">{maskValue(creator.crypto_wallet_address, 6)}</span>
                                  )}
                                  {method === 'upi' && creator?.upi_id && (
                                    <span className="text-slate-400 dark:text-zinc-500">{creator.upi_id}</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-xs text-slate-500 dark:text-zinc-400">
                                {new Date(p.requested_at).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-3">
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 capitalize">
                                  {p.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  onClick={() => handlePayoutPaid(p.id)}
                                  disabled={actionLoading === `payout-${p.id}`}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-50"
                                >
                                  <CheckCircle size={13} /> Mark as Paid
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ============ CREATORS ============ */}
            {activeTab === 'creators' && (
              <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">All Creators</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-zinc-800 text-left">
                        <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Creator</th>
                        <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Joined</th>
                        <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">KYC</th>
                        <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Status</th>
                        <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.map((p) => (
                        <tr key={p.id} className="border-b border-slate-100 dark:border-zinc-800/50 hover:bg-slate-50 dark:hover:bg-zinc-800/30">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-900 dark:text-white">@{p.username}</p>
                              {p.is_admin && <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">Admin</span>}
                            </div>
                            <p className="text-xs text-slate-400 dark:text-zinc-500">{p.display_name || '—'}</p>
                          </td>
                          <td className="py-3 px-3 text-xs text-slate-500 dark:text-zinc-400">
                            {new Date(p.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3">
                            <KycStatusBadge status={p.kyc_status} />
                          </td>
                          <td className="py-3 px-3">
                            {p.is_suspended ? (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">Suspended</span>
                            ) : (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">Active</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {p.is_suspended ? (
                              <button
                                onClick={() => handleSuspend(p.id, false)}
                                disabled={actionLoading === `${p.id}-suspend` || p.is_admin}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
                              >
                                <Power size={13} /> Activate
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSuspend(p.id, true)}
                                disabled={actionLoading === `${p.id}-suspend` || p.is_admin}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors disabled:opacity-40"
                              >
                                <Ban size={13} /> Suspend
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ============ CONTENT ============ */}
            {activeTab === 'content' && (
              <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Content Moderation</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-zinc-800 text-left">
                        <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Content</th>
                        <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Creator</th>
                        <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Price</th>
                        <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Status</th>
                        <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allContent.map((c) => (
                        <tr key={c.id} className="border-b border-slate-100 dark:border-zinc-800/50 hover:bg-slate-50 dark:hover:bg-zinc-800/30">
                          <td className="py-3 px-3">
                            <p className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]">{c.title}</p>
                            <p className="text-xs text-slate-400 dark:text-zinc-500 capitalize">{c.media_type}</p>
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-zinc-300">@{c.creator?.username || 'Unknown'}</td>
                          <td className="py-3 px-3 text-slate-600 dark:text-zinc-300">${Number(c.price).toFixed(2)}</td>
                          <td className="py-3 px-3">
                            {c.is_published ? (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">Published</span>
                            ) : (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">Hidden</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleTogglePublish(c.id, !c.is_published)}
                                disabled={actionLoading === `content-${c.id}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700 transition-colors disabled:opacity-50"
                              >
                                {c.is_published ? <><EyeOff size={13} /> Hide</> : <><Eye size={13} /> Show</>}
                              </button>
                              <button
                                onClick={() => handleDeleteContent(c.id)}
                                disabled={actionLoading === `del-${c.id}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ============ SALES MANAGEMENT ============ */}
            {activeTab === 'sales' && (
              <SalesManagementTab profiles={profiles} addToast={addToast} />
            )}

            {/* ============ TRANSACTIONS ============ */}
            {activeTab === 'transactions' && (
              <TransactionsTab purchases={allPurchases} />
            )}

            {/* ============ DMCA / REPORTS ============ */}
            {activeTab === 'dmca' && (
              <DmcaTab reports={reports} onReload={loadData} addToast={addToast} />
            )}

            {/* ============ USER SECURITY ============ */}
            {activeTab === 'security' && (
              <SecurityTab profiles={profiles} onReload={loadData} addToast={addToast} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: typeof Shield; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 shadow-sm">
      <Icon size={16} className={accent ? 'text-indigo-600 dark:text-indigo-400 mb-2' : 'text-slate-500 dark:text-zinc-400 mb-2'} />
      <p className={`text-2xl font-bold tracking-tight ${accent ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>{value}</p>
      <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}

function KycStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    pending: 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    rejected: 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
    not_submitted: 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400',
  };
  const labels: Record<string, string> = {
    approved: 'Approved',
    pending: 'Pending',
    rejected: 'Rejected',
    not_submitted: 'Not Submitted',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${styles[status] || styles.not_submitted}`}>
      {labels[status] || status}
    </span>
  );
}

function CreatorPerformanceTable({
  purchases,
  profiles,
  allContent,
}: {
  purchases: Purchase[];
  profiles: Profile[];
  allContent: Content[];
}) {
  const rows = profiles.map((prof) => {
    const creatorContent = allContent.filter((c) => c.creator_id === prof.id);
    const creatorPurchases = purchases.filter((p) => p.content?.creator?.id === prof.id || creatorContent.some((c) => c.id === p.content_id));
    const gross = creatorPurchases.reduce((s, p) => s + Number(p.amount_paid), 0);
    const platformShare = creatorPurchases.reduce((s, p) => s + Number(p.platform_fee || 0), 0);
    const creatorPayout = creatorPurchases.reduce((s, p) => s + Number(p.net_to_creator || 0), 0);
    return { prof, posts: creatorContent.length, sales: creatorPurchases.length, gross, platformShare, creatorPayout };
  }).filter((r) => r.posts > 0 || r.sales > 0).sort((a, b) => b.gross - a.gross);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Creator Performance</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-zinc-800 text-left">
              <th className="py-2 px-3 text-xs font-medium text-slate-400 dark:text-zinc-500">Creator</th>
              <th className="py-2 px-3 text-xs font-medium text-slate-400 dark:text-zinc-500 text-center">Posts</th>
              <th className="py-2 px-3 text-xs font-medium text-slate-400 dark:text-zinc-500 text-center">Sales</th>
              <th className="py-2 px-3 text-xs font-medium text-slate-400 dark:text-zinc-500 text-right">Gross Revenue</th>
              <th className="py-2 px-3 text-xs font-medium text-slate-400 dark:text-zinc-500 text-right">Platform (30%)</th>
              <th className="py-2 px-3 text-xs font-medium text-slate-400 dark:text-zinc-500 text-right">Creator Payout</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ prof, posts, sales, gross, platformShare, creatorPayout }) => (
              <tr key={prof.id} className="border-b border-slate-100 dark:border-zinc-800/50 hover:bg-slate-50 dark:hover:bg-zinc-800/30">
                <td className="py-2.5 px-3">
                  <p className="font-medium text-slate-900 dark:text-white">@{prof.username}</p>
                  <p className="text-xs text-slate-400 dark:text-zinc-500">{prof.display_name || '—'}</p>
                </td>
                <td className="py-2.5 px-3 text-center text-slate-600 dark:text-zinc-300">{posts}</td>
                <td className="py-2.5 px-3 text-center text-slate-600 dark:text-zinc-300">{sales}</td>
                <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-white">${gross.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right text-indigo-600 dark:text-indigo-400">${platformShare.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">${creatorPayout.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 dark:border-zinc-700">
              <td colSpan={3} className="py-2.5 px-3 text-right text-xs font-medium text-slate-400 dark:text-zinc-500">Totals:</td>
              <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">${rows.reduce((s, r) => s + r.gross, 0).toFixed(2)}</td>
              <td className="py-2.5 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">${rows.reduce((s, r) => s + r.platformShare, 0).toFixed(2)}</td>
              <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">${rows.reduce((s, r) => s + r.creatorPayout, 0).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
