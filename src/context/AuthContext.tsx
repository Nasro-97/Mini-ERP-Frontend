import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../api/client';

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface User {
  id: string;
  username: string;
  fullname: string;
  email: string;
  roles: Role[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, companyCode: string) => Promise<User>;
  logout: () => void;
  isCOD: boolean;
  isSalesManager: boolean;
  isSalesSpecialist: boolean;
  isProcurementManager: boolean;
  isProcurementSpecialist: boolean;
  hasSalesAccess: boolean;
  hasProcurementAccess: boolean;
  hasRole: (roleName: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');

      if (token) {
        try {
          const userData = await apiClient.get<User>('/users/me');
          setUser(userData);
          setIsAuthenticated(true);
        } catch (error) {
          // Silently handle auth errors - just clear the invalid token
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          setUser(null);
          setIsAuthenticated(false);
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string, companyCode: string): Promise<User> => {
    try {
      const response = await apiClient.post<{ access_token: string; token_type: string }>('/auth/login', { email, password, company_code: companyCode });
      localStorage.setItem('access_token', response.access_token);

      const userData = await apiClient.get<User>('/users/me');
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);

      return userData;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  const hasRole = (roleName: string): boolean => {
    if (!user || !user.roles) return false;
    return user.roles.some(r => r.name === roleName);
  };

  const isCOD = hasRole('COD');
  const isSalesManager = hasRole('Sales Manager');
  const isSalesSpecialist = hasRole('Sales Specialist');
  const isProcurementManager = hasRole('Procurement Manager');
  const isProcurementSpecialist = hasRole('Procurement Specialist');

  const hasSalesAccess = isSalesSpecialist || isSalesManager || isCOD;
  const hasProcurementAccess = isProcurementManager || isProcurementSpecialist || isCOD;

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    isCOD,
    isSalesManager,
    isSalesSpecialist,
    isProcurementManager,
    isProcurementSpecialist,
    hasSalesAccess,
    hasProcurementAccess,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
