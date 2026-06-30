'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email: email.toLowerCase().trim(),
      password,
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError('Invalid email or password. Please try again.');
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-cream flex">
      {/* Left — branding panel */}
      <div
        className="hidden lg:flex lg:w-[48%] bg-sage-dark flex-col justify-between p-12 relative overflow-hidden"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=900&h=1200&fit=crop)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-sage-dark/80" />
        <div className="relative z-10">
          <div className="font-serif-display text-[42px] text-white leading-tight mb-1">WJ</div>
          <div className="font-serif-display text-[22px] text-white/80">Wealth Journal</div>
          <div className="text-white/50 text-sm mt-1">Personal Narrative</div>
        </div>
        <div className="relative z-10 max-w-sm">
          <p className="font-quote text-2xl italic text-white/90 leading-relaxed mb-6">
            &ldquo;Wealth is not about having a lot of money; it&apos;s about having a lot of options.&rdquo;
          </p>
          <div className="w-8 h-[2px] bg-white/40 mb-4" />
          <p className="text-white/60 text-sm">
            Track every rupee. Build your financial narrative. Understand where your money truly goes.
          </p>
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 text-center">
            <div className="font-serif-display text-[36px] text-sage-dark">Wealth Journal</div>
            <div className="text-text-secondary text-sm mt-1">Personal Narrative</div>
          </div>

          <div className="mb-10">
            <div className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] mb-2">
              Welcome back
            </div>
            <h1 className="font-serif-display text-[32px] text-text-primary leading-tight mb-2">
              Sign in to your journal
            </h1>
            <p className="text-text-secondary text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-sage-dark font-medium hover:underline">
                Create one free
              </Link>
            </p>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 bg-terracotta/10 border border-terracotta/30 rounded text-terracotta text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] block mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full bg-white border border-gray-border rounded px-4 py-3 text-sm text-text-primary
                  placeholder:text-text-muted outline-none transition-all focus:border-sage-dark focus:ring-2 focus:ring-sage-dark/10"
              />
            </div>

            <div>
              <label className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] block mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full bg-white border border-gray-border rounded px-4 py-3 pr-11 text-sm text-text-primary
                    placeholder:text-text-muted outline-none transition-all focus:border-sage-dark focus:ring-2 focus:ring-sage-dark/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-sage-dark text-white rounded flex items-center justify-center gap-2
                text-sm font-semibold tracking-wide transition-all hover:bg-[#333F33] active:scale-[0.99]
                disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-text-muted text-xs text-center mt-8">
            Your financial data is private and encrypted. We never share your information.
          </p>
        </div>
      </div>
    </div>
  );
}
