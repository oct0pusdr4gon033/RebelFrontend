import * as signalR from '@microsoft/signalr';
import { API_BASE } from '../env/envoviment';
import type { SessionAlert } from '../api/Dtos/Login';

type LoginAttemptCallback = (alert: SessionAlert) => void;
type SessionTerminatedCallback = (reason: string) => void;

class SessionHubService {
  private connection: signalR.HubConnection | null = null;
  private isConnecting = false;
  private currentUserId: string | null = null;
  private loginAttemptListeners: LoginAttemptCallback[] = [];
  private sessionTerminatedListeners: SessionTerminatedCallback[] = [];

  public async connect(userId: string, token?: string | null): Promise<void> {
    this.currentUserId = userId;

    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      // Si ya está conectado con el mismo usuario, asegurar registro
      const deviceName = this.getDeviceName();
      await this.connection.invoke('RegisterSession', userId, deviceName).catch(() => {});
      return;
    }

    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      const hubUrl = `${API_BASE}/hubs/session`;

      const builder = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => token ?? localStorage.getItem('token') ?? '',
          skipNegotiation: false,
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect([0, 1500, 3000, 5000, 10000])
        .configureLogging(signalR.LogLevel.Information);

      this.connection = builder.build();

      // Escuchar eventos desde el servidor
      this.connection.on('OnLoginAttemptDetected', (alert: SessionAlert) => {
        console.warn('⚠️ [SessionHub] Intento de login detectado en otro dispositivo:', alert);
        this.loginAttemptListeners.forEach((cb) => cb(alert));
      });

      this.connection.on('OnSessionTransferred', (data: { message?: string }) => {
        const msg = data?.message ?? 'Tu sesión fue transferida a otro dispositivo.';
        console.warn('⚠️ [SessionHub] Sesión transferida:', msg);
        this.sessionTerminatedListeners.forEach((cb) => cb(msg));
      });

      this.connection.on('OnSessionForcedOut', (data: { message?: string }) => {
        const msg = data?.message ?? 'Se inició sesión en otro dispositivo. Tu sesión anterior fue desconectada.';
        console.warn('⚠️ [SessionHub] Sesión forzada:', msg);
        this.sessionTerminatedListeners.forEach((cb) => cb(msg));
      });

      // Re-registrar al reconectar
      this.connection.onreconnected(async () => {
        if (this.currentUserId && this.connection) {
          const deviceName = this.getDeviceName();
          console.log('🔄 [SessionHub] Reconectado. Re-registrando sesión para:', this.currentUserId);
          await this.connection.invoke('RegisterSession', this.currentUserId, deviceName).catch(() => {});
        }
      });

      await this.connection.start();
      console.log('✅ [SessionHub] Conectado exitosamente. State:', this.connection.state);

      // Registrar sesión con UserId y nombre del dispositivo
      const deviceName = this.getDeviceName();
      await this.connection.invoke('RegisterSession', userId, deviceName);
    } catch (err) {
      console.error('❌ [SessionHub] Error al conectar con SignalR:', err);
    } finally {
      this.isConnecting = false;
    }
  }

  public async disconnect(): Promise<void> {
    this.currentUserId = null;
    if (this.connection) {
      try {
        await this.connection.stop();
        console.log('🛑 [SessionHub] Desconectado.');
      } catch {
        // ignore
      }
      this.connection = null;
    }
  }

  public onLoginAttempt(callback: LoginAttemptCallback): () => void {
    this.loginAttemptListeners.push(callback);
    return () => {
      this.loginAttemptListeners = this.loginAttemptListeners.filter((cb) => cb !== callback);
    };
  }

  public onSessionTerminated(callback: SessionTerminatedCallback): () => void {
    this.sessionTerminatedListeners.push(callback);
    return () => {
      this.sessionTerminatedListeners = this.sessionTerminatedListeners.filter((cb) => cb !== callback);
    };
  }

  private getDeviceName(): string {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'Móvil Android';
    if (/iPad|iPhone|iPod/.test(ua)) return 'iPhone / iPad';
    if (/windows/i.test(ua)) return 'PC con Windows';
    if (/macintosh/i.test(ua)) return 'Mac Apple';
    if (/linux/i.test(ua)) return 'Linux';
    return 'Navegador Web';
  }
}

export const sessionHubService = new SessionHubService();
