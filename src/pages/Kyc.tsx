import { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { ShieldCheck, Upload, Check, FileText, AlertCircle, Loader2, Building2, Landmark, User, Hash, CreditCard, Wallet, Bitcoin, Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type KycStatus = 'unverified' | 'pending' | 'verified';
type PayoutTab = 'bank' | 'upi' | 'crypto';

function maskAccountNumber(num: string): string {
  if (!num || num.length <= 4) return num;
  return `••••••••${num.slice(-4)}`;
}

function maskWallet(addr: string): string {
  if (!addr || addr.length <= 6) return addr;
  return `${addr.slice(0, 4)}••••${addr.slice(-4)}`;
}

export function KycPage() {
  const { addToast, bankDetails, saveBankDetails, profile, updateProfile } = useStore();
  const [status, setStatus] = useState<KycStatus>('unverified');
  const [docType, setDocType] = useState('passport');
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [bankName, setBankName] = useState('');
  const [holderName, setHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccount, setConfirmAccount] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [savingBank, setSavingBank] = useState(false);
  const [bankEditMode, setBankEditMode] = useState(false);

  const [payoutTab, setPayoutTab] = useState<PayoutTab>('bank');
  const [upiId, setUpiId] = useState('');
  const [cryptoWallet, setCryptoWallet] = useState('');
  const [cryptoNetwork, setCryptoNetwork] = useState('TRC20');
  const [savingPayout, setSavingPayout] = useState(false);

  const hasBankDetails = !!bankDetails && !!bankDetails.bank_account_number;

  useEffect(() => {
    if (bankDetails) {
      setBankName(bankDetails.bank_name || '');
      setHolderName(bankDetails.account_holder_name || '');
      setAccountNumber(bankDetails.bank_account_number || '');
      setConfirmAccount(bankDetails.bank_account_number || '');
      setIfscCode(bankDetails.ifsc_code || '');
    }
  }, [bankDetails]);

  useEffect(() => {
    if (profile) {
      setPayoutTab((profile.preferred_payout_method as PayoutTab) || 'bank');
      setUpiId(profile.upi_id || '');
      setCryptoWallet(profile.crypto_wallet_address || '');
      setCryptoNetwork(profile.crypto_network || 'TRC20');
    }
  }, [profile]);

  const handleSubmit = async () => {
    if (!frontFile) {
      addToast('Please upload the front of your document.', 'error');
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitting(false);
    setStatus('pending');
    addToast('KYC documents submitted. Verification typically takes 24-48 hours.', 'success');
  };

  const handleSaveBank = async () => {
    if (!bankName.trim()) {
      addToast('Please enter your bank name.', 'error');
      return;
    }
    if (!holderName.trim()) {
      addToast('Please enter the account holder name.', 'error');
      return;
    }
    if (!accountNumber.trim()) {
      addToast('Please enter your account number.', 'error');
      return;
    }
    if (accountNumber !== confirmAccount) {
      addToast('Account numbers do not match.', 'error');
      return;
    }
    if (!ifscCode.trim()) {
      addToast('Please enter your IFSC / Routing / SWIFT-BIC code.', 'error');
      return;
    }

    setSavingBank(true);
    const { error } = await saveBankDetails({
      bank_name: bankName.trim(),
      account_holder_name: holderName.trim(),
      bank_account_number: accountNumber.trim(),
      ifsc_code: ifscCode.trim(),
      pan_card_number: bankDetails?.pan_card_number || '',
    });
    setSavingBank(false);
    if (error) {
      addToast(error, 'error');
      return;
    }
    setBankEditMode(false);
    addToast('Bank account details saved successfully.', 'success');
  };

  const handleSavePayoutMethod = async () => {
    setSavingPayout(true);
    const updates: Record<string, unknown> = { preferred_payout_method: payoutTab };
    if (payoutTab === 'upi') {
      if (!upiId.trim()) {
        addToast('Please enter your UPI ID.', 'error');
        setSavingPayout(false);
        return;
      }
      updates.upi_id = upiId.trim();
    }
    if (payoutTab === 'crypto') {
      if (!cryptoWallet.trim()) {
        addToast('Please enter your USDT wallet address.', 'error');
        setSavingPayout(false);
        return;
      }
      updates.crypto_wallet_address = cryptoWallet.trim();
      updates.crypto_network = cryptoNetwork;
    }
    const { error } = await updateProfile(updates as Parameters<typeof updateProfile>[0]);
    setSavingPayout(false);
    if (error) {
      addToast(error, 'error');
      return;
    }
    addToast('Payout method saved successfully.', 'success');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">KYC Verification</h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Verify your identity to unlock payouts and higher withdrawal limits.</p>
      </div>

      {/* Status banner */}
      <div
        className={`rounded-2xl border p-5 flex items-center gap-4 ${
          status === 'verified'
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : status === 'pending'
            ? 'border-amber-500/30 bg-amber-500/5'
            : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
        }`}
      >
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
            status === 'verified' ? 'bg-emerald-500/20' : status === 'pending' ? 'bg-amber-500/20' : 'bg-slate-100 dark:bg-zinc-800'
          }`}
        >
          {status === 'verified' ? (
            <Check size={24} className="text-emerald-600 dark:text-emerald-400" />
          ) : status === 'pending' ? (
            <Loader2 size={24} className="text-amber-500 animate-spin" />
          ) : (
            <ShieldCheck size={24} className="text-indigo-500" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {status === 'verified' ? 'Identity Verified' : status === 'pending' ? 'Verification In Review' : 'Not Verified'}
          </p>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
            {status === 'verified'
              ? 'Your identity has been confirmed. All features are unlocked.'
              : status === 'pending'
              ? 'We are reviewing your documents. This usually takes 24-48 hours.'
              : 'Submit your documents below to start the verification process.'}
          </p>
        </div>
      </div>

      {/* Payout Methods */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Wallet size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Payout Method</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-zinc-400">Choose how you'd like to receive your earnings. You can change this at any time.</p>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'bank' as const, label: 'Bank Transfer', icon: Landmark },
            { id: 'upi' as const, label: 'UPI ID', icon: CreditCard },
            { id: 'crypto' as const, label: 'Crypto (USDT)', icon: Bitcoin },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = payoutTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setPayoutTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30'
                    : 'bg-slate-50 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {payoutTab === 'bank' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-zinc-400">Enter your bank account details below for direct bank transfer payouts.</p>

            {hasBankDetails && !bankEditMode ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-sm text-slate-500 dark:text-zinc-400 flex items-center gap-2"><Building2 size={14} /> Bank Name</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{bankDetails!.bank_name || '—'}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-sm text-slate-500 dark:text-zinc-400 flex items-center gap-2"><User size={14} /> Account Holder</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{bankDetails!.account_holder_name || '—'}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-sm text-slate-500 dark:text-zinc-400 flex items-center gap-2"><CreditCard size={14} /> Account Number</span>
                  <span className="text-sm font-mono font-medium text-slate-900 dark:text-white">{maskAccountNumber(bankDetails!.bank_account_number)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-500 dark:text-zinc-400 flex items-center gap-2"><Hash size={14} /> IFSC / Routing / SWIFT</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{bankDetails!.ifsc_code || '—'}</span>
                </div>
                <button
                  onClick={() => setBankEditMode(true)}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium"
                >
                  Edit details
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <FormField label="Bank Name" icon={Building2} placeholder="e.g. HDFC Bank, Chase, ICICI Bank" value={bankName} onChange={setBankName} />
                <FormField label="Account Holder Name" icon={User} placeholder="Must match legal identity name" value={holderName} onChange={setHolderName} />
                <FormField label="Account Number / IBAN" icon={CreditCard} placeholder="Enter your account number" value={accountNumber} onChange={setAccountNumber} />
                <FormField label="Re-enter Account Number" icon={CreditCard} placeholder="Confirm your account number" value={confirmAccount} onChange={setConfirmAccount} />
                <FormField label="IFSC Code / Routing Number / SWIFT-BIC" icon={Hash} placeholder="e.g. HDFC0001234" value={ifscCode} onChange={setIfscCode} />

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleSaveBank}
                    disabled={savingBank}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {savingBank ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        Save Bank Details
                      </>
                    )}
                  </button>
                  {hasBankDetails && (
                    <button
                      onClick={() => {
                        setBankEditMode(false);
                        setBankName(bankDetails!.bank_name || '');
                        setHolderName(bankDetails!.account_holder_name || '');
                        setAccountNumber(bankDetails!.bank_account_number || '');
                        setConfirmAccount(bankDetails!.bank_account_number || '');
                        setIfscCode(bankDetails!.ifsc_code || '');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-medium text-sm hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {payoutTab === 'upi' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-zinc-400">Enter your UPI ID for instant Indian bank transfers.</p>
            <FormField label="UPI ID" icon={CreditCard} placeholder="e.g. yourname@upi" value={upiId} onChange={setUpiId} />
            {profile?.upi_id && (
              <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-zinc-800">
                <span className="text-sm text-slate-500 dark:text-zinc-400">Saved UPI ID</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">{profile.upi_id}</span>
              </div>
            )}
            <button
              onClick={handleSavePayoutMethod}
              disabled={savingPayout}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingPayout ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Save UPI Details
                </>
              )}
            </button>
          </div>
        )}

        {payoutTab === 'crypto' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-zinc-400">Enter your USDT wallet address for crypto payouts. Select the network carefully — sending to the wrong network will result in permanent loss of funds.</p>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">Select Network</label>
              <div className="flex gap-2">
                {['TRC20', 'BEP20', 'ERC20'].map((net) => (
                  <button
                    key={net}
                    onClick={() => setCryptoNetwork(net)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      cryptoNetwork === net
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 hover:border-indigo-500/50'
                    }`}
                  >
                    {net}
                  </button>
                ))}
              </div>
            </div>
            <FormField label="USDT Wallet Address" icon={Bitcoin} placeholder="e.g. TXxxxxx... or 0x..." value={cryptoWallet} onChange={setCryptoWallet} />
            {profile?.crypto_wallet_address && (
              <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-zinc-800">
                <span className="text-sm text-slate-500 dark:text-zinc-400">Saved Wallet</span>
                <span className="text-sm font-mono font-medium text-slate-900 dark:text-white">{maskWallet(profile.crypto_wallet_address)}</span>
              </div>
            )}
            <button
              onClick={handleSavePayoutMethod}
              disabled={savingPayout}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingPayout ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Save Wallet Details
                </>
              )}
            </button>
          </div>
        )}

        {/* Min withdrawal notice */}
        <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 px-4 py-3">
          <Info size={14} className="text-slate-400 dark:text-zinc-500 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Minimum withdrawal amount: <span className="font-semibold text-slate-700 dark:text-zinc-300">$20.00 USD</span>. Payouts are processed within 1-3 business days.
          </p>
        </div>
      </div>

      {status === 'unverified' && (
        <>
          {/* Document type */}
          <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5 space-y-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Document Type</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'passport', label: 'Passport' },
                { id: 'license', label: "Driver's License" },
                { id: 'national', label: 'National ID' },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDocType(d.id)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    docType === d.id
                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30'
                      : 'bg-white dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:border-slate-200 dark:border-zinc-700'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Upload front */}
          <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5 space-y-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Upload Documents</h3>
            <FileUpload label="Front of document" file={frontFile} onChange={setFrontFile} />
            <FileUpload label="Back of document (optional)" file={backFile} onChange={setBackFile} />

            <div className="flex items-start gap-2 text-xs text-slate-400 dark:text-zinc-500 mt-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>
                Accepted formats: JPG, PNG, PDF. Max size 10MB. Ensure all corners are visible and text is legible.
              </span>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-brand text-slate-900 dark:text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Submit for Verification
                </>
              )}
            </button>
          </div>
        </>
      )}

      {status === 'pending' && (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Submitted Documents</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-zinc-800/50">
              <span className="text-slate-500 dark:text-zinc-400">Document Type</span>
              <span className="text-slate-700 dark:text-zinc-300 capitalize">{docType}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-zinc-800/50">
              <span className="text-slate-500 dark:text-zinc-400">Status</span>
              <span className="text-amber-400 font-medium">In Review</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-500 dark:text-zinc-400">Submitted</span>
              <span className="text-slate-700 dark:text-zinc-300">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, icon: Icon, placeholder, value, onChange }: { label: string; icon: LucideIcon; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">{label}</label>
      <div className="relative">
        <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
        />
      </div>
    </div>
  );
}

function FileUpload({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">{label}</label>
      <label className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 px-4 py-3 cursor-pointer hover:border-indigo-500/50 transition-colors">
        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
          {file ? <Check size={18} className="text-emerald-600 dark:text-emerald-400" /> : <Upload size={18} className="text-slate-400 dark:text-zinc-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-900 dark:text-white truncate">{file ? file.name : 'Click to upload'}</p>
          <p className="text-xs text-slate-400 dark:text-zinc-500">{file ? `${(file.size / 1024).toFixed(0)} KB` : 'JPG, PNG, or PDF'}</p>
        </div>
        <input
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
      </label>
    </div>
  );
}
