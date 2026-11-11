import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SolicitudResponse } from '../../api/Dtos/Solicitud';
import { ETIQUETAS_ESTADO_SOLICITUD, ETIQUETAS_TIPO_SOLICITUD } from '../../api/Dtos/Solicitud';
import { obtenerMisSolicitudes } from '../../api/services/solicitud.service';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import '../DashboardLayout.css';
import './Solicitudes.css';
import { SolicitudEvidenciaBadge } from './components/SolicitudEvidencia';

interface MisSolicitudesPageProps {
  basePath: string;
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

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  }).format(date);
}

export default function MisSolicitudesPage({ basePath }: MisSolicitudesPageProps) {
  const [solicitudes, setSolicitudes] = useState<SolicitudResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSolicitudes = useCallback(async () => {
    try {
      const data = await obtenerMisSolicitudes();
      setSolicitudes(data);
      setError(null);
    } catch (reason) {
      setSolicitudes([]);
      setError(reason instanceof Error ? reason.message : 'No se pudieron consultar tus solicitudes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    obtenerMisSolicitudes()
      .then((data) => {
        if (!active) return;
        setSolicitudes(data);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setSolicitudes([]);
        setError(reason instanceof Error ? reason.message : 'No se pudieron consultar tus solicitudes.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    void loadSolicitudes();
  };

  return (
    <div className="solicitudes-page">
      <header className="solicitudes-header">
        <div>
          <div className="solicitudes-eyebrow">
            <GoogleIcon name="assignment" size={18} color="#2563eb" />
            Solicitudes
          </div>
          <h1>Mis solicitudes</h1>
          <p>Consulta el estado de tus solicitudes o registra una nueva.</p>
        </div>
        <Link className="solicitudes-primary-button" to={`${basePath}/solicitudes/nueva`}>
          <GoogleIcon name="add" size={18} color="#fff" />
          Nueva solicitud
        </Link>
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

      {!loading && !error && solicitudes.length === 0 && (
        <section className="solicitudes-empty">
          <GoogleIcon name="inbox" size={34} color="#64748b" />
          <h2>Aún no tienes solicitudes</h2>
          <p>Cuando registres una solicitud, podrás consultar aquí su estado y detalle.</p>
        </section>
      )}

      {!loading && solicitudes.length > 0 && (
        <section className="solicitudes-list" aria-label="Listado de mis solicitudes">
          {solicitudes.map((solicitud) => (
            <Link
              className="solicitud-card"
              to={`${basePath}/solicitudes/${solicitud.id}`}
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
                <p className="solicitud-card__dates">
                  {formatDate(solicitud.fechaInicio)} – {formatDate(solicitud.fechaFin)}
                </p>
                <p className="solicitud-card__created">
                  Registrada: {formatDateTime(solicitud.fechaSolicitud)}
                </p>
              </div>
              <GoogleIcon name="chevron_right" size={22} color="#64748b" />
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
