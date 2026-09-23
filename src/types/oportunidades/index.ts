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
  // ── Datos de la proforma Perú Compras (opcionales) ──
  fichaProducto?: string;
  marcaProducto?: string;
  moneda?: string;
  precioUnitarioBase?: number | null;
  precioUnitarioOfertado?: number | null;
  condicionesAdicionales?: string;
  fichaTecnica?: string;
}

/** Estado posible de una Oportunidad de Licitación */
export type EstadoOportunidad =
  | 'En Licitación'
  | 'Por Vencer'
  | 'Cotizada'
  | 'Adjudicada'
  | 'Desestimada'
  | 'OC_RECIBIDA'
  | 'OC_ACEPTADA'
  | 'OC_RECHAZADA'
  | 'ENTREGADA';

/** Estado de la Orden de Compra dentro del Bloque 2 */
export type EstadoOC =
  | 'OC_RECIBIDA'
  | 'OC_ACEPTADA'
  | 'OC_RECHAZADA'
  | 'ENTREGADA';

/** Orden de Compra emitida por la entidad pública (Bloque 2) */
export interface OrdenCompra {
  id: number;
  oportunidadId: number;
  numeroOC: string;
  fechaEmisionOC?: string | null;
  estadoOC: EstadoOC;
  motivoRechazo?: string | null;
  fechaDecisionOC?: string | null;
  costoInicial?: number | null;
  costoRenegociado?: number | null;
  margenAdicional?: number | null;
  fechaRenegociacion?: string | null;
  fechaDespacho?: string | null;
  transportista?: string | null;
  noGuiaRemision?: string | null;
  fechaEntrega?: string | null;
  fechaRegistro: string;
  fechaActualizacion?: string | null;
}

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
