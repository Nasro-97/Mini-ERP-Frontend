import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, MoreVertical, Edit2 } from 'lucide-react';
import { apiClient } from '../api/client';
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

export const ClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ show: boolean; clientId: string | null; action: 'activate' | 'deactivate' | null }>({
    show: false,
    clientId: null,
    action: null,
  });
  const menuRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    company_name: '',
    email: '',
    phone_1: '',
    phone_2: '',
    address: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

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

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Client[]>('/clients/');
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        company_name: client.company_name,
        email: client.email,
        phone_1: client.phone_1,
        phone_2: client.phone_2 || '',
        address: client.address || '',
      });
    } else {
      setEditingClient(null);
      setFormData({
        company_name: '',
        email: '',
        phone_1: '',
        phone_2: '',
        address: '',
      });
    }
    setShowModal(true);
    setOpenMenuId(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClient(null);
    setFormData({
      company_name: '',
      email: '',
      phone_1: '',
      phone_2: '',
      address: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await apiClient.patch(`/clients/${editingClient.id}`, formData);
      } else {
        await apiClient.post('/clients/', formData);
      }
      handleCloseModal();
      fetchClients();
    } catch (error) {
      console.error('Error saving client:', error);
    }
  };

  const handleToggleActive = async (clientId: string, action: 'activate' | 'deactivate') => {
    try {
      await apiClient.patch(`/clients/${clientId}/${action}`, {});
      setConfirmAction({ show: false, clientId: null, action: null });
      fetchClients();
    } catch (error) {
      console.error(`Error ${action} client:`, error);
    }
  };

  const filteredClients = clients.filter((client) =>
    client.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6" style={{ backgroundColor: '#F5F7FA', minHeight: '100vh', animation: 'fadeIn 0.3s ease-out' }}>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
              Clients
            </h1>
            <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
              Manage client companies
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-all"
            style={{
              background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)',
              boxShadow: '0 1px 3px rgba(76, 95, 213, 0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 95, 213, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(76, 95, 213, 0.2)';
            }}
          >
            <Plus size={18} />
            New Client
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-5">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2"
              size={16}
              style={{ color: '#9CA3AF' }}
            />
            <input
              type="text"
              placeholder="Search by company name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #E5E7EB',
                color: '#1F2937',
              }}
            />
          </div>
        </div>

        {/* Clients Table */}
        <div
          className="rounded-xl"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            overflow: 'visible',
          }}
        >
          {loading ? (
            <div className="text-center py-12" style={{ color: '#9CA3AF' }}>
              Loading...
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-base font-semibold mb-1" style={{ color: '#1F2937' }}>
                No clients found
              </h3>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                {searchQuery ? 'Try adjusting your search' : 'Get started by creating your first client'}
              </p>
            </div>
          ) : (
            <div>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>
                      Company Name
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>
                      Phone
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>
                      Address
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
                  {filteredClients.map((client) => (
                    <tr
                      key={client.id}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: '1px solid #F9FAFB' }}
                      onClick={() => navigate(`/clients/${client.id}`)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td className="py-3 px-4 text-sm font-medium" style={{ color: '#1F2937' }}>
                        {client.company_name}
                      </td>
                      <td className="py-3 px-4 text-sm" style={{ color: '#1F2937' }}>
                        {client.email}
                      </td>
                      <td className="py-3 px-4 text-sm" style={{ color: '#1F2937' }}>
                        {client.phone_1}
                      </td>
                      <td className="py-3 px-4 text-sm" style={{ color: '#6B7280' }}>
                        {client.address || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-0.5 rounded-md text-xs font-medium"
                          style={{
                            backgroundColor: client.is_active ? '#D1FAE5' : '#F3F4F6',
                            color: client.is_active ? '#065F46' : '#6B7280',
                          }}
                        >
                          {client.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="relative" ref={openMenuId === client.id ? menuRef : null}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === client.id ? null : client.id);
                            }}
                            className="p-1 rounded-md hover:bg-gray-100"
                          >
                            <MoreVertical size={16} style={{ color: '#6B7280' }} />
                          </button>

                          {openMenuId === client.id && (
                            <div
                              className="absolute right-0 top-full mt-1 w-40 rounded-lg overflow-hidden z-10"
                              style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #E5E7EB',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                              }}
                            >
                              <button
                                onClick={() => handleOpenModal(client)}
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
                                    clientId: client.id,
                                    action: client.is_active ? 'deactivate' : 'activate',
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
                                {client.is_active ? 'Deactivate' : 'Activate'}
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

      {/* New/Edit Client Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', animation: 'fadeIn 0.2s ease-out' }}
          onClick={handleCloseModal}
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
              {editingClient ? 'Edit Client' : 'New Client'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#1F2937' }}>
                  Company Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
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
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  value={formData.phone_1}
                  onChange={(e) => setFormData({ ...formData, phone_1: e.target.value })}
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
                  value={formData.phone_2}
                  onChange={(e) => setFormData({ ...formData, phone_2: e.target.value })}
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
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                  onClick={handleCloseModal}
                  className="px-5 py-2 text-sm font-medium rounded-lg transition-colors"
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
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)',
                  }}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Activate/Deactivate */}
      {confirmAction.show && confirmAction.clientId && confirmAction.action && (
        <ConfirmDialog
          title={confirmAction.action === 'activate' ? 'Activate Client' : 'Deactivate Client'}
          message={`Are you sure you want to ${confirmAction.action} this client?`}
          onConfirm={() => handleToggleActive(confirmAction.clientId!, confirmAction.action!)}
          onCancel={() => setConfirmAction({ show: false, clientId: null, action: null })}
          confirmText={confirmAction.action === 'activate' ? 'Activate' : 'Deactivate'}
          confirmStyle={confirmAction.action === 'activate' ? 'primary' : 'danger'}
        />
      )}
    </div>
  );
};
