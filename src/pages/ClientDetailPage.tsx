import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Plus, MoreVertical } from 'lucide-react';
import { apiClient } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface Client {
  id: string;
  company_name: string;
  email: string;
  phone_1: string;
  phone_2: string;
  address: string;
  is_active: boolean;
  created_at: string;
}

interface Request {
  id: string;
  request_number: string;
  title: string;
  status: string;
  priority: string;
  client_id: string;
  created_at: string;
}

interface Contact {
  id: string;
  fullname: string;
  position: string;
  email: string;
  phone_1: string;
  phone_2: string;
  is_active: boolean;
}

export const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ show: boolean; type: 'client' | 'contact' | null; action: 'activate' | 'deactivate' | null; itemId: string | null }>({
    show: false,
    type: null,
    action: null,
    itemId: null,
  });
  const menuRef = useRef<HTMLDivElement>(null);

  const [editFormData, setEditFormData] = useState({
    company_name: '',
    email: '',
    phone_1: '',
    phone_2: '',
    address: '',
  });

  const [contactFormData, setContactFormData] = useState({
    fullname: '',
    position: '',
    email: '',
    phone_1: '',
    phone_2: '',
  });

  useEffect(() => {
    if (id) {
      fetchClient();
      fetchClientRequests();
      fetchContacts();
    }
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  const fetchClient = async () => {
    try {
      const data = await apiClient.get<Client>(`/clients/${id}`);
      setClient(data);
      setEditFormData({
        company_name: data.company_name,
        email: data.email,
        phone_1: data.phone_1,
        phone_2: data.phone_2 || '',
        address: data.address || '',
      });
    } catch (error) {
      console.error('Error fetching client:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientRequests = async () => {
    try {
      const data = await apiClient.get<Request[]>('/requests/');
      const clientRequests = data.filter(r => r.client_id === id);
      setRequests(clientRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      const data = await apiClient.get<Contact[]>(`/contacts/company/client/${id}`);
      setContacts(data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingClient) return;

    try {
      setIsSavingClient(true);
      await apiClient.patch(`/clients/${id}`, editFormData);
      setShowEditModal(false);
      fetchClient();
    } catch (error) {
      console.error('Error updating client:', error);
    } finally {
      setIsSavingClient(false);
    }
  };

  const handleToggleClientActive = async (action: 'activate' | 'deactivate') => {
    try {
      await apiClient.patch(`/clients/${id}/${action}`, {});
      setConfirmAction({ show: false, type: null, action: null, itemId: null });
      fetchClient();
    } catch (error) {
      console.error(`Error ${action} client:`, error);
    }
  };

  const handleContactModal = (contact?: Contact) => {
    if (contact) {
      setEditingContact(contact);
      setContactFormData({
        fullname: contact.fullname,
        position: contact.position,
        email: contact.email,
        phone_1: contact.phone_1,
        phone_2: contact.phone_2 || '',
      });
    } else {
      setEditingContact(null);
      setContactFormData({
        fullname: '',
        position: '',
        email: '',
        phone_1: '',
        phone_2: '',
      });
    }
    setShowContactModal(true);
    setOpenMenuId(null);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingContact) return;

    try {
      setIsSavingContact(true);
      if (editingContact) {
        await apiClient.patch(`/contacts/${editingContact.id}`, contactFormData);
      } else {
        await apiClient.post('/contacts/', {
          company_type: 'client',
          company_id: id,
          ...contactFormData,
        });
      }
      setShowContactModal(false);
      setEditingContact(null);
      fetchContacts();
    } catch (error) {
      console.error('Error saving contact:', error);
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleToggleContactActive = async (contactId: string, action: 'activate' | 'deactivate') => {
    try {
      await apiClient.patch(`/contacts/${contactId}/${action}`, {});
      setConfirmAction({ show: false, type: null, action: null, itemId: null });
      fetchContacts();
    } catch (error) {
      console.error(`Error ${action} contact:`, error);
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

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <div style={{ color: '#9CA3AF' }}>Loading...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <div style={{ color: '#9CA3AF' }}>Client not found</div>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ backgroundColor: '#F5F7FA', minHeight: '100vh', animation: 'fadeIn 0.3s ease-out' }}>
      <div className="max-w-7xl mx-auto">
        {/* Back Link */}
        <Link
          to="/clients"
          className="inline-flex items-center gap-2 mb-4 text-sm font-medium transition-colors"
          style={{ color: '#6B7280' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#4C5FD5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#6B7280';
          }}
        >
          <ArrowLeft size={16} />
          Back to Clients
        </Link>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
                {client.company_name}
              </h1>
              <span
                className="px-2 py-0.5 rounded-md text-xs font-medium"
                style={{
                  backgroundColor: client.is_active ? '#D1FAE5' : '#F3F4F6',
                  color: client.is_active ? '#065F46' : '#6B7280',
                }}
              >
                {client.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{
                backgroundColor: '#F3F4F6',
                color: '#1F2937',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E5E7EB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }}
            >
              <Edit2 size={14} />
              Edit Client
            </button>
            <button
              onClick={() =>
                setConfirmAction({
                  show: true,
                  type: 'client',
                  action: client.is_active ? 'deactivate' : 'activate',
                  itemId: client.id,
                })
              }
              className="px-4 py-2 text-sm font-medium rounded-lg"
              style={{
                backgroundColor: client.is_active ? '#FEE2E2' : '#D1FAE5',
                color: client.is_active ? '#991B1B' : '#065F46',
              }}
            >
              {client.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client Information Card */}
          <div
            className="p-5 rounded-xl"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
          >
            <h3 className="text-base font-semibold mb-4" style={{ color: '#1F2937' }}>
              Client Information
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                  Email
                </label>
                <p className="text-sm" style={{ color: '#1F2937' }}>
                  {client.email}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                  Phone 1
                </label>
                <p className="text-sm" style={{ color: '#1F2937' }}>
                  {client.phone_1}
                </p>
              </div>
              {client.phone_2 && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                    Phone 2
                  </label>
                  <p className="text-sm" style={{ color: '#1F2937' }}>
                    {client.phone_2}
                  </p>
                </div>
              )}
              {client.address && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                    Address
                  </label>
                  <p className="text-sm" style={{ color: '#1F2937' }}>
                    {client.address}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                  Created
                </label>
                <p className="text-sm" style={{ color: '#1F2937' }}>
                  {new Date(client.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Requests Table */}
          <div
            className="lg:col-span-2 p-5 rounded-xl"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
          >
            <h3 className="text-base font-semibold mb-4" style={{ color: '#1F2937' }}>
              Requests ({requests.length})
            </h3>
            {requests.length === 0 ? (
              <div className="text-center py-12" style={{ color: '#9CA3AF' }}>
                No requests yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>
                        Request Number
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>
                        Title
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>
                        Priority
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((request) => (
                      <tr
                        key={request.id}
                        className="cursor-pointer transition-colors"
                        style={{ borderBottom: '1px solid #F9FAFB' }}
                        onClick={() => navigate(`/requests/${request.id}`)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F9FAFB';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td className="py-3 px-4 text-sm font-medium" style={{ color: '#4C5FD5' }}>
                          {request.request_number}
                        </td>
                        <td className="py-3 px-4 text-sm" style={{ color: '#1F2937' }}>
                          {request.title || 'Untitled'}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={request.status} />
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="px-2 py-0.5 rounded-md text-xs font-medium"
                            style={getPriorityStyle(request.priority)}
                          >
                            {request.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm" style={{ color: '#9CA3AF' }}>
                          {new Date(request.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Contacts Section */}
        <div className="mt-6">
          <div
            className="p-5 rounded-xl"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              overflow: 'visible',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold" style={{ color: '#1F2937' }}>
                Contacts ({contacts.length})
              </h3>
              <button
                onClick={() => handleContactModal()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all"
                style={{
                  background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)',
                }}
              >
                <Plus size={14} />
                Add Contact
              </button>
            </div>

            {contacts.length === 0 ? (
              <div className="text-center py-12" style={{ color: '#9CA3AF' }}>
                No contacts yet
              </div>
            ) : (
              <div>
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>
                        Full Name
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>
                        Position
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>
                        Email
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>
                        Phone
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact) => (
                      <tr
                        key={contact.id}
                        className="transition-colors"
                        style={{ borderBottom: '1px solid #F9FAFB' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F9FAFB';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td className="py-3 px-4 text-sm font-medium" style={{ color: '#1F2937' }}>
                          {contact.fullname}
                        </td>
                        <td className="py-3 px-4 text-sm" style={{ color: '#1F2937' }}>
                          {contact.position}
                        </td>
                        <td className="py-3 px-4 text-sm" style={{ color: '#1F2937' }}>
                          {contact.email}
                        </td>
                        <td className="py-3 px-4 text-sm" style={{ color: '#1F2937' }}>
                          {contact.phone_1}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="px-2 py-0.5 rounded-md text-xs font-medium"
                            style={{
                              backgroundColor: contact.is_active ? '#D1FAE5' : '#F3F4F6',
                              color: contact.is_active ? '#065F46' : '#6B7280',
                            }}
                          >
                            {contact.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="relative" ref={openMenuId === contact.id ? menuRef : null}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === contact.id ? null : contact.id);
                              }}
                              className="p-1 rounded-md hover:bg-gray-100"
                            >
                              <MoreVertical size={16} style={{ color: '#6B7280' }} />
                            </button>

                            {openMenuId === contact.id && (
                              <div
                                className="absolute right-0 top-full mt-1 w-40 rounded-lg overflow-hidden z-10"
                                style={{
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #E5E7EB',
                                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                }}
                              >
                                <button
                                  onClick={() => handleContactModal(contact)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                                  style={{ color: '#6B7280' }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#F9FAFB';
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
                                    setConfirmAction({
                                      show: true,
                                      type: 'contact',
                                      action: contact.is_active ? 'deactivate' : 'activate',
                                      itemId: contact.id,
                                    });
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                                  style={{ color: '#6B7280' }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#F9FAFB';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  {contact.is_active ? 'Deactivate' : 'Activate'}
                                </button>
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
      </div>

      {/* Edit Client Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => setShowEditModal(false)}
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
              Edit Client
            </h2>

            <form onSubmit={handleEditClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#1F2937' }}>
                  Company Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.company_name}
                  onChange={(e) => setEditFormData({ ...editFormData, company_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E5E7EB',
                    color: '#1F2937',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#1F2937' }}>
                  Email <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E5E7EB',
                    color: '#1F2937',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#1F2937' }}>
                  Phone 1 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={editFormData.phone_1}
                  onChange={(e) => setEditFormData({ ...editFormData, phone_1: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E5E7EB',
                    color: '#1F2937',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#1F2937' }}>
                  Phone 2
                </label>
                <input
                  type="tel"
                  value={editFormData.phone_2}
                  onChange={(e) => setEditFormData({ ...editFormData, phone_2: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E5E7EB',
                    color: '#1F2937',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#1F2937' }}>
                  Address
                </label>
                <textarea
                  rows={2}
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E5E7EB',
                    color: '#1F2937',
                  }}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{
                    backgroundColor: '#F3F4F6',
                    color: '#1F2937',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSavingClient}
                  className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-all"
                  style={{
                    background: isSavingClient
                      ? '#9CA3AF'
                      : 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)',
                    cursor: isSavingClient ? 'not-allowed' : 'pointer',
                    opacity: isSavingClient ? 0.6 : 1,
                  }}
                >
                  {isSavingClient ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Contact Modal */}
      {showContactModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => setShowContactModal(false)}
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
              {editingContact ? 'Edit Contact' : 'Add Contact'}
            </h2>

            <form onSubmit={handleSaveContact} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#1F2937' }}>
                  Full Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={contactFormData.fullname}
                  onChange={(e) => setContactFormData({ ...contactFormData, fullname: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E5E7EB',
                    color: '#1F2937',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#1F2937' }}>
                  Position <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={contactFormData.position}
                  onChange={(e) => setContactFormData({ ...contactFormData, position: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E5E7EB',
                    color: '#1F2937',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#1F2937' }}>
                  Email <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  value={contactFormData.email}
                  onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E5E7EB',
                    color: '#1F2937',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#1F2937' }}>
                  Phone 1 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={contactFormData.phone_1}
                  onChange={(e) => setContactFormData({ ...contactFormData, phone_1: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E5E7EB',
                    color: '#1F2937',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#1F2937' }}>
                  Phone 2
                </label>
                <input
                  type="tel"
                  value={contactFormData.phone_2}
                  onChange={(e) => setContactFormData({ ...contactFormData, phone_2: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E5E7EB',
                    color: '#1F2937',
                  }}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="px-5 py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{
                    backgroundColor: '#F3F4F6',
                    color: '#1F2937',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSavingContact}
                  className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-all"
                  style={{
                    background: isSavingContact
                      ? '#9CA3AF'
                      : 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)',
                    cursor: isSavingContact ? 'not-allowed' : 'pointer',
                    opacity: isSavingContact ? 0.6 : 1,
                  }}
                >
                  {isSavingContact ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Activate/Deactivate */}
      {confirmAction.show && confirmAction.itemId && confirmAction.action && (
        <ConfirmDialog
          title={
            confirmAction.type === 'client'
              ? confirmAction.action === 'activate'
                ? 'Activate Client'
                : 'Deactivate Client'
              : confirmAction.action === 'activate'
              ? 'Activate Contact'
              : 'Deactivate Contact'
          }
          message={`Are you sure you want to ${confirmAction.action} this ${confirmAction.type}?`}
          onConfirm={() =>
            confirmAction.type === 'client'
              ? handleToggleClientActive(confirmAction.action!)
              : handleToggleContactActive(confirmAction.itemId!, confirmAction.action!)
          }
          onCancel={() => setConfirmAction({ show: false, type: null, action: null, itemId: null })}
          confirmText={confirmAction.action === 'activate' ? 'Activate' : 'Deactivate'}
          confirmStyle={confirmAction.action === 'activate' ? 'primary' : 'danger'}
        />
      )}
    </div>
  );
};
