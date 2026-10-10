import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { ContentReport } from '../../lib/types';
import { Flag, Trash2, XCircle, CheckCircle } from 'lucide-react';

interface DmcaTabProps {
  reports: ContentReport[];
  onReload: () => Promise<void>;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function DmcaTab({ reports, onReload, addToast }: DmcaTabProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (reportId: string, action: 'remove' | 'dismiss') => {
    setActionLoading(`${reportId}-${action}`);
    const { error } = await supabase.rpc('admin_action_report', { p_report_id: reportId, p_action: action });
    setActionLoading(null);
    if (error) {
      addToast(`Failed to ${action} report.`, 'error');
      return;
    }
    addToast(action === 'remove' ? 'Content removed (unpublished).' : 'Report dismissed.', 'success');
    await onReload();
  };

  const pendingReports = reports.filter((r) => r.status === 'pending');
  const actionedReports = reports.filter((r) => r.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Flag size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">DMCA / Content Reports</h3>
          {pendingReports.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              {pendingReports.length} pending
            </span>
          )}
        </div>

        {pendingReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Flag size={28} className="text-slate-300 dark:text-zinc-600 mb-2" />
            <p className="text-sm text-slate-400 dark:text-zinc-500">No pending reports.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 text-left">
                  <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Content</th>
                  <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Reason</th>
                  <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Reported</th>
                  <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingReports.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 dark:border-zinc-800/50 hover:bg-slate-50 dark:hover:bg-zinc-800/30">
                    <td className="py-3 px-3">
                      <p className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]">{r.content?.title || 'Unknown content'}</p>
                      {r.description && <p className="text-xs text-slate-400 dark:text-zinc-500 truncate max-w-[200px]">{r.description}</p>}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full capitalize bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {r.reason}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500 dark:text-zinc-400">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleAction(r.id, 'remove')}
                          disabled={actionLoading === `${r.id}-remove`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={13} /> Remove Media
                        </button>
                        <button
                          onClick={() => handleAction(r.id, 'dismiss')}
                          disabled={actionLoading === `${r.id}-dismiss`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700 transition-colors disabled:opacity-50"
                        >
                          <XCircle size={13} /> Dismiss
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {actionedReports.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Resolved Reports</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 text-left">
                  <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Content</th>
                  <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Reason</th>
                  <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Status</th>
                  <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Resolved</th>
                </tr>
              </thead>
              <tbody>
                {actionedReports.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 dark:border-zinc-800/50">
                    <td className="py-3 px-3 text-slate-900 dark:text-white truncate max-w-[200px]">{r.content?.title || 'Unknown'}</td>
                    <td className="py-3 px-3 capitalize text-slate-600 dark:text-zinc-300">{r.reason}</td>
                    <td className="py-3 px-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                        r.status === 'actioned'
                          ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                          : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>
                        {r.status === 'actioned' ? <><CheckCircle size={11} className="inline mr-1" />Removed</> : 'Dismissed'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500 dark:text-zinc-400">
                      {r.actioned_at ? new Date(r.actioned_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
