import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import type { Profile, SalesVisibility } from '../../lib/types';
import { SlidersHorizontal, Eye, EyeOff, Save, RotateCcw, DollarSign, TrendingUp, Receipt } from 'lucide-react';

interface SalesManagementTabProps {
  profiles: Profile[];
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function SalesManagementTab({ profiles, addToast }: SalesManagementTabProps) {
  const [globalSetting, setGlobalSetting] = useState<SalesVisibility | null>(null);
  const [creatorOverrides, setCreatorOverrides] = useState<SalesVisibility[]>([]);
  const [globalRatio, setGlobalRatio] = useState(100);
  const [globalHidden, setGlobalHidden] = useState(false);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<string>('');
  const [creatorRatio, setCreatorRatio] = useState(100);
  const [creatorHidden, setCreatorHidden] = useState(false);
  const [savingCreator, setSavingCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [txRows, setTxRows] = useState<Array<Record<string, unknown>>>([]);
  const [txLoading, setTxLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    const { data, error } = await supabase.from('sales_visibility').select('*').order('id', { ascending: true });
    if (error || !data) { setLoading(false); return; }
    const settings = data as SalesVisibility[];
    const global = settings.find((s) => s.profile_id === null);
    if (global) { setGlobalSetting(global); setGlobalRatio(global.visible_ratio); setGlobalHidden(global.sales_hidden); }
    setCreatorOverrides(settings.filter((s) => s.profile_id !== null));
    setLoading(false);
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    const [purchRes, txRes] = await Promise.all([
      supabase.from('purchases').select('*').order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }),
    ]);
    const merged: Array<Record<string, unknown>> = [];
    const seen = new Set<string>();
    for (const p of (purchRes.data || []) as Array<Record<string, unknown>>) {
      const pid = p.payment_id as string | null;
      if (pid) seen.add(pid);
      const amount = Number(p.amount_paid || 0);
      const platformFee = Number(p.platform_fee || Math.round(amount * 0.3 * 100) / 100);
      merged.push({
        ...p,
        amount,
        platform_fee: platformFee,
        creator_earnings: Number(p.net_to_creator || amount - platformFee),
        source: 'purchases',
      });
    }
    for (const t of (txRes.data || []) as Array<Record<string, unknown>>) {
      const pid = t.payment_id as string | null;
      if (pid && seen.has(pid)) continue;
      const amount = Number(t.amount || 0);
      const platformFee = Math.round(amount * 0.3 * 100) / 100;
      merged.push({
        ...t,
        amount,
        platform_fee: platformFee,
        creator_earnings: Math.round((amount - platformFee) * 100) / 100,
        source: 'transactions',
      });
    }
    merged.sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime());
    setTxRows(merged);
    setTxLoading(false);
  }, []);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const txTotals = useMemo(() => {
    return txRows.reduce(
      (acc, r) => ({
        gross: acc.gross + Number(r.amount || 0),
        platform: acc.platform + Number(r.platform_fee || 0),
        creator: acc.creator + Number(r.creator_earnings || 0),
        count: acc.count + 1,
      }),
      { gross: 0, platform: 0, creator: 0, count: 0 },
    );
  }, [txRows]);

  const fmt = (n: number) => `${Number(n || 0).toFixed(2)}`;

  const handleSaveGlobal = async () => {
    setSavingGlobal(true);
    const { error } = await supabase.rpc('admin_set_sales_visibility', {
      p_profile_id: null, p_visible_ratio: globalRatio, p_sales_hidden: globalHidden,
    });
    setSavingGlobal(false);
    if (error) { addToast('Failed to save global setting.', 'error'); return; }
    addToast(`Global sales visibility set to ${globalHidden ? 'hidden' : globalRatio + '%'}.`, 'success');
    await loadSettings();
  };

  const handleSaveCreator = async () => {
    if (!selectedCreator) { addToast('Select a creator first.', 'error'); return; }
    setSavingCreator(true);
    const { error } = await supabase.rpc('admin_set_sales_visibility', {
      p_profile_id: selectedCreator, p_visible_ratio: creatorRatio, p_sales_hidden: creatorHidden,
    });
    setSavingCreator(false);
    if (error) { addToast('Failed to save creator setting.', 'error'); return; }
    addToast(`Sales visibility updated for creator.`, 'success');
    await loadSettings();
  };

  const handleResetCreator = async () => {
    if (!selectedCreator) return;
    const { error } = await supabase.from('sales_visibility').delete().eq('profile_id', selectedCreator);
    if (error) { addToast('Failed to reset creator override.', 'error'); return; }
    addToast('Creator override reset to global default.', 'success');
    setSelectedCreator('');
    setCreatorRatio(100);
    setCreatorHidden(false);
    await loadSettings();
  };

  const loadCreatorSetting = (creatorId: string) => {
    setSelectedCreator(creatorId);
    const existing = creatorOverrides.find((s) => s.profile_id === creatorId);
    if (existing) { setCreatorRatio(existing.visible_ratio); setCreatorHidden(existing.sales_hidden); }
    else { setCreatorRatio(globalRatio); setCreatorHidden(globalHidden); }
  };

  if (loading) return <div className="py-20 text-center text-slate-400 dark:text-zinc-500">Loading sales settings...</div>;

  return (
    <div className="space-y-6">
      {/* Sales Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 shadow-sm">
          <DollarSign size={16} className="text-slate-500 dark:text-zinc-400 mb-2" />
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{fmt(txTotals.gross)}</p>
          <p className="text-xs text-slate-400 dark:text-zinc-500">Gross Volume</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 shadow-sm">
          <Receipt size={16} className="text-slate-500 dark:text-zinc-400 mb-2" />
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{txTotals.count}</p>
          <p className="text-xs text-slate-400 dark:text-zinc-500">Total Sales</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 shadow-sm">
          <TrendingUp size={16} className="text-indigo-600 dark:text-indigo-400 mb-2" />
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{fmt(txTotals.platform)}</p>
          <p className="text-xs text-slate-400 dark:text-zinc-500">Platform Fee (30%)</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 shadow-sm">
          <DollarSign size={16} className="text-emerald-600 dark:text-emerald-400 mb-2" />
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(txTotals.creator)}</p>
          <p className="text-xs text-slate-400 dark:text-zinc-500">Creator Earnings</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Recent Transactions</h3>
        {txLoading ? (
          <div className="py-8 text-center text-slate-400 dark:text-zinc-500">Loading transactions...</div>
        ) : txRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Receipt size={24} className="text-slate-300 dark:text-zinc-600 mb-2" />
            <p className="text-sm text-slate-400 dark:text-zinc-500">No transactions recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-zinc-900">
                <tr className="border-b border-slate-200 dark:border-zinc-800 text-left">
                  <th className="py-2 px-3 text-xs font-medium text-slate-400 dark:text-zinc-500">Date</th>
                  <th className="py-2 px-3 text-xs font-medium text-slate-400 dark:text-zinc-500">Amount</th>
                  <th className="py-2 px-3 text-xs font-medium text-slate-400 dark:text-zinc-500">Creator Share</th>
                  <th className="py-2 px-3 text-xs font-medium text-slate-400 dark:text-zinc-500">Platform</th>
                  <th className="py-2 px-3 text-xs font-medium text-slate-400 dark:text-zinc-500">Payment ID</th>
                </tr>
              </thead>
              <tbody>
                {txRows.slice(0, 50).map((r) => (
                  <tr key={`${r.source}-${r.id}`} className="border-b border-slate-100 dark:border-zinc-800/50 hover:bg-slate-50 dark:hover:bg-zinc-800/30">
                    <td className="py-2 px-3 text-xs text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                      {new Date(r.created_at as string).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{fmt(Number(r.amount))}</td>
                    <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400">{fmt(Number(r.creator_earnings))}</td>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400">{fmt(Number(r.platform_fee))}</td>
                    <td className="py-2 px-3 text-xs font-mono text-slate-400 dark:text-zinc-500 max-w-[120px] truncate">
                      {(r.payment_id as string) || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Global Setting */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Global Sales Visibility</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">
          This is the default visibility ratio applied to all creators unless overridden per-creator.
          At 50%, a creator with 10 sales will only see 5 sales in their dashboard. At 0% or when hidden,
          the creator sees no sales data.
        </p>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-500 dark:text-zinc-400">Visible Ratio</label>
              <span className="text-sm font-bold text-indigo-500 dark:text-indigo-400 tabular-nums">{globalRatio}%</span>
            </div>
            <input
              type="range" min="0" max="100" value={globalRatio}
              disabled={globalHidden}
              onChange={(e) => setGlobalRatio(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer disabled:opacity-30"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-300 cursor-pointer shrink-0">
            <input type="checkbox" checked={globalHidden} onChange={(e) => setGlobalHidden(e.target.checked)} className="accent-indigo-500" />
            <span className="flex items-center gap-1">
              {globalHidden ? <EyeOff size={14} /> : <Eye size={14} />}
              Hide all sales
            </span>
          </label>
          <button
            onClick={handleSaveGlobal}
            disabled={savingGlobal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-50 shrink-0"
          >
            <Save size={15} /> Save
          </button>
        </div>
        {globalSetting && (
          <p className="text-xs text-slate-400 dark:text-zinc-500">
            Last updated: {new Date(globalSetting.updated_at).toLocaleString()}
          </p>
        )}
      </div>

      {/* Per-Creator Override */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Per-Creator Override</h3>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">
          Select a creator to override the global setting. The creator's dashboard will reflect this visibility ratio.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <select
            value={selectedCreator}
            onChange={(e) => loadCreatorSetting(e.target.value)}
            className="rounded-lg bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="">Select a creator…</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>@{p.username} — {p.display_name || 'Unnamed'}</option>
            ))}
          </select>

          {selectedCreator && (
            <>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-zinc-400">Visible Ratio</label>
                  <span className="text-sm font-bold text-indigo-500 dark:text-indigo-400 tabular-nums">{creatorRatio}%</span>
                </div>
                <input
                  type="range" min="0" max="100" value={creatorRatio}
                  disabled={creatorHidden}
                  onChange={(e) => setCreatorRatio(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer disabled:opacity-30"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-300 cursor-pointer shrink-0">
                <input type="checkbox" checked={creatorHidden} onChange={(e) => setCreatorHidden(e.target.checked)} className="accent-indigo-500" />
                <span className="flex items-center gap-1">
                  {creatorHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                  Hide
                </span>
              </label>
              <button
                onClick={handleSaveCreator}
                disabled={savingCreator}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-50 shrink-0"
              >
                <Save size={15} /> Apply
              </button>
              {creatorOverrides.some((s) => s.profile_id === selectedCreator) && (
                <button
                  onClick={handleResetCreator}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors shrink-0"
                >
                  <RotateCcw size={15} /> Reset
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Active Overrides List */}
      {creatorOverrides.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Active Per-Creator Overrides</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 text-left">
                  <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Creator</th>
                  <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Visibility</th>
                  <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Hidden</th>
                  <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Updated</th>
                </tr>
              </thead>
              <tbody>
                {creatorOverrides.map((s) => {
                  const creator = profiles.find((p) => p.id === s.profile_id);
                  return (
                    <tr key={s.id} className="border-b border-slate-100 dark:border-zinc-800/50 hover:bg-slate-50 dark:hover:bg-zinc-800/30">
                      <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">@{creator?.username || 'Unknown'}</td>
                      <td className="py-3 px-3">
                        <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400">{s.visible_ratio}%</span>
                      </td>
                      <td className="py-3 px-3">
                        {s.sales_hidden ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">Yes</span>
                        ) : (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">No</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-500 dark:text-zinc-400">
                        {new Date(s.updated_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
