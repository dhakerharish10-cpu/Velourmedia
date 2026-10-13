import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import {
  Package, Eye, DollarSign, Link2, Copy, Check, Crown, BarChart3,
  Lock, Unlock, Power, Plus, Search, ExternalLink, ShoppingBag,
  Pencil, Trash2, Copy as Duplicate, MoreVertical, type LucideIcon,
} from 'lucide-react';

type FilterTab = 'ALL' | 'ACTIVE' | 'INACTIVE';
type SortOption = 'Newest' | 'Oldest' | 'Most Views' | 'Most Sales';

function StatCard({ icon: Icon, label, value, accent }: { icon: LucideIcon; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 transition-all ${accent ? 'border-transparent bg-gradient-brand-card shadow-lg shadow-indigo-600/20' : 'border-slate-200 bg-white shadow-sm'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? 'bg-white/15' : 'bg-slate-100'}`}>
          <Icon size={18} className={accent ? 'text-slate-900 dark:text-white' : 'text-slate-500'} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${accent ? 'text-slate-900 dark:text-white' : 'text-slate-900'}`}>{value}</p>
      <p className={`text-xs mt-1 ${accent ? 'text-indigo-100' : 'text-slate-500'}`}>{label}</p>
    </div>
  );
}

export function CreatorProfileView({ onNavigate: _onNavigate }: { onNavigate: (path: string) => void }) {
  const {
    user, profile, myContent, earnings, getProfileLink, addToast,
    openPersonaSwitcher, profiles, openProfileEdit, openUpload,
    deleteContent, togglePrivate, togglePublished, duplicateContent,
    salesVisibilityPercent,
  } = useStore();
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('Newest');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const { openEditPost } = useStore();

  if (!user) return null;

  const profileLink = profile?.username ? getProfileLink(profile.username) : '';
  const totalViews = myContent.reduce((sum, item) => sum + (item.views_count || 0), 0);
  const ratio = salesVisibilityPercent / 100;
  const totalRevenue = Number(earnings?.content_revenue || 0) * ratio;

  const handleCopyProfileLink = async () => {
    if (!profileLink) return;
    try {
      await navigator.clipboard.writeText(profileLink);
      setCopied(true);
      addToast('Profile link copied!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast('Failed to copy link.', 'error');
    }
  };

  const handleCopyPostLink = async (contentId: string) => {
    const link = `${window.location.origin}/#/u/${contentId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(contentId);
      addToast('Post link copied!', 'success');
      setTimeout(() => setCopiedId((prev) => (prev === contentId ? null : prev)), 2000);
    } catch {
      addToast('Failed to copy link.', 'error');
    }
  };

  const handleDelete = async (contentId: string) => {
    const { error } = await deleteContent(contentId);
    if (error) addToast(error, 'error');
    else addToast('Post deleted.', 'success');
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

  // Filter and sort posts
  const filteredPosts = useMemo(() => {
    let result = [...myContent];

    if (filter === 'ACTIVE') result = result.filter((p) => p.is_published);
    else if (filter === 'INACTIVE') result = result.filter((p) => !p.is_published);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.title.toLowerCase().includes(q));
    }

    switch (sort) {
      case 'Oldest': result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case 'Most Views': result.sort((a, b) => (b.views_count || 0) - (a.views_count || 0)); break;
      case 'Most Sales': result.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0)); break;
      default: result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [myContent, filter, search, sort]);

  const activeCount = myContent.filter((p) => p.is_published).length;
  const inactiveCount = myContent.filter((p) => !p.is_published).length;

  return (
    <div className="space-y-6">
      {/* Profile header card */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full bg-gradient-brand flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-slate-900 dark:text-white uppercase">
                  {(profile?.display_name || profile?.username || 'C')[0]}
                </span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900">{profile?.display_name || 'Unnamed'}</h2>
              {profile?.is_primary && <Crown size={16} className="text-indigo-500" />}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-medium text-emerald-600">
                <Check size={10} /> Verified
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">@{profile?.username}</p>
            {profile?.bio && <p className="text-sm text-slate-600 mt-2 max-w-md">{profile.bio}</p>}
            {profiles.length > 1 && (
              <button onClick={openPersonaSwitcher} className="text-xs text-indigo-600 hover:text-indigo-500 mt-2 font-medium">
                Switch persona
              </button>
            )}
          </div>

          {/* Edit button */}
          <button
            onClick={openProfileEdit}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 dark:bg-zinc-950 transition-colors shrink-0"
          >
            <Pencil size={14} />
            Edit
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Package} label="POSTS" value={myContent.length.toString()} accent />
        <StatCard icon={Eye} label="VIEWS" value={totalViews.toString()} />
        <StatCard icon={DollarSign} label="EARNED" value={`$${totalRevenue.toFixed(2)}`} />
      </div>

      {/* Shareable profile link */}
      {profileLink && (
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Link2 size={18} className="text-indigo-500" />
            <h3 className="text-base font-semibold text-slate-900">Profile Link</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 px-4 py-3 font-mono text-sm text-slate-600 truncate">
              {profileLink}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyProfileLink}
                className="px-4 py-3 rounded-xl bg-indigo-600 text-slate-900 dark:text-white font-semibold text-sm hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 shrink-0"
              >
                {copied ? <Check size={16} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <a
                href={profileLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 dark:bg-zinc-950 transition-colors flex items-center justify-center gap-2 shrink-0"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Posts section */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
        {/* Posts header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900">Posts</h3>
          <button
            onClick={openUpload}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-brand text-slate-900 dark:text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <Plus size={15} />
            New
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-4">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as FilterTab[]).map((tab) => {
            const count = tab === 'ALL' ? myContent.length : tab === 'ACTIVE' ? activeCount : inactiveCount;
            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === tab
                    ? 'bg-indigo-600 text-slate-900 dark:text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filter === tab ? 'bg-white/20' : 'bg-slate-200 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search + sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts..."
              className="w-full rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 pl-9 pr-4 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-all"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-all"
          >
            <option>Newest</option>
            <option>Oldest</option>
            <option>Most Views</option>
            <option>Most Sales</option>
          </select>
        </div>

        {/* Post cards */}
        {filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package size={32} className="text-slate-300 mb-2" />
            <p className="text-sm text-slate-400">
              {myContent.length === 0 ? 'No posts yet. Create your first post.' : 'No posts match your filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPosts.map((item) => {
              const itemLink = `${window.location.origin}/#/u/${item.id}`;
              const isPrivate = item.is_private;
              const isActive = item.is_published;
              const earned = Number(item.earned_amount || 0);
              return (
                <div key={item.id} className="group rounded-xl bg-white border border-slate-200 p-4 hover:border-slate-300 transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                      {item.media_type === 'image' ? (
                        <img
                          src={item.thumbnail_url || item.media_url}
                          alt={item.title}
                          className="w-full h-full object-cover blur-sm scale-110 group-hover:blur-0 group-hover:scale-100 transition-all duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100">
                          <Package size={20} className="text-slate-400" />
                        </div>
                      )}
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white">
                        {item.price === 0 ? 'FREE' : `$${Number(item.price).toFixed(0)}`}
                      </div>
                      {!isActive && (
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-500/90 text-[9px] font-bold text-white">INACTIVE</div>
                      )}
                      {isPrivate && (
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-slate-600/90 text-[9px] font-bold text-white">PRIVATE</div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                          isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : 'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {/* Short link */}
                      <p className="text-xs text-slate-400 font-mono mt-1 truncate">{itemLink}</p>

                      {/* Real-time metrics bar */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Eye size={12} /> {item.views_count || 0}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <ShoppingBag size={12} /> {Math.round((item.sales_count || 0) * ratio)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          ${Number(item.price).toFixed(2)}
                        </span>
                        {earned > 0 && (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Earned: ${(earned * ratio).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action toolbar */}
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    <ActionButton icon={copiedId === item.id ? Check : Copy} label={copiedId === item.id ? 'Copied' : 'Copy'} onClick={() => handleCopyPostLink(item.id)} color="indigo" />
                    <ActionButton icon={Duplicate} label="Duplicate" onClick={() => handleDuplicate(item.id)} color="slate" />
                    <ActionButton icon={isPrivate ? Unlock : Lock} label={isPrivate ? 'Make public' : 'Make private'} onClick={() => handleTogglePrivate(item.id, !isPrivate)} color="slate" />
                    <ActionButton icon={Power} label={isActive ? 'Deactivate' : 'Activate'} onClick={() => handleToggleActive(item.id, !isActive)} color={isActive ? 'amber' : 'emerald'} />
                    <div className="flex-1" />

                    {/* 3-dot menu */}
                    <div ref={menuRef} className="relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                        title="More options"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openMenuId === item.id && (
                        <div className="absolute right-0 bottom-full mb-1 w-44 rounded-xl glass border border-slate-200 dark:border-zinc-700 shadow-xl py-1.5 z-50 animate-scale-in">
                          <button
                            onClick={() => { openEditPost(item.id); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                          >
                            <Pencil size={14} className="text-slate-400 dark:text-zinc-500" />
                            Edit Post
                          </button>
                          <button
                            onClick={() => { handleTogglePrivate(item.id, !isPrivate); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                          >
                            {isPrivate ? <Unlock size={14} className="text-slate-400 dark:text-zinc-500" /> : <Lock size={14} className="text-slate-400 dark:text-zinc-500" />}
                            {isPrivate ? 'Make Public' : 'Make Private'}
                          </button>
                          <button
                            onClick={() => { handleDuplicate(item.id); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                          >
                            <Duplicate size={14} className="text-slate-400 dark:text-zinc-500" />
                            Duplicate Post
                          </button>
                          <div className="h-px bg-slate-200 dark:bg-zinc-700 my-1" />
                          <button
                            onClick={() => { handleDelete(item.id); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 size={14} />
                            Delete Post
                          </button>
                        </div>
                      )}
                    </div>

                    <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors" title="Delete">
                      <Trash2 size={14} />
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

export function CreatorAnalyticsView({ onNavigate: _onNavigate }: { onNavigate: (path: string) => void }) {
  const { user, myContent, earnings, salesVisibilityPercent, profile } = useStore();
  const [postSales, setPostSales] = useState<Array<{ content_id: string; title: string; sales_count: number; gross: number; net: number }>>([]);
  const [liveGross, setLiveGross] = useState(0);

  const creatorId = profile?.id || user?.id || null;

  const loadPostSales = useCallback(async () => {
    if (!creatorId) return;
    const [txRes, purchRes] = await Promise.all([
      supabase.from('transactions').select('content_id, amount, raw_payload').eq('creator_id', creatorId),
      supabase.from('purchases').select('content_id, amount_paid, content:content(id, title)'),
    ]);

    const postMap = new Map<string, { title: string; sales_count: number; gross: number }>();

    // Add purchases
    for (const p of (purchRes.data || []) as Array<Record<string, unknown>>) {
      const cid = p.content_id as string;
      if (!cid) continue;
      const content = p.content as Record<string, unknown> | undefined;
      const title = (content?.title as string) || 'Unknown';
      const amount = Number(p.amount_paid || 0);
      const existing = postMap.get(cid) || { title, sales_count: 0, gross: 0 };
      existing.sales_count += 1;
      existing.gross += amount;
      postMap.set(cid, existing);
    }

    // Add transactions (with raw_payload fallback)
    for (const t of (txRes.data || []) as Array<Record<string, unknown>>) {
      const cid = t.content_id as string;
      if (!cid) continue;
      let amount = Number(t.amount || 0);
      if (amount === 0) {
        const raw = t.raw_payload as Record<string, unknown> | undefined;
        const rawData = raw?.data as Record<string, unknown> | undefined;
        const initialPrice = rawData ? Number(rawData.initial_price || 0) : 0;
        if (initialPrice > 0) amount = initialPrice;
      }
      if (amount <= 0) continue;
      const contentRow = myContent.find((c) => c.id === cid);
      const title = contentRow?.title || (() => {
        const raw = t.raw_payload as Record<string, unknown> | undefined;
        const rawData = raw?.data as Record<string, unknown> | undefined;
        return (rawData?.title as string) || 'Unknown';
      })();
      const existing = postMap.get(cid) || { title, sales_count: 0, gross: 0 };
      existing.sales_count += 1;
      existing.gross += amount;
      postMap.set(cid, existing);
    }

    const rows = Array.from(postMap.entries()).map(([content_id, data]) => ({
      content_id,
      title: data.title,
      sales_count: data.sales_count,
      gross: data.gross,
      net: Math.round(data.gross * 0.7 * 100) / 100,
    }));
    setPostSales(rows);
    setLiveGross(rows.reduce((s, r) => s + r.gross, 0));
  }, [creatorId, myContent]);

  useEffect(() => {
    loadPostSales();
  }, [loadPostSales]);

  // Realtime: live-update when a new transaction comes in for this creator
  useEffect(() => {
    if (!creatorId) return;
    const channel = supabase
      .channel('creator-analytics-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `creator_id=eq.${creatorId}` }, () => {
        loadPostSales();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [creatorId, loadPostSales]);

  if (!user) return null;

  const ratio = salesVisibilityPercent / 100;
  const totalViews = myContent.reduce((sum, item) => sum + (item.views_count || 0), 0);
  const grossRevenue = liveGross > 0 ? liveGross : Number(earnings?.content_revenue || 0) * ratio;
  const platformFees = Math.round(grossRevenue * 0.3 * 100) / 100;
  const netRevenue = Math.round(grossRevenue * 0.7 * 100) / 100;
  const totalSales = postSales.reduce((s, r) => s + r.sales_count, 0) || Math.round((earnings?.total_sales || 0) * ratio);

  const sortedByViews = [...myContent].sort((a, b) => (b.views_count || 0) - (a.views_count || 0)).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Track your performance and top content.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Eye} label="Total Views" value={totalViews.toString()} accent />
        <StatCard icon={BarChart3} label="Total Sales" value={totalSales.toString()} />
        <StatCard icon={DollarSign} label="Net Revenue (70%)" value={`${netRevenue.toFixed(2)}`} />
        <StatCard icon={Package} label="Total Posts" value={myContent.length.toString()} />
      </div>

      {/* Revenue breakdown */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Revenue Breakdown</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-sm text-slate-600">Gross Content Sales</span>
            <span className="text-sm font-semibold text-slate-900">${(Number(earnings?.content_revenue || 0) * ratio).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-sm text-slate-600">Platform Fee (30%)</span>
            <span className="text-sm font-semibold text-rose-500">-${platformFees.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-sm text-slate-600">Net Earnings (70%)</span>
            <span className="text-sm font-semibold text-emerald-600">${netRevenue.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-600">Total Posts</span>
            <span className="text-sm font-semibold text-slate-900">{myContent.length}</span>
          </div>
        </div>
      </div>

      {/* Top posts */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Top Posts by Views</h3>
        {sortedByViews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <BarChart3 size={28} className="text-slate-300 mb-2" />
            <p className="text-sm text-slate-400">No posts yet. Create content to see analytics.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedByViews.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 hover:bg-slate-50 dark:bg-zinc-950 transition-colors">
                <span className="text-sm font-bold text-slate-400 w-5 shrink-0">{idx + 1}</span>
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                  {item.media_type === 'image' && (
                    <img src={item.thumbnail_url || item.media_url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1"><Eye size={10} /> {item.views_count || 0}</span>
                    <span className="flex items-center gap-1"><ShoppingBag size={10} /> {item.sales_count || 0}</span>
                    <span>{item.price === 0 ? 'Free' : `${Number(item.price).toFixed(2)}`}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per-Post Sales Analytics */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <ShoppingBag size={16} className="text-emerald-500" />
          Per-Post Sales Analytics
        </h3>
        {postSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <ShoppingBag size={28} className="text-slate-300 mb-2" />
            <p className="text-sm text-slate-400">No sales yet. Your per-post breakdown will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="py-2 px-3 text-xs font-medium text-slate-400">Post Title</th>
                  <th className="py-2 px-3 text-xs font-medium text-slate-400 text-center">Sales Count</th>
                  <th className="py-2 px-3 text-xs font-medium text-slate-400 text-right">Gross Sales</th>
                  <th className="py-2 px-3 text-xs font-medium text-slate-400 text-right">Your Earnings (70%)</th>
                </tr>
              </thead>
              <tbody>
                {postSales.map((r) => (
                  <tr key={r.content_id} className="border-b border-slate-100/50 hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-slate-900 truncate max-w-[200px]">{r.title}</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{r.sales_count}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900">${r.gross.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">${r.net.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td colSpan={1} className="py-2.5 px-3 text-right text-xs font-medium text-slate-400">Totals:</td>
                  <td className="py-2.5 px-3 text-center font-bold text-slate-900">{totalSales}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">${grossRevenue.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-600">${netRevenue.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
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
    indigo: 'text-indigo-600 hover:bg-indigo-50',
    slate: 'text-slate-500 hover:bg-slate-100',
    amber: 'text-amber-600 hover:bg-amber-50',
    emerald: 'text-emerald-600 hover:bg-emerald-50',
  };
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${colorClasses[color]}`}>
      <Icon size={13} />
      {label}
    </button>
  );
}
