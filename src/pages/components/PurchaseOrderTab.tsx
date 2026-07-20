import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, ArrowRight } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useToast } from '../../components/Toast';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface PurchaseOrder {
  id: string;
  po_number: string;
  status: string;
  supplier_id: string;
  currency: string;
  total_amount: number;
  sent_at: string | null;
  created_at: string;
  offer_version_id: string;
  request_id: string;
  quotation_id: string;
}

interface OfferVersion {
  id: string;
  status: string;
}

interface Offer {
  id: string;
  versions: OfferVersion[];
}

interface Props {
  requestId: string;
  requestStatus: string;
  isCOD: boolean;
  hasProcurementAccess: boolean;
  isProcurementManager: boolean;
  isProcurementSpecialist: boolean;
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'draft': return { backgroundColor: '#F3F4F6', color: '#6B7280' };
    case 'sent': return { backgroundColor: '#DBEAFE', color: '#1E40AF' };
    case 'accepted': return { backgroundColor: '#D1FAE5', color: '#065F46' };
    default: return { backgroundColor: '#F3F4F6', color: '#6B7280' };
  }
}

function statusLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined) return '-';
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export const PurchaseOrderTab: React.FC<Props> = ({ requestId, requestStatus, isCOD, hasProcurementAccess, isProcurementManager, isProcurementSpecialist }) => {
  const navigate = useNavigate();
  const toast = useToast();

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchPO(); }, [requestId]);

  const fetchPO = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<PurchaseOrder>(`/purchase-orders/request/${requestId}`);
      setPo(data);
    } catch {
      setPo(null);
    } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const offer = await apiClient.get<Offer>(`/offers/request/${requestId}`);
      const offerData = Array.isArray(offer) ? (offer as Offer[])[0] : offer;
      const approvedVersion = offerData?.versions?.find(v => v.status === 'client_approved');
      if (!approvedVersion) { toast.error('No client-approved offer version found'); setCreating(false); return; }
      await apiClient.post('/purchase-orders/', { offer_version_id: approvedVersion.id });
      toast.success('Purchase Order created successfully');
      setShowCreateConfirm(false);
      await fetchPO();
    } catch { toast.error('Failed to create Purchase Order'); }
    finally { setCreating(false); }
  };

  const handleSend = async () => {
    try {
      await apiClient.patch(`/purchase-orders/${po!.id}/send`, {});
      toast.success('Purchase Order sent to supplier');
      setShowSendConfirm(false);
      await fetchPO();
    } catch { toast.error('Failed to send Purchase Order'); }
  };

  const handleAccept = async () => {
    try {
      await apiClient.patch(`/purchase-orders/${po!.id}/accept`, {});
      toast.success('Purchase Order accepted');
      setShowAcceptConfirm(false);
      await fetchPO();
    } catch { toast.error('Failed to accept Purchase Order'); }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/purchase-orders/${po!.id}`);
      toast.success('Purchase Order deleted');
      setShowDeleteConfirm(false);
      setPo(null);
    } catch { toast.error('Failed to delete Purchase Order'); }
  };

  const canCreate = requestStatus === 'approved_by_client' && (hasProcurementAccess || isCOD);

  if (loading) return <div className="text-center py-12" style={{ color: '#9CA3AF', animation: 'fadeSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>Loading...</div>;

  return (
    <div style={{ animation: 'fadeSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      {!po && (
        <>
          {canCreate && (isProcurementManager || isProcurementSpecialist || isCOD) && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setShowCreateConfirm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all"
                style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(76,95,213,0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <Plus size={16} />
                Create Purchase Order
              </button>
            </div>
          )}
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              {canCreate ? 'No Purchase Order yet' : 'A Purchase Order can be created once the client approves the offer'}
            </p>
          </div>
        </>
      )}

      {po && (
        <table className="w-full">
          <thead style={{ borderBottom: '1px solid #E5E7EB' }}>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: '#9CA3AF' }}>PO Number</th>
              <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: '#9CA3AF' }}>Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: '#9CA3AF' }}>Currency</th>
              <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: '#9CA3AF' }}>Total Amount</th>
              <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: '#9CA3AF' }}>Sent At</th>
              <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: '#9CA3AF' }}>Created At</th>
              <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: '#9CA3AF' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #F9FAFB' }}>
              <td className="px-3 py-2">
                <span className="text-sm font-mono" style={{ color: '#6B7280' }}>
                  {po.po_number}
                </span>
              </td>
              <td className="px-3 py-2">
                <span
                  className="inline-block px-2.5 py-1 rounded-full text-xs font-medium"
                  style={getStatusStyle(po.status)}
                >
                  {statusLabel(po.status)}
                </span>
              </td>
              <td className="px-3 py-2">
                <span className="text-sm" style={{ color: '#1F2937' }}>
                  {po.currency || '-'}
                </span>
              </td>
              <td className="px-3 py-2">
                <span className="text-sm font-medium" style={{ color: '#1F2937' }}>
                  {fmt(po.total_amount)}
                </span>
              </td>
              <td className="px-3 py-2">
                <span className="text-sm" style={{ color: '#6B7280' }}>
                  {po.sent_at ? new Date(po.sent_at).toLocaleDateString() : '-'}
                </span>
              </td>
              <td className="px-3 py-2">
                <span className="text-sm" style={{ color: '#6B7280' }}>
                  {new Date(po.created_at).toLocaleDateString()}
                </span>
              </td>
              <td className="px-3 py-2">
                <Link
                  to={`/purchase-orders/${po.id}`}
                  className="text-sm font-medium transition-colors"
                  style={{ color: '#4C5FD5' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#6366F1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#4C5FD5';
                  }}
                >
                  View
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {showCreateConfirm && (
        <ConfirmDialog
          title="Create Purchase Order"
          message="Create Purchase Order for this request? The PO will be generated from the approved offer version. Supplier and items will be copied automatically."
          onConfirm={handleCreate}
          onCancel={() => setShowCreateConfirm(false)}
          confirmText={creating ? 'Creating...' : 'Create'}
          confirmStyle="primary"
        />
      )}
      {showSendConfirm && (
        <ConfirmDialog
          title="Send Purchase Order"
          message="Mark this Purchase Order as sent to supplier?"
          onConfirm={handleSend}
          onCancel={() => setShowSendConfirm(false)}
          confirmText="Send PO"
          confirmStyle="primary"
        />
      )}
      {showAcceptConfirm && (
        <ConfirmDialog
          title="Accept Purchase Order"
          message="Confirm supplier has accepted this Purchase Order?"
          onConfirm={handleAccept}
          onCancel={() => setShowAcceptConfirm(false)}
          confirmText="Accept"
          confirmStyle="primary"
        />
      )}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Purchase Order"
          message="Are you sure you want to delete this Purchase Order? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          confirmText="Delete"
          confirmStyle="danger"
        />
      )}
    </div>
  );
};
