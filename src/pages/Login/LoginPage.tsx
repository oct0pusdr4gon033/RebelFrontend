import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  loginApi,
  checkSessionAttemptApi
} from '../../api/services/auth.service';
import { useAuth } from '../../context/AuthContext';

import './LoginPage.css';

const ROLE_ROUTES: Record<string, string> = {
  'SysAdmin': '/sysadmin',
  'Administrador': '/admin',
  'Ejecutivo(a) Master Ventas': '/master',
  'Ejecutivo(a) Ventas': '/ejecutiva',
};

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados para control de concurrencia y autorización de sesión
  const [pendingAttemptId, setPendingAttemptId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(45);

  // Polling mientras se espera aprobación del dispositivo activo
  useEffect(() => {
    if (!pendingAttemptId) return;

    const timerInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const pollInterval = setInterval(async () => {
      try {
        const res = await checkSessionAttemptApi(pendingAttemptId);
        if (res.status === 'Approved') {
          const authData = (res.data ?? res) as unknown as { token?: string; empleado?: any };
          const token = authData?.token;
          const empleado = authData?.empleado;

          if (token && empleado) {
            clearInterval(pollInterval);
            clearInterval(timerInterval);
            login(token, empleado);
            const rol = empleado.rolNombre ?? '';
            const route = ROLE_ROUTES[rol] ?? '/login';
            navigate(route, { replace: true });
          }
        } else if (res.status === 'Rejected') {
          clearInterval(pollInterval);
          clearInterval(timerInterval);
          setPendingAttemptId(null);
          setError('El acceso fue rechazado desde el dispositivo donde tienes la sesión abierta.');
        } else if (res.status === 'Expired') {
          clearInterval(pollInterval);
          clearInterval(timerInterval);
          setPendingAttemptId(null);
          setError('La solicitud de autorización ha expirado.');
        }
      } catch (err) {
        console.error('Error al consultar estado de sesión:', err);
      }
    }, 1500);

    return () => {
      clearInterval(pollInterval);
      clearInterval(timerInterval);
    };
  }, [pendingAttemptId, login, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await loginApi({ email, password });

      // Si el backend detectó sesión activa en otro dispositivo
      if (response.requiresApproval && response.attemptId) {
        setPendingAttemptId(response.attemptId);
        setCountdown(45);
        return;
      }

      // Si no requiere aprobación, ingresar directamente
      const authData = (response.data ?? response) as unknown as { token?: string; empleado?: any };
      const token = authData?.token;
      const empleado = authData?.empleado;

      if (token && empleado) {
        login(token, empleado);
        const rol = empleado.rolNombre ?? '';
        const route = ROLE_ROUTES[rol] ?? '/login';
        navigate(route, { replace: true });
      } else {
        setError('No se pudieron obtener los datos de la sesión.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelWaiting = () => {
    setPendingAttemptId(null);
    setError('');
  };

  return (
      <div className="login-page">
        {/* Fondo animado */}
        <div className="login-bg">
          <div className="login-orb login-orb--1" />
          <div className="login-orb login-orb--2" />
          <div className="login-orb login-orb--3" />
        </div>

        <div className="login-card">
          {/* Logo / Brand */}
          <div className="login-brand">
            <div className="login-brand__icon">
              <img src="/logo.png" alt="Rebel Queen Logo" />
            </div>
            <div>
              <h1 className="login-brand__title">Sales Rebel</h1>
              <p className="login-brand__subtitle">Rebel Queen · Gestión de Ventas</p>
            </div>
          </div>

          <div className="login-divider" />

          {/* ── Si está esperando aprobación interactiva en otro dispositivo ── */}
          {pendingAttemptId ? (
            <div className="session-waiting-panel">
              <div className="session-waiting-icon-container">
                <div className="session-waiting-pulse" />
                <div className="session-waiting-badge">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
              </div>

              <div>
                <h3 className="session-waiting-heading">Autorización Requerida</h3>
                <p className="session-waiting-text">
                  Tu cuenta ya se encuentra abierta en otro dispositivo. Se ha enviado una solicitud interactiva a esa pantalla para confirmar tu ingreso.
                </p>
              </div>

              <div className="session-waiting-steps">
                <div className="session-waiting-step">
                  <span className="session-step-num">1</span>
                  <span>Mira la pantalla del dispositivo donde tienes abierta la sesión.</span>
                </div>
                <div className="session-waiting-step">
                  <span className="session-step-num">2</span>
                  <span>Aparecerá la alerta: <em>"¿Deseas autorizar este acceso? [Sí / No]"</em>.</span>
                </div>
                <div className="session-waiting-step">
                  <span className="session-step-num">3</span>
                  <span>Presiona <strong>"Sí, Autorizar"</strong> en ese equipo para permitir el acceso aquí.</span>
                </div>
              </div>

              <div className="session-waiting-timer">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Esperando autorización... ({countdown}s)</span>
              </div>

              <div className="session-waiting-actions">
                <button
                  type="button"
                  className="session-cancel-btn"
                  onClick={handleCancelWaiting}
                >
                  ← Cancelar y volver al formulario
                </button>
              </div>
            </div>
          ) : (
            /* ── Formulario de Login Normal ── */
            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div>
                <h3 className="login-form__heading">Iniciar Sesión</h3>
              </div>

              {error && (
                <div className="login-error" role="alert">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75 6.5a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                  </svg>
                  {error}
                </div>
              )}

              <div className="login-field">
                <label htmlFor="login-email" className="login-field__label">Correo electrónico</label>
                <div className="login-field__wrapper">
                  <svg className="login-field__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="3" />
                    <path d="M2 7l10 7 10-7" />
                  </svg>
                  <input
                    id="login-email"
                    type="email"
                    className="login-field__input"
                    placeholder="tu@rebelqueen.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="login-password" className="login-field__label">Contraseña</label>
                <div className="login-field__wrapper">
                  <svg className="login-field__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="login-field__input login-field__input--password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="login-field__eye"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                id="login-submit"
                type="submit"
                className="login-btn"
                disabled={loading}
              >
                {loading ? (
                  <span className="login-btn__spinner" />
                ) : (
                  <>
                    Ingresar
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="login-footer">
            <p>© 2025 Rebel Queen · Todos los derechos reservados</p>
          </div>
        </div>
      </div>
    );
}

export default LoginPage; 
