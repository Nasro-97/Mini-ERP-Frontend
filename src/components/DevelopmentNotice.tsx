import React from 'react';
import { AlertCircle } from 'lucide-react';

export const DevelopmentNotice: React.FC = () => {
  return (
    <div
      className="fixed bottom-6 right-6 max-w-md p-4 rounded-xl shadow-lg"
      style={{
        backgroundColor: '#FEF3C7',
        border: '1px solid #FCD34D',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#FBBF24' }}
        >
          <AlertCircle size={20} style={{ color: '#78350F' }} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1" style={{ color: '#78350F' }}>
            Development Mode
          </h3>
          <p className="text-sm" style={{ color: '#92400E' }}>
            Backend not running. Please start the FastAPI server at{' '}
            <code className="px-1 py-0.5 rounded" style={{ backgroundColor: '#FDE68A' }}>
              http://localhost:8000
            </code>
          </p>
          <div className="mt-3 text-xs" style={{ color: '#92400E' }}>
            <p className="font-medium mb-1">To start the backend:</p>
            <code className="block px-2 py-1 rounded" style={{ backgroundColor: '#FDE68A' }}>
              cd backend && uvicorn main:app --reload
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};
