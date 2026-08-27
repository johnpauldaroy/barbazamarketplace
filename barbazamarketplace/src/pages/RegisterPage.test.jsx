import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RegisterPage from './RegisterPage';
import { useAuth } from '../hooks/useAuth';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams('redirect=%2Fcheckout')],
}), { virtual: true });

jest.mock('../hooks/useAuth', () => ({ useAuth: jest.fn() }));

const fillValidForm = () => {
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Juan dela Cruz' } });
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: ' Juan@Example.COM ' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'SecurePass123' } });
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'SecurePass123' } });
};

beforeEach(() => {
  sessionStorage.clear();
  mockNavigate.mockReset();
  useAuth.mockReset();
});

test('shows accessible inline errors before submitting invalid values', () => {
  const register = jest.fn();
  useAuth.mockReturnValue({ register });
  render(<RegisterPage />);

  fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));

  expect(screen.getByText('Enter your full name.')).toBeInTheDocument();
  expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
  expect(screen.getByLabelText('Email address')).toHaveAttribute('aria-invalid', 'true');
  expect(register).not.toHaveBeenCalled();
});

test('maps duplicate server validation to the email field', async () => {
  const duplicate = Object.assign(new Error('The email has already been taken.'), {
    status: 422,
    errors: { email: ['An account with this email address already exists.'] },
  });
  useAuth.mockReturnValue({ register: jest.fn().mockRejectedValue(duplicate) });
  render(<RegisterPage />);
  fillValidForm();

  fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));

  expect(await screen.findByText('An account with this email address already exists.')).toBeInTheDocument();
  expect(screen.getByLabelText('Email address')).toHaveAttribute('aria-describedby', 'email-error');
});

test('stores normalized pending state and opens verification screen after signup', async () => {
  const register = jest.fn().mockResolvedValue({
    verification_required: true,
    verification_email_sent: true,
  });
  useAuth.mockReturnValue({ register });
  render(<RegisterPage />);
  fillValidForm();

  fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));

  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/verify-email', expect.objectContaining({ replace: true })));
  expect(register).toHaveBeenCalledWith(expect.objectContaining({
    name: 'Juan dela Cruz',
    email: 'juan@example.com',
  }));
  expect(sessionStorage.getItem('pending_verification_email')).toBe('juan@example.com');
  expect(sessionStorage.getItem('pending_auth_redirect')).toBe('/checkout');
});
