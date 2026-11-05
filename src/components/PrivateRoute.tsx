import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { ReactNode } from 'react';

interface PrivateRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
  exactRoles?: boolean;
}

export function PrivateRoute({ children, allowedRoles, exactRoles = false }: PrivateRouteProps) {
  const { isAuthenticated, empleado } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!empleado?.rolNombre) {
      return <Navigate to="/login" replace />;
    }

    const userRole = empleado.rolNombre.trim().toLowerCase();
    const hasRole = exactRoles
      ? allowedRoles.some((role) => role.trim().toLowerCase() === userRole)
      : allowedRoles.some((r) => {
        const allowed = r.trim().toLowerCase();
        if (userRole === allowed) return true;
        if (allowed.includes('master') && userRole.includes('master')) return true;
        if (
          (allowed.includes('ejecutiv') || allowed.includes('venta')) &&
          !allowed.includes('master') &&
          (userRole.includes('ejecutiv') || userRole.includes('venta')) &&
          !userRole.includes('master')
        ) return true;
        if (allowed.includes('sysadmin') && userRole.includes('sysadmin')) return true;
        if (
          allowed.includes('admin') &&
          !allowed.includes('sysadmin') &&
          userRole.includes('admin') &&
          !userRole.includes('sysadmin')
        ) return true;
        return false;
      });

    if (!hasRole) {
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}
