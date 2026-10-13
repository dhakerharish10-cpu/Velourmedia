import { ArrowLeft, ShieldCheck } from 'lucide-react';

interface PrivacyPolicyPageProps {
  onNavigate: (path: string) => void;
}

export function PrivacyPolicyPage({ onNavigate }: PrivacyPolicyPageProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Top navbar */}
      <header className="sticky top-0 z-40 glass border-b border-slate-200 dark:border-zinc-800/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">Velour</span>
          </div>
          <button
            onClick={() => onNavigate('')}
            className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Home
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={22} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Privacy Policy</h1>
          <p className="text-sm text-slate-400 dark:text-zinc-500 mt-1">Last updated: August 29, 2026</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl glass border border-slate-200 dark:border-zinc-700/50 p-6 sm:p-8 shadow-2xl">
          <div className="space-y-6 text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">1. Data Collection</h2>
              <p>
                Velour collects only the information necessary to provide our premium digital content platform.
                When you create an account, we store your email address, display name, and account credentials.
                When you make a purchase as a logged-in user, we record the transaction details including the
                content purchased, payment amount, and payment provider reference. As a guest purchaser, we
                do not collect any personal information — a random device identifier is stored locally in your
                browser to associate your purchase without linking it to your identity.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">2. Cookie Policy</h2>
              <p>
                Velour uses minimal cookies and local storage to operate the platform. Authentication sessions
                are stored as cookies managed by our backend provider. We do not use third-party tracking
                cookies, advertising cookies, or analytics cookies. No information is shared with advertising
                networks or third-party data brokers.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">3. LocalStorage Use for Guest Access</h2>
              <p>
                When you make a guest purchase without creating an account, Velour generates a random,
                anonymous device identifier and stores it in your browser's local storage. This identifier
                allows us to associate your purchase with your browser session so you can access your
                unlocked content. This identifier is not linked to your name, email, or any personal
                information. Clearing your browser data will remove this identifier and may result in loss
                of access to guest-purchased content.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">4. Payment Data</h2>
              <p>
                All payments are processed securely through Whop, our third-party payment provider.
                Velour does not store your credit card details, cryptocurrency wallet addresses, or any
                sensitive financial information. Payment references and transaction status are stored solely
                to fulfill your purchase and provide customer support.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">5. No-Spam Guarantee</h2>
              <p>
                We will never sell, rent, or share your email address with third parties for marketing
                purposes. You will only receive transactional emails related to your account and purchases,
                such as payment confirmations and account security notices. You can request deletion of
                your account and associated data at any time by contacting our support team.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">6. Data Retention</h2>
              <p>
                Account data is retained for as long as your account is active. Purchase records are retained
                indefinitely to ensure continued access to your purchased content. Guest purchase data is
                retained for a minimum of 90 days to allow access to unlocked content, after which it may be
                anonymized or removed.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">7. Contact</h2>
              <p>
                If you have questions about this Privacy Policy or wish to exercise your data rights, please
                contact us at{' '}
                <a href="mailto:support@velourmedia.site" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-300 transition-colors">
                  support@velourmedia.site
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
