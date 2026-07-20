import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ToastProvider } from '../components/Toast';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AppLayout } from '../components/AppLayout';
import { Login } from '../pages/Login';
import { Unauthorized } from '../pages/Unauthorized';
import { Placeholder } from '../pages/Placeholder';
import { DashboardPage } from '../pages/DashboardPage';
import { RequestsPage } from '../pages/RequestsPage';
import { NewRequestPage } from '../pages/NewRequestPage';
import { RequestDetailPage } from '../pages/RequestDetailPage';
import { EditRequestPage } from '../pages/EditRequestPage';
import { ClientsPage } from '../pages/ClientsPage';
import { ClientDetailPage } from '../pages/ClientDetailPage';
import { SuppliersPage } from '../pages/SuppliersPage';
import { SupplierDetailPage } from '../pages/SupplierDetailPage';
import { UsersPage } from '../pages/UsersPage';
import { RolesPage } from '../pages/RolesPage';
import { SettingsPage } from '../pages/SettingsPage';
import { SystemSettingsPage } from '../pages/SystemSettingsPage';
import { SelectCompanyPage } from '../pages/SelectCompanyPage';
import { QuotationDetailPage } from '../pages/QuotationDetailPage';
import { OfferVersionPage } from '../pages/OfferVersionPage';
import { OffersPage } from '../pages/OffersPage';
import { PurchaseOrderPage } from '../pages/PurchaseOrderPage';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBoundary } from '../components/ErrorBoundary';

function AppRoutes() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/select-company" element={<SelectCompanyPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="requests/new" element={<NewRequestPage />} />
        <Route path="requests/:id" element={<RequestDetailPage />} />
        <Route path="requests/:id/edit" element={<EditRequestPage />} />
        <Route path="offers" element={<OffersPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:id" element={<ClientDetailPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="suppliers/:id" element={<SupplierDetailPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/system" element={<SystemSettingsPage />} />
        <Route path="rfqs" element={<Placeholder title="RFQs" phase="Phase 3" />} />
        <Route path="quotations" element={<Placeholder title="Quotations" phase="Phase 3" />} />
        <Route path="quotations/:id" element={<QuotationDetailPage />} />
        <Route path="offers/versions/:versionId" element={<OfferVersionPage />} />
        <Route path="purchase-orders" element={<Placeholder title="Purchase Orders" phase="Phase 5" />} />
        <Route path="purchase-orders/:poId" element={<PurchaseOrderPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="roles" element={<RolesPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}