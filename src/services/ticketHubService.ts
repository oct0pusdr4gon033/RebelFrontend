import * as signalR from '@microsoft/signalr';
import type { ComentarioTicketResponseDto } from '../api/Dtos/Ticket';
import { API_BASE } from '../env/envoviment';

export type TicketHubConnectionState =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

type CommentHandler = (comment: ComentarioTicketResponseDto) => void;
type StatusHandler = (state: TicketHubConnectionState, error: string | null) => void;
type ReconnectedHandler = () => Promise<void> | void;
type TicketUpdatedHandler = (payload: unknown) => Promise<void> | void;

interface TicketSubscriber {
  onComment?: CommentHandler;
  onStatus?: StatusHandler;
  onReconnected?: ReconnectedHandler;
  onTicketUpdated?: TicketUpdatedHandler;
}

interface TicketConnection {
  ticketId: number;
  connection: signalR.HubConnection;
  tokenProvider: () => string;
  subscribers: Set<TicketSubscriber>;
  startPromise: Promise<void> | null;
  stopTimer: ReturnType<typeof setTimeout> | null;
  updateTimer: ReturnType<typeof setTimeout> | null;
  pendingUpdatePayload: unknown;
  joined: boolean;
  disposed: boolean;
}

export interface TicketListSubscriber {
  ticketIds: readonly number[];
  onTicketUpdated: (ticketId: number) => void;
  onReconnected: () => void;
}

interface TicketListConnection {
  connection: signalR.HubConnection;
  token: string;
  subscribers: Set<TicketListSubscriber>;
  joinedTicketIds: Set<number>;
  startPromise: Promise<void> | null;
  retryTimer: ReturnType<typeof setTimeout> | null;
  retryCount: number;
  authFailed: boolean;
  syncPromise: Promise<void> | null;
  disposed: boolean;
}

const RETRY_DELAYS = [0, 1500, 3000, 5000, 10000];
const INITIAL_START_RETRY_DELAYS = [500, 1500, 3000];

function isAuthenticationError(error: Error): boolean {
  const statusCode = (error as Error & { statusCode?: number }).statusCode;
  return statusCode === 401 || statusCode === 403;
}

function getConnectionError(error: Error | null | undefined): string | null {
  if (!error) return null;
  if (isAuthenticationError(error)) {
    const statusCode = (error as Error & { statusCode?: number }).statusCode;
    return statusCode === 401
      ? 'La sesión expiró. Inicia sesión nuevamente.'
      : 'No tienes permiso para acceder a la conversación de este ticket.';
  }
  return 'No se pudo mantener la conexión en tiempo real.';
}

function isCommentDto(value: unknown): value is ComentarioTicketResponseDto {
  if (typeof value !== 'object' || value === null) return false;
  const comment = value as Partial<ComentarioTicketResponseDto>;
  return (
    typeof comment.id === 'number' &&
    typeof comment.autorUserId === 'string' &&
    typeof comment.comentario === 'string' &&
    typeof comment.fecha === 'string'
  );
}

class TicketHubService {
  private readonly connections = new Map<number, TicketConnection>();
  private listConnection: TicketListConnection | null = null;

  public subscribe(
    ticketId: number,
    token: string,
    subscriber: TicketSubscriber,
  ): () => void {
    let entry = this.connections.get(ticketId);
    if (entry && entry.tokenProvider() !== token) {
      entry.disposed = true;
      if (entry.stopTimer !== null) clearTimeout(entry.stopTimer);
      if (entry.updateTimer !== null) clearTimeout(entry.updateTimer);
      this.connections.delete(ticketId);
      void this.stop(entry);
      entry = undefined;
    }
    if (!entry) {
      entry = this.createConnection(ticketId, token);
      this.connections.set(ticketId, entry);
    }
    if (entry.stopTimer !== null) {
      clearTimeout(entry.stopTimer);
      entry.stopTimer = null;
    }

    entry.subscribers.add(subscriber);
    subscriber.onStatus?.(
      entry.connection.state === signalR.HubConnectionState.Connected
        ? 'connected'
        : 'connecting',
      null,
    );

    if (
      !entry.startPromise &&
      entry.connection.state === signalR.HubConnectionState.Disconnected
    ) {
      const currentEntry = entry;
      currentEntry.startPromise = this.start(currentEntry).finally(() => {
        currentEntry.startPromise = null;
      });
    }

    return () => {
      const current = this.connections.get(ticketId);
      if (current !== entry) return;
      entry?.subscribers.delete(subscriber);
      if (entry && entry.subscribers.size === 0 && entry.stopTimer === null) {
        entry.stopTimer = setTimeout(() => {
          if (!entry) return;
          entry.stopTimer = null;
          if (entry.subscribers.size > 0) return;
          entry.disposed = true;
          this.connections.delete(ticketId);
          void this.stop(entry);
        }, 0);
      }
    };
  }

