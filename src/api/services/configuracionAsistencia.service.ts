import type {
  HorarioSedeRequest,
  HorarioSedeResponse,
} from '../Dtos/HorarioSede';
import type {
  ExcepcionHorarioEmpleadoRequest,
  ExcepcionHorarioEmpleadoResponse,
} from '../Dtos/ExcepcionHorarioEmpleado';
import type {
  DiaNoLaborableRequest,
  DiaNoLaborableResponse,
} from '../Dtos/DiaNoLaborable';
import { API_BASE } from '../../env/envoviment';
import { getAuthHeaders } from './oportunidades.service';

const CONFIGURACION_ASISTENCIAS_BASE = `${API_BASE}/api/ConfiguracionAsistencias`;

async function getErrorMessage(
  response: Response,
  fallback: string,
  conflictFallback = 'Ya existe un horario para esta sede y día. Recarga la semana.',
): Promise<string> {
  try {
    const body = await response.json() as { mensaje?: string; message?: string; title?: string };
    if (response.status === 409) {
      return body.mensaje ?? body.message ?? body.title ?? conflictFallback;
    }
    if (response.status === 500) {
      const detail = body.mensaje ?? body.message ?? body.title ?? fallback;
      return `${detail} El servidor devolvió un error interno (HTTP 500); no se confirmó la operación.`;
    }
    return body.mensaje ?? body.message ?? body.title ?? fallback;
  } catch {
    if (response.status === 409) {
      return conflictFallback;
    }
    if (response.status === 500) {
      return `${fallback} El servidor devolvió un error interno (HTTP 500); no se confirmó la operación.`;
    }
    return fallback;
  }
}

export async function obtenerHorariosPorSede(sedeId: number): Promise<HorarioSedeResponse[]> {
  const response = await fetch(
    `${CONFIGURACION_ASISTENCIAS_BASE}/horarios/sede/${sedeId}`,
    { headers: getAuthHeaders() },
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'No se pudieron cargar los horarios de la sede.'));
  }

  return response.json();
}

export async function crearHorarioSede(
  horario: HorarioSedeRequest,
): Promise<HorarioSedeResponse> {
  const response = await fetch(`${CONFIGURACION_ASISTENCIAS_BASE}/horarios`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(horario),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'No se pudo registrar el horario.'));
  }

  return response.json();
}

export async function actualizarHorarioSede(
  id: number,
  horario: HorarioSedeRequest,
): Promise<HorarioSedeResponse> {
  const response = await fetch(`${CONFIGURACION_ASISTENCIAS_BASE}/horarios/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(horario),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'No se pudo actualizar el horario.'));
  }

  return response.json();
}

export async function obtenerExcepcionesPorEmpleado(
  empleadoId: number,
): Promise<ExcepcionHorarioEmpleadoResponse[]> {
  const response = await fetch(
    `${CONFIGURACION_ASISTENCIAS_BASE}/excepciones/empleado/${empleadoId}`,
    { headers: getAuthHeaders() },
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(
      response,
      'No se pudieron cargar las excepciones del empleado.',
      'El rango de fechas se solapa con otra excepción del empleado.',
    ));
  }

  return response.json();
}

export async function crearExcepcionHorario(
  excepcion: ExcepcionHorarioEmpleadoRequest,
): Promise<ExcepcionHorarioEmpleadoResponse> {
  const response = await fetch(`${CONFIGURACION_ASISTENCIAS_BASE}/excepciones`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(excepcion),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(
      response,
      'No se pudo registrar la excepción.',
      'El rango de fechas se solapa con otra excepción del empleado.',
    ));
  }

  return response.json();
}

export async function actualizarExcepcionHorario(
  id: number,
  excepcion: ExcepcionHorarioEmpleadoRequest,
): Promise<ExcepcionHorarioEmpleadoResponse> {
  const response = await fetch(`${CONFIGURACION_ASISTENCIAS_BASE}/excepciones/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(excepcion),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(
      response,
      'No se pudo actualizar la excepción.',
      'El rango de fechas se solapa con otra excepción del empleado.',
    ));
  }

  return response.json();
}

export interface DiasNoLaborablesQuery {
  fechaInicio: string;
  fechaFin: string;
  sedeId?: number;
}

export async function obtenerDiasNoLaborables(
  query: DiasNoLaborablesQuery,
): Promise<DiaNoLaborableResponse[]> {
  const params = new URLSearchParams({
    fechaInicio: query.fechaInicio,
    fechaFin: query.fechaFin,
  });
  if (query.sedeId !== undefined) params.set('sedeId', String(query.sedeId));

  const response = await fetch(
    `${CONFIGURACION_ASISTENCIAS_BASE}/dias-no-laborables?${params.toString()}`,
    { headers: getAuthHeaders() },
  );
  if (!response.ok) {
    throw new Error(await getErrorMessage(
      response,
      'No se pudieron consultar los días no laborables.',
      'Ya existe un día no laborable para esa fecha y ámbito.',
    ));
  }

  return response.json();
}

export async function crearDiaNoLaborable(
  diaNoLaborable: DiaNoLaborableRequest,
): Promise<DiaNoLaborableResponse> {
  const response = await fetch(`${CONFIGURACION_ASISTENCIAS_BASE}/dias-no-laborables`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(diaNoLaborable),
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(
      response,
      'No se pudo registrar el día no laborable.',
      'Ya existe un día no laborable para esa fecha y ámbito.',
    ));
  }

  return response.json();
}

export async function actualizarDiaNoLaborable(
  id: number,
  diaNoLaborable: DiaNoLaborableRequest,
): Promise<DiaNoLaborableResponse> {
  const response = await fetch(`${CONFIGURACION_ASISTENCIAS_BASE}/dias-no-laborables/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(diaNoLaborable),
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(
      response,
      'No se pudo actualizar el día no laborable.',
      'Ya existe un día no laborable para esa fecha y ámbito.',
    ));
  }

  return response.json();
}
