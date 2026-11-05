import { API_BASE } from '../../env/envoviment';
import type { AsistenciaEstadisticasPersonalesResponseDto } from '../Dtos/AsistenciaEstadisticas';
import type {
  TicketDashboardGlobalResponseDto,
} from '../Dtos/TicketEstadisticas';
import { getAuthHeaders } from './oportunidades.service';

export interface PeriodoEstadisticas {
  fechaInicio: string;
  fechaFin: string;
}

async function consultarEstadisticas<T>(
  endpoint: string,
  periodo: PeriodoEstadisticas,
  mensajeAlternativo: string,
): Promise<T> {
  const query = new URLSearchParams({
    fechaInicio: periodo.fechaInicio,
    fechaFin: periodo.fechaFin,
  });
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${endpoint}?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
  } catch (reason) {
    if (reason instanceof TypeError) {
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.');
    }
    throw reason;
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Tu sesión no es válida o ha expirado. Inicia sesión nuevamente.');
    }
    if (response.status === 403) {
      throw new Error('No tienes permisos para consultar estas estadísticas.');
    }

    let mensaje = mensajeAlternativo;
    try {
      const body: unknown = await response.json();
      if (typeof body === 'object' && body !== null && 'mensaje' in body) {
        const detalle = body.mensaje;
        if (typeof detalle === 'string' && detalle.trim()) mensaje = detalle;
      }
    } catch {
      if (response.status === 500) {
        mensaje = 'Ocurrió un error interno del servidor. Inténtalo nuevamente más tarde.';
      }
    }

    throw new Error(mensaje);
  }

  return response.json() as Promise<T>;
}

export function obtenerEstadisticasGlobalesTickets(
  periodo: PeriodoEstadisticas,
): Promise<TicketDashboardGlobalResponseDto> {
  return consultarEstadisticas(
    '/api/Tickets/estadisticas/globales',
    periodo,
    'No se pudieron consultar las estadísticas globales de tickets.',
  );
}

export function obtenerEstadisticasPersonalesAsistencia(
  periodo: PeriodoEstadisticas,
): Promise<AsistenciaEstadisticasPersonalesResponseDto> {
  return consultarEstadisticas(
    '/api/Asistencias/mi/estadisticas',
    periodo,
    'No se pudieron consultar tus estadísticas de asistencia.',
  );
}
