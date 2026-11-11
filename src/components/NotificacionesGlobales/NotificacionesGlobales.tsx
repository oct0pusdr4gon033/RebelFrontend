import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { NotificacionDto } from '../../api/Dtos/Notificacion';
import { TipoNotificacion } from '../../api/Dtos/Notificacion';
import { useGlobalNotifications } from '../../hooks/useGlobalNotifications';
import { GoogleIcon } from '../GoogleIcon/GoogleIcon';
import './NotificacionesGlobales.css';

interface NotificacionesGlobalesProps {
  basePath: '/ejecutiva' | '/master' | '/gerente' | '/sysadmin' | '/admin';
  accent?: string;
}

interface NotificacionesGlobalesContentProps extends NotificacionesGlobalesProps {
  token: string | null;
}

function getRelatedPath(
  notification: NotificacionDto,
  basePath: NotificacionesGlobalesProps['basePath'],
): string | null {
  const relatedId = notification.idEntidadRelacionada;
  if (!relatedId || !Number.isInteger(relatedId) || relatedId < 1) return null;

  const entityType = notification.tipoEntidadRelacionada?.trim().toLowerCase();
  if (
    entityType === 'ticket' &&
    (basePath === '/ejecutiva' ||
      basePath === '/master' ||
      basePath === '/sysadmin' ||
      basePath === '/admin')
  ) {
    return `${basePath}/tickets/${relatedId}`;
  }
  if (
    entityType === 'solicitud' &&
    (basePath === '/ejecutiva' || basePath === '/master' || basePath === '/gerente')
  ) {
    return `${basePath}/solicitudes/${relatedId}`;
  }
  return null;
}

function formatNotificationDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  }).format(date);
}

function getConnectionLabel(state: string): string | null {
  if (state === 'connecting' || state === 'reconnecting') return 'Conectando en tiempo real…';
  if (state === 'disconnected' || state === 'error') return 'Sin conexión en tiempo real';
  return null;
}

export default function NotificacionesGlobales({
  basePath,
  accent = '#2563eb',
}: NotificacionesGlobalesProps) {
  const { token } = useAuth();
  return (
    <NotificacionesGlobalesContent
      key={token ?? 'signed-out'}
      token={token}
      basePath={basePath}
      accent={accent}
    />
  );
}

function NotificacionesGlobalesContent({
  token,
  basePath,
  accent = '#2563eb',
}: NotificacionesGlobalesContentProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    notifications,
    unreadCount,
    hasMore,
    loading,
    loadingMore,
    error,
    connectionState,
    loadMore,
    markRead,
    markAllRead,
  } = useGlobalNotifications(token);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleNotificationClick = async (notification: NotificacionDto) => {
    setActionError(null);
    try {
      await markRead(notification);
      const path = getRelatedPath(notification, basePath);
      setOpen(false);
      if (path) navigate(path);
    } catch (reason) {
      setActionError(
        reason instanceof Error
          ? reason.message
          : 'No se pudo actualizar la notificación.',
      );
    }
  };

  const handleMarkAllRead = async () => {
    setActionError(null);
    try {
      await markAllRead();
    } catch (reason) {
      setActionError(
        reason instanceof Error
          ? reason.message
          : 'No se pudieron marcar todas como leídas.',
      );
    }
  };

  const connectionLabel = getConnectionLabel(connectionState);

  return (
    <div className="global-notifications" ref={containerRef}>
      <button
        type="button"
        className="global-notifications__trigger"
        onClick={() => setOpen((current) => !current)}
        aria-label={`Notificaciones: ${unreadCount} sin leer`}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Notificaciones"
        style={{ '--notification-accent': accent } as CSSProperties}
      >
        <GoogleIcon
          name="notifications"
          size={22}
          color={unreadCount > 0 ? accent : '#64748b'}
        />
        {unreadCount > 0 && (
          <span className="global-notifications__badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          className="global-notifications__panel"
          role="dialog"
          aria-label="Notificaciones globales"
        >
          <header className="global-notifications__header">
            <div>
              <strong>Notificaciones</strong>
              <span>{unreadCount} sin leer</span>
            </div>
            <button
              type="button"
              className="global-notifications__mark-all"
              onClick={() => void handleMarkAllRead()}
              disabled={unreadCount === 0 || loading}
            >
              Marcar todas como leídas
            </button>
          </header>

          {connectionLabel && (
            <p className="global-notifications__connection" role="status">
              <span className="global-notifications__connection-dot" />
              {connectionLabel}; se recuperarán por REST al reconectar.
            </p>
          )}

          {(error || actionError) && (
            <p className="global-notifications__error" role="alert">
              {actionError ?? error}
            </p>
          )}

          {loading && notifications.length === 0 ? (
            <p className="global-notifications__state" role="status">
              Cargando notificaciones…
            </p>
          ) : error && notifications.length === 0 ? (
            <p className="global-notifications__state" role="status">
              No fue posible cargar el listado.
            </p>
          ) : notifications.length === 0 ? (
            <div className="global-notifications__state">
              <GoogleIcon name="notifications" size={24} color="#94a3b8" />
              <span>No tienes notificaciones.</span>
            </div>
          ) : (
            <ul className="global-notifications__list">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    className={`global-notifications__item${notification.leida ? ' is-read' : ' is-unread'}`}
                    onClick={() => void handleNotificationClick(notification)}
                  >
                    {notification.tipo === TipoNotificacion.TicketEnAtencion ? (
                      <GoogleIcon
                        name="support_agent"
                        size={18}
                        color="#2563eb"
                        className="global-notifications__item-type-icon"
                      />
                    ) : (
                      <span className="global-notifications__item-indicator" />
                    )}
                    <span className="global-notifications__item-content">
                      <strong>{notification.titulo}</strong>
                      <span>{notification.mensaje}</span>
                      <time dateTime={notification.fechaCreacion}>
                        {formatNotificationDate(notification.fechaCreacion)}
                      </time>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {hasMore && (
            <footer className="global-notifications__footer">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
              >
                {loadingMore ? 'Cargando…' : 'Cargar más'}
              </button>
            </footer>
          )}
        </section>
      )}
    </div>
  );
}
