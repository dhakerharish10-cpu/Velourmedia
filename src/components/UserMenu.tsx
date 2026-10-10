import { useState, useRef, useEffect } from 'react';
import { useStore } from '../lib/store';
import { ChevronDown, User, LayoutDashboard, Library, Settings, LogOut, Users, ExternalLink } from 'lucide-react';

interface UserMenuProps {
  onNavigate: (path: string) => void;
}

export function UserMenu({ onNavigate }: UserMenuProps) {
  const { user, profile, signOut, openPersonaSwitcher, openProfileEdit } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return null;

  const handleNav = (path: string) => {
    onNavigate(path);
    setOpen(false);
  };

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    onNavigate('');
  };

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Creator';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center shrink-0 overflow-hidden">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-white uppercase">{displayName[0]}</span>
          )}
        </div>
        <span className="text-sm text-slate-700 dark:text-zinc-200 max-w-[100px] truncate hidden sm:block">{displayName}</span>
        <ChevronDown size={14} className={`text-slate-400 dark:text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-xl glass border border-slate-200 dark:border-zinc-700 shadow-xl py-1.5 z-50 animate-scale-in">
          <div className="px-3 py-2 border-b border-slate-200 dark:border-zinc-700 mb-1">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{displayName}</p>
            <p className="text-xs text-slate-400 dark:text-zinc-500 truncate">{user?.email}</p>
          </div>

          <button
            onClick={() => { openProfileEdit(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <User size={15} className="text-slate-400 dark:text-zinc-500" />
            Edit Profile
          </button>

          <button
            onClick={() => profile && handleNav(`c/${profile.username}`)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ExternalLink size={15} className="text-slate-400 dark:text-zinc-500" />
            View Public Profile
          </button>

          <div className="h-px bg-slate-200 dark:bg-zinc-700 my-1" />

          <button
            onClick={() => handleNav('dashboard')}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <LayoutDashboard size={15} className="text-slate-400 dark:text-zinc-500" />
            Dashboard
          </button>

          <button
            onClick={() => handleNav('dashboard/earnings')}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Settings size={15} className="text-slate-400 dark:text-zinc-500" />
            Earnings Dashboard
          </button>

          <button
            onClick={() => handleNav('library')}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Library size={15} className="text-slate-400 dark:text-zinc-500" />
            My Library
          </button>

          <button
            onClick={() => { openPersonaSwitcher(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Users size={15} className="text-slate-400 dark:text-zinc-500" />
            Switch Persona
          </button>

          <button
            onClick={() => { openProfileEdit(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Settings size={15} className="text-slate-400 dark:text-zinc-500" />
            Settings
          </button>

          <div className="h-px bg-slate-200 dark:bg-zinc-700 my-1" />

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
          >
            <LogOut size={15} />
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
