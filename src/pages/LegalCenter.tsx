import { useState, useCallback } from 'react';
import {
  ArrowLeft, ShieldCheck, FileText, Users, CreditCard, Lock, Flag,
  Copy, Printer, Check, Search, Scale, AlertTriangle,
  BookOpen, Headphones, Activity, ShoppingBag, FileWarning,
} from 'lucide-react';

interface LegalCenterProps {
  onNavigate: (path: string) => void;
}

type Category = 'all' | 'accounts' | 'privacy' | 'content';

interface Policy {
  id: string;
  title: string;
  icon: typeof FileText;
  category: 'accounts' | 'privacy' | 'content';
  description: string;
  lastUpdated: string;
  summary: string;
  sections: { heading: string; body: string }[];
}

const POLICIES: Policy[] = [
  {
    id: 'privacy',
    title: 'Privacy Policy',
    icon: Lock,
    category: 'privacy',
    description: 'How we collect, use, and protect your data.',
    lastUpdated: 'October 10, 2026',
    summary: 'We collect only what is needed to run the platform — email, transaction records, and device identifiers for guest access. No third-party tracking cookies. No selling your data. You can request deletion at any time.',
    sections: [
      { heading: 'Data We Collect', body: 'When you create an account, we store your email address, display name, and authentication credentials. When you make a purchase, we record the transaction details including the content purchased, payment amount, and payment provider reference. Guest purchasers are identified by a random anonymous device identifier stored locally in the browser — not linked to your name or email.' },
      { heading: 'Cookies & Local Storage', body: 'We use minimal cookies for authentication sessions managed by our backend provider. We do not use third-party tracking, advertising, or analytics cookies. Guest access relies on a random identifier in local storage; clearing browser data will remove this and may result in loss of access to guest-purchased content.' },
      { heading: 'Payment Data', body: 'All payments are processed securely through our third-party payment provider. Velour Media LLC does not store credit card details, cryptocurrency wallet addresses, or any sensitive financial information. Payment references and transaction status are stored solely to fulfill purchases and provide support.' },
      { heading: 'No-Spam Guarantee', body: 'We will never sell, rent, or share your email address with third parties for marketing purposes. You will only receive transactional emails — payment confirmations, account security notices, and access link delivery.' },
      { heading: 'Data Retention & Deletion', body: 'Account data is retained while your account is active. Purchase records are retained indefinitely to ensure continued access. Guest purchase data is retained for a minimum of 90 days. You can request account deletion at any time by contacting support.' },
      { heading: 'Contact', body: 'Questions about this policy or your data rights? Email support@velourmedia.site.' },
    ],
  },
  {
    id: 'creator-terms',
    title: 'Creator Terms',
    icon: Users,
    category: 'accounts',
    description: 'Terms and obligations for creators who publish content.',
    lastUpdated: 'October 10, 2026',
    summary: 'Creators own 100% of their uploaded media and retain full legal liability. Velour Media LLC is a technology platform host only and assumes no liability for creator content. Creators must be 18+, hold all rights to their content, and fully indemnify the platform.',
    sections: [
      { heading: 'Platform Host Disclaimer', body: 'Velour Media LLC is a technology platform host only. We provide the infrastructure for creators to publish and sell digital content. We do not produce, direct, create, or own any creator-uploaded media. Independent creators retain 100% ownership of all uploaded content and assume full legal responsibility and liability for that content.' },
      { heading: 'Creator Ownership & Liability', body: 'By uploading content, you confirm that you are the sole owner or authorized licensee of all media, that all persons depicted have provided written consent, and that the content complies with all applicable federal, state, and local laws. You agree to fully indemnify, defend, and hold harmless Velour Media LLC, its officers, directors, employees, and agents from any claims, damages, liabilities, costs, or expenses (including reasonable attorneys\' fees) arising from your content or your breach of these terms.' },
      { heading: 'Age Requirement', body: 'You must be at least 18 years of age to create a creator account and upload content. By uploading, you confirm you are at least 18 years old and legally able to enter into binding agreements.' },
      { heading: 'Prohibited Content', body: 'Creators must not upload content that is illegal, infringes on intellectual property, depicts minors, involves non-consensual material, violates any applicable law, or promotes violence or hatred. Velour Media LLC reserves the right to remove any content and suspend any account at its sole discretion.' },
      { heading: 'Model Consent & Records (18 U.S.C. § 2257)', body: 'Creators are solely responsible for maintaining all required records under 18 U.S.C. § 2257 and 28 C.F.R. § 75 for any content depicting actual sexually explicit conduct. Creators must maintain records including the name and date of birth of each performer, and must make these records available upon lawful request. Velour Media LLC does not produce, manage, or possess these records.' },
      { heading: 'Platform Fees', body: 'Velour Media LLC charges a platform fee of 30% on each transaction, deducted from the creator\'s gross earnings. Payment processing fees charged by our payment provider may also apply and are displayed at checkout. Fees may be updated with reasonable notice.' },
      { heading: 'Payouts & Holding Period', body: 'Creator earnings are subject to a holding period before becoming available for payout. Payouts are processed via bank transfer, UPI, or cryptocurrency at the creator\'s chosen method. Minimum payout thresholds may apply.' },
      { heading: 'Account Suspension', body: 'Velour Media LLC may suspend or terminate any creator account that violates these terms, receives valid DMCA takedown notices, or is flagged for illegal content. Suspended accounts forfeit pending earnings as liquidated damages.' },
      { heading: 'Contact', body: 'Questions about Creator Terms? Email support@velourmedia.site.' },
    ],
  },
  {
    id: 'customer-terms',
    title: 'Customer / Buyer Terms',
    icon: CreditCard,
    category: 'accounts',
    description: 'Terms for users who purchase digital content.',
    lastUpdated: 'October 10, 2026',
    summary: 'All digital content sales are final and non-refundable except where required by law. Purchases grant a personal, non-transferable viewing license. Guest purchasers use a device identifier for access — create an account for permanent access.',
    sections: [
      { heading: 'Acceptance of Terms', body: 'By purchasing content on Velour, you agree to these Customer Terms. These terms apply to both registered users and guest purchasers. If you do not agree, you must not use the platform.' },
      { heading: 'Age Requirement (18+)', body: 'You must be at least 18 years of age to purchase content. By making a purchase, you confirm you are at least 18 years old and legally able to enter into binding agreements.' },
      { heading: 'Guest Checkout', body: 'Velour allows purchases without an account. A random anonymous identifier is stored in your browser\'s local storage to associate the purchase with your device. You are responsible for maintaining access to the same browser. Velour is not liable for loss of access from clearing browser data or changing devices. We recommend creating an account for permanent access.' },
      { heading: 'Instant Digital Fulfillment', body: 'All purchases are fulfilled instantly upon payment confirmation. Access is granted immediately. Due to the nature of digital goods, all sales are final and non-refundable except where required by applicable law. If you experience technical issues accessing purchased content, contact support within 7 days.' },
      { heading: 'Content License', body: 'When you purchase content, you receive a personal, non-transferable license to view the content for your own private use. You may not redistribute, resell, share, screenshot, or otherwise distribute purchased content. Violation may result in termination of access and legal action by the content owner.' },
      { heading: 'Content Disclaimer', body: 'All content is created and owned by independent creators. Velour Media LLC is a platform host and does not endorse, verify, or warrant the accuracy, legality, or quality of any creator content. Any disputes about content quality or accuracy should be directed to the creator.' },
      { heading: 'Limitation of Liability', body: 'Velour is provided "as is" without warranties of any kind. Our total liability for any claim related to your use of the platform is limited to the amount you paid for the specific transaction giving rise to the claim.' },
      { heading: 'Contact', body: 'Questions about Customer Terms? Email support@velourmedia.site.' },
    ],
  },
  {
    id: 'dmca',
    title: 'Copyright & DMCA Policy',
    icon: FileWarning,
    category: 'content',
    description: 'How to report copyright infringement (17 U.S.C. § 512(c)(3)).',
    lastUpdated: 'October 10, 2026',
    summary: 'We respond to valid DMCA takedown notices. Copyright holders may submit a notice with the required elements under 17 U.S.C. § 512(c)(3). Repeat infringers will be permanently banned.',
    sections: [
      { heading: 'DMCA Takedown Procedure', body: 'Pursuant to 17 U.S.C. § 512(c)(3), Velour Media LLC will respond to valid DMCA takedown notices. To file a notice, you must provide the following in writing:' },
      { heading: 'Required Notice Elements', body: '1. A physical or electronic signature of the copyright owner or an authorized agent.\n2. Identification of the copyrighted work claimed to have been infringed.\n3. Identification of the material that is claimed to be infringing, including its URL on the Velour platform.\n4. Your contact information — name, address, telephone number, and email.\n5. A statement that you have a good faith belief that the use is not authorized by the copyright owner.\n6. A statement, under penalty of perjury, that the information is accurate and that you are authorized to act on behalf of the copyright owner.' },
      { heading: 'Where to Send', body: 'Email DMCA notices to dmca@velourmedia.site. We will process and respond to valid notices within 72 hours.' },
      { heading: 'Counter-Notification', body: 'If your content was removed and you believe it was removed in error, you may file a counter-notification with the same required elements. Upon receipt of a valid counter-notification, we may restore the content within 10-14 business days unless the copyright owner files a court action.' },
      { heading: 'Repeat Infringer Policy', body: 'Velour Media LLC will permanently terminate the accounts of users who are determined to be repeat copyright infringers, in accordance with 17 U.S.C. § 512(i).' },
      { heading: 'Designated Agent', body: 'DMCA Agent for Velour Media LLC:\nEmail: dmca@velourmedia.site\nAddress: Velour Media LLC, 9465 Wilshire Blvd, Suite 300, Beverly Hills, CA 90212, USA' },
    ],
  },
  {
    id: 'report-abuse',
    title: 'Report Abuse / Complaints',
    icon: Flag,
    category: 'content',
    description: 'Report illegal content, non-consensual media, or abuse.',
    lastUpdated: 'October 10, 2026',
    summary: 'We take reports of illegal content, non-consensual media, and abuse seriously. Reports can be filed anonymously. Content confirmed to violate our policies will be removed and the responsible account suspended.',
    sections: [
      { heading: 'What to Report', body: 'Report content that is: illegal, involves minors, is non-consensual (including revenge porn), infringes copyright, promotes violence, or otherwise violates our policies.' },
      { heading: 'How to Report', body: 'Email abuse@velourmedia.site with the URL of the content and a description of the violation. You may report anonymously. For urgent matters involving minors, contact us immediately — such content will be removed within 24 hours and reported to authorities.' },
      { heading: 'Non-Consensual Content', body: 'Velour Media LLC has zero tolerance for non-consensual intimate imagery. If you are depicted in content without your consent, we will remove it expeditiously. Email abuse@velourmedia.site with proof of identity and the content URL.' },
      { heading: 'Response Timeline', body: 'We review all reports within 72 hours. Content confirmed to violate our policies will be removed and the responsible account may be permanently suspended. You will receive a response to your report email.' },
      { heading: 'False Reports', body: 'Filing false or malicious reports is a violation of our terms and may result in account suspension.' },
    ],
  },
  {
    id: 'model-consent',
    title: 'Model Consent Rules (18 U.S.C. § 2257)',
    icon: Scale,
    category: 'content',
    description: 'Record-keeping requirements for sexually explicit content.',
    lastUpdated: 'October 10, 2026',
    summary: 'Creators producing sexually explicit content must comply with 18 U.S.C. § 2257 record-keeping requirements. Velour Media LLC does not produce content and is not the primary or secondary producer. Creators must maintain and make available all required records.',
    sections: [
      { heading: 'Platform Host Status', body: 'Velour Media LLC is a technology platform that hosts third-party content. We are not a primary producer or secondary producer as defined by 18 U.S.C. § 2257(h)(2)(A)(ii) and 28 C.F.R. § 75.1(c)(2). We do not manage, create, or direct the content uploaded by creators.' },
      { heading: 'Creator Obligations', body: 'Creators who upload sexually explicit content are solely responsible for complying with 18 U.S.C. § 2257 and 28 C.F.R. Part 75. This includes maintaining records of the name and date of birth of each performer, labeled with the content title, for inspection by the Attorney General.' },
      { heading: 'Records Location', body: 'Each creator must maintain a designated records custodian and address where records are available for inspection. The creator must provide this information upon request by Velour Media LLC or lawful authorities.' },
      { heading: 'Minimum Age Verification', body: 'All persons depicted in any content on the platform must be at least 18 years of age. Creators must verify and document the age of all performers before uploading. Content depicting anyone under 18 will be removed immediately and the account permanently banned, with reports filed to the National Center for Missing & Exploited Children (NCMEC).' },
      { heading: 'Exemption Statement', body: 'Pursuant to 28 C.F.R. § 75.7, Velour Media LLC is exempt from the record-keeping and labeling requirements as a platform host that does not produce content. All record-keeping obligations rest with the individual creators who produce and upload content.' },
      { heading: 'Contact', body: 'Questions about 2257 compliance? Email legal@velourmedia.site.' },
    ],
  },
];

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'all', label: 'All policies' },
  { value: 'accounts', label: 'Accounts & payments' },
  { value: 'privacy', label: 'Privacy' },
  { value: 'content', label: 'Content & safety' },
];

