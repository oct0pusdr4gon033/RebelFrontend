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
  op: { creadoPor?: string; creadoPorUsuarioId?: string } | Oportunidad,
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

/**
 * Determina si la oportunidad cuenta con la acreditación oficial de Perú Compras (OCAM / documento oficial).
 */
export function tieneAcreditacionPeruCompras(op: Oportunidad): boolean {
  if (op.estado === 'Aceptada por Perú Compras' || (op.estado as string) === 'Aceptada por Peru Compras') return true;
  if (['Cotización', 'OC_RECIBIDA', 'OC_ACEPTADA', 'ENTREGADA'].includes(op.estado)) return true;
  if (op.ordenCompra?.nroOCAM && (op.ordenCompra?.archivoOCUrl || op.ordenCompra?.nroExpediente)) return true;
  return false;
}

/**
 * REGLA DE NEGOCIO 1:
 * Después de la fecha de vencimiento que se llena en la oportunidad, si hasta entonces
 * no se subió el documento que acredite que Perú Compras nos asignó la oportunidad (OCAM),
 * debemos marcarla como desestimada:
 * - Si fue aceptada por el administrador -> "Aceptada Desestimada"
 * - Si estaba en licitación / competencia -> "Desestimada"
 */
export function evaluarReglaVencimientoOportunidad(op: Oportunidad): {
  estaVencidaSinOCAM: boolean;
  estadoEfectivo: Oportunidad['estado'];
  motivoDesestimacion?: string;
} {
  // Si ya se encuentra en un estado desestimado
  if (op.estado === 'Desestimada' || op.estado === 'Aceptada Desestimada') {
    return {
      estaVencidaSinOCAM: false,
      estadoEfectivo: op.estado,
      motivoDesestimacion: op.motivoDesestimacion ?? undefined,
    };
  }

  // Si ya tiene acreditación oficial de Perú Compras
  if (tieneAcreditacionPeruCompras(op)) {
    return {
      estaVencidaSinOCAM: false,
      estadoEfectivo: op.estado,
    };
  }

  // Evaluar vencimiento de la convocatoria
  if (op.fechaVencimiento) {
    const timeVenc = new Date(op.fechaVencimiento).getTime();
    if (!isNaN(timeVenc) && timeVenc < Date.now()) {
      // Vencida sin documento oficial OCAM de Perú Compras
      if (op.estado === 'Aceptada por el Administrador' || op.estado === 'Adjudicada') {
        return {
          estaVencidaSinOCAM: true,
          estadoEfectivo: 'Aceptada Desestimada',
          motivoDesestimacion:
            op.motivoDesestimacion ||
            'Vencida: Se superó la fecha límite oficial sin registrar el documento oficial de asignación OCAM de Perú Compras.',
        };
      }

      if (['En Licitación', 'En Competencia', 'Asignación de Oportunidad', 'Por Vencer'].includes(op.estado)) {
        return {
          estaVencidaSinOCAM: true,
          estadoEfectivo: 'Desestimada',
          motivoDesestimacion:
            op.motivoDesestimacion ||
            'Vencida: Convocatoria finalizada sin acreditación oficial de Perú Compras.',
        };
      }
    }
  }

  return {
    estaVencidaSinOCAM: false,
    estadoEfectivo: op.estado,
    motivoDesestimacion: op.motivoDesestimacion ?? undefined,
  };
}

/**
 * Aplica automáticamente la Regla de Negocio 1 a una oportunidad
 */
export function normalizarOportunidadConReglas(op: Oportunidad): Oportunidad {
  const evaluacion = evaluarReglaVencimientoOportunidad(op);
  if (evaluacion.estaVencidaSinOCAM) {
    return {
      ...op,
      estado: evaluacion.estadoEfectivo,
      motivoDesestimacion: evaluacion.motivoDesestimacion || op.motivoDesestimacion,
    };
  }
  return op;
}
