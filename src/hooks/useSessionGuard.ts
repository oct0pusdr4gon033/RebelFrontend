import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sessionHubService } from '../services/sessionHubService';
import { resolveSessionAttemptApi } from '../api/services/auth.service';
import type { SessionAlert } from '../api/Dtos/Login';

export function useSessionGuard() {
  const { token, empleado, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingAlert, setPendingAlert] = useState<SessionAlert | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [terminatedReason, setTerminatedReason] = useState<string | null>(null);

  const isLoginPage = location.pathname === '/login';

  useEffect(() => {
    // Si no está autenticado, no tiene userId o se encuentra en la pantalla de /login:
    // Desconectar inmediatamente de SignalR para no registrarse como sesión activa
    if (!isAuthenticated || !empleado?.userId || isLoginPage) {
      sessionHubService.disconnect();
      setPendingAlert(null);
      return;
    }

    // Conectar a SignalR para monitorear intentos de sesión concurrentes
    sessionHubService.connect(empleado.userId, token);

    // Escuchar intentos de login en otros dispositivos
    const unsubAttempt = sessionHubService.onLoginAttempt((alert) => {
      console.warn('🚨 [useSessionGuard] Alerta de intento de login recibida:', alert);
      setPendingAlert(alert);
    });

    // Escuchar si esta sesión fue cerrada porque se autorizó en otro dispositivo
    const unsubTerminated = sessionHubService.onSessionTerminated((reason) => {
      console.warn('🛑 [useSessionGuard] Sesión finalizada:', reason);
      setTerminatedReason(reason);
      sessionHubService.disconnect();
    });

    return () => {
      unsubAttempt();
      unsubTerminated();
    };
  }, [isAuthenticated, empleado?.userId, token, isLoginPage]);

  const handleApprove = useCallback(async () => {
    if (!pendingAlert) return;
    setIsResolving(true);
    try {
      await resolveSessionAttemptApi(pendingAlert.attemptId, true);
      setPendingAlert(null);
      logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Error al aprobar intento de sesión:', err);
    } finally {
      setIsResolving(false);
    }
  }, [pendingAlert, logout, navigate]);

  const handleReject = useCallback(async () => {
    if (!pendingAlert) return;
    setIsResolving(true);
    try {
      await resolveSessionAttemptApi(pendingAlert.attemptId, false);
      setPendingAlert(null);
    } catch (err) {
      console.error('Error al rechazar intento de sesión:', err);
    } finally {
      setIsResolving(false);
    }
  }, [pendingAlert]);

  const handleDismissTerminated = useCallback(() => {
    setTerminatedReason(null);
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  return {
    pendingAlert,
    isResolving,
    terminatedReason,
    handleApprove,
    handleReject,
    handleDismissTerminated,
  };
}

export default useSessionGuard;
