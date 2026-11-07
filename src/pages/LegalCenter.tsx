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
              ← All Policies
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

        {/* Audience Filter Tabs */}
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

        {/* Search Input */}
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

        {/* Category Filter Chips */}
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

        {/* Directory Cards */}
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

// 1. CREATOR TERMS
function CreatorTermsDoc() {
  return (
    <article className="prose prose-invert max-w-none text-zinc-300">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Creator terms</h1>
      <p className="text-sm text-zinc-400 mb-2">Terms for creator accounts, content ownership, sales, payment fees, payouts and use of velourmedia.site.[span_2](start_span)[span_2](end_span)</p>
      <p className="text-xs text-zinc-500 mb-6 font-mono">Updated November 2, 2026 · Document version 3.3[span_3](start_span)[span_3](end_span)</p>

      <div className="rounded-2xl bg-[#0f1712] border border-emerald-500/30 p-5 mb-10">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5">AT A GLANCE[span_4](start_span)[span_4](end_span)</p>
        <p className="text-sm text-zinc-200 leading-relaxed">
          These terms govern your use of velourmedia.site as an independent creator.[span_5](start_span)[span_5](end_span) You keep ownership of your content and remain responsible for what you publish, how you describe it and the rights needed to sell it.[span_6](start_span)[span_6](end_span)
        </p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-white mb-2">Your account and eligibility</h2>
          <p>
            These terms are an agreement between you and Velour Media.[span_7](start_span)[span_7](end_span) By using the creator service, you confirm that you are at least 18, at least the age of majority where you live, have legal capacity to contract and provide accurate information.[span_8](start_span)[span_8](end_span)
          </p>
          <p className="mt-2">
            You may maintain one account with multiple creator profiles.[span_9](start_span)[span_9](end_span) Protect your credentials, do not share or access another person's account, and complete required identity, payment and payout verification.[span_10](start_span)[span_10](end_span) Availability depends on country, provider, account approval and applicable restrictions.[span_11](start_span)[span_11](end_span)
          </p>
          <p className="mt-2">
            Creators are independent content licensors, not employees, contractors, agents or partners of Velour Media.[span_12](start_span)[span_12](end_span) You are responsible for your business decisions and compliance with applicable law.[span_13](start_span)[span_13](end_span)
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Content and licenses</h2>
          <p>
            You retain ownership of your content.[span_14](start_span)[span_14](end_span) You grant Velour Media a limited, non-exclusive, worldwide license to sell access to your content on velourmedia.site and to host, reproduce, cache, deliver, display and moderate it while operating, improving, securing and promoting the platform, and as needed for legal obligations and enforcement.[span_15](start_span)[span_15](end_span) Velour Media is the merchant of record for all sales.[span_16](start_span)[span_16](end_span) This license does not authorize selling or licensing your content outside the platform.[span_17](start_span)[span_17](end_span)
          </p>
          <p className="mt-2">
            Velour Media provides buyers the personal, non-commercial access rights described with the purchase under your license.[span_18](start_span)[span_18](end_span) You must own or have permission for all content, third-party appearances and intellectual property involved.[span_19](start_span)[span_19](end_span) Where applicable, maintain the age and recordkeeping documentation required by 18 U.S.C. § 2257 and related law.[span_20](start_span)[span_20](end_span)
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Content standards and moderation</h2>
          <p>
            Sexually explicit and adult content is prohibited under our content rules.[span_21](start_span)[span_21](end_span) Illegal content, exploitation, content involving minors, non-consensual material, infringement, fraud and violent extremism are prohibited.[span_22](start_span)[span_22](end_span) Applicable account and payment-provider restrictions also apply.[span_23](start_span)[span_23](end_span)
          </p>
          <p className="mt-2">
            Every upload goes through automated moderation, and anything flagged receives manual review.[span_24](start_span)[span_24](end_span) We may hold, restrict or remove content, request evidence or suspend access.[span_25](start_span)[span_25](end_span) Cooperate with verification and moderation inquiries.[span_26](start_span)[span_26](end_span) Complaints are resolved within 5 business days through the routes described in our complaints policy.[span_27](start_span)[span_27](end_span)
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Fees, balances and payouts</h2>
          <p>
            Platform fees depend on your payment setup and any account or profile rate.[span_28](start_span)[span_28](end_span) Applicable processing, network, payout, currency-conversion charges and taxes may also be deducted.[span_29](start_span)[span_29](end_span) Different payment arrangements and tips can have different rates.[span_30](start_span)[span_30](end_span) Your dashboard shows the applicable settings and transaction breakdown; a displayed sales price does not guarantee a fixed take-home amount.[span_31](start_span)[span_31](end_span)
          </p>
          <p className="mt-2">
            Velour Media sells access to your licensed content and pays you your share of sales after applicable fees, taxes, refunds and adjustments.[span_32](start_span)[span_32](end_span) Your share may settle to an internal wallet or to a connected payment account.[span_33](start_span)[span_33](end_span) An internal balance is an accounting record, not a bank deposit, and earns no interest.[span_34](start_span)[span_34](end_span) Manual-wallet sales normally mature after a 7-day hold.[span_35](start_span)[span_35](end_span) Connected-provider availability and payouts follow that provider's verification, settlement and withdrawal rules.[span_36](start_span)[span_36](end_span)
          </p>
          <p className="mt-2">
            Withdrawals depend on verification, available funds, method, minimums, fees and account status.[span_37](start_span)[span_37](end_span) Reserves, security holds, fraud reviews, refunds and disputes may delay or reduce funds.[span_38](start_span)[span_38](end_span) Refunds or chargebacks exceeding your balance may create debt recovered from future earnings.[span_39](start_span)[span_39](end_span) We may pause payouts for legal requirements or suspected violations.[span_40](start_span)[span_40](end_span)
          </p>
          <p className="mt-2">
            You remain responsible for your income and other tax obligations.[span_41](start_span)[span_41](end_span) Transaction-tax calculation or remittance depends on the provider and configured tax treatment; do not assume every tax is handled for you.[span_42](start_span)[span_42](end_span)
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Restrictions and account closure</h2>
          <p>
            You can request account deletion through account controls or support.[span_43](start_span)[span_43](end_span) We may restrict or terminate accounts for violations, fraud, security concerns, legal requirements or inactivity.[span_44](start_span)[span_44](end_span) Content may be removed, and pending payouts may be held to address lawful refunds, disputes and other obligations.[span_45](start_span)[span_45](end_span) Closure does not remove amounts lawfully owed or retained records.[span_46](start_span)[span_46](end_span)
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

// 2. CUSTOMER TERMS
function CustomerTermsDoc() {
  return (
    <article className="prose prose-invert max-w-none text-zinc-300">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Customer terms</h1>
      <p className="text-sm text-zinc-400 mb-2">Terms for buying digital content, payment totals, access windows, refunds and customer rights on velourmedia.site.[span_47](start_span)[span_47](end_span)</p>
      <p className="text-xs text-zinc-500 mb-6 font-mono">Updated November 2, 2026 · Document version 3.3[span_48](start_span)[span_48](end_span)</p>

      <div className="rounded-2xl bg-[#0f1712] border border-emerald-500/30 p-5 mb-10">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5">AT A GLANCE[span_49](start_span)[span_49](end_span)</p>
        <p className="text-sm text-zinc-200 leading-relaxed">
          These terms explain your rights and responsibilities when buying access to creator content from Velour Media on velourmedia.site.[span_50](start_span)[span_50](end_span) Check the content description, checkout total and access terms before paying.[span_51](start_span)[span_51](end_span)
        </p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-white mb-2">The service and your account</h2>
          <p>
            These terms are an agreement with Velour Media.[span_52](start_span)[span_52](end_span) You must be at least 18 and legally able to contract.[span_53](start_span)[span_53](end_span) Supply accurate details and protect account and purchase-access credentials.[span_54](start_span)[span_54](end_span)
          </p>
          <p className="mt-2">
            Velour Media is the merchant of record for all sales.[span_55](start_span)[span_55](end_span) Creators license their content to Velour Media, which sells access to buyers.[span_56](start_span)[span_56](end_span) Creators retain ownership of their content.[span_57](start_span)[span_57](end_span) Payment services may have additional applicable terms.[span_58](start_span)[span_58](end_span)
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Payments and totals</h2>
          <p>
            You authorize the total displayed at checkout, including any disclosed fees or taxes.[span_59](start_span)[span_59](end_span) Payment methods and availability vary by creator, country and provider.[span_60](start_span)[span_60](end_span)
          </p>
          <p className="mt-2">
            Payments are handled by payment services for the relevant transaction.[span_61](start_span)[span_61](end_span) Access is confirmed through our payment-verification process; a pending or successful browser screen alone does not establish fulfillment.[span_62](start_span)[span_62](end_span) If payment appears uncertain, check its status or contact support before paying again.[span_63](start_span)[span_63](end_span)
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">What a purchase gives you</h2>
          <p>
            A purchase gives you limited, non-exclusive, non-transferable access for personal, private and non-commercial use, according to the displayed purchase terms.[span_64](start_span)[span_64](end_span) It does not transfer copyright or permit redistribution, resale, public posting or AI-model training.[span_65](start_span)[span_65](end_span)
          </p>
          <p className="mt-2">
            Eligible one-off paid purchases currently have a 3-hour access window beginning on first content access.[span_66](start_span)[span_66](end_span) The displayed checkout and access terms govern the relevant purchase.[span_67](start_span)[span_67](end_span) Downloading is available only where offered; retain permitted downloads before access expires.[span_68](start_span)[span_68](end_span) An unlock does not promise perpetual hosting or access.[span_69](start_span)[span_69](end_span)
          </p>
          <p className="mt-2">
            Content can become unavailable because of removal, account restrictions or technical issues.[span_70](start_span)[span_70](end_span) Mandatory rights concerning non-delivery or defective digital content remain available.[span_71](start_span)[span_71](end_span)
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Refunds and billing problems</h2>
          <p>
            We give refunds for duplicate charges, unresolved paid-access failures and content materially different from its description.[span_72](start_span)[span_72](end_span) Request a refund at support@velourmedia.site with your purchase reference, checkout email and a description of the issue.[span_73](start_span)[span_73](end_span) Requests are reviewed within 2 business days; approved refunds typically reach the original payment method in 5-10 business days.[span_74](start_span)[span_74](end_span) Our separate Refund Policy explains the process.[span_75](start_span)[span_75](end_span)
          </p>
        </section>

        <section className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-6 mt-8">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">PLATFORM OPERATOR</h3>
          <p className="font-bold text-white">Velour Media</p>
          <p className="text-xs text-zinc-400">Email: support@velourmedia.site</p>
        </section>
      </div>
    </article>
  );
}

// 3. PRIVACY POLICY
function PrivacyPolicyDoc() {
  return (
    <article className="prose prose-invert max-w-none text-zinc-300">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Privacy policy</h1>
      <p className="text-sm text-zinc-400 mb-2">How velourmedia.site uses account, purchase, verification and technical information, and how to make a privacy request.[span_76](start_span)[span_76](end_span)</p>
      <p className="text-xs text-zinc-500 mb-6 font-mono">Updated November 2, 2026 · Document version 3.3[span_77](start_span)[span_77](end_span)</p>

      <div className="rounded-2xl bg-[#0f1712] border border-emerald-500/30 p-5 mb-10">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5">AT A GLANCE[span_78](start_span)[span_78](end_span)</p>
        <p className="text-sm text-zinc-200 leading-relaxed">
          We use information to operate your account, deliver content, process transactions and keep the service safe.[span_79](start_span)[span_79](end_span) This policy explains the information involved, who may receive it and the choices available to you.[span_80](start_span)[span_80](end_span)
        </p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-white mb-2">Information we use</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
            <li><strong>Account details:</strong> name, email, phone number, authentication records, language and account preferences.[span_81](start_span)[span_81](end_span)</li>
            <li><strong>Creator details:</strong> public profile, social links, content, prices and account settings.[span_82](start_span)[span_82](end_span)</li>
            <li><strong>Transactions:</strong> purchases, receipts, payment references, limited payment-method details, balances and payout information.[span_83](start_span)[span_83](end_span)</li>
            <li><strong>Verification:</strong> identity details, documents, images, verification results and information supplied to identity or payment providers.[span_84](start_span)[span_84](end_span)</li>
            <li><strong>Communications:</strong> support messages, attachments, abuse reports and related correspondence.[span_85](start_span)[span_85](end_span)</li>
            <li><strong>Technical information:</strong> IP address, approximate country, device/browser information, access logs and service usage.[span_86](start_span)[span_86](end_span)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Why we use it</h2>
          <p>
            We use information to provide accounts and purchased access, process sales and payouts, verify eligibility, answer support requests, prevent fraud, investigate reports, moderate content and comply with legal obligations.[span_87](start_span)[span_87](end_span)
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Identity and verification information</h2>
          <p>
            Identity providers may examine identity documents and selfies for verification.[span_88](start_span)[span_88](end_span) Automated moderation may assess uploaded images or video frames for unsafe content, estimated age and face matches associated with impersonation.[span_89](start_span)[span_89](end_span) Verification records and moderation evidence are restricted to authorized reviewers and are not public profile information.[span_90](start_span)[span_90](end_span)
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Who may receive information</h2>
          <p>
            Public profile information and content previews are visible according to creator settings.[span_91](start_span)[span_91](end_span) We use reputable services for database hosting (Supabase), content distribution, payment processing, and transactional messaging.[span_92](start_span)[span_92](end_span) We do not sell personal information or share mobile numbers for third-party marketing.[span_93](start_span)[span_93](end_span)
          </p>
        </section>

        <section className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-6 mt-8">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">PRIVACY CONTACT</h3>
          <p className="font-bold text-white">Velour Media Privacy Desk</p>
          <p className="text-xs text-zinc-400">Email: privacy@velourmedia.site</p>
        </section>
      </div>
    </article>
  );
}

// 4. REFUND POLICY
function RefundPolicyDoc() {
  return (
    <article className="prose prose-invert max-w-none text-zinc-300">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Refund Policy</h1>
      <p className="text-sm text-zinc-400 mb-2">When velourmedia.site gives refunds, how to request one and how long a refund takes.[span_94](start_span)[span_94](end_span)</p>
      <p className="text-xs text-zinc-500 mb-6 font-mono">Updated November 2, 2026 · Document version 3.3[span_95](start_span)[span_95](end_span)</p>

      <div className="rounded-2xl bg-[#0f1712] border border-emerald-500/30 p-5 mb-10">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5">AT A GLANCE[span_96](start_span)[span_96](end_span)</p>
        <p className="text-sm text-zinc-200 leading-relaxed">
          Velour Media gives refunds for duplicate charges, unresolved paid-access failures and content materially different from its description.[span_97](start_span)[span_97](end_span) Request help at support@velourmedia.site.[span_98](start_span)[span_98](end_span)
        </p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-white mb-2">When refunds are given</h2>
          <p>
            We give refunds for duplicate charges, paid-access failures that remain unresolved and content materially different from its description.[span_99](start_span)[span_99](end_span) Include enough information for us to verify the purchase and the problem.[span_100](start_span)[span_100](end_span)
          </p>
          <p className="mt-2">
            Digital-content change-of-mind refunds may be limited where the law permits.[span_101](start_span)[span_101](end_span) This policy does not remove mandatory rights to cancellation, withdrawal, repair, replacement or refund.[span_102](start_span)[span_102](end_span) A digital-content withdrawal right is lost only when the legally required consent, acknowledgment and confirmation conditions are met.[span_103](start_span)[span_103](end_span)
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">How to request a refund</h2>
          <p>
            Email support@velourmedia.site with the email used at checkout, your purchase reference if available, the content or checkout URL and a description of the problem.[span_104](start_span)[span_104](end_span) For a duplicate charge, include the dates and amounts of the charges.[span_105](start_span)[span_105](end_span) Do not send full card numbers, security codes or passwords.[span_106](start_span)[span_106](end_span)
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Review and refund timing</h2>
          <p>
            We review refund requests within 2 business days and reply to the email you provide.[span_107](start_span)[span_107](end_span) Approved refunds are returned to the original payment method and typically arrive within 5-10 business days after approval.[span_108](start_span)[span_108](end_span)
          </p>
        </section>

        <section className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-6 mt-8">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">PLATFORM OPERATOR</h3>
          <p className="font-bold text-white">Velour Media</p>
          <p className="text-xs text-zinc-400">Email: support@velourmedia.site</p>
        </section>
      </div>
    </article>
  );
}

// 5. COMPLAINTS & APPEALS
function ComplaintsDoc() {
  return (
    <article className="prose prose-invert max-w-none text-zinc-300">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Complaints and appeals</h1>
      <p className="text-sm text-zinc-400 mb-2">How to report content, challenge a restriction or request review of a velourmedia.site decision.[span_109](start_span)[span_109](end_span)</p>
      <p className="text-xs text-zinc-500 mb-6 font-mono">Updated November 2, 2026 · Document version 3.3[span_110](start_span)[span_110](end_span)</p>

      <div className="rounded-2xl bg-[#0f1712] border border-emerald-500/30 p-5 mb-10">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5">AT A GLANCE[span_111](start_span)[span_111](end_span)</p>
        <p className="text-sm text-zinc-200 leading-relaxed">
          You can report content or ask us to review a decision without paying a complaint fee.[span_112](start_span)[span_112](end_span) Tell us what happened and provide enough detail to locate the issue.[span_113](start_span)[span_113](end_span)
        </p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-white mb-2">Send a complaint</h2>
          <p>
            Use a content report control or email complaints@velourmedia.site.[span_114](start_span)[span_114](end_span) Include the relevant URL, purchase or account reference, a clear explanation and the email where we can reply.[span_115](start_span)[span_115](end_span)
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">How we review</h2>
          <p>
            We consider the information, applicable law, content rules and relevant account or provider restrictions.[span_116](start_span)[span_116](end_span) Urgent safety concerns are prioritized.[span_117](start_span)[span_117](end_span) Complaints are resolved within 5 business days.[span_118](start_span)[span_118](end_span)
          </p>
        </section>

        <section className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-6 mt-8">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">PLATFORM OPERATOR</h3>
          <p className="font-bold text-white">Velour Media</p>
          <p className="text-xs text-zinc-400">Email: complaints@velourmedia.site</p>
        </section>
      </div>
    </article>
  );
}

// 6. LAW ENFORCEMENT REQUESTS
function LawEnforcementDoc() {
  return (
    <article className="prose prose-invert max-w-none text-zinc-300">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Law enforcement requests</h1>
      <p className="text-sm text-zinc-400 mb-2">How authorities can submit legal-process, preservation and emergency requests to velourmedia.site.[span_119](start_span)[span_119](end_span)</p>
      <p className="text-xs text-zinc-500 mb-6 font-mono">Updated November 2, 2026 · Document version 3.3[span_120](start_span)[span_120](end_span)</p>

      <div className="rounded-2xl bg-[#0f1712] border border-emerald-500/30 p-5 mb-10">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5">AT A GLANCE[span_121](start_span)[span_121](end_span)</p>
        <p className="text-sm text-zinc-200 leading-relaxed">
          We evaluate requests for user information under applicable law.[span_122](start_span)[span_122](end_span) A request should identify its legal authority, scope and the records needed.[span_123](start_span)[span_123](end_span)
        </p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-white mb-2">Submitting a request</h2>
          <p>
            Send requests to legal@velourmedia.site and identify the requesting agency, officer, official contact details, legal authority, relevant account/content identifiers and date range.[span_124](start_span)[span_124](end_span) Provide valid legal process where required.[span_125](start_span)[span_125](end_span)
          </p>
        </section>

        <section className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-6 mt-8">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">PLATFORM OPERATOR</h3>
          <p className="font-bold text-white">Velour Media Legal Review</p>
          <p className="text-xs text-zinc-400">Email: legal@velourmedia.site</p>
        </section>
      </div>
    </article>
  );
}
