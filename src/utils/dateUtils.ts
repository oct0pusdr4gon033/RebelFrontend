/**
 * Utilidades de Fecha y Hora con Soporte Internacional y Zona Horaria de Perú (PET: UTC-5).
 * 
 * Regla de negocio:
 * 1. Base de datos y backend siempre persisten y devuelven UTC en formato ISO 8601 (con sufijo 'Z').
 * 2. Para visualización operativa en Sales Rebel (Perú Compras), se formatea explícitamente
 *    en la zona horaria 'America/Lima' (UTC-5), garantizando que el usuario vea la hora correcta
 *    independientemente de si el servidor se despliega en EE.UU., Europa, la nube o localmente.
 */

export const TIMEZONE_PERU = 'America/Lima';

/**
 * Formatea fecha y hora completa en zona horaria oficial de Perú (ej: "18/09/2026, 09:17:05 a. m.")
 */
export function formatFechaHoraPeru(
  dateValue?: string | Date | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateValue) return '—';
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  if (isNaN(date.getTime())) return '—';

  const usaEstilo = !!(options?.dateStyle || options?.timeStyle);

  return new Intl.DateTimeFormat('es-PE', {
    timeZone: TIMEZONE_PERU,
    ...(!usaEstilo && {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }),
    ...options,
  }).format(date);
}

/**
 * Formatea solo la fecha en zona horaria oficial de Perú (ej: "18/09/2026")
 */
export function formatFechaPeru(dateValue?: string | Date | null): string {
  if (!dateValue) return '—';
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('es-PE', {
    timeZone: TIMEZONE_PERU,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Formatea solo la hora con segundos en zona horaria de Perú (ej: "09:17:05 a. m.")
 */
export function formatHoraPeru(dateValue?: string | Date | null): string {
  if (!dateValue) return '—';
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('es-PE', {
    timeZone: TIMEZONE_PERU,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Formatea la hora exacta en zona horaria de Perú sin milisegundos (ej: "09:17:05 a. m.")
 */
export function formatHoraExacta(dateValue?: string | Date | null): string {
  if (!dateValue) return '—';
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('es-PE', {
    timeZone: TIMEZONE_PERU,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Calcula la diferencia de tiempo respecto al primer lugar en texto legible sin milisegundos
 */
export function formatDiferenciaTiempo(msDiff: number): string {
  if (msDiff <= 0) return '⚡ 1° en llegar';
  const diffSec = Math.round(msDiff / 1000);
  if (diffSec <= 0) return '+1 s';
  if (diffSec < 60) return `+${diffSec} s`;
  const min = Math.floor(diffSec / 60);
  const remSec = diffSec % 60;
  return remSec > 0 ? `+${min}m ${remSec}s` : `+${min}m`;
}

/**
 * Retorna fecha en formato ISO 8601 UTC internacional para auditoría o envíos al backend.
 */
export function toUtcIsoString(dateValue?: string | Date | null): string {
  if (!dateValue) return '';
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  if (isNaN(date.getTime())) return '';
  return date.toISOString();
}

