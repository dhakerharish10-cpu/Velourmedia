import { useState } from 'react';
import { ArrowLeft, Mail, User, MessageSquare, Loader2, Send, Check } from 'lucide-react';

interface SupportPageProps {
  onNavigate: (path: string) => void;
}

export function SupportPage({ onNavigate }: SupportPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('Payment Issue');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`[${category}] Support Request - ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nCategory: ${category}\n\nMessage:\n${message}`
    );
    window.location.href = `mailto:support@velourmedia.site?subject=${subject}&body=${body}`;
  };

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
            <MessageSquare size={22} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Help &amp; Support</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Have a question or need assistance with your guest checkout?
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl glass border border-slate-200 dark:border-zinc-700/50 p-6 sm:p-8 shadow-2xl">
          {sent ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <Check size={28} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Message Sent</h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2 max-w-sm mx-auto">
                Thanks for reaching out! We will get back to you within 24 hours at the email you provided.
              </p>
              <button
                onClick={() => onNavigate('')}
                className="mt-6 px-6 py-2.5 rounded-xl bg-emerald-500 text-slate-900 dark:text-white font-semibold text-sm hover:bg-emerald-400 transition-colors"
              >
                Back to Home
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="John Doe"
                    className="w-full rounded-xl bg-slate-50 dark:bg-zinc-950 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-700/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full rounded-xl bg-slate-50 dark:bg-zinc-950 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-700/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-zinc-950 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-700/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                >
                  <option>Payment Issue</option>
                  <option>Content Access</option>
                  <option>General Inquiry</option>
                </select>
              </div>

              <div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={5}
                  placeholder="Tell us how we can help..."
                  className="w-full rounded-xl bg-slate-50 dark:bg-zinc-950 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-700/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-emerald-500 text-slate-900 dark:text-white font-semibold py-3 hover:bg-emerald-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                {submitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Send size={18} />
                    Send Message
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Direct email box */}
        <div className="mt-6 rounded-xl bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 p-4 text-center">
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            Email us directly at{' '}
            <a href="mailto:support@velourmedia.site" className="text-emerald-600 dark:text-emerald-400 font-medium hover:text-emerald-300 transition-colors">
              support@velourmedia.site
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
