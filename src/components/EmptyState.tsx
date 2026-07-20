import React, { ReactNode } from 'react';

interface EmptyStateProps {
  message: string;
  action?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message, action }) => {
  return (
    <div
      className="p-12 text-center"
      style={{
        border: '2px dashed #E2E8F0',
        borderRadius: '16px',
        backgroundColor: '#ffffff',
      }}
    >
      <p className="mb-4" style={{ color: '#718096' }}>
        {message}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};
