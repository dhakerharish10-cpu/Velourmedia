import { useState } from 'react';
import { useStore } from '../lib/store';
import { Navbar } from '../components/Navbar';
import {
  ArrowRight,
  Eye,
  CheckCircle2,
  Image as ImageIcon,
  Video,
  FileText,
  ChevronDown,
  Copy,
  Check,
  Layers,
  Sparkles,
  TrendingUp,
  Download,
  ShieldCheck,
  FolderLock,
  Wallet,
} from 'lucide-react';

interface LandingProps {
  onNavigate: (path: string) => void;
}

export function Landing({ onNavigate }: LandingProps) {
  const { user, openAuth } = useStore();

  // Try it Simulator state
  const [simulatorMode, setSimulatorMode] = useState<'editor' | 'fan'>('editor');
  const [simPrice, setSimPrice] = useState<number>(18);
  const [simBlur, setSimBlur] = useState<boolean>(true);
  const [simUnlocked, setSimUnlocked] = useState<boolean>(false);
  const [activeMediaTab, setActiveMediaTab] = useState<'photo' | 'video'>('photo');
  const [linkCopied, setLinkCopied] = useState<boolean>(false);

  // Showcase state
  const [unlockedCards, setUnlockedCards] = useState<Record<string, boolean>>({});

  const toggleCardUnlock = (id: string) => {
    setUnlockedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Calculator state
  const [calcPrice, setCalcPrice] = useState<number>(24);
  const [calcSales, setCalcSales] = useState<number>(120);
  const platformFeeRate = 0.30;

  const grossTotal = calcPrice * calcSales;
  const platformFeeTotal = Math.round(grossTotal * platformFeeRate * 100) / 100;
  const creatorNetTotal = Math.round((grossTotal - platformFeeTotal) * 100) / 100;

  // FAQ Accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const handleCopyLink = () => {
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const sampleShowcasePosts = [
    {
      id: 'post-1',
      title: 'Studio Session · Editorial Lookbook',
      type: 'Photo set · 14 photos · 4K',
      price: 18,
      cover: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
      tag: 'Photos',
    },
    {
      id: 'post-2',
      title: 'Cinematic Sunset · BTS Film',
      type: 'Video · 4:32 min · 60fps',
      price: 24,
      cover: 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=800&q=80',
      tag: 'Video',
    },
    {
      id: 'post-3',
      title: 'Urban Aesthetics & Presets',
      type: 'Pack · 8 Presets + RAW files',
      price: 15,
      cover: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80',
      tag: 'Presets',
    },
  ];

  const faqs = [
    {
      q: 'What can I sell on Velour?',
      a: 'Original photography sets, exclusive cinematic video assets, behind-the-scenes productions, audio stems, Lightroom presets, and creative digital media files. You retain full copyright ownership of your work.',
    },
    {
      q: 'How much can I charge per media asset?',
      a: 'You have full control. Digital packs can be distributed for free ($0) or priced from $10.00 up to $999.00 USD per asset.',
    },
    {
      q: 'How do buyers access downloaded media?',
      a: 'Immediately upon completing secure checkout, high-resolution media files and direct stream players activate instantly in the buyer’s web browser without requiring third-party plugins.',
    },
    {
      q: 'What are the platform fees?',
      a: 'Velour charges a simple, transparent 30% platform fee. You keep 70% of every sale credited directly into your wallet balance.',
    },
    {
      q: 'When can I withdraw my earnings?',
      a: 'Once standard merchant identity verification is completed, you can initiate automated payouts from your creator wallet to your connected payout destination.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      <Navbar onNavigate={onNavigate} currentPath="" />

      {/* ---------------- 01. HERO SECTION ---------------- */}
      <section className="relative overflow-hidden pt-28 pb-20 px-4 sm:px-6 lg:px-8 border-b border-zinc-900">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-indigo-500/15 via-purple-500/5 to-transparent rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-medium text-zinc-300 mb-6 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Premium Digital Creator Infrastructure
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.08]">
            Your content. <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              Your direct income.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Distribute high-resolution photography, video assets, presets, and digital media packs from one dedicated link. Create your storefront, set your price, and deliver assets instantly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <button
                onClick={() => onNavigate('dashboard')}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                Go to Dashboard <ArrowRight size={18} />
              </button>
            ) : (
              <button
                onClick={() => openAuth('signup')}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                Start Creating <ArrowRight size={18} />
              </button>
            )}

            <a
              href="#try-it"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-semibold transition-all flex items-center justify-center"
            >
              See Live Simulator
            </a>
          </div>

          {/* Floating Pill Badges */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-3 text-xs">
            <div className="px-4 py-2 rounded-full bg-zinc-900/90 border border-zinc-800/90 text-zinc-200 flex items-center gap-2 shadow-lg">
              <ImageIcon size={14} className="text-indigo-400" /> Photo set · <span className="font-bold text-white">$18</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-zinc-900/90 border border-zinc-800/90 text-zinc-200 flex items-center gap-2 shadow-lg">
              <Video size={14} className="text-purple-400" /> 4:32 Video · <span className="font-bold text-white">$24</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-zinc-900/90 border border-zinc-800/90 text-zinc-200 flex items-center gap-2 shadow-lg">
              <Layers size={14} className="text-emerald-400" /> Audio Pack · <span className="font-bold text-white">$12</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-zinc-900/90 border border-zinc-800/90 text-zinc-200 flex items-center gap-2 shadow-lg">
              <FileText size={14} className="text-amber-400" /> Digital Guide · <span className="font-bold text-white">$15</span>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-zinc-500">Sample posts · Illustrative prices · Instant electronic delivery</p>
        </div>
      </section>

      {/* ---------------- 02. PLATFORM STATS & SOCIAL PROOF ---------------- */}
      <section className="py-20 px-4 sm:px-6 max-w-5xl mx-auto border-b border-zinc-900 text-left">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
          <div>
            <h2 className="text-5xl sm:text-7xl font-black text-white tracking-tight leading-none mb-4">
              3,000+
              <span className="block text-sm sm:text-base font-bold tracking-widest text-emerald-400 uppercase mt-2">
                Active Creators
              </span>
            </h2>
            <h3 className="text-4xl sm:text-6xl font-black text-zinc-200 tracking-tight leading-none mt-10">
              Nearly $2 million
              <span className="block text-sm sm:text-base font-bold tracking-widest text-zinc-500 uppercase mt-2">
                Paid Out to Date
              </span>
            </h3>
            <p className="text-xs text-zinc-600 mt-4 font-mono">Historical platform infrastructure totals</p>
          </div>

          <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/80">
            <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider">PLATFORM RELIABILITY</span>
            <h4 className="text-2xl font-bold text-white mt-2 mb-3">Enterprise payouts. Low friction.</h4>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Every purchase clears via PCI-DSS compliant checkout. Creators keep full visibility into gross volume, platform splits, and on-demand wallet withdrawals.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- 03. HOW IT WORKS ---------------- */}
      <section className="py-24 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">01 How It Works</p>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">Made by you. Accessed by them.</h2>
          <p className="text-sm sm:text-base text-zinc-400 mt-3 max-w-lg mx-auto">
            Give your creative productions a permanent home, clear pricing, and direct instant digital checkout.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800/80 p-8 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-indigo-400 tracking-wider">01 CREATE</span>
              <h3 className="text-2xl font-bold text-white mt-3 mb-2">Package your media pack.</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-8">
                Photos, videos, audio, or PDFs. Upload raw production assets, set your download price, and manage distribution terms.
              </p>
            </div>
            <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-zinc-400">Digital Asset · Ready</span>
                <span className="text-emerald-400 flex items-center gap-1 text-[11px] font-semibold">
                  <CheckCircle2 size={12} /> Account verified ✓
                </span>
              </div>
              <p className="text-sm font-semibold text-white">Golden Hour · Photo Set</p>
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-zinc-900 text-xs">
                <span className="text-zinc-400">Price: <strong className="text-white">$18.00</strong></span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-medium">Ready</span>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800/80 p-8 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-purple-400 tracking-wider">02 SHARE</span>
              <h3 className="text-2xl font-bold text-white mt-3 mb-2">One storefront link anywhere.</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-8">
                Your bio, portfolio, or newsletter. Send fans and buyers straight to your high-converting checkout page.
              </p>
            </div>
            <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4">
              <p className="text-xs text-zinc-400 mb-2">Your link · Live</p>
              <div className="flex items-center justify-between bg-zinc-900 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 border border-zinc-800">
                <span className="truncate">velourmedia.site/@creator</span>
                <button onClick={handleCopyLink} className="text-indigo-400 hover:text-indigo-300 ml-2">
                  {linkCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
              <div className="mt-3 flex gap-2 text-[10px] text-zinc-500 justify-center">
                <span>Bio Link</span> • <span>Community</span> • <span>Direct link</span>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800/80 p-8 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider">03 DELIVER</span>
              <h3 className="text-2xl font-bold text-white mt-3 mb-2">Instant digital delivery.</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-8">
                Once payment is confirmed, your buyer gets immediate high-resolution access straight in the browser.
              </p>
            </div>
            <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-zinc-400">Order #8491</span>
                <span className="text-emerald-400 font-semibold text-[11px]">Payment Confirmed</span>
              </div>
              <p className="text-sm font-semibold text-white">Golden Hour · 12 Photos</p>
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-zinc-900 text-xs">
                <span className="text-zinc-400">Amount: $18.00</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Download size={12} /> Asset Delivered
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 04. CREATOR WALLET & ANALYTICS PREVIEW ---------------- */}
      <section className="py-24 px-4 sm:px-6 bg-zinc-900/40 border-y border-zinc-900">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">02 Creator Wallet</p>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
              Know where your money is.
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed mb-8">
              Follow each sale from checkout to your available balance, then request a payout from your Wallet whenever you need.
            </p>

            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 font-bold flex items-center justify-center shrink-0 border border-indigo-500/20">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">A buyer pays</h4>
                  <p className="text-xs text-zinc-400 mt-1">The total is shown clearly before digital checkout is confirmed.</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-400 font-bold flex items-center justify-center shrink-0 border border-purple-500/20">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Earnings are recorded</h4>
                  <p className="text-xs text-zinc-400 mt-1">Platform fees and ledger records update your verified wallet in real-time.</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-emerald-500/20">
                  3
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">You withdraw</h4>
                  <p className="text-xs text-zinc-400 mt-1">Complete identity verification and add your payout destination to receive funds.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Analytics UI Card */}
          <div className="rounded-3xl bg-zinc-900/95 border border-zinc-800 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <Wallet size={15} />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white">ANALYTICS</h5>
                  <p className="text-[10px] text-zinc-500">Maya Studio · Performance Overview</p>
                </div>
              </div>
              <div className="flex gap-1 text-[11px] bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-zinc-400">
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-white font-bold">7D</span>
                <span className="px-2 py-0.5">30D</span>
                <span className="px-2 py-0.5">90D</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">Net earnings</span>
                <span className="text-lg font-black text-emerald-400">$1,284.50</span>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">Asset sales</span>
                <span className="text-lg font-black text-white">58</span>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">Pass sales</span>
                <span className="text-lg font-black text-indigo-400">14</span>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">Store views</span>
                <span className="text-lg font-black text-zinc-300">3,942</span>
              </div>
            </div>

            {/* Simulated Earnings Chart */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-emerald-400" /> Earnings overview
                </span>
                <span className="text-xs font-extrabold text-emerald-400">$1,031.25 period total</span>
              </div>
              <div className="h-28 w-full relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,70 Q40,30 90,55 T180,20 T260,65 T300,40 L300,100 L0,100 Z"
                    fill="url(#chartGradient)"
                  />
                  <path
                    d="M0,70 Q40,30 90,55 T180,20 T260,65 T300,40"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                  />
                </svg>
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500 mt-2 font-mono">
                <span>Oct 19</span>
                <span>Oct 21</span>
                <span className="text-emerald-400 font-bold">Oct 23 ($240.00)</span>
                <span>Oct 25</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 05. TRY IT SIMULATOR ---------------- */}
      <section id="try-it" className="py-24 px-4 sm:px-6 bg-zinc-900/20 border-b border-zinc-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">03 Try It</p>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">Your first digital link starts here.</h2>
            <p className="text-sm sm:text-base text-zinc-400 mt-2">Make a sample post. Set a price. Preview digital asset delivery.</p>
          </div>

          <div className="flex justify-center mb-10">
            <div className="inline-flex rounded-2xl bg-zinc-900 p-1.5 border border-zinc-800">
              <button
                onClick={() => setSimulatorMode('editor')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  simulatorMode === 'editor' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Editor
              </button>
              <button
                onClick={() => setSimulatorMode('fan')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  simulatorMode === 'fan' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Buyer view
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-zinc-900/90 border border-zinc-800 p-6 sm:p-10 max-w-xl mx-auto shadow-2xl">
            {simulatorMode === 'editor' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800 text-xs">
                  <span className="text-zinc-400">Sample asset pack · not published</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                    Editor
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">Collection Title</label>
                  <input
                    type="text"
                    disabled
                    value="Linen week · Studio Editorial Lookbook"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">Price (USD)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-zinc-500 text-sm font-bold">$</span>
                    <input
                      type="number"
                      value={simPrice}
                      min={10}
                      max={999}
                      onChange={(e) => setSimPrice(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-bold"
                    />
                  </div>
                  <span className="text-[11px] text-zinc-500 mt-1.5 block">Digital assets are priced from $10 up to $999 USD.</span>
                </div>

                <div className="flex items-center justify-between pt-2 pb-2">
                  <div>
                    <p className="text-sm font-semibold text-white">Enable asset cover preview</p>
                    <p className="text-xs text-zinc-500">Show curated lookbook cover before access</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={simBlur}
                    onChange={(e) => setSimBlur(e.target.checked)}
                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">Deliverable Format</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveMediaTab('photo')}
                      className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                        activeMediaTab === 'photo' ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                      }`}
                    >
                      <ImageIcon size={15} /> Photo Set (7 photos)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMediaTab('video')}
                      className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                        activeMediaTab === 'video' ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                      }`}
                    >
                      <Video size={15} /> 4K Video (4:32)
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setSimulatorMode('fan')}
                  className="w-full py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-sm transition-colors flex items-center justify-center gap-2 mt-4"
                >
                  <Eye size={16} /> Preview as buyer
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800 text-xs text-zinc-400">
                  <span className="font-mono text-zinc-300">velourmedia.site/@creator</span>
                  <span className="font-semibold text-indigo-400">{simUnlocked ? 'Purchased · Full Access' : 'Buyer Preview'}</span>
                </div>

                <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-5">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80"
                    alt="Media preview"
                    className="w-full h-full object-cover brightness-95 contrast-105 transition-all duration-500"
                  />

                  {!simUnlocked && (
                    <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white mb-3 shadow-xl">
                        <FolderLock size={22} className="text-indigo-300" />
                      </div>
                      <p className="text-white font-bold text-lg">Exclusive Media Pack</p>
                      <p className="text-xs text-zinc-300 mt-1 max-w-xs leading-relaxed">
                        {activeMediaTab === 'photo'
                          ? 'Seven high-resolution RAW & 4K export photos from one week in linen.'
                          : 'Exclusive 4K behind-the-scenes master film. Instant high-speed stream.'}
                      </p>
                    </div>
                  )}

                  {simUnlocked && (
                    <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-emerald-500/95 text-white text-xs font-bold backdrop-blur-md flex items-center gap-1.5 shadow-xl">
                      <CheckCircle2 size={13} /> Full Download Access
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-base">Linen week · Studio Editorial</h4>
                      <p className="text-xs text-zinc-400">
                        {activeMediaTab === 'photo' ? 'Photo pack · 7 items · 4K resolution' : '4K Video asset · 4:32 duration'}
                      </p>
                    </div>
                    <span className="text-xl font-extrabold text-white">${simPrice.toFixed(2)}</span>
                  </div>

                  {!simUnlocked ? (
                    <button
                      onClick={() => setSimUnlocked(true)}
                      className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2"
                    >
                      <Download size={16} /> Get Access • ${simPrice.toFixed(2)}
                    </button>
                  ) : (
                    <button
                      onClick={() => setSimUnlocked(false)}
                      className="w-full py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
                    >
                      Reset Preview
                    </button>
                  )}

                  <button
                    onClick={() => setSimulatorMode('editor')}
                    className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 py-1"
                  >
                    Back to the editor
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------------- 06. SHOWCASE MEDIA PACKS ---------------- */}
      <section className="py-24 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">04 Catalog</p>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">Curated creator collections.</h2>
          <p className="text-sm sm:text-base text-zinc-400 mt-3 max-w-md mx-auto">
            Test how digital media packs and exclusive production downloads appear to prospective buyers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sampleShowcasePosts.map((post) => {
            const isUnlocked = !!unlockedCards[post.id];
            return (
              <div
                key={post.id}
                className="rounded-3xl bg-zinc-900 border border-zinc-800 overflow-hidden flex flex-col justify-between hover:border-zinc-700 transition-all shadow-xl"
              >
                <div>
                  <div className="relative aspect-[4/3] bg-zinc-950 overflow-hidden">
                    <img
                      src={post.cover}
                      alt={post.title}
                      className="w-full h-full object-cover brightness-95 contrast-105 transition-all duration-500"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-semibold text-zinc-200">
                      {post.tag}
                    </div>

                    {!isUnlocked ? (
                      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center p-4">
                        <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-indigo-300 mb-2 shadow-lg">
                          <Sparkles size={16} />
                        </div>
                        <span className="text-xs font-bold text-white tracking-wide">Exclusive Media Pack</span>
                      </div>
                    ) : (
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-md">
                        <CheckCircle2 size={11} /> Access Ready
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <h3 className="font-bold text-white text-base mb-1">{post.title}</h3>
                    <p className="text-xs text-zinc-400">{post.type}</p>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                    <span className="text-lg font-bold text-white">${post.price}.00</span>
                    <button
                      onClick={() => toggleCardUnlock(post.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isUnlocked
                          ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                      }`}
                    >
                      {isUnlocked ? 'Close Asset' : <>Get Access • ${post.price}.00</>}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------- 07. PRICING & EARNINGS CALCULATOR ---------------- */}
      <section className="py-24 px-4 sm:px-6 bg-zinc-900/40 border-y border-zinc-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">05 Pricing</p>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">See the numbers before you sell.</h2>
            <p className="text-sm sm:text-base text-zinc-400 mt-2">Try different prices and volumes to estimate your direct take-home earnings.</p>
          </div>

          <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6 sm:p-10 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">Price per sale (USD)</span>
                  <span className="font-extrabold text-white text-base">${calcPrice}</span>
                </div>
                <input
                  type="range" min="10" max="150" step="1"
                  value={calcPrice}
                  onChange={(e) => setCalcPrice(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer h-2 bg-zinc-800 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">Estimated sales</span>
                  <span className="font-extrabold text-white text-base">{calcSales} buyers</span>
                </div>
                <input
                  type="range" min="10" max="1000" step="10"
                  value={calcSales}
                  onChange={(e) => setCalcSales(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer h-2 bg-zinc-800 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-zinc-800 text-center">
              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800">
                <p className="text-xs text-zinc-500">Gross sales</p>
                <p className="text-2xl font-bold text-zinc-200 mt-1">${grossTotal.toLocaleString()}</p>
              </div>
              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800">
                <p className="text-xs text-zinc-500">Platform fee (30%)</p>
                <p className="text-2xl font-bold text-rose-400 mt-1">-${platformFeeTotal.toLocaleString()}</p>
              </div>
              <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30">
                <p className="text-xs text-indigo-400 font-bold">Your net earnings (70%)</p>
                <p className="text-3xl font-black text-white mt-1">${creatorNetTotal.toLocaleString()}</p>
              </div>
            </div>

            <p className="mt-6 text-[11px] text-zinc-500 text-center">
              An illustration, not a payout quote. Processing, payout fees, and reserves can change the final result.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- 08. FAQ SECTION ---------------- */}
      <section className="py-24 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">06 FAQ</p>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">A few good questions.</h2>
          <p className="text-sm sm:text-base text-zinc-400 mt-2">Find practical details about creating, selling, and getting paid.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 overflow-hidden transition-all"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full p-5 text-left flex items-center justify-between text-sm sm:text-base font-semibold text-white hover:text-indigo-300 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  size={18}
                  className={`text-zinc-500 transition-transform duration-200 ${openFaq === idx ? 'rotate-180 text-indigo-400' : ''}`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/40">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- 09. FINAL CTA ---------------- */}
      <section className="py-20 px-4 sm:px-6 max-w-5xl mx-auto text-center border-t border-zinc-900">
        <div className="rounded-3xl bg-gradient-to-b from-indigo-950/40 to-zinc-900 border border-indigo-500/20 p-10 sm:p-14">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">07 Launch</p>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">Make your next media release count.</h2>
          <p className="text-sm sm:text-base text-zinc-400 max-w-md mx-auto mb-8">
            A dedicated storefront for your work. A direct link you can share anywhere.
          </p>
          <button
            onClick={() => (user ? onNavigate('dashboard') : openAuth('signup'))}
            className="px-9 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-xl shadow-indigo-600/30 inline-flex items-center gap-2"
          >
            Start creating <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ---------------- 10. COMPLIANCE & LEGAL MULTI-COLUMN FOOTER ---------------- */}
      <footer className="py-16 px-4 sm:px-6 border-t border-zinc-900 bg-black/60 text-xs">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand Col */}
          <div className="space-y-3">
            <span className="text-lg font-black tracking-wider text-white">velourmedia.site</span>
            <p className="text-zinc-500 leading-relaxed">
              Premium digital media infrastructure. Direct creator storefronts, electronic asset distribution, and instant customer checkout.
            </p>
            <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-medium pt-1">
              <ShieldCheck size={14} /> PCI-DSS & Merchant Compliant
            </div>
          </div>

          {/* Resources */}
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 mb-3 font-semibold">Resources</p>
            <ul className="space-y-2 text-zinc-500">
              <li><button onClick={() => onNavigate('dashboard')} className="hover:text-zinc-300">Creator studio</button></li>
              <li><button onClick={() => onNavigate('dashboard')} className="hover:text-zinc-300">Your downloads</button></li>
              <li><button onClick={() => onNavigate('support')} className="hover:text-zinc-300">Customer support</button></li>
              <li><button onClick={() => onNavigate('legal')} className="hover:text-zinc-300">System status</button></li>
            </ul>
          </div>

          {/* Legal Policies */}
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 mb-3 font-semibold">Legal & Terms</p>
            <ul className="space-y-2 text-zinc-500">
              <li><button onClick={() => onNavigate('legal')} className="hover:text-emerald-400 font-medium">Terms of service</button></li>
              <li><button onClick={() => onNavigate('legal')} className="hover:text-zinc-300">Privacy policy</button></li>
              <li><button onClick={() => onNavigate('legal')} className="hover:text-zinc-300">Digital refund policy</button></li>
              <li><button onClick={() => onNavigate('legal')} className="hover:text-zinc-300">DMCA takedown requests</button></li>
            </ul>
          </div>

          {/* Trust & Support Contact */}
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 mb-3 font-semibold">Business Support</p>
            <ul className="space-y-2 text-zinc-500">
              <li><a href="mailto:support@velourmedia.site" className="text-indigo-400 hover:text-indigo-300 underline font-medium">support@velourmedia.site</a></li>
              <li className="text-[11px] text-zinc-600">Electronic goods delivered instantly upon confirmation of purchase.</li>
              <li><button onClick={() => onNavigate('legal')} className="hover:text-zinc-300">Merchant disclosures</button></li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-8 border-t border-zinc-900/80 flex flex-col sm:flex-row items-center justify-between text-zinc-600 text-[11px]">
          <p>© 2026 Velour Media. All rights reserved.</p>
          <p className="mt-2 sm:mt-0 font-mono">Merchant Release 4.0</p>
        </div>
      </footer>
    </div>
  );
}
