import { useState } from 'react';
import { useStore } from '../lib/store';
import {
  Home, Wallet, ShieldCheck, Gift, Settings, ChevronDown, ChevronRight, Plus, Sparkles, X, Crown, LogOut, Library, Shield,
  FilePlus, User, BarChart3, Cog, Headset,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AppRoute = 'home' | 'wallet' | 'kyc' | 'refer' | 'settings' | 'library';

interface SidebarProps {
  current: AppRoute;
  onNavigate: (path: string) => void;
  onClose?: () => void;
}

const NAV_ITEMS: { id: AppRoute; label: string; icon: LucideIcon; path: string }[] = [
  { id: 'home', label: 'Home', icon: Home, path: 'dashboard' },
  { id: 'wallet', label: 'Wallet', icon: Wallet, path: 'wallet' },
  { id: 'kyc', label: 'KYC Verification', icon: ShieldCheck, path: 'kyc' },
  { id: 'refer', label: 'Refer & Earn', icon: Gift, path: 'refer' },
  { id: 'library', label: 'Library', icon: Library, path: 'library' },
  { id: 'settings', label: 'Settings', icon: Settings, path: 'settings' },
];

const CREATOR_SUB_ITEMS = [
  { label: 'New Post', icon: FilePlus, action: 'upload' },
  { label: 'Profile', icon: User, path: 'creator-profile' },
  { label: 'Analytics', icon: BarChart3, path: 'creator-analytics' },
  { label: 'Settings', icon: Cog, path: 'creator-settings' },
];

export function Sidebar({ current, onNavigate, onClose }: SidebarProps) {
  const { user, profile, profiles, setActiveProfile, openPersonaSwitcher, signOut, addToast, openUpload } = useStore();
  const [creatorsOpen, setCreatorsOpen] = useState(true);
  const [expandedCreator, setExpandedCreator] = useState<string | null>(profile?.id || null);

  const isAdmin = !!profile?.is_admin;

  const handleNav = (path: string) => {
    onNavigate(path);
    onClose?.();
  };

  const handleSwitch = (id: string) => {
    setActiveProfile(id);
    setExpandedCreator(id);
    addToast('Switched creator profile.', 'success');
  };

  const handleAddCreator = () => {
    openPersonaSwitcher();
    onClose?.();
  };

  const handleSubNav = (creatorId: string, item: { action?: string; path?: string }) => {
    setActiveProfile(creatorId);
    if (item.action === 'upload') {
      openUpload();
      onClose?.();
    } else if (item.path) {
      handleNav(item.path);
    }
  };

  return (
    <div className="flex flex-col h-full w-64 bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-14 border-b border-slate-200 dark:border-zinc-800 shrink-0">
        <button onClick={() => handleNav('')} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">Velour</span>
        </button>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800">
            <X size={18} />
          </button>
        )}
      </div>

      {/* User card */}
      <div className="px-3 py-3 border-b border-slate-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 dark:bg-zinc-900">
          <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center overflow-hidden shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-white uppercase">
                {(profile?.display_name || profile?.username || user?.email?.[0] || 'C')[0]}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {profile?.display_name || user?.email?.split('@')[0] || 'Creator'}
            </p>
            <p className="text-xs text-slate-400 dark:text-zinc-500 truncate">@{profile?.username || 'unknown'}</p>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide px-3 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20'
                  : 'text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:bg-zinc-950 dark:hover:bg-zinc-800 border border-transparent'
              }`}
            >
              <item.icon size={18} className={active ? 'text-indigo-500' : 'text-slate-400 dark:text-zinc-500'} />
              {item.label}
            </button>
          );
        })}

        {/* Admin Dashboard link (admin only) */}
        {isAdmin && (
          <button
            onClick={() => handleNav('admin')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all mt-2"
          >
            <Shield size={18} className="text-indigo-500" />
            Admin Dashboard
          </button>
        )}

        {/* Creators section */}
        <div className="pt-4">
          <button
            onClick={() => setCreatorsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider hover:text-slate-600 dark:hover:text-zinc-300 transition-colors"
          >
            <span>Creators</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${creatorsOpen ? 'rotate-180' : ''}`} />
          </button>

          <div className={`overflow-hidden transition-all duration-200 ${creatorsOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="space-y-0.5 pt-1">
              {profiles.map((p) => {
                const isExpanded = expandedCreator === p.id;
                return (
                  <div key={p.id}>
                    <div className="flex items-center">
                      <button
                        onClick={() => handleSwitch(p.id)}
                        className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:bg-zinc-950 dark:hover:bg-zinc-800 transition-colors min-w-0"
                      >
                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                          {p.avatar_url ? (
                            <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-slate-600 dark:text-zinc-300 uppercase">
                              {(p.display_name || p.username)[0]}
                            </span>
                          )}
                        </div>
                        <span className="truncate flex-1 text-left">@{p.username}</span>
                        {p.is_primary && <Crown size={12} className="text-indigo-500 shrink-0" />}
                      </button>
                      <button
                        onClick={() => setExpandedCreator(isExpanded ? null : p.id)}
                        className="p-1.5 rounded text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors shrink-0"
                      >
                        <ChevronRight size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                    </div>

                    <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="pl-9 pt-0.5 pb-1 space-y-0.5">
                        {CREATOR_SUB_ITEMS.map((sub) => (
                          <button
                            key={sub.label}
                            onClick={() => handleSubNav(p.id, sub)}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                          >
                            <sub.icon size={13} />
                            {sub.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={handleAddCreator}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
              >
                <div className="w-7 h-7 rounded-full border border-dashed border-slate-300 dark:border-zinc-700 flex items-center justify-center shrink-0">
                  <Plus size={14} />
                </div>
                Add creator
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Support + Sign out */}
      <div className="px-3 py-3 border-t border-slate-200 dark:border-zinc-800 shrink-0 space-y-0.5">
        <a
          href="mailto:support@velourmedia.com?subject=VelourMedia%20Creator%20Support%20Request"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <Headset size={18} className="text-slate-500 dark:text-zinc-400" />
          Contact Support
        </a>
        <button
          onClick={() => { signOut(); handleNav(''); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 dark:text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </div>
  );
}
