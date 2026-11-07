import { useState } from 'react';
import { useStore } from '../lib/store';
import { Navbar } from '../components/Navbar';
import {
  Sparkles,
  ArrowRight,
  Lock,
  Unlock,
  Eye,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Share2,
  Image as ImageIcon,
  Video,
  FileText,
  ChevronDown,
  HelpCircle,
  Copy,
  Check,
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
  const [linkCopied, setLinkCopied] = useState<boolean>(false);

  // Earnings Calculator state
  const [calcPrice, setCalcPrice] = useState<number>(24);
  const [calcSales, setCalcSales] = useState<number>(120);
  const platformFeeRate = 0.30; // 30% Velour Platform Fee

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

  const faqs = [
    {
      q: 'What can I sell?',
      a: 'Original photos, high-definition videos, audio sets, and digital publications. You must hold copyright or authorized rights. All media is reviewed to meet compliance and safety rules.',
    },
    {
      q: 'How much can I charge?',
      a: 'Posts can be set as free or priced between $10.00 and $999.00 USD per unlock.',
    },
    {
      q: 'Do I need to be 18+ to use Velour?',
      a: 'Yes. You must be at least 18 years of age. All creators must complete mandatory one-time identity verification (KYC) before any content can be posted.',
    },
    {
      q: 'How do fans access their purchase?',
      a: 'Immediately after checkout verification, fans gain access to decrypt and view the media directly in their browser. No mandatory software download or monthly subscription is required.',
    },
    {
      q: 'What are the platform fees?',
      a: 'Velour charges a flat 30% platform fee per unlock. You keep 70% of every sale with clear reporting in your dashboard.',
    },
    {
      q: 'When can I receive a payout?',
      a: 'Once your identity is verified and funds clear the standard clearance window, you can request direct withdrawals from your Wallet to your configured payout method.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      <Navbar onNavigate={onNavigate} currentPath="" />

      {/* ---------------- 01. HERO SECTION ---------------- */}
      <section className="relative overflow-hidden pt-28 pb-20 px-4 sm:px-6 lg:px-8 border-b border-zinc-900">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 mb-6">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            18+ Verified Digital Content Platform
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.08]">
            Your content. <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              Your direct income.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            Sell photos, videos, and private digital sets from one single link. Create your page, set your price, and share it anywhere.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <button
                onClick={() => onNavigate('dashboard')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                Go to Dashboard <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={() => openAuth('signup')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                Start Creating <ArrowRight size={16} />
              </button>
            )}

            <a
              href="#try-it"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-semibold transition-all flex items-center justify-center"
            >
              See How It Works
            </a>
          </div>

          {/* Sample post pill chips (Unlocky exact style) */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3 text-xs">
            <span className="px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-300 flex items-center gap-1.5">
              <ImageIcon size={13} className="text-indigo-400" /> Photo set · $18
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-300 flex items-center gap-1.5">
              <Video size={13} className="text-purple-400" /> 4:32 Video · $24
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-300 flex items-center gap-1.5">
              <FileText size={13} className="text-emerald-400" /> Digital Pack · $15
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-300 flex items-center gap-1.5">
              <Lock size={13} className="text-amber-400" /> Pay-to-Unlock
            </span>
          </div>

          <p className="mt-3 text-[11px] text-zinc-600">Sample posts · Illustrative prices · Instant unlocks</p>
        </div>
      </section>

      {/* ---------------- 02. HOW IT WORKS (3 STEPS) ---------------- */}
      <section className="py-24 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">01 How It Works</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Made by you. Unlocked by them.</h2>
          <p className="text-sm text-zinc-400 mt-2 max-w-md mx-auto">Your work deserves more than a quick scroll past. Give it a place, a price, and a link of its own.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="rounded-3xl bg-zinc-900/50 border border-zinc-800/80 p-7 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-indigo-400 tracking-wider">01</span>
              <h3 className="text-xl font-bold text-white mt-3 mb-2">Create</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                Photos, videos, audio, or PDFs. Choose what to share and set your price. Verify your identity (KYC) before publishing.
              </p>
            </div>
            <div className="rounded-2xl bg-zinc-950 border border-zinc-800/90 p-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-zinc-400">New post · Draft</span>
                <span className="text-emerald-400 flex items-center gap-1 text-[11px] font-medium">
                  <CheckCircle2 size={12} /> Identity verified
                </span>
              </div>
              <p className="text-sm font-semibold text-white truncate">Golden Hour · 12 Photos</p>
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-zinc-900 text-xs text-zinc-400">
                <span>Price: <strong className="text-white">$18.00</strong></span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[11px]">Ready</span>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="rounded-3xl bg-zinc-900/50 border border-zinc-800/80 p-7 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-purple-400 tracking-wider">02</span>
              <h3 className="text-xl font-bold text-white mt-3 mb-2">Share</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                One link. Anywhere you are. Your bio, your story, a message. Take your content to the audience you already have.
              </p>
            </div>
            <div className="rounded-2xl bg-zinc-950 border border-zinc-800/90 p-4">
              <p className="text-xs text-zinc-400 mb-1.5">Your link · Live</p>
              <div className="flex items-center justify-between bg-zinc-900 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 border border-zinc-800">
                <span className="truncate">velourmedia.site/@maya</span>
                <button onClick={handleCopyLink} className="text-indigo-400 hover:text-indigo-300 ml-2">
                  {linkCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
              <div className="mt-3 flex gap-2 text-[10px] text-zinc-500 justify-center">
                <span>Bio Link</span> • <span>Story</span> • <span>Direct Message</span>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="rounded-3xl bg-zinc-900/50 border border-zinc-800/80 p-7 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-400 tracking-wider">03</span>
              <h3 className="text-xl font-bold text-white mt-3 mb-2">Unlock</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                A moment worth unlocking. Once payment is confirmed, your buyer gets instant access to their purchase.
              </p>
            </div>
            <div className="rounded-2xl bg-zinc-950 border border-zinc-800/90 p-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-zinc-400">Sample sale</span>
                <span className="text-emerald-400 font-semibold text-[11px]">Payment Confirmed</span>
              </div>
              <p className="text-sm font-semibold text-white">Golden Hour · Photo Set</p>
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-zinc-900 text-xs">
                <span className="text-zinc-400">Total: $18.00</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Unlock size={12} /> Access Granted
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 03. TRY IT (INTERACTIVE SIMULATOR) ---------------- */}
      <section id="try-it" className="py-24 px-4 sm:px-6 bg-zinc-900/30 border-y border-zinc-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">02 Try It</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Your first link starts here.</h2>
            <p className="text-sm text-zinc-400 mt-2">Make a sample post. Set a price. See how it feels.</p>
          </div>

          {/* Tab Selector */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-xl bg-zinc-900 p-1 border border-zinc-800">
              <button
                onClick={() => setSimulatorMode('editor')}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  simulatorMode === 'editor' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Editor
              </button>
              <button
                onClick={() => setSimulatorMode('fan')}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  simulatorMode === 'fan' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Fan view
              </button>
            </div>
          </div>

          {/* Interactive Card */}
          <div className="rounded-3xl bg-zinc-900/90 border border-zinc-800 p-6 sm:p-8 max-w-lg mx-auto shadow-2xl">
            {simulatorMode === 'editor' ? (
              /* EDITOR VIEW */
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-xs">
                  <span className="text-zinc-400">Sample post · not published</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]">
                    Editor
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Title</label>
                  <input
                    type="text"
                    disabled
                    value="Golden hour"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Price (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-zinc-500 text-sm">$</span>
                    <input
                      type="number"
                      value={simPrice}
                      min={10}
                      max={999}
                      onChange={(e) => setSimPrice(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <span className="text-[11px] text-zinc-500 mt-1 block">Posts are free ($0) or at least $10, up to $999.</span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <p className="text-sm font-medium text-white">Blur the preview for visitors</p>
                    <p className="text-xs text-zinc-500">Visitors see a blurred preview until they unlock</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={simBlur}
                    onChange={(e) => setSimBlur(e.target.checked)}
                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                <button
                  onClick={() => setSimulatorMode('fan')}
                  className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-sm transition-colors flex items-center justify-center gap-2 mt-4"
                >
                  <Eye size={16} /> Preview as a fan
                </button>
              </div>
            ) : (
              /* FAN VIEW (LOCKED / UNLOCKED) */
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800 text-xs text-zinc-400">
                  <span className="font-mono">velourmedia.site/@maya</span>
                  <span>{simUnlocked ? 'Access granted' : 'Preview'}</span>
                </div>

                <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-5">
                  <img
                    src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80"
                    alt="Golden hour set"
                    className={`w-full h-full object-cover transition-all duration-700 ${
                      !simUnlocked && simBlur ? 'blur-xl scale-110' : 'blur-0 scale-100'
                    }`}
                  />

                  {!simUnlocked && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white mb-3">
                        <Lock size={22} />
                      </div>
                      <p className="text-white font-bold text-base">Locked Content</p>
                      <p className="text-xs text-zinc-300 mt-1 max-w-xs">
                        Seven photos from one week in linen. One payment, then full-resolution files are yours.
                      </p>
                    </div>
                  )}

                  {simUnlocked && (
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-emerald-500/90 text-white text-xs font-semibold backdrop-blur-md flex items-center gap-1 shadow-lg">
                      <Unlock size={12} /> Access Granted
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-base">Golden hour · Photo set</h4>
                      <p className="text-xs text-zinc-400">12 photos · 4:5 Full Resolution</p>
                    </div>
                    <span className="text-lg font-bold text-white">${simPrice.toFixed(2)}</span>
                  </div>

                  {!simUnlocked ? (
                    <button
                      onClick={() => setSimUnlocked(true)}
                      className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                    >
                      <Lock size={15} /> Unlock for ${simPrice.toFixed(2)}
                    </button>
                  ) : (
                    <button
                      onClick={() => setSimUnlocked(false)}
                      className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
                    >
                      Reset Lock Preview
                    </button>
                  )}

                  <button
                    onClick={() => setSimulatorMode('editor')}
                    className="w-full text-center text-xs text-zinc-500 hover:text-zinc-400 py-1"
                  >
                    Back to the editor
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------------- 04. FEATURES (PUBLIC PROFILE DEMO) ---------------- */}
      <section className="py-24 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">03 Features</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">One home. Your own presence.</h2>
          <p className="text-sm text-zinc-400 mt-2 max-w-md mx-auto">Your profile, your posts, your audience. Explore the clean page your visitors see.</p>
        </div>

        <div className="max-w-2xl mx-auto rounded-3xl bg-zinc-900 border border-zinc-800 p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800 text-xs text-zinc-500">
            <span>Your public page</span>
            <span className="font-mono text-zinc-400">velourmedia.site/@maya-studio</span>
          </div>

          <div className="pt-6 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 mx-auto mb-4 border-2 border-zinc-800 flex items-center justify-center text-xl font-bold text-white">
              MS
            </div>
            <h3 className="text-lg font-bold text-white">Maya Studio</h3>
            <p className="text-xs text-zinc-400">@maya-studio</p>
            <p className="text-xs text-zinc-400 mt-2 max-w-sm mx-auto">
              Photographer and video creator. Photo sets, behind-the-scenes video, delivered as full-resolution files.
            </p>

            <div className="mt-8 flex justify-center gap-6 border-b border-zinc-800 pb-3 text-xs font-semibold text-zinc-400">
              <span className="text-white border-b-2 border-indigo-500 pb-3">Feed</span>
              <span>Unlocked</span>
              <span>Videos</span>
            </div>

            <div className="mt-6 rounded-2xl bg-zinc-950 border border-zinc-800 p-4 text-left flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Studio session · 4K Video</p>
                <p className="text-xs text-zinc-500">4:32 Video · Behind the scenes</p>
              </div>
              <span className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold">
                Unlock for $24.00
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 05. PRICING & EARNINGS CALCULATOR ---------------- */}
      <section className="py-24 px-4 sm:px-6 bg-zinc-900/30 border-y border-zinc-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">04 Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">See the numbers before you sell.</h2>
            <p className="text-sm text-zinc-400 mt-2">Try different prices and fees to estimate your take-home earnings.</p>
          </div>

          <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6 sm:p-10 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">Price per sale (USD)</span>
                  <span className="font-bold text-white">${calcPrice}</span>
                </div>
                <input
                  type="range" min="10" max="150" step="1"
                  value={calcPrice}
                  onChange={(e) => setCalcPrice(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">Number of sales</span>
                  <span className="font-bold text-white">{calcSales} buyers</span>
                </div>
                <input
                  type="range" min="10" max="1000" step="10"
                  value={calcSales}
                  onChange={(e) => setCalcSales(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-zinc-800 text-center">
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                <p className="text-xs text-zinc-500">Gross sales</p>
                <p className="text-xl font-bold text-zinc-200 mt-1">${grossTotal.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                <p className="text-xs text-zinc-500">Velour platform fee (30%)</p>
                <p className="text-xl font-bold text-rose-400 mt-1">-${platformFeeTotal.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30">
                <p className="text-xs text-indigo-400 font-semibold">Your net earnings (70%)</p>
                <p className="text-2xl font-black text-white mt-1">${creatorNetTotal.toLocaleString()}</p>
              </div>
            </div>

            <p className="mt-6 text-[11px] text-zinc-600 text-center">
              An illustration, not a payout quote. Processing and payout fees, reserves, and payout timing can change the final result.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- 06. FAQ SECTION (UNLOCKY ACCORDION) ---------------- */}
      <section className="py-24 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">05 FAQ</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">A few good questions.</h2>
          <p className="text-sm text-zinc-400 mt-2">Find practical details about creating, selling, and getting paid.</p>
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

      {/* ---------------- 07. FINAL CTA ---------------- */}
      <section className="py-20 px-4 sm:px-6 max-w-5xl mx-auto text-center border-t border-zinc-900">
        <div className="rounded-3xl bg-gradient-to-b from-indigo-950/40 to-zinc-900 border border-indigo-500/20 p-10 sm:p-14">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">06 Start</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Make your next post count.</h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto mb-8">
            A page for your work. A link you can share anywhere.
          </p>
          <button
            onClick={() => (user ? onNavigate('dashboard') : openAuth('signup'))}
            className="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-lg shadow-indigo-600/30 inline-flex items-center gap-2"
          >
            Start creating <ArrowRight size={16} />
          </button>
          <p className="mt-4 text-[11px] text-zinc-500">18+ · Identity verification and content rules apply.</p>
        </div>
      </section>

      {/* ---------------- 08. FOOTER WITH LEGAL LINKS ---------------- */}
      <footer className="py-12 px-4 sm:px-6 border-t border-zinc-900 text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <p>© 2026 Velour Media. All rights reserved. 18+ Verified Platform.</p>
          <div className="flex flex-wrap justify-center gap-6">
            <button onClick={() => onNavigate('terms')} className="hover:text-zinc-300 transition-colors">Terms of Service</button>
            <button onClick={() => onNavigate('privacy')} className="hover:text-zinc-300 transition-colors">Privacy Policy</button>
            <button onClick={() => onNavigate('refund-policy')} className="hover:text-zinc-300 transition-colors">Refund Policy</button>
            <button onClick={() => onNavigate('support')} className="hover:text-zinc-300 transition-colors">Contact Support</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
