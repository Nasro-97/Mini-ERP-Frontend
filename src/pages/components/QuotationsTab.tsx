import React, { useState, useEffect, useRef } from 'react';
import { Plus, MoreVertical, X, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useToast } from '../../components/Toast';
import { DatePicker } from '../../components/DatePicker';

interface RFQ {
  id: string;
  rfq_number: string;
  supplier_id: string;
  status: string;
}

interface Supplier {
  id: string;
  company_name: string;
}

interface Quotation {
  id: string;
  rfq_id: string;
  supplier_id: string;
  quotation_number: string;
  supplier_reference: string;
  status: string;
  currency: string;
  subtotal: number;
  shipping_cost: number;
  taxes: number;
  other_costs: number;
  total_amount: number;
  payment_terms: string;
  delivery_terms: string;
  lead_time: string;
  validity_date: string;
  notes: string;
  rejection_notes: string;
  created_at: string;
}

interface Props {
  requestId: string;
  rfqs: RFQ[];
  rfqSuppliers: Record<string, Supplier>;
  isCOD: boolean;
  isProcurementSpecialist: boolean;
  isProcurementManager: boolean;
  onRefetchRequest: () => void;
  hideTitle?: boolean;
}

const emptyForm = {
  rfq_id: '',
  supplier_reference: '',
  currency: 'USD',
  subtotal: '' as string | number,
  shipping_cost: '' as string | number,
  taxes: '' as string | number,
  other_costs: '' as string | number,
  total_amount: '' as string | number,
  payment_terms: '',
  delivery_terms: '',
  lead_time: '',
  validity_date: null as Date | null,
  notes: '',
};

interface ItemRow {
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  total_price: string;
}

const emptyItem = (): ItemRow => ({ description: '', quantity: '', unit: 'pcs', unit_price: '', total_price: '' });

