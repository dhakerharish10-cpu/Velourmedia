import { useState } from 'react';
import { useStore } from '../lib/store';
import { Gift, Copy, Check, Users, DollarSign, TrendingUp, Share2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
      <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400 mb-2">
        <Icon size={16} className="text-indigo-600 dark:text-indigo-400" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

export function ReferEarnPage() {
  const { user, addToast } = useStore();
  const [copied, setCopied] = useState(false);

  const referralCode = (user?.id || 'VELOUR').slice(0, 8).toUpperCase();
  const referralLink = `${window.location.origin}/#/?ref=${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      addToast('Referral link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast('Failed to copy link.', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Refer & Earn</h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Invite creators and earn 5% of their first month of revenue.</p>
      </div>

      {/* Hero card */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-transparent p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <Gift size={24} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Referral Link</h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400">Share with friends and earn together</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-4 py-3 font-mono text-sm text-slate-700 dark:text-zinc-300 truncate">
            {referralLink}
          </div>
          <button
            onClick={handleCopy}
            className="px-5 py-3 rounded-xl bg-gradient-brand text-slate-900 dark:text-white font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            {copied ? <Check size={16} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        <div className="flex items-center gap-2 mt-4 text-xs text-slate-400 dark:text-zinc-500">
          <Share2 size={14} />
          <span>Referral code: <span className="text-indigo-600 dark:text-indigo-300 font-mono font-medium">{referralCode}</span></span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Referrals" value="0" />
        <StatCard icon={TrendingUp} label="Active This Month" value="0" />
        <StatCard icon={DollarSign} label="Total Earned" value="$0.00" />
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">How It Works</h3>
        <div className="space-y-4">
          {[
            { step: '1', title: 'Share your link', desc: 'Send your unique referral link to creators you know.' },
            { step: '2', title: 'They sign up', desc: 'When they create an account using your link, they are linked to you.' },
            { step: '3', title: 'You earn', desc: 'Get 5% of their first month of revenue, automatically credited to your wallet.' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-sm font-bold shrink-0">
                {item.step}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{item.title}</p>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Referral history */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Your Referrals</h3>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Users size={28} className="text-indigo-300 dark:text-zinc-700 mb-2" />
          <p className="text-sm text-slate-400 dark:text-zinc-500">No referrals yet. Share your link to start earning!</p>
        </div>
      </div>
    </div>
  );
}
