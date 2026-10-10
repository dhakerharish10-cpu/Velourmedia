import { useStore } from '../lib/store';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useStore();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 rounded-xl glass border border-zinc-700/50 px-4 py-3 shadow-lg animate-slide-up"
        >
          {toast.type === 'success' && <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 shrink-0" />}
          {toast.type === 'error' && <XCircle size={18} className="text-rose-400 mt-0.5 shrink-0" />}
          {toast.type === 'info' && <Info size={18} className="text-indigo-400 mt-0.5 shrink-0" />}
          <p className="text-sm text-zinc-200 flex-1">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
