import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Filter, Plus, MoreVertical, Eye, Edit2, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { apiClient } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

interface Request {
  id: string;
  request_number: string;
  title: string;
  status: string;
  priority: string;
  client_id: string;
  created_at: string;
  client?: {
    company_name: string;
  };
}

interface Client {
  id: string;
  company_name: string;
}

type SortField = 'request_number' | 'title' | 'client' | 'status' | 'priority' | 'created_at';
type SortDir = 'asc' | 'desc';

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

export const RequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [clientMap, setClientMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean; requestId: string | null}>({
    show: false,
    requestId: null,
  });
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchRequests(); }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const [data, clients] = await Promise.all([
        apiClient.get<Request[]>('/requests/'),
        apiClient.get<Client[]>('/clients/'),
      ]);
      const map: Record<string, string> = {};
      for (const c of clients) map[c.id] = c.company_name;
      setClientMap(map);
      setRequests(data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (requestId: string) => {
    try {
      await apiClient.delete(`/requests/${requestId}`);
      setDeleteConfirm({ show: false, requestId: null });
      fetchRequests();
    } catch (error) {
      console.error('Error deleting request:', error);
    }
  };

  const getPriorityStyle = (priority: string) => {
    const styles: Record<string, { backgroundColor: string; color: string }> = {
      low:    { backgroundColor: '#F3F4F6', color: '#6B7280' },
      normal: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
      high:   { backgroundColor: '#FED7AA', color: '#C2410C' },
      urgent: { backgroundColor: '#FEE2E2', color: '#991B1B' },
    };
    return styles[priority] || styles.normal;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'created_at' ? 'desc' : 'asc');
    }
  };

  const getClientName = (req: Request) =>
    req.client?.company_name || clientMap[req.client_id] || '';

  const filteredRequests = requests
    .filter((req) => {
      const matchesSearch =
        req.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.request_number?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'request_number':
          cmp = a.request_number.localeCompare(b.request_number, undefined, { numeric: true });
          break;
        case 'title':
          cmp = (a.title || '').localeCompare(b.title || '');
          break;
        case 'client':
          cmp = getClientName(a).localeCompare(getClientName(b));
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'priority':
          cmp = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
          break;
        case 'created_at':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown size={12} style={{ color: '#C4C9D4' }} />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} style={{ color: '#4C5FD5' }} />
      : <ChevronDown size={12} style={{ color: '#4C5FD5' }} />;
  };

  const SortTh = ({ field, children, className = '' }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <th
      className={`text-left py-3 px-4 text-xs font-medium cursor-pointer select-none ${className}`}
      style={{ color: sortField === field ? '#4C5FD5' : '#9CA3AF' }}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <SortIcon field={field} />
      </span>
    </th>
  );

  return (
    <div className="p-6" style={{ backgroundColor: '#F5F7FA', minHeight: '100vh', animation: 'fadeIn 0.3s ease-out' }}>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1F2937' }}>Requests</h1>
            <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>Manage all client requests</p>
          </div>
          <Link
            to="/requests/new"
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-all"
            style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)', boxShadow: '0 1px 3px rgba(76, 95, 213, 0.2)' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 95, 213, 0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(76, 95, 213, 0.2)'; }}
          >
            <Plus size={18} />
            New Request
          </Link>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" size={16} style={{ color: '#9CA3AF' }} />
            <input
              type="text"
              placeholder="Search by request number or title..."
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
              <option value="draft">Draft</option>
              <option value="pending_sales_manager_approval">Pending Approval</option>
              <option value="approved_for_sourcing">Approved for Sourcing</option>
              <option value="rfq_in_progress">RFQ In Progress</option>
              <option value="quotation_review">Quotation Review</option>
              <option value="offer_in_progress">Offer In Progress</option>
              <option value="approved_by_client">Approved by Client</option>
              <option value="po_in_progress">PO In Progress</option>
              <option value="closed">Closed</option>
              <option value="rejected">Rejected</option>
            </select>
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" size={14} style={{ color: '#6B7280' }} />
          </div>
        </div>

        {/* Requests Table */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
          {loading ? (
            <div className="text-center py-12" style={{ color: '#9CA3AF' }}>Loading...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
                <Search size={20} style={{ color: '#9CA3AF' }} />
              </div>
              <h3 className="text-base font-semibold mb-1" style={{ color: '#1F2937' }}>No requests found</h3>
              <p className="text-sm mb-5" style={{ color: '#9CA3AF' }}>
                {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by creating your first request'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Link to="/requests/new" className="inline-flex px-5 py-2 text-sm font-medium text-white rounded-lg"
                  style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)' }}>
                  Create Request
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <SortTh field="request_number">Request Number</SortTh>
                    <SortTh field="title">Title</SortTh>
                    <SortTh field="client">Client</SortTh>
                    <SortTh field="status">Status</SortTh>
                    <SortTh field="priority">Priority</SortTh>
                    <SortTh field="created_at">Created</SortTh>
                    <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => (
                    <tr
                      key={request.id}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: '1px solid #F9FAFB' }}
                      onClick={() => navigate(`/requests/${request.id}`)}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <td className="py-3 px-4 text-sm font-medium" style={{ color: '#4C5FD5' }}>
                        {request.request_number}
                      </td>
                      <td className="py-3 px-4 text-sm" style={{ color: '#1F2937' }}>
                        {request.title || 'Untitled'}
                      </td>
                      <td className="py-3 px-4 text-sm" style={{ color: '#1F2937' }}>
                        {request.client?.company_name || clientMap[request.client_id] || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={request.status} />
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md text-xs font-medium" style={getPriorityStyle(request.priority)}>
                          {request.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm" style={{ color: '#9CA3AF' }}>
                        {new Date(request.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 relative" onClick={(e) => e.stopPropagation()}>
                        <div ref={openMenuId === request.id ? menuRef : null}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === request.id ? null : request.id); }}
                            className="p-1 rounded-md hover:bg-gray-100"
                          >
                            <MoreVertical size={16} style={{ color: '#6B7280' }} />
                          </button>

                          {openMenuId === request.id && (
                            <div className="absolute right-0 mt-1 w-40 rounded-lg overflow-hidden z-10"
                              style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                              <button
                                onClick={() => { navigate(`/requests/${request.id}`); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                                style={{ color: '#6B7280' }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                <Eye size={14} />
                                View
                              </button>
                              {request.status === 'draft' && (
                                <>
                                  <button
                                    onClick={() => { navigate(`/requests/${request.id}/edit`); setOpenMenuId(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                                    style={{ color: '#6B7280' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                  >
                                    <Edit2 size={14} />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => { setDeleteConfirm({ show: true, requestId: request.id }); setOpenMenuId(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                                    style={{ color: '#EF4444' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEE2E2'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                  >
                                    <Trash2 size={14} />
                                    Delete
                                  </button>
                                </>
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
          )}
        </div>
      </div>

      {deleteConfirm.show && deleteConfirm.requestId && (
        <ConfirmDialog
          title="Delete Request"
          message="Are you sure you want to delete this request? This action cannot be undone."
          onConfirm={() => handleDelete(deleteConfirm.requestId!)}
          onCancel={() => setDeleteConfirm({ show: false, requestId: null })}
          confirmText="Delete"
          confirmStyle="danger"
        />
      )}
    </div>
  );
};
