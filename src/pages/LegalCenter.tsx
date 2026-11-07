import { useState } from 'react';
import { 
  ArrowLeft, 
  Search, 
  ArrowUpRight, 
  Lock, 
  Users, 
  ShoppingBag, 
  Scale, 
  AlertTriangle, 
  RotateCcw, 
  ChevronRight 
} from 'lucide-react';

interface LegalCenterProps {
  onNavigate?: (path: string) => void;
}

type AudienceFilter = 'everyone' | 'creators' | 'buyers';
type CategoryFilter = 'all' | 'accounts' | 'privacy' | 'safety' | 'creators';
type DocumentKey = 'creator-terms' | 'customer-terms' | 'privacy' | 'refund' | 'complaints' | 'law-enforcement';

export function LegalCenter({ onNavigate }: LegalCenterProps) {
  const [selectedAudience, setSelectedAudience] = useState<AudienceFilter>('everyone');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDoc, setActiveDoc] = useState<DocumentKey | null>(null);

  const policies = [
    {
      key: 'customer-terms' as DocumentKey,
      title: 'Customer terms',
      category: 'accounts',
      categoryLabel: 'ACCOUNTS & PAYMENTS',
      audience: ['everyone', 'buyers'] as AudienceFilter[],
      icon: ShoppingBag,
      summary: 'Terms for buying digital content, payment totals, access windows, refunds and customer rights on velourmedia.site.',
    },
    {
      key: 'creator-terms' as DocumentKey,
      title: 'Creator terms',
      category: 'creators',
      categoryLabel: 'CREATOR PROGRAMS',
      audience: ['everyone', 'creators'] as AudienceFilter[],
      icon: Users,
      summary: 'Terms for creator accounts, content ownership, sales, payment fees, payouts and use of velourmedia.site.',
    },
    {
      key: 'privacy' as DocumentKey,
      title: 'Privacy policy',
      category: 'privacy',
      categoryLabel: 'PRIVACY',
      audience: ['everyone', 'creators', 'buyers'] as AudienceFilter[],
      icon: Lock,
      summary: 'How velourmedia.site uses account, purchase, verification and technical information, and how to make a privacy request.',
    },
    {
      key: 'refund' as DocumentKey,
      title: 'Refund Policy',
      category: 'accounts',
      categoryLabel: 'ACCOUNTS & PAYMENTS',
      audience: ['everyone', 'buyers'] as AudienceFilter[],
      icon: RotateCcw,
      summary: 'When velourmedia.site gives refunds, how to request one and how long a refund takes.',
    },
    {
      key: 'complaints' as DocumentKey,
      title: 'Complaints and appeals',
      category: 'safety',
      categoryLabel: 'CONTENT & SAFETY',
      audience: ['everyone', 'creators', 'buyers'] as AudienceFilter[],
      icon: Scale,
      summary: 'How to report content, challenge a restriction or request review of a velourmedia.site decision.',
    },
    {
      key: 'law-enforcement' as DocumentKey,
      title: 'Law enforcement requests',
      category: 'safety',
      categoryLabel: 'CONTENT & SAFETY',
      audience: ['everyone'] as AudienceFilter[],
      icon: AlertTriangle,
      summary: 'How authorities can submit legal-process, preservation and emergency requests to velourmedia.site.',
    },
  ];

  const filteredPolicies = policies.filter((p) => {
    const matchesAudience = selectedAudience === 'everyone' || p.audience.includes(selectedAudience);
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAudience && matchesCategory && matchesSearch;
  });

  if (activeDoc) {
    return (
      <div className="min-h-screen bg-[#070b09] text-zinc-200 py-12 px-4 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-black">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setActiveDoc(null)}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 transition-colors mb-8"
          >
            <ArrowLeft size={16} /> Back to Legal Center
          </button>

          {activeDoc === 'creator-terms' && <CreatorTermsDoc />}
          {activeDoc === 'customer-terms' && <CustomerTermsDoc />}
          {activeDoc === 'privacy' && <PrivacyPolicyDoc />}
          {activeDoc === 'refund' && <RefundPolicyDoc />}
          {activeDoc === 'complaints' && <ComplaintsDoc />}
          {activeDoc === 'law-enforcement' && <LawEnforcementDoc />}

          <div className="mt-16 pt-8 border-t border-zinc-800/80 flex items-center justify-between">
            <button
              onClick={() => setActiveDoc(null)}
              className="px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-sm font-semibold border border-zinc-800 transition-colors"
            >
              Back to all policies
            </button>
            <a
              href="mailto:support@velourmedia.site"
              className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
            >
              Questions? Contact support
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b09] text-zinc-200 py-16 px-4 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-black">
      <div className="max-w-4xl mx-auto">
        {onNavigate && (
          <button
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-emerald-400 transition-colors mb-8"
          >
            <ArrowLeft size={14} /> Back to Velour
          </button>
        )}

        <div className="mb-10">
          <p className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-2">velourmedia.site</p>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">Legal center</h1>
          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl leading-relaxed">
            Understand the terms, privacy choices and content rules that apply when you create or buy on velourmedia.site.
          </p>
        </div>

        <div className="flex gap-2 p-1.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 w-fit mb-6">
          {(['everyone', 'creators', 'buyers'] as AudienceFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedAudience(tab)}
              className={`px-6 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                selectedAudience === tab
                  ? 'bg-[#76e05d] text-[#071306] shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search policies or a topic"
            className="w-full rounded-2xl bg-[#0c120e] border border-zinc-800/80 pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-10 text-xs">
          {[
            { key: 'all', label: 'All policies' },
            { key: 'accounts', label: 'Accounts & payments' },
            { key: 'privacy', label: 'Privacy' },
            { key: 'safety', label: 'Content & safety' },
            { key: 'creators', label: 'Creator programs' },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key as CategoryFilter)}
              className={`px-4 py-2 rounded-full border transition-all ${
                selectedCategory === cat.key
                  ? 'bg-zinc-800 text-white border-zinc-700'
                  : 'bg-[#0a0f0c] text-zinc-400 border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-6">
          <span className="w-6 h-[1px] bg-zinc-700" />
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
            {filteredPolicies.length} POLICIES
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredPolicies.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.key}
                onClick={() => setActiveDoc(p.key)}
                className="group relative cursor-pointer rounded-3xl bg-[#0c130f] border border-zinc-800/80 hover:border-emerald-500/40 p-6 sm:p-7 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-400">
                      <Icon size={16} />
                      <span>{p.categoryLabel}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/40 transition-colors">
                      <ArrowUpRight size={16} />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-2xl">
                    {p.summary}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800/40 flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  Read policy <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-20 pt-8 border-t border-zinc-900 text-xs text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-zinc-400">Velour Media Platform</p>
            <p className="mt-0.5">Contact: support@velourmedia.site</p>
          </div>
          <p>© 2026 Velour Media. Document version 3.3</p>
        </div>
      </div>
    </div>
  );
}

