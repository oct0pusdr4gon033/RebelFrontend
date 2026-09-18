import type { UsuarioDto, CrearUsuarioRequest, ActualizarUsuarioRequest, RolDto } from '../Dtos/Usuario';
import { getAuthHeaders } from './oportunidades.service';

const API_BASE = 'https://localhost:7010';

export async function getUsuarios(incluirInactivos = false): Promise<UsuarioDto[]> {
  const url = `${API_BASE}/api/usuarios?incluirInactivos=${incluirInactivos}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Error al obtener usuarios');
  return res.json();
}

export async function getUsuarioById(id: string): Promise<UsuarioDto> {
  const res = await fetch(`${API_BASE}/api/usuarios/${id}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Error al obtener usuario ${id}`);
  return res.json();
}

export async function getRoles(): Promise<RolDto[]> {
  const res = await fetch(`${API_BASE}/api/usuarios/roles`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Error al obtener roles');
  return res.json();
}

export async function createUsuario(data: CrearUsuarioRequest): Promise<UsuarioDto> {
  const res = await fetch(`${API_BASE}/api/usuarios`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ mensaje: 'Error al crear usuario' }));
    throw new Error(err.mensaje ?? 'Error al crear usuario');
  }
  return res.json();
}

export async function updateUsuario(id: string, data: ActualizarUsuarioRequest): Promise<UsuarioDto> {
  const res = await fetch(`${API_BASE}/api/usuarios/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ mensaje: 'Error al actualizar usuario' }));
    throw new Error(err.mensaje ?? 'Error al actualizar usuario');
  }
  return res.json();
}

/** Soft-delete: deshabilita el usuario */
export async function deleteUsuario(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/usuarios/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ mensaje: 'Error al deshabilitar usuario' }));
    throw new Error(err.mensaje ?? 'Error al deshabilitar usuario');
  }
}

/** Restaura un usuario deshabilitado */
export async function restaurarUsuario(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/usuarios/${id}/restaurar`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ mensaje: 'Error al restaurar usuario' }));
    throw new Error(err.mensaje ?? 'Error al restaurar usuario');
  }
}
