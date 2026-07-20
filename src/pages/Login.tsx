import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const companyCode = localStorage.getItem('selected_company_code');
  const companyName = localStorage.getItem('selected_company_name');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
      return;
    }
    if (!companyCode) {
      navigate('/select-company');
    }
  }, [isAuthenticated, companyCode, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyCode) {
      navigate('/select-company');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password, companyCode);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.message && err.message.includes('Unable to connect to server')) {
        setError('Unable to connect to backend. Please ensure the server is running at http://localhost:8000');
      } else {
        setError('Invalid company, email, or password');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F5F7FA' }}>
      {/* Left Panel - Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center px-16 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 50%, #8B5CF6 100%)' }}
      >
        <div className="absolute w-96 h-96 rounded-full opacity-10" style={{ background: 'white', top: '-10%', right: '-10%' }} />
        <div className="absolute w-64 h-64 rounded-full opacity-10" style={{ background: 'white', bottom: '-5%', left: '-5%' }} />
        <div className="relative z-10 flex items-center gap-4">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <path d="M32 8L28 4L24 8L20 4L16 8L12 4L8 8V56L12 60L16 56L20 60L24 56L28 60L32 56L36 60L40 56L44 60L48 56L52 60L56 56V8L52 4L48 8L44 4L40 8L36 4L32 8Z" fill="white" fillOpacity="0.15" />
            <rect x="20" y="20" width="24" height="24" rx="2" fill="white" fillOpacity="0.2" />
            <circle cx="32" cy="32" r="8" fill="white" fillOpacity="0.3" />
            <circle cx="32" cy="32" r="4" fill="white" />
          </svg>
          <h1 className="text-6xl font-bold text-white tracking-tight">CTOS</h1>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-8 lg:px-16">
        <div
          className="w-full max-w-md p-10 rounded-3xl"
          style={{ backgroundColor: '#ffffff', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}
        >
          {/* Company indicator */}
          {companyName && (
            <div
              className="flex items-center justify-between px-4 py-2.5 rounded-xl mb-8"
              style={{ backgroundColor: '#EEF2FF', border: '1px solid #C7D2FE' }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)' }}
                >
                  {companyName.charAt(0)}
                </div>
                <span className="text-sm font-medium" style={{ color: '#3730A3' }}>{companyName}</span>
              </div>
              <Link
                to="/select-company"
                className="text-xs font-medium transition-colors"
                style={{ color: '#6366F1' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#4338CA'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#6366F1'; }}
              >
                Change company
              </Link>
            </div>
          )}

          <div className="mb-10">
            <h2 className="text-4xl font-bold mb-3" style={{ color: '#1F2937' }}>Welcome back</h2>
            <p className="text-base" style={{ color: '#6B7280' }}>Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="block w-full px-4 py-3.5 text-sm transition-all rounded-xl"
                style={{ border: '1px solid #E5E7EB', color: '#1F2937', backgroundColor: '#ffffff' }}
                onFocus={(e) => { e.target.style.borderColor = '#4C5FD5'; e.target.style.boxShadow = '0 0 0 3px rgba(76, 95, 213, 0.1)'; e.target.style.outline = 'none'; }}
                onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
                placeholder="your.email@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="block w-full px-4 py-3.5 text-sm transition-all rounded-xl"
                style={{ border: '1px solid #E5E7EB', color: '#1F2937', backgroundColor: '#ffffff' }}
                onFocus={(e) => { e.target.style.borderColor = '#4C5FD5'; e.target.style.boxShadow = '0 0 0 3px rgba(76, 95, 213, 0.1)'; e.target.style.outline = 'none'; }}
                onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div
                className="px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
              >Invalid company, email, or password<svg width="16" height="16" fill="currentColor">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0-1A6 6 0 1 0 8 2a6 6 0 0 0 0 12zm1-6a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM8 4a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3A.5.5 0 0 1 8 4z" />
                </svg></div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3.5 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
              style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)', boxShadow: '0 2px 8px rgba(76, 95, 213, 0.3)' }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 95, 213, 0.4)'; } }}
              onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(76, 95, 213, 0.3)'; } }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
