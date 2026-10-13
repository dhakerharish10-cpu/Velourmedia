import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Receipt, TrendingUp, DollarSign, Users } from 'lucide-react';

interface MergedTransaction {
  id: string;
  date: string;
  content_title: string | null;
  creator_username: string | null;
  buyer_email: string | null;
  buyer_id: string | null;
  payment_id: string | null;
  amount: number;
  platform_fee: number;
  creator_earnings: number;
  source: 'purchases' | 'transactions';
}

interface TransactionsTabProps {
  purchases?: Array<Record<string, unknown>>;
}

export function TransactionsTab({ purchases: propPurchases }: TransactionsTabProps) {
  const [rows, setRows] = useState<MergedTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);

      const [purchRes, txRes, contentRes, profileRes] = await Promise.all([
        supabase.from('purchases').select('*, content:content(title, creator:profiles(username))').order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('content').select('id, title, creator_id'),
        supabase.from('profiles').select('id, username'),
      ]);

      if (!active) return;

      const contentMap = new Map<string, { title: string; creator_id: string }>();
      (contentRes.data || []).forEach((c: Record<string, unknown>) => {
        contentMap.set(c.id as string, { title: c.title as string, creator_id: c.creator_id as string });
      });

      const profileMap = new Map<string, string>();
      (profileRes.data || []).forEach((p: Record<string, unknown>) => {
        profileMap.set(p.id as string, p.username as string);
      });

      const merged: MergedTransaction[] = [];
      const seenPaymentIds = new Set<string>();

      // Process purchases first (they have the most complete data)
      for (const p of (purchRes.data || []) as Array<Record<string, unknown>>) {
        const pid = p.payment_id as string | null;
        if (pid) seenPaymentIds.add(pid);
        const content = p.content as Record<string, unknown> | undefined;
        const creator = content?.creator as Record<string, unknown> | undefined;
        const amount = Number(p.amount_paid || 0);
        const platformFee = Number(p.platform_fee || 0);
        merged.push({
          id: p.id as string,
          date: p.created_at as string,
          content_title: (content?.title as string) || null,
          creator_username: (creator?.username as string) || null,
          buyer_email: (p.buyer_email as string) || null,
          buyer_id: (p.buyer_id as string) || null,
          payment_id: pid,
          amount,
          platform_fee: platformFee,
          creator_earnings: Number(p.net_to_creator || amount - platformFee),
          source: 'purchases',
        });
      }

      // Then process transactions that aren't already in purchases
      for (const t of (txRes.data || []) as Array<Record<string, unknown>>) {
        const pid = t.payment_id as string | null;
        if (pid && seenPaymentIds.has(pid)) continue;
        const contentInfo = t.content_id ? contentMap.get(t.content_id as string) : null;
        const creatorUsername = t.creator_id ? profileMap.get(t.creator_id as string) : null;
        const amount = Number(t.amount || 0);
        const platformFee = Math.round(amount * 0.3 * 100) / 100;
        merged.push({
          id: t.id as string,
          date: t.created_at as string,
          content_title: contentInfo?.title || null,
          creator_username: creatorUsername || null,
          buyer_email: null,
          buyer_id: (t.buyer_id as string) || null,
          payment_id: pid,
          amount,
          platform_fee: platformFee,
          creator_earnings: Math.round((amount - platformFee) * 100) / 100,
          source: 'transactions',
        });
      }

      // Also include any purchases passed as props that aren't already in the list
      if (propPurchases) {
        for (const p of propPurchases) {
          const pid = p.payment_id as string | null;
          if (pid && seenPaymentIds.has(pid)) continue;
          const content = p.content as Record<string, unknown> | undefined;
          const creator = content?.creator as Record<string, unknown> | undefined;
          const amount = Number(p.amount_paid || 0);
          const platformFee = Number(p.platform_fee || 0);
          merged.push({
            id: p.id as string,
            date: p.created_at as string,
            content_title: (content?.title as string) || null,
            creator_username: (creator?.username as string) || null,
            buyer_email: (p.buyer_email as string) || null,
            buyer_id: (p.buyer_id as string) || null,
            payment_id: pid,
            amount,
            platform_fee: platformFee,
            creator_earnings: Number(p.net_to_creator || amount - platformFee),
            source: 'purchases',
          });
        }
      }

      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (active) {
        setRows(merged);
        setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [propPurchases]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        gross: acc.gross + r.amount,
        platform: acc.platform + r.platform_fee,
        creator: acc.creator + r.creator_earnings,
      }),
      { gross: 0, platform: 0, creator: 0 },
    );
  }, [rows]);

  const fmt = (n: number) => `$${Number(n || 0).toFixed(2)}`;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 shadow-sm">
          <DollarSign size={16} className="text-slate-500 dark:text-zinc-400 mb-2" />
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{fmt(totals.gross)}</p>
          <p className="text-xs text-slate-400 dark:text-zinc-500">Gross Volume</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 shadow-sm">
          <TrendingUp size={16} className="text-indigo-600 dark:text-indigo-400 mb-2" />
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{fmt(totals.platform)}</p>
          <p className="text-xs text-slate-400 dark:text-zinc-500">Platform Fee (30%)</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 shadow-sm">
          <Users size={16} className="text-emerald-600 dark:text-emerald-400 mb-2" />
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(totals.creator)}</p>
          <p className="text-xs text-slate-400 dark:text-zinc-500">Creator Earnings</p>
        </div>
      </div>

      {/* Transaction table */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Transaction History</h3>
          </div>
          <span className="text-xs text-slate-400 dark:text-zinc-500">{rows.length} records</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 dark:text-zinc-500">Loading transactions...</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Receipt size={28} className="text-slate-300 dark:text-zinc-600 mb-2" />
            <p className="text-sm text-slate-400 dark:text-zinc-500">No transactions yet. Use "Sync Now" to import from Whop.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 text-left">
                  <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Date</th>
                  <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Content</th>
                  <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Creator</th>
                  <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Buyer</th>
                  <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Gateway ID</th>
                  <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400 text-right">Gross</th>
                  <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400 text-right">Creator Share</th>
                  <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400 text-right">Platform Fee</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.source}-${r.id}`} className="border-b border-slate-100 dark:border-zinc-800/50 hover:bg-slate-50 dark:hover:bg-zinc-800/30">
                    <td className="py-3 px-3 text-xs text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                      {new Date(r.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-medium text-slate-900 dark:text-white truncate max-w-[160px]">{r.content_title || 'Unknown'}</p>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600 dark:text-zinc-300">
                      {r.creator_username ? `@${r.creator_username}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-xs font-mono text-slate-600 dark:text-zinc-300 max-w-[140px] truncate">
                      {r.buyer_email || (r.buyer_id ? r.buyer_id.slice(0, 10) + '…' : 'Guest')}
                    </td>
                    <td className="py-3 px-3 text-xs font-mono text-slate-500 dark:text-zinc-400">
                      {r.payment_id ? r.payment_id.slice(0, 16) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-900 dark:text-white">{fmt(r.amount)}</td>
                    <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">{fmt(r.creator_earnings)}</td>
                    <td className="py-3 px-3 text-right text-indigo-600 dark:text-indigo-400">{fmt(r.platform_fee)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-zinc-700">
                  <td colSpan={5} className="py-3 px-3 text-right text-sm font-medium text-slate-500 dark:text-zinc-400">Totals:</td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">{fmt(totals.gross)}</td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{fmt(totals.creator)}</td>
                  <td className="py-3 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">{fmt(totals.platform)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
