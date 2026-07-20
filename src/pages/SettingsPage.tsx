import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ChevronRight, User, Eye, EyeOff, X, Settings2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { useToast } from '../components/Toast';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isCOD } = useAuth();
  const toast = useToast();

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [profileForm, setProfileForm] = useState({
    fullname: user?.fullname || '',
    email: user?.email || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await apiClient.patch(`/users/${user.id}`, {
        fullname: profileForm.fullname,
        email: profileForm.email,
      });
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      await apiClient.patch(`/users/${user.id}`, {
        current_password: passwordForm.current_password,
        password: passwordForm.new_password,
      });
      toast.success('Password changed successfully');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch {
      toast.error('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const cardBase = {
    backgroundColor: '#ffffff',
    border: '1px solid #E5E7EB',
    boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
  };

  return (
    <div className="p-6" style={{ backgroundColor: '#F5F7FA', minHeight: '100vh', animation: 'fadeIn 0.3s ease-out' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: '#1F2937' }}>Settings</h1>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>Manage your account and system configurations</p>
        </div>

        <div className="space-y-4">
          {/* Profile Settings */}
          <div
            className="p-5 rounded-xl cursor-pointer transition-all"
            style={cardBase}
            onClick={() => setShowProfileModal(true)}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0,0,0,0.05)'; }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                  <User size={22} style={{ color: '#ffffff' }} />
                </div>
                <div>
                  <h3 className="text-base font-semibold" style={{ color: '#1F2937' }}>Profile Settings</h3>
                  <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>Update your name, email and password</p>
                </div>
              </div>
              <ChevronRight size={20} style={{ color: '#9CA3AF' }} />
            </div>
          </div>

          {/* System Settings — COD only */}
          {isCOD && (
            <div
              className="p-5 rounded-xl cursor-pointer transition-all"
              style={cardBase}
              onClick={() => navigate('/settings/system')}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0,0,0,0.05)'; }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
                    <Settings2 size={22} style={{ color: '#ffffff' }} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: '#1F2937' }}>System Settings</h3>
                    <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>Company info, email and PDF templates</p>
                  </div>
                </div>
                <ChevronRight size={20} style={{ color: '#9CA3AF' }} />
              </div>
            </div>
          )}

          {/* Roles Management — COD only */}
          {isCOD && (
            <div
              className="p-5 rounded-xl cursor-pointer transition-all"
              style={cardBase}
              onClick={() => navigate('/roles')}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0,0,0,0.05)'; }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)' }}>
                    <Shield size={22} style={{ color: '#ffffff' }} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: '#1F2937' }}>Roles Management</h3>
                    <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>Create and manage user roles and permissions</p>
                  </div>
                </div>
                <ChevronRight size={20} style={{ color: '#9CA3AF' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Settings Modal */}
      {showProfileModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)', animation: 'fadeIn 0.2s ease-out' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowProfileModal(false); }}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg mx-4 overflow-hidden"
            style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.15)', animation: 'scaleIn 0.2s ease-out' }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                  <User size={18} style={{ color: '#ffffff' }} />
                </div>
                <h2 className="text-base font-semibold" style={{ color: '#1F2937' }}>Profile Settings</h2>
              </div>
              <button onClick={() => setShowProfileModal(false)} className="p-1 rounded-lg transition-colors hover:bg-gray-100">
                <X size={18} style={{ color: '#6B7280' }} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Account info */}
              <div>
                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Account Info</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Full Name</label>
                    <input
                      type="text"
                      value={profileForm.fullname}
                      onChange={(e) => setProfileForm(f => ({ ...f, fullname: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-lg"
                      style={{ border: '1px solid #E5E7EB', color: '#1F2937', outline: 'none' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#4C5FD5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(76,95,213,0.1)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Email</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-lg"
                      style={{ border: '1px solid #E5E7EB', color: '#1F2937', outline: 'none' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#4C5FD5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(76,95,213,0.1)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Username</label>
                    <input
                      type="text"
                      value={user?.username || ''}
                      disabled
                      className="w-full px-3 py-2 text-sm rounded-lg"
                      style={{ border: '1px solid #E5E7EB', color: '#9CA3AF', backgroundColor: '#F9FAFB', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="mt-3 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all"
                  style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)', opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid #F3F4F6' }} />

              {/* Change Password */}
              <div>
                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Change Password</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Current Password', key: 'current_password', show: showCurrentPw, toggle: () => setShowCurrentPw(v => !v) },
                    { label: 'New Password', key: 'new_password', show: showNewPw, toggle: () => setShowNewPw(v => !v) },
                    { label: 'Confirm New Password', key: 'confirm_password', show: showConfirmPw, toggle: () => setShowConfirmPw(v => !v) },
                  ].map(({ label, key, show, toggle }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>{label}</label>
                      <div className="relative">
                        <input
                          type={show ? 'text' : 'password'}
                          value={passwordForm[key as keyof typeof passwordForm]}
                          onChange={(e) => setPasswordForm(f => ({ ...f, [key]: e.target.value }))}
                          className="w-full px-3 py-2 pr-9 text-sm rounded-lg"
                          style={{ border: '1px solid #E5E7EB', color: '#1F2937', outline: 'none' }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = '#4C5FD5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(76,95,213,0.1)'; }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }}
                        />
                        <button type="button" onClick={toggle} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }}>
                          {show ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={saving || !passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password}
                  className="mt-3 px-4 py-2 text-sm font-medium rounded-lg transition-all"
                  style={{
                    backgroundColor: '#FEE2E2',
                    color: '#DC2626',
                    border: '1px solid #FECACA',
                    opacity: (saving || !passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) ? 0.5 : 1,
                  }}
                >
                  {saving ? 'Updating...' : 'Change Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
