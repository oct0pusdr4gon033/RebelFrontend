export interface EjecutivaBucket {
    nombre: string;
    total: number;
    activas: number;
    ganadas: number;
    perdidas: number;
    /** Σ límite total de sus oportunidades */
    monto: number;
    /** Σ monto OCAM de sus órdenes */
    montoOCAM: number;
    tasaExito: number | null;
}
