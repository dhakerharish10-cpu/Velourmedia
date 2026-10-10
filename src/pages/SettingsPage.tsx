import { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';
import { ProfileEditModal } from '../components/ProfileEditModal';
import { PersonaSwitcher } from '../components/PersonaSwitcher';
import { Link2, Copy, Check, Crown, Settings as SettingsIcon, User as UserIcon, Bell, Shield, Sun, Moon, Loader2 } from 'lucide-react';

export function SettingsPage() {
  const { profile, openProfileEdit, openPersonaSwitcher, profiles, getProfileLink, addToast, updateProfile } = useStore();
  const { theme, toggleTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSales, setNotifSales] = useState(true);
  const [notifPayouts, setNotifPayouts] = useState(false);
  const [savingSales, setSavingSales] = useState(false);
  const [savingPayouts, setSavingPayouts] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

  useEffect(() => {
    if (profile) {
      setNotifEmail(profile.email_account_alerts ?? true);
      setNotifSales(profile.email_sales_alerts ?? true);
      setNotifPayouts(profile.email_payout_alerts ?? false);
    }
  }, [profile]);

  const profileLink = profile?.username ? getProfileLink(profile.username) : '';

  const handleCopyLink = async () => {
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

  const handleToggleSales = async (value: boolean) => {
    setNotifSales(value);
    setSavingSales(true);
    const { error } = await updateProfile({ email_sales_alerts: value });
    setSavingSales(false);
    if (error) {
      setNotifSales(!value);
      addToast('Failed to update preference.', 'error');
    } else {
      addToast(value ? 'Sales alerts enabled.' : 'Sales alerts disabled.', 'success');
    }
  };

  const handleTogglePayouts = async (value: boolean) => {
    setNotifPayouts(value);
    setSavingPayouts(true);
    const { error } = await updateProfile({ email_payout_alerts: value });
    setSavingPayouts(false);
    if (error) {
      setNotifPayouts(!value);
      addToast('Failed to update preference.', 'error');
    } else {
      addToast(value ? 'Payout alerts enabled.' : 'Payout alerts disabled.', 'success');
    }
  };

  const handleToggleAccount = async (value: boolean) => {
    setNotifEmail(value);
    setSavingAccount(true);
    const { error } = await updateProfile({ email_account_alerts: value });
    setSavingAccount(false);
    if (error) {
      setNotifEmail(!value);
      addToast('Failed to update preference.', 'error');
    } else {
      addToast(value ? 'Account alerts enabled.' : 'Account alerts disabled.', 'success');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Manage your profile, preferences, and personas.</p>
      </div>

      {/* Profile */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserIcon size={18} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Profile</h3>
          </div>
          <button onClick={openProfileEdit} className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium">
            Edit
          </button>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center overflow-hidden shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white uppercase">
                {(profile?.display_name || profile?.username || 'C')[0]}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{profile?.display_name || 'Unnamed'}</p>
            <p className="text-sm text-slate-500 dark:text-zinc-400">@{profile?.username}</p>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-t border-slate-100 dark:border-zinc-800">
            <span className="text-slate-500 dark:text-zinc-400">Bio</span>
            <span className="text-slate-700 dark:text-zinc-300 max-w-xs text-right truncate">{profile?.bio || 'Not set'}</span>
          </div>
          <div className="flex justify-between py-2 border-t border-slate-100 dark:border-zinc-800">
            <span className="text-slate-500 dark:text-zinc-400">Profile Type</span>
            <span className="text-slate-700 dark:text-zinc-300">{profile?.is_primary ? 'Primary' : 'Sub-profile'}</span>
          </div>
        </div>
      </div>

      {/* Profile link */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-2">
          <Link2 size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Profile Link</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">Share this link so fans can view and buy your content.</p>
        {profileLink ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={profileLink}
              readOnly
              className="flex-1 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 px-3 py-2 text-sm text-slate-700 dark:text-zinc-300 font-mono"
            />
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-400 dark:text-zinc-500">Set your username in profile settings first.</p>
        )}
      </div>

      {/* Preferences — Theme */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Preferences</h3>
        </div>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            {theme === 'dark' ? <Moon size={16} className="text-indigo-500" /> : <Sun size={16} className="text-indigo-500" />}
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Theme</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Switch between light and dark appearance</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="relative w-11 h-6 rounded-full transition-colors bg-indigo-500"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform flex items-center justify-center ${
                theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
              }`}
            >
              {theme === 'dark' ? <Moon size={10} className="text-indigo-600" /> : <Sun size={10} className="text-indigo-600" />}
            </span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Notifications</h3>
        </div>
        <div className="space-y-3">
          <ToggleRow label="Email notifications" desc="Receive emails about your account activity" value={notifEmail} onChange={handleToggleAccount} saving={savingAccount} />
          <ToggleRow label="New sales alerts" desc="Get notified when someone buys your content" value={notifSales} onChange={handleToggleSales} saving={savingSales} />
          <ToggleRow label="Payout updates" desc="Notifications about your payout status changes" value={notifPayouts} onChange={handleTogglePayouts} saving={savingPayouts} />
        </div>
      </div>

      {/* Personas */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SettingsIcon size={18} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Personas</h3>
          </div>
          <button onClick={openPersonaSwitcher} className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium">
            Manage
          </button>
        </div>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-3">Create and switch between multiple creator profiles under one account.</p>
        <div className="space-y-2">
          {profiles.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-zinc-800/50 px-3 py-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300 uppercase">{(p.display_name || p.username)[0]}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-900 dark:text-white truncate">
                  {p.display_name || p.username}
                  {p.is_primary && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">Primary</span>}
                </p>
                <p className="text-xs text-slate-400 dark:text-zinc-500">@{p.username}</p>
              </div>
              {p.is_primary && <Crown size={14} className="text-indigo-600 dark:text-indigo-400" />}
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Security</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-t border-slate-100 dark:border-zinc-800">
            <span className="text-slate-500 dark:text-zinc-400">Two-Factor Auth</span>
            <span className="text-slate-400 dark:text-zinc-500">Not configured</span>
          </div>
          <div className="flex justify-between py-2 border-t border-slate-100 dark:border-zinc-800">
            <span className="text-slate-500 dark:text-zinc-400">Active Sessions</span>
            <span className="text-slate-700 dark:text-zinc-300">1 device</span>
          </div>
        </div>
      </div>

      <ProfileEditModal />
      <PersonaSwitcher />
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange, saving }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void; saving?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
        <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">{desc}</p>
      </div>
      <div className="flex items-center gap-2">
        {saving && <Loader2 size={14} className="text-slate-400 dark:text-zinc-500 animate-spin" />}
        <button
          onClick={() => onChange(!value)}
          className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-zinc-700'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              value ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
