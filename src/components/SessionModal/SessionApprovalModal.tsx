import React, { useState, useEffect } from 'react';
import type { SessionAlert } from '../../api/Dtos/Login';
import { formatFechaHoraPeru } from '../../utils/dateUtils';
import './SessionApprovalModal.css';

interface SessionApprovalModalProps {
  alert: SessionAlert | null;
  terminatedReason: string | null;
  isResolving: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDismissTerminated?: () => void;
}

export const SessionApprovalModal: React.FC<SessionApprovalModalProps> = ({
  alert,
  terminatedReason,
  isResolving,
  onApprove,
  onReject,
  onDismissTerminated,
}) => {
  const [timeLeft, setTimeLeft] = useState(45);

  // Contador regresivo de 45 segundos mientras la alerta está activa
  useEffect(() => {
    if (!alert) {
      setTimeLeft(45);
      return;
    }

    setTimeLeft(45);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onReject(); // Auto-rechazo al expirar el tiempo para proteger la cuenta
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [alert, onReject]);

  // Si la sesión fue finalizada por autorización en otro dispositivo
  if (terminatedReason) {
    return (
      <div className="session-modal-overlay">
        <div className="session-modal-card session-terminated-card">
          <div className="session-modal-header">
            <div className="session-modal-pulse-wrap">
              <div className="session-modal-icon-badge session-terminated-badge">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
            </div>
            <h3 className="session-modal-title">Sesión Cerrada</h3>
            <p className="session-modal-subtitle">Control de Seguridad de Cuentas</p>
          </div>
          <div className="session-modal-body">
            <p className="session-modal-desc">
              {terminatedReason}
            </p>
            <div className="session-modal-warning-tag" style={{ marginBottom: '22px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>Por políticas de seguridad, solo se permite un dispositivo activo por ejecutiva.</span>
            </div>

            <button
              type="button"
              id="btn-session-return-home"
              className="session-btn session-btn--primary"
              onClick={() => {
                if (onDismissTerminated) {
                  onDismissTerminated();
                } else {
                  window.location.href = '/login';
                }
              }}
              style={{ width: '100%', padding: '14px 20px', fontSize: '1rem', cursor: 'pointer' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Si hay un intento de inicio de sesión pendiente que requiere confirmación [Sí / No]
  if (!alert) return null;

  return (
    <div className="session-modal-overlay">
      <div className="session-modal-card">
        <div className="session-modal-header">
          {/* Badge pulsante idéntico al panel de espera de LoginPage */}
          <div className="session-modal-pulse-wrap">
            <div className="session-modal-pulse-ring" />
            <div className="session-modal-icon-badge">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
          </div>

          <h3 className="session-modal-title">Autorización Requerida</h3>
          <p className="session-modal-subtitle">
            Se ha detectado un intento de inicio de sesión con tus credenciales desde otro equipo:
          </p>
        </div>

        <div className="session-modal-body">
          {/* Tarjeta de detalles */}
          <div className="session-modal-details-box">
            <div className="session-detail-row">
              <span className="session-detail-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                Dispositivo solicitante:
              </span>
              <span className="session-detail-value">{alert.deviceName || 'Navegador Web'}</span>
            </div>

            <div className="session-detail-row">
              <span className="session-detail-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                </svg>
                Dirección IP:
              </span>
              <span className="session-detail-value" style={{ fontFamily: 'monospace' }}>
                {alert.ipAddress || 'Red local'}
              </span>
            </div>

            <div className="session-detail-row">
              <span className="session-detail-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Hora del intento:
              </span>
              <span className="session-detail-value">
                {alert.timestamp ? formatFechaHoraPeru(alert.timestamp) : 'Justo ahora'}
              </span>
            </div>
          </div>

          {/* Barra de tiempo regresivo */}
          <div className="session-modal-timer-bar">
            <div className="session-timer-text">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Tiempo restante para responder:</span>
              </div>
              <strong>{timeLeft}s</strong>
            </div>
            <div className="session-progress-bg">
              <div
                className="session-progress-fill"
                style={{ width: `${(timeLeft / 45) * 100}%` }}
              />
            </div>
          </div>

          {/* Advertencia de transferencia */}
          <div className="session-modal-warning-tag">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              <strong>Importante:</strong> Si presionas <strong>"Sí, Autorizar"</strong>, tu sesión en este dispositivo se cerrará de inmediato para transferirla al nuevo equipo.
            </span>
          </div>
        </div>

        {/* Acciones */}
        <div className="session-modal-actions">
          <button
            type="button"
            className="session-btn session-btn--reject"
            onClick={onReject}
            disabled={isResolving}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            {isResolving ? 'Procesando...' : 'No, Rechazar'}
          </button>

          <button
            type="button"
            className="session-btn session-btn--approve"
            onClick={onApprove}
            disabled={isResolving}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {isResolving ? 'Procesando...' : 'Sí, Autorizar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionApprovalModal;