  public subscribeList(
    ticketIds: readonly number[],
    token: string,
    subscriber: TicketListSubscriber,
  ): () => void {
    let entry = this.listConnection;
    if (entry && entry.token !== token) {
      this.disposeListConnection(entry);
      entry = null;
    }
    if (!entry) {
      entry = this.createListConnection(token);
      this.listConnection = entry;
    }

    subscriber = { ...subscriber, ticketIds: [...new Set(ticketIds)] };
    entry.subscribers.add(subscriber);
    this.ensureListConnection(entry);
    this.syncListGroupsSafely(entry);

    return () => {
      const current = this.listConnection;
      if (current !== entry || !entry) return;
      entry.subscribers.delete(subscriber);
      this.syncListGroupsSafely(entry);
      if (entry.subscribers.size === 0) this.disposeListConnection(entry);
    };
  }

  public retryListConnection(): void {
    const entry = this.listConnection;
    if (!entry) return;
    if (entry.connection.state === signalR.HubConnectionState.Connected) {
      this.syncListGroupsSafely(entry);
    } else {
      this.ensureListConnection(entry);
    }
  }

  private createListConnection(token: string): TicketListConnection {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/tickets`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (context) => {
          if (isAuthenticationError(context.retryReason)) return null;
          return RETRY_DELAYS[context.previousRetryCount] ?? null;
        },
      })
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    const entry: TicketListConnection = {
      connection,
      token,
      subscribers: new Set(),
      joinedTicketIds: new Set(),
      startPromise: null,
      retryTimer: null,
      retryCount: 0,
      authFailed: false,
      syncPromise: null,
      disposed: false,
    };

    connection.on('TicketActualizado', (payload: unknown) => {
      if (entry.disposed || typeof payload !== 'object' || payload === null) return;
      const ticketId = (payload as { id?: unknown }).id;
      if (typeof ticketId !== 'number' || !Number.isInteger(ticketId)) return;
      entry.subscribers.forEach((listSubscriber) => {
        if (listSubscriber.ticketIds.includes(ticketId)) {
          try {
            listSubscriber.onTicketUpdated(ticketId);
          } catch (reason) {
            console.error('No se pudo actualizar la bandeja de Tickets desde SignalR.', reason);
          }
        }
      });
    });

    connection.onreconnected(async () => {
      if (entry.syncPromise) {
        try {
          await entry.syncPromise;
        } catch (reason) {
          console.warn('La sincronización anterior de grupos de Tickets falló al reconectar.', reason);
        }
      }
      entry.joinedTicketIds.clear();
      try {
        await this.syncListGroups(entry);
      } catch (reason) {
        console.error('No se pudieron recuperar los grupos de las bandejas de Tickets.', reason);
      }
      if (!entry.disposed) {
        entry.retryCount = 0;
        entry.authFailed = false;
        entry.subscribers.forEach((listSubscriber) => {
          try {
            listSubscriber.onReconnected();
          } catch (reason) {
            console.error('No se pudo recuperar una bandeja de Tickets tras reconectar.', reason);
          }
        });
      }
    });

    connection.onclose((error) => {
      entry.joinedTicketIds.clear();
      if (error && isAuthenticationError(error)) {
        entry.authFailed = true;
        return;
      }
      this.ensureListConnection(entry);
    });

    return entry;
  }

  private ensureListConnection(entry: TicketListConnection): void {
    if (
      entry.disposed ||
      entry.subscribers.size === 0 ||
      entry.authFailed ||
      entry.startPromise ||
      entry.retryTimer ||
      entry.connection.state !== signalR.HubConnectionState.Disconnected
    ) {
      return;
    }

    const attempt = async (): Promise<void> => {
      try {
        await entry.connection.start();
        entry.retryCount = 0;
      } catch (reason) {
        if (entry.disposed) return;
        if (reason instanceof Error && isAuthenticationError(reason)) {
          entry.authFailed = true;
          console.error('La conexión de bandejas de Tickets requiere una sesión válida.', reason);
          return;
        }
        const delay = INITIAL_START_RETRY_DELAYS[entry.retryCount];
        if (delay === undefined) {
          entry.retryCount = 0;
          console.error('No se pudo iniciar la conexión compartida de bandejas de Tickets.', reason);
          return;
        }
        entry.retryCount += 1;
        entry.retryTimer = setTimeout(() => {
          entry.retryTimer = null;
          this.ensureListConnection(entry);
        }, delay);
        return;
      }
      this.syncListGroupsSafely(entry);
    };

    entry.startPromise = attempt().finally(() => {
      entry.startPromise = null;
    });
  }

  private syncListGroupsSafely(entry: TicketListConnection): void {
    void this.syncListGroups(entry).catch((reason: unknown) => {
      if (!entry.disposed) {
        console.error('No se pudieron sincronizar los grupos de Tickets.', reason);
      }
    });
  }

  private async syncListGroups(entry: TicketListConnection): Promise<void> {
    if (entry.syncPromise) return entry.syncPromise;

    entry.syncPromise = (async () => {
      while (
        !entry.disposed &&
        entry.connection.state === signalR.HubConnectionState.Connected
      ) {
        const desired = new Set<number>();
        entry.subscribers.forEach((subscriber) => {
          subscriber.ticketIds.forEach((ticketId) => desired.add(ticketId));
        });

        const toLeave = [...entry.joinedTicketIds].filter((id) => !desired.has(id));
        const toJoin = [...desired].filter((id) => !entry.joinedTicketIds.has(id));
        if (toLeave.length === 0 && toJoin.length === 0) return;

        for (const ticketId of toLeave) {
          await entry.connection.invoke('LeaveTicket', ticketId);
          entry.joinedTicketIds.delete(ticketId);
        }
        for (const ticketId of toJoin) {
          await entry.connection.invoke('JoinTicket', ticketId);
          entry.joinedTicketIds.add(ticketId);
        }
      }
    })().finally(() => {
      entry.syncPromise = null;
    });

    return entry.syncPromise;
  }

  private disposeListConnection(entry: TicketListConnection): void {
    if (entry.disposed) return;
    entry.disposed = true;
    if (entry.retryTimer) clearTimeout(entry.retryTimer);
    if (this.listConnection === entry) this.listConnection = null;
    void this.stopConnection(entry.connection);
  }

  private createConnection(ticketId: number, token: string): TicketConnection {
    const tokenProvider = () => token;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/tickets`, {
        accessTokenFactory: tokenProvider,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (context) => {
          if (isAuthenticationError(context.retryReason)) return null;
          return RETRY_DELAYS[context.previousRetryCount] ?? null;
        },
      })
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    const entry: TicketConnection = {
      ticketId,
      connection,
      tokenProvider,
      subscribers: new Set(),
      startPromise: null,
      stopTimer: null,
      updateTimer: null,
      pendingUpdatePayload: null,
      joined: false,
      disposed: false,
    };

