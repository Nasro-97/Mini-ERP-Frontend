import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';

interface PlaceholderProps {
  title: string;
  phase: string;
}

export const Placeholder: React.FC<PlaceholderProps> = ({ title, phase }) => {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        title={title}
        breadcrumb={`${title} module will be available soon`}
      />
      <div
        className="p-6"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
        }}
      >
        <EmptyState
          message={`${title} coming in ${phase}`}
          action={
            <button
              className="px-4 py-2.5 text-sm font-medium text-white transition-colors"
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
              Coming Soon
            </button>
          }
        />
      </div>
    </div>
  );
};