function CreatorTermsDoc() {
  return (
    <article className="prose prose-invert max-w-none text-zinc-300">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Creator terms</h1>
      <p className="text-sm text-zinc-400 mb-2">Terms for creator accounts, content ownership, sales, payment fees, payouts and use of velourmedia.site.</p>
      <p className="text-xs text-zinc-500 mb-6 font-mono">Updated November 2, 2026 · Document version 3.3</p>

      <div className="rounded-2xl bg-[#0f1712] border border-emerald-500/30 p-5 mb-10">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5">AT A GLANCE</p>
        <p className="text-sm text-zinc-200 leading-relaxed">
          These terms govern your use of velourmedia.site as an independent creator. You keep ownership of your content and remain responsible for what you publish, how you describe it and the rights needed to sell it.
        </p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-white mb-2">Your account and eligibility</h2>
          <p>
            These terms are an agreement between you and Velour Media. By using the creator service, you confirm that you are at least 18, at least the age of majority where you live, have legal capacity to contract and provide accurate information.
          </p>
          <p className="mt-2">
            You may maintain one account with multiple creator profiles. Protect your credentials, do not share or access another person's account, and complete required identity, payment and payout verification. Availability depends on country, provider, account approval and applicable restrictions.
          </p>
          <p className="mt-2">
            Creators are independent content licensors, not employees, contractors, agents or partners of Velour Media. You are responsible for your business decisions and compliance with applicable law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Content and licenses</h2>
          <p>
            You retain ownership of your content. You grant Velour Media a limited, non-exclusive, worldwide license to sell access to your content on velourmedia.site and to host, reproduce, cache, deliver, display and moderate it while operating, improving, securing and promoting the platform, and as needed for legal obligations and enforcement. Velour Media is the merchant of record for all sales. This license does not authorize selling or licensing your content outside the platform.
          </p>
          <p className="mt-2">
            Velour Media provides buyers the personal, non-commercial access rights described with the purchase under your license. You must own or have permission for all content, third-party appearances and intellectual property involved. Where applicable, maintain the age and recordkeeping documentation required by 18 U.S.C. § 2257 and related law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Content standards and moderation</h2>
          <p>
            Sexually explicit and adult content is prohibited under our content rules. Illegal content, exploitation, content involving minors, non-consensual material, infringement, fraud and violent extremism are prohibited. Applicable account and payment-provider restrictions also apply.
          </p>
          <p className="mt-2">
            Every upload goes through automated moderation, and anything flagged receives manual review. We may hold, restrict or remove content, request evidence or suspend access. Cooperate with verification and moderation inquiries. Complaints are resolved within 5 business days through the routes described in our complaints policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Fees, balances and payouts</h2>
          <p>
            Platform fees depend on your payment setup and any account or profile rate. Applicable processing, network, payout, currency-conversion charges and taxes may also be deducted. Different payment arrangements and tips can have different rates. Your dashboard shows the applicable settings and transaction breakdown; a displayed sales price does not guarantee a fixed take-home amount.
          </p>
          <p className="mt-2">
            Velour Media sells access to your licensed content and pays you your share of sales after applicable fees, taxes, refunds and adjustments. Your share may settle to an internal wallet or to a connected payment account. An internal balance is an accounting record, not a bank deposit, and earns no interest. Manual-wallet sales normally mature after a 7-day hold. Connected-provider availability and payouts follow that provider's verification, settlement and withdrawal rules.
          </p>
          <p className="mt-2">
            Withdrawals depend on verification, available funds, method, minimums, fees and account status. Reserves, security holds, fraud reviews, refunds and disputes may delay or reduce funds. Refunds or chargebacks exceeding your balance may create debt recovered from future earnings. We may pause payouts for legal requirements or suspected violations.
          </p>
          <p className="mt-2">
            You remain responsible for your income and other tax obligations. Transaction-tax calculation or remittance depends on the provider and configured tax treatment; do not assume every tax is handled for you.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Restrictions and account closure</h2>
          <p>
            You can request account deletion through account controls or support. We may restrict or terminate accounts for violations, fraud, security concerns, legal requirements or inactivity. Content may be removed, and pending payouts may be held to address lawful refunds, disputes and other obligations. Closure does not remove amounts lawfully owed or retained records.
          </p>
        </section>

        <section className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-6 mt-8">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">PLATFORM OPERATOR</h3>
          <p className="font-bold text-white">Velour Media</p>
          <p className="text-xs text-zinc-400">Email: support@velourmedia.site</p>
          <p className="text-xs text-zinc-400">Website: https://velourmedia.site</p>
        </section>
      </div>
    </article>
  );
}