    connection.on('ComentarioAgregado', (payload: unknown) => {
      if (!isCommentDto(payload) || entry.disposed) return;
      entry.subscribers.forEach((subscriber) => subscriber.onComment?.(payload));
    });

    connection.on('TicketActualizado', (payload: unknown) => {
      if (entry.disposed) return;
      entry.pendingUpdatePayload = payload;
      if (entry.updateTimer !== null) return;
      entry.updateTimer = setTimeout(() => {
        entry.updateTimer = null;
        if (entry.disposed) return;
        const latestPayload = entry.pendingUpdatePayload;
        entry.pendingUpdatePayload = null;
        entry.subscribers.forEach((subscriber) => {
          if (!subscriber.onTicketUpdated) return;
          void Promise.resolve()
            .then(() => subscriber.onTicketUpdated?.(latestPayload))
            .catch((reason: unknown) => {
              console.error('No se pudo actualizar el ticket desde SignalR.', reason);
            });
        });
      }, 100);
    });

    connection.onreconnecting((error) => {
      entry.joined = false;
      this.notifyStatus(entry, 'reconnecting', getConnectionError(error));
    });

    connection.onreconnected(() => this.rejoin(entry));

    connection.onclose((error) => {
      if (!entry.disposed) {
        this.notifyStatus(
          entry,
          error ? 'error' : 'disconnected',
          getConnectionError(error),
        );
      }
    });

