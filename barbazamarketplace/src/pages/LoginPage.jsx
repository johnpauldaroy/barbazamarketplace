import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const resolveRedirect = (param) => {
  if (!param || typeof param !== 'string') return '/';
  if (!param.startsWith('/') || param.startsWith('//')) return '/';
  return param;
};

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const redirectPath = resolveRedirect(searchParams.get('redirect'));

  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showPw, setShowPw] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const data = await login(form);
      if (data?.user?.is_admin) navigate('/admin', { replace: true });
      else if (data?.user?.is_merchant) navigate('/merchant', { replace: true });
      else navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Log in — e-KoopMart</title>
      </Helmet>

      <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="rounded-2xl border border-[#dfe7f4] bg-white p-8 shadow-[0_8px_40px_rgba(15,23,42,0.08)]">
            {/* Logo */}
            <div className="mb-7 flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef3fb]">
                <img src="/brand-logo-transparent.png" alt="e-KoopMart logo" className="h-10 w-10 object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-[#0b1739]">Welcome back</h1>
                <p className="mt-1 text-sm text-slate-500">Log in to your e-KoopMart account</p>
              </div>
            </div>

            {error && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-[#0b1739]">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  className="h-11 w-full rounded-lg border border-[#dfe7f4] bg-[#f8fafd] px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2954C8] focus:bg-white focus:ring-2 focus:ring-[#2954C8]/10"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-[#0b1739]">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={form.password}
                    onChange={handleChange}
                    className="h-11 w-full rounded-lg border border-[#dfe7f4] bg-[#f8fafd] px-4 pr-11 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2954C8] focus:bg-white focus:ring-2 focus:ring-[#2954C8]/10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full rounded-lg bg-[#2954C8] py-3 text-sm font-semibold text-white transition hover:bg-[#1f44a5] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Logging in...' : 'Log in'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Don't have an account?{' '}
              <Link
                to={`/register?redirect=${encodeURIComponent(redirectPath)}`}
                className="font-semibold text-[#2954C8] hover:underline"
              >
                Create account
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            By logging in you agree to our{' '}
            <Link to="/about" className="hover:underline">terms and cooperative values</Link>.
          </p>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
