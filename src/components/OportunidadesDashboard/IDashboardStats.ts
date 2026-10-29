import type { EstadoBucket } from "./EstadoBucket";
import type { EjecutivaBucket } from "./EjecutivaBucket";
import type { GrupoBucket } from "./GrupoBucket";
import type { MesBucket } from "./MesBucket";
import type { OportunidadRow } from "./OportunidadRow";

export interface DashboardStats {
    total: number;
    /** Σ límite total de todas las oportunidades */
    montoLimiteTotal: number;
    ticketPromedio: number;
    /** Σ monto OCAM de las órdenes de compra */
    montoOCAMTotal: number;
    ocamCount: number;
    ocamPromedio: number;
    activas: number;
    montoActivas: number;
    ganadas: number;
    perdidas: number;
    /** ganadas / (ganadas + perdidas) en % o null si aún no hay cerradas */
    tasaExito: number | null;
    porVencer72h: number;
    vencidas: number;
    mesActual: number;
    mesAnterior: number;
    /** Variación % mes actual vs anterior (null si no hay base) */
    deltaMes: number | null;
    ultima: OportunidadRow | null;
    masAntigua: OportunidadRow | null;
    masAntiguaDias: number;
    porEstado: EstadoBucket[];
    tendencia: MesBucket[];
    recientes: OportunidadRow[];
    proximasVencer: OportunidadRow[];
    topOCAM: OportunidadRow[];
    topEntidades: GrupoBucket[];
    porEjecutiva: EjecutivaBucket[];
}
