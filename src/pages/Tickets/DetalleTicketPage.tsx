import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import type {
  EstadoTicket,
  TicketEvidenciaResponseDto,
  TicketResponseDto,
  TicketSeguimientoResponseDto,
} from '../../api/Dtos/Ticket';
import {
  ETIQUETAS_AREA_TICKET,
  ETIQUETAS_CATEGORIA_TICKET,
  ETIQUETAS_ESTADO_TICKET,
  ETIQUETAS_PRIORIDAD_TICKET,
} from '../../api/Dtos/Ticket';
import {
  agregarComentarioMiTicket,
  agregarEvidenciasMiTicket,
  cambiarEstadoMiTicket,
  obtenerEvidenciasMiTicket,
  obtenerMiSeguimientoTicket,
  obtenerMiTicketPorId,
  TicketHttpError,
} from '../../api/services/ticket.service';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import { useAuth } from '../../context/AuthContext';
import { useTicketConversation } from '../../hooks/useTicketConversation';
import '../DashboardLayout.css';
import '../Solicitudes/Solicitudes.css';
import './Tickets.css';
import TicketActivity from './components/TicketActivity';
import TicketConnectionStatus from './components/TicketConnectionStatus';
import TicketEvidencias from './components/TicketEvidencias';

interface DetalleTicketPageProps {
  basePath: string;
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

function getActionError(reason: unknown, fallback: string): string {
  if (reason instanceof TicketHttpError) {
    if (reason.status === 401) return 'Tu sesión no es válida o ha expirado. Inicia sesión nuevamente.';
    if (reason.status === 403) return 'No tienes permiso para modificar este ticket.';
    if (reason.status === 409) {
      return `${reason.message} Actualiza el detalle e inténtalo nuevamente.`;
    }
    return reason.message;
  }
  return reason instanceof Error ? reason.message : fallback;
}

function matchesTicketSnapshot(payload: unknown, current: TicketResponseDto | null): boolean {
  return (
    current !== null &&
    typeof payload === 'object' &&
    payload !== null &&
    JSON.stringify(payload) === JSON.stringify(current)
  );
}

export default function DetalleTicketPage({ basePath }: DetalleTicketPageProps) {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const validId = Number.isInteger(id) && id > 0;
  const { empleado, token } = useAuth();
  const requestSequence = useRef(0);
  const [ticket, setTicket] = useState<TicketResponseDto | null>(null);
  const ticketRef = useRef<TicketResponseDto | null>(null);
  const [evidencias, setEvidencias] = useState<TicketEvidenciaResponseDto[]>([]);
  const [seguimiento, setSeguimiento] = useState<TicketSeguimientoResponseDto | null>(null);
  const [loading, setLoading] = useState(validId);
  const [error, setError] = useState<string | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [evidenceUploadError, setEvidenceUploadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<'comment' | 'state' | 'upload' | null>(null);

  const updateTicket = useCallback((value: TicketResponseDto | null) => {
    ticketRef.current = value;
    setTicket(value);
  }, []);

  const refreshTicketFromServer = useCallback(async (eventPayload?: unknown) => {
    if (!validId) return [];
    if (matchesTicketSnapshot(eventPayload, ticketRef.current)) {
      const sequence = ++requestSequence.current;
      try {
        const latestEvidence = await obtenerEvidenciasMiTicket(id);
        if (sequence !== requestSequence.current) return ticketRef.current?.comentarios ?? [];
        setEvidencias(latestEvidence);
        setEvidenceError(null);
      } catch (reason) {
        if (sequence !== requestSequence.current) return ticketRef.current?.comentarios ?? [];
        setEvidencias([]);
        setEvidenceError(
          reason instanceof Error
            ? reason.message
            : 'No se pudieron consultar las evidencias del ticket.',
        );
      }
      return ticketRef.current?.comentarios ?? [];
    }
    const sequence = ++requestSequence.current;
    const [ticketResult, trackingResult, evidenceResult] = await Promise.allSettled([
      obtenerMiTicketPorId(id),
      obtenerMiSeguimientoTicket(id),
      obtenerEvidenciasMiTicket(id),
    ]);
    if (sequence !== requestSequence.current) return [];

    if (ticketResult.status === 'fulfilled') {
      updateTicket(ticketResult.value);
      setError(null);
    } else {
      updateTicket(null);
      setError(
        ticketResult.reason instanceof Error
          ? ticketResult.reason.message
          : 'No se pudo consultar el ticket.',
      );
    }

    if (trackingResult.status === 'fulfilled') {
      setSeguimiento(trackingResult.value);
      setTrackingError(null);
    } else {
      setSeguimiento(null);
      setTrackingError(
        trackingResult.reason instanceof Error
          ? trackingResult.reason.message
          : 'No se pudo consultar el seguimiento del ticket.',
      );
    }

    if (evidenceResult.status === 'fulfilled') {
      setEvidencias(evidenceResult.value);
      setEvidenceError(null);
    } else {
      setEvidencias([]);
      setEvidenceError(
        evidenceResult.reason instanceof Error
          ? evidenceResult.reason.message
          : 'No se pudieron consultar las evidencias del ticket.',
      );
    }

    if (ticketResult.status === 'rejected') throw ticketResult.reason;
    return trackingResult.status === 'fulfilled'
      ? trackingResult.value.comentarios
      : ticketResult.value.comentarios;
  }, [id, updateTicket, validId]);
  const conversation = useTicketConversation(
    validId ? id : null,
    token,
    refreshTicketFromServer,
  );
  const { mergeComments } = conversation;

  const loadTicket = useCallback(async () => {
    if (!validId) return;
    try {
      mergeComments(await refreshTicketFromServer());
    } catch (reason: unknown) {
      setError(getActionError(reason, 'No se pudo consultar el ticket actualizado.'));
    } finally {
      setLoading(false);
    }
  }, [mergeComments, refreshTicketFromServer, validId]);

  useEffect(() => {
    if (!validId) return;
    let active = true;
    void refreshTicketFromServer()
      .then((comments) => {
        if (active) mergeComments(comments);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(getActionError(reason, 'No se pudo consultar el ticket actualizado.'));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      requestSequence.current += 1;
    };
  }, [mergeComments, refreshTicketFromServer, validId]);

  const handleComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanComment = comment.trim();
    if (!ticket || ticket.estado === 3 || !cleanComment) {
      setActionError(
        ticket?.estado === 3
          ? 'No se pueden agregar comentarios a un ticket cerrado.'
          : 'Escribe un comentario antes de enviarlo.',
      );
      return;
    }
    setBusy('comment');
    setActionError(null);
    try {
      const updatedTicket = await agregarComentarioMiTicket(ticket.id, {
        comentario: cleanComment,
      });
      updateTicket(updatedTicket);
      setSeguimiento({
        ticketId: updatedTicket.id,
        comentarios: updatedTicket.comentarios,
        historial: updatedTicket.historial,
      });
      setTrackingError(null);
      mergeComments(updatedTicket.comentarios);
      setComment('');
    } catch (reason) {
      setActionError(getActionError(reason, 'No se pudo agregar el comentario.'));
    } finally {
      setBusy(null);
    }
  };

  const handleStateChange = async (estado: EstadoTicket) => {
    if (!ticket) return;
    if (ticket.estado !== 3 || estado !== 1) {
      setActionError('Solo puedes reabrir un ticket cerrado.');
      return;
    }
    const confirmation = await Swal.fire({
      icon: 'warning',
      title: '¿Reabrir el ticket?',
      text: 'El ticket volverá al estado En atención y podrás agregar comentarios y evidencias.',
      showCancelButton: true,
      confirmButtonText: 'Sí, reabrir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
    });
    if (!confirmation.isConfirmed) return;

    setBusy('state');
    setActionError(null);
    try {
      const updatedTicket = await cambiarEstadoMiTicket(ticket.id, { estado });
      updateTicket(updatedTicket);
      setSeguimiento({
        ticketId: updatedTicket.id,
        comentarios: updatedTicket.comentarios,
        historial: updatedTicket.historial,
      });
      setTrackingError(null);
      mergeComments(updatedTicket.comentarios);
    } catch (reason) {
      setActionError(getActionError(reason, 'No se pudo actualizar el estado del ticket.'));
    } finally {
      setBusy(null);
    }
  };

  const handleUpload = async (files: File[]): Promise<boolean> => {
    if (!ticket || ticket.estado === 3) {
      setEvidenceUploadError('No se pueden adjuntar archivos a un ticket cerrado.');
      return false;
    }
    setBusy('upload');
    setEvidenceUploadError(null);
    try {
      const updatedTicket = await agregarEvidenciasMiTicket(ticket.id, files);
      updateTicket(updatedTicket);
      try {
        setEvidencias(await obtenerEvidenciasMiTicket(ticket.id));
        setEvidenceError(null);
      } catch (reason) {
        setEvidenceError(
          getActionError(reason, 'No se pudieron actualizar las evidencias del ticket.'),
        );
      }
      return true;
    } catch (reason) {
      setEvidenceUploadError(getActionError(reason, 'No se pudieron adjuntar los archivos.'));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const displayedError = validId ? error : 'El identificador del ticket no es válido.';
  const isLoading = loading || (validId && ticket?.id !== id && error === null);
  const refreshTicket = () => {
    setLoading(true);
    setError(null);
    void loadTicket();
  };

  return (
    <div className="solicitudes-page">
      <header className="solicitudes-header">
        <div>
          <div className="solicitudes-eyebrow">
            <GoogleIcon name="support_agent" size={18} color="#2563eb" />
            Tickets
          </div>
          <h1>Detalle del ticket</h1>
          <p>Consulta la conversación, los archivos y el seguimiento.</p>
        </div>
        <Link className="solicitudes-secondary-button" to={`${basePath}/tickets`}>
          <GoogleIcon name="arrow_back" size={18} color="#2563eb" />
          Mis tickets
        </Link>
      </header>

      {isLoading && (
        <div className="solicitudes-state" role="status">
          <span className="solicitudes-spinner" aria-hidden="true" />
          <p>Cargando ticket...</p>
        </div>
      )}

      {!isLoading && displayedError && (
        <div className="solicitudes-alert solicitudes-alert--error" role="alert">
          <GoogleIcon name="error" size={20} color="#dc2626" />
          <span>{displayedError}</span>
          {validId && (
            <button type="button" className="solicitudes-text-button" onClick={refreshTicket}>
              Reintentar
            </button>
          )}
        </div>
      )}

      {!isLoading && ticket && (
        <div className="ticket-detail-page">
          <article className="solicitud-detail ticket-detail">
            <div className="solicitud-detail__heading">
              <div>
                <span>Ticket #{ticket.id}</span>
                <h2>{ETIQUETAS_CATEGORIA_TICKET[ticket.categoria]} · {ETIQUETAS_AREA_TICKET[ticket.area]}</h2>
              </div>
              <span className={`solicitud-status ticket-status--${ticket.estado}`}>
                {ETIQUETAS_ESTADO_TICKET[ticket.estado]}
              </span>
            </div>

            <dl className="solicitud-detail__grid">
              <div>
                <dt>Solicitante</dt>
                <dd>{ticket.empleadoNombre || 'No especificado'}</dd>
              </div>
              <div>
                <dt>Prioridad</dt>
                <dd>
                  <span className={`ticket-priority ticket-priority--${ticket.prioridad}`}>
                    {ETIQUETAS_PRIORIDAD_TICKET[ticket.prioridad]}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Fecha de creación</dt>
                <dd>{formatDateTime(ticket.fechaCreacion)}</dd>
              </div>
              {ticket.fechaAsignacion && (
                <div>
                  <dt>Fecha de asignación</dt>
                  <dd>{formatDateTime(ticket.fechaAsignacion)}</dd>
                </div>
              )}
              {ticket.fechaAtencion && (
                <div>
                  <dt>Fecha de atención</dt>
                  <dd>{formatDateTime(ticket.fechaAtencion)}</dd>
                </div>
              )}
              {ticket.fechaCierre && (
                <div>
                  <dt>Fecha de cierre</dt>
                  <dd>{formatDateTime(ticket.fechaCierre)}</dd>
                </div>
              )}
              {ticket.evidenciaReferencia && (
                <div className="solicitud-detail__full">
                  <dt>Referencia</dt>
                  <dd className="solicitud-detail__text">{ticket.evidenciaReferencia}</dd>
                </div>
              )}
              <div className="solicitud-detail__full">
                <dt>Descripción</dt>
                <dd className="solicitud-detail__text">{ticket.descripcion}</dd>
              </div>
            </dl>

            <div className="ticket-detail__state-actions">
              {ticket.estado === 3 && (
                <button
                  type="button"
                  className="solicitudes-primary-button"
                  onClick={() => void handleStateChange(1)}
                  disabled={busy !== null}
                >
                  <GoogleIcon name="refresh" size={18} color="#fff" />
                  {busy === 'state' ? 'Reabriendo...' : 'Reabrir ticket'}
                </button>
              )}
              {ticket.estado === 3 && (
                <p className="ticket-readonly-note" role="status">
                  El ticket está cerrado. No admite comentarios ni archivos hasta que se reabra.
                </p>
              )}
            </div>
          </article>

          {actionError && (
            <div className="solicitudes-alert solicitudes-alert--error" role="alert">
              <GoogleIcon name="error" size={20} color="#dc2626" />
              <span>{actionError}</span>
            </div>
          )}

          {evidenceError && (
            <div className="solicitudes-alert solicitudes-alert--error" role="alert">
              <GoogleIcon name="error" size={20} color="#dc2626" />
              <span>{evidenceError}</span>
              <button type="button" className="solicitudes-text-button" onClick={refreshTicket}>
                Reintentar
              </button>
            </div>
          )}

          <TicketEvidencias
            ticketId={ticket.id}
            evidencias={evidencias}
            loadError={evidenceError}
            editable={ticket.estado !== 3}
            uploading={busy === 'upload'}
            uploadError={evidenceUploadError}
            onUpload={handleUpload}
          />

          <section className="ticket-panel" aria-labelledby="ticket-new-comment-title">
            <div className="ticket-panel__heading">
              <div>
                <h3 id="ticket-new-comment-title">Agregar comentario</h3>
                <p>Describe cualquier información adicional para el seguimiento.</p>
              </div>
              <GoogleIcon name="chat" size={20} color="#2563eb" />
            </div>
            <TicketConnectionStatus
              state={conversation.connectionState}
              error={conversation.connectionError}
              recoveryError={conversation.recoveryError}
            />
            {ticket.estado === 3 ? (
              <p className="ticket-readonly-note">Reabre el ticket para volver a comentar.</p>
            ) : (
              <form className="ticket-comment-form" onSubmit={handleComment}>
                <div className="solicitudes-field">
                  <label htmlFor="ticket-comment">Comentario</label>
                  <textarea
                    id="ticket-comment"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    maxLength={2000}
                    rows={4}
                    required
                    disabled={busy !== null}
                  />
                  <span className="solicitudes-character-count">{comment.length}/2000</span>
                </div>
                <button
                  type="submit"
                  className="solicitudes-primary-button"
                  disabled={busy !== null || !comment.trim()}
                >
                  <GoogleIcon name={busy === 'comment' ? 'hourglass_top' : 'send'} size={18} color="#fff" />
                  {busy === 'comment' ? 'Enviando...' : 'Enviar comentario'}
                </button>
              </form>
            )}
          </section>

          {trackingError && (
            <p className="ticket-inline-error" role="alert">
              {trackingError}
            </p>
          )}
          <TicketActivity
            comentarios={conversation.comments}
            historial={seguimiento?.historial ?? ticket.historial}
            currentUserId={empleado?.userId}
          />
        </div>
      )}
    </div>
  );
}
