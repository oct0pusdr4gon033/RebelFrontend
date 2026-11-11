import type {
  CrearSolicitudRequest,
  EvidenciaSolicitud,
  ResolverSolicitudRequest,
  SolicitudHistorialResponse,
  SolicitudResponse,
  SubsanarSolicitudRequest,
} from '../Dtos/Solicitud';
import { API_BASE } from '../../env/envoviment';
import { getAuthHeaders } from './oportunidades.service';

const SOLICITUDES_BASE = `${API_BASE}/api/Solicitudes`;

const NETWORK_ERROR_MESSAGE =
  'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.';
const INTERNAL_ERROR_MESSAGE =
  'Ocurrió un error interno del servidor. Inténtalo nuevamente más tarde.';

export class SolicitudHttpError extends Error {
  readonly status: number | null;

  constructor(
    message: string,
    status: number | null,
  ) {
    super(message);
    this.name = 'SolicitudHttpError';
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

async function fetchSolicitud(
  url: string,
  init: RequestInit,
  fallback: string,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (reason) {
    if (reason instanceof TypeError) {
      throw new SolicitudHttpError(NETWORK_ERROR_MESSAGE, null);
    }
    throw reason;
  }

  if (!response.ok) {
    throw new SolicitudHttpError(
      await getErrorMessage(response, fallback),
      response.status,
    );
  }

  return response;
}

function getFileNameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;

  const encodedName = header.match(/filename\*\s*=\s*(?:[^']*'[^']*')?([^;]+)/i)?.[1]?.trim();
  if (encodedName) {
    const value = encodedName.replace(/^["']|["']$/g, '');
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  const plainName = header.match(/filename\s*=\s*("[^"]*"|[^;]+)/i)?.[1]?.trim();
  return plainName?.replace(/^["']|["']$/g, '') ?? null;
}

async function descargarEvidencia(
  url: string,
  solicitudId: number,
  nombreArchivoFallback?: string | null,
): Promise<EvidenciaSolicitud> {
  const response = await fetchSolicitud(
    url,
    { headers: getAuthHeaders() },
    'No se pudo descargar la evidencia.',
  ).catch((reason: unknown) => {
    if (reason instanceof SolicitudHttpError && reason.status === 404) {
      throw new SolicitudHttpError('No se encontró evidencia adjunta para esta solicitud.', 404);
    }
    throw reason;
  });
  const nombreArchivo =
    getFileNameFromContentDisposition(response.headers.get('Content-Disposition')) ||
    nombreArchivoFallback ||
    `evidencia-solicitud-${solicitudId}`;

  return {
    blob: await response.blob(),
    nombreArchivo,
  };
}

async function postJson<T>(
  url: string,
  body: unknown,
  fallback: string,
): Promise<T> {
  const response = await fetchSolicitud(
    url,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    },
    fallback,
  );
  return response.json();
}

export async function crearSolicitud(
  solicitud: CrearSolicitudRequest,
): Promise<SolicitudResponse> {
  const formData = new FormData();
  formData.append('tipo', String(solicitud.tipo));
  formData.append('titulo', solicitud.titulo);
  formData.append('descripcion', solicitud.descripcion);
  formData.append('fechaInicio', solicitud.fechaInicio);
  formData.append('fechaFin', solicitud.fechaFin);
  if (solicitud.archivo) {
    formData.append('archivo', solicitud.archivo);
  }

  const headers = new Headers(getAuthHeaders());
  headers.delete('Content-Type');

  const response = await fetchSolicitud(
    `${SOLICITUDES_BASE}/con-evidencia`,
    {
      method: 'POST',
      headers,
      body: formData,
    },
    'No se pudo registrar la solicitud.',
  );

  return response.json();
}

export async function obtenerMisSolicitudes(): Promise<SolicitudResponse[]> {
  const response = await fetchSolicitud(
    `${SOLICITUDES_BASE}/mi`,
    { headers: getAuthHeaders() },
    'No se pudieron consultar tus solicitudes.',
  );

  return response.json();
}

export async function obtenerMiSolicitudPorId(id: number): Promise<SolicitudResponse> {
  const response = await fetchSolicitud(
    `${SOLICITUDES_BASE}/mi/${id}`,
    { headers: getAuthHeaders() },
    'No se pudo consultar la solicitud.',
  );

  return response.json();
}

export async function obtenerHistorialMiSolicitud(
  id: number,
): Promise<SolicitudHistorialResponse[]> {
  const response = await fetchSolicitud(
    `${SOLICITUDES_BASE}/mi/${id}/historial`,
    { headers: getAuthHeaders() },
    'No se pudo consultar el historial de la solicitud.',
  );
  return response.json();
}

export async function descargarEvidenciaMiSolicitud(
  id: number,
  nombreArchivoFallback?: string | null,
): Promise<EvidenciaSolicitud> {
  return descargarEvidencia(
    `${SOLICITUDES_BASE}/mi/${id}/evidencia`,
    id,
    nombreArchivoFallback,
  );
}

export async function descargarEvidenciaMiSolicitudPorId(
  id: number,
  evidenciaId: number,
  nombreArchivoFallback?: string | null,
): Promise<EvidenciaSolicitud> {
  return descargarEvidencia(
    `${SOLICITUDES_BASE}/mi/${id}/evidencias/${evidenciaId}`,
    id,
    nombreArchivoFallback,
  );
}

export async function subsanarSolicitud(
  id: number,
  solicitud: SubsanarSolicitudRequest,
): Promise<SolicitudResponse> {
  const formData = new FormData();
  formData.append('tipo', String(solicitud.tipo));
  formData.append('titulo', solicitud.titulo);
  formData.append('descripcion', solicitud.descripcion);
  formData.append('fechaInicio', solicitud.fechaInicio);
  formData.append('fechaFin', solicitud.fechaFin);
  formData.append('evidenciaReferencia', solicitud.evidenciaReferencia.trim());
  formData.append('comentario', solicitud.comentario);
  solicitud.archivos.forEach((archivo) => {
    formData.append('archivos', archivo, archivo.name);
  });

  const headers = new Headers(getAuthHeaders());
  headers.delete('Content-Type');
  const response = await fetchSolicitud(
    `${SOLICITUDES_BASE}/mi/${id}/subsanaciones`,
    {
      method: 'POST',
      headers,
      body: formData,
    },
    'No se pudo enviar la subsanación.',
  );
  return response.json();
}

export async function obtenerSolicitudes(): Promise<SolicitudResponse[]> {
  const response = await fetchSolicitud(
    SOLICITUDES_BASE,
    { headers: getAuthHeaders() },
    'No se pudieron consultar las solicitudes.',
  );

  return response.json();
}

export async function obtenerHistorialSolicitud(
  id: number,
): Promise<SolicitudHistorialResponse[]> {
  const response = await fetchSolicitud(
    `${SOLICITUDES_BASE}/${id}/historial`,
    { headers: getAuthHeaders() },
    'No se pudo consultar el historial de la solicitud.',
  );
  return response.json();
}

export async function descargarEvidenciaSolicitud(
  id: number,
  nombreArchivoFallback?: string | null,
): Promise<EvidenciaSolicitud> {
  return descargarEvidencia(
    `${SOLICITUDES_BASE}/${id}/evidencia`,
    id,
    nombreArchivoFallback,
  );
}

export async function descargarEvidenciaSolicitudPorId(
  id: number,
  evidenciaId: number,
  nombreArchivoFallback?: string | null,
): Promise<EvidenciaSolicitud> {
  return descargarEvidencia(
    `${SOLICITUDES_BASE}/${id}/evidencias/${evidenciaId}`,
    id,
    nombreArchivoFallback,
  );
}

export async function observarSolicitud(
  id: number,
  comentario: string,
): Promise<SolicitudResponse> {
  return postJson<SolicitudResponse>(
    `${SOLICITUDES_BASE}/${id}/observar`,
    { comentario },
    'No se pudo solicitar la subsanación.',
  );
}

export async function obtenerSolicitudesPorEmpleado(
  empleadoId: number,
): Promise<SolicitudResponse[]> {
  const response = await fetchSolicitud(
    `${SOLICITUDES_BASE}/empleado/${empleadoId}`,
    { headers: getAuthHeaders() },
    'No se pudieron consultar las solicitudes del empleado.',
  );

  return response.json();
}

export async function aprobarSolicitud(
  id: number,
  observacionResolucion: string | null,
): Promise<SolicitudResponse> {
  const request: ResolverSolicitudRequest = {
    estado: 1,
    observacionResolucion,
  };
  const response = await fetchSolicitud(
    `${SOLICITUDES_BASE}/${id}/aprobar`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    },
    'No se pudo aprobar la solicitud.',
  );

  return response.json();
}

export async function rechazarSolicitud(
  id: number,
  observacionResolucion: string | null,
): Promise<SolicitudResponse> {
  const request: ResolverSolicitudRequest = {
    estado: 2,
    observacionResolucion,
  };
  const response = await fetchSolicitud(
    `${SOLICITUDES_BASE}/${id}/rechazar`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    },
    'No se pudo rechazar la solicitud.',
  );

  return response.json();
}
