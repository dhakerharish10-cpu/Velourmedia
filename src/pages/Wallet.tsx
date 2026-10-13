import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import {
  Wallet as WalletIcon, Clock, Banknote, Info, Lock, AlertCircle,
  ShoppingBag,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

type FilterPill = 'All' | 'Earning' | 'Bonus' | 'Withdrawal' | 'Adjustment';

const MIN_WITHDRAWAL = 30;

interface SaleRow {
  id: string;
  date: string;
  title: string | null;
  amount: number;
  creator_earnings: number;
}

export function WalletPage() {
  const { user, profile, payouts, requestPayout, addToast, bankDetails, balances } = useStore();
  const [filter, setFilter] = useState<FilterPill>('All');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [liveBalance, setLiveBalance] = useState(0);

  const creatorId = profile?.id || user?.id || null;

  const loadSales = useCallback(async () => {
    if (!creatorId) return;
    const [txRes, purchRes] = await Promise.all([
      supabase.from('transactions').select('id, created_at, amount, raw_payload, content_id').eq('creator_id', creatorId).order('created_at', { ascending: false }),
      supabase.from('purchases').select('id, created_at, amount_paid, content:content(title)').order('created_at', { ascending: false }),
    ]);

    const merged: SaleRow[] = [];
    const seen = new Set<string>();

    for (const p of (purchRes.data || []) as Array<Record<string, unknown>>) {
      const pid = p.id as string;
      seen.add(pid);
      const content = p.content as Record<string, unknown> | undefined;
      const amount = Number(p.amount_paid || 0);
      merged.push({
        id: pid,
        date: p.created_at as string,
        title: (content?.title as string) || null,
        amount,
        creator_earnings: Math.round(amount * 0.7 * 100) / 100,
      });
    }

    for (const t of (txRes.data || []) as Array<Record<string, unknown>>) {
      const tid = t.id as string;
      if (seen.has(tid)) continue;
      let amount = Number(t.amount || 0);
      let creatorEarnings = Number(t.creator_earnings || 0);
      if (amount === 0 || creatorEarnings === 0) {
        const raw = t.raw_payload as Record<string, unknown> | undefined;
        const rawData = raw?.data as Record<string, unknown> | undefined;
        const netAmount = rawData ? Number(rawData.net_amount || 0) : 0;
        const initialPrice = rawData ? Number(rawData.initial_price || 0) : 0;
        if (netAmount > 0) amount = netAmount;
        else if (initialPrice > 0) amount = initialPrice;
        if (creatorEarnings === 0) creatorEarnings = Math.round(amount * 0.7 * 100) / 100;
      }
      if (amount <= 0) continue;
      let title: string | null = null;
      if (t.content_id) {
        const { data: c } = await supabase.from('content').select('title').eq('id', t.content_id).maybeSingle();
        title = (c as Record<string, unknown> | null)?.title as string || null;
      }
      if (!title) {
        const raw = t.raw_payload as Record<string, unknown> | undefined;
        const rawData = raw?.data as Record<string, unknown> | undefined;
        title = (rawData?.title as string) || null;
      }
      merged.push({
        id: tid,
        date: t.created_at as string,
        title,
        amount,
        creator_earnings: creatorEarnings,
      });
    }

    merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setSales(merged);
    setLiveBalance(merged.reduce((s, r) => s + r.creator_earnings, 0));
  }, [creatorId]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  // Realtime: live-update when a new transaction comes in for this creator
  useEffect(() => {
    if (!creatorId) return;
    const channel = supabase
      .channel('wallet-transactions-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `creator_id=eq.${creatorId}` }, () => {
        loadSales();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [creatorId, loadSales]);

  const pendingBalance = Number(balances?.pending_balance || 0);
  const availableBalance = Number(balances?.available_balance || 0);

  const pendingPayouts = payouts.filter((p) => p.status === 'pending' || p.status === 'processing').reduce((s, p) => s + Number(p.amount_usd), 0);

  const canWithdraw = availableBalance >= MIN_WITHDRAWAL;
  const hasPayoutMethod = !!bankDetails?.bank_account_number || !!profile?.upi_id || !!profile?.crypto_wallet_address;

  const filters: FilterPill[] = ['All', 'Earning', 'Bonus', 'Withdrawal', 'Adjustment'];

  const transactions = [
    ...sales.map((s) => ({
      id: s.id,
      type: 'Earning' as const,
      amount: s.creator_earnings,
      fee: 0,
      status: 'success' as const,
      date: s.date,
      title: s.title,
    })),
    ...payouts.map((p) => ({
      id: p.id,
      type: 'Withdrawal' as const,
      amount: Number(p.amount_usd),
      fee: 0,
      status: p.status,
      date: p.requested_at,
      title: null as string | null,
    })),
  ];

  const filtered = filter === 'All' ? transactions : transactions.filter((t) => t.type === filter);

  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt < MIN_WITHDRAWAL) {
      addToast(`Minimum withdrawal is $${MIN_WITHDRAWAL.toFixed(2)}.`, 'error');
      return;
    }
    if (amt > availableBalance) {
      addToast('Withdrawal amount exceeds available balance.', 'error');
      return;
    }
    if (!hasPayoutMethod) {
      addToast('Please add a payout method in KYC settings first.', 'error');
      return;
    }
    setWithdrawing(true);
    const { error } = await requestPayout(amt);
    setWithdrawing(false);
    if (error) {
      addToast(error, 'error');
      return;
    }
    setWithdrawAmount('');
    addToast(`Payout request for $${amt.toFixed(2)} submitted successfully.`, 'success');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Wallet</h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Your earnings, withdrawals, and sales history.</p>
      </div>

      {/* Single Total Net Wallet Balance card */}
      <div className="rounded-2xl bg-gradient-brand-card p-6 text-slate-900 dark:text-white shadow-lg shadow-indigo-600/20">
        <div className="flex items-center gap-2 mb-3">
          <WalletIcon size={18} className="text-indigo-200" />
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-100">Total Net Wallet Balance</span>
        </div>
        <p className="text-4xl font-bold tracking-tight">${liveBalance.toFixed(2)}</p>
        <p className="text-xs text-indigo-100/80 mt-2">Your 70% earnings from all sales (live)</p>
      </div>

      {/* Secondary balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Banknote size={16} className="text-emerald-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Available for Withdrawal</span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">${availableBalance.toFixed(2)}</p>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2">Ready to withdraw now</p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Pending Balance</span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">${pendingBalance.toFixed(2)}</p>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2">From sales in the last 7 days</p>
        </div>
      </div>

      {/* 7-day hold notice */}
      <div className="rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-4 py-3 flex items-start gap-2.5">
        <Info size={14} className="text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-700 dark:text-indigo-300/80">
          Funds are securely held for 7 days after a sale before becoming available for withdrawal. You keep 70% of every sale.
        </p>
      </div>

      {/* Withdrawal section */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Banknote size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Request Withdrawal</h3>
        </div>

        {!canWithdraw && (
          <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:bg-amber-500/20 px-4 py-3">
            <Lock size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Minimum withdrawal requirement: <span className="font-semibold">${MIN_WITHDRAWAL.toFixed(2)}</span> Available Balance. You currently have ${availableBalance.toFixed(2)}.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400 dark:text-zinc-500">$</span>
            <input
              type="number"
              min={MIN_WITHDRAWAL}
              step="0.01"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="0.00"
              disabled={!canWithdraw}
              className="w-full rounded-xl bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 pl-7 pr-3 py-3 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 disabled:opacity-50"
            />
          </div>
          <button
            onClick={handleWithdraw}
            disabled={!canWithdraw || withdrawing || !withdrawAmount}
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
          >
            {withdrawing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Banknote size={16} />
                Withdraw
              </>
            )}
          </button>
        </div>

        {!hasPayoutMethod && (
          <div className="flex items-start gap-2.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:bg-rose-500/20 px-4 py-3">
            <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-600 dark:text-rose-400">
              No payout method configured. Add your bank, UPI, or crypto wallet details in KYC settings to enable withdrawals.
            </p>
          </div>
        )}
      </div>

      {/* Pending payouts summary */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-amber-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Pending Payouts</span>
        </div>
        <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">${pendingPayouts.toFixed(2)}</p>
        <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2">Withdrawal requests being processed</p>
      </div>

      {/* Sales & Transactions History */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Sales History</h3>

        <div className="flex flex-wrap gap-2 mb-4">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShoppingBag size={28} className="text-slate-300 dark:text-zinc-600 mb-2" />
            <p className="text-sm text-slate-400 dark:text-zinc-500">No sales yet. Your earnings will appear here in real time.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-zinc-800 px-4 py-3 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                    t.type === 'Withdrawal' ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400' :
                    t.type === 'Earning' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                    'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}>
                    {t.type}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 dark:text-zinc-300 truncate">{t.title || 'Sale'}</p>
                    <p className="text-xs text-slate-400 dark:text-zinc-500">{new Date(t.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-sm font-semibold ${t.type === 'Withdrawal' ? 'text-slate-700 dark:text-zinc-300' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {t.type === 'Withdrawal' ? '-' : '+'}${t.amount.toFixed(2)}
                  </span>
                  {t.type === 'Withdrawal' && (
                    <span className={`text-xs font-medium capitalize px-2 py-0.5 rounded-full ${
                      t.status === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : t.status === 'processing' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                      : t.status === 'pending' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                      : 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                    }`}>{t.status}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
