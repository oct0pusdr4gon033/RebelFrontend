// ─────────────────────────────────────────────────────────────────────────────
// src/types/pagos.ts
// Tipos para el Módulo de Pagos vinculado a Órdenes de Compra (OC)
// ─────────────────────────────────────────────────────────────────────────────

export type ConceptoPago =
  | 'Flete'
  | 'Comisión'
  | 'Gastos Varios'
  | 'Mercadería / Proveedor'
  | 'Adelanto'
  | 'Liquidación Final'
  | 'Otro';

export type MetodoPago =
  | 'Transferencia Bancaria'
  | 'Depósito en Cuenta'
  | 'Yape / Plin'
  | 'Cheque de Gerencia'
  | 'Tarjeta de Crédito / Débito'
  | 'Efectivo';

export type BancoPago =
  | 'BCP (Banco de Crédito)'
  | 'BBVA'
  | 'Interbank'
  | 'Scotiabank'
  | 'Banco de la Nación'
  | 'BanBif'
  | 'Caja Arequipa / Piura / Huancayo'
  | 'Otro';

export type EstadoPago = 'Registrado' | 'Conciliado' | 'Observado' | 'Anulado';

export interface ComprobanteCaptura {
  nombreArchivo: string;
  tamanoBytes: number;
  tamanoFormateado: string;
  contentType: string;
  dataUrl: string; // Base64 Data URL para visualización inmediata y sin pérdida
  backendImagenId?: number; // Si se respaldó en el backend
  backendUrl?: string;
  fechaSubida: string;
}

export interface PagoOC {
  id: string;
  codigoPago: string; // ej: PAG-0001
  oportunidadId: number;
  ordenCompraId?: number;
  numeroOC: string;
  numeroRequerimiento: string;
  empresaRazonSocial?: string;
  entidadConvocante?: string;
  concepto: ConceptoPago;
  conceptoPersonalizado?: string;
  monto: number;
  moneda: 'PEN' | 'USD';
  fechaPago: string; // YYYY-MM-DD
  metodoPago: MetodoPago;
  banco?: string;
  numeroOperacion?: string;
  beneficiario?: string;
  notas?: string;
  comprobante: ComprobanteCaptura;
  registradoPor: string;
  registradoPorEmail?: string;
  fechaRegistro: string; // ISO
  estado: EstadoPago;
}

export interface RegistrarPagoInput {
  oportunidadId: number;
  ordenCompraId?: number;
  numeroOC: string;
  numeroRequerimiento: string;
  empresaRazonSocial?: string;
  entidadConvocante?: string;
  concepto: ConceptoPago;
  conceptoPersonalizado?: string;
  monto: number;
  moneda: 'PEN' | 'USD';
  fechaPago: string;
  metodoPago: MetodoPago;
  banco?: string;
  numeroOperacion?: string;
  beneficiario?: string;
  notas?: string;
  archivoComprobante: File;
}

export interface LiquidacionOC {
  oportunidadId: number;
  numeroOC: string;
  numeroRequerimiento: string;
  empresa: string;
  costoInicial?: number | null;
  costoRenegociado?: number | null;
  totalPagadoPEN: number;
  totalPagadoUSD: number;
  totalFlete: number;
  totalComision: number;
  totalGastosVarios: number;
  totalMercaderia: number;
  totalOtros: number;
  conteoPagos: number;
  pagos: PagoOC[];
}
