import type { ResultadoLlamada } from '../api/Dtos/Llamada';

export const TIMEZONE_LIMA = 'America/Lima';

export function fechaHoyLima(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_LIMA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function formatearHoraCuota(value?: string | null): string {
  if (!value) return '—';
  const parts = value.split(':');
  if (parts.length < 2) return value;
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
}

export function normalizarResultado(value?: string | null): string {
  return (value || '').trim().toUpperCase();
}

export function resultadoEsCotizacion(value?: string | null): boolean {
  const resultado = normalizarResultado(value);
  return resultado === 'LOG+COTIZ' || resultado === 'LOG+OC';
}

export function resultadoEsOc(value?: string | null): boolean {
  return normalizarResultado(value) === 'LOG+OC';
}

export function claseResultado(value?: string | null): string {
  const resultado = normalizarResultado(value);
  if (resultado === 'SIN CONTACTO') return 'llamada-resultado--sin-contacto';
  if (resultado === 'LOGISTICO') return 'llamada-resultado--logistico';
  if (resultado === 'LOG+COTIZ') return 'llamada-resultado--cotizacion';
  if (resultado === 'LOG+OC') return 'llamada-resultado--oc';
  return 'llamada-resultado--pendiente';
}

export function etiquetaResultado(value?: string | null): string {
  return normalizarResultado(value) || 'PENDIENTE';
}

export function resultadoDesdeFlags(
  resultado: ResultadoLlamada,
  solicitoCotizacion: boolean,
  generoOc: boolean
): ResultadoLlamada {
  if (generoOc) return 'LOG+OC';
  if (solicitoCotizacion) return 'LOG+COTIZ';
  return resultado;
}
