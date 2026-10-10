import { useStore } from '../lib/store';
import {
  Wallet as WalletIcon, ArrowDownToLine, TrendingUp, Clock, Banknote, Info, Lock, AlertCircle,
} from 'lucide-react';
import { useState } from 'react';

type FilterPill = 'All' | 'Earning' | 'Bonus' | 'Withdrawal' | 'Adjustment';

const MIN_WITHDRAWAL = 30;

export function WalletPage() {
  const { balances, payouts, requestPayout, addToast, bankDetails, profile } = useStore();
  const [filter, setFilter] = useState<FilterPill>('All');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const pendingBalance = Number(balances?.pending_balance || 0);
  const availableBalance = Number(balances?.available_balance || 0);
  const lifetimeBalance = Number(balances?.lifetime_balance || 0);

  const pendingPayouts = payouts.filter((p) => p.status === 'pending' || p.status === 'processing').reduce((s, p) => s + Number(p.amount_usd), 0);

  const canWithdraw = availableBalance >= MIN_WITHDRAWAL;
  const hasPayoutMethod = !!bankDetails?.bank_account_number || !!profile?.upi_id || !!profile?.crypto_wallet_address;

  const filters: FilterPill[] = ['All', 'Earning', 'Bonus', 'Withdrawal', 'Adjustment'];

  const transactions = [
    ...payouts.map((p) => ({
      id: p.id,
      type: 'Withdrawal' as const,
      amount: Number(p.amount_usd),
      fee: 0,
      status: p.status,
      date: p.requested_at,
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Wallet</h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Manage your earnings, withdrawals, and transaction history.</p>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Available balance — brand gradient card */}
        <div className="rounded-2xl bg-gradient-brand-card p-5 text-slate-900 dark:text-white shadow-lg shadow-indigo-600/20">
          <div className="flex items-center gap-2 mb-3">
            <WalletIcon size={16} className="text-indigo-200" />
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-100">Available Balance</span>
          </div>
          <p className="text-3xl font-bold tracking-tight">${availableBalance.toFixed(2)}</p>
          <p className="text-xs text-indigo-100/80 mt-2">Ready for withdrawal</p>
        </div>

        {/* Pending — white card */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Pending Balance</span>
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">${pendingBalance.toFixed(2)}</p>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2">From sales in the last 7 days</p>
        </div>
      </div>

      {/* 7-day hold notice */}
      <div className="rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-4 py-3 flex items-start gap-2.5">
        <Info size={14} className="text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-700 dark:text-indigo-300/80">
          Funds are securely held for 7 days after a sale before becoming available for withdrawal.
        </p>
      </div>

      {/* Withdrawal section */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Banknote size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Request Withdrawal</h3>
        </div>

        {/* Min withdrawal warning */}
        {!canWithdraw && (
          <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-4 py-3">
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

        <div className="flex items-center justify-between text-xs text-slate-400 dark:text-zinc-500">
          <span>Available: <span className="font-semibold text-slate-600 dark:text-zinc-300">${availableBalance.toFixed(2)}</span></span>
          <span>Min: <span className="font-semibold text-slate-600 dark:text-zinc-300">${MIN_WITHDRAWAL.toFixed(2)}</span></span>
        </div>

        {!hasPayoutMethod && (
          <div className="flex items-start gap-2.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 px-4 py-3">
            <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-600 dark:text-rose-400">
              No payout method configured. Add your bank, UPI, or crypto wallet details in KYC settings to enable withdrawals.
            </p>
          </div>
        )}
      </div>

      {/* Lifetime + pending payouts summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-indigo-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Net Lifetime</span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">${lifetimeBalance.toFixed(2)}</p>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2">Your 70% share of all sales</p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Pending Payouts</span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">${pendingPayouts.toFixed(2)}</p>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2">Withdrawal requests being processed</p>
        </div>
      </div>

      {/* Platform fee notice */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
          <Info size={18} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Platform Fee Notice</h3>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
            30% standard platform fee automatically applied. Creators keep 70% net revenue on all sales.
          </p>
        </div>
      </div>

      {/* Transactions */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Transactions</h3>

        {/* Filter pills */}
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
            <ArrowDownToLine size={28} className="text-slate-300 dark:text-zinc-600 mb-2" />
            <p className="text-sm text-slate-400 dark:text-zinc-500">No transactions yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-zinc-800 px-4 py-3 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    t.type === 'Withdrawal' ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400' :
                    t.type === 'Earning' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                    'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}>
                    {t.type}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-zinc-400">{new Date(t.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-4">
                  {t.fee > 0 && <span className="text-xs text-slate-400 dark:text-zinc-500">Fee: ${t.fee.toFixed(2)}</span>}
                  <span className={`text-sm font-semibold ${t.type === 'Withdrawal' ? 'text-slate-700 dark:text-zinc-300' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {t.type === 'Withdrawal' ? '-' : '+'}${t.amount.toFixed(2)}
                  </span>
                  <span className={`text-xs font-medium capitalize px-2 py-0.5 rounded-full ${
                    t.status === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : t.status === 'processing' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                    : t.status === 'pending' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                    : 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                  }`}>{t.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
