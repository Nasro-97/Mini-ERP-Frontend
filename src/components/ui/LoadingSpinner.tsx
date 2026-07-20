import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]} ${className}`} />
  );
};

export const LoadingContainer: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto" />
        {children && <p className="mt-4 text-gray-600">{children}</p>}
      </div>
    </div>
  );
};
