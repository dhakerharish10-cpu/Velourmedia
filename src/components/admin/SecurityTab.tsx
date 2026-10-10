import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../lib/types';
import { Shield, Ban, Power, ShieldCheck } from 'lucide-react';

interface SecurityTabProps {
  profiles: Profile[];
  onReload: () => Promise<void>;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function SecurityTab({ profiles, onReload, addToast }: SecurityTabProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleSuspend = async (profileId: string, suspend: boolean) => {
    setActionLoading(`${profileId}-suspend`);
    const { error } = await supabase.rpc('admin_set_suspension', { p_profile_id: profileId, p_suspend: suspend });
    setActionLoading(null);
    if (error) { addToast(`Failed to ${suspend ? 'suspend' : 'activate'} account.`, 'error'); return; }
    addToast(`Account ${suspend ? 'suspended' : 'activated'}.`, 'success');
    await onReload();
  };

  const handleBan = async (profileId: string, ban: boolean) => {
    setActionLoading(`${profileId}-ban`);
    const { error } = await supabase.rpc('admin_set_ban', { p_profile_id: profileId, p_ban: ban });
    setActionLoading(null);
    if (error) { addToast(`Failed to ${ban ? 'ban' : 'unban'} account.`, 'error'); return; }
    addToast(`Account ${ban ? 'banned' : 'unbanned'}.`, 'success');
    await onReload();
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={18} className="text-indigo-600 dark:text-indigo-400" />
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">User Security & Bans</h3>
        <span className="text-xs text-slate-400 dark:text-zinc-500">({profiles.length} users)</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-zinc-800 text-left">
              <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">User</th>
              <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Joined</th>
              <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400">Status</th>
              <th className="py-3 px-3 font-medium text-slate-500 dark:text-zinc-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => {
              const isBanned = (p as Profile & { is_banned?: boolean }).is_banned;
              const isSuspended = p.is_suspended;
              return (
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
                    <div className="flex flex-col gap-1">
                      {isBanned ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 w-fit">Banned</span>
                      ) : isSuspended ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 w-fit">Suspended</span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 w-fit">Active</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
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
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors disabled:opacity-40"
                        >
                          <Power size={13} /> Suspend
                        </button>
                      )}
                      {isBanned ? (
                        <button
                          onClick={() => handleBan(p.id, false)}
                          disabled={actionLoading === `${p.id}-ban` || p.is_admin}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
                        >
                          <ShieldCheck size={13} /> Unban
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBan(p.id, true)}
                          disabled={actionLoading === `${p.id}-ban` || p.is_admin}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors disabled:opacity-40"
                        >
                          <Ban size={13} /> Ban
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
