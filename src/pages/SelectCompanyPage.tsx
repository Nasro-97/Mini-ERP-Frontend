import React from 'react';
import { useNavigate } from 'react-router-dom';

const COMPANIES = [
  { code: 'zangabil', name: 'Al Zangabil' },
  { code: 'awatad', name: 'Awatad' },
  { code: 'al_araba', name: 'Al Araba' },
  { code: 'al_kowa', name: 'Al Kowa' },
] as const;

export const SelectCompanyPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSelect = (code: string, name: string) => {
    localStorage.setItem('selected_company_code', code);
    localStorage.setItem('selected_company_name', name);
    navigate('/login');
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

      {/* Right Panel - Company selection */}
      <div className="flex-1 flex items-center justify-center px-8 lg:px-16">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h2 className="text-4xl font-bold mb-3" style={{ color: '#1F2937' }}>Select Company</h2>
            <p className="text-base" style={{ color: '#6B7280' }}>Choose the company you want to sign in to.</p>
          </div>

          <div className="space-y-3">
            {COMPANIES.map((company) => (
              <button
                key={company.code}
                onClick={() => handleSelect(company.code, company.name)}
                className="w-full flex items-center justify-between px-6 py-5 rounded-2xl text-left transition-all"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#4C5FD5';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(76,95,213,0.12)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)' }}
                  >
                    {company.name.charAt(0)}
                  </div>
                  <span className="text-base font-semibold" style={{ color: '#1F2937' }}>{company.name}</span>
                </div>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ color: '#9CA3AF' }}>
                  <path d="M6.75 3.75L11.25 9L6.75 14.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
