import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';

export const Unauthorized: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6" style={{ backgroundColor: '#FEE2E2' }}>
          <ShieldX size={32} style={{ color: '#DC2626' }} />
        </div>
        <h1 className="text-4xl font-bold mb-4" style={{ color: '#1a202c' }}>
          Access Denied
        </h1>
        <p className="mb-8 text-lg" style={{ color: '#718096' }}>
          You don't have permission to access this page.
        </p>
        <Link
          to="/dashboard"
          className="inline-block px-6 py-3 text-sm font-medium text-white transition-colors"
          style={{
            backgroundColor: '#1B2B6B',
            borderRadius: '10px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#152249';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1B2B6B';
          }}
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
};
