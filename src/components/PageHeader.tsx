import React, { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  breadcrumb?: string;
  action?: ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, breadcrumb, action }) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold" style={{ color: '#1a202c' }}>
          {title}
        </h1>
        {action && <div>{action}</div>}
      </div>
      {breadcrumb && (
        <p className="text-sm" style={{ color: '#718096' }}>
          {breadcrumb}
        </p>
      )}
    </div>
  );
};