function getStatusStyle(status: string) {
  switch (status) {
    case 'received': return { backgroundColor: '#F3F4F6', color: '#6B7280' };
    case 'under_review': return { backgroundColor: '#FEF3C7', color: '#92400E' };
    case 'selected': return { backgroundColor: '#D1FAE5', color: '#065F46' };
    case 'rejected': return { backgroundColor: '#FEE2E2', color: '#DC2626' };
    case 'superseded': return { backgroundColor: '#F3F4F6', color: '#9CA3AF' };
    default: return { backgroundColor: '#F3F4F6', color: '#6B7280' };
  }
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function fmt(n: number | string) {
  if (n === '' || n === null || n === undefined) return '-';
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export const QuotationsTab: React.FC<Props> = ({ requestId, rfqs, rfqSuppliers, isCOD, isProcurementSpecialist, isProcurementManager, onRefetchRequest, hideTitle }) => {
  const toast = useToast();
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [itemRows, setItemRows] = useState<ItemRow[]>([emptyItem()]);
  const [isSaving, setIsSaving] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<Quotation | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [approveTarget, setApproveTarget] = useState<Quotation | null>(null);

  const sentRfqs = rfqs.filter(r => r.status === 'sent' || r.status === 'quote_received');

  useEffect(() => { fetchQuotations(); }, [requestId, rfqs.length]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    if (openMenuId) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuId]);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const all: Quotation[] = [];
      await Promise.all(rfqs.map(async (rfq) => {
        try {
          const data = await apiClient.get<Quotation[]>(`/quotations/rfq/${rfq.id}`);
          all.push(...data);
        } catch {}
      }));
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setQuotations(all);
    } finally { setLoading(false); }
  };

  const calcTotal = (f: typeof form) => {
    return (parseFloat(String(f.subtotal)) || 0)
      + (parseFloat(String(f.shipping_cost)) || 0)
      + (parseFloat(String(f.taxes)) || 0)
      + (parseFloat(String(f.other_costs)) || 0);
  };

  const handleFormChange = (field: string, value: any) => {
    const updated = { ...form, [field]: value };
    if (['subtotal', 'shipping_cost', 'taxes', 'other_costs'].includes(field)) {
      updated.total_amount = calcTotal(updated);
    }
    setForm(updated);
  };

  const updateItem = (index: number, field: keyof ItemRow, value: string) => {
    const updated = itemRows.map((row, i) => {
      if (i !== index) return row;
      const next = { ...row, [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        const qty = parseFloat(field === 'quantity' ? value : next.quantity) || 0;
        const price = parseFloat(field === 'unit_price' ? value : next.unit_price) || 0;
        if (qty && price) next.total_price = String(qty * price);
      } else if (field === 'total_price') {
        const qty = parseFloat(next.quantity) || 0;
        const total = parseFloat(value) || 0;
        if (qty && total) next.unit_price = String(total / qty);
      }
      return next;
    });
    setItemRows(updated);
  };

  const handleSave = async () => {
    if (!form.rfq_id || !form.currency || !form.validity_date) {
      toast.error('Please fill in all required fields');
      return;
    }
    setIsSaving(true);
    try {
      const quotation = await apiClient.post<{ id: string }>('/quotations/', {
        rfq_id: form.rfq_id,
        supplier_reference: form.supplier_reference || null,
        currency: form.currency,
        subtotal: parseFloat(String(form.subtotal)) || 0,
        shipping_cost: parseFloat(String(form.shipping_cost)) || 0,
        taxes: parseFloat(String(form.taxes)) || 0,
        other_costs: parseFloat(String(form.other_costs)) || 0,
        total_amount: parseFloat(String(form.total_amount)) || 0,
        payment_terms: form.payment_terms || null,
        delivery_terms: form.delivery_terms || null,
        lead_time: form.lead_time || null,
        validity_date: form.validity_date.toISOString(),
        notes: form.notes || null,
      });

      const filledItems = itemRows.filter(r => r.description.trim());
      for (let i = 0; i < filledItems.length; i++) {
        const row = filledItems[i];
        await apiClient.post(`/quotations/${quotation.id}/items`, {
          document_type: 'quotation',
          document_id: quotation.id,
          line_number: i + 1,
          description: row.description,
          quantity: parseFloat(row.quantity) || 1,
          unit: row.unit || 'pcs',
          unit_price: parseFloat(row.unit_price) || 0,
          total_price: parseFloat(row.total_price) || 0,
          currency: form.currency,
        });
      }

      toast.success('Quotation created');
      setShowCreateModal(false);
      setForm(emptyForm);
      setItemRows([emptyItem()]);
      fetchQuotations();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to create quotation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAction = async (action: string, quotation: Quotation, extra?: string) => {
    try {
      let url = `/quotations/${quotation.id}/${action}`;
      if (action === 'reject' && extra) url += `?rejection_notes=${encodeURIComponent(extra)}`;
      await apiClient.patch(url, {});
      await fetchQuotations();
      onRefetchRequest();
      setOpenMenuId(null);
      toast.success(`Quotation ${statusLabel(action)}d successfully`);
    } catch {
      toast.error(`Failed to ${action} quotation`);
    }
  };

  if (loading) return <div className="py-16 text-center text-sm" style={{ color: '#9CA3AF', animation: 'fadeSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>Loading quotations...</div>;

  return (
    <div style={{ animation: 'fadeSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      {/* Header - Hidden when hideTitle is true, button is moved to RequestDetailPage */}
      {!hideTitle && (
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold" style={{ color: '#1F2937' }}>
            Quotations {quotations.length > 0 && `(${quotations.length})`}
          </h3>
          {(isProcurementSpecialist || isProcurementManager || isCOD) && (
            <div className="relative group">
              <button
                data-add-quotation-btn
                onClick={sentRfqs.length > 0 ? () => { setForm(emptyForm); setItemRows([emptyItem()]); setShowCreateModal(true); } : undefined}
                disabled={sentRfqs.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all"
                style={{
                  background: sentRfqs.length > 0 ? 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)' : '#D1D5DB',
                  cursor: sentRfqs.length > 0 ? 'pointer' : 'not-allowed',
                }}
                onMouseEnter={(e) => { if (sentRfqs.length > 0) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(76,95,213,0.3)'; } }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <Plus size={16} />
                Add Quotation
              </button>
              {sentRfqs.length === 0 && (
                <div className="absolute right-0 top-full mt-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ backgroundColor: '#1F2937', color: '#ffffff' }}>
                  Send an RFQ first before adding a quotation.
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* Hidden button for triggering from parent */}
      {hideTitle && (isProcurementSpecialist || isProcurementManager || isCOD) && (
        <button
          data-add-quotation-btn
          onClick={() => { setForm(emptyForm); setItemRows([emptyItem()]); setShowCreateModal(true); }}
          style={{ display: 'none' }}
        />
      )}

      {quotations.length === 0 ? (
        <div className="text-center py-16">
          <div className="mb-4 text-4xl">💬</div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F2937' }}>No quotations yet</h3>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Add a quotation from a received RFQ</p>
        </div>
      ) : (
        <div style={{ overflow: 'hidden', border: '1px solid #E5E7EB', borderRadius: 10 }}>
          <table className="w-full" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                {[['14%','Quotation #'],['18%','Supplier'],['11%','RFQ #'],['14%','Status'],['7%','Currency'],['13%','Total Amount'],['12%','Validity Date'],['11%','Actions']].map(([w,label]) => (
                  <th key={label} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: '#9CA3AF', width: w }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => {
                const rfq = rfqs.find(r => r.id === q.rfq_id);
                const supplier = rfq ? rfqSuppliers[rfq.supplier_id] : null;
                return (
                  <tr key={q.id} className="transition-colors" style={{ borderBottom: '1px solid #F9FAFB' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <td className="px-4 py-4"><span className="text-sm font-mono" style={{ color: '#6B7280' }}>{q.quotation_number}</span></td>
                    <td className="px-4 py-4"><span className="text-sm font-medium" style={{ color: '#1F2937' }}>{supplier?.company_name || '-'}</span></td>
                    <td className="px-4 py-4"><span className="text-sm font-mono" style={{ color: '#6B7280' }}>{rfq?.rfq_number || '-'}</span></td>
                    <td className="px-4 py-4">
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium" style={getStatusStyle(q.status)}>{statusLabel(q.status)}</span>
                    </td>
                    <td className="px-4 py-4"><span className="text-sm" style={{ color: '#6B7280' }}>{q.currency}</span></td>
                    <td className="px-4 py-4"><span className="text-sm font-medium" style={{ color: '#1F2937' }}>{fmt(q.total_amount)}</span></td>
                    <td className="px-4 py-4"><span className="text-sm" style={{ color: '#6B7280' }}>{q.validity_date ? new Date(q.validity_date).toLocaleDateString() : '-'}</span></td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => navigate(`/quotations/${q.id}`)}
                          className="text-sm font-medium transition-colors"
                          style={{ color: '#4C5FD5' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#6366F1'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = '#4C5FD5'; }}
                        >
                          View
                        </button>
                        <div className="relative" ref={openMenuId === q.id ? menuRef : null}>
                          <button
                            onClick={() => setOpenMenuId(openMenuId === q.id ? null : q.id)}
                            className="p-1 rounded-md transition-colors"
                            style={{ color: '#9CA3AF' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F3F4F6'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <MoreVertical size={16} />
                          </button>
                          {openMenuId === q.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 py-1 rounded-lg z-10"
                              style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                              <MenuBtn onClick={() => navigate(`/quotations/${q.id}`)}>View Details</MenuBtn>
                              {q.status === 'received' && !(isProcurementManager || isCOD) && <MenuBtn onClick={() => { handleAction('submit', q); }}>Submit for Review</MenuBtn>}
                              {isCOD && (
                                <MenuBtn color="#059669" hoverBg="#D1FAE5" onClick={() => { setApproveTarget(q); setOpenMenuId(null); }}>Approve (COD)</MenuBtn>
                              )}
                              {isProcurementManager && (
                                <MenuBtn color="#059669" hoverBg="#D1FAE5" onClick={() => { setApproveTarget(q); setOpenMenuId(null); }}>Approve (PM)</MenuBtn>
                              )}
                              {isCOD && (
                                <MenuBtn color="#DC2626" hoverBg="#FEE2E2" onClick={() => { setRejectTarget(q); setRejectionNotes(''); setOpenMenuId(null); }}>Reject (COD)</MenuBtn>
                              )}
                              {isProcurementManager && (
                                <MenuBtn color="#DC2626" hoverBg="#FEE2E2" onClick={() => { setRejectTarget(q); setRejectionNotes(''); setOpenMenuId(null); }}>Reject (PM)</MenuBtn>
                              )}
                              {q.status === 'rejected' && <MenuBtn onClick={() => { handleAction('reopen', q); }}>Reopen</MenuBtn>}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Quotation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', animation: 'scaleIn 0.2s ease-out' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: '#1F2937' }}>Add Quotation</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-md" style={{ color: '#9CA3AF' }}><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>RFQ *</label>
                <select value={form.rfq_id} onChange={(e) => setForm({ ...form, rfq_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{ border: '1px solid #D1D5DB', color: '#1F2937', backgroundColor: '#fff' }}>
                  <option value="">Select RFQ</option>
                  {sentRfqs.map((rfq) => (
                    <option key={rfq.id} value={rfq.id}>{rfq.rfq_number} — {rfqSuppliers[rfq.supplier_id]?.company_name || rfq.supplier_id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Supplier Reference</label>
                <input value={form.supplier_reference} onChange={(e) => setForm({ ...form, supplier_reference: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg" style={{ border: '1px solid #D1D5DB', color: '#1F2937' }} placeholder="Supplier's reference number" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {([['Currency *','currency','text','USD'],['Subtotal *','subtotal','number','0.00'],['Shipping Cost','shipping_cost','number','0.00'],['Taxes','taxes','number','0.00'],['Other Costs','other_costs','number','0.00'],['Total Amount *','total_amount','number','0.00']] as [string,string,string,string][]).map(([label, field, type, ph]) => (
                  <div key={field}>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>{label}</label>
                    <input type={type} value={(form as any)[field]}
                      onChange={(e) => field === 'total_amount' ? setForm({ ...form, total_amount: e.target.value }) : handleFormChange(field, e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg" style={{ border: '1px solid #D1D5DB', color: '#1F2937' }} placeholder={ph} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {([['Payment Terms','payment_terms','e.g. Net 30'],['Delivery Terms','delivery_terms','e.g. FOB'],['Lead Time','lead_time','e.g. 30 days']] as [string,string,string][]).map(([label, field, ph]) => (
                  <div key={field}>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>{label}</label>
                    <input value={(form as any)[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg" style={{ border: '1px solid #D1D5DB', color: '#1F2937' }} placeholder={ph} />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Validity Date *</label>
                  <DatePicker selected={form.validity_date} onChange={(date) => setForm({ ...form, validity_date: date })} placeholder="Select date" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg" style={{ border: '1px solid #D1D5DB', color: '#1F2937' }} placeholder="Additional notes..." />
              </div>

              {/* Items section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold" style={{ color: '#374151' }}>Items</label>
                  <button
                    type="button"
                    onClick={() => setItemRows(rows => [...rows, emptyItem()])}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                    style={{ backgroundColor: '#EEF2FF', color: '#4C5FD5', border: '1px solid #C7D2FE' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E0E7FF'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#EEF2FF'; }}
                  >
                    <Plus size={12} /> Add Item
                  </button>
                </div>
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                        <th className="px-3 py-2 text-left font-medium" style={{ color: '#6B7280', width: '35%' }}>Description</th>
                        <th className="px-3 py-2 text-left font-medium" style={{ color: '#6B7280', width: '12%' }}>Qty</th>
                        <th className="px-3 py-2 text-left font-medium" style={{ color: '#6B7280', width: '12%' }}>Unit</th>
                        <th className="px-3 py-2 text-left font-medium" style={{ color: '#6B7280', width: '17%' }}>Unit Price</th>
                        <th className="px-3 py-2 text-left font-medium" style={{ color: '#6B7280', width: '17%' }}>Total</th>
                        <th className="px-3 py-2" style={{ width: '7%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemRows.map((row, i) => (
                        <tr key={i} style={{ borderBottom: i < itemRows.length - 1 ? '1px solid #F3F4F6' : undefined }}>
                          <td className="px-2 py-1.5">
                            <input value={row.description} onChange={(e) => updateItem(i, 'description', e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded" style={{ border: '1px solid #E5E7EB', color: '#1F2937' }} placeholder="Description" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" value={row.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded" style={{ border: '1px solid #E5E7EB', color: '#1F2937' }} placeholder="1" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input value={row.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded" style={{ border: '1px solid #E5E7EB', color: '#1F2937' }} placeholder="pcs" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" value={row.unit_price} onChange={(e) => updateItem(i, 'unit_price', e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded" style={{ border: '1px solid #E5E7EB', color: '#1F2937' }} placeholder="0.00" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" value={row.total_price} onChange={(e) => updateItem(i, 'total_price', e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded" style={{ border: '1px solid #E5E7EB', color: '#1F2937' }} placeholder="0.00" />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {itemRows.length > 1 && (
                              <button type="button" onClick={() => setItemRows(rows => rows.filter((_, idx) => idx !== i))}
                                className="p-1 rounded transition-colors" style={{ color: '#EF4444' }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEE2E2'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                                <Trash2 size={12} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Items without a description will be skipped.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: '#F3F4F6', color: '#374151' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E5E7EB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F3F4F6'; }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={isSaving} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: isSaving ? '#9CA3AF' : 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)', color: '#ffffff', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                {isSaving ? 'Creating...' : 'Add Quotation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirm */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => setApproveTarget(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm"
            style={{ boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', animation: 'scaleIn 0.2s ease-out' }}
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F2937' }}>Approve Quotation</h3>
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>Approve quotation {approveTarget.quotation_number}? This will mark it as selected.</p>
            <div className="flex gap-3">
              <button onClick={() => setApproveTarget(null)} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>Cancel</button>
              <button onClick={() => { handleAction('approve', approveTarget); setApproveTarget(null); }} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#059669', color: '#ffffff' }}>Approve</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => setRejectTarget(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md"
            style={{ boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', animation: 'scaleIn 0.2s ease-out' }}
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F2937' }}>Reject Quotation</h3>
            <p className="text-sm mb-4" style={{ color: '#6B7280' }}>Rejection notes are required.</p>
            <textarea value={rejectionNotes} onChange={(e) => setRejectionNotes(e.target.value)} rows={3}
              placeholder="Enter rejection reason..." className="w-full px-3 py-2 text-sm rounded-lg mb-4"
              style={{ border: '1px solid #E5E7EB', color: '#1F2937' }} />
            <div className="flex gap-3">
              <button onClick={() => setRejectTarget(null)} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>Cancel</button>
              <button onClick={() => { if (!rejectionNotes.trim()) { toast.error('Rejection notes are required'); return; } handleAction('reject', rejectTarget, rejectionNotes); setRejectTarget(null); }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#DC2626', color: '#ffffff' }}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MenuBtn: React.FC<{ onClick: () => void; color?: string; hoverBg?: string; children: React.ReactNode }> = ({ onClick, color = '#1F2937', hoverBg = '#F3F4F6', children }) => (
  <button onClick={onClick} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors"
    style={{ color }}
    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hoverBg; }}
    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
    {children}
  </button>
);
