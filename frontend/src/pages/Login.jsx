import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      // Navigation happens on success, unmounting the component.
      navigate(redirectPath, { replace: true });
    } catch (err) {
      // Handle rate limiting explicitly
      if (err.response?.status === 429) {
        setError('Too many login attempts. Please try again in 15 minutes.');
      } else {
        setError(err.response?.data?.message || 'Invalid email or security credentials.');
      }
      setSubmitting(false); // Only set to false if we stay on the page
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-2xl">
        <div>
          <div className="w-12 h-12 bg-brand-primary rounded-xl mx-auto flex items-center justify-center text-white font-black text-xl mb-3" aria-hidden="true">M</div>
          <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">Mayzax Solutions</h2>
          <p className="mt-2 text-center text-sm text-slate-500">Sign in to access your CRM console</p>
        </div>

        {error && (
          <div 
            className="bg-red-50 border-l-4 border-red-500 p-4 text-sm text-red-700 rounded-r"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Corporate Email Address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                placeholder="you@mayzax.com"
                autoComplete="email"
                aria-invalid={!!error}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                System Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                placeholder="••••••••"
                autoComplete="current-password"
                aria-invalid={!!error}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-brand-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Authenticating...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;