    return entry;
  }

  private async start(entry: TicketConnection): Promise<void> {
    this.notifyStatus(entry, 'connecting', null);
    for (let attempt = 0; ; attempt += 1) {
      try {
        await entry.connection.start();
        if (entry.disposed) return;
        await entry.connection.invoke('JoinTicket', entry.ticketId);
        entry.joined = true;
        if (!entry.disposed) this.notifyStatus(entry, 'connected', null);
        return;
      } catch (reason) {
        if (!entry.disposed) {
          const error = reason instanceof Error ? reason : null;
          this.notifyStatus(
            entry,
            'error',
            getConnectionError(error) ?? 'No se pudo conectar a la conversación.',
          );
        }
        await this.stopConnection(entry.connection);
        const delay = INITIAL_START_RETRY_DELAYS[attempt];
        if (
          delay === undefined ||
          entry.disposed ||
          entry.subscribers.size === 0 ||
          (reason instanceof Error && isAuthenticationError(reason))
        ) {
          return;
        }
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
        if (entry.disposed || entry.subscribers.size === 0) return;
        this.notifyStatus(entry, 'connecting', null);
      }
    }
  }

  private async rejoin(entry: TicketConnection): Promise<void> {
    if (entry.disposed) return;
    try {
      await entry.connection.invoke('JoinTicket', entry.ticketId);
      entry.joined = true;
      if (entry.disposed) return;
      this.notifyStatus(entry, 'connected', null);
      await Promise.all(
        [...entry.subscribers].map((subscriber) => subscriber.onReconnected?.()),
      );
    } catch (reason) {
      const error = reason instanceof Error ? reason : null;
      this.notifyStatus(
        entry,
        'error',
        getConnectionError(error) ?? 'No se pudo reingresar a la conversación.',
      );
    }
  }

  private notifyStatus(
    entry: TicketConnection,
    state: TicketHubConnectionState,
    error: string | null,
  ): void {
    entry.subscribers.forEach((subscriber) => subscriber.onStatus?.(state, error));
  }

  private async stop(entry: TicketConnection): Promise<void> {
    if (entry.updateTimer !== null) {
      clearTimeout(entry.updateTimer);
      entry.updateTimer = null;
    }
    await entry.startPromise?.catch(() => undefined);
    if (
      entry.joined &&
      entry.connection.state === signalR.HubConnectionState.Connected
    ) {
      try {
        await entry.connection.invoke('LeaveTicket', entry.ticketId);
      } catch (reason) {
        console.warn('No se pudo salir del grupo SignalR del ticket.', reason);
      }
      entry.joined = false;
    }
    await this.stopConnection(entry.connection);
  }

  private async stopConnection(connection: signalR.HubConnection): Promise<void> {
    if (connection.state === signalR.HubConnectionState.Disconnected) return;
    try {
      await connection.stop();
    } catch (reason) {
      console.error('No se pudo cerrar la conexión SignalR de Tickets.', reason);
    }
  }
}

export const ticketHubService = new TicketHubService();
