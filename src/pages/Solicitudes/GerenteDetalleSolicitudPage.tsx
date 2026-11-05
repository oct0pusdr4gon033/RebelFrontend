import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import type { SolicitudResponse } from '../../api/Dtos/Solicitud';
import {
  ETIQUETAS_ESTADO_SOLICITUD,
  ETIQUETAS_TIPO_SOLICITUD,
} from '../../api/Dtos/Solicitud';
import {
  descargarEvidenciaSolicitud,
  descargarEvidenciaSolicitudPorId,
  obtenerHistorialSolicitud,
  obtenerSolicitudes,
} from '../../api/services/solicitud.service';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import Swal from 'sweetalert2';
import '../DashboardLayout.css';
import './Solicitudes.css';
import SolicitudResolucionActions from './components/SolicitudResolucionActions';
import SolicitudEvidencia from './components/SolicitudEvidencia';
import SolicitudHistorial from './components/SolicitudHistorial';

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
  if (!value) return 'No disponible';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  }).format(date);
}

export default function GerenteDetalleSolicitudPage() {
  const { id: idParam } = useParams();
  const location = useLocation();
  const id = Number(idParam);
  const validId = Number.isInteger(id) && id > 0;
  const requestSequence = useRef(0);
  const [solicitud, setSolicitud] = useState<SolicitudResponse | null>(null);
  const [loading, setLoading] = useState(validId);
  const [error, setError] = useState<string | null>(null);
  const [historial, setHistorial] = useState<Awaited<ReturnType<typeof obtenerHistorialSolicitud>>>([]);
  const [historialLoading, setHistorialLoading] = useState(validId);
  const [historialError, setHistorialError] = useState<string | null>(null);

  const loadWorkflow = useCallback(async (): Promise<boolean> => {
    if (!validId) return false;
    const sequence = ++requestSequence.current;
    const [solicitudesResult, historialResult] = await Promise.allSettled([
      obtenerSolicitudes(),
      obtenerHistorialSolicitud(id),
    ]);
    if (sequence !== requestSequence.current) return false;

    let solicitudOk = false;
    if (solicitudesResult.status === 'fulfilled') {
      const found = solicitudesResult.value.find((item) => item.id === id);
      if (found) {
        setSolicitud(found);
        setError(null);
        solicitudOk = true;
      } else {
        setSolicitud(null);
        setError('No se encontró la solicitud en la lista disponible.');
      }
    } else {
      setError(
        solicitudesResult.reason instanceof Error
          ? solicitudesResult.reason.message
          : 'No se pudo consultar la solicitud.',
      );
    }

    let historialOk = false;
    if (historialResult.status === 'fulfilled') {
      setHistorial(historialResult.value);
      setHistorialError(null);
      historialOk = true;
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
    return solicitudOk && historialOk;
  }, [id, validId]);

  useEffect(() => {
    if (!validId) return;
    void loadWorkflow();
    return () => {
      requestSequence.current += 1;
    };
  }, [id, validId, loadWorkflow]);

  const from = (location.state as { from?: unknown } | null)?.from;
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
  const backPath = from === '/gerente/solicitudes/historial'
    ? '/gerente/solicitudes/historial'
    : '/gerente/solicitudes';

  const handleResolved = async (updated: SolicitudResponse) => {
    setSolicitud(updated);
    setLoading(true);
    setHistorialLoading(true);
    const refreshed = await loadWorkflow();
    if (!refreshed) {
      await Swal.fire({
        icon: 'warning',
        title: 'Solicitud resuelta',
        text: 'El servidor confirmó la resolución, pero no se pudo actualizar el detalle.',
        confirmButtonColor: '#2563eb',
      });
    }
  };

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
            Gestión de solicitudes
          </div>
          <h1>Detalle de solicitud</h1>
          <p>Revisa la solicitud y su estado de resolución.</p>
        </div>
        <Link className="solicitudes-secondary-button" to={backPath}>
          <GoogleIcon name="arrow_back" size={18} color="#2563eb" />
          Volver a solicitudes
        </Link>
      </header>

      {loading && (
        <div className="solicitudes-state" role="status">
          <span className="solicitudes-spinner" aria-hidden="true" />
          <p>Cargando detalle...</p>
        </div>
      )}

      {!validId && !loading && (
        <div className="solicitudes-alert solicitudes-alert--error" role="alert">
          <GoogleIcon name="error" size={20} color="#dc2626" />
          <span>El identificador de la solicitud no es válido.</span>
        </div>
      )}

      {!loading && error && (
        <div className="solicitudes-alert solicitudes-alert--error" role="alert">
          <GoogleIcon name="error" size={20} color="#dc2626" />
          <span>{error}</span>
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
            <div><dt>Solicitud</dt><dd>#{solicitud.id}</dd></div>
            <div>
              <dt>Empleado</dt>
              <dd>
                {solicitud.empleadoNombre || 'No especificado'} (#{solicitud.empleadoId})
              </dd>
            </div>
            <div><dt>Sede</dt><dd>{solicitud.sedeId ? `Sede ${solicitud.sedeId}` : 'No especificada'}</dd></div>
            <div><dt>Fecha de inicio</dt><dd>{formatDate(solicitud.fechaInicio)}</dd></div>
            <div><dt>Fecha de fin</dt><dd>{formatDate(solicitud.fechaFin)}</dd></div>
            <div><dt>Fecha de solicitud</dt><dd>{formatDateTime(solicitud.fechaSolicitud)}</dd></div>
            <div><dt>Fecha de resolución</dt><dd>{formatDateTime(solicitud.fechaResolucion)}</dd></div>
            <div>
              <dt>Responsable de resolución</dt>
              <dd>{solicitud.resueltoPorNombreCompleto || 'Usuario no identificado'}</dd>
            </div>
            {solicitud.resueltoPorRoles && solicitud.resueltoPorRoles.length > 0 && (
              <div>
                <dt>Roles del responsable</dt>
                <dd>
                  {solicitud.resueltoPorRoles
                    .map((role) => role.rolNombre)
                    .filter((roleName): roleName is string => Boolean(roleName))
                    .join(', ') || 'No disponibles'}
                </dd>
              </div>
            )}
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
                  descargar={descargarEvidenciaSolicitud}
                  evidencias={evidenciasOriginales}
                  descargarPorId={descargarEvidenciaSolicitudPorId}
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
              <dd className="solicitud-detail__text">{solicitud.observacionResolucion || 'Sin observación'}</dd>
            </div>
          </dl>

          {solicitud.estado === 3 && (
            <div className="solicitud-observed-notice" role="status">
              <GoogleIcon name="rate_review" size={20} />
              <span>Solicitud observada. Está pendiente de que la ejecutiva envíe una subsanación.</span>
            </div>
          )}

          {(solicitud.estado === 1 || solicitud.estado === 2) && (
            <div className={`solicitud-final solicitud-final--${solicitud.estado}`} role="status">
              <GoogleIcon name="lock" size={20} />
              <span>Esta solicitud está finalizada y no admite nuevas acciones.</span>
            </div>
          )}

          <SolicitudHistorial
            solicitudId={solicitud.id}
            eventos={historial}
            loading={historialLoading}
            error={historialError}
            descargarEvidencia={descargarEvidenciaSolicitudPorId}
            mostrarComparacionVersiones
            onRetry={handleRefresh}
          />

          {solicitud.estado === 0 && (
            <SolicitudResolucionActions
              solicitudId={solicitud.id}
              onResolved={handleResolved}
            />
          )}
        </article>
      )}
    </div>
  );
}
