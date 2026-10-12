import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Purchase } from '../../types';
import { Receipt } from 'lucide-react';

interface TransactionsTabProps {
  purchases?: Purchase[];
}

export function TransactionsTab({ purchases: initialPurchases }: TransactionsTabProps) {
  const [purchases, setPurchases] = useState<any[]>(initialPurchases || []);

      useEffect(() => {
    async function loadData() {
      const { data } = await supabase.from('transactions').select('*');
      if (data && data.length > 0) {
        setPurchases(data);
      } else if (initialPurchases) {
        setPurchases(initialPurchases);
      }
    }
    loadData();
  }, [initialPurchases]);
  
  const formatCurrency = (n: number) => `$${Number(n || 0).toFixed(2)}`;

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Receipt size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Transaction History</h3>
        </div>
        <span className="text-xs text-slate-400 dark:text-zinc-500">Total: {purchases.length}</span>
      </div>

      {purchases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Receipt size={28} className="text-slate-300 dark:text-zinc-600 mb-2" />
          <p className="text-sm text-slate-400 dark:text-zinc-500">No transactions yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-zinc-800">
                <th className="py-3 px-3 text-xs font-medium text-slate-500 dark:text-zinc-400">Date</th>
                <th className="py-3 px-3 text-xs font-medium text-slate-500 dark:text-zinc-400">Content</th>
                <th className="py-3 px-3 text-xs font-medium text-slate-500 dark:text-zinc-400">Buyer</th>
                <th className="py-3 px-3 text-xs font-medium text-slate-500 dark:text-zinc-400">Gateway ID</th>
                <th className="py-3 px-3 text-xs font-medium text-slate-500 dark:text-zinc-400 text-right">Gross</th>
                <th className="py-3 px-3 text-xs font-medium text-slate-500 dark:text-zinc-400 text-right">Creator Share</th>
                <th className="py-3 px-3 text-xs font-medium text-slate-500 dark:text-zinc-400 text-right">Platform Fee</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 dark:border-zinc-800/50 hover:bg-slate-50 dark:hover:bg-zinc-800/30">
                  <td className="py-3 px-3 text-xs text-slate-600 dark:text-zinc-300">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-3 text-sm font-medium text-slate-900 dark:text-white truncate max-w-[150px]">
                    {p.content?.title || 'Unknown'}
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-600 dark:text-zinc-300">
                    <span className="font-mono">{p.buyer_email || p.buyer_id?.slice(0, 8)}</span>
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-600 dark:text-zinc-300 font-mono">
                    {p.payment_id ? p.payment_id.slice(0, 10) : 'Manual'}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(p.amount)}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                    {formatCurrency(p.creator_earnings)}
                  </td>
                  <td className="py-3 px-3 text-right text-indigo-600 dark:text-indigo-400 font-semibold">
                    {formatCurrency(p.platform_earnings)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 dark:border-zinc-700">
                <td colSpan={4} className="py-3 px-3 text-right text-sm font-medium text-slate-500 dark:text-zinc-400">Totals:</td>
                <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                  {formatCurrency(purchases.reduce((s, p) => s + Number(p.amount || 0), 0))}
                </td>
                <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(purchases.reduce((s, p) => s + Number(p.creator_earnings || 0), 0))}
                </td>
                <td className="py-3 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(purchases.reduce((s, p) => s + Number(p.platform_earnings || 0), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
