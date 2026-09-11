import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { Loading } from './Loading';

// Frontend route guarding is purely UX (hide pages a role can't use, avoid a
// confusing "loads then 403s" flash). The backend enforces every permission
// independently via requireRole middleware — this component is NOT the
// security boundary, it just matches it. See docs/architecture.md.
export function ProtectedRoute({ allowedRoles }: { allowedRoles?: Role[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Loading label="Checking session..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
