import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { SolicitudResponse } from '../../api/Dtos/Solicitud';
import {
  ETIQUETAS_ESTADO_SOLICITUD,
  ETIQUETAS_TIPO_SOLICITUD,
} from '../../api/Dtos/Solicitud';
import { obtenerSolicitudes } from '../../api/services/solicitud.service';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import Swal from 'sweetalert2';
import '../DashboardLayout.css';
import './Solicitudes.css';
import SolicitudResolucionActions from './components/SolicitudResolucionActions';
import { SolicitudEvidenciaBadge } from './components/SolicitudEvidencia';

interface GerenteSolicitudesPageProps {
  mode: 'pendientes' | 'historial';
}

function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  }).format(date);
}

export default function GerenteSolicitudesPage({ mode }: GerenteSolicitudesPageProps) {
  const location = useLocation();
  const [solicitudes, setSolicitudes] = useState<SolicitudResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSolicitudes = useCallback(async (): Promise<boolean> => {
    try {
      setSolicitudes(await obtenerSolicitudes());
      setError(null);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron consultar las solicitudes.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    obtenerSolicitudes()
      .then((data) => {
        if (active) {
          setSolicitudes(data);
          setError(null);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setSolicitudes([]);
          setError(reason instanceof Error ? reason.message : 'No se pudieron consultar las solicitudes.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleSolicitudes = useMemo(() => {
    const filtered = solicitudes.filter((solicitud) =>
      mode === 'pendientes'
        ? solicitud.estado === 0
        : solicitud.estado === 1 || solicitud.estado === 2 || solicitud.estado === 3,
    );
    return filtered.sort((a, b) => b.fechaSolicitud.localeCompare(a.fechaSolicitud));
  }, [mode, solicitudes]);

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    void loadSolicitudes();
  };

  const handleResolved = async () => {
    const refreshed = await loadSolicitudes();
    if (!refreshed) {
      await Swal.fire({
        icon: 'warning',
        title: 'Solicitud resuelta',
        text: 'El servidor confirmó la resolución, pero no se pudo actualizar la lista. Intenta recargarla.',
        confirmButtonColor: '#2563eb',
      });
    }
  };

  const heading = mode === 'pendientes' ? 'Solicitudes pendientes' : 'Historial de solicitudes';
  const emptyTitle = mode === 'pendientes'
    ? 'No hay solicitudes pendientes'
    : 'Aún no hay solicitudes resueltas';

  return (
    <div className="solicitudes-page">
      <header className="solicitudes-header">
        <div>
          <div className="solicitudes-eyebrow">
            <GoogleIcon name={mode === 'pendientes' ? 'pending_actions' : 'history'} size={18} color="#2563eb" />
            Gestión de solicitudes
          </div>
          <h1>{heading}</h1>
          <p>
            {mode === 'pendientes'
              ? 'Revisa las solicitudes que esperan resolución.'
              : 'Consulta las solicitudes observadas y las que ya fueron resueltas.'}
          </p>
        </div>
        <button
          type="button"
          className="solicitudes-secondary-button"
          onClick={handleRefresh}
          disabled={loading}
        >
          <GoogleIcon name="refresh" size={18} color="#2563eb" />
          Actualizar
        </button>
      </header>

      {error && (
        <div className="solicitudes-alert solicitudes-alert--error" role="alert">
          <GoogleIcon name="error" size={20} color="#dc2626" />
          <span>{error}</span>
          <button type="button" className="solicitudes-text-button" onClick={handleRefresh}>
            Reintentar
          </button>
        </div>
      )}

      {loading && (
        <div className="solicitudes-state" role="status">
          <span className="solicitudes-spinner" aria-hidden="true" />
          <p>Cargando solicitudes...</p>
        </div>
      )}

      {!loading && !error && visibleSolicitudes.length === 0 && (
        <section className="solicitudes-empty">
          <GoogleIcon name="inbox" size={34} color="#64748b" />
          <h2>{emptyTitle}</h2>
          <p>
            {mode === 'pendientes'
              ? 'Las nuevas solicitudes pendientes aparecerán aquí.'
              : 'Las solicitudes observadas, aprobadas y rechazadas aparecerán aquí.'}
          </p>
        </section>
      )}

      {!loading && visibleSolicitudes.length > 0 && (
        <section className="solicitudes-list" aria-label={heading}>
          {visibleSolicitudes.map((solicitud) => (
            <article
              className={`solicitud-card solicitud-card--manager solicitud-card--state-${solicitud.estado}`}
              key={solicitud.id}
            >
              <div className="solicitud-card__main">
                <div className="solicitud-card__meta">
                  <span>{ETIQUETAS_TIPO_SOLICITUD[solicitud.tipo]}</span>
                  {solicitud.tieneEvidencia && <SolicitudEvidenciaBadge />}
                  <span className={`solicitud-status solicitud-status--${solicitud.estado}`}>
                    {ETIQUETAS_ESTADO_SOLICITUD[solicitud.estado]}
                  </span>
                </div>
                <h2>{solicitud.titulo}</h2>
                <dl className="solicitud-card__manager-fields">
                  <div><dt>Empleado</dt><dd>{solicitud.empleadoNombre || 'No especificado'}</dd></div>
                  <div><dt>Sede</dt><dd>{solicitud.sedeId ? `Sede ${solicitud.sedeId}` : 'No especificada'}</dd></div>
                  <div><dt>Fechas</dt><dd>{formatDate(solicitud.fechaInicio)} – {formatDate(solicitud.fechaFin)}</dd></div>
                  <div>
                    <dt>
                      {mode === 'historial' && solicitud.estado !== 3 ? 'Resuelta' : 'Solicitada'}
                    </dt>
                    <dd>
                      {formatDateTime(
                        mode === 'historial' && solicitud.estado !== 3
                          ? solicitud.fechaResolucion
                          : solicitud.fechaSolicitud,
                      )}
                    </dd>
                  </div>
                </dl>
                <div className="solicitud-card__manager-actions">
                  <Link
                    className="solicitudes-secondary-button"
                    to={`/gerente/solicitudes/${solicitud.id}`}
                    state={{ from: location.pathname }}
                  >
                    <GoogleIcon name="visibility" size={18} color="#2563eb" />
                    Ver detalle
                  </Link>
                  {mode === 'pendientes' && (
                    <SolicitudResolucionActions
                      solicitudId={solicitud.id}
                      onResolved={handleResolved}
                    />
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
