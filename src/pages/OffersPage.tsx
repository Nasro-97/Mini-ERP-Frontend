import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, MoreVertical, Eye, ChevronUp, ChevronDown, ChevronsUpDown, FileText } from 'lucide-react';
import { apiClient } from '../api/client';
import { useToast } from '../components/Toast';

interface OfferVersion {
  id: string;
  version_number: number;
  status: string;
  total_price: number | null;
  validity_date: string | null;
  created_at: string;
}

interface Offer {
  id: string;
  offer_number: string;
  request_id: string;
  quotation_id: string;
  current_version: number;
  created_at: string;
  versions: OfferVersion[];
}

type SortField = 'offer_number' | 'status' | 'total_price' | 'validity_date' | 'versions' | 'created_at';
type SortDir = 'asc' | 'desc';

function getCurrentVersion(offer: Offer): OfferVersion | null {
  if (!offer.versions?.length) return null;
  return offer.versions.find(v => v.version_number === offer.current_version) ?? null;
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'draft':                return { backgroundColor: '#F3F4F6', color: '#6B7280' };
    case 'pending_cod_approval': return { backgroundColor: '#FEF3C7', color: '#92400E' };
    case 'cod_approved':         return { backgroundColor: '#DBEAFE', color: '#1E40AF' };
    case 'cod_rejected':         return { backgroundColor: '#FEE2E2', color: '#DC2626' };
    case 'changes_requested':    return { backgroundColor: '#FEF3C7', color: '#92400E' };
    case 'sent_to_client':       return { backgroundColor: '#EDE9FE', color: '#5B21B6' };
    case 'client_approved':      return { backgroundColor: '#D1FAE5', color: '#065F46' };
    case 'client_rejected':      return { backgroundColor: '#FEE2E2', color: '#DC2626' };
    case 'revision_requested':   return { backgroundColor: '#FEF3C7', color: '#92400E' };
    default:                     return { backgroundColor: '#F3F4F6', color: '#6B7280' };
  }
}

function statusLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined) return '-';
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const STATUS_OPTIONS = [
  'draft', 'pending_cod_approval', 'cod_approved', 'cod_rejected',
  'changes_requested', 'sent_to_client', 'client_approved', 'client_rejected', 'revision_requested',
];

