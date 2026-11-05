import * as signalR from '@microsoft/signalr';
import type { NotificacionDto } from '../api/Dtos/Notificacion';
import { isNotificacionDto } from '../api/services/notificacion.service';
import { API_BASE } from '../env/envoviment';

export type NotificacionHubState =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

export interface NotificacionHubSubscriber {
  onNotification: (notification: NotificacionDto) => void;
  onStatus?: (state: NotificacionHubState) => void;
  onConnected?: () => Promise<void> | void;
  onReconnected?: () => Promise<void> | void;
}

const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000] as const;
const RETRY_CYCLE_DELAY_MS = 60000;

interface ActiveConnection {
  token: string;
  connection: signalR.HubConnection;
  subscribers: Set<NotificacionHubSubscriber>;
  startPromise: Promise<void> | null;
  stopTimer: ReturnType<typeof setTimeout> | null;
  retryTimer: ReturnType<typeof setTimeout> | null;
  retryAttempt: number;
  disposed: boolean;
}

class NotificacionHubService {
  private active: ActiveConnection | null = null;
  private stopPromise: Promise<void> = Promise.resolve();

  public subscribe(
    token: string,
    subscriber: NotificacionHubSubscriber,
  ): () => void {
    let entry = this.active;
    if (entry && entry.token !== token) {
      this.dispose(entry);
      entry = null;
    }
    if (!entry) {
      entry = this.createConnection(token);
      this.active = entry;
    }
    if (entry.stopTimer !== null) {
      clearTimeout(entry.stopTimer);
      entry.stopTimer = null;
    }

    entry.subscribers.add(subscriber);
    if (this.isCurrent(entry)) {
      try {
        subscriber.onStatus?.(
          entry.connection.state === signalR.HubConnectionState.Connected
            ? 'connected'
            : 'connecting',
        );
      } catch (reason) {
        console.error('No se pudo actualizar el estado de notificaciones.', reason);
      }
    }
    this.ensureStarted(entry);

    return () => {
      if (this.active !== entry) return;
      entry?.subscribers.delete(subscriber);
      if (entry && entry.subscribers.size === 0) {
        this.clearRetry(entry);
      }
      if (entry && entry.subscribers.size === 0 && entry.stopTimer === null) {
        entry.stopTimer = setTimeout(() => {
          if (!entry || !this.isCurrent(entry)) return;
          entry.stopTimer = null;
          if (entry.subscribers.size === 0) this.dispose(entry);
        }, 0);
      }
    };
  }

