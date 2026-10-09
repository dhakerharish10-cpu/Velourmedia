import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';
import { UserMenu } from './UserMenu';
import { Sparkles, LayoutDashboard, Library, Menu, X, Sun, Moon } from 'lucide-react';

function ThemeToggle({ theme, toggleTheme, size = 18 }: { theme: string; toggleTheme: () => void; size?: number }) {
  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all group"
      aria-label="Toggle theme"
    >
      <span className="block transition-transform duration-500 group-hover:rotate-180">
        {theme === 'dark' ? <Sun size={size} /> : <Moon size={size} />}
      </span>
    </button>
  );
}
import { useState } from 'react';

interface NavbarProps {
  onNavigate: (path: string) => void;
  currentPath?: string;
}

export function Navbar({ onNavigate, currentPath }: NavbarProps) {
  const { user, openAuth } = useStore();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (path: string) => {
    onNavigate(path);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-slate-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <button onClick={() => handleNav('')} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">Velour</span>
        </button>

        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => handleNav('')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentPath === '' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' : 'text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white'}`}
          >
            Discover
          </button>
          {user && (
            <>
              <button
                onClick={() => handleNav('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${currentPath === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' : 'text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white'}`}
              >
                <LayoutDashboard size={15} />
                Dashboard
              </button>
              <button
                onClick={() => handleNav('library')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${currentPath === 'library' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' : 'text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white'}`}
              >
                <Library size={15} />
                Library
              </button>
            </>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {/* Theme toggle — prominent */}
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />

          {user ? (
            <UserMenu onNavigate={onNavigate} />
          ) : (
            <>
              <button
                onClick={() => openAuth('signin')}
                className="px-4 py-1.5 rounded-lg text-sm font-medium text-slate-700 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:bg-zinc-950 dark:hover:bg-zinc-800 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => openAuth('signup')}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-gradient-brand text-white hover:opacity-90 transition-opacity shadow-sm"
              >
                Get Started
              </button>
            </>
          )}
        </div>

        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} size={16} />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-zinc-800 px-4 py-3 space-y-1 animate-fade-in glass">
          <button onClick={() => handleNav('')} className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:bg-zinc-950 dark:hover:bg-zinc-800">
            Discover
          </button>
          {user && (
            <>
              <button onClick={() => handleNav('dashboard')} className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:bg-zinc-950 dark:hover:bg-zinc-800">
                Dashboard
              </button>
              <button onClick={() => handleNav('library')} className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:bg-zinc-950 dark:hover:bg-zinc-800">
                Library
              </button>
            </>
          )}
          {/* Theme toggle in mobile menu */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-800/50">
            <span className="text-sm text-slate-600 dark:text-zinc-300 flex items-center gap-2">
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} size={16} />
          </div>

          {user ? (
            <button onClick={() => { setMobileOpen(false); onNavigate(''); }} className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:bg-zinc-950 dark:hover:bg-zinc-800">
              Use full menu in Dashboard
            </button>
          ) : (
            <div className="flex gap-2 pt-2">
              <button onClick={() => { openAuth('signin'); setMobileOpen(false); }} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700">
                Sign In
              </button>
              <button onClick={() => { openAuth('signup'); setMobileOpen(false); }} className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-brand text-white">
                Get Started
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
