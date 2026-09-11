import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersListPage } from './pages/customers/CustomersListPage';
import { CustomerFormPage } from './pages/customers/CustomerFormPage';
import { CustomerDetailPage } from './pages/customers/CustomerDetailPage';
import { ProductsListPage } from './pages/products/ProductsListPage';
import { ProductFormPage } from './pages/products/ProductFormPage';
import { ProductDetailPage } from './pages/products/ProductDetailPage';
import { ChallansListPage } from './pages/challans/ChallansListPage';
import { ChallanFormPage } from './pages/challans/ChallanFormPage';
import { ChallanDetailPage } from './pages/challans/ChallanDetailPage';
import { ProfilePage } from './pages/ProfilePage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS']} />}>
            <Route path="/customers" element={<CustomersListPage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SALES']} />}>
            <Route path="/customers/new" element={<CustomerFormPage />} />
          </Route>

          <Route path="/products" element={<ProductsListPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE']} />}>
            <Route path="/products/new" element={<ProductFormPage />} />
          </Route>

          <Route path="/challans" element={<ChallansListPage />} />
          <Route path="/challans/:id" element={<ChallanDetailPage />} />
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SALES']} />}>
            <Route path="/challans/new" element={<ChallanFormPage />} />
          </Route>

          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
