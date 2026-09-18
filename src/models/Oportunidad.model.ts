// ─────────────────────────────────────────────────────────────────────────────
// src/models/Oportunidad.model.ts
// ─────────────────────────────────────────────────────────────────────────────
import type { AcuerdoMarco, Marca, ProductoItem, EstadoOportunidad } from '../types/oportunidades';

export interface Oportunidad {
    id: string | number;
    numeroRequerimiento: string;
    acuerdoMarco: AcuerdoMarco;
    empresaId?: number | null;
    empresaRazonSocial?: string;
    empresaRuc?: string;
    entidadConvocante?: string;
    marcas: Marca[];
    fechaVencimiento: string;
    items: ProductoItem[];
    limiteTotal: number;
    estado: EstadoOportunidad;
    creadoPor: string;
    createdAt: string;
    updatedAt?: string;
    /** Hora exacta con segundos para desempate y prioridad por orden de llegada */
    horaRegistroExacta?: string;
    /** Indicador de prioridad 1° asignada por orden de llegada */
    prioridadGanada?: boolean;
}