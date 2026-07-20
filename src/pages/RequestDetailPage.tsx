import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, MoreVertical, X, Mail, Send, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { apiClient } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { DatePicker } from '../components/DatePicker';
import { QuotationsTab } from './components/QuotationsTab';
import { OffersTab } from './components/OffersTab';
import { PurchaseOrderTab } from './components/PurchaseOrderTab';

interface Request {
  id: string;
  request_number: string;
  title: string;
  status: string;
  priority: string;
  client_id: string;
  client_reference: string;
  description: string;
  notes: string;
  request_date: string;
  deadline: string;
  required_date: string;
  sales_manager_notes: string;
  assigned_to_user_id: string;
  sales_manager_id: string;
  procurement_assigned_to_id: string;
  created_by_user_id: string;
  created_at: string;
}

interface User {
  id: string;
  fullname: string;
  email: string;
}

interface Item {
  id: string;
  line_number: number;
  description: string;
  quantity: number;
  unit: string;
  notes: string;
}

interface Client {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone_1: string;
  address: string;
}

interface RFQ {
  id: string;
  rfq_number: string;
  request_id: string;
  supplier_id: string;
  contact_id: string | null;
  status: string;
  response_deadline: string;
  sent_at: string | null;
  notes: string;
  created_at: string;
}

interface Supplier {
  id: string;
  company_name: string;
}

interface Contact {
  id: string;
  fullname: string;
  position: string;
}

type TabType = 'rfqs' | 'quotations' | 'offers' | 'purchase-order';

