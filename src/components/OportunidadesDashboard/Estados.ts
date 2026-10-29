// ── Clasificación de estados ─────────────────────────────────────────────────
export const ESTADOS_ACTIVOS = [
    'En Competencia',
    'En Licitación',
    'Asignación de Oportunidad',
    'Cotización',
    'Por Vencer',
];

export const ESTADOS_GANADOS = [
    'Adjudicada',
    'Aceptada por el Administrador',
    'Aceptada por Perú Compras',
    'OC_RECIBIDA',
    'OC_ACEPTADA',
    'ENTREGADA',
];

export const ESTADOS_PERDIDOS = ['Desestimada', 'Aceptada Desestimada', 'OC_RECHAZADA'];

/** Estados en los que la oportunidad ya no requiere gestión */
export const ESTADOS_TERMINALES = ['ENTREGADA', ...ESTADOS_PERDIDOS];

export interface EstadoMeta {
    label: string;
    color: string;
}
