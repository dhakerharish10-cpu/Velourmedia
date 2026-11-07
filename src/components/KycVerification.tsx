import { useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Upload, Loader2, Clock, XCircle, FileText, X, RefreshCw, Lock } from 'lucide-react';

export type KycGateStatus = 'unverified' | 'pending' | 'rejected';

interface KycVerificationProps {
  profileId: string;
  status: KycGateStatus;
  rejectionReason?: string | null;
  onSubmitted: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
}

const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10 MB (also enforced by the private bucket)
const ALLOWED_DOC_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export function KycVerification({
  profileId, status, rejectionReason, onSubmitted, onRefresh, refreshing,
}: KycVerificationProps) {
  const { user, addToast } = useStore();
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickFile = (list: FileList | null) => {
    const picked = list?.[0];
    if (!picked) return;
    if (!ALLOWED_DOC_TYPES.includes(picked.type)) {
      addToast('Unsupported file type. Upload a JPG, PNG, WebP or PDF of your government ID.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (picked.size > MAX_DOC_SIZE) {
      addToast('That file is too large. The maximum size is 10 MB.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFile(picked);
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting) return;

    const name = fullName.trim();
    const countryValue = country.trim();
    if (name.length < 2) { addToast('Enter your full legal name.', 'error'); return; }
    if (countryValue.length < 2) { addToast('Enter your country.', 'error'); return; }
    if (!file) { addToast('Upload a photo or scan of your government ID.', 'error'); return; }
    if (!confirmed) { addToast('Please confirm that the details are accurate.', 'error'); return; }

    setSubmitting(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `${user.id}/${Date.now()}-id.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });
      if (uploadError) throw new Error(`Could not upload your document: ${uploadError.message}`);

      const { error: submitError } = await supabase.rpc('submit_creator_kyc', {
        p_profile_id: profileId,
        p_full_name: name,
        p_country: countryValue,
        p_document_path: path,
      });
      if (submitError) throw new Error(submitError.message);

      addToast('Verification submitted. We will review it shortly.', 'success');
      onSubmitted();
    } catch (err) {
      console.error('KYC submission failed:', err);
      const message = err instanceof Error ? err.message : 'Could not submit your verification. Please try again.';
      addToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Under review ----
  if (status === 'pending') {
    return (
      <div className="rounded-2xl glass border border-slate-200 dark:border-zinc-700 p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
          <Clock size={26} className="text-amber-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Your verification is under review</h3>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2 max-w-sm mx-auto">
          Thanks for submitting your details. Uploading unlocks automatically as soon as your identity is approved.
          You only need to do this once.
        </p>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-sm font-medium hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Check status
        </button>
      </div>
    );
  }

  // ---- Not verified yet / rejected: show the form ----
  return (
    <div className="rounded-2xl glass border border-slate-200 dark:border-zinc-700 p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0">
          <ShieldCheck size={22} className="text-indigo-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Verify your identity to start posting</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400">One-time check. Once approved, you can upload any time.</p>
        </div>
      </div>

      {status === 'rejected' && (
        <div className="mb-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-3 flex items-start gap-2.5">
          <XCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">Your last submission was not approved</p>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
              {rejectionReason ? rejectionReason : 'Please check your details and upload a clear, valid ID.'} You can submit again below.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">Full legal name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="As shown on your government ID"
            autoComplete="name"
            maxLength={120}
            className="w-full rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-300 dark:border-zinc-700/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">Country</label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Country that issued your ID"
            autoComplete="country-name"
            maxLength={80}
            className="w-full rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-300 dark:border-zinc-700/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">Government ID document</label>
          {file ? (
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-300 dark:border-zinc-700/50 px-4 py-3">
              <FileText size={18} className="text-indigo-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-900 dark:text-white truncate">{file.name}</p>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <button
                type="button"
                onClick={clearFile}
                className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                aria-label="Remove document"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative cursor-pointer rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-slate-400 dark:hover:border-zinc-600 transition-all p-5 text-center"
            >
              <Upload size={22} className="mx-auto text-slate-400 dark:text-zinc-400 mb-1.5" />
              <p className="text-sm font-medium text-slate-700 dark:text-zinc-200">Tap to upload your ID</p>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">Passport, national ID or driver's licence. JPG, PNG, WebP or PDF, up to 10 MB.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => pickFile(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Upload government ID"
              />
            </div>
          )}
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 accent-indigo-500"
          />
          <span className="text-xs text-slate-500 dark:text-zinc-400">
            I confirm these details are accurate and the document is my own.
          </span>
        </label>

        <div className="rounded-xl bg-slate-100 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 px-3.5 py-3 flex items-start gap-2.5">
          <Lock size={14} className="text-slate-400 dark:text-zinc-500 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-zinc-400">
            Your document is stored privately. Only you and our review team can open it, and it is never shown on your profile.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-gradient-brand text-white font-semibold py-2.5 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <ShieldCheck size={16} />
              Submit for verification
            </>
          )}
        </button>
      </form>
    </div>
  );
}
