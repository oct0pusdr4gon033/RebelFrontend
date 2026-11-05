import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface TecnicoRouteProps {
  fallbackPath: string;
}

export default function TecnicoRoute({ fallbackPath }: TecnicoRouteProps) {
  const { isAuthenticated, empleado } = useAuth();

  if (!isAuthenticated || !empleado?.puedeAtenderTickets) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <Outlet />;
}
