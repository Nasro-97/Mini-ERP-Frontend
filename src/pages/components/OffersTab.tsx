import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, Eye, Trash2, ChevronDown } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useToast } from '../../components/Toast';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DatePicker } from '../../components/DatePicker';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OfferVersion {
  id: string;
  offer_id: string;
  version_number: number;
  status: string;
  total_price: number | null;
  validity_date: string | null;
  cod_notes: string | null;
  client_notes: string | null;
  payment_terms: string | null;
  delivery_terms: string | null;
  delivery_period: string | null;
  country_of_origin: string | null;
  total_price_letters: string | null;
  notes: string | null;
  created_at: string;
}

interface Offer {
  id: string;
  offer_number: string;
  request_id: string;
  quotation_id: string;
  created_at: string;
  versions: OfferVersion[];
}

interface Quotation {
  id: string;
  quotation_number: string;
  supplier_name?: string;
  total_amount: number;
  status: string;
  rfq_id: string;
}

interface RFQSuppliers {
  [key: string]: { company_name: string };
}

interface Props {
  requestId: string;
  requestStatus: string;
  rfqs: Array<{ id: string; supplier_id: string }>;
  rfqSuppliers: RFQSuppliers;
  isCOD: boolean;
  hasSalesAccess: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getVersionStatusStyle(status: string) {
  switch (status) {
    case 'draft': return { backgroundColor: '#F3F4F6', color: '#6B7280' };
    case 'pending_cod_approval': return { backgroundColor: '#FEF3C7', color: '#92400E' };
    case 'cod_approved': return { backgroundColor: '#D1FAE5', color: '#065F46' };
    case 'cod_rejected': return { backgroundColor: '#FEE2E2', color: '#DC2626' };
    case 'changes_requested': return { backgroundColor: '#FFEDD5', color: '#C2410C' };
    case 'sent_to_client': return { backgroundColor: '#DBEAFE', color: '#1E40AF' };
    case 'client_approved': return { backgroundColor: '#D1FAE5', color: '#065F46' };
    case 'client_rejected': return { backgroundColor: '#FEE2E2', color: '#DC2626' };
    case 'revision_requested': return { backgroundColor: '#FEF3C7', color: '#B45309' };
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

// ─── Component ────────────────────────────────────────────────────────────────

export const OffersTab: React.FC<Props> = ({
  requestId, requestStatus, rfqs, rfqSuppliers, isCOD, hasSalesAccess,
}) => {
  const navigate = useNavigate();
  const toast = useToast();

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteVersionId, setDeleteVersionId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Create modal form
  const [createForm, setCreateForm] = useState({
    quotation_id: '',
    payment_terms: '',
    delivery_terms: '',
    delivery_period: '',
    validity_date: null as Date | null,
    country_of_origin: '',
    total_price: '',
    total_price_letters: '',
    notes: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchOffer(); }, [requestId]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    if (openMenuId) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [openMenuId]);

  const fetchOffer = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<Offer | Offer[]>(`/offers/request/${requestId}`);
      const offerData = Array.isArray(data) ? data[0] : data;
      setOffer(offerData || null);
    } catch {
      setOffer(null);
    } finally { setLoading(false); }
  };

  const fetchQuotations = async () => {
    setLoadingQuotations(true);
    try {
      const all: Quotation[] = [];
      for (const rfq of rfqs) {
        try {
          const qs = await apiClient.get<Quotation[]>(`/quotations/rfq/${rfq.id}`);
          for (const q of qs) {
            if (q.status !== 'rejected' && q.status !== 'superseded') {
              const supplierName = rfqSuppliers[rfq.supplier_id]?.company_name || '';
              all.push({ ...q, supplier_name: supplierName });
            }
          }
        } catch { /* skip */ }
      }
      setQuotations(all);
      // auto-select the one with status 'selected', fallback to first
      const selected = all.find(q => q.status === 'selected') || all[0];
      if (selected) setCreateForm(f => ({ ...f, quotation_id: selected.id }));
    } finally { setLoadingQuotations(false); }
  };

  const handleOpenCreate = () => {
    setCreateForm({
      quotation_id: '', payment_terms: '', delivery_terms: '', delivery_period: '',
      validity_date: null, country_of_origin: '', total_price: '', total_price_letters: '', notes: '',
    });
    fetchQuotations();
    setShowCreateModal(true);
  };

  const handleCreate = async () => {
    if (!createForm.quotation_id) { toast.error('Select a quotation'); return; }
    setCreating(true);
    try {
      // Step 1: create offer
      let offerResp: any = await apiClient.post('/offers/', {
        request_id: requestId,
        quotation_id: createForm.quotation_id,
      });

      // Get version id
      let versionId: string | null = null;
      if (offerResp?.versions?.[0]?.id) {
        versionId = offerResp.versions[0].id;
      } else {
        const full = await apiClient.get<Offer>(`/offers/request/${requestId}`);
        const o = Array.isArray(full) ? (full as Offer[])[0] : full;
        versionId = o?.versions?.[0]?.id || null;
      }

      if (!versionId) { toast.error('Could not get version ID'); setCreating(false); return; }

      // Step 2: patch version details
      const patchBody: Record<string, any> = {};
      if (createForm.payment_terms) patchBody.payment_terms = createForm.payment_terms;
      if (createForm.delivery_terms) patchBody.delivery_terms = createForm.delivery_terms;
      if (createForm.delivery_period) patchBody.delivery_period = createForm.delivery_period;
      if (createForm.validity_date) patchBody.validity_date = createForm.validity_date.toISOString();
      if (createForm.country_of_origin) patchBody.country_of_origin = createForm.country_of_origin;
      if (createForm.total_price) patchBody.total_price = parseFloat(createForm.total_price);
      if (createForm.total_price_letters) patchBody.total_price_letters = createForm.total_price_letters;
      if (createForm.notes) patchBody.notes = createForm.notes;

      if (Object.keys(patchBody).length > 0) {
        await apiClient.patch(`/offers/versions/${versionId}`, patchBody);
      }

      toast.success('Offer created successfully');
      setShowCreateModal(false);
      await fetchOffer();
      navigate(`/offers/versions/${versionId}`);
    } catch { toast.error('Failed to create offer'); }
    finally { setCreating(false); }
  };

  const handleNewVersion = async () => {
    if (!offer) return;
    try {
      const v = await apiClient.post<OfferVersion>(`/offers/${offer.id}/new-version`, {});
      toast.success('New version created');
      await fetchOffer();
      navigate(`/offers/versions/${v.id}`);
    } catch { toast.error('Failed to create new version'); }
  };

  const handleDeleteVersion = async (versionId: string) => {
    try {
      await apiClient.delete(`/offers/versions/${versionId}`);
      setDeleteVersionId(null);
      toast.success('Version deleted');
      fetchOffer();
    } catch { toast.error('Failed to delete version'); }
  };

  const canShowCreateButton = hasSalesAccess || isCOD;

  const sortedVersions = offer
    ? [...offer.versions].sort((a, b) => b.version_number - a.version_number)
    : [];

  const latestVersion = sortedVersions[0];
  const canAddVersion = latestVersion &&
    (latestVersion.status === 'client_approved' || latestVersion.status === 'revision_requested') &&
    (hasSalesAccess || isCOD);

  if (loading) {
    return <div className="text-center py-12" style={{ color: '#9CA3AF', animation: 'fadeSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>Loading...</div>;
  }

  return (
    <div style={{ animation: 'fadeSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      {/* Empty state */}
      {!offer && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h3 className="text-base font-semibold mb-1" style={{ color: '#1F2937' }}>No offer yet</h3>
          <p className="text-sm mb-5" style={{ color: '#9CA3AF' }}>Create an offer once a quotation has been approved</p>
          {canShowCreateButton && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-lg"
              style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)' }}
            >
              <Plus size={16} />
              Create Offer
            </button>
          )}
        </div>
      )}

      {/* Offer card */}
      {offer && <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E5E7EB', backgroundColor: '#fff' }}>
        {/* Card header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold" style={{ color: '#1F2937', fontSize: 15 }}>{offer.offer_number}</span>
            {latestVersion && (
              <span className="text-xs" style={{ color: '#9CA3AF' }}>current v{latestVersion.version_number}</span>
            )}
          </div>
          {canAddVersion && (
            <button
              onClick={handleNewVersion}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg"
              style={{ backgroundColor: '#EEF2FF', color: '#4C5FD5', border: '1px solid #C7D2FE' }}
            >
              <Plus size={13} />
              New Version
            </button>
          )}
        </div>

        {/* Versions table */}
        <div className="overflow-x-auto">
          <table className="w-full" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                {[['8%','Version'],['14%','Status'],['14%','Total Price'],['12%','Validity Date'],['26%','COD Response'],['26%','Client Response'],['0%','']].map(([w, label]) => (
                  <th key={label} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: '#9CA3AF', width: w }}>{label}</th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: '#9CA3AF', width: '8%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedVersions.map((v) => (
                <tr
                  key={v.id}
                  className="transition-colors cursor-pointer"
                  style={{ borderBottom: '1px solid #F9FAFB' }}
                  onClick={() => navigate(`/offers/versions/${v.id}`)}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center w-8 h-6 rounded-md text-xs font-semibold"
                      style={{ backgroundColor: '#EEF2FF', color: '#4C5FD5' }}>
                      v{v.version_number}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                      style={getVersionStatusStyle(v.status)}>
                      {statusLabel(v.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#1F2937' }}>
                    {fmt(v.total_price)}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#6B7280' }}>
                    {v.validity_date ? new Date(v.validity_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: v.cod_notes ? '#1F2937' : '#9CA3AF' }}>
                    <span className="truncate block" style={{ maxWidth: 200 }}>
                      {v.cod_notes || 'No response yet'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: v.client_notes ? '#1F2937' : '#9CA3AF' }}>
                    <span className="truncate block" style={{ maxWidth: 200 }}>
                      {v.client_notes || 'No response yet'}
                    </span>
                  </td>
                  <td className="px-4 py-3 relative" onClick={(e) => e.stopPropagation()}>
                    <div ref={openMenuId === v.id ? menuRef : null}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === v.id ? null : v.id); }}
                        className="p-1 rounded-md hover:bg-gray-100"
                      >
                        <MoreVertical size={15} style={{ color: '#6B7280' }} />
                      </button>
                      {openMenuId === v.id && (
                        <div className="absolute right-0 mt-1 w-40 rounded-lg overflow-hidden z-20"
                          style={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                          <button
                            onClick={() => { navigate(`/offers/versions/${v.id}`); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm"
                            style={{ color: '#6B7280' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <Eye size={14} /> View
                          </button>
                          {v.status === 'draft' && (hasSalesAccess || isCOD) && (
                            <button
                              onClick={() => { setDeleteVersionId(v.id); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm"
                              style={{ color: '#EF4444' }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEE2E2'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>}

      {/* Delete confirm */}
      {deleteVersionId && (
        <ConfirmDialog
          title="Delete Version"
          message="Are you sure you want to delete this draft version? This action cannot be undone."
          onConfirm={() => handleDeleteVersion(deleteVersionId)}
          onCancel={() => setDeleteVersionId(null)}
          confirmText="Delete"
          confirmStyle="danger"
        />
      )}

      {/* Create Offer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-xl rounded-2xl overflow-hidden" style={{ backgroundColor: '#fff', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <h2 className="text-lg font-semibold" style={{ color: '#1F2937' }}>Create Offer</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-md hover:bg-gray-100">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Auto-selected quotation info */}
              {loadingQuotations ? (
                <div className="text-sm" style={{ color: '#9CA3AF' }}>Loading quotation...</div>
              ) : quotations.length === 0 ? (
                <div className="text-sm p-3 rounded-lg" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                  No quotations found for this request.
                </div>
              ) : (
                <div className="text-sm p-3 rounded-lg" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  <span style={{ color: '#9CA3AF' }}>Quotation: </span>
                  <span className="font-medium" style={{ color: '#1F2937' }}>
                    {(() => { const q = quotations.find(q => q.id === createForm.quotation_id); return q ? `${q.quotation_number} — ${q.supplier_name}` : '—'; })()}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Payment Terms</label>
                  <input value={createForm.payment_terms} onChange={(e) => setCreateForm(f => ({ ...f, payment_terms: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg" style={{ border: '1px solid #E5E7EB', color: '#1F2937' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Delivery Terms</label>
                  <input value={createForm.delivery_terms} onChange={(e) => setCreateForm(f => ({ ...f, delivery_terms: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg" style={{ border: '1px solid #E5E7EB', color: '#1F2937' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Delivery Period</label>
                  <input placeholder="e.g. 30 days" value={createForm.delivery_period} onChange={(e) => setCreateForm(f => ({ ...f, delivery_period: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg" style={{ border: '1px solid #E5E7EB', color: '#1F2937' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Validity Date</label>
                  <DatePicker
                    selected={createForm.validity_date}
                    onChange={(d) => setCreateForm(f => ({ ...f, validity_date: d }))}
                    placeholder="Select date"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Country of Origin</label>
                  <input value={createForm.country_of_origin} onChange={(e) => setCreateForm(f => ({ ...f, country_of_origin: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg" style={{ border: '1px solid #E5E7EB', color: '#1F2937' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Total Price</label>
                  <input type="number" value={createForm.total_price} onChange={(e) => setCreateForm(f => ({ ...f, total_price: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg" style={{ border: '1px solid #E5E7EB', color: '#1F2937' }} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Total Price in Letters</label>
                <input placeholder="e.g. Forty five thousand dollars" value={createForm.total_price_letters}
                  onChange={(e) => setCreateForm(f => ({ ...f, total_price_letters: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg" style={{ border: '1px solid #E5E7EB', color: '#1F2937' }} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Notes</label>
                <textarea rows={3} value={createForm.notes} onChange={(e) => setCreateForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg resize-none" style={{ border: '1px solid #E5E7EB', color: '#1F2937' }} />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid #F3F4F6' }}>
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm rounded-lg"
                style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}>
                Cancel
              </button>
              <button onClick={handleCreate} disabled={creating}
                className="px-5 py-2 text-sm font-medium text-white rounded-lg"
                style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)', opacity: creating ? 0.7 : 1 }}>
                {creating ? 'Creating...' : 'Create Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
