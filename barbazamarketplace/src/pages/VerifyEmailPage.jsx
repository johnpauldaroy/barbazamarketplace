import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, MailCheck, RefreshCw } from 'lucide-react';
import { resendVerificationEmail } from '../api/EcommerceApi';
import {
  clearPendingVerificationEmail,
  getPendingAuthRedirect,
  getPendingVerificationEmail,
  isUsableEmail,
  normalizeEmail,
} from '../lib/authFlow';

const STATUS_CONTENT = {
  success: {
    icon: CheckCircle2,
    iconClass: 'bg-emerald-50 text-emerald-600',
    title: 'Email verified',
    description: 'Your email address is confirmed. You can now log in to your e-KoopMart account.',
  },
  'already-verified': {
    icon: CheckCircle2,
    iconClass: 'bg-blue-50 text-[#2954C8]',
    title: 'Email already verified',
    description: 'This address was already confirmed. Log in to continue to your account.',
  },
  invalid: {
    icon: AlertTriangle,
    iconClass: 'bg-amber-50 text-amber-600',
    title: 'Verification link unavailable',
    description: 'This link is invalid or has expired. Request a fresh verification email below.',
  },
};

const VerifyEmailPage = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const rawStatus = searchParams.get('status');
  const status = Object.prototype.hasOwnProperty.call(STATUS_CONTENT, rawStatus) ? rawStatus : 'pending';
  const storedEmail = getPendingVerificationEmail();
  const stateEmail = isUsableEmail(location.state?.email) ? normalizeEmail(location.state.email) : '';
  const [email, setEmail] = useState(stateEmail || storedEmail);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const redirectPath = getPendingAuthRedirect();
  const initialEmailSent = location.state?.emailSent
    ?? sessionStorage.getItem('pending_verification_sent') !== '0';

  useEffect(() => {
    if (status === 'success' || status === 'already-verified') {
      clearPendingVerificationEmail();
    }
  }, [status]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const content = useMemo(() => {
    if (status !== 'pending') return STATUS_CONTENT[status];
    return {
      icon: initialEmailSent ? MailCheck : AlertTriangle,
      iconClass: initialEmailSent ? 'bg-[#eef3fb] text-[#2954C8]' : 'bg-amber-50 text-amber-600',
      title: initialEmailSent ? 'Check your email' : 'Account created — email not sent',
      description: initialEmailSent
        ? 'Open the verification link we sent to finish setting up your account.'
        : 'We could not deliver the first message. Request a new verification email below.',
    };
  }, [initialEmailSent, status]);

  const handleResend = async (event) => {
    event.preventDefault();
    const normalized = normalizeEmail(email);
    if (!isUsableEmail(normalized)) {
      setError('Enter the email address you used to sign up.');
      return;
    }

    setResending(true);
    setError('');
    setMessage('');
    try {
      const data = await resendVerificationEmail(normalized);
      sessionStorage.setItem('pending_verification_email', normalized);
      sessionStorage.setItem('pending_verification_sent', '1');
      setEmail(normalized);
      setMessage(data?.message || 'If the account is awaiting verification, a new email will arrive shortly.');
      setCooldown(60);
    } catch (requestError) {
      setError(requestError?.message || 'Unable to request another email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const Icon = content.icon;
  const completed = status === 'success' || status === 'already-verified';

  return (
    <>
      <Helmet><title>Email verification — e-KoopMart</title></Helmet>
      <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-12">
        <section className="w-full max-w-md rounded-2xl border border-[#dfe7f4] bg-white p-6 text-center shadow-[0_8px_40px_rgba(15,23,42,0.08)] sm:p-8" aria-labelledby="verification-title">
          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${content.iconClass}`}>
            <Icon className="h-7 w-7" />
          </div>
          <h1 id="verification-title" className="mt-5 text-2xl font-extrabold text-[#0b1739]">{content.title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{content.description}</p>

          {!completed && (
            <form onSubmit={handleResend} className="mt-6 text-left" noValidate>
              <label htmlFor="verification-email" className="mb-1.5 block text-sm font-semibold text-[#0b1739]">Email address</label>
              <input id="verification-email" type="email" autoComplete="email" maxLength={254}
                value={email} onChange={(event) => { setEmail(event.target.value); setError(''); }}
                aria-invalid={Boolean(error)} aria-describedby={error ? 'verification-error' : undefined}
                className="h-11 w-full rounded-lg border border-[#dfe7f4] bg-[#f8fafd] px-4 text-base text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2954C8] focus:bg-white focus:ring-2 focus:ring-[#2954C8]/10"
                placeholder="you@example.com" />
              {error && <p id="verification-error" className="mt-2 text-sm font-medium text-red-600" role="alert">{error}</p>}
              {message && <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700" role="status">{message}</p>}
              <button type="submit" disabled={resending || cooldown > 0}
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#2954C8] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1f44a5] disabled:cursor-not-allowed disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${resending ? 'animate-spin' : ''}`} />
                {resending ? 'Requesting email...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
              </button>
            </form>
          )}

          <div className="mt-6 border-t border-[#e8edf6] pt-5 text-sm">
            <Link to={`/login?redirect=${encodeURIComponent(redirectPath)}`} className="font-semibold text-[#2954C8] hover:underline">
              {completed ? 'Continue to log in' : 'Back to log in'}
            </Link>
          </div>
        </section>
      </div>
    </>
  );
};

export default VerifyEmailPage;
