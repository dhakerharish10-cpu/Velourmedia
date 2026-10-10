import { useState } from 'react';
import { useStore } from '../lib/store';
import {
  X, Mail, Lock, User, Loader2, Eye, EyeOff, ChevronDown, Phone, Gift, ArrowRight,
} from 'lucide-react';

interface AuthModalProps {
  onNavigate?: (path: string) => void;
}

export function AuthModal({ onNavigate }: AuthModalProps = {}) {
  const { isAuthModalOpen, authMode, closeAuth, setAuthMode, signIn, signUp, addToast, isAdminEmail } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showMobile, setShowMobile] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const isSignUp = authMode === 'signup';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (isSignUp) {
      const username = fullName.trim().toLowerCase().replace(/\s+/g, '') || email.split('@')[0];
      const { error } = await signUp(email, password, username);
      if (error) {
        setError(error);
        setSubmitting(false);
        return;
      }
      addToast('Account created! Welcome to Velour.', 'success');
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
        setSubmitting(false);
        return;
      }
      addToast('Signed in successfully.', 'success');
    }

    setSubmitting(false);
    closeAuth();
    setEmail('');
    setPassword('');
    setFullName('');
    setMobileNumber('');
    setReferralCode('');
    setShowMobile(false);
    setShowReferral(false);
    if (onNavigate) onNavigate(isAdminEmail ? 'admin' : 'dashboard');
  };

  const switchMode = () => {
    setError(null);
    setAuthMode(isSignUp ? 'signin' : 'signup');
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center px-4 py-8 overflow-y-auto animate-fade-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeAuth} />
      <div className="relative w-full max-w-md my-auto rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 p-6 sm:p-8 shadow-2xl animate-scale-in">
        <button
          onClick={closeAuth}
          className="absolute top-4 right-4 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center mb-3">
            <Lock size={22} className="text-indigo-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            {isSignUp
              ? 'Get instant access to exclusive content'
              : 'Sign in to access your dashboard'}
          </p>
        </div>

        {/* Google OAuth button */}
        <button
          type="button"
          onClick={() => addToast('Google sign-in is not configured yet.', 'info')}
          className="w-full rounded-xl bg-white text-slate-900 font-semibold py-2.5 hover:bg-slate-100 dark:hover:bg-zinc-100 transition-colors flex items-center justify-center gap-2.5 mb-4"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-slate-200 dark:bg-zinc-700/50" />
          <span className="text-xs text-slate-400 dark:text-zinc-500">or</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-zinc-700/50" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="John Doe"
                  className="w-full rounded-xl bg-slate-50 dark:bg-zinc-950 dark:bg-zinc-900/80 border border-slate-300 dark:border-zinc-700/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-xl bg-slate-50 dark:bg-zinc-950 dark:bg-zinc-900/80 border border-slate-300 dark:border-zinc-700/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={isSignUp ? 8 : 6}
                placeholder={isSignUp ? 'Min 8 characters' : '••••••••'}
                className="w-full rounded-xl bg-slate-50 dark:bg-zinc-950 dark:bg-zinc-900/80 border border-slate-300 dark:border-zinc-700/50 pl-10 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Optional dropdown toggles (signup only) */}
          {isSignUp && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowMobile(!showMobile)}
                className="w-full flex items-center justify-between text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors py-1"
              >
                <span className="flex items-center gap-2">
                  <Phone size={14} />
                  Add mobile number (optional)
                </span>
                <ChevronDown size={16} className={`transition-transform ${showMobile ? 'rotate-180' : ''}`} />
              </button>
              {showMobile && (
                <div className="relative animate-fade-in">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full rounded-xl bg-slate-50 dark:bg-zinc-950 dark:bg-zinc-900/80 border border-slate-300 dark:border-zinc-700/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowReferral(!showReferral)}
                className="w-full flex items-center justify-between text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors py-1"
              >
                <span className="flex items-center gap-2">
                  <Gift size={14} />
                  Have a referral code?
                </span>
                <ChevronDown size={16} className={`transition-transform ${showReferral ? 'rotate-180' : ''}`} />
              </button>
              {showReferral && (
                <div className="relative animate-fade-in">
                  <Gift size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    placeholder="Enter referral code"
                    className="w-full rounded-xl bg-slate-50 dark:bg-zinc-950 dark:bg-zinc-900/80 border border-slate-300 dark:border-zinc-700/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                  />
                </div>
              )}
            </div>
          )}

          {/* Forgot password (login only) */}
          {!isSignUp && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => addToast('Password reset is not configured yet.', 'info')}
                className="text-xs text-indigo-500 hover:text-indigo-400 transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Green primary button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-indigo-600 text-white font-semibold py-3 hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            {submitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                {isSignUp ? 'Create Account' : 'Log In'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        {isSignUp && (
          <p className="text-center text-xs text-slate-400 dark:text-zinc-500 mt-4 leading-relaxed">
            By signing up, you agree to our{' '}
            <button type="button" onClick={() => { closeAuth(); window.location.hash = 'legal'; }} className="text-slate-500 dark:text-zinc-400 hover:text-indigo-500 dark:hover:text-indigo-400 cursor-pointer underline underline-offset-2">Terms of Service</button>,{' '}
            <button type="button" onClick={() => { closeAuth(); window.location.hash = 'legal'; }} className="text-slate-500 dark:text-zinc-400 hover:text-indigo-500 dark:hover:text-indigo-400 cursor-pointer underline underline-offset-2">Creator Terms</button>,{' '}
            <button type="button" onClick={() => { closeAuth(); window.location.hash = 'legal'; }} className="text-slate-500 dark:text-zinc-400 hover:text-indigo-500 dark:hover:text-indigo-400 cursor-pointer underline underline-offset-2">Privacy Policy</button>
            , and confirm you are at least 18 years old.
          </p>
        )}

        {/* Switch mode link */}
        <p className="text-center text-sm text-slate-500 dark:text-zinc-400 mt-5">
          {isSignUp ? "Already have an account? " : "Don't have an account? "}
          <button
            type="button"
            onClick={switchMode}
            className="text-indigo-500 font-medium hover:text-indigo-400 transition-colors"
          >
            {isSignUp ? 'Log In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}
