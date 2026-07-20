import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, FileText, DollarSign, Building2, Users as UsersIcon, Settings, LogOut, ChevronDown, UserCog, Shield } from 'lucide-react';

interface NavLink {
  path: string;
  label: string;
  icon: React.ElementType;
  condition: (auth: ReturnType<typeof useAuth>) => boolean;
}

const navLinks: NavLink[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    condition: () => true,
  },
  {
    path: '/requests',
    label: 'Requests',
    icon: FileText,
    condition: () => true,
  },
  {
    path: '/offers',
    label: 'Offers',
    icon: DollarSign,
    condition: (auth) => auth.hasSalesAccess,
  },
  {
    path: '/clients',
    label: 'Clients',
    icon: Building2,
    condition: (auth) => auth.hasSalesAccess,
  },
  {
    path: '/suppliers',
    label: 'Suppliers',
    icon: UsersIcon,
    condition: () => true,
  },
  {
    path: '/users',
    label: 'Employees',
    icon: UserCog,
    condition: (auth) => auth.isCOD,
  },
];

export const AppLayout: React.FC = () => {
  const auth = useAuth();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const visibleLinks = navLinks.filter(link => link.condition(auth));

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const getRoleNames = () => {
    if (!auth.user || !auth.user.roles) return '';
    return auth.user.roles.map(r => r.name).join(', ');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#F5F7FA' }}>
      {/* Sidebar */}
      <aside className="w-[260px] bg-white flex flex-col border-r" style={{ borderColor: '#E5E7EB' }}>
        {/* Logo */}
        <div className="p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center gap-3">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#4C5FD5', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#6366F1', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              <path
                d="M20 5L17.5 2.5L15 5L12.5 2.5L10 5L7.5 2.5L5 5V35L7.5 37.5L10 35L12.5 37.5L15 35L17.5 37.5L20 35L22.5 37.5L25 35L27.5 37.5L30 35L32.5 37.5L35 35V5L32.5 2.5L30 5L27.5 2.5L25 5L22.5 2.5L20 5Z"
                fill="url(#logoGradient)"
                fillOpacity="0.15"
              />
              <rect x="12.5" y="12.5" width="15" height="15" rx="1.5" fill="url(#logoGradient)" fillOpacity="0.25" />
              <circle cx="20" cy="20" r="5" fill="url(#logoGradient)" fillOpacity="0.4" />
              <circle cx="20" cy="20" r="2.5" fill="url(#logoGradient)" />
            </svg>
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#1F2937' }}>CTOS</h1>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                {{
                  zangabil: 'Zangabil',
                  awatad: 'Awatad Development',
                  al_araba: 'Al Araba Alhaditha',
                  al_kowa: 'Al Kowa Alhandasiya',
                }[localStorage.getItem('selected_company_code') || ''] || 'ERP System'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {visibleLinks.map((link) => {
            const isActive = location.pathname === link.path;
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all"
                style={{
                  backgroundColor: isActive ? '#EEF2FF' : 'transparent',
                  color: isActive ? '#4C5FD5' : '#6B7280',
                  fontWeight: isActive ? 600 : 500,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#F9FAFB';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <Icon size={20} strokeWidth={2} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div ref={menuRef} className="p-4 border-t relative" style={{ borderColor: '#E5E7EB' }}>
          {/* Dropdown Menu */}
          {showUserMenu && (
            <div
              className="absolute bottom-full left-4 right-4 mb-2 rounded-lg overflow-hidden"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #E5E7EB',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              }}
            >
              <div className="py-1">
                  <Link
                    to="/settings"
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors"
                    style={{ color: '#6B7280' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Settings size={18} />
                    Settings
                  </Link>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    auth.logout();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors"
                  style={{ color: '#6B7280' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F9FAFB';
                    e.currentTarget.style.color = '#EF4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#6B7280';
                  }}
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            </div>
          )}

          {/* User Info Button */}
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center gap-3 p-2 rounded-xl transition-all"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F9FAFB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)', color: 'white' }}
            >
              {auth.user?.username ? getInitials(auth.user.username) : 'U'}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium truncate" style={{ color: '#1F2937' }}>
                {auth.user?.username}
              </p>
              <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>
                {auth.user?.email}
              </p>
            </div>
            <ChevronDown
              size={16}
              style={{
                color: '#9CA3AF',
                transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
        {/* Footer for spacing */}
        <footer className="py-8" style={{ backgroundColor: '#F5F7FA' }}>
          <div className="max-w-[1400px] mx-auto px-6">
            <div className="text-center text-sm" style={{ color: '#9CA3AF' }}>
              © 2026 CTOS ERP System. All rights reserved.
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};
