import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface TicketRoleRouteProps {
  roles: readonly string[];
}

export default function TicketRoleRoute({ roles }: TicketRoleRouteProps) {
  const { isAuthenticated, empleado } = useAuth();
  const actualRole = empleado?.rolNombre?.trim().toLowerCase();
  const hasRole = actualRole !== undefined
    && roles.some((role) => role.trim().toLowerCase() === actualRole);

  if (!isAuthenticated || !hasRole) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
