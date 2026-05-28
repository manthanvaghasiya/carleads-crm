'use client';

import { useState } from 'react';
import { Shield, KeyRound, Mail, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;
        
        if (data?.user?.identities?.length === 0) {
           setErrorMsg('This email is already registered. Please sign in.');
        } else {
           setSuccessMsg('Success! If email confirmation is enabled in Supabase, please check your inbox. Otherwise, you can sign in now.');
           // If auto sign-in works, we will be redirected. If not, they must check email.
           if (data.session) {
             router.push('/leads');
             router.refresh();
           }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        if (data.session) {
          router.push('/leads');
          router.refresh();
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
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
            {isSignUp ? 'Create an Account' : 'Welcome back'}
          </h2>
          <p className="text-sm text-text-muted text-center mb-8">
            {isSignUp ? 'Sign up to manage your dealership leads' : 'Sign in to access your leads and dashboard'}
          </p>

          {/* Toggle SignIn/SignUp */}
          <div className="flex bg-surface-hover rounded-lg p-1 mb-6 border border-border">
            <button
              onClick={() => { setIsSignUp(false); setErrorMsg(null); setSuccessMsg(null); }}
              type="button"
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${
                !isSignUp
                  ? 'bg-surface shadow text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsSignUp(true); setErrorMsg(null); setSuccessMsg(null); }}
              type="button"
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${
                isSignUp
                  ? 'bg-surface shadow text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dealer@example.com"
                  required
                  className="w-full bg-surface-hover border border-border rounded-lg py-3 pl-10 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-surface-hover border border-border rounded-lg py-3 pl-10 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-fake-bg/50 border border-fake/20 rounded-lg text-fake text-xs font-medium">
                {errorMsg}
              </div>
            )}
            
            {successMsg && (
              <div className="p-3 bg-hot-bg/50 border border-hot/20 rounded-lg text-hot text-xs font-medium">
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover shadow-glow-primary transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Shield size={16} />
              )}
              {isSignUp ? 'Create Account' : 'Sign In'}
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
