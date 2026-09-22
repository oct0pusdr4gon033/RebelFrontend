import type { EmpleadoDto, CrearEmpleadoRequest, ActualizarEmpleadoRequest } from '../Dtos/Empleado';
import { getAuthHeaders } from './oportunidades.service';

import { API_BASE } from '../../env/envoviment';

export async function getEmpleados(incluirInactivos = false): Promise<EmpleadoDto[]> {
  const url = `${API_BASE}/api/empleados?incluirInactivos=${incluirInactivos}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Error al obtener empleados');
  return res.json();
}

export async function getEmpleadoById(id: number): Promise<EmpleadoDto> {
  const res = await fetch(`${API_BASE}/api/empleados/${id}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Error al obtener empleado ${id}`);
  return res.json();
}

export async function createEmpleado(data: CrearEmpleadoRequest): Promise<EmpleadoDto> {
  const res = await fetch(`${API_BASE}/api/empleados`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ mensaje: 'Error al crear empleado' }));
    throw new Error(err.mensaje ?? 'Error al crear empleado');
  }
  return res.json();
}

export async function updateEmpleado(id: number, data: ActualizarEmpleadoRequest): Promise<EmpleadoDto> {
  const res = await fetch(`${API_BASE}/api/empleados/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ mensaje: 'Error al actualizar empleado' }));
    throw new Error(err.mensaje ?? 'Error al actualizar empleado');
  }
  return res.json();
}

/** Soft-delete: da de baja al empleado */
export async function deleteEmpleado(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/empleados/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ mensaje: 'Error al dar de baja al empleado' }));
    throw new Error(err.mensaje ?? 'Error al dar de baja al empleado');
  }
}

/** Restaura un empleado dado de baja */
export async function restaurarEmpleado(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/empleados/${id}/restaurar`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ mensaje: 'Error al restaurar empleado' }));
    throw new Error(err.mensaje ?? 'Error al restaurar empleado');
  }
}
