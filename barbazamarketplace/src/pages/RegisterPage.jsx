import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isUsableEmail, normalizeEmail, resolveAuthRedirect, savePendingVerification } from '../lib/authFlow';

const INITIAL_FORM = { name: '', email: '', password: '', password_confirmation: '' };

const validateField = (name, value, form) => {
  if (name === 'name') {
    const normalized = value.trim();
    if (!normalized) return 'Enter your full name.';
    if (normalized.length < 2) return 'Full name must contain at least 2 characters.';
    if (normalized.length > 100) return 'Full name must not exceed 100 characters.';
  }
  if (name === 'email') {
    if (!value.trim()) return 'Enter your email address.';
    if (!isUsableEmail(value)) return 'Enter a valid email address.';
  }
  if (name === 'password') {
    if (!value) return 'Create a password.';
    if (value.length < 8) return 'Password must contain at least 8 characters.';
    if (value.length > 72) return 'Password must not exceed 72 characters.';
  }
  if (name === 'password_confirmation') {
    if (!value) return 'Confirm your password.';
    if (value !== form.password) return 'Passwords do not match.';
  }
  return '';
};

const validateForm = (form) => Object.keys(form).reduce((errors, name) => {
  const message = validateField(name, form[name], form);
  if (message) errors[name] = message;
  return errors;
}, {});

const serverErrors = (error) => Object.entries(error?.errors || {}).reduce((errors, [name, messages]) => {
  const message = Array.isArray(messages) ? messages[0] : messages;
  if (message) errors[name] = String(message);
  return errors;
}, {});

const RegisterPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const redirectPath = resolveAuthRedirect(searchParams.get('redirect'));

  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
    setError(null);
  };

  const handleBlur = (event) => {
    const { name, value } = event.target;
    const nextForm = { ...form, [name]: value };
    setFieldErrors((current) => ({ ...current, [name]: validateField(name, value, nextForm) }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setError(null);
    const normalizedEmail = normalizeEmail(form.email);

    try {
      const data = await register({
        ...form,
        name: form.name.trim(),
        email: normalizedEmail,
      });
      savePendingVerification({
        email: normalizedEmail,
        redirect: redirectPath,
        emailSent: data?.verification_email_sent !== false,
      });
      navigate('/verify-email', {
        replace: true,
        state: {
          email: normalizedEmail,
          emailSent: data?.verification_email_sent !== false,
        },
      });
    } catch (requestError) {
      const nextServerErrors = serverErrors(requestError);
      setFieldErrors((current) => ({ ...current, ...nextServerErrors }));
      if (Object.keys(nextServerErrors).length === 0) {
        setError(requestError?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (name) => [
    'h-11 w-full rounded-lg border bg-[#f8fafd] px-4 text-base text-slate-700 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2',
    fieldErrors[name]
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
      : 'border-[#dfe7f4] focus:border-[#2954C8] focus:ring-[#2954C8]/10',
  ].join(' ');

  const fieldError = (name) => fieldErrors[name] ? (
    <p id={`${name}-error`} className="mt-1.5 text-xs font-medium text-red-600" role="alert">
      {fieldErrors[name]}
    </p>
  ) : null;

  return (
    <>
      <Helmet><title>Sign up — e-KoopMart</title></Helmet>

      <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-[#dfe7f4] bg-white p-6 shadow-[0_8px_40px_rgba(15,23,42,0.08)] sm:p-8">
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
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-[#0b1739]">Full name</label>
                <input id="name" name="name" type="text" autoComplete="name" maxLength={100}
                  value={form.name} onChange={handleChange} onBlur={handleBlur}
                  aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                  className={inputClass('name')} placeholder="Juan dela Cruz" />
                {fieldError('name')}
              </div>

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-[#0b1739]">Email address</label>
                <input id="email" name="email" type="email" autoComplete="email" maxLength={254}
                  value={form.email} onChange={handleChange} onBlur={handleBlur}
                  aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  className={inputClass('email')} placeholder="you@example.com" />
                {fieldError('email')}
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-[#0b1739]">Password</label>
                <div className="relative">
                  <input id="password" name="password" type={showPw ? 'text' : 'password'} autoComplete="new-password" maxLength={72}
                    value={form.password} onChange={handleChange} onBlur={handleBlur}
                    aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? 'password-error' : 'password-hint'}
                    className={`${inputClass('password')} pr-11`} placeholder="At least 8 characters" />
                  <button type="button" onClick={() => setShowPw((value) => !value)}
                    className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded text-slate-400 transition-colors hover:text-slate-600"
                    aria-label={showPw ? 'Hide password' : 'Show password'}>
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldError('password') || <p id="password-hint" className="mt-1.5 text-xs text-slate-500">Use 8–72 characters.</p>}
              </div>

              <div>
                <label htmlFor="password_confirmation" className="mb-1.5 block text-sm font-semibold text-[#0b1739]">Confirm password</label>
                <div className="relative">
                  <input id="password_confirmation" name="password_confirmation" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" maxLength={72}
                    value={form.password_confirmation} onChange={handleChange} onBlur={handleBlur}
                    aria-invalid={Boolean(fieldErrors.password_confirmation)}
                    aria-describedby={fieldErrors.password_confirmation ? 'password_confirmation-error' : undefined}
                    className={`${inputClass('password_confirmation')} pr-11`} placeholder="Re-enter password" />
                  <button type="button" onClick={() => setShowConfirm((value) => !value)}
                    className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded text-slate-400 transition-colors hover:text-slate-600"
                    aria-label={showConfirm ? 'Hide confirmation password' : 'Show confirmation password'}>
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldError('password_confirmation')}
              </div>

              <button type="submit" disabled={submitting}
                className="mt-2 min-h-11 w-full rounded-lg bg-[#2954C8] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1f44a5] disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? 'Creating account...' : 'Sign up'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to={`/login?redirect=${encodeURIComponent(redirectPath)}`} className="font-semibold text-[#2954C8] hover:underline">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterPage;
