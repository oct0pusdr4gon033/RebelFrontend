import type {
  AsistenciaDiariaResponseDto,
  MarcacionAsistenciaResponse,
  MiAsistenciaDiariaDto,
} from '../Dtos/Asistencia';
import { API_BASE } from '../../env/envoviment';
import { getAuthHeaders } from './oportunidades.service';

const ASISTENCIAS_BASE = `${API_BASE}/api/Asistencias`;

const NETWORK_ERROR_MESSAGE =
  'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.';
const INTERNAL_ERROR_MESSAGE =
  'Ocurrió un error interno del servidor. Inténtalo nuevamente más tarde.';

export class AsistenciaHttpError extends Error {
  readonly status: number | null;

  constructor(
    message: string,
    status: number | null,
  ) {
    super(message);
    this.name = 'AsistenciaHttpError';
    this.status = status;
  }

  get isNetworkError(): boolean {
    return this.status === null;
  }
}

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  if (response.status === 401) {
    return 'Tu sesión no es válida o ha expirado. Inicia sesión nuevamente';
  }
  if (response.status === 403) {
    return 'No tienes permisos para realizar esta operación';
  }

  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null) {
      const error = body as { mensaje?: unknown; message?: unknown; title?: unknown };
      for (const value of [error.mensaje, error.message, error.title]) {
        if (typeof value === 'string' && value.trim()) return value;
      }
    }
  } catch {
    // Use the status-specific fallback when the response has no readable JSON message.
  }

  if (response.status === 500) return INTERNAL_ERROR_MESSAGE;
  return fallback;
}

async function fetchAsistencia(
  url: string,
  init: RequestInit,
  fallback: string,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (reason) {
    if (reason instanceof TypeError) {
      throw new AsistenciaHttpError(NETWORK_ERROR_MESSAGE, null);
    }
    throw reason;
  }

  if (!response.ok) {
    throw new AsistenciaHttpError(
      await getErrorMessage(response, fallback),
      response.status,
    );
  }

  return response;
}

export async function registrarMiMarcacion(): Promise<MarcacionAsistenciaResponse> {
  const response = await fetchAsistencia(`${ASISTENCIAS_BASE}/mi/marcacion`, {
    method: 'POST',
    headers: getAuthHeaders(),
  }, 'No se pudo registrar la marcación.');

  return response.json();
}

export async function obtenerMiAsistenciaDiaria(fecha: string): Promise<MiAsistenciaDiariaDto> {
  const response = await fetchAsistencia(
    `${ASISTENCIAS_BASE}/mi/diaria?fecha=${encodeURIComponent(fecha)}`,
    { headers: getAuthHeaders() },
    'No se pudo consultar la asistencia del día.',
  );

  return response.json();
}

export async function obtenerMiHistorialAsistencia(
  fechaInicio: string,
  fechaFin: string,
): Promise<AsistenciaDiariaResponseDto[]> {
  const params = new URLSearchParams({ fechaInicio, fechaFin });
  const response = await fetchAsistencia(
    `${ASISTENCIAS_BASE}/mi/historial?${params.toString()}`,
    { headers: getAuthHeaders() },
    'No se pudo consultar el historial de asistencias.',
  );

  return response.json();
}

export async function obtenerAsistenciasPorEmpleado(
  empleadoId: number,
  fechaInicio: string,
  fechaFin: string,
): Promise<AsistenciaDiariaResponseDto[]> {
  const params = new URLSearchParams({ fechaInicio, fechaFin });
  const response = await fetchAsistencia(
    `${ASISTENCIAS_BASE}/empleados/${empleadoId}?${params.toString()}`,
    { headers: getAuthHeaders() },
    'No se pudieron consultar las asistencias del empleado.',
  );

  return response.json();
}

export async function obtenerAsistenciasPorSede(
  sedeId: number,
  fechaInicio: string,
  fechaFin: string,
): Promise<AsistenciaDiariaResponseDto[]> {
  const params = new URLSearchParams({ fechaInicio, fechaFin });
  const response = await fetchAsistencia(
    `${ASISTENCIAS_BASE}/sedes/${sedeId}?${params.toString()}`,
    { headers: getAuthHeaders() },
    'No se pudieron consultar las asistencias de la sede.',
  );

  return response.json();
}
