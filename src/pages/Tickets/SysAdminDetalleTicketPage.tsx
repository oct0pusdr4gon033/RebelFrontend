import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import type {
  CambiarEstadoTicketRequest,
  EstadoTicket,
  TicketEvidenciaResponseDto,
  TicketResponseDto,
  TicketSeguimientoResponseDto,
  TicketTecnicoAsignableDto,
} from '../../api/Dtos/Ticket';
import {
  ETIQUETAS_AREA_TICKET,
  ETIQUETAS_CATEGORIA_TICKET,
  ETIQUETAS_ESTADO_TICKET,
  ETIQUETAS_PRIORIDAD_TICKET,
} from '../../api/Dtos/Ticket';
import {
  agregarComentarioTicket,
  agregarEvidenciasTicket,
  asignarTicket,
  cambiarEstadoTicket,
  obtenerEvidenciasTicket,
  obtenerSeguimientoTicket,
  obtenerTecnicosAsignables,
  obtenerTicketPorId,
  TicketHttpError,
} from '../../api/services/ticket.service';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import { useAuth } from '../../context/AuthContext';
import { useTicketConversation } from '../../hooks/useTicketConversation';
import '../DashboardLayout.css';
import '../Solicitudes/Solicitudes.css';
import './Tickets.css';
import './SysAdminTickets.css';
import TicketActivity from './components/TicketActivity';
import TicketConnectionStatus from './components/TicketConnectionStatus';
import TicketEvidencias from './components/TicketEvidencias';

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

