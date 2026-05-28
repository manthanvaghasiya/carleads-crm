'use client';

import { useState } from 'react';
import { Shield, KeyRound, Mail, ArrowRight, Loader2, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [method, setMethod] = useState('phone'); // 'phone' | 'email'
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Mock Supabase Auth behavior
    setTimeout(() => {
      setLoading(false);
      setSent(true);
      setTimeout(() => {
        router.push('/');
      }, 1500);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-hover border border-border flex items-center justify-center shadow-glow-primary">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-tight">
                CarLeads<span className="text-primary-muted">CRM</span>
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-text-muted font-medium">
                Sales Intelligence
              </p>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="card p-6 md:p-8 shadow-elevated border-border">
          <h2 className="text-xl font-semibold text-text-primary mb-2 text-center">
            Welcome back
          </h2>
          <p className="text-sm text-text-muted text-center mb-8">
            Sign in to access your leads and dashboard
          </p>

          {/* Toggle Phone/Email */}
          <div className="flex bg-surface-hover rounded-lg p-1 mb-6 border border-border">
            <button
              onClick={() => setMethod('phone')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${
                method === 'phone'
                  ? 'bg-surface shadow text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Phone size={14} /> Phone
            </button>
            <button
              onClick={() => setMethod('email')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${
                method === 'email'
                  ? 'bg-surface shadow text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Mail size={14} /> Email
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">
                {method === 'phone' ? 'Phone Number' : 'Email Address'}
              </label>
              <div className="relative">
                {method === 'phone' ? (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
                    +91
                  </span>
                ) : (
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                )}
                <input
                  type={method === 'phone' ? 'tel' : 'email'}
                  placeholder={method === 'phone' ? '99999 99999' : 'dealer@example.com'}
                  required
                  className={`w-full bg-surface-hover border border-border rounded-lg py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors ${
                    method === 'phone' ? 'pl-10 pr-3 font-mono-numbers' : 'pl-10 pr-3'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || sent}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover shadow-glow-primary transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending magic link...
                </>
              ) : sent ? (
                <>
                  <Shield size={16} />
                  Login successful
                </>
              ) : (
                <>
                  <KeyRound size={16} />
                  Send Magic Link
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-text-muted text-center mt-6">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
