import { ArrowLeft, FileText } from 'lucide-react';

interface TermsPageProps {
  onNavigate: (path: string) => void;
}

export function TermsPage({ onNavigate }: TermsPageProps) {
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
            <FileText size={22} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Terms of Service</h1>
          <p className="text-sm text-slate-400 dark:text-zinc-500 mt-1">Last updated: November 2, 2026</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl glass border border-slate-200 dark:border-zinc-700/50 p-6 sm:p-8 shadow-2xl">
          <div className="space-y-6 text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Velour Media (velourmedia.site), you agree to be bound by these Terms of Service. If you do not
                agree with any part of these terms, you must not use our platform. These terms apply to registered creators and digital asset purchasers.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">2. Eligibility & Age Requirement</h2>
              <p>
                You must be at least 18 years of age (or the age of legal majority in your jurisdiction) to use Velour Media. By creating an account or completing a digital purchase, you confirm that you have the legal capacity to enter into binding agreements. All users and creators must comply with applicable local and international commerce laws.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">3. Acceptable Content & Community Standards</h2>
              <p>
                Velour Media is dedicated to legitimate creative media asset distribution. Sexually explicit material, adult entertainment content, hate speech, harassment, copyright infringement, and unlawful media are strictly prohibited on the platform. Any creator accounts found violating these standards are subject to immediate termination and forfeiture of access.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">4. Digital Product Fulfillment & Access</h2>
              <p>
                Velour Media provides creator storefront tools for digital goods (photography packs, presets, audio stems, digital documents, and video productions). All digital purchases are fulfilled electronically and instantly upon payment confirmation. When making a guest purchase, an encrypted session token is stored in local storage to identify your access.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">5. Refund Policy for Electronic Goods</h2>
              <p>
                Due to the immediate access nature of downloadable and viewable digital media assets, all sales are typically final once accessed, except where mandatory consumer law requires otherwise. We issue full refunds for confirmed technical delivery failures, duplicate billing, or media files that are corrupted or materially defective. Contact support@velourmedia.site within 7 days of purchase for billing resolution.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">6. Intellectual Property & Licensing</h2>
              <p>
                Creators retain all proprietary ownership and copyright to their uploaded media. When a customer purchases access to a media pack, they receive a personal, revocable, non-exclusive license to view or download the assets for private, non-commercial use. Redistribution, resale, or unauthorized sublicensing is strictly prohibited.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">7. Platform Fees & Payouts</h2>
              <p>
                Velour Media retains an agreed platform service fee per successful transaction. Net proceeds are credited to the creator wallet balance. Payout disbursements require standard merchant identity verification and compliance with payout provider terms.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">8. Contact Information</h2>
              <p>
                For legal inquiries, dispute resolutions, or technical billing assistance, contact our administrative support team at{' '}
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
