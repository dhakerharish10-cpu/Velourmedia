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
            <FileText size={22} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Terms of Service</h1>
          <p className="text-sm text-slate-400 dark:text-zinc-500 mt-1">Last updated: August 29, 2026</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl glass border border-slate-200 dark:border-zinc-700/50 p-6 sm:p-8 shadow-2xl">
          <div className="space-y-6 text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Velour, you agree to be bound by these Terms of Service. If you do not
                agree with any part of these terms, you must not use our platform. These terms apply to both
                registered users and guest purchasers.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">2. Age Requirement (18+)</h2>
              <p>
                You must be at least 18 years of age to use Velour. By creating an account or making a guest
                purchase, you confirm that you are at least 18 years old and legally able to enter into
                binding agreements. Content on this platform may include adult material. Minors are strictly
                prohibited from accessing the platform.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">3. Guest Digital Content Purchases</h2>
              <p>
                Velour allows users to purchase premium digital content without creating an account (guest
                checkout). When you make a guest purchase, a random anonymous identifier is stored in your
                browser's local storage to associate the purchase with your device. You are responsible for
                maintaining access to the same browser to retain access to your purchased content. Velour is
                not liable for loss of access resulting from clearing browser data, changing devices, or
                other actions that remove the local storage identifier. We recommend creating an account for
                permanent access to your purchases.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">4. Instant Digital Fulfillment</h2>
              <p>
                All digital content purchases on Velour are fulfilled instantly upon payment confirmation.
                Once your payment is confirmed by our payment provider, access to the purchased content is
                granted immediately. Due to the nature of digital goods, all sales are final and non-refundable
                except where required by applicable law. If you experience a technical issue accessing
                purchased content, please contact support within 7 days of purchase for assistance.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">5. Content Ownership &amp; Licensing</h2>
              <p>
                All content on Velour is owned by the respective creators. When you purchase content, you
                receive a personal, non-transferable license to view the content for your own private use.
                You may not redistribute, resell, share, or otherwise distribute purchased content. Violation
                of these terms may result in termination of access and legal action by the content owner.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">6. Creator Responsibilities</h2>
              <p>
                Creators are solely responsible for the content they upload and must ensure they hold all
                necessary rights and permissions. Creators must not upload content that is illegal, infringes
                on intellectual property, or violates any applicable laws. Velour reserves the right to remove
                content and suspend accounts that violate these terms.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">7. Platform Fees</h2>
              <p>
                Velour charges a platform fee on each transaction, which is deducted from the creator's
                earnings. The current fee percentage is displayed in the creator dashboard. Fees may be
                updated with reasonable notice. Payment processing fees charged by our payment provider may
                also apply and are displayed at checkout.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">8. Limitation of Liability</h2>
              <p>
                Velour is provided "as is" without warranties of any kind. We are not liable for indirect,
                incidental, or consequential damages arising from the use of our platform. Our total
                liability for any claim related to your use of the platform is limited to the amount you
                paid for the specific transaction giving rise to the claim.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">9. Contact</h2>
              <p>
                If you have questions about these Terms of Service, please contact us at{' '}
                <a href="mailto:support@velour.app" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-300 transition-colors">
                  support@velour.app
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
