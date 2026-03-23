import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';

const resolveRedirectPath = (redirectParam) => {
  if (!redirectParam || typeof redirectParam !== 'string') return '/';
  if (!redirectParam.startsWith('/') || redirectParam.startsWith('//')) return '/';
  return redirectParam;
};

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const redirectPath = resolveRedirectPath(searchParams.get('redirect'));

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const data = await login(formData);
      if (data?.user?.is_admin) {
        navigate('/admin', { replace: true });
      } else {
        navigate(redirectPath, { replace: true });
      }
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <Helmet>
        <title>Login - Barbaza MPC</title>
      </Helmet>

      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6h15l-1.5 9h-12z" />
              <circle cx="9" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
              <path d="M6 6L5 3H2" />
            </svg>
          </div>
          <div>
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Login to manage your account and orders.</p>
          </div>
        </div>

        {error && (
          <div className="auth-alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="auth-input"
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="auth-password-wrap">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                className="auth-input auth-input-password"
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={submitting} className="auth-button">
            {submitting ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account?{' '}
          <Link to={`/register?redirect=${encodeURIComponent(redirectPath)}`} className="auth-link">
            Register
          </Link>
        </p>
      </div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 1rem;
          background: radial-gradient(1200px 600px at 20% 20%, rgba(212,168,75,0.20), transparent 60%),
                      radial-gradient(1200px 600px at 80% 0%, rgba(46,139,87,0.18), transparent 55%),
                      #F4F7FD;
        }

        .auth-card {
          width: 100%;
          max-width: 460px;
          background: #ffffff;
          border: 1px solid rgba(26,58,74,0.10);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 12px 30px rgba(0,0,0,0.10);
        }

        .auth-header {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 18px;
        }

        .auth-badge {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          background: linear-gradient(135deg, var(--primary-dark), var(--primary-light));
        }

        .auth-badge svg {
          width: 22px;
          height: 22px;
        }

        .auth-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-dark);
          line-height: 1.15;
          margin: 0;
        }

        .auth-subtitle {
          margin: 4px 0 0;
          color: var(--text-muted);
          font-size: 0.95rem;
        }

        .auth-alert {
          margin: 12px 0;
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(220, 38, 38, 0.08);
          border: 1px solid rgba(220, 38, 38, 0.25);
          color: #b91c1c;
          font-weight: 600;
        }

        .auth-input {
          width: 100%;
          margin-top: 6px;
          padding: 12px 12px;
          border-radius: 12px;
          border: 1px solid rgba(26,58,74,0.20);
          outline: none;
          font-size: 1rem;
          transition: box-shadow .15s ease, border-color .15s ease;
          background: white;
        }

        .auth-input:focus {
          border-color: rgba(46,139,87,0.65);
          box-shadow: 0 0 0 4px rgba(46,139,87,0.18);
        }

        .auth-password-wrap {
          position: relative;
        }

        .auth-input-password {
          padding-right: 44px;
        }

        .auth-password-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: #7488A3;
          cursor: pointer;
          padding: 0;
        }

        .auth-password-toggle:hover {
          color: #2954C8;
        }

        .auth-button {
          width: 100%;
          background: linear-gradient(135deg, #0B1739, #2EA7FF);
          color: white;
          border: none;
          padding: 12px 14px;
          border-radius: 12px;
          font-weight: 700;
        }

        .auth-footer {
          margin-top: 14px;
          color: var(--text-muted);
          font-size: 0.95rem;
        }

        .auth-link {
          color: var(--primary-dark);
          font-weight: 700;
          text-decoration: none;
        }

        .auth-link:hover {
          text-decoration: underline;
        }

        @media (max-width: 520px) {
          .auth-page {
            padding: 2rem 0.75rem;
          }

          .auth-card {
            padding: 18px;
          }

          .auth-title {
            font-size: 1.35rem;
          }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;