export const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasSalesAccess, isSalesManager, isCOD, hasProcurementAccess, isProcurementManager, isProcurementSpecialist } = useAuth();
  const isProcurement = hasProcurementAccess;

  const [request, setRequest] = useState<Request | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [teamUsers, setTeamUsers] = useState<{
    createdBy: User | null;
    salesRep: User | null;
    salesManager: User | null;
    procurement: User | null;
  }>({
    createdBy: null,
    salesRep: null,
    salesManager: null,
    procurement: null,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('rfqs');
  const [tabAnimKeys, setTabAnimKeys] = useState<Record<TabType, number>>({ rfqs: 0, quotations: 0, offers: 0, 'purchase-order': 0 });
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deleteItemConfirm, setDeleteItemConfirm] = useState<{ show: boolean; itemId: string | null }>({
    show: false,
    itemId: null,
  });
  const [deleteRequestConfirm, setDeleteRequestConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [modalNotes, setModalNotes] = useState('');
  const [assignUserId, setAssignUserId] = useState('');
  const [procurementUsers, setProcurementUsers] = useState<Array<{ id: string; fullname: string }>>([]);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const toast = useToast();

  // RFQs state
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [rfqSuppliers, setRfqSuppliers] = useState<Record<string, Supplier>>({});
  const [rfqContacts, setRfqContacts] = useState<Record<string, Contact>>({});
  const [showCreateRfqModal, setShowCreateRfqModal] = useState(false);
  const [showEditRfqModal, setShowEditRfqModal] = useState(false);
  const [isCreatingRfq, setIsCreatingRfq] = useState(false);
  const [editingRfq, setEditingRfq] = useState<RFQ | null>(null);
  const [expandedRfqId, setExpandedRfqId] = useState<string | null>(null);
  const [openRfqMenuId, setOpenRfqMenuId] = useState<string | null>(null);
  const [rfqMenuPos, setRfqMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [confirmRfqAction, setConfirmRfqAction] = useState<{
    show: boolean;
    type: 'decline' | 'delete' | null;
    rfq: RFQ | null;
  }>({ show: false, type: null, rfq: null });
  const [rfqSortField, setRfqSortField] = useState<'rfq_number' | 'supplier' | 'status' | 'response_deadline' | 'sent_at' | 'created_at'>('created_at');
  const [rfqSortDir, setRfqSortDir] = useState<'asc' | 'desc'>('desc');
  const rfqMenuRef = useRef<HTMLDivElement>(null);

  const [rfqForm, setRfqForm] = useState({
    supplier_id: '',
    contact_id: '',
    response_deadline: null as Date | null,
    notes: '',
  });

  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    unit: 'pcs',
    notes: '',
  });

  useEffect(() => {
    if (id) {
      fetchRequest();
      fetchItems();
      if (activeTab === 'rfqs') {
        fetchRfqs();
      }
    }
  }, [id]);

  useEffect(() => {
    if (request?.client_id) {
      fetchClient();
    }
  }, [request?.client_id]);

  useEffect(() => {
    if (request) {
      fetchTeamUsers();
    }
  }, [request]);

  useEffect(() => {
    if ((activeTab === 'rfqs' || activeTab === 'quotations') && id) {
      fetchRfqs();
    }
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rfqMenuRef.current && !rfqMenuRef.current.contains(event.target as Node)) {
        setOpenRfqMenuId(null);
      }
    };

    if (openRfqMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openRfqMenuId]);

  const fetchRequest = async () => {
    try {
      const data = await apiClient.get<Request>(`/requests/${id}`);
      setRequest(data);
    } catch (error) {
      console.error('Error fetching request:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const data = await apiClient.get<Item[]>(`/requests/${id}/items`);
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchClient = async () => {
    try {
      const data = await apiClient.get<Client>(`/clients/${request?.client_id}`);
      setClient(data);
    } catch (error) {
      console.error('Error fetching client:', error);
    }
  };

  const fetchRfqs = async () => {
    try {
      const data = await apiClient.get<RFQ[]>(`/rfqs/request/${id}`);
      setRfqs(data);

      // Fetch supplier and contact details for each RFQ
      const uniqueSupplierIds = [...new Set(data.map(rfq => rfq.supplier_id))];
      const uniqueContactIds = [...new Set(data.map(rfq => rfq.contact_id).filter(Boolean))];

      const supplierPromises = uniqueSupplierIds.map(supplierId =>
        apiClient.get<Supplier>(`/suppliers/${supplierId}`).catch(() => null)
      );

      const contactPromises = uniqueContactIds.map(contactId =>
        apiClient.get<Contact>(`/contacts/${contactId}`).catch(() => null)
      );

      const [supplierResults, contactResults] = await Promise.all([
        Promise.all(supplierPromises),
        Promise.all(contactPromises)
      ]);

      const suppliersMap: Record<string, Supplier> = {};
      supplierResults.forEach((supplier, index) => {
        if (supplier) {
          suppliersMap[uniqueSupplierIds[index]] = supplier;
        }
      });

      const contactsMap: Record<string, Contact> = {};
      contactResults.forEach((contact, index) => {
        if (contact) {
          contactsMap[uniqueContactIds[index] as string] = contact;
        }
      });

      setRfqSuppliers(suppliersMap);
      setRfqContacts(contactsMap);
    } catch (error) {
      console.error('Error fetching RFQs:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const data = await apiClient.get<Supplier[]>('/suppliers/');
      setSuppliers(data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchContacts = async (supplierId: string) => {
    try {
      const data = await apiClient.get<Contact[]>(`/contacts/company/supplier/${supplierId}`);
      setContacts(data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setContacts([]);
    }
  };

  const fetchTeamUsers = async () => {
    try {
      const userPromises: Promise<User | null>[] = [];
      const userIds = [
        request?.created_by_user_id,
        request?.assigned_to_user_id,
        request?.sales_manager_id,
        request?.procurement_assigned_to_id,
      ];

      for (const userId of userIds) {
        if (userId) {
          userPromises.push(
            apiClient.get<User>(`/users/${userId}`).catch(() => null)
          );
        } else {
          userPromises.push(Promise.resolve(null));
        }
      }

      const [createdBy, salesRep, salesManager, procurement] = await Promise.all(userPromises);
      setTeamUsers({ createdBy, salesRep, salesManager, procurement });
    } catch (error) {
      console.error('Error fetching team users:', error);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await apiClient.patch(`/items/${editingItem.id}`, newItem);
        setEditingItem(null);
      } else {
        await apiClient.post(`/requests/${id}/items`, newItem);
      }
      setNewItem({ description: '', quantity: 1, unit: 'pcs', notes: '' });
      setShowAddItem(false);
      // Optimistically update UI before refetch
      await fetchItems();
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setNewItem({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      notes: item.notes || '',
    });
    setShowAddItem(true);
  };

  const handleCancelEdit = () => {
    setShowAddItem(false);
    setEditingItem(null);
    setNewItem({ description: '', quantity: 1, unit: 'pcs', notes: '' });
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await apiClient.delete(`/items/${itemId}`);
      setDeleteItemConfirm({ show: false, itemId: null });
      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleDeleteRequest = async () => {
    try {
      await apiClient.delete(`/requests/${id}`);
      navigate('/requests');
    } catch (error) {
      console.error('Error deleting request:', error);
    }
  };

  const handleWorkflowAction = async (action: string, params?: any) => {
    try {
      let endpoint = '';
      switch (action) {
        case 'submit':
          endpoint = `/requests/${id}/submit`;
          break;
        case 'approve':
          endpoint = `/requests/${id}/approve${params?.notes ? `?notes=${encodeURIComponent(params.notes)}` : ''}`;
          break;
        case 'reject':
          endpoint = `/requests/${id}/reject?notes=${encodeURIComponent(params.notes)}`;
          break;
        case 'assign-procurement':
          endpoint = `/requests/${id}/assign-procurement?assigned_user_id=${params.userId}`;
          break;
      }
      await apiClient.patch(endpoint, {});
      await fetchRequest();
    } catch (error) {
      console.error('Error performing workflow action:', error);
      throw error;
    }
  };

  const fetchProcurementUsers = async () => {
    try {
      const users = await apiClient.get<Array<{ id: string; fullname: string; roles: Array<{ name: string }> }>>('/users/');
      const procUsers = users.filter(u =>
        u.roles.some(r => r.name === 'Procurement Manager' || r.name === 'Procurement Specialist' || r.name === 'COD')
      );
      setProcurementUsers(procUsers);
    } catch (error) {
      console.error('Error fetching procurement users:', error);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await handleWorkflowAction('submit');
      toast.success('Request submitted for approval');
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    try {
      await handleWorkflowAction('approve', { notes: modalNotes });
      setShowApproveModal(false);
      setModalNotes('');
      toast.success('Request approved successfully');
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    }
  };

  const handleReject = async () => {
    if (!modalNotes.trim()) {
      toast.error('Rejection notes are required');
      return;
    }
    try {
      await handleWorkflowAction('reject', { notes: modalNotes });
      setShowRejectModal(false);
      setModalNotes('');
      toast.success('Request rejected');
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    }
  };

  const handleCloseRequest = async () => {
    try {
      setIsClosing(true);
      await apiClient.patch(`/requests/${id}/close?notes=`);
      setShowCloseModal(false);
      fetchRequest();
      toast.success('Request closed successfully');
    } catch (error) {
      console.error('Error closing request:', error);
      toast.error('Failed to close request');
    } finally {
      setIsClosing(false);
    }
  };

  const handleAssignProcurement = async () => {
    if (!assignUserId) {
      alert('Please select a user');
      return;
    }
    await handleWorkflowAction('assign-procurement', { userId: assignUserId });
    setShowAssignModal(false);
    setAssignUserId('');
  };

  // RFQ handlers
  const handleCreateRfq = async () => {
    if (isCreatingRfq) return;
    try {
      if (!rfqForm.supplier_id || !rfqForm.response_deadline) {
        toast.error('Please fill in all required fields');
        return;
      }

      setIsCreatingRfq(true);
      await apiClient.post('/rfqs/', {
        request_id: id,
        supplier_id: rfqForm.supplier_id,
        contact_id: rfqForm.contact_id || null,
        response_deadline: rfqForm.response_deadline.toISOString(),
        notes: rfqForm.notes,
      });

      setShowCreateRfqModal(false);
      setRfqForm({
        supplier_id: '',
        contact_id: '',
        response_deadline: null,
        notes: '',
      });
      setContacts([]);
      fetchRfqs();
      toast.success('RFQ created successfully');
    } catch (error: any) {
      console.error('Error creating RFQ:', error);
      toast.error(error.response?.data?.detail || 'Failed to create RFQ');
    } finally {
      setIsCreatingRfq(false);
    }
  };

  const handleEditRfq = async () => {
    try {
      if (!editingRfq || !rfqForm.response_deadline) {
        toast.error('Please fill in all required fields');
        return;
      }

      await apiClient.patch(`/rfqs/${editingRfq.id}`, {
        response_deadline: rfqForm.response_deadline.toISOString(),
        notes: rfqForm.notes,
      });

      setShowEditRfqModal(false);
      setEditingRfq(null);
      setRfqForm({
        supplier_id: '',
        contact_id: '',
        response_deadline: null,
        notes: '',
      });
      fetchRfqs();
      toast.success('RFQ updated successfully');
    } catch (error) {
      console.error('Error updating RFQ:', error);
      toast.error('Failed to update RFQ');
    }
  };

  const handleGenerateMailto = async (rfq: RFQ) => {
    try {
      const response = await apiClient.post<{
        to: string;
        cc: string;
        subject: string;
        body: string;
        rfq_number: string;
      }>(`/rfqs/${rfq.id}/generate-mailto`, {});

      const { to, cc, subject, body } = response;
      const params = new URLSearchParams();
      if (cc) params.set('cc', cc);
      params.set('subject', subject);
      params.set('body', body);
      const mailtoLink = `mailto:${to}?${params.toString().replace(/\+/g, '%20')}`;
      const a = document.createElement('a');
      a.href = mailtoLink;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success('Email client opened.');
      setOpenRfqMenuId(null);
    } catch (error) {
      console.error('Error generating mailto:', error);
      toast.error('Failed to generate email');
    }
  };

  const handleMarkAsSent = async (rfq: RFQ) => {
    try {
      await apiClient.patch(`/rfqs/${rfq.id}/mark-sent`, {});
      await fetchRfqs();
      await fetchRequest();
      toast.success('RFQ marked as sent.');
      setOpenRfqMenuId(null);
    } catch (error) {
      console.error('Error marking RFQ as sent:', error);
      toast.error('Failed to mark RFQ as sent');
    }
  };

  const handleDeclineRfq = async (rfq: RFQ) => {
    try {
      await apiClient.patch(`/rfqs/${rfq.id}/decline`, {});
      await fetchRfqs();
      await fetchRequest();
      setConfirmRfqAction({ show: false, type: null, rfq: null });
      toast.success('RFQ declined successfully');
    } catch (error) {
      console.error('Error declining RFQ:', error);
      toast.error('Failed to decline RFQ');
    }
  };

  const handleDeleteRfq = async (rfq: RFQ) => {
    try {
      await apiClient.delete(`/rfqs/${rfq.id}`);
      await fetchRfqs();
      setConfirmRfqAction({ show: false, type: null, rfq: null });
      toast.success('RFQ deleted successfully');
    } catch (error) {
      console.error('Error deleting RFQ:', error);
      toast.error('Failed to delete RFQ');
    }
  };

  const openCreateRfqModal = () => {
    fetchSuppliers();
    setShowCreateRfqModal(true);
  };

  const openEditRfqModal = (rfq: RFQ) => {
    setEditingRfq(rfq);
    setRfqForm({
      supplier_id: rfq.supplier_id,
      contact_id: rfq.contact_id || '',
      response_deadline: new Date(rfq.response_deadline),
      notes: rfq.notes,
    });
    fetchSuppliers();
    if (rfq.supplier_id) {
      fetchContacts(rfq.supplier_id);
    }
    setShowEditRfqModal(true);
    setOpenRfqMenuId(null);
  };

  const getRfqStatusStyle = (status: string) => {
    switch (status) {
      case 'draft':
        return { backgroundColor: '#F3F4F6', color: '#6B7280' };
      case 'sent':
        return { backgroundColor: '#DBEAFE', color: '#1E40AF' };
      case 'quote_received':
        return { backgroundColor: '#D1FAE5', color: '#065F46' };
      case 'declined':
        return { backgroundColor: '#FEE2E2', color: '#DC2626' };
      default:
        return { backgroundColor: '#F3F4F6', color: '#6B7280' };
    }
  };

  const getPriorityStyle = (priority: string) => {
    const styles = {
      low: { backgroundColor: '#F3F4F6', color: '#6B7280' },
      normal: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
      high: { backgroundColor: '#FED7AA', color: '#C2410C' },
      urgent: { backgroundColor: '#FEE2E2', color: '#991B1B' },
    };
    return styles[priority as keyof typeof styles] || styles.normal;
  };

  // Determine visible tabs based on role - Order: RFQs, Quotations, Offers, Purchase Order
  const visibleTabs: TabType[] = [];

  // RFQs tab - visible to Procurement, COD, and Sales users
  if (isProcurement || isCOD || hasSalesAccess) {
    visibleTabs.push('rfqs');
  }
  // Quotations tab - only Procurement and COD
  if (isProcurement || isCOD) {
    visibleTabs.push('quotations');
  }
  // Offers tab - visible to Sales users and COD
  if (hasSalesAccess || isCOD) {
    visibleTabs.push('offers');
  }
  // Purchase Order tab - only Procurement and COD
  if (isProcurement || isCOD) {
    visibleTabs.push('purchase-order');
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <div style={{ color: '#9CA3AF' }}>Loading...</div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <div style={{ color: '#9CA3AF' }}>Request not found</div>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ backgroundColor: '#F5F7FA', minHeight: '100vh', animation: 'fadeIn 0.3s ease-out' }}>
      <div className="max-w-[1400px] mx-auto">
        {/* Back Link */}
        <Link
          to="/requests"
          className="inline-flex items-center gap-2 mb-6 text-sm font-medium transition-colors"
          style={{ color: '#6B7280' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#4C5FD5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#6B7280';
          }}
        >
          <ArrowLeft size={16} />
          Back to Requests
        </Link>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-[28px] font-bold" style={{ color: '#1F2937' }}>
                  {request.title}
                </h1>
                <StatusBadge status={request.status} />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono" style={{ color: '#6B7280' }}>
                  #{request.request_number}
                </span>
                <span
                  className="px-3 py-1 rounded-md text-sm font-medium"
                  style={getPriorityStyle(request.priority)}
                >
                  {request.priority}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {/* Draft status actions */}
              {request.status === 'draft' && (
                <>
                  <button
                    onClick={() => navigate(`/requests/${id}/edit`)}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#4C5FD5',
                      border: '1px solid #4C5FD5',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#EEF2FF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteRequestConfirm(true)}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#DC2626',
                      border: '1px solid #DC2626',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#FEF2F2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }}
                  >
                    Delete
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-all"
                    style={{
                      background: isSubmitting ? '#9CA3AF' : 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
                  </button>
                </>
              )}

              {/* Submitted - Sales Manager / COD actions */}
              {request.status === 'submitted' && (isSalesManager || isCOD) && (
                <>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
                    style={{ backgroundColor: '#ffffff', color: '#DC2626', border: '1px solid #DC2626' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setShowApproveModal(true)}
                    className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-all"
                    style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                  >
                    Approve
                  </button>
                </>
              )}

              {/* Pending Sales Manager Approval - Sales Manager / COD actions */}
              {request.status === 'pending_sales_manager_approval' && (isSalesManager || isCOD) && (
                <>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#DC2626',
                      border: '1px solid #DC2626',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#FEF2F2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }}
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setShowApproveModal(true)}
                    className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    }}
                  >
                    Approve
                  </button>
                </>
              )}

              {/* Approved for Sourcing - COD/Procurement Manager action */}
              {request.status === 'approved_for_sourcing' && (isProcurementManager || isCOD) && (
                <button
                  onClick={() => {
                    fetchProcurementUsers();
                    setShowAssignModal(true);
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)',
                  }}
                >
                  Assign Procurement
                </button>
              )}

              {/* Shipment In Progress - Sales Manager / COD can close */}
              {request.status === 'shipment_in_progress' && (isSalesManager || isCOD) && (
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  Close Request
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Top Section: Request Info + Client/Team */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: '24px',
            marginBottom: '24px',
          }}
        >
          {/* Request Information Card */}
          <div
            className="p-6 rounded-2xl"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
              <h2 className="text-base font-semibold mb-4" style={{ color: '#1F2937' }}>
                Request Information
              </h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '24px 32px',
                  alignItems: 'start',
                }}
              >
                {/* Row 1: Request Number · Client */}
                <div>
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '4px',
                      display: 'block',
                    }}
                  >
                    Request Number
                  </label>
                  <p
                    className="font-mono"
                    style={{
                      fontSize: '14px',
                      color: '#111827',
                      fontWeight: 400,
                    }}
                  >
                    {request.request_number}
                  </p>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '4px',
                      display: 'block',
                    }}
                  >
                    Client
                  </label>
                  <p
                    style={{
                      fontSize: '14px',
                      color: '#111827',
                      fontWeight: 400,
                    }}
                  >
                    {client?.company_name || <span style={{ color: '#9CA3AF' }}>-</span>}
                  </p>
                </div>

                {/* Row 2: Client Reference · Priority */}
                <div>
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '4px',
                      display: 'block',
                    }}
                  >
                    Client Reference
                  </label>
                  <p
                    style={{
                      fontSize: '14px',
                      color: '#111827',
                      fontWeight: 400,
                    }}
                  >
                    {request.client_reference || <span style={{ color: '#9CA3AF' }}>-</span>}
                  </p>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '4px',
                      display: 'block',
                    }}
                  >
                    Priority
                  </label>
                  <p
                    style={{
                      fontSize: '14px',
                      color: '#111827',
                      fontWeight: 400,
                    }}
                  >
                    {request.priority}
                  </p>
                </div>

                {/* Row 3: Request Date · Deadline */}
                <div>
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '4px',
                      display: 'block',
                    }}
                  >
                    Request Date
                  </label>
                  <p
                    style={{
                      fontSize: '14px',
                      color: '#111827',
                      fontWeight: 400,
                    }}
                  >
                    {new Date(request.request_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '4px',
                      display: 'block',
                    }}
                  >
                    Deadline
                  </label>
                  <p
                    style={{
                      fontSize: '14px',
                      color: '#111827',
                      fontWeight: 400,
                    }}
                  >
                    {new Date(request.deadline).toLocaleDateString()}
                  </p>
                </div>

                {/* Row 4: Required Date · Created At */}
                <div>
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '4px',
                      display: 'block',
                    }}
                  >
                    Required Date
                  </label>
                  <p
                    style={{
                      fontSize: '14px',
                      color: '#111827',
                      fontWeight: 400,
                    }}
                  >
                    {request.required_date ? new Date(request.required_date).toLocaleDateString() : <span style={{ color: '#9CA3AF' }}>-</span>}
                  </p>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '4px',
                      display: 'block',
                    }}
                  >
                    Created At
                  </label>
                  <p
                    style={{
                      fontSize: '14px',
                      color: '#111827',
                      fontWeight: 400,
                    }}
                  >
                    {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Row 5: Description - Full Width */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '4px',
                      display: 'block',
                    }}
                  >
                    Description
                  </label>
                  <div
                    style={{
                      height: descriptionExpanded ? 'auto' : '72px',
                      overflow: 'hidden',
                      background: '#F8F9FA',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      fontSize: '14px',
                      color: '#374151',
                      position: 'relative',
                      display: 'flex',
                      alignItems: request.description ? 'flex-start' : 'center',
                      justifyContent: request.description ? 'flex-start' : 'center',
                    }}
                  >
                    {request.description ? (
                      <span style={{ whiteSpace: 'pre-wrap' }}>{request.description}</span>
                    ) : (
                      <span style={{ color: '#9CA3AF' }}>-</span>
                    )}
                  </div>
                  {request.description && request.description.length > 200 && (
                    <button
                      onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                      className="text-sm font-medium mt-2"
                      style={{ color: '#4C5FD5' }}
                    >
                      {descriptionExpanded ? 'View less' : 'View more'}
                    </button>
                  )}
                </div>

                {/* Row 5: Notes - Full Width */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '4px',
                      display: 'block',
                    }}
                  >
                    Notes
                  </label>
                  <div
                    style={{
                      height: notesExpanded ? 'auto' : '72px',
                      overflow: 'hidden',
                      background: '#F8F9FA',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      fontSize: '14px',
                      color: '#374151',
                      position: 'relative',
                      display: 'flex',
                      alignItems: request.notes ? 'flex-start' : 'center',
                      justifyContent: request.notes ? 'flex-start' : 'center',
                    }}
                  >
                    {request.notes ? (
                      <span style={{ whiteSpace: 'pre-wrap' }}>{request.notes}</span>
                    ) : (
                      <span style={{ color: '#9CA3AF' }}>-</span>
                    )}
                  </div>
                  {request.notes && request.notes.length > 200 && (
                    <button
                      onClick={() => setNotesExpanded(!notesExpanded)}
                      className="text-sm font-medium mt-2"
                      style={{ color: '#4C5FD5' }}
                    >
                      {notesExpanded ? 'View less' : 'View more'}
                    </button>
                  )}
                </div>

                {/* Row 6: Sales Manager Notes - Full Width (if not null) */}
                {request.sales_manager_notes && (
                  <div style={{ gridColumn: '1 / -1', paddingLeft: '16px', borderLeft: '3px solid #FBBF24' }}>
                    <label
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: '#F59E0B',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '4px',
                        display: 'block',
                      }}
                    >
                      Sales Manager Notes
                    </label>
                    <p
                      style={{
                        fontSize: '14px',
                        color: '#111827',
                        fontWeight: 400,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {request.sales_manager_notes}
                    </p>
                  </div>
                )}
              </div>
          </div>

          {/* Right Column: Client + Team Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Client Card */}
            <div
              className="p-5 rounded-2xl"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              }}
            >
              <h3 className="text-base font-semibold mb-4" style={{ color: '#1F2937' }}>
                Client
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: '#9CA3AF' }}>
                    Company
                  </label>
                  <p className="text-sm" style={{ color: '#1F2937' }}>
                    {client?.company_name || '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: '#9CA3AF' }}>
                    Contact Person
                  </label>
                  <p className="text-sm" style={{ color: '#1F2937' }}>
                    {client?.contact_person || '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: '#9CA3AF' }}>
                    Email
                  </label>
                  <p className="text-sm" style={{ color: '#1F2937' }}>
                    {client?.email || '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: '#9CA3AF' }}>
                    Phone
                  </label>
                  <p className="text-sm" style={{ color: '#1F2937' }}>
                    {client?.phone_1 || '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Team Card */}
            <div
              className="p-5 rounded-2xl"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              }}
            >
              <h3 className="text-base font-semibold mb-4" style={{ color: '#1F2937' }}>
                Team
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide mb-2" style={{ color: '#9CA3AF' }}>
                    Sales Manager
                  </label>
                  {teamUsers.salesManager ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                        style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)', color: 'white' }}
                      >
                        {getInitials(teamUsers.salesManager.fullname)}
                      </div>
                      <span className="text-sm" style={{ color: '#1F2937' }}>
                        {teamUsers.salesManager.fullname}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm italic" style={{ color: '#9CA3AF' }}>Not assigned</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide mb-2" style={{ color: '#9CA3AF' }}>
                    Sales Specialist
                  </label>
                  {teamUsers.salesRep ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                        style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)', color: 'white' }}
                      >
                        {getInitials(teamUsers.salesRep.fullname)}
                      </div>
                      <span className="text-sm" style={{ color: '#1F2937' }}>
                        {teamUsers.salesRep.fullname}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm italic" style={{ color: '#9CA3AF' }}>Not assigned</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide mb-2" style={{ color: '#9CA3AF' }}>
                    Procurement
                  </label>
                  {teamUsers.procurement ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                        style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)', color: 'white' }}
                      >
                        {getInitials(teamUsers.procurement.fullname)}
                      </div>
                      <span className="text-sm" style={{ color: '#1F2937' }}>
                        {teamUsers.procurement.fullname}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm italic" style={{ color: '#9CA3AF' }}>Not assigned</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Request Items - Full Width */}
        <div
          className="p-6 rounded-2xl"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            marginBottom: '24px',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ color: '#1F2937' }}>
              Request Items
            </h2>
            {request.status === 'draft' && !showAddItem && (
              <button
                onClick={() => setShowAddItem(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all"
                style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)' }}
              >
                <Plus size={16} />
                Add Item
              </button>
            )}
          </div>

          {/* Add/Edit Item Form */}
              {showAddItem && (
                <form onSubmit={handleAddItem} className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
                  <h4 className="text-sm font-semibold mb-3" style={{ color: '#1F2937' }}>
                    {editingItem ? 'Edit Item' : 'Add New Item'}
                  </h4>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Description *</label>
                      <input
                        type="text"
                        required
                        value={newItem.description}
                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg"
                        style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', color: '#1F2937' }}
                        placeholder="Item description"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Quantity *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 text-sm rounded-lg"
                        style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', color: '#1F2937' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Unit *</label>
                      <input
                        type="text"
                        required
                        value={newItem.unit}
                        onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg"
                        style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', color: '#1F2937' }}
                        placeholder="e.g. pcs, kg"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Notes</label>
                      <input
                        type="text"
                        value={newItem.notes}
                        onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg"
                        style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', color: '#1F2937' }}
                        placeholder="Optional notes"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-white rounded-lg"
                      style={{
                        background: isSubmitting ? '#9CA3AF' : 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isSubmitting ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddItem(false);
                        setEditingItem(null);
                        setNewItem({ description: '', quantity: 1, unit: 'pcs', notes: '' });
                      }}
                      className="px-4 py-2 text-sm font-medium rounded-lg"
                      style={{ backgroundColor: '#F3F4F6', color: '#1F2937' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Items List */}
              <div className="flex-1 overflow-auto">
                {items.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm" style={{ color: '#9CA3AF' }}>
                      No items yet
                    </p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: '#9CA3AF' }}>Line</th>
                        <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: '#9CA3AF' }}>Description</th>
                        <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: '#9CA3AF' }}>Quantity</th>
                        <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: '#9CA3AF' }}>Unit</th>
                        <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: '#9CA3AF' }}>Notes</th>
                        {request.status === 'draft' && (
                          <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: '#9CA3AF' }}>Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #F9FAFB' }}>
                          <td className="px-3 py-2">
                            <span className="text-sm font-mono" style={{ color: '#6B7280' }}>
                              {item.line_number}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[20px]">
                            <span className="text-sm" style={{ color: '#1F2937' }}>
                              {item.description}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-sm" style={{ color: '#1F2937' }}>
                              {item.quantity}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-sm" style={{ color: '#1F2937' }}>
                              {item.unit}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-sm" style={{ color: '#6B7280' }}>
                              {item.notes || '-'}
                            </span>
                          </td>
                          {request.status === 'draft' && (
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEditItem(item)}
                                  className="p-1.5 rounded transition-colors"
                                  style={{ color: '#4C5FD5' }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#EEF2FF';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => setDeleteItemConfirm({ show: true, itemId: item.id })}
                                  className="p-1.5 rounded transition-colors"
                                  style={{ color: '#DC2626' }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#FEE2E2';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
        </div>

        {/* Workflow Tabs - Full Width */}
        {visibleTabs.length > 0 && (
          <div
            className="p-6 rounded-2xl min-w-0 overflow-hidden"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
          >
            {/* For Sales users: show only Offers title without tabs */}
            {hasSalesAccess && !isProcurement && !isCOD && (
              <div className="mb-5">
                <h3 className="text-lg font-bold" style={{ color: '#1F2937' }}>Offers</h3>
              </div>
            )}

            {/* For Procurement/COD: show tabs and dynamic title row */}
            {(isProcurement || isCOD) && (
              <>
                {/* Dynamic title row — rendered above tabs ribbon */}
                <div key={`title-${activeTab}`} className="flex flex-wrap items-center justify-between gap-2 mb-5" style={{ minHeight: '2.25rem' }}>
              {activeTab === 'rfqs' && rfqs.length > 0 && request.status !== 'draft' && request.status !== 'submitted' && request.status !== 'pending_sales_manager_approval' && request.status !== 'approved_for_sourcing' && (
                <>
                  <h3 className="text-lg font-bold shrink-0" style={{ color: '#1F2937', minWidth: 0 }}>RFQs ({rfqs.length})</h3>
                  {(isProcurement || isCOD) && (
                    <button
                      onClick={openCreateRfqModal}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all shrink-0"
                      style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)', maxWidth: '100%' }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(76,95,213,0.3)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <Plus size={16} />
                      Create RFQ
                    </button>
                  )}
                </>
              )}
              {activeTab === 'rfqs' && (rfqs.length === 0 || request.status === 'draft' || request.status === 'submitted' || request.status === 'pending_sales_manager_approval' || request.status === 'approved_for_sourcing') && (
                <h3 className="text-lg font-bold shrink-0" style={{ color: '#1F2937', minWidth: 0 }}>RFQs</h3>
              )}
              {activeTab === 'quotations' && (
                <>
                  <h3 className="text-lg font-bold shrink-0" style={{ color: '#1F2937', minWidth: 0 }}>Quotations</h3>
                  {(isProcurementSpecialist || isProcurementManager || isCOD) && rfqs.filter(r => r.status === 'sent' || r.status === 'quote_received').length > 0 && (
                    <button
                      onClick={() => {
                        const addQuotationBtn = document.querySelector('[data-add-quotation-btn]') as HTMLButtonElement;
                        if (addQuotationBtn) addQuotationBtn.click();
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all shrink-0"
                      style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)', maxWidth: '100%' }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(76,95,213,0.3)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <Plus size={16} />
                      Add Quotation
                    </button>
                  )}
                </>
              )}
              {activeTab === 'offers' && (
                <h3 className="text-lg font-bold shrink-0" style={{ color: '#1F2937', minWidth: 0 }}>Offers</h3>
              )}
              {activeTab === 'purchase-order' && (
                <h3 className="text-lg font-bold shrink-0" style={{ color: '#1F2937', minWidth: 0 }}>Purchase Order</h3>
              )}
            </div>
            </>
            )}

            {/* Underline-style tabs - only for Procurement/COD */}
            {(isProcurement || isCOD) && (
            <div className="flex flex-wrap items-center mb-6" style={{ borderBottom: '2px solid #E5E7EB', gap: '0 1.5rem', minWidth: 0 }}>
              {visibleTabs.map((tab) => {
                const tabLabels: Record<TabType, string> = {
                  rfqs: 'RFQs',
                  quotations: 'Quotations',
                  offers: 'Offers',
                  'purchase-order': 'Purchase Order',
                };

                return (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); setTabAnimKeys(prev => ({ ...prev, [tab]: prev[tab] + 1 })); }}
                    className="pb-3 text-sm font-medium transition-all relative shrink-0"
                    style={{
                      color: activeTab === tab ? '#4C5FD5' : '#6B7280',
                      borderBottom: activeTab === tab ? '2px solid #4C5FD5' : '2px solid transparent',
                      marginBottom: '-2px',
                      minWidth: 'max-content',
                    }}
                  >
                    {tabLabels[tab]}
                  </button>
                );
              })}
            </div>
            )}

            {/* Tab Content */}
            <div>
              {/* RFQs Tab - only for Procurement/COD */}
              {(isProcurement || isCOD) && (
                <div style={{ display: activeTab === 'rfqs' ? 'block' : 'none' }}>
                  <div key={tabAnimKeys['rfqs']} style={{ animation: 'fadeSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                  {request.status !== 'draft' && request.status !== 'submitted' && request.status !== 'approved_for_sourcing' ? (
                    <>
                      {rfqs.length === 0 ? (
                        <div className="text-center py-16">
                          <div className="mb-4 text-4xl">📄</div>
                          <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F2937' }}>
                            No RFQs yet
                          </h3>
                          <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>
                            Create your first RFQ to start sourcing
                          </p>
                          {(isProcurement || isCOD) && (
                            <button
                              onClick={openCreateRfqModal}
                              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-all"
                              style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)' }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(76, 95, 213, 0.3)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <Plus size={18} />
                              Create RFQ
                            </button>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* RFQs Table */}
                          <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflowX: 'auto' }}>
                            <table className="w-full" style={{ tableLayout: 'auto', minWidth: 640 }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                                  {([
                                    ['rfq_number','RFQ #','10%'],
                                    ['supplier','Supplier','22%'],
                                    [null,'Contact','18%'],
                                    ['status','Status','14%'],
                                    ['response_deadline','Deadline','13%'],
                                    ['sent_at','Sent At','13%'],
                                    [null,'Actions','10%'],
                                  ] as [string|null,string,string][]).map(([field, label, width]) => (
                                    <th
                                      key={label}
                                      className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap"
                                      style={{ color: field && rfqSortField === field ? '#4C5FD5' : '#9CA3AF', width, cursor: field ? 'pointer' : 'default', userSelect: 'none' }}
                                      onClick={() => {
                                        if (!field) return;
                                        const f = field as typeof rfqSortField;
                                        if (rfqSortField === f) setRfqSortDir(d => d === 'asc' ? 'desc' : 'asc');
                                        else { setRfqSortField(f); setRfqSortDir(f === 'created_at' || f === 'sent_at' || f === 'response_deadline' ? 'desc' : 'asc'); }
                                      }}
                                    >
                                      <span className="inline-flex items-center gap-1">
                                        {label}
                                        {field && (rfqSortField === field
                                          ? (rfqSortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
                                          : <ChevronsUpDown size={11} style={{ color: '#C4C9D4' }} />
                                        )}
                                      </span>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {[...rfqs].sort((a, b) => {
                                    let cmp = 0;
                                    switch (rfqSortField) {
                                      case 'rfq_number': cmp = a.rfq_number.localeCompare(b.rfq_number, undefined, { numeric: true }); break;
                                      case 'supplier': cmp = (rfqSuppliers[a.supplier_id]?.company_name || '').localeCompare(rfqSuppliers[b.supplier_id]?.company_name || ''); break;
                                      case 'status': cmp = a.status.localeCompare(b.status); break;
                                      case 'response_deadline': cmp = new Date(a.response_deadline).getTime() - new Date(b.response_deadline).getTime(); break;
                                      case 'sent_at': cmp = (a.sent_at ? new Date(a.sent_at).getTime() : 0) - (b.sent_at ? new Date(b.sent_at).getTime() : 0); break;
                                      default: cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                                    }
                                    return rfqSortDir === 'asc' ? cmp : -cmp;
                                  }).map((rfq) => (
                                  <React.Fragment key={rfq.id}>
                                    <tr
                                      className="transition-colors"
                                      style={{ borderBottom: '1px solid #F9FAFB' }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                      }}
                                    >
                                      <td className="px-3 py-3">
                                        <span className="text-sm font-mono whitespace-nowrap" style={{ color: '#6B7280' }}>
                                          {rfq.rfq_number}
                                        </span>
                                      </td>
                                      <td className="px-3 py-3">
                                        <span className="text-sm font-medium" style={{ color: '#1F2937', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                                          {rfqSuppliers[rfq.supplier_id]?.company_name || 'Loading...'}
                                        </span>
                                      </td>
                                      <td className="px-3 py-3">
                                        <span className="text-sm" style={{ color: '#6B7280', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                                          {rfq.contact_id ? (rfqContacts[rfq.contact_id]?.fullname || 'Loading...') : '-'}
                                        </span>
                                      </td>
                                      <td className="px-3 py-3">
                                        <span
                                          className="inline-block px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                                          style={getRfqStatusStyle(rfq.status)}
                                        >
                                          {rfq.status === 'quote_received' ? 'Quote Received' : rfq.status.charAt(0).toUpperCase() + rfq.status.slice(1)}
                                        </span>
                                      </td>
                                      <td className="px-3 py-3">
                                        <span className="text-sm whitespace-nowrap" style={{ color: '#6B7280' }}>
                                          {new Date(rfq.response_deadline).toLocaleDateString()}
                                        </span>
                                      </td>
                                      <td className="px-3 py-3">
                                        <span className="text-sm whitespace-nowrap" style={{ color: '#6B7280' }}>
                                          {rfq.sent_at ? new Date(rfq.sent_at).toLocaleDateString() : '-'}
                                        </span>
                                      </td>
                                      <td className="px-3 py-3">
                                        <div className="flex items-center gap-3">
                                          <button
                                            onClick={() => setExpandedRfqId(expandedRfqId === rfq.id ? null : rfq.id)}
                                            className="text-sm font-medium transition-colors"
                                            style={{ color: '#4C5FD5' }}
                                            onMouseEnter={(e) => {
                                              e.currentTarget.style.color = '#6366F1';
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.color = '#4C5FD5';
                                            }}
                                          >
                                            {expandedRfqId === rfq.id ? 'Hide' : 'View'}
                                          </button>
                                          {(isProcurement || isCOD) && (
                                            <div className="relative" ref={openRfqMenuId === rfq.id ? rfqMenuRef : null}>
                                              <button
                                                onClick={(e) => {
                                                  const rect = e.currentTarget.getBoundingClientRect();
                                                  setRfqMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                                                  setOpenRfqMenuId(openRfqMenuId === rfq.id ? null : rfq.id);
                                                }}
                                                className="p-1 rounded-md transition-colors"
                                                style={{ color: '#9CA3AF' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F3F4F6'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                              >
                                                <MoreVertical size={16} />
                                              </button>
                                              {openRfqMenuId === rfq.id && (
                                                <div
                                                  className="w-48 py-1 rounded-lg"
                                                  style={{
                                                    position: 'fixed',
                                                    top: rfqMenuPos.top,
                                                    right: rfqMenuPos.right,
                                                    backgroundColor: '#ffffff',
                                                    border: '1px solid #E5E7EB',
                                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                                    zIndex: 1000,
                                                  }}
                                                >
                                                  {rfq.status === 'draft' && (
                                                  <button
                                                    onClick={() => handleGenerateMailto(rfq)}
                                                    className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors"
                                                    style={{ color: '#1F2937' }}
                                                    onMouseEnter={(e) => {
                                                      e.currentTarget.style.backgroundColor = '#F3F4F6';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                      e.currentTarget.style.backgroundColor = 'transparent';
                                                    }}
                                                  >
                                                    <Mail size={14} />
                                                    Generate Mailto
                                                  </button>
                                                  )}
                                                  {rfq.status === 'draft' && (
                                                    <>
                                                      <button
                                                        onClick={() => handleMarkAsSent(rfq)}
                                                        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors"
                                                        style={{ color: '#1F2937' }}
                                                        onMouseEnter={(e) => {
                                                          e.currentTarget.style.backgroundColor = '#F3F4F6';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                          e.currentTarget.style.backgroundColor = 'transparent';
                                                        }}
                                                      >
                                                        <Send size={14} />
                                                        Mark as Sent
                                                      </button>
                                                      <button
                                                        onClick={() => openEditRfqModal(rfq)}
                                                        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors"
                                                        style={{ color: '#1F2937' }}
                                                        onMouseEnter={(e) => {
                                                          e.currentTarget.style.backgroundColor = '#F3F4F6';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                          e.currentTarget.style.backgroundColor = 'transparent';
                                                        }}
                                                      >
                                                        <Edit2 size={14} />
                                                        Edit
                                                      </button>
                                                      <button
                                                        onClick={() => {
                                                          setConfirmRfqAction({ show: true, type: 'delete', rfq });
                                                          setOpenRfqMenuId(null);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors"
                                                        style={{ color: '#DC2626' }}
                                                        onMouseEnter={(e) => {
                                                          e.currentTarget.style.backgroundColor = '#FEE2E2';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                          e.currentTarget.style.backgroundColor = 'transparent';
                                                        }}
                                                      >
                                                        <Trash2 size={14} />
                                                        Delete
                                                      </button>
                                                    </>
                                                  )}
                                                  {rfq.status === 'sent' && (
                                                    <button
                                                      onClick={() => {
                                                        setConfirmRfqAction({ show: true, type: 'decline', rfq });
                                                        setOpenRfqMenuId(null);
                                                      }}
                                                      className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors"
                                                      style={{ color: '#DC2626' }}
                                                      onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#FEE2E2';
                                                      }}
                                                      onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                      }}
                                                    >
                                                      <X size={14} />
                                                      Decline
                                                    </button>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                    {expandedRfqId === rfq.id && (
                                      <tr>
                                        <td colSpan={7} className="px-4 py-0">
                                          <div
                                            className="my-2 p-4 rounded-lg"
                                            style={{ backgroundColor: '#F9FAFB' }}
                                          >
                                            <div className="flex items-center justify-between mb-4">
                                              <h4 className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                                                RFQ Details
                                              </h4>
                                              <button
                                                onClick={() => setExpandedRfqId(null)}
                                                className="text-sm font-medium transition-colors"
                                                style={{ color: '#6B7280' }}
                                                onMouseEnter={(e) => {
                                                  e.currentTarget.style.color = '#1F2937';
                                                }}
                                                onMouseLeave={(e) => {
                                                  e.currentTarget.style.color = '#6B7280';
                                                }}
                                              >
                                                Close
                                              </button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                              <div>
                                                <label className="block text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#9CA3AF' }}>
                                                  RFQ Number
                                                </label>
                                                <p className="text-sm font-mono" style={{ color: '#1F2937' }}>
                                                  {rfq.rfq_number}
                                                </p>
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#9CA3AF' }}>
                                                  Supplier
                                                </label>
                                                <p className="text-sm" style={{ color: '#1F2937' }}>
                                                  {rfqSuppliers[rfq.supplier_id]?.company_name || 'Loading...'}
                                                </p>
                                              </div>
                                              {rfq.contact_id && (
                                                <div>
                                                  <label className="block text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#9CA3AF' }}>
                                                    Contact
                                                  </label>
                                                  <p className="text-sm" style={{ color: '#1F2937' }}>
                                                    {rfqContacts[rfq.contact_id]?.fullname || 'Loading...'}
                                                  </p>
                                                </div>
                                              )}
                                              <div>
                                                <label className="block text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#9CA3AF' }}>
                                                  Status
                                                </label>
                                                <span
                                                  className="inline-block px-2.5 py-1 rounded-full text-xs font-medium"
                                                  style={getRfqStatusStyle(rfq.status)}
                                                >
                                                  {rfq.status === 'quote_received' ? 'Quote Received' : rfq.status.charAt(0).toUpperCase() + rfq.status.slice(1)}
                                                </span>
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#9CA3AF' }}>
                                                  Response Deadline
                                                </label>
                                                <p className="text-sm" style={{ color: '#1F2937' }}>
                                                  {new Date(rfq.response_deadline).toLocaleDateString()}
                                                </p>
                                              </div>
                                              {rfq.sent_at && (
                                                <div>
                                                  <label className="block text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#9CA3AF' }}>
                                                    Sent At
                                                  </label>
                                                  <p className="text-sm" style={{ color: '#1F2937' }}>
                                                    {new Date(rfq.sent_at).toLocaleDateString()}
                                                  </p>
                                                </div>
                                              )}
                                            </div>
                                            {rfq.notes && (
                                              <div className="mt-4">
                                                <label className="block text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#9CA3AF' }}>
                                                  Notes
                                                </label>
                                                <p className="text-sm" style={{ color: '#1F2937', whiteSpace: 'pre-wrap' }}>
                                                  {rfq.notes}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-base" style={{ color: '#9CA3AF' }}>
                        RFQs can be created after the request is approved for sourcing
                      </p>
                    </div>
                  )}
                  </div>
                </div>
              )}

              {/* Quotations Tab - only for Procurement/COD */}
              {(isProcurement || isCOD) && (
                <div style={{ display: activeTab === 'quotations' ? 'block' : 'none' }}>
                  <div key={tabAnimKeys['quotations']} style={{ animation: 'fadeSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                    <QuotationsTab
                      requestId={id!}
                      rfqs={rfqs}
                      rfqSuppliers={rfqSuppliers}
                      isCOD={isCOD}
                      isProcurementSpecialist={isProcurementSpecialist}
                      isProcurementManager={isProcurementManager}
                      onRefetchRequest={fetchRequest}
                      hideTitle
                    />
                  </div>
                </div>
              )}

              {/* Offers Tab - visible to all (Sales and Procurement/COD) */}
              {/* For Sales users: always show. For Procurement/COD: show when tab is active */}
              <div style={{ display: (hasSalesAccess && !isProcurement && !isCOD) || activeTab === 'offers' ? 'block' : 'none' }}>
                <div key={tabAnimKeys['offers']} style={{ animation: 'fadeSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                  <OffersTab
                    requestId={id!}
                    requestStatus={request?.status || ''}
                    rfqs={rfqs}
                    rfqSuppliers={rfqSuppliers}
                    isCOD={isCOD}
                    hasSalesAccess={hasSalesAccess}
                  />
                </div>
              </div>

              {/* Purchase Order Tab - only for Procurement/COD */}
              {(isProcurement || isCOD) && (
                <div style={{ display: activeTab === 'purchase-order' ? 'block' : 'none' }}>
                  <div key={tabAnimKeys['purchase-order']} style={{ animation: 'fadeSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                    <PurchaseOrderTab
                      requestId={id!}
                      requestStatus={request?.status || ''}
                      isCOD={isCOD}
                      hasProcurementAccess={hasProcurementAccess}
                      isProcurementManager={isProcurementManager}
                      isProcurementSpecialist={isProcurementSpecialist}
                    />
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {deleteRequestConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)', animation: 'fadeIn 0.2s ease-out' }}
            onClick={() => setDeleteRequestConfirm(false)}
          >
            <div
              className="bg-white rounded-xl p-6 w-full max-w-sm"
              style={{ boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', animation: 'scaleIn 0.2s ease-out' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F2937' }}>Delete Request</h3>
              <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
                Are you sure you want to delete this request? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteRequestConfirm(false)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#F3F4F6', color: '#374151' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E5E7EB'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F3F4F6'; }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setDeleteRequestConfirm(false); handleDeleteRequest(); }}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: '#DC2626', color: '#ffffff' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#B91C1C'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#DC2626'; }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {showApproveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => setShowApproveModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md"
            style={{
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              animation: 'scaleIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#1F2937' }}>
              Approve Request
            </h2>
            <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
              You can optionally add approval notes
            </p>
            <textarea
              value={modalNotes}
              onChange={(e) => setModalNotes(e.target.value)}
              rows={3}
              placeholder="Enter optional approval notes..."
              className="w-full px-3 py-2 text-sm rounded-lg mb-4"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #E5E7EB',
                color: '#1F2937',
              }}
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setModalNotes('');
                }}
                className="px-5 py-2 text-sm font-medium rounded-lg"
                style={{ backgroundColor: '#F3F4F6', color: '#1F2937' }}
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="px-5 py-2 text-sm font-medium text-white rounded-lg"
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {showCloseModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => setShowCloseModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md"
            style={{ boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', animation: 'scaleIn 0.2s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#1F2937' }}>
              Close Request
            </h2>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowCloseModal(false); setCloseNotes(''); }}
                className="px-5 py-2 text-sm font-medium rounded-lg"
                style={{ backgroundColor: '#F3F4F6', color: '#1F2937' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCloseRequest}
                disabled={isClosing}
                className="px-5 py-2 text-sm font-medium text-white rounded-lg"
                style={{
                  background: isClosing ? '#9CA3AF' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  cursor: isClosing ? 'not-allowed' : 'pointer',
                }}
              >
                {isClosing ? 'Closing...' : 'Close Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => setShowRejectModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md"
            style={{
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              animation: 'scaleIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#1F2937' }}>
              Reject Request
            </h2>
            <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
              Rejection notes are required
            </p>
            <textarea
              value={modalNotes}
              onChange={(e) => setModalNotes(e.target.value)}
              rows={3}
              placeholder="Enter rejection reason..."
              className="w-full px-3 py-2 text-sm rounded-lg mb-4"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #E5E7EB',
                color: '#1F2937',
              }}
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setModalNotes('');
                }}
                className="px-5 py-2 text-sm font-medium rounded-lg"
                style={{ backgroundColor: '#F3F4F6', color: '#1F2937' }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-5 py-2 text-sm font-medium text-white rounded-lg"
                style={{ backgroundColor: '#EF4444' }}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Procurement Modal */}
      {showAssignModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => setShowAssignModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md"
            style={{
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              animation: 'scaleIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#1F2937' }}>
              Assign Procurement User
            </h2>
            <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
              Select a procurement user to assign to this request
            </p>
            <select
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg mb-4"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #E5E7EB',
                color: '#1F2937',
              }}
            >
              <option value="">Select a user</option>
              {procurementUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullname}
                </option>
              ))}
            </select>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssignUserId('');
                }}
                className="px-5 py-2 text-sm font-medium rounded-lg"
                style={{ backgroundColor: '#F3F4F6', color: '#1F2937' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAssignProcurement}
                className="px-5 py-2 text-sm font-medium text-white rounded-lg"
                style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)' }}
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create RFQ Modal */}
      {showCreateRfqModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => {
            setShowCreateRfqModal(false);
            setRfqForm({ supplier_id: '', contact_id: '', response_deadline: null, notes: '' });
            setContacts([]);
          }}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md"
            style={{
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              animation: 'scaleIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: '#1F2937' }}>
                Create RFQ
              </h2>
              <button
                onClick={() => {
                  setShowCreateRfqModal(false);
                  setRfqForm({ supplier_id: '', contact_id: '', response_deadline: null, notes: '' });
                  setContacts([]);
                }}
                className="p-1 rounded-md transition-colors"
                style={{ color: '#9CA3AF' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                  Supplier *
                </label>
                <select
                  value={rfqForm.supplier_id}
                  onChange={(e) => {
                    setRfqForm({ ...rfqForm, supplier_id: e.target.value, contact_id: '' });
                    if (e.target.value) {
                      fetchContacts(e.target.value);
                    } else {
                      setContacts([]);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    border: '1px solid #D1D5DB',
                    color: '#1F2937',
                  }}
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                  Contact
                </label>
                <select
                  value={rfqForm.contact_id}
                  onChange={(e) => setRfqForm({ ...rfqForm, contact_id: e.target.value })}
                  disabled={!rfqForm.supplier_id}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    border: '1px solid #D1D5DB',
                    color: '#1F2937',
                    opacity: !rfqForm.supplier_id ? 0.5 : 1,
                  }}
                >
                  <option value="">Select contact (optional)</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.fullname} - {contact.position}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                  Response Deadline *
                </label>
                <DatePicker
                  selected={rfqForm.response_deadline}
                  onChange={(date) => setRfqForm({ ...rfqForm, response_deadline: date })}
                  minDate={new Date()}
                  placeholder="Select deadline"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                  Notes
                </label>
                <textarea
                  value={rfqForm.notes}
                  onChange={(e) => setRfqForm({ ...rfqForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    border: '1px solid #D1D5DB',
                    color: '#1F2937',
                  }}
                  placeholder="Add any additional notes..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateRfqModal(false);
                  setRfqForm({ supplier_id: '', contact_id: '', response_deadline: null, notes: '' });
                  setContacts([]);
                }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E5E7EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRfq}
                disabled={isCreatingRfq}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: isCreatingRfq ? '#9CA3AF' : 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)',
                  color: '#ffffff',
                  cursor: isCreatingRfq ? 'not-allowed' : 'pointer',
                }}
              >
                {isCreatingRfq ? 'Creating...' : 'Create RFQ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit RFQ Modal */}
      {showEditRfqModal && editingRfq && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => {
            setShowEditRfqModal(false);
            setEditingRfq(null);
            setRfqForm({ supplier_id: '', contact_id: '', response_deadline: null, notes: '' });
          }}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md"
            style={{
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              animation: 'scaleIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: '#1F2937' }}>
                Edit RFQ
              </h2>
              <button
                onClick={() => {
                  setShowEditRfqModal(false);
                  setEditingRfq(null);
                  setRfqForm({ supplier_id: '', contact_id: '', response_deadline: null, notes: '' });
                }}
                className="p-1 rounded-md transition-colors"
                style={{ color: '#9CA3AF' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                  Response Deadline *
                </label>
                <DatePicker
                  selected={rfqForm.response_deadline}
                  onChange={(date) => setRfqForm({ ...rfqForm, response_deadline: date })}
                  minDate={new Date()}
                  placeholder="Select deadline"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                  Notes
                </label>
                <textarea
                  value={rfqForm.notes}
                  onChange={(e) => setRfqForm({ ...rfqForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    border: '1px solid #D1D5DB',
                    color: '#1F2937',
                  }}
                  placeholder="Add any additional notes..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditRfqModal(false);
                  setEditingRfq(null);
                  setRfqForm({ supplier_id: '', contact_id: '', response_deadline: null, notes: '' });
                }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E5E7EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleEditRfq}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)',
                  color: '#ffffff',
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm RFQ Action Dialog */}
      {confirmRfqAction.show && confirmRfqAction.rfq && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => setConfirmRfqAction({ show: false, type: null, rfq: null })}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-sm"
            style={{
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              animation: 'scaleIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F2937' }}>
              {confirmRfqAction.type === 'decline' ? 'Decline RFQ' : 'Delete RFQ'}
            </h3>
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
              {confirmRfqAction.type === 'decline'
                ? `Are you sure you want to decline this RFQ from ${confirmRfqAction.rfq.supplier_name}? This cannot be undone.`
                : `Are you sure you want to delete this RFQ? This action cannot be undone.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRfqAction({ show: false, type: null, rfq: null })}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E5E7EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmRfqAction.type === 'decline') {
                    handleDeclineRfq(confirmRfqAction.rfq!);
                  } else {
                    handleDeleteRfq(confirmRfqAction.rfq!);
                  }
                }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: '#DC2626',
                  color: '#ffffff',
                }}
              >
                {confirmRfqAction.type === 'decline' ? 'Decline' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
