import { useState, useRef, useEffect } from 'react';
import { useStore } from '../lib/store';
import { X, Loader2, Camera, User as UserIcon } from 'lucide-react';

export function ProfileEditModal() {
  const { isProfileEditOpen, closeProfileEdit, profile, updateProfile, uploadAvatar, addToast } = useStore();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isProfileEditOpen && profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username);
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url);
      setAvatarFile(null);
      setAvatarPreview(null);
      setError(null);
    }
  }, [isProfileEditOpen, profile]);

  if (!isProfileEditOpen) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file.', 'error');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    if (!username.trim() || username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      setSaving(false);
      return;
    }

    let finalAvatarUrl = avatarUrl;

    if (avatarFile) {
      const { error: uploadError, url } = await uploadAvatar(avatarFile);
      if (uploadError) {
        setError(uploadError);
        setSaving(false);
        return;
      }
      finalAvatarUrl = url;
    }

    const { error: updateError } = await updateProfile({
      display_name: displayName.trim(),
      username: username.trim(),
      bio: bio.trim(),
      avatar_url: finalAvatarUrl,
    });

    if (updateError) {
      if (updateError.includes('duplicate')) {
        setError('That username is already taken.');
      } else {
        setError(updateError);
      }
      setSaving(false);
      return;
    }

    addToast('Profile updated successfully.', 'success');
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setSaving(false);
    closeProfileEdit();
  };

  const displayAvatar = avatarPreview || avatarUrl;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center px-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeProfileEdit} />
      <div className="relative w-full max-w-lg rounded-2xl glass border border-slate-200 dark:border-zinc-700 p-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto scrollbar-hide">
        <button
          onClick={closeProfileEdit}
          className="absolute top-4 right-4 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Edit Profile</h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-5">Customize your creator persona.</p>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 overflow-hidden flex items-center justify-center">
              {displayAvatar ? (
                <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={32} className="text-slate-400 dark:text-zinc-600" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center hover:bg-indigo-400 transition-colors border-2 border-white dark:border-zinc-900"
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">Profile Picture</p>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">Tap the camera icon to upload</p>
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
              className="w-full rounded-xl bg-slate-50 dark:bg-zinc-950 dark:bg-zinc-900/80 border border-slate-300 dark:border-zinc-700/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 text-sm">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="username"
                minLength={3}
                className="w-full rounded-xl bg-zinc-900/80 border border-zinc-700/50 pl-8 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              />
            </div>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Letters, numbers, and underscores only.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell fans about yourself..."
              rows={3}
              className="w-full rounded-xl bg-slate-50 dark:bg-zinc-950 dark:bg-zinc-900/80 border border-slate-300 dark:border-zinc-700/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={closeProfileEdit}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium text-sm hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-brand text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
