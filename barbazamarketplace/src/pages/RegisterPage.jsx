import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const resolveRedirect = (param) => {
  if (!param || typeof param !== 'string') return '/';
  if (!param.startsWith('/') || param.startsWith('//')) return '/';
  return param;
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const redirectPath = resolveRedirect(searchParams.get('redirect'));

  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.password_confirmation) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const data = await register(form);
      if (data?.user?.is_admin) navigate('/admin', { replace: true });
      else if (data?.user?.is_merchant) navigate('/merchant', { replace: true });
      else navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'h-11 w-full rounded-lg border border-[#dfe7f4] bg-[#f8fafd] px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2954C8] focus:bg-white focus:ring-2 focus:ring-[#2954C8]/10';

  return (
    <>
      <Helmet>
        <title>Create account — e-KoopMart</title>
      </Helmet>

      <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-[#dfe7f4] bg-white p-8 shadow-[0_8px_40px_rgba(15,23,42,0.08)]">
            {/* Header */}
            <div className="mb-7 flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef3fb]">
                <UserPlus className="h-7 w-7 text-[#2954C8]" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-[#0b1739]">Create your account</h1>
                <p className="mt-1 text-sm text-slate-500">Join the Barbaza MPC community marketplace</p>
              </div>
            </div>

            {error && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-[#0b1739]">Full name</label>
                <input
                  id="name" name="name" type="text" required autoComplete="name"
                  value={form.name} onChange={handleChange}
                  className={inputCls} placeholder="Juan dela Cruz"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-[#0b1739]">Email address</label>
                <input
                  id="email" name="email" type="email" required autoComplete="email"
                  value={form.email} onChange={handleChange}
                  className={inputCls} placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-[#0b1739]">Password</label>
                <div className="relative">
                  <input
                    id="password" name="password" type={showPw ? 'text' : 'password'} required autoComplete="new-password"
                    value={form.password} onChange={handleChange}
                    className={`${inputCls} pr-11`} placeholder="At least 8 characters"
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPw ? 'Hide password' : 'Show password'}>
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="password_confirmation" className="mb-1.5 block text-sm font-semibold text-[#0b1739]">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="password_confirmation" name="password_confirmation"
                    type={showConfirm ? 'text' : 'password'} required autoComplete="new-password"
                    value={form.password_confirmation} onChange={handleChange}
                    className={`${inputCls} pr-11`} placeholder="Re-enter password"
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showConfirm ? 'Hide' : 'Show'}>
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full rounded-lg bg-[#2954C8] py-3 text-sm font-semibold text-white transition hover:bg-[#1f44a5] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link
                to={`/login?redirect=${encodeURIComponent(redirectPath)}`}
                className="font-semibold text-[#2954C8] hover:underline"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterPage;
