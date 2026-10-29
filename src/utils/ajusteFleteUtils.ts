import type { ProductoItem } from '../types/oportunidades/ProductoItem';
import type { OportunidadApiResponse } from '../api/services/oportunidades.service';

/** Monto de ajuste de flete por unidad según el % sobre el límite unitario. */
export function montoAjusteUnitario(limiteUnitario: number, porcentaje: number): number {
  return ((Number(limiteUnitario) || 0) * (Number(porcentaje) || 0)) / 100;
}

/** Monto total de ajuste de flete de un ítem (monto unitario x cantidad). */
export function montoAjusteItem(it: Pick<ProductoItem, 'limiteUnitario' | 'cantidad'>, porcentaje: number): number {
  return montoAjusteUnitario(it.limiteUnitario, porcentaje) * (Number(it.cantidad) || 0);
}

export function formatoSoles(valor: number): string {
  return valor.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Valida una solicitud de ajuste de flete.
 * Devuelve el mensaje de error o `null` si es válida.
 */
export function validarSolicitudAjusteFlete(porcentaje: number | null | undefined, motivo: string | null | undefined): string | null {
  const pct = Number(porcentaje) || 0;
  if (pct < 0) return 'El porcentaje de ajuste no puede ser negativo.';
  if (pct > 100) return 'El porcentaje de ajuste no puede superar 100%.';
  if (pct > 0 && !(motivo ?? '').trim()) return 'El motivo / justificación del ajuste es obligatorio.';
  return null;
}

/** ¿Tiene el ítem una solicitud de ajuste de flete esperando resolución? */
export function tieneAjustePendiente(it: Pick<ProductoItem, 'ajusteFleteEstado'>): boolean {
  return it.ajusteFleteEstado === 'Pendiente';
}

/**
 * Números de parte con ajuste de flete pendiente de aprobación en la respuesta del backend.
 * Se ignoran las oportunidades desestimadas.
 */
export function ajustesPendientesDeRespuesta(op: OportunidadApiResponse): string[] {
  if (op.estado === 'Desestimada' || op.estado === 'Aceptada Desestimada') return [];
  return (op.productos ?? [])
    .filter((p) => p.ajusteFleteEstado === 'Pendiente')
    .map((p) => p.numeroParte);
}