function getErrorMessage(reason: unknown, fallback: string): string {
  if (reason instanceof TicketHttpError) {
    if (reason.status === 401) return 'La sesión expiró. Inicia sesión nuevamente.';
    if (reason.status === 403) return 'SYSADMIN no tiene permiso para esta operación.';
    if (reason.status === 409) {
      return `${reason.message} Actualiza el ticket e inténtalo nuevamente.`;
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

export default function SysAdminDetalleTicketPage() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const validId = Number.isInteger(id) && id > 0;
  const { empleado, token } = useAuth();
  const requestSequence = useRef(0);
  const [ticket, setTicket] = useState<TicketResponseDto | null>(null);
  const ticketRef = useRef<TicketResponseDto | null>(null);
  const [seguimiento, setSeguimiento] = useState<TicketSeguimientoResponseDto | null>(null);
  const [evidencias, setEvidencias] = useState<TicketEvidenciaResponseDto[]>([]);
  const [tecnicos, setTecnicos] = useState<TicketTecnicoAsignableDto[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [comment, setComment] = useState('');
  const [stateDetail, setStateDetail] = useState('');
  const [loading, setLoading] = useState(validId);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [followupError, setFollowupError] = useState<string | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [techniciansError, setTechniciansError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [evidenceUploadError, setEvidenceUploadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'assign' | 'state' | 'comment' | 'upload' | null>(null);

  const updateTicket = useCallback((value: TicketResponseDto | null) => {
    ticketRef.current = value;
    setTicket(value);
  }, []);

  const refreshTicketFromServer = useCallback(async (eventPayload?: unknown) => {
    if (!validId) return [];
    if (matchesTicketSnapshot(eventPayload, ticketRef.current)) {
      const sequence = ++requestSequence.current;
      try {
        const latestEvidence = await obtenerEvidenciasTicket(id);
        if (sequence !== requestSequence.current) return ticketRef.current?.comentarios ?? [];
        setEvidencias(latestEvidence);
        setEvidenceError(null);
      } catch (reason) {
        if (sequence !== requestSequence.current) return ticketRef.current?.comentarios ?? [];
        setEvidencias([]);
        setEvidenceError(
          getErrorMessage(reason, 'No se pudieron consultar las evidencias del ticket.'),
        );
      }
      return ticketRef.current?.comentarios ?? [];
    }
    const sequence = ++requestSequence.current;
    const [ticketResult, followupResult, evidenceResult] = await Promise.allSettled([
      obtenerTicketPorId(id),
      obtenerSeguimientoTicket(id),
      obtenerEvidenciasTicket(id),
    ]);
    if (sequence !== requestSequence.current) return [];

    if (ticketResult.status === 'fulfilled') {
      updateTicket(ticketResult.value);
      setTicketError(null);
      setActionError(null);
    } else {
      updateTicket(null);
      setTicketError(getErrorMessage(ticketResult.reason, 'No se pudo consultar el ticket.'));
    }

    if (followupResult.status === 'fulfilled') {
      setSeguimiento(followupResult.value);
      setFollowupError(null);
    } else {
      setSeguimiento(null);
      setFollowupError(
        getErrorMessage(followupResult.reason, 'No se pudo consultar el seguimiento del ticket.'),
      );
    }

    if (evidenceResult.status === 'fulfilled') {
      setEvidencias(evidenceResult.value);
      setEvidenceError(null);
    } else {
      setEvidencias([]);
      setEvidenceError(
        getErrorMessage(evidenceResult.reason, 'No se pudieron consultar las evidencias del ticket.'),
      );
    }

    if (ticketResult.status === 'rejected') throw ticketResult.reason;
    if (followupResult.status === 'rejected') throw followupResult.reason;
    return followupResult.value.comentarios;
  }, [id, updateTicket, validId]);
  const conversation = useTicketConversation(
    validId ? id : null,
    token,
    refreshTicketFromServer,
  );
  const { mergeComments } = conversation;

  const loadTechnicians = useCallback(async () => {
    try {
      setTecnicos(await obtenerTecnicosAsignables());
      setTechniciansError(null);
    } catch (reason) {
      setTecnicos([]);
      setTechniciansError(
        getErrorMessage(reason, 'No se pudieron consultar los técnicos asignables.'),
      );
    }
  }, []);

  const loadTicket = useCallback(async () => {
    if (!validId) return;
    try {
      mergeComments(await refreshTicketFromServer());
    } catch (reason: unknown) {
      setTicketError(
        getErrorMessage(reason, 'No se pudo consultar el ticket actualizado.'),
      );
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
          setTicketError(
            getErrorMessage(reason, 'No se pudo consultar el ticket actualizado.'),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    void loadTechnicians();

    return () => {
      active = false;
      requestSequence.current += 1;
    };
  }, [loadTechnicians, mergeComments, refreshTicketFromServer, validId]);

  const applyTicketResponse = useCallback((updatedTicket: TicketResponseDto) => {
    updateTicket(updatedTicket);
    setActionError(null);
    setSeguimiento({
      ticketId: updatedTicket.id,
      comentarios: updatedTicket.comentarios,
      historial: updatedTicket.historial,
    });
    mergeComments(updatedTicket.comentarios);
  }, [mergeComments, updateTicket]);

  const handleAssign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const technicianId = Number(selectedTechnicianId);
    if (!ticket || !tecnicos.some((technician) => technician.id === technicianId)) {
      setActionError('Selecciona un técnico de la lista de técnicos asignables.');
      return;
    }
    if (ticket.estado === 2 || ticket.estado === 3) {
      setActionError('No se puede asignar un ticket atendido o cerrado.');
      return;
    }

    setBusy('assign');
    setActionError(null);
    try {
      applyTicketResponse(
        await asignarTicket(ticket.id, { empleadoTecnicoId: technicianId }),
      );
      setSelectedTechnicianId('');
    } catch (reason) {
      setActionError(getErrorMessage(reason, 'No se pudo asignar el ticket.'));
    } finally {
      setBusy(null);
    }
  };

  const handleStateChange = async (estado: EstadoTicket) => {
    if (!ticket) return;
    const allowedState: EstadoTicket | null =
      ticket.estado === 0 ? 1 :
      ticket.estado === 1 ? 2 :
      ticket.estado === 2 ? 3 :
      null;
    if (allowedState !== estado) {
      setActionError('La transición solicitada no está permitida para el estado actual.');
      return;
    }

    if (estado === 2 || estado === 3) {
      const isClosing = estado === 3;
      const confirmation = await Swal.fire({
        icon: 'warning',
        title: isClosing ? '¿Cerrar el ticket?' : '¿Marcar el ticket como atendido?',
        text: isClosing
          ? 'El ticket quedará cerrado y no admitirá nuevos comentarios ni evidencias.'
          : 'Confirma que la atención del ticket ha finalizado.',
        showCancelButton: true,
        confirmButtonText: isClosing ? 'Sí, cerrar ticket' : 'Sí, marcar como atendido',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2563eb',
      });
      if (!confirmation.isConfirmed) return;
    }

    const request: CambiarEstadoTicketRequest = {
      estado,
      detalle: stateDetail.trim() || null,
    };
    setBusy('state');
    setActionError(null);
    try {
      applyTicketResponse(await cambiarEstadoTicket(ticket.id, request));
      setStateDetail('');
    } catch (reason) {
      setActionError(getErrorMessage(reason, 'No se pudo actualizar el estado del ticket.'));
    } finally {
      setBusy(null);
    }
  };

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
      const updatedTicket = await agregarComentarioTicket(ticket.id, {
        comentario: cleanComment,
      });
      applyTicketResponse(updatedTicket);
      setComment('');
    } catch (reason) {
      setActionError(getErrorMessage(reason, 'No se pudo agregar el comentario.'));
    } finally {
      setBusy(null);
    }
  };

  const handleEvidenceUpload = async (files: File[]): Promise<boolean> => {
    if (!ticket || ticket.estado === 3) {
      setEvidenceUploadError('No se pueden adjuntar archivos a un ticket cerrado.');
      return false;
    }
    setBusy('upload');
    setEvidenceUploadError(null);
    try {
      applyTicketResponse(await agregarEvidenciasTicket(ticket.id, files));
      try {
        setEvidencias(await obtenerEvidenciasTicket(ticket.id));
        setEvidenceError(null);
      } catch (reason) {
        setEvidenceError(
          getErrorMessage(reason, 'No se pudieron actualizar las evidencias del ticket.'),
        );
      }
      return true;
    } catch (reason) {
      setEvidenceUploadError(
        getErrorMessage(reason, 'No se pudieron adjuntar evidencias al ticket.'),
      );
      return false;
    } finally {
      setBusy(null);
    }
  };

  const displayedError = validId ? ticketError : 'El identificador del ticket no es válido.';
  const currentHistory = seguimiento?.historial ?? ticket?.historial ?? [];
  const canAssign = ticket !== null && ticket.estado !== 2 && ticket.estado !== 3;
  const nextStatus: EstadoTicket | null =
    ticket?.estado === 0 ? 1 :
    ticket?.estado === 1 ? 2 :
    ticket?.estado === 2 ? 3 :
    null;
  const refreshTicket = () => {
    setLoading(true);
    setTicketError(null);
    void loadTicket();
  };

  return (
    <div className="solicitudes-page">
      <header className="solicitudes-header">
        <div>
          <div className="solicitudes-eyebrow">
            <GoogleIcon name="confirmation_number" size={18} color="#2563eb" />
            Gestión de tickets
          </div>
          <h1>Detalle de ticket</h1>
          <p>Asigna responsables, registra la atención y consulta el historial.</p>
        </div>
        <Link className="solicitudes-secondary-button" to="/sysadmin/tickets">
          <GoogleIcon name="arrow_back" size={18} color="#2563eb" />
          Bandeja global
        </Link>
      </header>

      {loading && (
        <div className="solicitudes-state" role="status">
          <span className="solicitudes-spinner" aria-hidden="true" />
          <p>Cargando ticket y seguimiento...</p>
        </div>
      )}

      {!loading && displayedError && (
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

      {!loading && ticket && (
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
                <dt>Responsable asignado</dt>
                <dd>{ticket.asignadoAEmpleadoNombre || 'Sin asignar'}</dd>
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
          </article>

          {actionError && (
            <div className="solicitudes-alert solicitudes-alert--error" role="alert">
              <GoogleIcon name="error" size={20} color="#dc2626" />
              <span>{actionError}</span>
            </div>
          )}

          <section className="ticket-panel" aria-labelledby="sys-ticket-assignment-title">
            <div className="ticket-panel__heading">
              <div>
                <h3 id="sys-ticket-assignment-title">Asignación y atención</h3>
                <p>
                  Estado actual: <strong>{ETIQUETAS_ESTADO_TICKET[ticket.estado]}</strong>.
                  {' '}Solo se muestran transiciones permitidas por el backend.
                </p>
              </div>
              <GoogleIcon name="assignment_ind" size={20} color="#2563eb" />
            </div>

            {canAssign ? (
              <form className="sys-ticket-assignment" onSubmit={(event) => void handleAssign(event)}>
                <div className="solicitudes-field">
                  <label htmlFor="sys-ticket-technician">Técnico asignable</label>
                  <select
                    id="sys-ticket-technician"
                    value={selectedTechnicianId}
                    onChange={(event) => setSelectedTechnicianId(event.target.value)}
                    disabled={busy !== null || tecnicos.length === 0}
                  >
                    <option value="">Selecciona un técnico</option>
                    {tecnicos.map((technician) => (
                      <option key={technician.id} value={technician.id}>
                        {technician.nombreCompleto}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="solicitudes-primary-button"
                  disabled={busy !== null || !selectedTechnicianId || tecnicos.length === 0}
                >
                  <GoogleIcon name={busy === 'assign' ? 'hourglass_top' : 'person_add'} size={18} color="#fff" />
                  {busy === 'assign' ? 'Asignando...' : 'Asignar'}
                </button>
                {techniciansError && (
                  <p className="ticket-inline-error" role="alert">{techniciansError}</p>
                )}
                {!techniciansError && tecnicos.length === 0 && (
                  <p className="ticket-readonly-note">No hay técnicos asignables disponibles.</p>
                )}
              </form>
            ) : (
              <p className="ticket-readonly-note">
                No se puede asignar un ticket atendido o cerrado.
              </p>
            )}

            {nextStatus !== null ? (
              <div className="sys-ticket-state-transition">
                <div className="solicitudes-field">
                  <label htmlFor="sys-ticket-state-detail">Detalle del cambio (opcional)</label>
                  <textarea
                    id="sys-ticket-state-detail"
                    value={stateDetail}
                    onChange={(event) => setStateDetail(event.target.value)}
                    maxLength={1000}
                    rows={2}
                    disabled={busy !== null}
                  />
                  <span className="solicitudes-character-count">{stateDetail.length}/1000</span>
                </div>
                <button
                  type="button"
                  className="solicitudes-primary-button"
                  onClick={() => void handleStateChange(nextStatus)}
                  disabled={busy !== null}
                >
                  <GoogleIcon name={busy === 'state' ? 'hourglass_top' : 'update'} size={18} color="#fff" />
                  {busy === 'state'
                    ? 'Actualizando...'
                    : nextStatus === 3
                      ? 'Cerrar ticket'
                      : `Cambiar a ${ETIQUETAS_ESTADO_TICKET[nextStatus]}`}
                </button>
              </div>
            ) : (
              <p className="ticket-readonly-note">
                No hay otra transición administrativa disponible para el estado actual.
              </p>
            )}
          </section>

          <TicketEvidencias
            ticketId={ticket.id}
            evidencias={evidencias}
            loadError={evidenceError}
            editable={ticket.estado !== 3}
            uploading={busy === 'upload'}
            uploadError={evidenceUploadError}
            onUpload={handleEvidenceUpload}
          />

          <section className="ticket-panel" aria-labelledby="sys-ticket-comment-title">
            <div className="ticket-panel__heading">
              <div>
                <h3 id="sys-ticket-comment-title">Agregar comentario</h3>
                <p>Los tickets cerrados no admiten nuevos comentarios.</p>
              </div>
              <GoogleIcon name="chat" size={20} color="#2563eb" />
            </div>
            <TicketConnectionStatus
              state={conversation.connectionState}
              error={conversation.connectionError}
              recoveryError={conversation.recoveryError}
            />
            {ticket.estado === 3 ? (
              <p className="ticket-readonly-note">El ticket está cerrado y no admite comentarios.</p>
            ) : (
              <form className="ticket-comment-form" onSubmit={(event) => void handleComment(event)}>
                <div className="solicitudes-field">
                  <label htmlFor="sys-ticket-comment">Comentario</label>
                  <textarea
                    id="sys-ticket-comment"
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

          {followupError && (
            <div className="solicitudes-alert solicitudes-alert--error" role="alert">
              <GoogleIcon name="error" size={20} color="#dc2626" />
              <span>{followupError}</span>
              <button type="button" className="solicitudes-text-button" onClick={refreshTicket}>
                Reintentar
              </button>
            </div>
          )}
          <TicketActivity
            comentarios={conversation.comments}
            historial={currentHistory}
            currentUserId={empleado?.userId}
          />
        </div>
      )}
    </div>
  );
}
