import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Settings, Plus, FileText } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PurchaseOrder {
  id: string;
  po_number: string;
  status: string;
  offer_version_id: string;
  request_id: string;
  quotation_id: string;
  supplier_id: string;
  created_by_user_id: string | null;
  currency: string;
  subtotal: number;
  shipping_cost: number;
  taxes: number;
  other_costs: number;
  total_amount: number;
  payment_terms: string | null;
  delivery_terms: string | null;
  lead_time: string | null;
  notes: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Supplier {
  id: string;
  company_name: string;
  email: string;
  phone_1: string;
  address: string | null;
}

interface Request {
  id: string;
  request_number: string;
  title: string;
  status: string;
}

interface POItem {
  id: string;
  line_number: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  currency: string;
  origin_country: string | null;
  hs_code: string | null;
  warranty: string | null;
  package_count: number | null;
  gross_weight: number | null;
  net_weight: number | null;
  dimensions: string | null;
  brand: string | null;
  model: string | null;
  delivery_terms: string | null;
  lead_time: string | null;
  extra_data: Record<string, string> | null;
}

// ─── Column defs ──────────────────────────────────────────────────────────────

interface ColDef {
  key: string;
  label: string;
  field?: keyof POItem;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function lsKey(id: string) { return `po_columns_${id}`; }

// ─── Sub-components ───────────────────────────────────────────────────────────

const DetailField: React.FC<{ label: string; value: string | null | undefined; large?: boolean; mono?: boolean }> = ({ label, value, large, mono }) => (
  <div>
    <div className="text-xs mb-1" style={{ color: '#9CA3AF' }}>{label}</div>
    <div className={`${large ? 'text-xl font-bold' : 'text-sm'} ${mono ? 'font-mono' : ''}`} style={{ color: '#1F2937' }}>{value || '-'}</div>
  </div>
);

const ActionButton: React.FC<{ onClick: () => void; variant: 'primary' | 'secondary' | 'success' | 'danger'; children: React.ReactNode }> = ({ onClick, variant, children }) => {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)', color: '#fff' },
    secondary: { backgroundColor: '#fff', color: '#374151', border: '1px solid #E5E7EB' },
    success: { backgroundColor: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0' },
    danger: { backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' },
  };
  return (
    <button onClick={onClick} className="px-4 py-2 text-sm font-medium rounded-lg transition-all" style={styles[variant]}>
      {children}
    </button>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const PurchaseOrderPage: React.FC = () => {
  const { poId } = useParams<{ poId: string }>();
  const navigate = useNavigate();
  const { isCOD, hasProcurementAccess } = useAuth();
  const toast = useToast();

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [request, setRequest] = useState<Request | null>(null);
  const [items, setItems] = useState<POItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesExpanded, setNotesExpanded] = useState(false);

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRequestChangesConfirm, setShowRequestChangesConfirm] = useState(false);

  // Items column state
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set());
  const [customCols, setCustomCols] = useState<string[]>([]);
  const [showColMenu, setShowColMenu] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [showAddColInput, setShowAddColInput] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);

  // Inline item editing
  const [showAddRow, setShowAddRow] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<Record<string, any>>({});
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  // ─── Columns localStorage ─────────────────────────────────────────────────

  useEffect(() => {
    if (!poId) return;
    const saved = localStorage.getItem(lsKey(poId));
    if (saved) {
      const parsed = JSON.parse(saved);
      setVisibleCols(new Set(parsed.visible || []));
      setCustomCols(parsed.custom || []);
    } else {
      setVisibleCols(new Set(BUILTIN_COLS.filter(c => c.defaultVisible).map(c => c.key)));
    }
  }, [poId]);

  const saveColState = (visible: Set<string>, custom: string[]) => {
    if (!poId) return;
    localStorage.setItem(lsKey(poId), JSON.stringify({ visible: [...visible], custom }));
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

  useEffect(() => {
    const h = (e: MouseEvent) => { if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) setShowColMenu(false); };
    if (showColMenu) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showColMenu]);

  // ─── Fetch ────────────────────────────────────────────────────────────────

  useEffect(() => { if (poId) fetchAll(); }, [poId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [poData, itemsData] = await Promise.all([
        apiClient.get<PurchaseOrder>(`/purchase-orders/${poId}`),
        apiClient.get<POItem[]>(`/purchase-orders/${poId}/items`),
      ]);
      setPo(poData);
      setItems(itemsData);

      // merge extra_data keys into customCols
      const extraKeys = new Set<string>();
      itemsData.forEach(item => { if (item.extra_data) Object.keys(item.extra_data).forEach(k => extraKeys.add(k)); });
      if (extraKeys.size > 0) {
        setCustomCols(prev => {
          const merged = [...new Set([...prev, ...extraKeys])];
          const saved = localStorage.getItem(lsKey(poId!));
          const parsed = saved ? JSON.parse(saved) : null;
          const visible = parsed ? new Set<string>(parsed.visible) : new Set(BUILTIN_COLS.filter(c => c.defaultVisible).map(c => c.key));
          extraKeys.forEach(k => { if (!parsed) visible.add(k); });
          setVisibleCols(visible);
          saveColState(visible, merged);
          return merged;
        });
      }

      // fetch supplier
      const supData = await apiClient.get<Supplier>(`/suppliers/${poData.supplier_id}`);
      setSupplier(supData);

      // fetch request
      const reqData = await apiClient.get<Request>(`/requests/${poData.request_id}`);
      setRequest(reqData);
    } catch {
      toast.error('Failed to load Purchase Order');
    } finally { setLoading(false); }
  };

  // ─── PDF ──────────────────────────────────────────────────────────────────

  const openPdf = async (url: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000${url}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      
      // Use request number for filename
      const requestNumber = request?.request_number || 'Unknown';
      a.download = `${requestNumber}_Purchase Order.pdf`;
      
      a.click();
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
    } catch {
      toast.error('Failed to generate PDF');
    }
  };

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleSend = async () => {
    try {
      await apiClient.patch(`/purchase-orders/${poId}/send`, {});
      toast.success('Purchase Order sent to supplier');
      setShowSendConfirm(false);
      fetchAll();
    } catch { toast.error('Failed to send Purchase Order'); }
  };

  const handleAccept = async () => {
    try {
      await apiClient.patch(`/purchase-orders/${poId}/accept`, {});
      toast.success('Purchase Order accepted');
      setShowAcceptConfirm(false);
      fetchAll();
    } catch { toast.error('Failed to accept Purchase Order'); }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/purchase-orders/${poId}`);
      toast.success('Purchase Order deleted');
      navigate(po ? `/requests/${po.request_id}` : '/requests');
    } catch { toast.error('Failed to delete Purchase Order'); }
  };

  const handleRequestChanges = async () => {
    try {
      await apiClient.patch(`/purchase-orders/${poId}/request-changes`, {});
      toast.success('Changes requested successfully');
      setShowRequestChangesConfirm(false);
      fetchAll();
    } catch { toast.error('Failed to request changes'); }
  };

  const handleEdit = async () => {
    try {
      await apiClient.patch(`/purchase-orders/${poId}`, {
        payment_terms: editForm.payment_terms || null,
        delivery_notes: editForm.delivery_terms || null,
        lead_time: editForm.lead_time || null,
        notes: editForm.notes || null,
        currency: editForm.currency || null,
        subtotal: parseFloat(String(editForm.subtotal)) || 0,
        shipping_cost: parseFloat(String(editForm.shipping_cost)) || 0,
        taxes: parseFloat(String(editForm.taxes)) || 0,
        other_costs: parseFloat(String(editForm.other_costs)) || 0,
        total_amount: parseFloat(String(editForm.total_amount)) || 0,
      });
      toast.success('Purchase Order updated');
      setShowEditModal(false);
      fetchAll();
    } catch { toast.error('Failed to update Purchase Order'); }
  };

  const openEditModal = () => {
    if (!po) return;
    setEditForm({
      payment_terms: po.payment_terms || '',
      delivery_terms: po.delivery_terms || '',
      lead_time: po.lead_time || '',
      notes: po.notes || '',
      currency: po.currency || '',
      subtotal: po.subtotal ?? '',
      shipping_cost: po.shipping_cost ?? '',
      taxes: po.taxes ?? '',
      other_costs: po.other_costs ?? '',
      total_amount: po.total_amount ?? '',
    });
    setShowEditModal(true);
  };

  const calcTotal = (f: Record<string, any>) =>
    (parseFloat(String(f.subtotal)) || 0) + (parseFloat(String(f.shipping_cost)) || 0) +
    (parseFloat(String(f.taxes)) || 0) + (parseFloat(String(f.other_costs)) || 0);

  const handleEditChange = (field: string, value: string) => {
    const next = { ...editForm, [field]: value };
    if (['subtotal', 'shipping_cost', 'taxes', 'other_costs'].includes(field)) {
      next.total_amount = calcTotal(next);
    }
    setEditForm(next);
  };

  // ─── Items columns ────────────────────────────────────────────────────────

  const allCols = [...BUILTIN_COLS, ...customCols.map(name => ({ key: name, label: name, field: undefined, type: undefined, defaultVisible: true } as ColDef))];
  const activeCols = allCols.filter(c => visibleCols.has(c.key));

  const blankItemForm = (): Record<string, any> => {
    const f: Record<string, any> = {};
    BUILTIN_COLS.forEach(c => { if (c.key !== 'line_number') f[c.key] = ''; });
    customCols.forEach(name => { f[name] = ''; });
    f.unit = 'pcs'; f.currency = po?.currency || 'USD';
    return f;
  };

  const startEditRow = (item: POItem) => {
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
      document_type: 'purchase_order',
      document_id: poId,
      line_number: lineNumber,
      description: itemForm.description || '',
      quantity: parseFloat(String(itemForm.quantity)) || 1,
      unit: itemForm.unit || 'pcs',
      unit_price: parseFloat(String(itemForm.unit_price)) || 0,
      total_price: parseFloat(String(itemForm.total_price)) || 0,
      currency: itemForm.currency || po?.currency || 'USD',
      origin_country: itemForm.origin_country || null,
      hs_code: itemForm.hs_code || null,
      warranty: itemForm.warranty || null,
      package_count: itemForm.package_count !== '' ? parseFloat(String(itemForm.package_count)) || null : null,
      gross_weight: itemForm.gross_weight !== '' ? parseFloat(String(itemForm.gross_weight)) || null : null,
      net_weight: itemForm.net_weight !== '' ? parseFloat(String(itemForm.net_weight)) || null : null,
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
        await apiClient.patch(`/purchase-orders/${poId}/items/${editingItemId}`, buildItemBody(item.line_number));
      } else {
        await apiClient.post(`/purchase-orders/${poId}/items`, buildItemBody(items.length + 1));
      }
      cancelItemForm();
      const data = await apiClient.get<POItem[]>(`/purchase-orders/${poId}/items`);
      setItems(data);
      toast.success('Item saved');
    } catch { toast.error('Failed to save item'); }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await apiClient.delete(`/purchase-orders/${poId}/items/${itemId}`);
      setDeleteItemId(null);
      const data = await apiClient.get<POItem[]>(`/purchase-orders/${poId}/items`);
      setItems(data);
      toast.success('Item deleted');
    } catch { toast.error('Failed to delete item'); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="p-6 flex items-center justify-center" style={{ minHeight: '100vh' }}>
      <div style={{ color: '#9CA3AF' }}>Loading...</div>
    </div>
  );

  if (!po) return (
    <div className="p-6 flex items-center justify-center" style={{ minHeight: '100vh' }}>
      <div style={{ color: '#9CA3AF' }}>Purchase Order not found</div>
    </div>
  );

  const backPath = `/requests/${po.request_id}`;
  const canAct = hasProcurementAccess || isCOD;

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
                <h1 className="text-[28px] font-bold" style={{ color: '#1F2937' }}>{po.po_number}</h1>
                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium" style={getStatusStyle(po.status)}>
                  {statusLabel(po.status)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm" style={{ color: '#6B7280' }}>
                {supplier && <span>Supplier: <span style={{ color: '#1F2937' }}>{supplier.company_name}</span></span>}
                <span>Created {new Date(po.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openPdf(`/pdf/purchase-orders/${po.id}`)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all"
                style={{ backgroundColor: '#ffffff', color: '#374151', border: '1px solid #E5E7EB' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
              >
                <FileText size={14} />
                Purchase Order PDF
              </button>
              {po.status === 'draft' && canAct && (
                <>
                  <ActionButton variant="secondary" onClick={openEditModal}>Edit PO</ActionButton>
                  <ActionButton variant="primary" onClick={() => setShowSendConfirm(true)}>Send PO</ActionButton>
                  <ActionButton variant="danger" onClick={() => setShowDeleteConfirm(true)}>Delete PO</ActionButton>
                </>
              )}
              {po.status === 'sent' && canAct && (
                <>
                  <ActionButton variant="secondary" onClick={() => setShowRequestChangesConfirm(true)}>Request Changes</ActionButton>
                  <ActionButton variant="success" onClick={() => setShowAcceptConfirm(true)}>Accept PO</ActionButton>
                </>
              )}
              {po.status === 'accepted' && canAct && (
                <ActionButton variant="secondary" onClick={() => setShowRequestChangesConfirm(true)}>Request Changes</ActionButton>
              )}
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid gap-6" style={{ gridTemplateColumns: '65% 1fr', alignItems: 'start' }}>

          {/* Left column */}
          <div className="space-y-6">
            {/* PO Details */}
            <div className="p-6 rounded-2xl" style={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
              <h3 className="text-base font-semibold mb-5" style={{ color: '#1F2937' }}>PO Details</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                <DetailField label="PO Number" value={po.po_number} mono />
                <div>
                  <div className="text-xs mb-1" style={{ color: '#9CA3AF' }}>Status</div>
                  <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium" style={getStatusStyle(po.status)}>{statusLabel(po.status)}</span>
                </div>
                <DetailField label="Currency" value={po.currency} />
                <DetailField label="Total Amount" value={fmt(po.total_amount)} large />
                <DetailField label="Subtotal" value={fmt(po.subtotal)} />
                <DetailField label="Shipping Cost" value={fmt(po.shipping_cost)} />
                <DetailField label="Taxes" value={fmt(po.taxes)} />
                <DetailField label="Other Costs" value={fmt(po.other_costs)} />
                <DetailField label="Payment Terms" value={po.payment_terms} />
                <DetailField label="Lead Time" value={po.lead_time} />
                <div className="col-span-2">
                  <DetailField label="Delivery Terms" value={po.delivery_terms} />
                </div>
                <DetailField label="Sent At" value={po.sent_at ? new Date(po.sent_at).toLocaleDateString() : null} />
                <DetailField label="Created At" value={new Date(po.created_at).toLocaleDateString()} />
              </div>
              {po.notes && (
                <div className="mt-5">
                  <div className="text-xs mb-1" style={{ color: '#9CA3AF' }}>Notes</div>
                  <div className="text-sm p-3 rounded-lg" style={{ backgroundColor: '#F9FAFB', color: '#1F2937', maxHeight: notesExpanded ? 'none' : 80, overflow: 'hidden' }}>
                    {po.notes}
                  </div>
                  {po.notes.length > 150 && (
                    <button onClick={() => setNotesExpanded(n => !n)} className="text-xs mt-1" style={{ color: '#4C5FD5' }}>
                      {notesExpanded ? 'Show less' : 'View more'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Items */}
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
                <h3 className="text-base font-semibold" style={{ color: '#1F2937' }}>Items</h3>
                <div className="flex items-center gap-2">
                  <div className="relative" ref={colMenuRef}>
                    <button onClick={() => setShowColMenu(v => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg"
                      style={{ border: '1px solid #E5E7EB', color: '#6B7280', backgroundColor: '#fff' }}>
                      <Settings size={13} /> Columns
                    </button>
                    {showColMenu && (
                      <div className="absolute right-0 mt-1 w-52 rounded-xl z-20 overflow-hidden"
                        style={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                        <div className="px-3 py-2" style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Toggle columns</span>
                        </div>
                        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                          {allCols.filter(c => c.key !== 'line_number').map(col => (
                            <label key={col.key} className="flex items-center gap-2 px-3 py-2 cursor-pointer text-sm"
                              style={{ color: '#374151' }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                              <input type="checkbox" checked={visibleCols.has(col.key)} onChange={() => toggleCol(col.key)} className="rounded" />
                              {col.label}
                            </label>
                          ))}
                        </div>
                        <div className="px-3 py-2" style={{ borderTop: '1px solid #F3F4F6' }}>
                          {showAddColInput ? (
                            <div className="flex gap-1">
                              <input autoFocus value={newColName} onChange={(e) => setNewColName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') addCustomCol(); if (e.key === 'Escape') setShowAddColInput(false); }}
                                placeholder="Column name" className="flex-1 px-2 py-1 text-xs rounded-md"
                                style={{ border: '1px solid #E5E7EB', color: '#374151' }} />
                              <button onClick={addCustomCol} className="px-2 py-1 text-xs font-medium text-white rounded-md"
                                style={{ backgroundColor: '#4C5FD5' }}>Add</button>
                            </div>
                          ) : (
                            <button onClick={() => setShowAddColInput(true)}
                              className="flex items-center gap-1 text-xs font-medium" style={{ color: '#4C5FD5' }}>
                              <Plus size={11} /> Add Column
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {po.status === 'draft' && canAct && (
                    <button onClick={() => { setItemForm(blankItemForm()); setShowAddRow(true); setEditingItemId(null); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg"
                      style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)' }}>
                      <Plus size={13} /> Add Item
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                      {activeCols.map(col => (
                        <th key={col.key} className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide"
                          style={{ color: '#9CA3AF', whiteSpace: 'nowrap' }}>{col.label}</th>
                      ))}
                      <th className="px-3 py-2.5" style={{ color: '#9CA3AF' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => {
                      if (editingItemId === item.id) {
                        return (
                          <tr key={item.id} style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                            {activeCols.map(col => (
                              <td key={col.key} className="px-2 py-1.5">
                                {col.key === 'line_number' ? (
                                  <span className="text-xs px-2" style={{ color: '#9CA3AF' }}>{item.line_number}</span>
                                ) : (
                                  <input value={itemForm[col.key] ?? ''} onChange={(e) => handleItemFormChange(col.key, e.target.value)}
                                    type={col.type === 'number' ? 'number' : 'text'}
                                    className="w-full px-2 py-1 text-xs rounded" style={{ border: '1px solid #D1D5DB', minWidth: 60 }} />
                                )}
                              </td>
                            ))}
                            <td className="px-2 py-1.5">
                              <div className="flex gap-1">
                                <button onClick={handleSaveItem} className="px-2 py-1 text-xs font-medium text-white rounded" style={{ backgroundColor: '#4C5FD5' }}>Save</button>
                                <button onClick={cancelItemForm} className="px-2 py-1 text-xs rounded" style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}>Cancel</button>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid #F9FAFB' }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                          {activeCols.map(col => {
                            let display = '-';
                            if (col.field) {
                              const v = (item as any)[col.field];
                              if (v !== null && v !== undefined && v !== '') display = col.type === 'number' ? fmt(v) : String(v);
                            } else {
                              const v = item.extra_data?.[col.key];
                              if (v) display = v;
                            }
                            return (
                              <td key={col.key} className="px-3 py-3"
                                style={{ color: col.key === 'line_number' ? '#9CA3AF' : '#1F2937', whiteSpace: col.key === 'description' ? 'normal' : 'nowrap' }}>
                                {display}
                              </td>
                            );
                          })}
                          <td className="px-3 py-3">
                            {po.status === 'draft' && canAct && (
                              <div className="flex gap-2">
                                <button onClick={() => startEditRow(item)} className="text-xs" style={{ color: '#4C5FD5' }}>Edit</button>
                                <button onClick={() => setDeleteItemId(item.id)} className="text-xs" style={{ color: '#EF4444' }}>Delete</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {showAddRow && (
                      <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                        {activeCols.map(col => (
                          <td key={col.key} className="px-2 py-1.5">
                            {col.key === 'line_number' ? (
                              <span className="text-xs px-2" style={{ color: '#9CA3AF' }}>{items.length + 1}</span>
                            ) : (
                              <input value={itemForm[col.key] ?? ''} onChange={(e) => handleItemFormChange(col.key, e.target.value)}
                                type={col.type === 'number' ? 'number' : 'text'}
                                className="w-full px-2 py-1 text-xs rounded" style={{ border: '1px solid #D1D5DB', minWidth: 60 }} />
                            )}
                          </td>
                        ))}
                        <td className="px-2 py-1.5">
                          <div className="flex gap-1">
                            <button onClick={handleSaveItem} className="px-2 py-1 text-xs font-medium text-white rounded" style={{ backgroundColor: '#4C5FD5' }}>Save</button>
                            <button onClick={cancelItemForm} className="px-2 py-1 text-xs rounded" style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}>Cancel</button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {items.length === 0 && !showAddRow && (
                      <tr><td colSpan={activeCols.length + 1} className="text-center py-8 text-sm" style={{ color: '#9CA3AF' }}>No items yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Supplier card */}
            <div className="p-5 rounded-2xl" style={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
              <h3 className="text-base font-semibold mb-4" style={{ color: '#1F2937' }}>Supplier</h3>
              {supplier ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: '#9CA3AF' }}>Company</div>
                    <div className="text-sm font-medium" style={{ color: '#1F2937' }}>{supplier.company_name}</div>
                  </div>
                  {supplier.email && (
                    <div>
                      <div className="text-xs mb-0.5" style={{ color: '#9CA3AF' }}>Email</div>
                      <div className="text-sm" style={{ color: '#1F2937' }}>{supplier.email}</div>
                    </div>
                  )}
                  {supplier.phone_1 && (
                    <div>
                      <div className="text-xs mb-0.5" style={{ color: '#9CA3AF' }}>Phone</div>
                      <div className="text-sm" style={{ color: '#1F2937' }}>{supplier.phone_1}</div>
                    </div>
                  )}
                  {supplier.address && (
                    <div>
                      <div className="text-xs mb-0.5" style={{ color: '#9CA3AF' }}>Address</div>
                      <div className="text-sm" style={{ color: '#1F2937' }}>{supplier.address}</div>
                    </div>
                  )}
                  <Link to={`/suppliers/${supplier.id}`} className="inline-flex items-center gap-1 text-sm font-medium mt-1" style={{ color: '#4C5FD5' }}>
                    View Supplier →
                  </Link>
                </div>
              ) : (
                <div className="text-sm" style={{ color: '#9CA3AF' }}>Loading supplier...</div>
              )}
            </div>

            {/* Linked Documents */}
            <div className="p-5 rounded-2xl" style={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
              <h3 className="text-base font-semibold mb-4" style={{ color: '#1F2937' }}>Linked Documents</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs mb-0.5" style={{ color: '#9CA3AF' }}>Request</div>
                  <Link to={`/requests/${po.request_id}`} className="text-sm hover:underline" style={{ color: '#4C5FD5' }}>View Request →</Link>
                </div>
                {po.quotation_id && (
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: '#9CA3AF' }}>Quotation</div>
                    <Link to={`/quotations/${po.quotation_id}`} className="text-sm hover:underline" style={{ color: '#4C5FD5' }}>View Quotation →</Link>
                  </div>
                )}
                {po.offer_version_id && (
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: '#9CA3AF' }}>Offer Version</div>
                    <Link to={`/offers/versions/${po.offer_version_id}`} className="text-sm hover:underline" style={{ color: '#4C5FD5' }}>View Offer Version →</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Modals ─────────────────────────────────────────────────────────── */}

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-xl rounded-2xl overflow-hidden" style={{ backgroundColor: '#fff', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <h2 className="text-lg font-semibold" style={{ color: '#1F2937' }}>Edit Purchase Order</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 rounded-md hover:bg-gray-100">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['payment_terms', 'Payment Terms', 'text'],
                  ['delivery_terms', 'Delivery Terms', 'text'],
                  ['lead_time', 'Lead Time', 'text'],
                  ['currency', 'Currency', 'text'],
                  ['subtotal', 'Subtotal', 'number'],
                  ['shipping_cost', 'Shipping Cost', 'number'],
                  ['taxes', 'Taxes', 'number'],
                  ['other_costs', 'Other Costs', 'number'],
                ].map(([field, label, type]) => (
                  <div key={field}>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>{label}</label>
                    <input type={type} value={editForm[field] ?? ''}
                      onChange={(e) => handleEditChange(field, e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg" style={{ border: '1px solid #E5E7EB', color: '#1F2937' }} />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Total Amount</label>
                  <input type="number" value={editForm.total_amount ?? ''}
                    onChange={(e) => setEditForm(f => ({ ...f, total_amount: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg" style={{ border: '1px solid #E5E7EB', color: '#1F2937', backgroundColor: '#F9FAFB' }} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Notes</label>
                <textarea rows={3} value={editForm.notes ?? ''} onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg resize-none" style={{ border: '1px solid #E5E7EB', color: '#1F2937' }} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid #F3F4F6' }}>
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm rounded-lg" style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}>Cancel</button>
              <button onClick={handleEdit} className="px-5 py-2 text-sm font-medium text-white rounded-lg"
                style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showSendConfirm && (
        <ConfirmDialog title="Send Purchase Order" message="Mark this Purchase Order as sent to supplier?"
          onConfirm={handleSend} onCancel={() => setShowSendConfirm(false)} confirmText="Send PO" confirmStyle="primary" />
      )}
      {showAcceptConfirm && (
        <ConfirmDialog title="Accept Purchase Order" message="Confirm supplier has accepted this Purchase Order?"
          onConfirm={handleAccept} onCancel={() => setShowAcceptConfirm(false)} confirmText="Accept" confirmStyle="primary" />
      )}
      {showDeleteConfirm && (
        <ConfirmDialog title="Delete Purchase Order" message="Are you sure you want to delete this Purchase Order? This action cannot be undone."
          onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} confirmText="Delete" confirmStyle="danger" />
      )}
      {deleteItemId && (
        <ConfirmDialog title="Delete Item" message="Are you sure you want to delete this item?"
          onConfirm={() => handleDeleteItem(deleteItemId)} onCancel={() => setDeleteItemId(null)} confirmText="Delete" confirmStyle="danger" />
      )}
      {showRequestChangesConfirm && (
        <ConfirmDialog title="Request Changes" message="Request changes from the supplier?"
          onConfirm={handleRequestChanges} onCancel={() => setShowRequestChangesConfirm(false)} confirmText="Request Changes" confirmStyle="primary" />
      )}
    </div>
  );
};