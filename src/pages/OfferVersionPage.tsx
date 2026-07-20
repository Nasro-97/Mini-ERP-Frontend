import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Settings, Plus, Trash2, FileText } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DatePicker } from '../components/DatePicker';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OfferVersion {
  id: string;
  offer_id: string;
  version_number: number;
  status: string;
  payment_terms: string | null;
  delivery_terms: string | null;
  delivery_period: string | null;
  validity_date: string | null;
  country_of_origin: string | null;
  total_price: number | null;
  total_price_letters: string | null;
  notes: string | null;
  cod_notes: string | null;
  cod_status: string | null;
  cod_actioned_at: string | null;
  client_notes: string | null;
  client_status: string | null;
  client_responded_at: string | null;
  created_at: string;
}

interface Offer {
  id: string;
  offer_number: string;
  request_id: string;
  quotation_id: string;
  created_by: string | null;
  created_at: string;
  versions: OfferVersion[];
}

interface Request {
  id: string;
  request_number: string;
  title: string;
  status: string;
}

interface OfferItem {
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

// ─── Column defs ─────────────────────────────────────────────────────────────

interface ColDef {
  key: string;
  label: string;
  field?: keyof OfferItem;
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

function lsKey(vid: string) { return `offer_version_columns_${vid}`; }

// ─── Sub-components ───────────────────────────────────────────────────────────

const DetailField: React.FC<{ label: string; value: string | null | undefined; mono?: boolean; large?: boolean }> = ({ label, value, mono, large }) => (
  <div>
    <div className="text-xs mb-1" style={{ color: '#9CA3AF' }}>{label}</div>
    <div className={`${large ? 'text-xl font-bold' : 'text-sm'} ${mono ? 'font-mono' : ''}`} style={{ color: '#1F2937' }}>
      {value || '-'}
    </div>
  </div>
);

const ActionButton: React.FC<{ onClick: () => void; variant: 'primary' | 'secondary' | 'success' | 'danger' | 'warning'; children: React.ReactNode; disabled?: boolean }> = ({ onClick, variant, children, disabled }) => {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)', color: '#fff' },
    secondary: { backgroundColor: '#fff', color: '#374151', border: '1px solid #E5E7EB' },
    success: { backgroundColor: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0' },
    danger: { backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' },
    warning: { backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
      style={{ ...styles[variant], opacity: disabled ? 0.6 : 1 }}>
      {children}
    </button>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const OfferVersionPage: React.FC = () => {
  const { versionId } = useParams<{ versionId: string }>();
  const navigate = useNavigate();
  const { isCOD, hasSalesAccess } = useAuth();
  const toast = useToast();

  const [version, setVersion] = useState<OfferVersion | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [request, setRequest] = useState<Request | null>(null);
  const [items, setItems] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesExpanded, setNotesExpanded] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  // Action modals
  const [actionModal, setActionModal] = useState<{
    type: 'cod_approve' | 'cod_reject' | 'cod_changes' | 'client_approved' | 'client_rejected' | 'client_revision' | 'delete' | null;
    notes: string;
  }>({ type: null, notes: '' });

  // Items table state
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set());
  const [customCols, setCustomCols] = useState<string[]>([]);
  const [showColMenu, setShowColMenu] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [showAddColInput, setShowAddColInput] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);

  const [showAddRow, setShowAddRow] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<Record<string, any>>({});
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [isSavingItem, setIsSavingItem] = useState(false);

  // ─── Column localStorage ──────────────────────────────────────────────────

  useEffect(() => {
    if (!versionId) return;
    const saved = localStorage.getItem(lsKey(versionId));
    if (saved) {
      const parsed = JSON.parse(saved);
      setVisibleCols(new Set(parsed.visible || []));
      setCustomCols(parsed.custom || []);
    } else {
      setVisibleCols(new Set(BUILTIN_COLS.filter(c => c.defaultVisible).map(c => c.key)));
    }
  }, [versionId]);

  const saveColState = (visible: Set<string>, custom: string[]) => {
    if (!versionId) return;
    localStorage.setItem(lsKey(versionId), JSON.stringify({ visible: [...visible], custom }));
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

  useEffect(() => { if (versionId) fetchAll(); }, [versionId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [v, itemsData] = await Promise.all([
        apiClient.get<OfferVersion>(`/offers/versions/${versionId}`),
        apiClient.get<OfferItem[]>(`/offers/versions/${versionId}/items`),
      ]);
      setVersion(v);
      setItems(itemsData);

      // merge extra_data keys
      const extraKeys = new Set<string>();
      itemsData.forEach(item => { if (item.extra_data) Object.keys(item.extra_data).forEach(k => extraKeys.add(k)); });
      if (extraKeys.size > 0) {
        setCustomCols(prev => {
          const merged = [...new Set([...prev, ...extraKeys])];
          const saved = localStorage.getItem(lsKey(versionId!));
          const parsed = saved ? JSON.parse(saved) : null;
          const visible = parsed ? new Set<string>(parsed.visible) : new Set(BUILTIN_COLS.filter(c => c.defaultVisible).map(c => c.key));
          extraKeys.forEach(k => { if (!parsed) visible.add(k); });
          setVisibleCols(visible);
          saveColState(visible, merged);
          return merged;
        });
      }

      // fetch parent offer
      const offerData = await apiClient.get<Offer>(`/offers/${v.offer_id}`);
      setOffer(offerData);

      // fetch request
      const requestData = await apiClient.get<Request>(`/requests/${offerData.request_id}`);
      setRequest(requestData);
    } catch {
      toast.error('Failed to load offer version');
    } finally { setLoading(false); }
  };

  const fetchItems = async () => {
    const data = await apiClient.get<OfferItem[]>(`/offers/versions/${versionId}/items`);
    setItems(data);
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
      
      // Determine document type from URL
      const documentType = url.includes('/technical') ? 'Technical Offer' : 'Commercial Offer';
      const requestNumber = request?.request_number || 'Unknown';
      a.download = `${requestNumber}_${documentType}.pdf`;
      
      a.click();
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
    } catch {
      toast.error('Failed to generate PDF');
    }
  };

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleSimpleAction = async (endpoint: string, successMsg: string, body?: object) => {
    try {
      await apiClient.patch(`/offers/versions/${versionId}/${endpoint}`, body || {});
      toast.success(successMsg);
      fetchAll();
    } catch { toast.error('Action failed'); }
  };

  const handleCodResponse = async (status: 'approved' | 'rejected' | 'changes_requested') => {
    const notes = actionModal.notes;
    try {
      await apiClient.patch(`/offers/versions/${versionId}/cod-response`, { cod_status: status, cod_notes: notes || null });
      setActionModal({ type: null, notes: '' });
      toast.success(`COD response recorded`);
      fetchAll();
    } catch { toast.error('Failed to record COD response'); }
  };

  const handleClientResponse = async (status: 'approved' | 'rejected' | 'revision_requested') => {
    const notes = actionModal.notes;
    try {
      await apiClient.patch(`/offers/versions/${versionId}/client-response`, { client_status: status, client_notes: notes || null });
      setActionModal({ type: null, notes: '' });
      if (status === 'approved') toast.success('Client approved — request is now ready for Purchase Order');
      else toast.success('Client response recorded');
      fetchAll();
    } catch { toast.error('Failed to record client response'); }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/offers/versions/${versionId}`);
      toast.success('Version deleted');
      navigate(offer ? `/requests/${offer.request_id}` : '/requests');
    } catch { toast.error('Failed to delete version'); }
  };

  const handleEdit = async () => {
    try {
      const body: Record<string, any> = {};
      if (editForm.payment_terms !== undefined) body.payment_terms = editForm.payment_terms || null;
      if (editForm.delivery_terms !== undefined) body.delivery_terms = editForm.delivery_terms || null;
      if (editForm.delivery_period !== undefined) body.delivery_period = editForm.delivery_period || null;
      if (editForm.validity_date_obj) body.validity_date = editForm.validity_date_obj.toISOString();
      if (editForm.country_of_origin !== undefined) body.country_of_origin = editForm.country_of_origin || null;
      if (editForm.total_price !== undefined) body.total_price = parseFloat(String(editForm.total_price)) || null;
      if (editForm.total_price_letters !== undefined) body.total_price_letters = editForm.total_price_letters || null;
      if (editForm.notes !== undefined) body.notes = editForm.notes || null;
      await apiClient.patch(`/offers/versions/${versionId}`, body);
      toast.success('Version updated');
      setShowEditModal(false);
      fetchAll();
    } catch { toast.error('Failed to update version'); }
  };

  // ─── Items ────────────────────────────────────────────────────────────────

  const allCols = [...BUILTIN_COLS, ...customCols.map(name => ({ key: name, label: name, field: undefined, type: undefined, defaultVisible: true } as ColDef))];
  const activeCols = allCols.filter(c => visibleCols.has(c.key));

  const blankItemForm = (): Record<string, any> => {
    const f: Record<string, any> = {};
    BUILTIN_COLS.forEach(c => { if (c.key !== 'line_number') f[c.key] = ''; });
    customCols.forEach(name => { f[name] = ''; });
    f.unit = 'pcs'; f.currency = 'USD';
    return f;
  };

  const startEditRow = (item: OfferItem) => {
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
      document_type: 'offer_version',
      document_id: versionId,
      line_number: lineNumber,
      description: itemForm.description || '',
      quantity: parseFloat(String(itemForm.quantity)) || 1,
      unit: itemForm.unit || 'pcs',
      unit_price: parseFloat(String(itemForm.unit_price)) || 0,
      total_price: parseFloat(String(itemForm.total_price)) || 0,
      currency: itemForm.currency || 'USD',
      origin_country: itemForm.origin_country || null,
      hs_code: itemForm.hs_code || null,
      warranty: itemForm.warranty || null,
      package_count: itemForm.package_count !== '' && itemForm.package_count !== undefined ? parseFloat(String(itemForm.package_count)) : null,
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
    if (isSavingItem) return;
    setIsSavingItem(true);
    try {
      if (editingItemId) {
        const item = items.find(i => i.id === editingItemId)!;
        await apiClient.patch(`/offers/versions/${versionId}/items/${editingItemId}`, buildItemBody(item.line_number));
      } else {
        await apiClient.post(`/offers/versions/${versionId}/items`, buildItemBody(items.length + 1));
      }
      cancelItemForm();
      await fetchItems();
      toast.success('Item saved');
    } catch { toast.error('Failed to save item'); }
    finally { setIsSavingItem(false); }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await apiClient.delete(`/offers/versions/${versionId}/items/${itemId}`);
      setDeleteItemId(null);
      await fetchItems();
      toast.success('Item deleted');
    } catch { toast.error('Failed to delete item'); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="p-6 flex items-center justify-center" style={{ minHeight: '100vh' }}>
      <div style={{ color: '#9CA3AF' }}>Loading...</div>
    </div>
  );

  if (!version) return (
    <div className="p-6 flex items-center justify-center" style={{ minHeight: '100vh' }}>
      <div style={{ color: '#9CA3AF' }}>Version not found</div>
    </div>
  );

  const canEditVersion = version.status === 'draft' || version.status === 'changes_requested';
  const backPath = offer ? `/requests/${offer.request_id}` : '/requests';
  const isCodRelated = ['pending_cod_approval', 'cod_approved', 'cod_rejected', 'changes_requested'].includes(version.status) || !!version.cod_notes;
  const isClientRelated = ['sent_to_client', 'client_approved', 'client_rejected', 'revision_requested'].includes(version.status) || !!version.client_notes;

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
                <h1 className="text-[28px] font-bold" style={{ color: '#1F2937' }}>
                  {offer?.offer_number} — v{version.version_number}
                </h1>
                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium" style={getStatusStyle(version.status)}>
                  {statusLabel(version.status)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm" style={{ color: '#6B7280' }}>
                <span>Created {new Date(version.created_at).toLocaleDateString()}</span>
                {offer && (
                  <Link to={backPath} className="hover:underline" style={{ color: '#4C5FD5' }}>
                    Request ↗
                  </Link>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* PDF generation */}
              {offer && (
                <>
                  <button
                    onClick={() => openPdf(`/pdf/offers/${offer.id}/technical`)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all"
                    style={{ backgroundColor: '#ffffff', color: '#374151', border: '1px solid #E5E7EB' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
                  >
                    <FileText size={14} />
                    Technical Offer PDF
                  </button>
                  <button
                    onClick={() => openPdf(`/pdf/offers/${offer.id}/commercial`)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all"
                    style={{ backgroundColor: '#ffffff', color: '#374151', border: '1px solid #E5E7EB' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
                  >
                    <FileText size={14} />
                    Commercial Offer PDF
                  </button>
                </>
              )}
              {canEditVersion && (hasSalesAccess || isCOD) && (
                <>
                  <ActionButton variant="secondary" onClick={() => {
                    setEditForm({
                      payment_terms: version.payment_terms || '',
                      delivery_terms: version.delivery_terms || '',
                      delivery_period: version.delivery_period || '',
                      validity_date_obj: version.validity_date ? new Date(version.validity_date) : null,
                      country_of_origin: version.country_of_origin || '',
                      total_price: version.total_price ?? '',
                      total_price_letters: version.total_price_letters || '',
                      notes: version.notes || '',
                    });
                    setShowEditModal(true);
                  }}>Edit Version</ActionButton>
                  <ActionButton variant="primary" onClick={() => handleSimpleAction('submit', 'Submitted for COD approval')}>
                    Submit for COD Approval
                  </ActionButton>
                  <ActionButton variant="danger" onClick={() => setActionModal({ type: 'delete', notes: '' })}>
                    Delete Version
                  </ActionButton>
                </>
              )}
              {version.status === 'pending_cod_approval' && isCOD && (
                <>
                  <ActionButton variant="success" onClick={() => setActionModal({ type: 'cod_approve', notes: '' })}>Approve</ActionButton>
                  <ActionButton variant="danger" onClick={() => setActionModal({ type: 'cod_reject', notes: '' })}>Reject</ActionButton>
                  <ActionButton variant="warning" onClick={() => setActionModal({ type: 'cod_changes', notes: '' })}>Request Changes</ActionButton>
                </>
              )}
              {version.status === 'cod_approved' && (hasSalesAccess || isCOD) && (
                <ActionButton variant="primary" onClick={() => handleSimpleAction('send', 'Sent to client')}>Send to Client</ActionButton>
              )}
              {version.status === 'sent_to_client' && (hasSalesAccess || isCOD) && (
                <>
                  <ActionButton variant="success" onClick={() => setActionModal({ type: 'client_approved', notes: '' })}>Client Approved</ActionButton>
                  <ActionButton variant="danger" onClick={() => setActionModal({ type: 'client_rejected', notes: '' })}>Client Rejected</ActionButton>
                  <ActionButton variant="warning" onClick={() => setActionModal({ type: 'client_revision', notes: '' })}>Client Revision Requested</ActionButton>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Row 1: Version Details + Offer (same height) */}
        <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: '65% 1fr', alignItems: 'stretch' }}>
            {/* Version Details */}
            <div className="p-6 rounded-2xl" style={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
              <h3 className="text-base font-semibold mb-5" style={{ color: '#1F2937' }}>Version Details</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                <DetailField label="Payment Terms" value={version.payment_terms} />
                <DetailField label="Delivery Terms" value={version.delivery_terms} />
                <DetailField label="Delivery Period" value={version.delivery_period} />
                <DetailField label="Country of Origin" value={version.country_of_origin} />
                <DetailField label="Validity Date" value={version.validity_date ? new Date(version.validity_date).toLocaleDateString() : null} />
                <DetailField label="Created At" value={new Date(version.created_at).toLocaleDateString()} />
                <DetailField label="Total Price" value={fmt(version.total_price)} large />
                <DetailField label="Total Price in Letters" value={version.total_price_letters} />
              </div>
              {version.notes && (
                <div className="mt-5">
                  <div className="text-xs mb-1" style={{ color: '#9CA3AF' }}>Notes</div>
                  <div className="text-sm p-3 rounded-lg" style={{ backgroundColor: '#F9FAFB', color: '#1F2937', maxHeight: notesExpanded ? 'none' : 80, overflow: 'hidden' }}>
                    {version.notes}
                  </div>
                  {version.notes.length > 150 && (
                    <button onClick={() => setNotesExpanded(n => !n)} className="text-xs mt-1" style={{ color: '#4C5FD5' }}>
                      {notesExpanded ? 'Show less' : 'View more'}
                    </button>
                  )}
                </div>
              )}
            </div>

          {/* Offer card — paired with Version Details */}
          <div className="p-5 rounded-2xl" style={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
            <h3 className="text-base font-semibold mb-4" style={{ color: '#1F2937' }}>Offer</h3>
            <div className="space-y-3">
              <div>
                <div className="text-xs mb-0.5" style={{ color: '#9CA3AF' }}>Offer Number</div>
                <div className="text-sm font-mono font-medium" style={{ color: '#4C5FD5' }}>{offer?.offer_number}</div>
              </div>
              {offer?.quotation_id && (
                <div>
                  <div className="text-xs mb-0.5" style={{ color: '#9CA3AF' }}>Quotation</div>
                  <Link to={`/quotations/${offer.quotation_id}`} className="text-sm hover:underline" style={{ color: '#4C5FD5' }}>
                    View Quotation ↗
                  </Link>
                </div>
              )}
              {offer && (
                <div>
                  <div className="text-xs mb-0.5" style={{ color: '#9CA3AF' }}>Request</div>
                  <Link to={`/requests/${offer.request_id}`} className="text-sm hover:underline" style={{ color: '#4C5FD5' }}>
                    View Request ↗
                  </Link>
                </div>
              )}
              {offer?.created_by && (
                <div>
                  <div className="text-xs mb-0.5" style={{ color: '#9CA3AF' }}>Created By</div>
                  <div className="text-sm" style={{ color: '#1F2937' }}>{offer.created_by}</div>
                </div>
              )}
              <div>
                <div className="text-xs mb-0.5" style={{ color: '#9CA3AF' }}>Created At</div>
                <div className="text-sm" style={{ color: '#1F2937' }}>{offer ? new Date(offer.created_at).toLocaleDateString() : '-'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: COD/Client/Items + Version History */}
        <div className="grid gap-6" style={{ gridTemplateColumns: '65% 1fr', alignItems: 'start' }}>
          <div className="space-y-6">
            {/* COD + Client Response side by side */}
            {(isCodRelated || isClientRelated) && (
              <div className="grid gap-4" style={{ gridTemplateColumns: isCodRelated && isClientRelated ? '1fr 1fr' : '1fr' }}>
                {isCodRelated && (
                  <div className="p-6 rounded-2xl" style={{ backgroundColor: '#fff', border: '2px solid #FDE68A', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
                    <h3 className="text-base font-semibold mb-4" style={{ color: '#92400E' }}>COD Response</h3>
                    <DetailField label="Actioned At" value={version.cod_actioned_at ? new Date(version.cod_actioned_at).toLocaleDateString() : null} />
                    {version.cod_notes && (
                      <div className="mt-4">
                        <div className="text-xs mb-1" style={{ color: '#9CA3AF' }}>Notes</div>
                        <div className="text-sm p-3 rounded-lg" style={{ backgroundColor: '#FFFBEB', color: '#92400E' }}>{version.cod_notes}</div>
                      </div>
                    )}
                  </div>
                )}
                {isClientRelated && (
                  <div className="p-6 rounded-2xl" style={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
                    <h3 className="text-base font-semibold mb-4" style={{ color: '#1F2937' }}>Client Response</h3>
                    <DetailField label="Responded At" value={version.client_responded_at ? new Date(version.client_responded_at).toLocaleDateString() : null} />
                    {version.client_notes && (
                      <div className="mt-4">
                        <div className="text-xs mb-1" style={{ color: '#9CA3AF' }}>Notes</div>
                        <div className="text-sm p-3 rounded-lg" style={{ backgroundColor: '#EFF6FF', color: '#1E40AF' }}>{version.client_notes}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Items */}
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
                <h3 className="text-base font-semibold" style={{ color: '#1F2937' }}>Items</h3>
                <div className="flex items-center gap-2">
                  {/* Column toggle */}
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
                  {canEditVersion && (
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
                      {canEditVersion && <th className="px-3 py-2.5 text-xs font-medium" style={{ color: '#9CA3AF' }}></th>}
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
                                  <input
                                    value={itemForm[col.key] ?? ''}
                                    onChange={(e) => handleItemFormChange(col.key, e.target.value)}
                                    type={col.type === 'number' ? 'number' : 'text'}
                                    className="w-full px-2 py-1 text-xs rounded"
                                    style={{ border: '1px solid #D1D5DB', minWidth: 60 }}
                                  />
                                )}
                              </td>
                            ))}
                            {canEditVersion && (
                              <td className="px-2 py-1.5">
                                <div className="flex gap-1">
                                  <button onClick={handleSaveItem} disabled={isSavingItem} className="px-2 py-1 text-xs font-medium text-white rounded"
                                    style={{ backgroundColor: isSavingItem ? '#9CA3AF' : '#4C5FD5', cursor: isSavingItem ? 'not-allowed' : 'pointer' }}>{isSavingItem ? 'Saving...' : 'Save'}</button>
                                  <button onClick={cancelItemForm} className="px-2 py-1 text-xs rounded"
                                    style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}>Cancel</button>
                                </div>
                              </td>
                            )}
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
                              if (v !== null && v !== undefined && v !== '') {
                                display = col.type === 'number' ? fmt(v) : String(v);
                              }
                            } else {
                              const v = item.extra_data?.[col.key];
                              if (v !== undefined && v !== null && v !== '') display = v;
                            }
                            return (
                              <td key={col.key} className="px-3 py-3" style={{ color: col.key === 'line_number' ? '#9CA3AF' : '#1F2937', whiteSpace: col.key === 'description' ? 'normal' : 'nowrap' }}>
                                {display}
                              </td>
                            );
                          })}
                          {canEditVersion && (
                            <td className="px-3 py-3">
                              <div className="flex gap-2">
                                <button onClick={() => startEditRow(item)} className="text-xs" style={{ color: '#4C5FD5' }}>Edit</button>
                                <button onClick={() => setDeleteItemId(item.id)} className="text-xs" style={{ color: '#EF4444' }}>Delete</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}

                    {/* Add row */}
                    {showAddRow && (
                      <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                        {activeCols.map(col => (
                          <td key={col.key} className="px-2 py-1.5">
                            {col.key === 'line_number' ? (
                              <span className="text-xs px-2" style={{ color: '#9CA3AF' }}>{items.length + 1}</span>
                            ) : (
                              <input
                                value={itemForm[col.key] ?? ''}
                                onChange={(e) => handleItemFormChange(col.key, e.target.value)}
                                type={col.type === 'number' ? 'number' : 'text'}
                                className="w-full px-2 py-1 text-xs rounded"
                                style={{ border: '1px solid #D1D5DB', minWidth: 60 }}
                              />
                            )}
                          </td>
                        ))}
                        {canEditVersion && (
                          <td className="px-2 py-1.5">
                            <div className="flex gap-1">
                              <button onClick={handleSaveItem} className="px-2 py-1 text-xs font-medium text-white rounded"
                                style={{ backgroundColor: '#4C5FD5' }}>Save</button>
                              <button onClick={cancelItemForm} className="px-2 py-1 text-xs rounded"
                                style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}>Cancel</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )}

                    {items.length === 0 && !showAddRow && (
                      <tr>
                        <td colSpan={activeCols.length + 1} className="text-center py-8 text-sm" style={{ color: '#9CA3AF' }}>
                          No items yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Version history */}
          {offer && offer.versions.length > 0 && (
            <div className="p-5 rounded-2xl" style={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: '#1F2937' }}>Version History</h3>
                {hasSalesAccess && (
                  <button
                    onClick={async () => {
                      try {
                        const newVer = await apiClient.post<OfferVersion>(`/offers/${offer!.id}/new-version`, {});
                        toast.success('New version created');
                        navigate(`/offers/versions/${newVer.id}`);
                      } catch {
                        toast.error('Failed to create new version');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg"
                    style={{ backgroundColor: '#EEF2FF', color: '#4C5FD5', border: '1px solid #C7D2FE' }}
                  >
                    <Plus size={13} />
                    New Version
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {[...offer.versions].sort((a, b) => b.version_number - a.version_number).map(v => (
                  <div
                    key={v.id}
                    onClick={() => navigate(`/offers/versions/${v.id}`)}
                    className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors"
                    style={{
                      backgroundColor: v.id === versionId ? '#EEF2FF' : '#F9FAFB',
                      border: v.id === versionId ? '1px solid #C7D2FE' : '1px solid transparent',
                    }}
                    onMouseEnter={(e) => { if (v.id !== versionId) e.currentTarget.style.backgroundColor = '#F3F4F6'; }}
                    onMouseLeave={(e) => { if (v.id !== versionId) e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                  >
                    <span className="text-sm font-medium" style={{ color: v.id === versionId ? '#4C5FD5' : '#374151' }}>v{v.version_number}</span>
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium" style={getStatusStyle(v.status)}>
                      {statusLabel(v.status)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modals ─────────────────────────────────────────────────────────── */}

      {/* Edit modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-xl rounded-2xl overflow-hidden" style={{ backgroundColor: '#fff', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <h2 className="text-lg font-semibold" style={{ color: '#1F2937' }}>Edit Version</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 rounded-md hover:bg-gray-100">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['payment_terms', 'Payment Terms', 'text'],
                  ['delivery_terms', 'Delivery Terms', 'text'],
                  ['delivery_period', 'Delivery Period', 'text'],
                  ['country_of_origin', 'Country of Origin', 'text'],
                  ['total_price', 'Total Price', 'number'],
                ].map(([field, label, type]) => (
                  <div key={field}>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>{label}</label>
                    <input type={type} value={editForm[field] ?? ''}
                      onChange={(e) => setEditForm(f => ({ ...f, [field]: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-lg" style={{ border: '1px solid #E5E7EB', color: '#1F2937' }} />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Validity Date</label>
                  <DatePicker selected={editForm.validity_date_obj} onChange={(d) => setEditForm(f => ({ ...f, validity_date_obj: d }))} placeholder="Select date" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Total Price in Letters</label>
                <input value={editForm.total_price_letters ?? ''} onChange={(e) => setEditForm(f => ({ ...f, total_price_letters: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg" style={{ border: '1px solid #E5E7EB', color: '#1F2937' }} />
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

      {/* Notes modals for COD / Client response */}
      {actionModal.type && actionModal.type !== 'delete' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ backgroundColor: '#fff' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <h2 className="text-lg font-semibold" style={{ color: '#1F2937' }}>
                {actionModal.type === 'cod_approve' && 'COD Approve'}
                {actionModal.type === 'cod_reject' && 'COD Reject'}
                {actionModal.type === 'cod_changes' && 'Request Changes'}
                {actionModal.type === 'client_approved' && 'Client Approved'}
                {actionModal.type === 'client_rejected' && 'Client Rejected'}
                {actionModal.type === 'client_revision' && 'Client Revision Requested'}
              </h2>
              <button onClick={() => setActionModal({ type: null, notes: '' })} className="p-1 rounded-md hover:bg-gray-100">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-6 py-5">
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Notes</label>
              <textarea rows={4} value={actionModal.notes} onChange={(e) => setActionModal(m => ({ ...m, notes: e.target.value }))}
                placeholder="Optional notes..."
                className="w-full px-3 py-2 text-sm rounded-lg resize-none" style={{ border: '1px solid #E5E7EB', color: '#1F2937' }} />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid #F3F4F6' }}>
              <button onClick={() => setActionModal({ type: null, notes: '' })} className="px-4 py-2 text-sm rounded-lg" style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}>Cancel</button>
              <button
                onClick={() => {
                  if (actionModal.type === 'cod_approve') handleCodResponse('approved');
                  else if (actionModal.type === 'cod_reject') handleCodResponse('rejected');
                  else if (actionModal.type === 'cod_changes') handleCodResponse('changes_requested');
                  else if (actionModal.type === 'client_approved') handleClientResponse('approved');
                  else if (actionModal.type === 'client_rejected') handleClientResponse('rejected');
                  else if (actionModal.type === 'client_revision') handleClientResponse('revision_requested');
                }}
                className="px-5 py-2 text-sm font-medium text-white rounded-lg"
                style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)' }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete version confirm */}
      {actionModal.type === 'delete' && (
        <ConfirmDialog
          title="Delete Version"
          message="Are you sure you want to delete this draft version? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setActionModal({ type: null, notes: '' })}
          confirmText="Delete"
          confirmStyle="danger"
        />
      )}

      {/* Delete item confirm */}
      {deleteItemId && (
        <ConfirmDialog
          title="Delete Item"
          message="Are you sure you want to delete this item?"
          onConfirm={() => handleDeleteItem(deleteItemId)}
          onCancel={() => setDeleteItemId(null)}
          confirmText="Delete"
          confirmStyle="danger"
        />
      )}
    </div>
  );
};