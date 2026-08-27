import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import VerifyEmailPage from './VerifyEmailPage';
import { resendVerificationEmail } from '../api/EcommerceApi';

let mockStatus = '';
let mockLocationState = null;

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useLocation: () => ({ state: mockLocationState }),
  useSearchParams: () => [new URLSearchParams(mockStatus ? `status=${mockStatus}` : '')],
}), { virtual: true });

jest.mock('../api/EcommerceApi', () => ({ resendVerificationEmail: jest.fn() }));

beforeEach(() => {
  sessionStorage.clear();
  mockStatus = '';
  mockLocationState = null;
  resendVerificationEmail.mockReset();
});

test('renders the successful verification state', () => {
  mockStatus = 'success';
  render(<VerifyEmailPage />);

  expect(screen.getByRole('heading', { name: 'Email verified' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Continue to log in' })).toHaveAttribute('href', '/login?redirect=%2F');
});

test('resends using pending email and starts a cooldown', async () => {
  sessionStorage.setItem('pending_verification_email', 'pending@example.com');
  resendVerificationEmail.mockResolvedValue({
    message: 'If an unverified account exists for that address, a verification email will be sent.',
  });

  render(<VerifyEmailPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Resend verification email' }));

  expect(await screen.findByText(/If an unverified account exists/)).toBeInTheDocument();
  expect(resendVerificationEmail).toHaveBeenCalledWith('pending@example.com');
  expect(screen.getByRole('button', { name: 'Resend in 60s' })).toBeDisabled();
});
