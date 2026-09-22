import type { SedeDto, CrearSedeRequest, ActualizarSedeRequest } from '../Dtos/Sede';
import { getAuthHeaders } from './oportunidades.service';

import { API_BASE } from '../../env/envoviment';

export async function getSedes(incluirInactivas = false): Promise<SedeDto[]> {
  const url = `${API_BASE}/api/sedes?incluirInactivas=${incluirInactivas}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Error al obtener sedes');
  return res.json();
}

export async function getSedeById(id: number): Promise<SedeDto> {
  const res = await fetch(`${API_BASE}/api/sedes/${id}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Error al obtener sede ${id}`);
  return res.json();
}

export async function createSede(data: CrearSedeRequest): Promise<SedeDto> {
  const res = await fetch(`${API_BASE}/api/sedes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ mensaje: 'Error al crear sede' }));
    throw new Error(err.mensaje ?? 'Error al crear sede');
  }
  return res.json();
}

export async function updateSede(id: number, data: ActualizarSedeRequest): Promise<SedeDto> {
  const res = await fetch(`${API_BASE}/api/sedes/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ mensaje: 'Error al actualizar sede' }));
    throw new Error(err.mensaje ?? 'Error al actualizar sede');
  }
  return res.json();
}

/** Soft-delete: deshabilita la sede */
export async function deleteSede(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/sedes/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ mensaje: 'Error al eliminar sede' }));
    throw new Error(err.mensaje ?? 'Error al eliminar sede');
  }
}

/** Restaura una sede eliminada lógicamente */
export async function restaurarSede(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/sedes/${id}/restaurar`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ mensaje: 'Error al restaurar sede' }));
    throw new Error(err.mensaje ?? 'Error al restaurar sede');
  }
}
