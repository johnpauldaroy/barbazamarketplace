import {
  getPendingAuthRedirect,
  getPendingVerificationEmail,
  normalizeEmail,
  resolveAuthRedirect,
  savePendingVerification,
} from './authFlow';

beforeEach(() => sessionStorage.clear());

test('normalizes email and rejects unsafe redirect targets', () => {
  expect(normalizeEmail(' Member@Example.COM ')).toBe('member@example.com');
  expect(resolveAuthRedirect('/checkout?step=payment')).toBe('/checkout?step=payment');
  expect(resolveAuthRedirect('//attacker.example/path')).toBe('/');
  expect(resolveAuthRedirect('https://attacker.example')).toBe('/');
});

test('persists only validated pending verification state', () => {
  savePendingVerification({
    email: ' Member@Example.COM ',
    redirect: '/checkout',
    emailSent: false,
  });

  expect(getPendingVerificationEmail()).toBe('member@example.com');
  expect(getPendingAuthRedirect()).toBe('/checkout');
  expect(sessionStorage.getItem('pending_verification_sent')).toBe('0');
});
