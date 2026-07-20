import React, { useState, useEffect } from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  confirmStyle?: 'danger' | 'primary';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  confirmStyle = 'danger',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onCancel, 200);
  };

  const handleConfirm = () => {
    setIsVisible(false);
    setTimeout(onConfirm, 200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div
          className="fixed inset-0 transition-opacity duration-200"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            opacity: isVisible ? 1 : 0,
          }}
          onClick={handleClose}
        />

        <div
          className="relative transform overflow-hidden bg-white text-left shadow-xl sm:my-8 sm:w-full sm:max-w-lg"
          style={{
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            transform: isVisible ? 'scale(1)' : 'scale(0.95)',
            opacity: isVisible ? 1 : 0,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div className="bg-white px-6 pb-4 pt-6">
            <div className="text-left">
              <h3 className="text-lg font-semibold leading-6 mb-2" style={{ color: '#1F2937' }}>
                {title}
              </h3>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                {message}
              </p>
            </div>
          </div>
          <div className="px-6 py-4 flex flex-row-reverse gap-3" style={{ backgroundColor: '#F9FAFB' }}>
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex justify-center px-5 py-2 text-sm font-medium text-white transition-all duration-200"
              style={{
                backgroundColor: confirmStyle === 'danger' ? '#EF4444' : '#4C5FD5',
                borderRadius: '8px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = confirmStyle === 'danger' ? '#DC2626' : '#4338CA';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = confirmStyle === 'danger' ? '#EF4444' : '#4C5FD5';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {confirmText}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex justify-center px-5 py-2 text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: '#F3F4F6',
                color: '#1F2937',
                borderRadius: '8px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E5E7EB';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
