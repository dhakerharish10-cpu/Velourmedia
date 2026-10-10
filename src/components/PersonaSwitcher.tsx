import { useState } from 'react';
import { useStore } from '../lib/store';
import { X, Users, Plus, Check, Trash2, Loader2 } from 'lucide-react';

export function PersonaSwitcher() {
  const { isPersonaSwitcherOpen, closePersonaSwitcher, profiles, profile, setActiveProfile, createSubProfile, deleteSubProfile, addToast } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isPersonaSwitcherOpen) return null;

  const activeId = profile?.id;

  const handleSelect = (profileId: string) => {
    setActiveProfile(profileId);
    addToast('Persona switched.', 'success');
    closePersonaSwitcher();
  };

  const handleCreate = async () => {
    if (!newUsername.trim() || newUsername.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    setCreating(true);
    setError(null);
    const { error: createError } = await createSubProfile(newUsername.trim(), newDisplayName.trim());
    if (createError) {
      if (createError.includes('duplicate')) {
        setError('That username is already taken.');
      } else {
        setError(createError);
      }
      setCreating(false);
      return;
    }
    addToast('New persona created!', 'success');
    setNewUsername('');
    setNewDisplayName('');
    setShowCreate(false);
    setCreating(false);
  };

  const handleDelete = async (profileId: string, name: string) => {
    const { error: delError } = await deleteSubProfile(profileId);
    if (delError) {
      addToast(delError, 'error');
    } else {
      addToast(`Persona "${name}" deleted.`, 'success');
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center px-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closePersonaSwitcher} />
      <div className="relative w-full max-w-md rounded-2xl glass border border-slate-200 dark:border-zinc-700 p-6 shadow-2xl animate-scale-in">
        <button
          onClick={closePersonaSwitcher}
          className="absolute top-4 right-4 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
          <Users size={20} className="text-indigo-400" />
          Switch Persona
        </h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-5">Select a profile or create a new persona.</p>

        {/* Profile list */}
        <div className="space-y-2 mb-4">
          {profiles.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-all cursor-pointer ${
                activeId === p.id
                  ? 'border-indigo-500/50 bg-indigo-50 dark:bg-indigo-500/10'
                  : 'border-slate-200 dark:border-zinc-700/50 bg-slate-50 dark:bg-zinc-950 dark:bg-zinc-900/50 hover:border-slate-300 dark:hover:border-zinc-600'
              }`}
              onClick={() => handleSelect(p.id)}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center shrink-0 overflow-hidden">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt={p.display_name || p.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-white uppercase">{(p.display_name || p.username)[0]}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {p.display_name || p.username}
                  {p.is_primary && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">Primary</span>}
                </p>
                <p className="text-xs text-slate-400 dark:text-zinc-500 truncate">@{p.username}</p>
              </div>
              {activeId === p.id && (
                <Check size={18} className="text-indigo-400 shrink-0" />
              )}
              {!p.is_primary && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.display_name || p.username); }}
                  className="p-1.5 rounded-lg text-slate-400 dark:text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Create new persona */}
        {showCreate ? (
          <div className="space-y-3 rounded-xl bg-slate-50 dark:bg-zinc-950 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-700/50 p-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">New Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 text-sm">@</span>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="new_persona"
                  minLength={3}
                  className="w-full rounded-lg bg-slate-50 dark:bg-zinc-950 dark:bg-zinc-900/80 border border-slate-300 dark:border-zinc-700/50 pl-8 pr-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">Display Name</label>
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="Display name (optional)"
                className="w-full rounded-lg bg-slate-50 dark:bg-zinc-950 dark:bg-zinc-900/80 border border-slate-300 dark:border-zinc-700/50 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>
            {error && (
              <div className="rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowCreate(false); setError(null); setNewUsername(''); setNewDisplayName(''); }}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 px-3 py-2 rounded-lg bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-indigo-500/50 text-sm text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all"
          >
            <Plus size={16} />
            Create New Persona
          </button>
        )}
      </div>
    </div>
  );
}
