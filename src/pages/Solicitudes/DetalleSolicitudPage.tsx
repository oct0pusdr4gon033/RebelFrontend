import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { SolicitudResponse } from '../../api/Dtos/Solicitud';
import { ETIQUETAS_ESTADO_SOLICITUD, ETIQUETAS_TIPO_SOLICITUD } from '../../api/Dtos/Solicitud';
import {
  descargarEvidenciaMiSolicitud,
  descargarEvidenciaMiSolicitudPorId,
  obtenerHistorialMiSolicitud,
  obtenerMiSolicitudPorId,
} from '../../api/services/solicitud.service';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import '../DashboardLayout.css';
import './Solicitudes.css';
import SolicitudEvidencia from './components/SolicitudEvidencia';
import SolicitudHistorial from './components/SolicitudHistorial';
import SolicitudSubsanacionForm from './components/SolicitudSubsanacionForm';

interface DetalleSolicitudPageProps {
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

function formatDateTime(value: string | null): string {
  if (!value) return 'Aún no resuelta';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  }).format(date);
}

export default function DetalleSolicitudPage({ basePath }: DetalleSolicitudPageProps) {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const validId = Number.isInteger(id) && id > 0;
  const requestSequence = useRef(0);
  const [solicitud, setSolicitud] = useState<SolicitudResponse | null>(null);
  const [loading, setLoading] = useState(validId);
  const [error, setError] = useState<string | null>(null);
  const [historial, setHistorial] = useState<Awaited<ReturnType<typeof obtenerHistorialMiSolicitud>>>([]);
  const [historialLoading, setHistorialLoading] = useState(validId);
  const [historialError, setHistorialError] = useState<string | null>(null);

  const loadWorkflow = useCallback(async () => {
    if (!validId) return;
    const sequence = ++requestSequence.current;
    const [solicitudResult, historialResult] = await Promise.allSettled([
      obtenerMiSolicitudPorId(id),
      obtenerHistorialMiSolicitud(id),
    ]);
    if (sequence !== requestSequence.current) return;

    if (solicitudResult.status === 'fulfilled') {
      setSolicitud(solicitudResult.value);
      setError(null);
    } else {
      setSolicitud(null);
      setError(
        solicitudResult.reason instanceof Error
          ? solicitudResult.reason.message
          : 'No se pudo consultar la solicitud.',
      );
    }

    if (historialResult.status === 'fulfilled') {
      setHistorial(historialResult.value);
      setHistorialError(null);
    } else {
      setHistorial([]);
      setHistorialError(
        historialResult.reason instanceof Error
          ? historialResult.reason.message
          : 'No se pudo consultar el historial de la solicitud.',
      );
    }
    setLoading(false);
    setHistorialLoading(false);
  }, [id, validId]);

  useEffect(() => {
    void loadWorkflow();
    return () => {
      requestSequence.current += 1;
    };
  }, [loadWorkflow]);

  const displayedError = validId ? error : 'El identificador de la solicitud no es válido.';
  const initialEvidenceIds = new Set(
    historial
      .filter((evento) => evento.accion === 0)
      .flatMap((evento) => evento.evidencias?.map((evidencia) => evidencia.id) ?? []),
  );
  const evidenciasOriginales = solicitud?.evidencias?.filter(
    (evidencia) =>
      evidencia.historialId === null ||
      initialEvidenceIds.has(evidencia.id),
  );
  const handleRefresh = () => {
    setLoading(true);
    setHistorialLoading(true);
    setError(null);
    setHistorialError(null);
    void loadWorkflow();
  };

  return (
    <div className="solicitudes-page">
      <header className="solicitudes-header">
        <div>
          <div className="solicitudes-eyebrow">
            <GoogleIcon name="assignment" size={18} color="#2563eb" />
            Solicitudes
          </div>
          <h1>Detalle de solicitud</h1>
          <p>Consulta la información y el estado de tu solicitud.</p>
        </div>
        <Link className="solicitudes-secondary-button" to={`${basePath}/solicitudes`}>
          <GoogleIcon name="arrow_back" size={18} color="#2563eb" />
          Mis solicitudes
        </Link>
      </header>

      {loading && (
        <div className="solicitudes-state" role="status">
          <span className="solicitudes-spinner" aria-hidden="true" />
          <p>Cargando detalle...</p>
        </div>
      )}

      {!loading && displayedError && (
        <div className="solicitudes-alert solicitudes-alert--error" role="alert">
          <GoogleIcon name="error" size={20} color="#dc2626" />
          <span>{displayedError}</span>
          {validId && (
            <button type="button" className="solicitudes-text-button" onClick={handleRefresh}>
              Reintentar
            </button>
          )}
        </div>
      )}

      {!loading && solicitud && (
        <article className="solicitud-detail">
          <div className="solicitud-detail__heading">
            <div>
              <span>{ETIQUETAS_TIPO_SOLICITUD[solicitud.tipo]}</span>
              <h2>{solicitud.titulo}</h2>
            </div>
            <span className={`solicitud-status solicitud-status--${solicitud.estado}`}>
              {ETIQUETAS_ESTADO_SOLICITUD[solicitud.estado]}
            </span>
          </div>

          <dl className="solicitud-detail__grid">
            <div>
              <dt>Empleado</dt>
              <dd>{solicitud.empleadoNombre || 'No especificado'}</dd>
            </div>
            <div>
              <dt>Sede</dt>
              <dd>{solicitud.sedeId ? `Sede ${solicitud.sedeId}` : 'No especificada'}</dd>
            </div>
            <div>
              <dt>Fecha de inicio</dt>
              <dd>{formatDate(solicitud.fechaInicio)}</dd>
            </div>
            <div>
              <dt>Fecha de fin</dt>
              <dd>{formatDate(solicitud.fechaFin)}</dd>
            </div>
            <div>
              <dt>Fecha de solicitud</dt>
              <dd>{formatDateTime(solicitud.fechaSolicitud)}</dd>
            </div>
            <div>
              <dt>Fecha de resolución</dt>
              <dd>{formatDateTime(solicitud.fechaResolucion)}</dd>
            </div>
            <div className="solicitud-detail__full">
              <dt>Descripción</dt>
              <dd className="solicitud-detail__text">{solicitud.descripcion || 'Sin descripción'}</dd>
            </div>
            <div className="solicitud-detail__full">
              <dt>Evidencias originales</dt>
              <dd>
                <SolicitudEvidencia
                  solicitudId={solicitud.id}
                  tieneEvidencia={solicitud.tieneEvidencia}
                  nombreArchivo={solicitud.evidenciaNombreArchivo}
                  contentType={solicitud.evidenciaContentType}
                  tamanoBytes={solicitud.evidenciaTamanoBytes}
                  descargar={descargarEvidenciaMiSolicitud}
                  evidencias={evidenciasOriginales}
                  descargarPorId={descargarEvidenciaMiSolicitudPorId}
                  emptyLabel="Sin evidencia original adjunta"
                />
              </dd>
            </div>
            {solicitud.evidenciaReferencia && (
              <div className="solicitud-detail__full">
                <dt>Referencia (texto)</dt>
                <dd className="solicitud-detail__text">{solicitud.evidenciaReferencia}</dd>
              </div>
            )}
            <div className="solicitud-detail__full">
              <dt>Observación de resolución</dt>
              <dd className="solicitud-detail__text">
                {solicitud.observacionResolucion || 'Sin observación'}
              </dd>
            </div>
          </dl>

          {solicitud.estado === 3 && (
            <SolicitudSubsanacionForm
              solicitud={solicitud}
              onSubmitted={async () => {
                setLoading(true);
                setHistorialLoading(true);
                await loadWorkflow();
              }}
            />
          )}

          {(solicitud.estado === 1 || solicitud.estado === 2) && (
            <div className={`solicitud-final solicitud-final--${solicitud.estado}`} role="status">
              <GoogleIcon name="lock" size={20} />
              <span>Esta solicitud está finalizada. No admite modificaciones ni subsanaciones.</span>
            </div>
          )}

          <SolicitudHistorial
            solicitudId={solicitud.id}
            eventos={historial}
            loading={historialLoading}
            error={historialError}
            descargarEvidencia={descargarEvidenciaMiSolicitudPorId}
            onRetry={() => void loadWorkflow()}
          />
        </article>
      )}
    </div>
  );
}
