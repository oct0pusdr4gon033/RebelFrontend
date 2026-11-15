import { API_BASE } from '../../env/envoviment';
import type {
  AgendaLlamada,
  ConfirmarCargaLlamadasRequest,
  DirectorioFiltro,
  DirectorioLlamada,
  EjecutivaDisponible,
  EstadoCuotaLlamadas,
  ExcepcionLlamada,
  ExcepcionLlamadaRequest,
  HistorialLlamadasFiltro,
  LlamadaResponse,
  PagedResult,
  PrevisualizacionCargaLlamadas,
  RegistrarLlamadaRequest,
  ResultadoCargaLlamadas,
  SupervisionLlamadas,
} from '../Dtos/Llamada';

export class LlamadasApiError extends Error {
  status: number;
  codigo?: string;

  constructor(message: string, status: number, codigo?: string) {
    super(message);
    this.name = 'LlamadasApiError';
    this.status = status;
    this.codigo = codigo;
  }
}

function getAuthHeaders(json = true): HeadersInit {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (json) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

function extractError(payload: unknown, fallback: string): { message: string; codigo?: string } {
  if (!payload || typeof payload !== 'object') return { message: fallback };

  const data = payload as Record<string, unknown>;
  const codigo = typeof data.codigo === 'string' ? data.codigo : undefined;
  const mensaje =
    (typeof data.mensaje === 'string' && data.mensaje) ||
    (typeof data.message === 'string' && data.message) ||
    (typeof data.title === 'string' && data.title) ||
    '';

  if (mensaje) return { message: mensaje, codigo };

  const errors = data.errors;
  if (errors && typeof errors === 'object') {
    const first = Object.values(errors as Record<string, unknown>)[0];
    if (Array.isArray(first) && typeof first[0] === 'string') {
      return { message: first[0], codigo };
    }
  }

  return { message: fallback, codigo };
}

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const error = extractError(payload, fallback);
    throw new LlamadasApiError(error.message, response.status, error.codigo);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function obtenerMiCuota(): Promise<EstadoCuotaLlamadas> {
  const response = await fetch(`${API_BASE}/api/Llamadas/mi-cuota`, {
    headers: getAuthHeaders(false),
  });
  return parseResponse<EstadoCuotaLlamadas>(
    response,
    'No se pudo consultar la cuota de llamadas.'
  );
}

export async function obtenerDirectorioLlamadas(
  filtro: DirectorioFiltro = {}
): Promise<PagedResult<DirectorioLlamada>> {
  const query = buildQuery({
    busqueda: filtro.busqueda,
    semaforizacion: filtro.semaforizacion,
    soloPendientes: filtro.soloPendientes,
    ejecutivaId: filtro.ejecutivaId,
    page: filtro.page,
    pageSize: filtro.pageSize,
  });
  const response = await fetch(`${API_BASE}/api/Llamadas/directorio${query}`, {
    headers: getAuthHeaders(false),
  });
  return parseResponse<PagedResult<DirectorioLlamada>>(
    response,
    'No se pudo cargar el directorio de llamadas.'
  );
}

export async function obtenerHistorialLlamadas(
  filtro: HistorialLlamadasFiltro = {}
): Promise<PagedResult<LlamadaResponse>> {
  const query = buildQuery({
    fechaInicio: filtro.fechaInicio,
    fechaFin: filtro.fechaFin,
    ejecutivaId: filtro.ejecutivaId,
    resultado: filtro.resultado,
    page: filtro.page,
    pageSize: filtro.pageSize,
  });
  const response = await fetch(`${API_BASE}/api/Llamadas/historial${query}`, {
    headers: getAuthHeaders(false),
  });
  return parseResponse<PagedResult<LlamadaResponse>>(
    response,
    'No se pudo cargar el historial de llamadas.'
  );
}

export async function obtenerAgendaLlamadas(): Promise<AgendaLlamada[]> {
  const response = await fetch(`${API_BASE}/api/Llamadas/agenda`, {
    headers: getAuthHeaders(false),
  });
  return parseResponse<AgendaLlamada[]>(
    response,
    'No se pudo cargar la agenda de llamadas.'
  );
}

export async function registrarLlamada(
  data: RegistrarLlamadaRequest
): Promise<LlamadaResponse> {
  const response = await fetch(`${API_BASE}/api/Llamadas`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return parseResponse<LlamadaResponse>(response, 'No se pudo registrar la llamada.');
}

export async function programarLlamada(
  llamadaId: number,
  proximaLlamadaProgramada: string
): Promise<LlamadaResponse> {
  const response = await fetch(`${API_BASE}/api/Llamadas/${llamadaId}/programar`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ proximaLlamadaProgramada }),
  });
  return parseResponse<LlamadaResponse>(response, 'No se pudo programar la llamada.');
}

export async function obtenerSupervisionLlamadas(
  fecha?: string
): Promise<SupervisionLlamadas> {
  const query = buildQuery({ fecha });
  const response = await fetch(`${API_BASE}/api/Llamadas/supervision${query}`, {
    headers: getAuthHeaders(false),
  });
  return parseResponse<SupervisionLlamadas>(
    response,
    'No se pudo cargar la supervisión de llamadas.'
  );
}

export async function obtenerEjecutivasDisponibles(): Promise<EjecutivaDisponible[]> {
  const response = await fetch(`${API_BASE}/api/Llamadas/ejecutivas`, {
    headers: getAuthHeaders(false),
  });
  return parseResponse<EjecutivaDisponible[]>(
    response,
    'No se pudieron cargar las ejecutivas.'
  );
}

export async function crearExcepcionLlamada(
  data: ExcepcionLlamadaRequest
): Promise<ExcepcionLlamada> {
  const response = await fetch(`${API_BASE}/api/Llamadas/excepciones`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return parseResponse<ExcepcionLlamada>(
    response,
    'No se pudo crear el desbloqueo excepcional.'
  );
}

export async function revocarExcepcionLlamada(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/api/Llamadas/excepciones/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(false),
  });
  await parseResponse<void>(response, 'No se pudo revocar el desbloqueo.');
}

export async function previsualizarCargaLlamadas(
  archivo: File
): Promise<PrevisualizacionCargaLlamadas> {
  const form = new FormData();
  form.append('archivo', archivo);
  const response = await fetch(`${API_BASE}/api/Llamadas/carga-masiva/previsualizar`, {
    method: 'POST',
    headers: getAuthHeaders(false),
    body: form,
  });
  return parseResponse<PrevisualizacionCargaLlamadas>(
    response,
    'No se pudo previsualizar el archivo de llamadas.'
  );
}

export async function confirmarCargaLlamadas(
  archivo: File,
  data: ConfirmarCargaLlamadasRequest
): Promise<ResultadoCargaLlamadas> {
  const form = new FormData();
  form.append('archivo', archivo);
  form.append('modoAsignacion', data.modoAsignacion);
  if (data.ejecutivaIds?.length) {
    form.append('ejecutivaIds', data.ejecutivaIds.join(','));
  }
  const response = await fetch(`${API_BASE}/api/Llamadas/carga-masiva/confirmar`, {
    method: 'POST',
    headers: getAuthHeaders(false),
    body: form,
  });
  return parseResponse<ResultadoCargaLlamadas>(
    response,
    'No se pudo confirmar la carga de llamadas.'
  );
}

export function notificarCambioLlamadas(): void {
  window.dispatchEvent(new Event('rq:llamadas-actualizadas'));
}
