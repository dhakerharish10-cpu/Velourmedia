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
            <span className="text-lg font-bold text-white">Velour Media</span>
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
          <p className="text-sm text-slate-400 dark:text-zinc-500 mt-1">Last updated: November 2, 2026</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl glass border border-slate-200 dark:border-zinc-700/50 p-6 sm:p-8 shadow-2xl">
          <div className="space-y-6 text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">1. Data Collection</h2>
              <p>
                Velour Media collects only the technical information required to deliver our digital creator storefront and media asset delivery services.
                When creators register an account, we store display credentials, verified contact details, and platform preferences.
                When a customer purchases a digital media pack, we record transaction identifiers, product references, and license access tokens. As a guest purchaser,
                no sensitive personal profile is created — an encrypted identifier is stored locally in your browser session to fulfill immediate asset delivery.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">2. Cookie Policy</h2>
              <p>
                Velour Media utilizes minimal session cookies and local browser storage essential for platform operation. Authentication sessions
                are handled securely by our infrastructure. We do not deploy third-party advertising cookies or cross-site tracking scripts. No user data
                is sold or distributed to third-party data brokers.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">3. Local Storage for Asset Access</h2>
              <p>
                When completing a purchase without creating a registered account, Velour Media generates a unique session token stored in your
                browser's local storage. This allows our delivery service to confirm authorization and provide direct access to your purchased
                digital media files. Clearing your browser cache or site data will erase this session identifier.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">4. Payment Processing & Security</h2>
              <p>
                All financial transactions are handled by certified, PCI-DSS compliant third-party payment processing partners.
                Velour Media does not collect, process, or store credit card numbers, CVVs, or sensitive banking details on its servers.
                External processors supply secure transaction references solely used for order reconciliation and customer support verification.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">5. Communication Standards</h2>
              <p>
                We do not sell or rent customer email addresses. Any communications sent are strictly transactional, such as order receipts,
                digital file access confirmations, and security notices regarding your purchases or creator account.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">6. Data Retention</h2>
              <p>
                Creator account information is retained while the storefront is active. Transaction logs and order fulfillment receipts
                are maintained for accounting, tax compliance, and license validation purposes.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">7. Contact</h2>
              <p>
                For privacy questions, access inquiries, or account data deletion requests, contact our privacy team at{' '}
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
