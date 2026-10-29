import type { Oportunidad } from '../types/oportunidades';
import type { OportunidadApiResponse } from '../api/services/oportunidades.service';

/**
 * Forma mínima que se necesita para validar si una oportunidad está completa.
 * Permite reutilizar la misma regla con el modelo de UI (`Oportunidad`)
 * y con la respuesta cruda del backend (`OportunidadApiResponse`).
 */
export interface OportunidadValidable {
  marcas?: unknown[] | null;
  tieneAcuerdoMarco: boolean;
  fechaVencimiento?: string | null;
  empresaId?: number | null;
  entidadConvocante?: string | null;
  items?: { numeroParte?: string; cantidad?: number; limiteUnitario?: number }[] | null;
}

/** Estados terminales en los que ya no tiene sentido exigir datos faltantes. */
const ESTADOS_SIN_ALERTA = ['Desestimada', 'Aceptada Desestimada'];

/**
 * Devuelve la lista (legible) de datos obligatorios que faltan en la oportunidad.
 * Lista vacía = oportunidad completa.
 *
 * Obligatorios: marca(s), Acuerdo Marco, fecha de vencimiento, empresa o entidad,
 * y al menos 1 producto con N° de parte, cantidad > 0 y límite unitario > 0.
 */
export function obtenerCamposFaltantes(op: OportunidadValidable): string[] {
  const faltantes: string[] = [];

  if (!op.marcas || op.marcas.length === 0) faltantes.push('Marca(s)');
  if (!op.tieneAcuerdoMarco) faltantes.push('Acuerdo Marco');
  if (!op.fechaVencimiento || !op.fechaVencimiento.trim()) faltantes.push('Fecha de vencimiento');
  if (!op.empresaId && !(op.entidadConvocante ?? '').trim()) faltantes.push('Empresa / Entidad');

  const items = (op.items ?? []).filter((it) => (it.numeroParte ?? '').trim());
  if (items.length === 0) {
    faltantes.push('Productos (al menos 1)');
  } else {
    if (items.some((it) => !it.cantidad || Number(it.cantidad) <= 0)) {
      faltantes.push('Cantidad de productos');
    }
    if (items.some((it) => it.limiteUnitario == null || Number(it.limiteUnitario) <= 0)) {
      faltantes.push('Límite unitario de productos');
    }
  }

  return faltantes;
}

export function oportunidadAValidable(op: Oportunidad): OportunidadValidable {
  return {
    marcas: op.marcas,
    tieneAcuerdoMarco: !!op.acuerdoMarco,
    fechaVencimiento: op.fechaVencimiento,
    empresaId: op.empresaId,
    entidadConvocante: op.entidadConvocante,
    items: op.items,
  };
}

export function respuestaApiAValidable(op: OportunidadApiResponse): OportunidadValidable {
  return {
    marcas: op.marcas,
    tieneAcuerdoMarco: !!op.acuerdoMarcoId,
    fechaVencimiento: op.fechaVencimientoLicitacion,
    empresaId: op.empresaId,
    entidadConvocante: op.entidadConvocante,
    items: op.productos,
  };
}

/** Campos faltantes de una oportunidad del modelo de UI. */
export function camposFaltantesOportunidad(op: Oportunidad): string[] {
  return obtenerCamposFaltantes(oportunidadAValidable(op));
}

/**
 * REGLA DE NEGOCIO: OPORTUNIDAD INMUTABLE.
 * Una oportunidad con todos sus datos obligatorios fue validada con la doble
 * confirmación de la ejecutiva, por lo que ya NO se puede editar.
 * Las que están incompletas (borrador del Guardado Exprés) siguen editables.
 */
export function esOportunidadInmutable(op: Oportunidad): boolean {
  return camposFaltantesOportunidad(op).length === 0;
}

/** ¿Debe alertarse a la administradora por datos faltantes en esta oportunidad? */
export function requiereAlertaAdmin(op: OportunidadApiResponse): boolean {
  if (ESTADOS_SIN_ALERTA.includes(op.estado)) return false;
  return obtenerCamposFaltantes(respuestaApiAValidable(op)).length > 0;
}
