import type { Oportunidad } from '../../types/oportunidades';

/** Oportunidad + marcas de tiempo ya parseadas (ms) para ordenar y agrupar */
export interface OportunidadRow {
    op: Oportunidad;
    /** Fecha de registro (ms epoch) */
    registro: number;
    /** Último movimiento conocido: máx(actualización oportunidad, actualización OC, registro) */
    actualizacion: number;
    /** Fecha de vencimiento de la convocatoria (ms epoch) o null */
    vencimiento: number | null;
}