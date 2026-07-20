import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Settings, Plus, X, Trash2, ChevronDown } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { DatePicker } from '../components/DatePicker';

// ─── Types ──────────────────────────────────────────────────────────────────

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

interface RFQ {
  id: string;
  rfq_number: string;
  request_id: string;
  supplier_id: string;
  response_deadline: string;
  sent_at: string | null;
  notes: string;
  status: string;
}

interface Supplier {
  id: string;
  company_name: string;
  email: string;
  phone_1: string;
}

interface QuotationItem {
  id: string;
  line_number: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  currency: string;
  origin_country: string;
  hs_code: string;
  warranty: string;
  package_count: number | null;
  gross_weight: number | null;
  net_weight: number | null;
  dimensions: string;
  brand: string;
  model: string;
  delivery_terms: string;
  lead_time: string;
  extra_data: Record<string, string> | null;
}

// ─── Built-in column definitions ────────────────────────────────────────────

interface ColDef {
  key: string;
  label: string;
  field?: keyof QuotationItem;
  type?: 'number' | 'text';
  defaultVisible: boolean;
}

const BUILTIN_COLS: ColDef[] = [
  { key: 'line_number', label: '#', field: 'line_number', defaultVisible: true },
  { key: 'description', label: 'Description', field: 'description', defaultVisible: true },
  { key: 'quantity', label: 'Qty', field: 'quantity', type: 'number', defaultVisible: true },
  { key: 'unit', label: 'Unit', field: 'unit', defaultVisible: true },
  { key: 'unit_price', label: 'Unit Price', field: 'unit_price', type: 'number', defaultVisible: true },
  { key: 'total_price', label: 'Total Price', field: 'total_price', type: 'number', defaultVisible: true },
  { key: 'currency', label: 'Currency', field: 'currency', defaultVisible: true },
  { key: 'origin_country', label: 'Origin', field: 'origin_country', defaultVisible: false },
  { key: 'warranty', label: 'Warranty', field: 'warranty', defaultVisible: false },
  { key: 'hs_code', label: 'HS Code', field: 'hs_code', defaultVisible: false },
  { key: 'package_count', label: 'Package Count', field: 'package_count', type: 'number', defaultVisible: false },
  { key: 'gross_weight', label: 'Gross Weight (kg)', field: 'gross_weight', type: 'number', defaultVisible: false },
  { key: 'net_weight', label: 'Net Weight (kg)', field: 'net_weight', type: 'number', defaultVisible: false },
  { key: 'dimensions', label: 'Dimensions (cm)', field: 'dimensions', defaultVisible: false },
  { key: 'brand', label: 'Brand', field: 'brand', defaultVisible: false },
  { key: 'model', label: 'Model', field: 'model', defaultVisible: false },
  { key: 'delivery_terms', label: 'Delivery Terms', field: 'delivery_terms', defaultVisible: false },
  { key: 'lead_time', label: 'Lead Time', field: 'lead_time', defaultVisible: false },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function fmt(n: number | string | null | undefined) {
  if (n === '' || n === null || n === undefined) return '-';
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function getVal(item: QuotationItem, col: ColDef): string {
  const v = item[col.field!];
  if (v === null || v === undefined || v === '') return '-';
  if (col.type === 'number') return fmt(v as number);
  return String(v);
}

function lsKey(qid: string) { return `quotation_columns_${qid}`; }

// ─── Main component ───────────────────────────────────────────────────────────

export const QuotationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isCOD, isProcurementManager, hasProcurementAccess } = useAuth();
  const toast = useToast();

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Quotation> & { validity_date_obj: Date | null }>({ validity_date_obj: null });
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);

  // Items table state
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set());
  const [customCols, setCustomCols] = useState<string[]>([]);
  const [showColMenu, setShowColMenu] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [showAddColInput, setShowAddColInput] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);

  // Inline add/edit item
  const [showAddRow, setShowAddRow] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<Record<string, any>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Notes expand
  const [notesExpanded, setNotesExpanded] = useState(false);

  // ─── Load columns from localStorage ───────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    const saved = localStorage.getItem(lsKey(id));
    if (saved) {
      const parsed = JSON.parse(saved);
      setVisibleCols(new Set(parsed.visible || []));
      setCustomCols(parsed.custom || []);
    } else {
      setVisibleCols(new Set(BUILTIN_COLS.filter(c => c.defaultVisible).map(c => c.key)));
    }
  }, [id]);

  const saveColState = (visible: Set<string>, custom: string[]) => {
    if (!id) return;
    localStorage.setItem(lsKey(id), JSON.stringify({ visible: [...visible], custom }));
  };

  const toggleCol = (key: string) => {
    const next = new Set(visibleCols);
    if (next.has(key)) next.delete(key); else next.add(key);
    setVisibleCols(next);
    saveColState(next, customCols);
  };

  const addCustomCol = () => {
    const name = newColName.trim();
    if (!name || customCols.includes(name)) return;
    const next = [...customCols, name];
    const nextVisible = new Set([...visibleCols, name]);
    setCustomCols(next);
    setVisibleCols(nextVisible);
    saveColState(nextVisible, next);
    setNewColName('');
    setShowAddColInput(false);
  };

  // ─── Col menu click-outside ────────────────────────────────────────────────

  useEffect(() => {
    const h = (e: MouseEvent) => { if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) setShowColMenu(false); };
    if (showColMenu) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showColMenu]);

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  useEffect(() => { if (id) fetchAll(); }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [q, itemsData] = await Promise.all([
        apiClient.get<Quotation>(`/quotations/${id}`),
        apiClient.get<QuotationItem[]>(`/quotations/${id}/items`),
      ]);
      setQuotation(q);
      setItems(itemsData);

      // merge extra_data keys into customCols
      const extraKeys = new Set<string>();
      itemsData.forEach(item => { if (item.extra_data) Object.keys(item.extra_data).forEach(k => extraKeys.add(k)); });
      if (extraKeys.size > 0) {
        setCustomCols(prev => {
          const merged = [...new Set([...prev, ...extraKeys])];
          const saved = localStorage.getItem(lsKey(id!));
          const parsed = saved ? JSON.parse(saved) : null;
          const visible = parsed ? new Set<string>(parsed.visible) : new Set(BUILTIN_COLS.filter(c => c.defaultVisible).map(c => c.key));
          extraKeys.forEach(k => { if (!parsed) visible.add(k); });
          setVisibleCols(visible);
          saveColState(visible, merged);
          return merged;
        });
      }

      // fetch RFQ
      const rfqData = await apiClient.get<RFQ>(`/rfqs/${q.rfq_id}`);
      setRfq(rfqData);

      // fetch supplier
      const supData = await apiClient.get<Supplier>(`/suppliers/${rfqData.supplier_id}`);
      setSupplier(supData);
    } catch {
      toast.error('Failed to load quotation');
    } finally { setLoading(false); }
  };

  const fetchItems = async () => {
    const data = await apiClient.get<QuotationItem[]>(`/quotations/${id}/items`);
    setItems(data);
  };

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleAction = async (action: string, extra?: string) => {
    try {
      let url = `/quotations/${id}/${action}`;
      if (action === 'reject' && extra) url += `?rejection_notes=${encodeURIComponent(extra)}`;
      await apiClient.patch(url, {});
      toast.success(`Quotation ${statusLabel(action)}d successfully`);
      fetchAll();
    } catch { toast.error(`Failed to ${action} quotation`); }
  };

  const handleEdit = async () => {
    if (!editForm.currency || !editForm.validity_date_obj) { toast.error('Fill in required fields'); return; }
    try {
      await apiClient.patch(`/quotations/${id}`, {
        supplier_reference: editForm.supplier_reference || null,
        currency: editForm.currency,
        subtotal: parseFloat(String(editForm.subtotal)) || 0,
        shipping_cost: parseFloat(String(editForm.shipping_cost)) || 0,
        taxes: parseFloat(String(editForm.taxes)) || 0,
        other_costs: parseFloat(String(editForm.other_costs)) || 0,
        total_amount: parseFloat(String(editForm.total_amount)) || 0,
        payment_terms: editForm.payment_terms || null,
        delivery_terms: editForm.delivery_terms || null,
        lead_time: editForm.lead_time || null,
        validity_date: editForm.validity_date_obj!.toISOString(),
        notes: editForm.notes || null,
      });
      toast.success('Quotation updated');
      setShowEditModal(false);
      fetchAll();
    } catch { toast.error('Failed to update quotation'); }
  };

  const openEditModal = () => {
    if (!quotation) return;
    const calc = (parseFloat(String(quotation.subtotal)) || 0) + (parseFloat(String(quotation.shipping_cost)) || 0)
      + (parseFloat(String(quotation.taxes)) || 0) + (parseFloat(String(quotation.other_costs)) || 0);
    setEditForm({
      ...quotation,
      total_amount: quotation.total_amount ?? calc,
      validity_date_obj: quotation.validity_date ? new Date(quotation.validity_date) : null,
    });
    setShowEditModal(true);
  };

  const calcEditTotal = (f: typeof editForm) => {
    return (parseFloat(String(f.subtotal)) || 0) + (parseFloat(String(f.shipping_cost)) || 0)
      + (parseFloat(String(f.taxes)) || 0) + (parseFloat(String(f.other_costs)) || 0);
  };

  const handleEditFormChange = (field: string, value: any) => {
    const updated = { ...editForm, [field]: value };
    if (['subtotal', 'shipping_cost', 'taxes', 'other_costs'].includes(field)) {
      updated.total_amount = calcEditTotal(updated);
    }
    setEditForm(updated);
  };

  // ─── Item helpers ──────────────────────────────────────────────────────────

  const allCols = [...BUILTIN_COLS, ...customCols.map(name => ({ key: name, label: name, field: undefined, defaultVisible: true } as ColDef))];
  const activeCols = allCols.filter(c => visibleCols.has(c.key));

  const blankItemForm = (): Record<string, any> => {
    const f: Record<string, any> = {};
    BUILTIN_COLS.forEach(c => { if (c.key !== 'line_number') f[c.key] = ''; });
    customCols.forEach(name => { f[name] = ''; });
    f.unit = 'pcs'; f.currency = quotation?.currency || 'USD';
    return f;
  };

  const startAddRow = () => {
    setEditingItemId(null);
    setItemForm(blankItemForm());
    setShowAddRow(true);
  };

  const startEditRow = (item: QuotationItem) => {
    const f: Record<string, any> = {};
    BUILTIN_COLS.forEach(c => { if (c.key !== 'line_number') f[c.key] = (item as any)[c.key] ?? ''; });
    customCols.forEach(name => { f[name] = item.extra_data?.[name] ?? ''; });
    setItemForm(f);
    setEditingItemId(item.id);
    setShowAddRow(false);
  };

  const cancelItemForm = () => { setShowAddRow(false); setEditingItemId(null); setItemForm({}); };

  const handleItemFormChange = (key: string, value: string) => {
    const next = { ...itemForm, [key]: value };
    // auto-calc total_price
    if (key === 'quantity' || key === 'unit_price') {
      const qty = parseFloat(String(key === 'quantity' ? value : next.quantity)) || 0;
      const up = parseFloat(String(key === 'unit_price' ? value : next.unit_price)) || 0;
      next.total_price = qty * up;
    }
    setItemForm(next);
  };

  const buildItemBody = (lineNumber: number) => {
    const extra: Record<string, string> = {};
    customCols.forEach(name => { if (itemForm[name] !== '' && itemForm[name] !== undefined) extra[name] = String(itemForm[name]); });
    return {
      document_type: 'quotation',
      document_id: id,
      line_number: lineNumber,
      description: itemForm.description || '',
      quantity: parseFloat(String(itemForm.quantity)) || 1,
      unit: itemForm.unit || 'pcs',
      unit_price: parseFloat(String(itemForm.unit_price)) || 0,
      total_price: parseFloat(String(itemForm.total_price)) || 0,
      currency: itemForm.currency || quotation?.currency || 'USD',
      origin_country: itemForm.origin_country || null,
      hs_code: itemForm.hs_code || null,
      warranty: itemForm.warranty || null,
      package_count: itemForm.package_count !== '' && itemForm.package_count !== undefined ? parseFloat(String(itemForm.package_count)) : null,
      gross_weight: itemForm.gross_weight !== '' && itemForm.gross_weight !== undefined ? parseFloat(String(itemForm.gross_weight)) : null,
      net_weight: itemForm.net_weight !== '' && itemForm.net_weight !== undefined ? parseFloat(String(itemForm.net_weight)) : null,
      dimensions: itemForm.dimensions || null,
      brand: itemForm.brand || null,
      model: itemForm.model || null,
      delivery_terms: itemForm.delivery_terms || null,
      lead_time: itemForm.lead_time || null,
      extra_data: Object.keys(extra).length > 0 ? extra : null,
    };
  };

  const handleSaveItem = async () => {
    try {
      if (editingItemId) {
        const item = items.find(i => i.id === editingItemId)!;
        await apiClient.patch(`/quotations/${id}/items/${editingItemId}`, buildItemBody(item.line_number));
      } else {
        await apiClient.post(`/quotations/${id}/items`, buildItemBody(items.length + 1));
      }
      cancelItemForm();
      await fetchItems();
      toast.success('Item saved');
    } catch { toast.error('Failed to save item'); }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await apiClient.delete(`/quotations/${id}/items/${itemId}`);
      setDeleteConfirmId(null);
      await fetchItems();
      toast.success('Item deleted');
    } catch { toast.error('Failed to delete item'); }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="p-6 flex items-center justify-center" style={{ minHeight: '100vh' }}>
      <div style={{ color: '#9CA3AF' }}>Loading...</div>
    </div>
  );

  if (!quotation) return (
    <div className="p-6 flex items-center justify-center" style={{ minHeight: '100vh' }}>
      <div style={{ color: '#9CA3AF' }}>Quotation not found</div>
    </div>
  );

  const canEdit = quotation.status === 'received';
  const backPath = rfq ? `/requests/${rfq.request_id}` : '/requests';

  return (
    <div className="p-6" style={{ backgroundColor: '#F5F7FA', minHeight: '100vh', animation: 'fadeIn 0.3s ease-out' }}>
      <div className="max-w-[1400px] mx-auto">

        {/* Back */}
        <Link to={backPath} className="inline-flex items-center gap-2 mb-6 text-sm font-medium transition-colors"
          style={{ color: '#6B7280' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#4C5FD5'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#6B7280'; }}>
          <ArrowLeft size={16} />
          Back to Request
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-[28px] font-bold" style={{ color: '#1F2937' }}>{quotation.quotation_number}</h1>
                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium" style={getStatusStyle(quotation.status)}>{statusLabel(quotation.status)}</span>
              </div>
              <div className="flex items-center gap-4 text-sm" style={{ color: '#6B7280' }}>
                {supplier && <span>Supplier: <span style={{ color: '#1F2937' }}>{supplier.company_name}</span></span>}
                {rfq && <span>RFQ: <span className="font-mono" style={{ color: '#1F2937' }}>{rfq.rfq_number}</span></span>}
                <span>Created {new Date(quotation.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {quotation.status === 'received' && (
                <>
                  <ActionButton onClick={openEditModal} variant="outline">Edit</ActionButton>
                  <ActionButton onClick={() => handleAction('submit')} variant="primary">Submit for Review</ActionButton>
                </>
              )}
              {quotation.status === 'under_review' && (isProcurementManager || isCOD) && (
                <>
                  <ActionButton onClick={() => setShowApproveModal(true)} variant="success">Approve</ActionButton>
                  <ActionButton onClick={() => { setRejectNotes(''); setShowRejectModal(true); }} variant="danger">Reject</ActionButton>
                </>
              )}
              {quotation.status === 'rejected' && (
                <ActionButton onClick={() => handleAction('reopen')} variant="secondary">Reopen</ActionButton>
              )}
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: '65% 1fr' }}>

          {/* Left: Quotation Details */}
          <div className="p-6 rounded-2xl" style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
            <h3 className="text-base font-semibold mb-5" style={{ color: '#1F2937' }}>Quotation Details</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <DetailField label="Quotation #" value={quotation.quotation_number} mono />
              <DetailField label="Supplier Reference" value={quotation.supplier_reference} />
              <DetailField label="Currency" value={quotation.currency} />
              <DetailField label="Subtotal" value={fmt(quotation.subtotal)} />
              <DetailField label="Shipping Cost" value={fmt(quotation.shipping_cost)} />
              <DetailField label="Taxes" value={fmt(quotation.taxes)} />
              <DetailField label="Other Costs" value={fmt(quotation.other_costs)} />
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#9CA3AF' }}>Total Amount</label>
                <p className="text-sm font-bold" style={{ color: '#1F2937' }}>{fmt(quotation.total_amount)}</p>
              </div>
              <DetailField label="Payment Terms" value={quotation.payment_terms} />
              <DetailField label="Delivery Terms" value={quotation.delivery_terms} />
              <DetailField label="Lead Time" value={quotation.lead_time} />
              <DetailField label="Validity Date" value={quotation.validity_date ? new Date(quotation.validity_date).toLocaleDateString() : '-'} />
              <DetailField label="Created At" value={new Date(quotation.created_at).toLocaleDateString()} />
            </div>

            {/* Notes */}
            {quotation.notes && (
              <div className="mt-5">
                <label className="block text-xs font-medium uppercase tracking-wide mb-2" style={{ color: '#9CA3AF' }}>Notes</label>
                <div className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: '#F8F9FA', color: '#374151', maxHeight: notesExpanded ? 'none' : '80px', overflow: 'hidden', whiteSpace: 'pre-wrap' }}>
                  {quotation.notes}
                </div>
                {quotation.notes.length > 200 && (
                  <button onClick={() => setNotesExpanded(!notesExpanded)} className="text-sm font-medium mt-1" style={{ color: '#4C5FD5' }}>
                    {notesExpanded ? 'View less' : 'View more'}
                  </button>
                )}
              </div>
            )}

            {/* Rejection Notes */}
            {quotation.status === 'rejected' && quotation.rejection_notes && (
              <div className="mt-4 pl-3" style={{ borderLeft: '3px solid #FBBF24' }}>
                <label className="block text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#F59E0B' }}>Rejection Notes</label>
                <p className="text-sm" style={{ color: '#374151', whiteSpace: 'pre-wrap' }}>{quotation.rejection_notes}</p>
              </div>
            )}
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Supplier Card */}
            <div className="p-5 rounded-2xl" style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
              <h3 className="text-base font-semibold mb-4" style={{ color: '#1F2937' }}>Supplier</h3>
              <div className="space-y-3">
                <DetailField label="Company" value={supplier?.company_name} />
                <DetailField label="Email" value={supplier?.email} />
                <DetailField label="Phone" value={supplier?.phone_1} />
              </div>
              {supplier && (
                <Link to={`/suppliers/${supplier.id}`}
                  className="inline-flex items-center gap-1 mt-4 text-sm font-medium transition-colors"
                  style={{ color: '#4C5FD5' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#6366F1'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#4C5FD5'; }}>
                  View Supplier →
                </Link>
              )}
            </div>

            {/* RFQ Card */}
            {rfq && (
              <div className="p-5 rounded-2xl" style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
                <h3 className="text-base font-semibold mb-4" style={{ color: '#1F2937' }}>RFQ</h3>
                <div className="space-y-3">
                  <DetailField label="RFQ Number" value={rfq.rfq_number} mono />
                  <DetailField label="Response Deadline" value={rfq.response_deadline ? new Date(rfq.response_deadline).toLocaleDateString() : '-'} />
                  <DetailField label="Sent At" value={rfq.sent_at ? new Date(rfq.sent_at).toLocaleDateString() : '-'} />
                  {rfq.notes && <DetailField label="Notes" value={rfq.notes} />}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Items Card — full width */}
        <div className="p-6 rounded-2xl" style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold" style={{ color: '#1F2937' }}>Items ({items.length})</h3>
            <div className="flex items-center gap-2">
              {/* Column toggle */}
              <div className="relative" ref={colMenuRef}>
                <button
                  onClick={() => setShowColMenu(!showColMenu)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
                  style={{ border: '1px solid #D1D5DB', color: '#374151', backgroundColor: '#ffffff' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F3F4F6'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
                >
                  <Settings size={13} />
                  Columns
                  <ChevronDown size={12} />
                </button>
                {showColMenu && (
                  <div className="absolute right-0 top-full mt-1 w-56 rounded-lg z-20 py-2"
                    style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <div className="px-3 pb-2 mb-1" style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Built-in columns</p>
                    </div>
                    {BUILTIN_COLS.filter(c => c.key !== 'line_number').map(col => (
                      <label key={col.key} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm transition-colors"
                        style={{ color: '#374151' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F3F4F6'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                        <input type="checkbox" checked={visibleCols.has(col.key)} onChange={() => toggleCol(col.key)} className="rounded" />
                        {col.label}
                      </label>
                    ))}
                    {customCols.length > 0 && (
                      <>
                        <div className="px-3 py-2 mt-1 mb-1" style={{ borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
                          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Custom columns</p>
                        </div>
                        {customCols.map(name => (
                          <label key={name} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm transition-colors"
                            style={{ color: '#374151' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F3F4F6'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                            <input type="checkbox" checked={visibleCols.has(name)} onChange={() => toggleCol(name)} className="rounded" />
                            {name}
                          </label>
                        ))}
                      </>
                    )}
                    {/* Add column */}
                    <div className="px-3 pt-2 mt-1" style={{ borderTop: '1px solid #F3F4F6' }}>
                      {showAddColInput ? (
                        <div className="flex gap-1">
                          <input value={newColName} onChange={(e) => setNewColName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') addCustomCol(); if (e.key === 'Escape') setShowAddColInput(false); }}
                            placeholder="Column name" autoFocus
                            className="flex-1 px-2 py-1 text-xs rounded"
                            style={{ border: '1px solid #D1D5DB', color: '#1F2937' }} />
                          <button onClick={addCustomCol} className="px-2 py-1 text-xs rounded font-medium text-white"
                            style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)' }}>Add</button>
                        </div>
                      ) : (
                        <button onClick={() => setShowAddColInput(true)}
                          className="flex items-center gap-1 text-xs font-medium transition-colors"
                          style={{ color: '#4C5FD5' }}>
                          <Plus size={12} /> Add Column
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Add Item */}
              {canEdit && (
                <button onClick={startAddRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg"
                  style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)' }}>
                  <Plus size={13} />
                  Add Item
                </button>
              )}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: `${(activeCols.length + 1) * 100}px` }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  {/* Always show line number */}
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap" style={{ color: '#9CA3AF', width: '40px' }}>#</th>
                  {activeCols.filter(c => c.key !== 'line_number').map(col => (
                    <th key={col.key} className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap" style={{ color: '#9CA3AF' }}>{col.label}</th>
                  ))}
                  {canEdit && <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: '#9CA3AF', width: '80px' }}></th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isEditing = editingItemId === item.id;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F9FAFB' }}
                      onMouseEnter={(e) => { if (!isEditing) e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                      onMouseLeave={(e) => { if (!isEditing) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                      <td className="px-3 py-3 text-xs" style={{ color: '#6B7280' }}>{item.line_number}</td>
                      {activeCols.filter(c => c.key !== 'line_number').map(col => (
                        <td key={col.key} className="px-3 py-3 text-xs" style={{ color: col.key === 'total_price' ? '#1F2937' : '#6B7280', fontWeight: col.key === 'total_price' ? 600 : 400 }}>
                          {isEditing ? (
                            <input value={itemForm[col.key] ?? ''}
                              onChange={(e) => handleItemFormChange(col.key, e.target.value)}
                              type={col.type === 'number' ? 'number' : 'text'}
                              className="w-full px-2 py-1 text-xs rounded"
                              style={{ border: '1px solid #D1D5DB', color: '#1F2937', minWidth: '60px' }} />
                          ) : (
                            col.field
                              ? getVal(item, col)
                              : (item.extra_data?.[col.key] ?? '-')
                          )}
                        </td>
                      ))}
                      {canEdit && (
                        <td className="px-3 py-3">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <button onClick={handleSaveItem} className="text-xs font-medium" style={{ color: '#059669' }}>Save</button>
                              <button onClick={cancelItemForm} className="text-xs font-medium" style={{ color: '#6B7280' }}>Cancel</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button onClick={() => startEditRow(item)} className="text-xs font-medium transition-colors" style={{ color: '#4C5FD5' }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = '#6366F1'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = '#4C5FD5'; }}>Edit</button>
                              <button onClick={() => setDeleteConfirmId(item.id)} className="text-xs font-medium transition-colors" style={{ color: '#DC2626' }}>Del</button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}

                {/* Add row */}
                {showAddRow && (
                  <tr style={{ borderBottom: '1px solid #F9FAFB', backgroundColor: '#F0F4FF' }}>
                    <td className="px-3 py-3 text-xs" style={{ color: '#9CA3AF' }}>*</td>
                    {activeCols.filter(c => c.key !== 'line_number').map(col => (
                      <td key={col.key} className="px-3 py-2">
                        <input value={itemForm[col.key] ?? ''}
                          onChange={(e) => handleItemFormChange(col.key, e.target.value)}
                          type={col.type === 'number' ? 'number' : 'text'}
                          className="w-full px-2 py-1 text-xs rounded"
                          style={{ border: '1px solid #D1D5DB', color: '#1F2937', minWidth: '60px' }} />
                      </td>
                    ))}
                    {canEdit && (
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button onClick={handleSaveItem} className="text-xs font-medium" style={{ color: '#059669' }}>Add</button>
                          <button onClick={cancelItemForm} className="text-xs font-medium" style={{ color: '#6B7280' }}>Cancel</button>
                        </div>
                      </td>
                    )}
                  </tr>
                )}

                {items.length === 0 && !showAddRow && (
                  <tr>
                    <td colSpan={activeCols.length + 1} className="px-3 py-8 text-center text-sm" style={{ color: '#9CA3AF' }}>
                      No items added yet{canEdit ? ' — click "Add Item" to start' : ''}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Quotation Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', animation: 'scaleIn 0.2s ease-out' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: '#1F2937' }}>Edit Quotation</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 rounded-md" style={{ color: '#9CA3AF' }}><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Supplier Reference</label>
                <input value={editForm.supplier_reference || ''} onChange={(e) => setEditForm({ ...editForm, supplier_reference: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg" style={{ border: '1px solid #D1D5DB', color: '#1F2937' }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {([['Currency *','currency','text'],['Subtotal *','subtotal','number'],['Shipping Cost','shipping_cost','number'],['Taxes','taxes','number'],['Other Costs','other_costs','number'],['Total Amount *','total_amount','number']] as [string,string,string][]).map(([label, field, type]) => (
                  <div key={field}>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>{label}</label>
                    <input type={type} value={(editForm as any)[field] ?? ''}
                      onChange={(e) => field === 'total_amount' ? setEditForm({ ...editForm, total_amount: e.target.value as any }) : handleEditFormChange(field, e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg" style={{ border: '1px solid #D1D5DB', color: '#1F2937' }} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {([['Payment Terms','payment_terms'],['Delivery Terms','delivery_terms'],['Lead Time','lead_time']] as [string,string][]).map(([label, field]) => (
                  <div key={field}>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>{label}</label>
                    <input value={(editForm as any)[field] || ''} onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg" style={{ border: '1px solid #D1D5DB', color: '#1F2937' }} />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Validity Date *</label>
                  <DatePicker selected={editForm.validity_date_obj} onChange={(d) => setEditForm({ ...editForm, validity_date_obj: d })} placeholder="Select date" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Notes</label>
                <textarea value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg" style={{ border: '1px solid #D1D5DB', color: '#1F2937' }} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: '#F3F4F6', color: '#374151' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E5E7EB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F3F4F6'; }}>Cancel</button>
              <button onClick={handleEdit} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)', color: '#ffffff' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => setShowApproveModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm"
            style={{ boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', animation: 'scaleIn 0.2s ease-out' }}
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F2937' }}>Approve Quotation</h3>
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>Approve {quotation.quotation_number}? This will mark it as selected and update the request status.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowApproveModal(false)} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>Cancel</button>
              <button onClick={() => { handleAction('approve'); setShowApproveModal(false); }} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#059669', color: '#ffffff' }}>Approve</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => setShowRejectModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md"
            style={{ boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', animation: 'scaleIn 0.2s ease-out' }}
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F2937' }}>Reject Quotation</h3>
            <p className="text-sm mb-4" style={{ color: '#6B7280' }}>Rejection notes are required.</p>
            <textarea value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} rows={3}
              placeholder="Enter rejection reason..." className="w-full px-3 py-2 text-sm rounded-lg mb-4"
              style={{ border: '1px solid #E5E7EB', color: '#1F2937' }} />
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>Cancel</button>
              <button onClick={() => { if (!rejectNotes.trim()) { toast.error('Rejection notes are required'); return; } handleAction('reject', rejectNotes); setShowRejectModal(false); }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#DC2626', color: '#ffffff' }}>Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Item Confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm"
            style={{ boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', animation: 'scaleIn 0.2s ease-out' }}
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F2937' }}>Delete Item</h3>
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>Are you sure you want to delete this item? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>Cancel</button>
              <button onClick={() => handleDeleteItem(deleteConfirmId)} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#DC2626', color: '#ffffff' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Small helpers ─────────────────────────────────────────────────────────────

const DetailField: React.FC<{ label: string; value?: string | null; mono?: boolean }> = ({ label, value, mono }) => (
  <div>
    <label className="block text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#9CA3AF' }}>{label}</label>
    <p className={`text-sm ${mono ? 'font-mono' : ''}`} style={{ color: '#1F2937' }}>{value || '-'}</p>
  </div>
);

const ActionButton: React.FC<{ onClick: () => void; variant: 'secondary' | 'success' | 'danger' | 'outline' | 'primary'; children: React.ReactNode }> = ({ onClick, variant, children }) => {
  if (variant === 'primary') {
    return (
      <button onClick={onClick}
        className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity"
        style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)' }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}>
        {children}
      </button>
    );
  }
  if (variant === 'outline') {
    return (
      <button onClick={onClick}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{ backgroundColor: 'transparent', color: '#374151', border: '1px solid #D1D5DB' }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
        {children}
      </button>
    );
  }
  const styles = {
    secondary: { backgroundColor: '#F3F4F6', color: '#374151', hover: '#E5E7EB' },
    success: { backgroundColor: '#D1FAE5', color: '#065F46', hover: '#A7F3D0' },
    danger: { backgroundColor: '#FEE2E2', color: '#DC2626', hover: '#FECACA' },
  };
  const s = styles[variant as 'secondary' | 'success' | 'danger'];
  return (
    <button onClick={onClick}
      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      style={{ backgroundColor: s.backgroundColor, color: s.color }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = s.hover; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = s.backgroundColor; }}>
      {children}
    </button>
  );
};
