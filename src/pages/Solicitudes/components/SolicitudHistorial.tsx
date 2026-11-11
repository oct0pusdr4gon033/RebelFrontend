import {
  ETIQUETAS_TIPO_SOLICITUD,
  ETIQUETAS_ACCION_HISTORIAL_SOLICITUD,
  type SolicitudHistorialResponse,
  type SolicitudDatosSnapshot,
  type EvidenciaSolicitud,
} from '../../../api/Dtos/Solicitud';
import { GoogleIcon } from '../../../components/GoogleIcon/GoogleIcon';
import {
  SolicitudEvidenciaArchivo,
} from './SolicitudEvidencia';

interface SolicitudHistorialProps {
  solicitudId: number;
  eventos: SolicitudHistorialResponse[];
  loading: boolean;
  error: string | null;
  descargarEvidencia: (
    solicitudId: number,
    evidenciaId: number,
    nombreArchivoFallback?: string | null,
  ) => Promise<EvidenciaSolicitud>;
  mostrarComparacionVersiones?: boolean;
  onRetry: () => void;
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

const SNAPSHOT_FIELDS = [
  { key: 'tipo', label: 'Tipo' },
  { key: 'titulo', label: 'Título' },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'fechaInicio', label: 'Fecha de inicio' },
  { key: 'fechaFin', label: 'Fecha de fin' },
  { key: 'evidenciaReferencia', label: 'Referencia de evidencia' },
] as const;

function snapshotValue(snapshot: SolicitudDatosSnapshot, key: typeof SNAPSHOT_FIELDS[number]['key']): string {
  if (key === 'tipo') {
    return snapshot.tipo === null
      ? 'Sin información'
      : ETIQUETAS_TIPO_SOLICITUD[snapshot.tipo];
  }

  const value = snapshot[key];
  return value === null || value.trim() === '' ? 'Sin información' : value;
}

function normalizedSnapshotValue(
  snapshot: SolicitudDatosSnapshot,
  key: typeof SNAPSHOT_FIELDS[number]['key'],
): string {
  return snapshotValue(snapshot, key).trim();
}

export default function SolicitudHistorial({
  solicitudId,
  eventos,
  loading,
  error,
  descargarEvidencia,
  mostrarComparacionVersiones = false,
  onRetry,
}: SolicitudHistorialProps) {
  const chronological = [...eventos].sort(
    (first, second) =>
      first.fecha.localeCompare(second.fecha) || first.id - second.id,
  );

  return (
    <section className="solicitud-history" aria-labelledby="solicitud-history-title">
      <div className="solicitud-history__heading">
        <div>
          <h3 id="solicitud-history-title">Historial de la solicitud</h3>
          <p>Observaciones, respuestas y cambios de estado.</p>
        </div>
        {!loading && (
          <button type="button" className="solicitudes-text-button" onClick={onRetry}>
            Actualizar
          </button>
        )}
      </div>

      {loading && (
        <div className="solicitudes-state" role="status">
          <span className="solicitudes-spinner" aria-hidden="true" />
          <p>Cargando historial...</p>
        </div>
      )}

      {!loading && error && (
        <div className="solicitudes-alert solicitudes-alert--error" role="alert">
          <GoogleIcon name="error" size={18} color="#dc2626" />
          <span>{error}</span>
          <button type="button" className="solicitudes-text-button" onClick={onRetry}>
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && chronological.length === 0 && (
        <p className="solicitud-history__empty">
          No hay eventos históricos disponibles para esta solicitud.
        </p>
      )}

      {!loading && !error && chronological.length > 0 && (
        <ol className="solicitud-history__timeline">
          {chronological.map((event) => (
            <li className="solicitud-history__event" key={event.id}>
              <span className="solicitud-history__marker" aria-hidden="true" />
              <article>
                <header>
                  <h4>{ETIQUETAS_ACCION_HISTORIAL_SOLICITUD[event.accion]}</h4>
                  <time dateTime={event.fecha}>{formatDateTime(event.fecha)}</time>
                </header>
                <p className="solicitud-history__actor">
                  Responsable: {event.usuarioResponsableNombreCompleto || 'Usuario no identificado'}
                </p>
                {event.usuarioResponsableRoles && event.usuarioResponsableRoles.length > 0 && (
                  <p className="solicitud-history__actor-roles">
                    Roles: {event.usuarioResponsableRoles
                      .map((role) => role.rolNombre)
                      .filter((roleName): roleName is string => Boolean(roleName))
                      .join(', ') || 'No disponibles'}
                  </p>
                )}
                <p className="solicitud-history__comment">
                  {event.comentario || 'Sin comentario.'}
                </p>
                {mostrarComparacionVersiones &&
                  (event.datosSolicitudAntes || event.datosSolicitudDespues) && (
                    <section
                      className="solicitud-history__comparison"
                      aria-label="Comparación de datos de la solicitud"
                    >
                      <h5>Comparación de versiones</h5>
                      <div className="solicitud-history__versions">
                        {[
                          { title: 'Datos anteriores', snapshot: event.datosSolicitudAntes },
                          { title: 'Datos corregidos', snapshot: event.datosSolicitudDespues },
                        ].map(({ title, snapshot }) => (
                          <div className="solicitud-history__version" key={title}>
                            <h6>{title}</h6>
                            <dl>
                              {SNAPSHOT_FIELDS.map(({ key, label }) => {
                                const changed = Boolean(
                                  event.datosSolicitudAntes &&
                                  event.datosSolicitudDespues &&
                                  normalizedSnapshotValue(event.datosSolicitudAntes, key) !==
                                    normalizedSnapshotValue(event.datosSolicitudDespues, key),
                                );
                                return (
                                  <div
                                    className={
                                      changed
                                        ? 'solicitud-history__version-field solicitud-history__version-field--changed'
                                        : 'solicitud-history__version-field'
                                    }
                                    key={key}
                                  >
                                    <dt>{label}</dt>
                                    <dd>{snapshot ? snapshotValue(snapshot, key) : 'Sin información'}</dd>
                                  </div>
                                );
                              })}
                            </dl>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                {event.evidencias && event.evidencias.length > 0 && (
                  <div className="solicitud-history__documents">
                    <h5>Documentos de este evento</h5>
                    {event.evidencias.map((archivo) => (
                      <SolicitudEvidenciaArchivo
                        key={archivo.id}
                        solicitudId={solicitudId}
                        archivo={archivo}
                        descargar={descargarEvidencia}
                      />
                    ))}
                  </div>
                )}
              </article>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
