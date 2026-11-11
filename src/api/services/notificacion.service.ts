import type {
  NotificacionDto,
  NotificacionesPageDto,
} from '../Dtos/Notificacion';
import { API_BASE } from '../../env/envoviment';

const NOTIFICACIONES_BASE = `${API_BASE}/api/Notificaciones`;

export class NotificacionHttpError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = 'NotificacionHttpError';
    this.status = status;
  }
}

async function request<T>(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${NOTIFICACIONES_BASE}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
    });
  } catch (reason) {
    if (reason instanceof TypeError) {
      throw new NotificacionHttpError(
        'No se pudo conectar con el servicio de notificaciones.',
        null,
      );
    }
    throw reason;
  }

  if (!response.ok) {
    let message = `No se pudo completar la operación de notificaciones (${response.status}).`;
    if (response.status === 401) message = 'Tu sesión no es válida o ha expirado.';
    else if (response.status === 403) message = 'No tienes permiso para consultar estas notificaciones.';
    else {
      try {
        const body: unknown = await response.json();
        if (typeof body === 'object' && body !== null) {
          const error = body as { message?: unknown; title?: unknown; detail?: unknown };
          const serverMessage = [error.message, error.title, error.detail].find(
            (value): value is string => typeof value === 'string' && value.trim().length > 0,
          );
          if (serverMessage) message = serverMessage;
        }
      } catch {
        // Keep the HTTP status message when the response has no JSON body.
      }
    }
    throw new NotificacionHttpError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function obtenerNotificaciones(
  token: string,
  page = 1,
  pageSize = 20,
): Promise<NotificacionesPageDto> {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  return request<NotificacionesPageDto>(token, `?${query.toString()}`);
}

export async function obtenerConteoNoLeidas(token: string): Promise<number> {
  const count = await request<unknown>(token, '/unread-count');
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) {
    throw new Error('El servidor devolvió un conteo de notificaciones inválido.');
  }
  return count;
}

export function marcarNotificacionLeida(token: string, id: number): Promise<void> {
  return request<void>(token, `/${id}/read`, { method: 'PUT' });
}

export async function marcarTodasNotificacionesLeidas(token: string): Promise<number> {
  const markedCount = await request<unknown>(token, '/read-all', { method: 'PUT' });
  if (typeof markedCount !== 'number' || !Number.isInteger(markedCount) || markedCount < 0) {
    throw new Error('El servidor devolvió una cantidad marcada inválida.');
  }
  return markedCount;
}

export function isNotificacionDto(value: unknown): value is NotificacionDto {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<NotificacionDto>;
  return (
    typeof candidate.id === 'number' &&
    Number.isInteger(candidate.id) &&
    typeof candidate.tipo === 'number' &&
    Number.isInteger(candidate.tipo) &&
    typeof candidate.titulo === 'string' &&
    typeof candidate.mensaje === 'string' &&
    typeof candidate.fechaCreacion === 'string' &&
    typeof candidate.leida === 'boolean' &&
    (candidate.fechaLectura === null || typeof candidate.fechaLectura === 'string') &&
    (candidate.tipoEntidadRelacionada === null ||
      typeof candidate.tipoEntidadRelacionada === 'string') &&
    (candidate.idEntidadRelacionada === null ||
      typeof candidate.idEntidadRelacionada === 'number')
  );
}
