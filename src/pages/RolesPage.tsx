import React, { useState, useEffect, useRef } from 'react';
import { Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface Role {
  id: string;
  name: string;
  description: string;
}

export const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; roleId: string | null }>({
    show: false,
    roleId: null,
  });
  const menuRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchRoles();
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

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Role[]>('/roles/');
      setRoles(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        description: role.description || '',
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        description: '',
      });
    }
    setShowModal(true);
    setOpenMenuId(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await apiClient.patch(`/roles/${editingRole.id}`, formData);
      } else {
        await apiClient.post('/roles/', formData);
      }
      handleCloseModal();
      fetchRoles();
    } catch (error) {
      console.error('Error saving role:', error);
    }
  };

  const handleDelete = async (roleId: string) => {
    try {
      await apiClient.delete(`/roles/${roleId}`);
      setDeleteConfirm({ show: false, roleId: null });
      fetchRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
    }
  };

  return (
    <div className="p-6" style={{ backgroundColor: '#F5F7FA', minHeight: '100vh', animation: 'fadeIn 0.3s ease-out' }}>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
              Roles
            </h1>
            <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
              Manage user roles
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
            New Role
          </button>
        </div>

        {/* Roles Table */}
        <div
          className="rounded-xl"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          {loading ? (
            <div className="text-center py-12" style={{ color: '#9CA3AF' }}>
              Loading...
            </div>
          ) : roles.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-base font-semibold mb-1" style={{ color: '#1F2937' }}>
                No roles found
              </h3>
            </div>
          ) : (
            <div>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>
                      Description
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr
                      key={role.id}
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
                        {role.name}
                      </td>
                      <td className="py-3 px-4 text-sm" style={{ color: '#6B7280' }}>
                        {role.description || '-'}
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="relative" ref={openMenuId === role.id ? menuRef : null}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === role.id ? null : role.id);
                            }}
                            className="p-1 rounded-md hover:bg-gray-100"
                          >
                            <MoreVertical size={16} style={{ color: '#6B7280' }} />
                          </button>

                          {openMenuId === role.id && (
                            <div
                              className="absolute right-0 top-full mt-1 w-40 rounded-lg overflow-hidden z-10"
                              style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #E5E7EB',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                              }}
                            >
                              <button
                                onClick={() => handleOpenModal(role)}
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
                                  setDeleteConfirm({ show: true, roleId: role.id });
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                                style={{ color: '#EF4444' }}
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

      {/* New/Edit Role Modal */}
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
              {editingRole ? 'Edit Role' : 'New Role'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#1F2937' }}>
                  Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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

      {/* Delete Confirmation */}
      {deleteConfirm.show && deleteConfirm.roleId && (
        <ConfirmDialog
          title="Delete Role"
          message="Are you sure you want to delete this role? This action cannot be undone."
          onConfirm={() => handleDelete(deleteConfirm.roleId!)}
          onCancel={() => setDeleteConfirm({ show: false, roleId: null })}
          confirmText="Delete"
          confirmStyle="danger"
        />
      )}
    </div>
  );
};
