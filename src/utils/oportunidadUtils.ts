import type { Oportunidad } from '../types/oportunidades';
import type { EmpleadoDto } from '../api/Dtos/Empleado';

/**
 * Determina si una oportunidad de licitación fue registrada por el usuario autenticado.
 * Verifica por:
 * 1. CreadoPorUsuarioId (Guid de Identity)
 * 2. Correo electrónico del usuario (userEmail / email)
 * 3. Nombre de usuario de Identity (userNombre)
 * 4. Nombre completo del empleado
 * 5. Nombres y apellidos combinados
 */
export function isOportunidadOwner(
  op: Oportunidad,
  empleado?: EmpleadoDto | null,
  userEmail?: string | null
): boolean {
  if (!empleado && !userEmail) return false;

  // 1. Coincidencia directa por ID único de Identity (el más seguro y confiable)
  if (op.creadoPorUsuarioId && empleado?.userId) {
    if (op.creadoPorUsuarioId.toLowerCase().trim() === empleado.userId.toLowerCase().trim()) {
      return true;
    }
  }

  const creator = (op.creadoPor || '').toLowerCase().trim();
  if (!creator) return false;

  // 2. Coincidencia por correo electrónico
  const emails = [userEmail, empleado?.userEmail, empleado?.email].filter(Boolean) as string[];
  for (const e of emails) {
    const val = e.toLowerCase().trim();
    if (val && (creator === val || creator.includes(val) || val.includes(creator))) {
      return true;
    }
  }

  // 3. Coincidencia por UserName de Identity
  if (empleado?.userNombre) {
    const un = empleado.userNombre.toLowerCase().trim();
    if (un && (creator === un || creator.includes(un) || un.includes(creator))) {
      return true;
    }
  }

  // 4. Coincidencia por nombre completo del empleado
  if (empleado?.nombreCompleto) {
    const fn = empleado.nombreCompleto.toLowerCase().trim();
    if (fn && (creator === fn || creator.includes(fn) || fn.includes(creator))) {
      return true;
    }
  }

  // 5. Coincidencia por nombres y apellidos combinados
  const partial = `${empleado?.nombres || ''} ${empleado?.apellidos || ''}`.toLowerCase().trim();
  if (partial && (creator === partial || creator.includes(partial) || partial.includes(creator))) {
    return true;
  }

  return false;
}
