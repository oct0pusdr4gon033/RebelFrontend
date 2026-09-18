// ─────────────────────────────────────────────────────────────────────────────
// src/types/oportunidades/index.ts
// Interfaces del módulo de Oportunidades de Licitación (Perú Compras)
// ─────────────────────────────────────────────────────────────────────────────

/** Acuerdo Marco del catálogo oficial de Perú Compras */
export interface AcuerdoMarco {
  id: number;
  codigo: string;
  descripcion: string;
  activo: boolean;
}

/** Marca participante en la cotización */
export interface Marca {
  id: number;
  nombre: string;
}

/** Empresa / Entidad solicitante (opcional para registro exprés) */
export interface EmpresaOption {
  id: number;
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
}

/** Ítem / producto individual dentro del requerimiento */
export interface ProductoItem {
  id: string | number;
  numeroParte: string;
  descripcion: string;
  cantidad: number;
  /** Límite unitario en Soles (S/) fijado por Perú Compras */
  limiteUnitario: number;
}

/** Estado posible de una Oportunidad de Licitación */
export type EstadoOportunidad =
  | 'En Licitación'
  | 'Por Vencer'
  | 'Cotizada'
  | 'Adjudicada';

/** Tipo de Podio: Licitaciones vs Ventas */
export type TipoPodio = 'licitaciones' | 'ventas';

/** Modelo completo de una Oportunidad de Licitación */
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

/** Badge de estado de vencimiento para mostrar en la UI */
export interface VencimientoBadge {
  label: string;
  color: string;
  bg: string;
}

/** Modelo para evidencias de licitación subidas */
export interface EvidenciaItem {
  id: string | number;
  oportunidadId: string | number;
  numeroRequerimiento: string;
  tipoDocumento: string;
  nombreArchivo: string;
  tamanoArchivo: string;
  subidoPor: string;
  fechaSubida: string;
  estado: 'Verificado' | 'En Revisión';
  comentario?: string;
}
