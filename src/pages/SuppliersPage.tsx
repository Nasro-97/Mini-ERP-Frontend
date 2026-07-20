import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, MoreVertical, Edit2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface Supplier {
  id: string;
  company_name: string;
  email: string;
  phone_1: string;
  phone_2: string;
  address: string;
  is_active: boolean;
  created_at: string;
}

export const SuppliersPage: React.FC = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ show: boolean; supplierId: string | null; action: 'activate' | 'deactivate' | null }>({
    show: false,
    supplierId: null,
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
    fetchSuppliers();
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

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Supplier[]>('/suppliers/');
      setSuppliers(data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        company_name: supplier.company_name,
        email: supplier.email,
        phone_1: supplier.phone_1,
        phone_2: supplier.phone_2 || '',
        address: supplier.address || '',
      });
    } else {
      setEditingSupplier(null);
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
    setEditingSupplier(null);
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
      if (editingSupplier) {
        await apiClient.patch(`/suppliers/${editingSupplier.id}`, formData);
      } else {
        await apiClient.post('/suppliers/', formData);
      }
      handleCloseModal();
      fetchSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
    }
  };

  const handleToggleActive = async (supplierId: string, action: 'activate' | 'deactivate') => {
    try {
      await apiClient.patch(`/suppliers/${supplierId}/${action}`, {});
      setConfirmAction({ show: false, supplierId: null, action: null });
      fetchSuppliers();
    } catch (error) {
      console.error(`Error ${action} supplier:`, error);
    }
  };

  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6" style={{ backgroundColor: '#F5F7FA', minHeight: '100vh', animation: 'fadeIn 0.3s ease-out' }}>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
              Suppliers
            </h1>
            <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
              Manage supplier companies
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
            New Supplier
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

        {/* Suppliers Table */}
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
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-base font-semibold mb-1" style={{ color: '#1F2937' }}>
                No suppliers found
              </h3>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                {searchQuery ? 'Try adjusting your search' : 'Get started by creating your first supplier'}
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
                  {filteredSuppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: '1px solid #F9FAFB' }}
                      onClick={() => navigate(`/suppliers/${supplier.id}`)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td className="py-3 px-4 text-sm font-medium" style={{ color: '#1F2937' }}>
                        {supplier.company_name}
                      </td>
                      <td className="py-3 px-4 text-sm" style={{ color: '#1F2937' }}>
                        {supplier.email}
                      </td>
                      <td className="py-3 px-4 text-sm" style={{ color: '#1F2937' }}>
                        {supplier.phone_1}
                      </td>
                      <td className="py-3 px-4 text-sm" style={{ color: '#6B7280' }}>
                        {supplier.address || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-0.5 rounded-md text-xs font-medium"
                          style={{
                            backgroundColor: supplier.is_active ? '#D1FAE5' : '#F3F4F6',
                            color: supplier.is_active ? '#065F46' : '#6B7280',
                          }}
                        >
                          {supplier.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="relative" ref={openMenuId === supplier.id ? menuRef : null}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === supplier.id ? null : supplier.id);
                            }}
                            className="p-1 rounded-md hover:bg-gray-100"
                          >
                            <MoreVertical size={16} style={{ color: '#6B7280' }} />
                          </button>

                          {openMenuId === supplier.id && (
                            <div
                              className="absolute right-0 top-full mt-1 w-40 rounded-lg overflow-hidden z-10"
                              style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #E5E7EB',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                              }}
                            >
                              <button
                                onClick={() => handleOpenModal(supplier)}
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
                                    supplierId: supplier.id,
                                    action: supplier.is_active ? 'deactivate' : 'activate',
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
                                {supplier.is_active ? 'Deactivate' : 'Activate'}
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

      {/* New/Edit Supplier Modal */}
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
              {editingSupplier ? 'Edit Supplier' : 'New Supplier'}
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
      {confirmAction.show && confirmAction.supplierId && confirmAction.action && (
        <ConfirmDialog
          title={confirmAction.action === 'activate' ? 'Activate Supplier' : 'Deactivate Supplier'}
          message={`Are you sure you want to ${confirmAction.action} this supplier?`}
          onConfirm={() => handleToggleActive(confirmAction.supplierId!, confirmAction.action!)}
          onCancel={() => setConfirmAction({ show: false, supplierId: null, action: null })}
          confirmText={confirmAction.action === 'activate' ? 'Activate' : 'Deactivate'}
          confirmStyle={confirmAction.action === 'activate' ? 'primary' : 'danger'}
        />
      )}
    </div>
  );
};
