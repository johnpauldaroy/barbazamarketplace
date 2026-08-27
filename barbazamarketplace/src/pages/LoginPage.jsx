import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, MailWarning, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { resendVerificationEmail } from '../api/EcommerceApi';
import { normalizeEmail, resolveAuthRedirect, savePendingVerification } from '../lib/authFlow';

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const redirectPath = resolveAuthRedirect(searchParams.get('redirect'));

  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError(null);
    setVerificationRequired(false);
    setResendMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const normalizedEmail = normalizeEmail(form.email);
      const data = await login({ ...form, email: normalizedEmail });
      if (data?.user?.is_admin) navigate('/admin', { replace: true });
      else if (data?.user?.is_merchant) navigate('/merchant', { replace: true });
      else navigate(redirectPath, { replace: true });
    } catch (err) {
      if (err?.code === 'EMAIL_NOT_VERIFIED') {
        const normalizedEmail = normalizeEmail(form.email);
        savePendingVerification({ email: normalizedEmail, redirect: redirectPath, emailSent: true });
        setVerificationRequired(true);
        setError(null);
      } else {
        setError(err?.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMessage('');
    try {
      const data = await resendVerificationEmail(normalizeEmail(form.email));
      setResendMessage(data?.message || 'If the account is awaiting verification, a new email will arrive shortly.');
      setCooldown(60);
    } catch (err) {
      setResendMessage(err?.message || 'Unable to request another email. Please try again.');
    } finally {
      setResending(false);
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

            {verificationRequired && (
              <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left" role="alert">
                <div className="flex gap-3">
                  <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Verify your email before logging in.</p>
                    <p className="mt-1 text-xs leading-5 text-amber-800">Open the link in your verification email, or request a new one.</p>
                    {resendMessage && <p className="mt-2 text-xs font-medium text-amber-900" role="status">{resendMessage}</p>}
                    <button type="button" onClick={handleResend} disabled={resending || cooldown > 0}
                      className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60">
                      <RefreshCw className={`h-4 w-4 ${resending ? 'animate-spin' : ''}`} />
                      {resending ? 'Requesting...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
                    </button>
                  </div>
                </div>
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
                  className="h-11 w-full rounded-lg border border-[#dfe7f4] bg-[#f8fafd] px-4 text-base text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2954C8] focus:bg-white focus:ring-2 focus:ring-[#2954C8]/10"
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
                    className="h-11 w-full rounded-lg border border-[#dfe7f4] bg-[#f8fafd] px-4 pr-11 text-base text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2954C8] focus:bg-white focus:ring-2 focus:ring-[#2954C8]/10"
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
                Sign up
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
