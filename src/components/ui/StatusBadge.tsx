import React from 'react';
import { Badge } from '../../app/components/ui/badge';
import { RequestStatus } from '../../types';

interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  pending_review: { label: 'Pending Review', variant: 'outline' },
  approved: { label: 'Approved', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  assigned_to_procurement: { label: 'Assigned to Procurement', variant: 'default' },
  in_procurement: { label: 'In Procurement', variant: 'default' },
  completed: { label: 'Completed', variant: 'default' },
  sent: { label: 'Sent', variant: 'default' },
  responded: { label: 'Responded', variant: 'default' },
  declined: { label: 'Declined', variant: 'destructive' },
  submitted: { label: 'Submitted', variant: 'outline' },
  under_review: { label: 'Under Review', variant: 'outline' },
  pending_cod_approval: { label: 'Pending COD Approval', variant: 'outline' },
  cod_approved: { label: 'COD Approved', variant: 'default' },
  cod_rejected: { label: 'COD Rejected', variant: 'destructive' },
  changes_requested: { label: 'Changes Requested', variant: 'outline' },
  sent_to_client: { label: 'Sent to Client', variant: 'default' },
  client_approved: { label: 'Client Approved', variant: 'default' },
  client_rejected: { label: 'Client Rejected', variant: 'destructive' },
  revision_requested: { label: 'Revision Requested', variant: 'outline' },
  accepted: { label: 'Accepted', variant: 'default' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status] || { label: status, variant: 'secondary' };

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
};
