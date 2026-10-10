import { useState } from 'react';
import { useStore } from '../lib/store';
import {
  DollarSign, Package, TrendingUp, Link2, Trash2, Eye, Copy, Check, Crown, Plus,
  Lock, Unlock, Copy as Duplicate, Power, Wallet, type LucideIcon,
} from 'lucide-react';

type TimeFilter = 'Today' | '7D' | '30D' | 'Lifetime';

function MetricCard({ icon: Icon, label, value, accent }: { icon: LucideIcon; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 transition-all hover:scale-[1.02] ${accent ? 'border-transparent bg-gradient-brand-card shadow-lg shadow-indigo-600/20' : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? 'bg-white/15' : 'bg-slate-100 dark:bg-zinc-800'}`}>
          <Icon size={18} className={accent ? 'text-white' : 'text-slate-500 dark:text-zinc-400'} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${accent ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{value}</p>
      <p className={`text-xs mt-1 ${accent ? 'text-indigo-100' : 'text-slate-500 dark:text-zinc-400'}`}>{label}</p>
    </div>
  );
}

export function DashboardHome({ onNavigate }: { onNavigate: (path: string) => void }) {
  const {
    user, profile, myContent, earnings, deleteContent, togglePrivate, togglePublished, duplicateContent,
    addToast, openAuth, openPersonaSwitcher, profiles, getSubscriptionLink, openUpload,
  } = useStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedProfile, setCopiedProfile] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('Lifetime');

  const handleCopyLink = async (contentId: string) => {
    const link = `${window.location.origin}/#/u/${contentId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(contentId);
      addToast('Paywall link copied! Paste it into your stories.', 'success');
      setTimeout(() => setCopiedId((prev) => (prev === contentId ? null : prev)), 2000);
    } catch {
      addToast('Failed to copy link.', 'error');
    }
  };

  const handleCopyProfileLink = async () => {
    if (!profile?.username) return;
    const link = getSubscriptionLink(profile.username);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedProfile(true);
      addToast('Profile link copied!', 'success');
      setTimeout(() => setCopiedProfile(false), 2000);
    } catch {
      addToast('Failed to copy link.', 'error');
    }
  };

  const handleDelete = async (contentId: string) => {
    const { error } = await deleteContent(contentId);
    if (error) addToast(error, 'error');
    else addToast('Content deleted.', 'success');
  };

  const handleTogglePrivate = async (contentId: string, isPrivate: boolean) => {
    const { error } = await togglePrivate(contentId, isPrivate);
    if (error) addToast(error, 'error');
    else addToast(isPrivate ? 'Post is now private.' : 'Post is now public.', 'success');
  };

  const handleToggleActive = async (contentId: string, isPublished: boolean) => {
    const { error } = await togglePublished(contentId, isPublished);
    if (error) addToast(error, 'error');
    else addToast(isPublished ? 'Post deactivated.' : 'Post reactivated.', 'success');
  };

  const handleDuplicate = async (contentId: string) => {
    const { error } = await duplicateContent(contentId);
    if (error) addToast(error, 'error');
    else addToast('Post duplicated as a draft.', 'success');
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
          <Package size={28} className="text-slate-400 dark:text-zinc-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Sign in to access your dashboard</h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6">You need an account to upload and manage content.</p>
        <button
          onClick={() => openAuth('signin')}
          className="px-6 py-2.5 rounded-xl bg-gradient-brand text-slate-900 dark:text-white font-semibold hover:opacity-90 transition-opacity"
        >
          Sign in
        </button>
      </div>
    );
  }

  const grossRevenue = Number(earnings?.content_revenue || 0) + Number(earnings?.subscription_revenue || 0);
  const platformFees = Number(earnings?.platform_fees_paid || 0);
  const netRevenue = grossRevenue - platformFees;
  const totalSales = earnings?.total_sales || 0;
  const totalPosts = myContent.length;
  const totalViews = myContent.reduce((sum, item) => sum + (item.views_count || 0), 0);
  const profileLink = profile?.username ? getSubscriptionLink(profile.username) : '';

  const timeFilters: TimeFilter[] = ['Today', '7D', '30D', 'Lifetime'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Track your earnings, links performance, and activity across all your creator profiles.</p>
        </div>
        <button
          onClick={openUpload}
          className="px-5 py-2.5 rounded-xl bg-gradient-brand text-white font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 shrink-0"
        >
          <Plus size={16} />
          New Post
        </button>
      </div>

      {/* Persona badge */}
      {profiles.length > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <Crown size={14} className="text-indigo-500" />
          <span className="text-slate-500 dark:text-zinc-400">Active persona:</span>
          <button onClick={openPersonaSwitcher} className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-600 dark:text-indigo-300 font-medium">
            @{profile?.username} (switch)
          </button>
        </div>
      )}

      {/* Time filter pills */}
      <div className="flex flex-wrap gap-2">
        {timeFilters.map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeFilter(tf)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              timeFilter === tf
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:bg-zinc-950 dark:hover:bg-slate-100 dark:bg-zinc-800'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Performance grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Wallet} label="NET EARNINGS (70%)" value={`${netRevenue.toFixed(2)}`} accent />
        <MetricCard icon={DollarSign} label="SALES" value={totalSales.toString()} />
        <MetricCard icon={Eye} label="TOTAL VIEWS" value={totalViews.toString()} />
        <MetricCard icon={Link2} label="TOTAL LINKS" value={totalPosts.toString()} />
      </div>

      {/* Earnings Over Time chart */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Earnings Over Time</h3>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-zinc-950 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 flex items-center justify-center mb-4">
            <TrendingUp size={32} className="text-slate-300 dark:text-zinc-600" />
          </div>
          <p className="text-sm font-medium text-slate-400 dark:text-zinc-500">No earnings data yet</p>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Your earnings chart will appear here once you make your first sale.</p>
        </div>
      </div>

      {/* Profile link */}
      {profileLink && (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Link2 size={18} className="text-indigo-500" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Your Profile Link</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 rounded-xl bg-slate-50 dark:bg-zinc-950 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-4 py-3 font-mono text-sm text-slate-600 dark:text-zinc-300 truncate">
              {profileLink}
            </div>
            <button
              onClick={handleCopyProfileLink}
              className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 shrink-0"
            >
              {copiedProfile ? <Check size={16} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={16} />}
              {copiedProfile ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Posts section */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Posts</h3>
          {totalPosts > 0 && (
            <span className="text-xs text-slate-400 dark:text-zinc-500">{totalPosts} item{totalPosts !== 1 ? 's' : ''}</span>
          )}
        </div>

        {myContent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package size={32} className="text-slate-300 dark:text-zinc-600 mb-2" />
            <p className="text-sm text-slate-400 dark:text-zinc-500 mb-3">No posts yet. Create your first paywall post.</p>
            <button onClick={openUpload} className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-600 dark:text-indigo-300">
              Create a new post
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {myContent.map((item) => {
              const itemLink = `${window.location.origin}/#/u/${item.id}`;
              const isPrivate = item.is_private;
              const isActive = item.is_published;
              return (
                <div
                  key={item.id}
                  className="group rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 hover:border-slate-300 dark:hover:border-slate-200 dark:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-slate-100 dark:bg-zinc-800 shrink-0">
                      {item.media_type === 'image' ? (
                        <img
                          src={item.thumbnail_url || item.media_url}
                          alt={item.title}
                          className="w-full h-full object-cover blur-sm scale-110 group-hover:blur-0 group-hover:scale-100 transition-all duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-zinc-800">
                          <Package size={20} className="text-slate-400 dark:text-zinc-500" />
                        </div>
                      )}
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white">
                        {item.price === 0 ? 'FREE' : `$${Number(item.price).toFixed(0)}`}
                      </div>
                      {!isActive && (
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-500/80 text-[9px] font-bold text-white">
                          INACTIVE
                        </div>
                      )}
                      {isPrivate && (
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-slate-600/90 text-[9px] font-bold text-white">
                          PRIVATE
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.title}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <span className="text-xs text-slate-500 dark:text-zinc-400">
                          {item.price === 0 ? 'Free' : `${Number(item.price).toFixed(2)}`}
                        </span>
                        {item.price > 0 && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            Earns ${(Number(item.price) * 0.7).toFixed(2)}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                          <Eye size={11} /> {item.views_count || 0}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                          <TrendingUp size={11} /> {item.media_count > 1 ? `${item.media_count} files` : '1 file'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-slate-400 dark:text-zinc-500 font-mono truncate flex-1">{itemLink}</span>
                        <button
                          onClick={() => handleCopyLink(item.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:text-zinc-500 dark:hover:text-indigo-600 dark:text-indigo-400 dark:hover:bg-indigo-500/10 transition-colors shrink-0"
                          title="Copy link"
                        >
                          {copiedId === item.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                    <ActionButton icon={copiedId === item.id ? Check : Copy} label={copiedId === item.id ? 'Copied' : 'Copy'} onClick={() => handleCopyLink(item.id)} color="indigo" />
                    <ActionButton icon={Duplicate} label="Duplicate" onClick={() => handleDuplicate(item.id)} color="slate" />
                    <ActionButton icon={isPrivate ? Unlock : Lock} label={isPrivate ? 'Make Public' : 'Make Private'} onClick={() => handleTogglePrivate(item.id, !isPrivate)} color="slate" />
                    <ActionButton icon={Power} label={isActive ? 'Deactivate' : 'Activate'} onClick={() => handleToggleActive(item.id, !isActive)} color={isActive ? 'amber' : 'emerald'} />
                    <div className="flex-1" />
                    <button onClick={() => onNavigate(`u/${item.id}`)} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-zinc-500 dark:hover:text-slate-700 dark:text-zinc-300 dark:hover:bg-slate-100 dark:bg-zinc-800 transition-colors" title="View">
                      <Eye size={15} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:text-zinc-500 dark:hover:text-rose-600 dark:text-rose-400 dark:hover:bg-rose-500/10 transition-colors" title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon, label, onClick, color,
}: {
  icon: LucideIcon; label: string; onClick: () => void; color: 'indigo' | 'slate' | 'amber' | 'emerald';
}) {
  const colorClasses: Record<string, string> = {
    indigo: 'text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10',
    slate: 'text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-slate-100 dark:bg-zinc-800',
    amber: 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10',
    emerald: 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10',
  };
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${colorClasses[color]}`}>
      <Icon size={13} />
      {label}
    </button>
  );
}