export const OffersPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchOffers = async () => {
      setLoading(true);
      try {
        const data = await apiClient.get<Offer[]>('/offers/');
        setOffers(data);
      } catch {
        setOffers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    if (openMenuId) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir(field === 'created_at' || field === 'validity_date' ? 'desc' : 'asc'); }
  };

  const filtered = offers
    .filter(o => {
      const cv = getCurrentVersion(o);
      const matchesSearch = o.offer_number.toLowerCase().includes(searchQuery.toLowerCase());
      // Offers with no versions only show under "all"
      const matchesStatus = statusFilter === 'all' || (cv?.status === statusFilter);
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const av = getCurrentVersion(a);
      const bv = getCurrentVersion(b);
      let cmp = 0;
      switch (sortField) {
        case 'offer_number':  cmp = a.offer_number.localeCompare(b.offer_number, undefined, { numeric: true }); break;
        case 'status':        cmp = (av?.status || '').localeCompare(bv?.status || ''); break;
        case 'total_price':   cmp = (av?.total_price ?? 0) - (bv?.total_price ?? 0); break;
        case 'validity_date': cmp = (av?.validity_date || '').localeCompare(bv?.validity_date || ''); break;
        case 'versions':      cmp = (a.versions?.length ?? 0) - (b.versions?.length ?? 0); break;
        case 'created_at':    cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown size={12} style={{ color: '#C4C9D4' }} />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} style={{ color: '#4C5FD5' }} />
      : <ChevronDown size={12} style={{ color: '#4C5FD5' }} />;
  };

  const SortTh = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="text-left py-3 px-4 text-xs font-medium cursor-pointer select-none"
      style={{ color: sortField === field ? '#4C5FD5' : '#9CA3AF' }}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">{children}<SortIcon field={field} /></span>
    </th>
  );

  const openPdf = async (url: string, offerId: string) => {
    setPdfLoadingId(offerId);
    try {
      // Get the offer to find request_id
      const offer = offers.find(o => o.id === offerId);
      if (!offer) throw new Error('Offer not found');
      
      // Fetch request to get request_number
      const request = await apiClient.get<{ request_number: string }>(`/requests/${offer.request_id}`);
      
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000${url}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('PDF generation failed');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      
      // Determine document type from URL
      const documentType = url.includes('/technical') ? 'Technical Offer' : 'Commercial Offer';
      a.download = `${request.request_number}_${documentType}.pdf`;
      
      a.click();
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
    } catch {
      showToast('Failed to generate PDF', 'error');
    } finally {
      setPdfLoadingId(null);
    }
  };

  return (
    <div className="p-6" style={{ backgroundColor: '#F5F7FA', minHeight: '100vh', animation: 'fadeIn 0.3s ease-out' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1F2937' }}>Offers</h1>
            <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>All offers across requests</p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: '#9CA3AF' }} />
            <input
              type="text"
              placeholder="Search by offer number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg"
              style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', color: '#1F2937' }}
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm rounded-lg cursor-pointer"
              style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', color: '#1F2937' }}
            >
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{statusLabel(s)}</option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" size={14} style={{ color: '#6B7280' }} />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
          {loading ? (
            <div className="text-center py-12 text-sm" style={{ color: '#9CA3AF' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
                <Search size={20} style={{ color: '#9CA3AF' }} />
              </div>
              <h3 className="text-base font-semibold mb-1" style={{ color: '#1F2937' }}>No offers found</h3>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'No offers have been created yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <SortTh field="offer_number">Offer #</SortTh>
                    <SortTh field="status">Status</SortTh>
                    <SortTh field="total_price">Total Price</SortTh>
                    <SortTh field="validity_date">Validity Date</SortTh>
                    <SortTh field="versions">Versions</SortTh>
                    <SortTh field="created_at">Created</SortTh>
                    <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((offer) => {
                    const cv = getCurrentVersion(offer);
                    const canNavigate = !!cv;
                    return (
                      <tr
                        key={offer.id}
                        className="transition-colors"
                        style={{ borderBottom: '1px solid #F9FAFB', cursor: canNavigate ? 'pointer' : 'default' }}
                        onClick={() => canNavigate && navigate(`/offers/versions/${cv.id}`)}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <td className="py-3 px-4 text-sm font-medium" style={{ color: '#4C5FD5' }}>
                          {offer.offer_number}
                        </td>
                        <td className="py-3 px-4">
                          {cv ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={getStatusStyle(cv.status)}>
                              {statusLabel(cv.status)}
                            </span>
                          ) : (
                            <span className="text-sm" style={{ color: '#9CA3AF' }}>—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium" style={{ color: '#1F2937' }}>
                          {cv ? fmt(cv.total_price) : '—'}
                        </td>
                        <td className="py-3 px-4 text-sm" style={{ color: '#6B7280' }}>
                          {cv?.validity_date ? new Date(cv.validity_date).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-4 text-sm" style={{ color: '#6B7280' }}>
                          {(offer.versions?.length ?? 0)} version{(offer.versions?.length ?? 0) !== 1 ? 's' : ''}
                        </td>
                        <td className="py-3 px-4 text-sm" style={{ color: '#9CA3AF' }}>
                          {new Date(offer.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 relative" onClick={(e) => e.stopPropagation()}>
                          <div ref={openMenuId === offer.id ? menuRef : null}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === offer.id ? null : offer.id); }}
                              className="p-1 rounded-md hover:bg-gray-100"
                            >
                              <MoreVertical size={16} style={{ color: '#6B7280' }} />
                            </button>
                            {openMenuId === offer.id && (
                              <div
                                className="absolute right-0 mt-1 w-48 rounded-lg overflow-hidden z-10"
                                style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                              >
                                <button
                                  disabled={!cv}
                                  onClick={() => { if (cv) { navigate(`/offers/versions/${cv.id}`); setOpenMenuId(null); } }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                                  style={{ color: cv ? '#6B7280' : '#D1D5DB', cursor: cv ? 'pointer' : 'not-allowed' }}
                                  onMouseEnter={(e) => { if (cv) e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                  <Eye size={14} />
                                  View Current Version
                                </button>
                                <div style={{ borderTop: '1px solid #F3F4F6' }} />
                                <button
                                  disabled={pdfLoadingId === offer.id}
                                  onClick={() => { openPdf(`/pdf/offers/${offer.id}/technical`, offer.id); setOpenMenuId(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                                  style={{ color: '#6B7280', cursor: pdfLoadingId === offer.id ? 'not-allowed' : 'pointer' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                  <FileText size={14} />
                                  Technical Offer PDF
                                </button>
                                <button
                                  disabled={pdfLoadingId === offer.id}
                                  onClick={() => { openPdf(`/pdf/offers/${offer.id}/commercial`, offer.id); setOpenMenuId(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                                  style={{ color: '#6B7280', cursor: pdfLoadingId === offer.id ? 'not-allowed' : 'pointer' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                  <FileText size={14} />
                                  Commercial Offer PDF
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};