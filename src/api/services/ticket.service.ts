import { API_BASE } from '../../env/envoviment';
import { getAuthHeaders } from './oportunidades.service';
import {
  TICKET_MAX_ARCHIVOS,
  TICKET_MAX_TAMANO_BYTES,
  TICKET_TIPOS_ARCHIVO_PERMITIDOS,
  type AgregarComentarioTicketRequest,
  type AsignarTicketRequest,
  type CambiarEstadoTicketRequest,
  type CrearTicketConEvidenciasRequest,
  type CrearTicketRequest,
  type TicketEvidenciaContenido,
  type TicketEvidenciaResponseDto,
  type TicketFiltroRequest,
  type TicketResponseDto,
  type TicketSeguimientoResponseDto,
  type TicketTecnicoAsignableDto,
} from '../Dtos/Ticket';

const TICKETS_BASE = `${API_BASE}/api/Tickets`;
const NETWORK_ERROR_MESSAGE =
  'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.';
const INTERNAL_ERROR_MESSAGE =
  'Ocurrió un error interno del servidor. Inténtalo nuevamente más tarde.';

export class TicketHttpError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = 'TicketHttpError';
    this.status = status;
  }

  get isNetworkError(): boolean {
    return this.status === null;
  }
}

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  if (response.status === 401) {
    return 'Tu sesión no es válida o ha expirado. Inicia sesión nuevamente.';
  }
  if (response.status === 403) {
    return 'No tienes permisos para realizar esta operación.';
  }
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null) {
      const error = body as {
        mensaje?: unknown;
        message?: unknown;
        title?: unknown;
        detail?: unknown;
      };
      for (const value of [error.mensaje, error.message, error.title, error.detail]) {
        if (typeof value === 'string' && value.trim()) return value;
      }

      if (typeof error === 'object' && 'errors' in body) {
        const errors = (body as { errors?: unknown }).errors;
        if (typeof errors === 'object' && errors !== null) {
          const messages = Object.values(errors)
            .flatMap((value) => Array.isArray(value) ? value : [])
            .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()));
          if (messages.length > 0) return messages.join(' ');
        }
      }
    }
  } catch {
    // Use the status-specific fallback when the response has no readable JSON message.
  }

  if (response.status === 500) return INTERNAL_ERROR_MESSAGE;
  if (response.status === 409) {
    return 'Conflicto de concurrencia: este ticket ya fue modificado por otra sesión.';
  }
  return fallback;
}

async function fetchTicket(
  url: string,
  init: RequestInit,
  fallback: string,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (reason) {
    if (reason instanceof TypeError) {
      throw new TicketHttpError(NETWORK_ERROR_MESSAGE, null);
    }
    throw reason;
  }

  if (!response.ok) {
    throw new TicketHttpError(
      await getErrorMessage(response, fallback),
      response.status,
    );
  }

  return response;
}

async function fetchJson<T>(
  url: string,
  init: RequestInit,
  fallback: string,
): Promise<T> {
  const response = await fetchTicket(url, init, fallback);
  return response.json() as Promise<T>;
}

