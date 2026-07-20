import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Plus, MoreVertical, X } from 'lucide-react';
import { apiClient } from '../api/client';
import { useToast } from '../components/Toast';

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

interface Contact {
  id: string;
  fullname: string;
  position: string;
  email: string;
  phone_1: string;
  phone_2: string;
  is_active: boolean;
  created_at: string;
}

interface ContactForm {
  fullname: string;
  position: string;
  email: string;
  phone_1: string;
  phone_2: string;
}

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

interface RFQ {
  id: string;
  rfq_number: string;
  request_id: string;
  status: string;
  created_at: string;
  notes?: string;
}

export const SupplierDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [supplierRfqs, setSupplierRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const [supplierForm, setSupplierForm] = useState({
    company_name: '',
    email: '',
    phone_1: '',
    phone_2: '',
    address: '',
  });

  const [contactForm, setContactForm] = useState<ContactForm>({
    fullname: '',
    position: '',
    email: '',
    phone_1: '',
    phone_2: '',
  });

  useEffect(() => {
    if (id) {
      fetchSupplier();
      fetchContacts();
      fetchSupplierRfqs();
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

  const fetchSupplier = async () => {
    try {
      const data = await apiClient.get<Supplier>(`/suppliers/${id}`);
      setSupplier(data);
      setSupplierForm({
        company_name: data.company_name,
        email: data.email,
        phone_1: data.phone_1,
        phone_2: data.phone_2 || '',
        address: data.address || '',
      });
    } catch (error) {
      console.error('Error fetching supplier:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const data = await apiClient.get<Contact[]>(`/contacts/company/supplier/${id}`);
      setContacts(data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchSupplierRfqs = async () => {
    try {
      const data = await apiClient.get<RFQ[]>(`/rfqs/supplier/${id}`);
      setSupplierRfqs(data ?? []);
    } catch {
      setSupplierRfqs([]);
    }
  };

  const handleSaveSupplier = async () => {
    if (isSavingSupplier) return;

    try {
      setIsSavingSupplier(true);
      await apiClient.patch(`/suppliers/${id}`, supplierForm);
      await fetchSupplier();
      setShowEditModal(false);
      showToast('Supplier updated successfully', 'success');
    } catch (error) {
      console.error('Error updating supplier:', error);
      showToast('Failed to update supplier', 'error');
    } finally {
      setIsSavingSupplier(false);
    }
  };

  const handleToggleSupplierActive = async () => {
    try {
      await apiClient.patch(`/suppliers/${id}`, {
        is_active: !supplier?.is_active,
      });
      await fetchSupplier();
      showToast(
        `Supplier ${!supplier?.is_active ? 'activated' : 'deactivated'} successfully`,
        'success'
      );
    } catch (error) {
      console.error('Error toggling supplier status:', error);
      showToast('Failed to update supplier status', 'error');
    }
  };

  const handleContactModal = (contact?: Contact) => {
    if (contact) {
      setEditingContact(contact);
      setContactForm({
        fullname: contact.fullname,
        position: contact.position,
        email: contact.email,
        phone_1: contact.phone_1,
        phone_2: contact.phone_2 || '',
      });
    } else {
      setEditingContact(null);
      setContactForm({
        fullname: '',
        position: '',
        email: '',
        phone_1: '',
        phone_2: '',
      });
    }
    setShowContactModal(true);
  };

  const handleSaveContact = async () => {
    if (isSavingContact) return;

    try {
      setIsSavingContact(true);
      if (editingContact) {
        await apiClient.patch(`/contacts/${editingContact.id}`, contactForm);
        showToast('Contact updated successfully', 'success');
      } else {
        await apiClient.post('/contacts/', {
          company_type: 'supplier',
          company_id: id,
          ...contactForm,
        });
        showToast('Contact added successfully', 'success');
      }
      await fetchContacts();
      setShowContactModal(false);
    } catch (error) {
      console.error('Error saving contact:', error);
      showToast('Failed to save contact', 'error');
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleToggleContactActive = async (contact: Contact) => {
    try {
      await apiClient.patch(`/contacts/${contact.id}`, {
        is_active: !contact.is_active,
      });
      await fetchContacts();
      showToast(
        `Contact ${!contact.is_active ? 'activated' : 'deactivated'} successfully`,
        'success'
      );
    } catch (error) {
      console.error('Error toggling contact status:', error);
      showToast('Failed to update contact status', 'error');
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <div style={{ color: '#9CA3AF' }}>Loading...</div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <div style={{ color: '#9CA3AF' }}>Supplier not found</div>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ backgroundColor: '#F5F7FA', minHeight: '100vh', animation: 'fadeIn 0.3s ease-out' }}>
      <div className="max-w-7xl mx-auto">
        {/* Back Link */}
        <Link
          to="/suppliers"
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
          Back to Suppliers
        </Link>

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
              {supplier.company_name}
            </h1>
            <span
              className="px-2 py-0.5 rounded-md text-xs font-medium"
              style={{
                backgroundColor: supplier.is_active ? '#D1FAE5' : '#F3F4F6',
                color: supplier.is_active ? '#065F46' : '#6B7280',
              }}
            >
              {supplier.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: '#ffffff',
                color: '#4C5FD5',
                border: '1px solid #4C5FD5',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4C5FD5';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.color = '#4C5FD5';
              }}
            >
              <Edit2 size={16} />
              Edit Supplier
            </button>
            <button
              onClick={() => {
                setConfirmAction({
                  isOpen: true,
                  title: `${supplier.is_active ? 'Deactivate' : 'Activate'} Supplier`,
                  message: `Are you sure you want to ${
                    supplier.is_active ? 'deactivate' : 'activate'
                  } this supplier?`,
                  onConfirm: handleToggleSupplierActive,
                });
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: supplier.is_active ? '#FEE2E2' : '#D1FAE5',
                color: supplier.is_active ? '#DC2626' : '#065F46',
                border: `1px solid ${supplier.is_active ? '#FCA5A5' : '#A7F3D0'}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = supplier.is_active ? '#FEF2F2' : '#ECFDF5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = supplier.is_active ? '#FEE2E2' : '#D1FAE5';
              }}
            >
              {supplier.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>

        {/* Info + RFQs Row */}
        <div className="w-full flex flex-col lg:flex-row gap-6">
          {/* Supplier Information Card */}
          <div
            className="w-full lg:w-[40%] p-5 rounded-xl"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
            >
            <h3 className="text-base font-semibold mb-4" style={{ color: '#1F2937' }}>
              Supplier Information
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                  Email
                </label>
                <p className="text-sm" style={{ color: '#1F2937' }}>
                  {supplier.email}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                  Phone 1
                </label>
                <p className="text-sm" style={{ color: '#1F2937' }}>
                  {supplier.phone_1}
                </p>
              </div>
              {supplier.phone_2 && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                    Phone 2
                  </label>
                  <p className="text-sm" style={{ color: '#1F2937' }}>
                    {supplier.phone_2}
                  </p>
                </div>
              )}
              {supplier.address && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                    Address
                  </label>
                  <p className="text-sm" style={{ color: '#1F2937' }}>
                    {supplier.address}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                  Created
                </label>
                <p className="text-sm" style={{ color: '#1F2937' }}>
                  {new Date(supplier.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* RFQs Sent Card */}
          <div
            className="w-full lg:w-[60%] shrink-0 p-5 rounded-xl"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
          >
            <h3 className="text-base font-semibold mb-4" style={{ color: '#1F2937' }}>
              RFQs Sent ({supplierRfqs.length})
            </h3>
            <table className="w-full">
              <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: '#6B7280' }}>
                    RFQ Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: '#6B7280' }}>
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: '#6B7280' }}>
                    Date Sent
                  </th>
                </tr>
              </thead>
              <tbody>
                {supplierRfqs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm" style={{ color: '#9CA3AF' }}>
                      No RFQs have been sent to this supplier yet.
                    </td>
                  </tr>
                ) : (
                  supplierRfqs.map((rfq) => {
                    const status = rfq.status ?? '';
                    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
                    const statusBg =
                      status === 'sent' ? '#DBEAFE' :
                      status === 'responded' ? '#D1FAE5' :
                      status === 'draft' ? '#F3F4F6' : '#FEF3C7';
                    const statusColor =
                      status === 'sent' ? '#1D4ED8' :
                      status === 'responded' ? '#065F46' :
                      status === 'draft' ? '#6B7280' : '#92400E';
                    return (
                      <tr
                        key={rfq.id}
                        onClick={() => rfq.request_id && navigate(`/requests/${rfq.request_id}`)}
                        style={{ borderBottom: '1px solid #E5E7EB', cursor: rfq.request_id ? 'pointer' : 'default' }}
                        onMouseEnter={(e) => { if (rfq.request_id) e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium" style={{ color: '#1F2937' }}>
                            {rfq.rfq_number ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-0.5 rounded-md text-xs font-medium"
                            style={{ backgroundColor: statusBg, color: statusColor }}
                          >
                            {statusLabel || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm" style={{ color: '#6B7280' }}>
                            {rfq.created_at ? new Date(rfq.created_at).toLocaleDateString() : '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Contacts Section */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ color: '#1F2937' }}>
              Contacts ({contacts.length})
            </h3>
            <button
              onClick={() => handleContactModal()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)',
                color: '#ffffff',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(76, 95, 213, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Plus size={16} />
              Add Contact
            </button>
          </div>

          <div
            className="rounded-xl"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              overflow: 'visible',
            }}
          >
            <div style={{ overflow: 'visible' }}>
              <table className="w-full">
                <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: '#6B7280' }}>
                      Position
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: '#6B7280' }}>
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: '#6B7280' }}>
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: '#6B7280' }}>
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: '#6B7280' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: '#9CA3AF' }}>
                        No contacts found. Add your first contact to get started.
                      </td>
                    </tr>
                  ) : (
                    contacts.map((contact) => (
                      <tr
                        key={contact.id}
                        style={{ borderBottom: '1px solid #E5E7EB' }}
                      >
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium" style={{ color: '#1F2937' }}>
                            {contact.fullname}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm" style={{ color: '#6B7280' }}>
                            {contact.position}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm" style={{ color: '#6B7280' }}>
                            {contact.email}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm" style={{ color: '#6B7280' }}>
                            {contact.phone_1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
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
                        <td>
                          <div className="relative" ref={openMenuId === contact.id ? menuRef : null}>
                            <button
                              onClick={() => setOpenMenuId(openMenuId === contact.id ? null : contact.id)}
                              className="p-1 rounded-md transition-colors"
                              style={{ color: '#9CA3AF' }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#F3F4F6';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <MoreVertical size={16} />
                            </button>
                            {openMenuId === contact.id && (
                              <div
                                className="absolute right-0 top-full mt-1 w-40 py-1 rounded-lg z-10"
                                style={{
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #E5E7EB',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                }}
                              >
                                <button
                                  onClick={() => {
                                    handleContactModal(contact);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm transition-colors"
                                  style={{ color: '#1F2937' }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setConfirmAction({
                                      isOpen: true,
                                      title: `${contact.is_active ? 'Deactivate' : 'Activate'} Contact`,
                                      message: `Are you sure you want to ${
                                        contact.is_active ? 'deactivate' : 'activate'
                                      } ${contact.fullname}?`,
                                      onConfirm: () => handleToggleContactActive(contact),
                                    });
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm transition-colors"
                                  style={{ color: '#1F2937' }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#F3F4F6';
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* Edit Supplier Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="rounded-xl p-6 w-full max-w-md"
            style={{
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              animation: 'scaleIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: '#1F2937' }}>
                Edit Supplier
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
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
                  Company Name *
                </label>
                <input
                  type="text"
                  value={supplierForm.company_name}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, company_name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    border: '1px solid #D1D5DB',
                    color: '#1F2937',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    border: '1px solid #D1D5DB',
                    color: '#1F2937',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                  Phone 1 *
                </label>
                <input
                  type="tel"
                  value={supplierForm.phone_1}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone_1: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    border: '1px solid #D1D5DB',
                    color: '#1F2937',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                  Phone 2
                </label>
                <input
                  type="tel"
                  value={supplierForm.phone_2}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone_2: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    border: '1px solid #D1D5DB',
                    color: '#1F2937',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                  Address
                </label>
                <textarea
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    border: '1px solid #D1D5DB',
                    color: '#1F2937',
                  }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
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
                onClick={handleSaveSupplier}
                disabled={isSavingSupplier}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: isSavingSupplier
                    ? '#9CA3AF'
                    : 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)',
                  color: '#ffffff',
                  cursor: isSavingSupplier ? 'not-allowed' : 'pointer',
                  opacity: isSavingSupplier ? 0.6 : 1,
                }}
              >
                {isSavingSupplier ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setShowContactModal(false)}
        >
          <div
            className="rounded-xl p-6 w-full max-w-md"
            style={{
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              animation: 'scaleIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: '#1F2937' }}>
                {editingContact ? 'Edit Contact' : 'Add Contact'}
              </h3>
              <button
                onClick={() => setShowContactModal(false)}
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
                  Full Name *
                </label>
                <input
                  type="text"
                  value={contactForm.fullname}
                  onChange={(e) => setContactForm({ ...contactForm, fullname: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    border: '1px solid #D1D5DB',
                    color: '#1F2937',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                  Position *
                </label>
                <input
                  type="text"
                  value={contactForm.position}
                  onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    border: '1px solid #D1D5DB',
                    color: '#1F2937',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    border: '1px solid #D1D5DB',
                    color: '#1F2937',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                  Phone 1 *
                </label>
                <input
                  type="tel"
                  value={contactForm.phone_1}
                  onChange={(e) => setContactForm({ ...contactForm, phone_1: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    border: '1px solid #D1D5DB',
                    color: '#1F2937',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                  Phone 2
                </label>
                <input
                  type="tel"
                  value={contactForm.phone_2}
                  onChange={(e) => setContactForm({ ...contactForm, phone_2: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    border: '1px solid #D1D5DB',
                    color: '#1F2937',
                  }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowContactModal(false)}
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
                onClick={handleSaveContact}
                disabled={isSavingContact}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: isSavingContact
                    ? '#9CA3AF'
                    : 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)',
                  color: '#ffffff',
                  cursor: isSavingContact ? 'not-allowed' : 'pointer',
                  opacity: isSavingContact ? 0.6 : 1,
                }}
              >
                {isSavingContact ? 'Saving...' : editingContact ? 'Save Changes' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmAction.isOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setConfirmAction({ ...confirmAction, isOpen: false })}
        >
          <div
            className="rounded-xl p-6 w-full max-w-sm"
            style={{
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              animation: 'scaleIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#1F2937' }}>
              {confirmAction.title}
            </h3>
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
              {confirmAction.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction({ ...confirmAction, isOpen: false })}
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
                  confirmAction.onConfirm();
                  setConfirmAction({ ...confirmAction, isOpen: false });
                }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)',
                  color: '#ffffff',
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
