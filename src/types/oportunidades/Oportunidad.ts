import type { AcuerdoMarco } from "./AcuerdoMarco";
import type { Marca } from "./Marca";
import type { ProductoItem } from "./ProductoItem";
import type { EstadoOportunidad } from "./EstadoOportunidad";
import type { OrdenCompra } from "./OrdenCompra";



/** Modelo completo de una Oportunidad de Licitación */
export interface Oportunidad {
    id: string | number;
    numeroRequerimiento: string;
    acuerdoMarco?: AcuerdoMarco | null;
    empresaId?: number | null;
    empresaRazonSocial?: string;
    empresaRuc?: string;
    entidadConvocante?: string;
    marcas: Marca[];
    fechaVencimiento: string;
    items: ProductoItem[];
    limiteTotal: number;
    estado: EstadoOportunidad;
    motivoDesestimacion?: string | null;
    ordenCompra?: OrdenCompra;
    creadoPor: string;
    creadoPorUsuarioId?: string;
    createdAt: string;
    updatedAt?: string;
    /** ISO 8601 original para filtrado por período */
    fechaRegistro?: string;
    /** Hora exacta con segundos para desempate y prioridad por orden de llegada */
    horaRegistroExacta?: string;
    /** Indicador de prioridad 1° asignada por orden de llegada */
    prioridadGanada?: boolean;
}
