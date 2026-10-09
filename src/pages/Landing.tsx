import { useStore } from '../lib/store';
import { Navbar } from '../components/Navbar';
import {
  Sparkles, ArrowRight, Lock, Globe, Wallet, Check, Percent,
} from 'lucide-react';

interface LandingProps {
  onNavigate: (path: string) => void;
}

export function Landing({ onNavigate }: LandingProps) {
  const { user, openAuth } = useStore();

  return (
    <div className="min-h-screen bg-white">
      <Navbar onNavigate={onNavigate} currentPath="" />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-100/60 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-indigo-50 rounded-full blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-20">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-medium text-indigo-600 mb-6 animate-fade-in">
              <Sparkles size={12} />
              Premium Digital Content Platform
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-sm font-semibold text-emerald-700 mb-6 animate-fade-in">
              <Percent size={14} />
              Keep 70% of your sales
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-slate-900 tracking-tight leading-[1.05] animate-slide-up">
              Premium Digital
              <br />
              <span className="text-gradient">Content Platform</span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed animate-slide-up">
              Instant access to exclusive premium creator content with fast, secure guest checkouts. Flat 30% platform fee — no hidden monthly subscriptions or surprise charges.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center animate-slide-up">
              {user ? (
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="px-8 py-3.5 rounded-xl bg-gradient-brand text-slate-900 dark:text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  Go to Dashboard
                  <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  onClick={() => openAuth('signup')}
                  className="px-8 py-3.5 rounded-xl bg-gradient-brand text-slate-900 dark:text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  Explore Content
                  <ArrowRight size={18} />
                </button>
              )}
              {!user && (
                <button
                  onClick={() => openAuth('signup')}
                  className="px-8 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 dark:bg-zinc-950 transition-colors flex items-center justify-center gap-2"
                >
                  Create Account
                </button>
              )}
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> Instant access</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> Guest checkout</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> Secure payments</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> No account needed</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">Everything you need to monetize</h2>
          <p className="text-slate-500 max-w-xl mx-auto">Powerful tools built for creators who want to turn their audience into sustainable revenue.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: Lock,
              title: 'Premium Content Paywall',
              desc: 'Lock your best photos and videos behind a paywall. Only paying fans get full access — you set the price for every piece.',
            },
            {
              icon: Globe,
              title: 'Global USD Payments',
              desc: 'Fans worldwide can purchase your content with crypto or card. Get paid reliably in a stable global currency.',
            },
            {
              icon: Wallet,
              title: 'Fast Secure Payouts',
              desc: 'Withdraw your earnings with secure, automated payouts. Transparent fees, no hidden charges.',
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl bg-white border border-slate-200 p-6 hover:border-indigo-200 hover:shadow-md transition-all group">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <f.icon size={24} className="text-indigo-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="rounded-3xl bg-gradient-brand-card p-8 md:p-12 text-center relative overflow-hidden shadow-xl shadow-indigo-600/20">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-white/10 rounded-full blur-[80px]" />
            <div className="relative">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">Ready to start monetizing?</h2>
              <p className="text-indigo-100 mb-6 max-w-lg mx-auto">
                Join Velour today and start selling your premium content directly to your fans. Keep 70% of every sale — flat 30% fee, no surprises.
              </p>
              <button
                onClick={() => openAuth('signup')}
                className="px-8 py-3.5 rounded-xl bg-white text-indigo-600 font-semibold hover:bg-indigo-50 transition-colors inline-flex items-center gap-2 shadow-lg"
              >
                Create your free account
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </section>
      )}

      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-400">Velour — Premium Creator Content Platform</p>
          <div className="flex items-center gap-5 text-sm">
            <button onClick={() => onNavigate('support')} className="text-slate-400 hover:text-slate-700 transition-colors">Support</button>
            <button onClick={() => onNavigate('privacy')} className="text-slate-400 hover:text-slate-700 transition-colors">Privacy Policy</button>
            <button onClick={() => onNavigate('terms')} className="text-slate-400 hover:text-slate-700 transition-colors">Terms of Service</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
