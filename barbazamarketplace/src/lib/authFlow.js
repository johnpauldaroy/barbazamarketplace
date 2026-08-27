const DEFAULT_REDIRECT = '/';

export const resolveAuthRedirect = (value) => {
  if (!value || typeof value !== 'string') return DEFAULT_REDIRECT;
  if (!value.startsWith('/') || value.startsWith('//') || /[\r\n]/.test(value)) return DEFAULT_REDIRECT;
  return value;
};

export const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

export const isUsableEmail = (value) => {
  const normalized = normalizeEmail(value);
  return normalized.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
};

export const getPendingVerificationEmail = () => {
  const value = sessionStorage.getItem('pending_verification_email');
  return isUsableEmail(value) ? normalizeEmail(value) : '';
};

export const getPendingAuthRedirect = () =>
  resolveAuthRedirect(sessionStorage.getItem('pending_auth_redirect'));

export const savePendingVerification = ({ email, redirect = DEFAULT_REDIRECT, emailSent = true }) => {
  const normalizedEmail = normalizeEmail(email);
  if (isUsableEmail(normalizedEmail)) {
    sessionStorage.setItem('pending_verification_email', normalizedEmail);
  }
  sessionStorage.setItem('pending_auth_redirect', resolveAuthRedirect(redirect));
  sessionStorage.setItem('pending_verification_sent', emailSent ? '1' : '0');
};

export const clearPendingVerificationEmail = () => {
  sessionStorage.removeItem('pending_verification_email');
  sessionStorage.removeItem('pending_verification_sent');
};
