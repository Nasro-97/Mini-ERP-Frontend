import React, { useState, useEffect, useRef } from 'react';
import { Plus, MoreVertical, Edit2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

interface User {
  id: string;
  username: string;
  fullname: string;
  email: string;
  is_active: boolean;
  roles: Array<{ id: string; name: string }>;
  created_at: string;
}

interface Role {
  id: string;
  name: string;
}

export const UsersPage: React.FC = () => {
  const { user: currentUser, isCOD } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ show: boolean; userId: string | null; action: 'activate' | 'deactivate' | null }>({
    show: false,
    userId: null,
    action: null,
  });
  const menuRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    username: '',
    fullname: '',
    email: '',
    password: '',
    role_ids: [] as string[],
  });

  useEffect(() => {
    fetchUsers();
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

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<User[]>('/users/');
      // Filter out current logged-in user
      const filteredUsers = data.filter(u => u.id !== currentUser?.id);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await apiClient.get<Role[]>('/roles/');
      setRoles(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        fullname: user.fullname,
        email: user.email,
        password: '',
        role_ids: user.roles.map(r => r.id),
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        fullname: '',
        email: '',
        password: '',
        role_ids: [],
      });
    }
    setShowModal(true);
    setOpenMenuId(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      username: '',
      fullname: '',
      email: '',
      password: '',
      role_ids: [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = editingUser
        ? { ...formData, password: formData.password || undefined }
        : formData;

      if (editingUser) {
        await apiClient.patch(`/users/${editingUser.id}`, payload);
      } else {
        await apiClient.post('/users/', payload);
      }
      handleCloseModal();
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const handleToggleActive = async (userId: string, action: 'activate' | 'deactivate') => {
    try {
      await apiClient.patch(`/users/${userId}/${action}`, {});
      setConfirmAction({ show: false, userId: null, action: null });
      fetchUsers();
    } catch (error) {
      console.error(`Error ${action} user:`, error);
    }
  };

  const handleRoleToggle = (roleId: string) => {
    setFormData({
      ...formData,
      role_ids: formData.role_ids.includes(roleId)
        ? formData.role_ids.filter(id => id !== roleId)
        : [...formData.role_ids, roleId],
    });
  };

  return (
    <div className="p-6" style={{ backgroundColor: '#F5F7FA', minHeight: '100vh', animation: 'fadeIn 0.3s ease-out' }}>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
              Employees
            </h1>
            <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
              Manage system employees
            </p>
          </div>
          {isCOD && (
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
              New Employee
            </button>
          )}
        </div>

        {/* Users Table */}
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
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-base font-semibold mb-1" style={{ color: '#1F2937' }}>
                No employees found
              </h3>
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
                      Username
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>
                      Roles
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>
                      Created
                    </th>
                    {isCOD && (
                      <th className="text-left py-3 px-4 text-xs font-medium" style={{ color: '#9CA3AF' }}>
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
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
                        {user.fullname}
                      </td>
                      <td className="py-3 px-4 text-sm" style={{ color: '#1F2937' }}>
                        {user.username}
                      </td>
                      <td className="py-3 px-4 text-sm" style={{ color: '#1F2937' }}>
                        {user.email}
                      </td>
                      <td className="py-3 px-4 text-sm" style={{ color: '#6B7280' }}>
                        {user.roles.map(r => r.name).join(', ') || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-0.5 rounded-md text-xs font-medium"
                          style={{
                            backgroundColor: user.is_active ? '#D1FAE5' : '#F3F4F6',
                            color: user.is_active ? '#065F46' : '#6B7280',
                          }}
                        >
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm" style={{ color: '#9CA3AF' }}>
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      {isCOD && (
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="relative" ref={openMenuId === user.id ? menuRef : null}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === user.id ? null : user.id);
                            }}
                            className="p-1 rounded-md hover:bg-gray-100"
                          >
                            <MoreVertical size={16} style={{ color: '#6B7280' }} />
                          </button>

                          {openMenuId === user.id && (
                            <div
                              className="absolute right-0 top-full mt-1 w-40 rounded-lg overflow-hidden z-10"
                              style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #E5E7EB',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                              }}
                            >
                              <button
                                onClick={() => handleOpenModal(user)}
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
                                    userId: user.id,
                                    action: user.is_active ? 'deactivate' : 'activate',
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
                                {user.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* New/Edit User Modal */}
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
              {editingUser ? 'Edit User' : 'New User'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#1F2937' }}>
                  Username <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
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
                  Full Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullname}
                  onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
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
                  Password {!editingUser && <span style={{ color: '#EF4444' }}>*</span>}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E5E7EB',
                    color: '#1F2937',
                  }}
                  placeholder={editingUser ? 'Leave blank to keep current' : ''}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#1F2937' }}>
                  Roles
                </label>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => {
                    const checked = formData.role_ids.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleRoleToggle(role.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                        style={{
                          backgroundColor: checked ? '#EEF0FD' : '#F9FAFB',
                          color: checked ? '#4C5FD5' : '#6B7280',
                          border: `1.5px solid ${checked ? '#4C5FD5' : '#E5E7EB'}`,
                        }}
                      >
                        <span
                          className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: checked ? '#4C5FD5' : '#ffffff', border: `1.5px solid ${checked ? '#4C5FD5' : '#D1D5DB'}` }}
                        >
                          {checked && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        {role.name}
                      </button>
                    );
                  })}
                </div>
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
      {confirmAction.show && confirmAction.userId && confirmAction.action && (
        <ConfirmDialog
          title={confirmAction.action === 'activate' ? 'Activate User' : 'Deactivate User'}
          message={`Are you sure you want to ${confirmAction.action} this user?`}
          onConfirm={() => handleToggleActive(confirmAction.userId!, confirmAction.action!)}
          onCancel={() => setConfirmAction({ show: false, userId: null, action: null })}
          confirmText={confirmAction.action === 'activate' ? 'Activate' : 'Deactivate'}
          confirmStyle={confirmAction.action === 'activate' ? 'primary' : 'danger'}
        />
      )}
    </div>
  );
};
