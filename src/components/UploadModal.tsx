import { useStore } from '../lib/store';
import { UploadContent } from './UploadContent';
import { X, Upload } from 'lucide-react';

export function UploadModal() {
  const { isUploadOpen, closeUpload } = useStore();

  if (!isUploadOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center px-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeUpload} />
      <div className="relative w-full max-w-lg rounded-2xl glass border border-slate-200 dark:border-zinc-700 p-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto scrollbar-hide">
        <button
          onClick={closeUpload}
          className="absolute top-4 right-4 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
          <Upload size={20} className="text-indigo-400" />
          Create New Post
        </h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-5">Upload media and set a price for pay-per-view access.</p>

        <UploadContent onDone={closeUpload} />
      </div>
    </div>
  );
}