function CustomerTermsDoc() {
  return (
    <article className="prose prose-invert max-w-none text-zinc-300">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Customer terms</h1>
      <p className="text-sm text-zinc-400 mb-2">Terms for buying digital content, payment totals, access windows, refunds and customer rights on velourmedia.site.</p>
      <p className="text-xs text-zinc-500 mb-6 font-mono">Updated November 2, 2026 · Document version 3.3</p>

      <div className="rounded-2xl bg-[#0f1712] border border-emerald-500/30 p-5 mb-10">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5">AT A GLANCE</p>
        <p className="text-sm text-zinc-200 leading-relaxed">
          These terms explain your rights and responsibilities when buying access to creator content from Velour Media on velourmedia.site. Check the content description, checkout total and access terms before paying.
        </p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-white mb-2">The service and your account</h2>
          <p>
            These terms are an agreement with Velour Media. You must be at least 18 and legally able to contract. Supply accurate details and protect account and purchase-access credentials.
          </p>
          <p className="mt-2">
            Velour Media is the merchant of record for all sales. Creators license their content to Velour Media, which sells access to buyers. Creators retain ownership of their content. Payment services may have additional applicable terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Payments and totals</h2>
          <p>
            You authorize the total displayed at checkout, including any disclosed fees or taxes. Payment methods and availability vary by creator, country and provider.
          </p>
          <p className="mt-2">
            Payments are handled by payment services for the relevant transaction. Access is confirmed through our payment-verification process; a pending or successful browser screen alone does not establish fulfillment. If payment appears uncertain, check its status or contact support before paying again.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">What a purchase gives you</h2>
          <p>
            A purchase gives you limited, non-exclusive, non-transferable access for personal, pri