function queryString(filtros?: TicketFiltroRequest): string {
  if (!filtros) return '';

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filtros)) {
    if (value !== undefined) query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

function jsonHeaders(): Headers {
  return new Headers(getAuthHeaders());
}

function formHeaders(): Headers {
  const headers = jsonHeaders();
  headers.delete('Content-Type');
  return headers;
}

function validarArchivosTicket(archivos: File[], permitirVacio: boolean): void {
  if ((!permitirVacio && archivos.length === 0) || archivos.length > TICKET_MAX_ARCHIVOS) {
    throw new Error(
      permitirVacio
        ? `Se permite adjuntar un máximo de ${TICKET_MAX_ARCHIVOS} archivos.`
        : `Adjunta entre 1 y ${TICKET_MAX_ARCHIVOS} archivos.`,
    );
  }

  let totalBytes = 0;
  for (const archivo of archivos) {
    const extension = archivo.name.slice(archivo.name.lastIndexOf('.')).toLowerCase();
    const contentType = TICKET_TIPOS_ARCHIVO_PERMITIDOS[
      extension as keyof typeof TICKET_TIPOS_ARCHIVO_PERMITIDOS
    ];
    if (!contentType || archivo.type.toLowerCase() !== contentType) {
      throw new Error('Solo se permiten archivos PDF, JPG, JPEG y PNG con tipo MIME coincidente.');
    }
    if (archivo.size <= 0) {
      throw new Error(`El archivo "${archivo.name}" está vacío.`);
    }

    totalBytes += archivo.size;
    if (totalBytes > TICKET_MAX_TAMANO_BYTES) {
      throw new Error('El tamaño combinado de los archivos no puede superar 5 MB.');
    }
  }
}

function buildFormData(
  ticket: CrearTicketRequest,
  archivos: File[],
): FormData {
  const formData = new FormData();
  formData.append('area', String(ticket.area));
  formData.append('categoria', String(ticket.categoria));
  formData.append('prioridad', String(ticket.prioridad));
  formData.append('descripcion', ticket.descripcion);
  if (ticket.evidenciaReferencia != null) {
    formData.append('evidenciaReferencia', ticket.evidenciaReferencia);
  }
  archivos.forEach((archivo) => formData.append('archivos', archivo, archivo.name));
  return formData;
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

function buildEvidenciaContenido(
  response: Response,
  blob: Blob,
  nombreArchivoFallback?: string | null,
): TicketEvidenciaContenido {
  return {
    blob,
    nombreArchivo:
      getFileNameFromContentDisposition(response.headers.get('Content-Disposition')) ||
      nombreArchivoFallback ||
      'evidencia-ticket',
    contentType: response.headers.get('Content-Type')?.split(';')[0] || blob.type,
  };
}

async function obtenerContenidoEvidencia(
  ticketId: number,
  evidenciaId: number,
  descargar: boolean,
  nombreArchivoFallback?: string | null,
): Promise<TicketEvidenciaContenido> {
  const query = new URLSearchParams({ descargar: String(descargar) });
  let response: Response;
  try {
    response = await fetchTicket(
      `${TICKETS_BASE}/${ticketId}/evidencias/${evidenciaId}/contenido?${query}`,
      { headers: getAuthHeaders() },
      'No se pudo obtener el archivo adjunto.',
    );
  } catch (reason) {
    if (reason instanceof TicketHttpError && reason.status === 404) {
      throw new TicketHttpError('No se encontró la evidencia adjunta del ticket.', 404);
    }
    throw reason;
  }

  const blob = await response.blob();
  return buildEvidenciaContenido(response, blob, nombreArchivoFallback);
}

export async function obtenerMisTickets(
  filtros?: TicketFiltroRequest,
): Promise<TicketResponseDto[]> {
  return fetchJson(
    `${TICKETS_BASE}/mi${queryString(filtros)}`,
    { headers: getAuthHeaders() },
    'No se pudieron consultar tus tickets.',
  );
}

export async function obtenerMiTicketPorId(id: number): Promise<TicketResponseDto> {
  return fetchJson(
    `${TICKETS_BASE}/mi/${id}`,
    { headers: getAuthHeaders() },
    'No se pudo consultar el ticket.',
  );
}

export async function obtenerMiSeguimientoTicket(
  id: number,
): Promise<TicketSeguimientoResponseDto> {
  return fetchJson(
    `${TICKETS_BASE}/mi/${id}/seguimiento`,
    { headers: getAuthHeaders() },
    'No se pudo consultar el seguimiento del ticket.',
  );
}

export async function obtenerTickets(
  filtros?: TicketFiltroRequest,
): Promise<TicketResponseDto[]> {
  return fetchJson(
    `${TICKETS_BASE}${queryString(filtros)}`,
    { headers: getAuthHeaders() },
    'No se pudieron consultar los tickets.',
  );
}

export async function obtenerTicketPorId(id: number): Promise<TicketResponseDto> {
  return fetchJson(
    `${TICKETS_BASE}/${id}`,
    { headers: getAuthHeaders() },
    'No se pudo consultar el ticket.',
  );
}

export async function obtenerSeguimientoTicket(
  id: number,
): Promise<TicketSeguimientoResponseDto> {
  return fetchJson(
    `${TICKETS_BASE}/${id}/seguimiento`,
    { headers: getAuthHeaders() },
    'No se pudo consultar el seguimiento del ticket.',
  );
}

export async function obtenerTecnicosAsignables(): Promise<TicketTecnicoAsignableDto[]> {
  return fetchJson(
    `${TICKETS_BASE}/tecnicos-asignables`,
    { headers: getAuthHeaders() },
    'No se pudieron consultar los técnicos asignables.',
  );
}

export async function crearTicket(ticket: CrearTicketRequest): Promise<TicketResponseDto> {
  return fetchJson(
    TICKETS_BASE,
    {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(ticket),
    },
    'No se pudo crear el ticket.',
  );
}

export async function crearTicketConEvidencias(
  request: CrearTicketConEvidenciasRequest,
): Promise<TicketResponseDto> {
  const archivos = request.archivos ?? [];
  validarArchivosTicket(archivos, true);
  const formData = buildFormData(request, archivos);
  return fetchJson(
    `${TICKETS_BASE}/con-evidencias`,
    {
      method: 'POST',
      headers: formHeaders(),
      body: formData,
    },
    'No se pudo crear el ticket con evidencias.',
  );
}

export async function agregarComentarioMiTicket(
  id: number,
  request: AgregarComentarioTicketRequest,
): Promise<TicketResponseDto> {
  return fetchJson(
    `${TICKETS_BASE}/mi/${id}/comentarios`,
    {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(request),
    },
    'No se pudo agregar el comentario.',
  );
}

export async function agregarComentarioTicket(
  id: number,
  request: AgregarComentarioTicketRequest,
): Promise<TicketResponseDto> {
  return fetchJson(
    `${TICKETS_BASE}/${id}/comentarios`,
    {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(request),
    },
    'No se pudo agregar el comentario.',
  );
}

export async function asignarTicket(
  id: number,
  request: AsignarTicketRequest,
): Promise<TicketResponseDto> {
  return fetchJson(
    `${TICKETS_BASE}/${id}/asignar`,
    {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify(request),
    },
    'No se pudo asignar el ticket.',
  );
}

export async function cambiarEstadoTicket(
  id: number,
  request: CambiarEstadoTicketRequest,
): Promise<TicketResponseDto> {
  return fetchJson(
    `${TICKETS_BASE}/${id}/estado`,
    {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify(request),
    },
    'No se pudo actualizar el estado del ticket.',
  );
}

export async function cambiarEstadoMiTicket(
  id: number,
  request: CambiarEstadoTicketRequest,
): Promise<TicketResponseDto> {
  return fetchJson(
    `${TICKETS_BASE}/mi/${id}/estado`,
    {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify(request),
    },
    'No se pudo actualizar el estado del ticket.',
  );
}

export async function agregarEvidenciasMiTicket(
  id: number,
  archivos: File[],
): Promise<TicketResponseDto> {
  validarArchivosTicket(archivos, false);
  const formData = new FormData();
  archivos.forEach((archivo) => formData.append('archivos', archivo, archivo.name));
  return fetchJson(
    `${TICKETS_BASE}/mi/${id}/evidencias`,
    {
      method: 'POST',
      headers: formHeaders(),
      body: formData,
    },
    'No se pudieron adjuntar archivos al ticket.',
  );
}

export async function agregarEvidenciasTicket(
  id: number,
  archivos: File[],
): Promise<TicketResponseDto> {
  validarArchivosTicket(archivos, false);
  const formData = new FormData();
  archivos.forEach((archivo) => formData.append('archivos', archivo, archivo.name));
  return fetchJson(
    `${TICKETS_BASE}/${id}/evidencias`,
    {
      method: 'POST',
      headers: formHeaders(),
      body: formData,
    },
    'No se pudieron adjuntar archivos al ticket.',
  );
}

export async function obtenerEvidenciasMiTicket(
  ticketId: number,
): Promise<TicketEvidenciaResponseDto[]> {
  return obtenerEvidenciasTicket(ticketId);
}

export async function obtenerEvidenciasTicket(
  ticketId: number,
): Promise<TicketEvidenciaResponseDto[]> {
  return fetchJson(
    `${TICKETS_BASE}/${ticketId}/evidencias`,
    { headers: getAuthHeaders() },
    'No se pudieron consultar las evidencias del ticket.',
  );
}

export async function visualizarTicketEvidencia(
  ticketId: number,
  evidenciaId: number,
  nombreArchivoFallback?: string | null,
): Promise<TicketEvidenciaContenido> {
  return obtenerContenidoEvidencia(
    ticketId,
    evidenciaId,
    false,
    nombreArchivoFallback,
  );
}

export async function descargarTicketEvidencia(
  ticketId: number,
  evidenciaId: number,
  nombreArchivoFallback?: string | null,
): Promise<TicketEvidenciaContenido> {
  return obtenerContenidoEvidencia(
    ticketId,
    evidenciaId,
    true,
    nombreArchivoFallback,
  );
}
