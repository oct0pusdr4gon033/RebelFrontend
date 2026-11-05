import type {
  ComentarioTicketResponseDto,
  HistorialTicketResponseDto,
} from '../../../api/Dtos/Ticket';
import {
  ETIQUETAS_ACCION_HISTORIAL_TICKET,
  ETIQUETAS_ESTADO_TICKET,
} from '../../../api/Dtos/Ticket';
import { GoogleIcon } from '../../../components/GoogleIcon/GoogleIcon';

interface TicketActivityProps {
  comentarios: ComentarioTicketResponseDto[];
  historial: HistorialTicketResponseDto[];
  currentUserId?: string;
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

function actorName(
  userId: string,
  authorName: string | null | undefined,
  currentUserId?: string,
): string {
  const name = authorName?.trim();
  if (name) return name;
  return currentUserId && userId === currentUserId
    ? 'Tú'
    : 'Usuario no identificado';
}

export default function TicketActivity({
  comentarios,
  historial,
  currentUserId,
}: TicketActivityProps) {
  const orderedComments = [...comentarios].sort(
    (first, second) => first.fecha.localeCompare(second.fecha) || first.id - second.id,
  );
  const orderedHistory = [...historial].sort(
    (first, second) => first.fecha.localeCompare(second.fecha) || first.id - second.id,
  );

  return (
    <div className="ticket-activity">
      <section className="ticket-panel" aria-labelledby="ticket-comments-title">
        <div className="ticket-panel__heading">
          <div>
            <h3 id="ticket-comments-title">Conversación</h3>
            <p>Comentarios enviados sobre este ticket.</p>
          </div>
          <GoogleIcon name="forum" size={20} color="#2563eb" />
        </div>
        {orderedComments.length === 0 ? (
          <p className="ticket-empty-inline">Aún no hay comentarios.</p>
        ) : (
          <ol className="ticket-comment-list">
            {orderedComments.map((comment) => (
              <li
                className={`ticket-comment ${
                  currentUserId
                    ? comment.autorUserId === currentUserId
                      ? 'ticket-comment--own'
                      : 'ticket-comment--other'
                    : ''
                }`}
                key={comment.id}
              >
                <div className="ticket-comment__meta">
                  <strong>
                    {actorName(
                      comment.autorUserId,
                      comment.autorNombreCompleto,
                      currentUserId,
                    )}
                  </strong>
                  <time dateTime={comment.fecha}>{formatDateTime(comment.fecha)}</time>
                </div>
                <p>{comment.comentario}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="ticket-panel" aria-labelledby="ticket-history-title">
        <div className="ticket-panel__heading">
          <div>
            <h3 id="ticket-history-title">Seguimiento e historial</h3>
            <p>Actividad registrada para este ticket.</p>
          </div>
          <GoogleIcon name="history" size={20} color="#2563eb" />
        </div>
        {orderedHistory.length === 0 ? (
          <p className="ticket-empty-inline">No hay eventos de seguimiento disponibles.</p>
        ) : (
          <ol className="solicitud-history__timeline">
            {orderedHistory.map((event) => (
              <li className="solicitud-history__event" key={event.id}>
                <span className="solicitud-history__marker" aria-hidden="true" />
                <article>
                  <header>
                    <h4>{ETIQUETAS_ACCION_HISTORIAL_TICKET[event.accion]}</h4>
                    <time dateTime={event.fecha}>{formatDateTime(event.fecha)}</time>
                  </header>
                  <p className="solicitud-history__actor">
                    Responsable: {actorName(
                      event.usuarioResponsableUserId,
                      null,
                      currentUserId,
                    )}
                  </p>
                  {event.estadoAnterior !== null && event.estadoNuevo !== null && (
                    <p className="ticket-history__transition">
                      {ETIQUETAS_ESTADO_TICKET[event.estadoAnterior]}
                      {' → '}
                      {ETIQUETAS_ESTADO_TICKET[event.estadoNuevo]}
                    </p>
                  )}
                  {event.detalle && (
                    <p className="solicitud-history__comment">{event.detalle}</p>
                  )}
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
