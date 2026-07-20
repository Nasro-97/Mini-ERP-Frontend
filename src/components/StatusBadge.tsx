import React from 'react';

interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  draft: { bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' },
  pending_sales_manager_approval: { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  approved_for_sourcing: { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
  rfq_in_progress: { bg: '#E0E7FF', text: '#3730A3', dot: '#6366F1' },
  quotation_review: { bg: '#F3E8FF', text: '#6B21A8', dot: '#A855F7' },
  offer_in_progress: { bg: '#FFEDD5', text: '#9A3412', dot: '#F97316' },
  approved_by_client: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  po_in_progress: { bg: '#CCFBF1', text: '#115E59', dot: '#14B8A6' },
  shipment_in_progress: { bg: '#CFFAFE', text: '#155E75', dot: '#06B6D4' },
  closed: { bg: '#F1F5F9', text: '#64748B', dot: '#94A3B8' },
  rejected: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
  pending_cod_approval: { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  cod_approved: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  cod_rejected: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
  changes_requested: { bg: '#FFEDD5', text: '#9A3412', dot: '#F97316' },
  sent_to_client: { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
  client_approved: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  client_rejected: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
  revision_requested: { bg: '#FEF3C7', text: '#92400E', dot: '#FBBF24' },
  received: { bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' },
  under_review: { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  selected: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  superseded: { bg: '#F1F5F9', text: '#94A3B8', dot: '#CBD5E1' },
  sent: { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
  accepted: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  pending_review: { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  approved: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  assigned_to_procurement: { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
  in_procurement: { bg: '#E0E7FF', text: '#3730A3', dot: '#6366F1' },
  completed: { bg: '#F1F5F9', text: '#64748B', dot: '#94A3B8' },
  responded: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  declined: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
  submitted: { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
};

const formatLabel = (status: string): string => {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status] || { bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' };
  const label = formatLabel(status);

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium"
      style={{
        backgroundColor: config.bg,
        color: config.text,
        borderRadius: '9999px',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: config.dot }}
      />
      {label}
    </span>
  );
};
