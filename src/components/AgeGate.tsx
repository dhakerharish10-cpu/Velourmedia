import { useState } from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

interface GuestAgeGateProps {
  onConfirm: () => void;
}

export function GuestAgeGate({ onConfirm }: GuestAgeGateProps) {
  const [declined, setDeclined] = useState(false);

  if (declined) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm px-6">
        <div className="text-center max-w-md animate-fade-in bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-2xl">
          <AlertTriangle size={48} className="mx-auto text-rose-500 mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Restricted</h2>
          <p className="text-slate-500 dark:text-zinc-400">
            You must be 18 or older to view this content. Please come back when you meet the age requirement.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm px-6">
      <div className="text-center max-w-md animate-fade-in bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-2xl">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-brand mb-6">
          <ShieldCheck size={40} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Age Verification</h1>
        <p className="text-slate-500 dark:text-zinc-400 mb-8">
          This content is intended for mature audiences. Please confirm you are at least 18 years old to continue.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onConfirm}
            className="px-8 py-3 rounded-xl bg-gradient-brand text-white font-semibold hover:opacity-90 transition-opacity"
          >
            I am 18 or older
          </button>
          <button
            onClick={() => setDeclined(true)}
            className="px-8 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 font-semibold hover:bg-slate-50 dark:bg-zinc-950 dark:hover:bg-zinc-700 transition-colors"
          >
            I am under 18
          </button>
        </div>
      </div>
    </div>
  );
}
