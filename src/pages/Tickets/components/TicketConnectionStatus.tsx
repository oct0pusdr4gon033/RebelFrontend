import type { TicketHubConnectionState } from '../../../services/ticketHubService';

interface TicketConnectionStatusProps {
  state: TicketHubConnectionState | 'idle';
  error: string | null;
  recoveryError: string | null;
}

const STATUS_LABELS: Record<TicketHubConnectionState | 'idle', string> = {
  connecting: 'Conectando a la conversación…',
  connected: 'Conversación en tiempo real',
  reconnecting: 'Reconectando conversación…',
  disconnected: 'Conversación sin conexión',
  error: 'Conversación no disponible',
  idle: 'Conversación sin conexión',
};

export default function TicketConnectionStatus({
  state,
  error,
  recoveryError,
}: TicketConnectionStatusProps) {
  return (
    <div className={`ticket-connection-status ticket-connection-status--${state}`}>
      <p role="status" aria-live="polite">
        <span className="ticket-connection-status__indicator" aria-hidden="true" />
        {STATUS_LABELS[state]}
      </p>
      {(error || recoveryError) && (
        <p className="ticket-connection-status__error">
          {error ?? recoveryError}
        </p>
      )}
    </div>
  );
}
