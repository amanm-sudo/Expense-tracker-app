'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight, Check } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    // 1. Register user
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.toLowerCase().trim(), password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Registration failed. Please try again.');
      setLoading(false);
      return;
    }

    // 2. Auto-login after registration
    const result = await signIn('credentials', {
      email: email.toLowerCase().trim(),
      password,
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError('Account created but sign-in failed. Please go to login.');
    } else {
      router.push('/');
      router.refresh();
    }
  };

  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthColors = ['', 'bg-terracotta', 'bg-pending-amber', 'bg-paid-green'];
  const strengthLabels = ['', 'Too short', 'Good', 'Strong'];

  return (
    <div className="min-h-screen bg-cream flex">
      {/* Left — branding panel */}
      <div
        className="hidden lg:flex lg:w-[48%] bg-sage-dark flex-col justify-between p-12 relative overflow-hidden"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1579621970590-9d152da524f6?w=900&h=1200&fit=crop)',
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
          <div className="space-y-4 mb-8">
            {[
              'Track every expense with elegance',
              'AI-powered personal financial notes',
              'Recurring obligations at a glance',
              'Beautiful analytics — your story in numbers',
            ].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Check size={11} className="text-white" />
                </div>
                <span className="text-white/80 text-sm">{f}</span>
              </div>
            ))}
          </div>
          <div className="w-8 h-[2px] bg-white/40" />
        </div>
      </div>

      {/* Right — register form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 text-center">
            <div className="font-serif-display text-[36px] text-sage-dark">Wealth Journal</div>
            <div className="text-text-secondary text-sm mt-1">Personal Narrative</div>
          </div>

          <div className="mb-10">
            <div className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] mb-2">
              Get started — it&apos;s free
            </div>
            <h1 className="font-serif-display text-[32px] text-text-primary leading-tight mb-2">
              Create your journal
            </h1>
            <p className="text-text-secondary text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-sage-dark font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 bg-terracotta/10 border border-terracotta/30 rounded text-terracotta text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] block mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                placeholder="Alex Kumar"
                className="w-full bg-white border border-gray-border rounded px-4 py-3 text-sm text-text-primary
                  placeholder:text-text-muted outline-none transition-all focus:border-sage-dark focus:ring-2 focus:ring-sage-dark/10"
              />
            </div>

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
                  autoComplete="new-password"
                  placeholder="Min. 6 characters"
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
              {/* Password strength */}
              {password.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          passwordStrength >= level ? strengthColors[passwordStrength] : 'bg-gray-border'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-text-muted">{strengthLabels[passwordStrength]}</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] block mb-2">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Repeat your password"
                className={`w-full bg-white border rounded px-4 py-3 text-sm text-text-primary
                  placeholder:text-text-muted outline-none transition-all focus:ring-2 ${
                    confirmPassword && confirmPassword !== password
                      ? 'border-terracotta focus:ring-terracotta/10 focus:border-terracotta'
                      : 'border-gray-border focus:border-sage-dark focus:ring-sage-dark/10'
                  }`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-sage-dark text-white rounded flex items-center justify-center gap-2
                text-sm font-semibold tracking-wide transition-all hover:bg-[#333F33] active:scale-[0.99]
                disabled:opacity-60 disabled:cursor-not-allowed !mt-6"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating your journal…
                </span>
              ) : (
                <>
                  Create Journal
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-text-muted text-xs text-center mt-6">
            By creating an account you agree to our privacy policy. Your data belongs to you.
          </p>
        </div>
      </div>
    </div>
  );
}