  private createConnection(token: string): ActiveConnection {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/notificaciones`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect([0, 1500, 3000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    const entry: ActiveConnection = {
      token,
      connection,
      subscribers: new Set(),
      startPromise: null,
      stopTimer: null,
      retryTimer: null,
      retryAttempt: 0,
      disposed: false,
    };

    connection.on('NotificacionNueva', (payload: unknown) => {
      if (!this.isCurrent(entry) || !isNotificacionDto(payload)) return;
      entry.subscribers.forEach((subscriber) => {
        try {
          subscriber.onNotification(payload);
        } catch (reason) {
          console.error('No se pudo procesar una notificación recibida.', reason);
        }
      });
    });

    connection.onreconnecting(() => this.notifyStatus(entry, 'reconnecting'));
    connection.onreconnected(async () => {
      if (!this.isCurrent(entry)) return;
      entry.retryAttempt = 0;
      this.clearRetry(entry);
      this.notifyStatus(entry, 'connected');
      await this.notifySubscribers(entry, 'onReconnected');
    });
    connection.onclose((error) => {
      if (!this.isCurrent(entry)) return;
      this.notifyStatus(entry, error ? 'error' : 'disconnected');
      this.scheduleRetry(entry);
    });

    return entry;
  }

  private ensureStarted(entry: ActiveConnection): void {
    if (
      !this.isCurrent(entry) ||
      entry.subscribers.size === 0 ||
      entry.startPromise ||
      entry.connection.state !== signalR.HubConnectionState.Disconnected
    ) {
      return;
    }

    entry.startPromise = (async () => {
      while (true) {
        const pendingStop = this.stopPromise;
        await pendingStop;
        if (pendingStop === this.stopPromise) break;
      }
      if (
        !this.isCurrent(entry) ||
        entry.subscribers.size === 0 ||
        entry.connection.state !== signalR.HubConnectionState.Disconnected
      ) {
        return;
      }

      this.notifyStatus(entry, 'connecting');
      try {
        await entry.connection.start();
        if (!this.isCurrent(entry)) return;
        entry.retryAttempt = 0;
        this.clearRetry(entry);
        this.notifyStatus(entry, 'connected');
        void this.notifySubscribers(entry, 'onConnected');
      } catch (reason) {
        if (this.isCurrent(entry)) {
          this.notifyStatus(entry, 'error');
          console.error('No se pudo iniciar SignalR para notificaciones globales.', reason);
          this.scheduleRetry(entry);
        }
      }
    })().finally(() => {
      entry.startPromise = null;
      if (
        this.isCurrent(entry) &&
        entry.subscribers.size > 0 &&
        entry.connection.state === signalR.HubConnectionState.Disconnected &&
        entry.retryTimer === null
      ) {
        this.scheduleRetry(entry);
      }
    });
  }

  private async notifySubscribers(
    entry: ActiveConnection,
    callbackName: 'onConnected' | 'onReconnected',
  ): Promise<void> {
    await Promise.all(
      [...entry.subscribers].map(async (subscriber) => {
        if (!this.isCurrent(entry) || !entry.subscribers.has(subscriber)) return;
        try {
          await subscriber[callbackName]?.();
        } catch (reason) {
          console.error('No se pudieron recuperar las notificaciones tras conectar.', reason);
        }
      }),
    );
  }

  private scheduleRetry(entry: ActiveConnection): void {
    if (
      !this.isCurrent(entry) ||
      entry.subscribers.size === 0 ||
      entry.retryTimer !== null ||
      entry.startPromise
    ) {
      return;
    }

    const delay =
      entry.retryAttempt < RETRY_DELAYS_MS.length
        ? RETRY_DELAYS_MS[entry.retryAttempt]
        : RETRY_CYCLE_DELAY_MS;
    entry.retryAttempt =
      entry.retryAttempt < RETRY_DELAYS_MS.length ? entry.retryAttempt + 1 : 0;
    const jitteredDelay = Math.round(delay * (0.8 + Math.random() * 0.4));

    entry.retryTimer = setTimeout(() => {
      entry.retryTimer = null;
      if (
        !this.isCurrent(entry) ||
        entry.subscribers.size === 0 ||
        entry.connection.state !== signalR.HubConnectionState.Disconnected
      ) {
        return;
      }
      this.ensureStarted(entry);
    }, jitteredDelay);
  }

  private clearRetry(entry: ActiveConnection): void {
    if (entry.retryTimer === null) return;
    clearTimeout(entry.retryTimer);
    entry.retryTimer = null;
  }

  private isCurrent(entry: ActiveConnection): boolean {
    return !entry.disposed && this.active === entry;
  }

  private notifyStatus(entry: ActiveConnection, state: NotificacionHubState): void {
    if (!this.isCurrent(entry)) return;
    entry.subscribers.forEach((subscriber) => {
      try {
        subscriber.onStatus?.(state);
      } catch (reason) {
        console.error('No se pudo actualizar el estado de notificaciones.', reason);
      }
    });
  }

  private dispose(entry: ActiveConnection): void {
    if (entry.disposed) return;
    entry.disposed = true;
    if (entry.stopTimer !== null) clearTimeout(entry.stopTimer);
    this.clearRetry(entry);
    entry.subscribers.clear();
    entry.connection.off('NotificacionNueva');
    if (this.active === entry) this.active = null;
    const pendingStart = entry.startPromise ?? Promise.resolve();
    const stopping = pendingStart
      .then(() => entry.connection.stop())
      .catch((reason: unknown) => {
        console.error('No se pudo cerrar SignalR para notificaciones globales.', reason);
      });
    this.stopPromise = Promise.all([this.stopPromise, stopping]).then(() => undefined);
  }
}

export const notificacionHubService = new NotificacionHubService();
