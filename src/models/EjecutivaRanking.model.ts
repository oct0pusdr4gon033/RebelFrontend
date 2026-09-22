


/** Modelo para ranking en el Podio (Licitaciones y Ventas) */
export interface EjecutivaRanking {
    posicion: number;
    nombre: string;
    cargo: string;
    avatarUrl?: string;
    totalOportunidades: number;
    totalCotizado: number;
    totalGanado: number;
    tasaEfectividad: number;
    insignia?: string;
    // Métricas específicas de Podio de Licitaciones
    reqsGanadosPrimero?: number;
    tiempoPromedioMinutos?: number;
    licitacionesAdjudicadas?: number;
    // Métricas específicas de Podio de Ventas
    ticketPromedio?: number;
    ventasCerradas?: number;
    // Métricas para orden de llegada por Requerimiento
    horaRegistro?: string;
    diferenciaTiempo?: string;
    esGanadoraReq?: boolean;
    numeroRequerimiento?: string;
    esEmpateTecnico?: boolean;
    puestoTexto?: string;
}