export function LegalCenter({ onNavigate }: LegalCenterProps) {
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePolicy, setActivePolicy] = useState<Policy | null>(null);
  const [copied, setCopied] = useState(false);

  const filteredPolicies = POLICIES.filter((p) => {
    if (activeCategory !== 'all' && p.category !== activeCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.summary.toLowerCase().includes(q);
    }
    return true;
  });

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (activePolicy) {
    const Icon = activePolicy.icon;
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950">
        <header className="sticky top-0 z-40 glass border-b border-slate-200 dark:border-zinc-800/50 print:hidden">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <button
              onClick={() => setActivePolicy(null)}
              className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              Legal Center
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                <Printer size={14} />
                Print
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
              <Icon size={26} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{activePolicy.title}</h1>
            <p className="text-sm text-slate-400 dark:text-zinc-500 mt-2">Last updated: {activePolicy.lastUpdated}</p>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-2">At a glance</h3>
            <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">{activePolicy.summary}</p>
          </div>

          <div className="rounded-2xl glass border border-slate-200 dark:border-zinc-700/50 p-6 sm:p-8 shadow-2xl">
            <div className="space-y-6 text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
              {activePolicy.sections.map((section, i) => (
                <section key={i}>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">{section.heading}</h2>
                  <p className="whitespace-pre-line">{section.body}</p>
                </section>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-8 justify-center">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors px-4 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-900"
            >
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              {copied ? 'Link copied' : 'Copy page link'}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors px-4 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-900"
            >
              <Printer size={16} />
              Print policy
            </button>
          </div>
        </div>

        <LegalFooter onNavigate={onNavigate} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <header className="sticky top-0 z-40 glass border-b border-slate-200 dark:border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => onNavigate('')}
            className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Home
          </button>
          <span className="text-lg font-bold text-slate-900 dark:text-white">Velour</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
            <ShieldCheck size={14} />
            Legal Center
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Policies & Legal</h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-zinc-400 mt-3 max-w-xl mx-auto">
            All policies, terms, and legal resources for Velour Media LLC in one place.
          </p>
        </div>

        {/* Core Disclaimer */}
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 p-5 mb-8">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">Platform Host Disclaimer</h3>
              <p className="text-xs text-amber-800 dark:text-amber-300/80 leading-relaxed">
                Velour Media LLC is a technology platform host only. Independent creators own 100% of uploaded media and retain
                full legal liability for their content. Velour Media LLC assumes no liability or responsibility for creator content.
                Creators agree to fully indemnify the platform against any claims arising from their uploaded material.
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search policies..."
            className="w-full rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 pl-11 pr-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
          />
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeCategory === cat.value
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-100 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700/50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Policy grid */}
        <div className="grid sm:grid-cols-2 gap-4">
          {filteredPolicies.map((policy) => {
            const Icon = policy.icon;
            return (
              <button
                key={policy.id}
                onClick={() => {
                  setActivePolicy(policy);
                  window.scrollTo(0, 0);
                }}
                className="text-left rounded-2xl border border-slate-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900 p-5 hover:border-indigo-400 dark:hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/15 transition-colors">
                    <Icon size={20} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{policy.title}</h3>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">{policy.description}</p>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-zinc-800/30 px-3 py-2">
                  <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed line-clamp-3">{policy.summary}</p>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-3 flex items-center gap-1.5">
                  <FileText size={11} />
                  Updated {policy.lastUpdated}
                </p>
              </button>
            );
          })}
        </div>

        {filteredPolicies.length === 0 && (
          <div className="text-center py-16">
            <Search size={32} className="text-slate-300 dark:text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400 dark:text-zinc-500">No policies match your search.</p>
          </div>
        )}
      </div>

      <LegalFooter onNavigate={onNavigate} />
    </div>
  );
}

function LegalFooter({ onNavigate }: { onNavigate: (path: string) => void }) {
  const footerLinks = [
    { label: 'Creator guides', icon: BookOpen, path: 'dashboard' },
    { label: 'Contact support', icon: Headphones, path: 'support' },
    { label: 'Service status', icon: Activity, path: 'support' },
    { label: 'Your purchases', icon: ShoppingBag, path: 'library' },
    { label: 'Legal center', icon: Scale, path: 'legal' },
    { label: 'Privacy', icon: Lock, path: 'legal' },
    { label: 'Creator terms', icon: Users, path: 'legal' },
    { label: 'Buyer terms', icon: CreditCard, path: 'legal' },
    { label: 'Report content', icon: Flag, path: 'support' },
  ];

  return (
    <footer className="border-t border-slate-200 dark:border-zinc-800/50 bg-slate-50 dark:bg-zinc-950 print:hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 mb-8">
          {footerLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.label}
                onClick={() => onNavigate(link.path)}
                className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <Icon size={13} />
                {link.label}
              </button>
            );
          })}
        </div>

        <div className="text-center space-y-1">
          <p className="text-xs text-slate-400 dark:text-zinc-500">&copy; 2026 velourmedia.site. All rights reserved.</p>
          <p className="text-xs text-slate-400 dark:text-zinc-500">
            Velour Media LLC &middot; 9465 Wilshire Blvd, Suite 300, Beverly Hills, Los Angeles, CA 90212, USA
          </p>
        </div>
      </div>
    </footer>
  );
}
