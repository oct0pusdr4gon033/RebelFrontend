import type { AcuerdoMarco } from './AcuerdoMarco';
import type { Marca } from './Marca';
import type { ProductoItem } from './ProductoItem';


/* ── Modelo de Oportunidad ── */
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
    estado: 'En Licitación' | 'Cotizada' | 'Adjudicada' | 'Desestimada';
    creadoPor: string;
    createdAt: string;
    updatedAt?: string;
}