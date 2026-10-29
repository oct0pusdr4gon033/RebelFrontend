// ─────────────────────────────────────────────────────────────────────────────
// src/types/pagos.ts
// Tipos para el Módulo de Solicitudes de Pago vinculado a Órdenes de Compra (OC)
// ─────────────────────────────────────────────────────────────────────────────

export type ConceptoPago =
  | 'Flete'
  | 'Comisión'
  | 'Gastos Varios'
  | 'Mercadería / Proveedor'
  | 'Adelanto'
  | 'Liquidación Final'
  | 'Otro';

export interface ConceptoPagoItem {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  orden: number;
  activo: boolean;
}

export interface ConceptoPagoComboItem {
  value: number;
  label: string;
  codigo: string;
  descripcion?: string;
  icono?: string;
  color?: string;
}

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

export type EstadoPago =
  | 'En Revisión'
  | 'Completo'
  | 'Pago Rechazado'
  | 'Registrado'
  | 'Conciliado'
  | 'Observado'
  | 'Anulado';

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
  codigoPago: string; // ej: PAG-2026-0001
  oportunidadId: number;
  ordenCompraId?: number;
  numeroOC: string;
  numeroRequerimiento: string;
  empresaRazonSocial?: string;
  entidadConvocante?: string;
  concepto: ConceptoPago;
  conceptoPersonalizado?: string;
  monto: number;
  montoAjusteFlete?: number;
  moneda: 'PEN' | 'USD';
  fechaPago: string; // YYYY-MM-DD
  /** Vencimiento de la Orden de Compra (YYYY-MM-DD) */
  fechaVencimientoOC?: string;
  metodoPago: MetodoPago;
  /** Entidad bancaria / financiera correspondiente a la cuenta donde van a depositar */
  banco?: string;
  entidadCorrespondiente?: string;
  /** Número de cuenta bancaria / CCI a la que van a depositar */
  numeroCuentaBancaria?: string;
  /** Nombre del titular de la cuenta a la que van a depositar */
  titularCuenta?: string;
  beneficiario?: string;
  /** Datos completados por el Usuario Administrador */
  numeroOperacion?: string;
  horaPago?: string; // ej: "14:30"
  notas?: string;
  comprobante: ComprobanteCaptura;
  registradoPor: string;
  registradoPorEmail?: string;
  fechaRegistro: string; // ISO
  estado: EstadoPago;
  /** Justificación de corrección ingresada por la Administradora cuando es Pago Rechazado */
  justificacionCorreccion?: string;
  resueltoPorAdmin?: string;
  fechaResolucionAdmin?: string;
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
  montoAjusteFlete?: number;
  moneda: 'PEN' | 'USD';
  fechaPago: string;
  fechaVencimientoOC?: string;
  metodoPago: MetodoPago;
  banco?: string;
  entidadCorrespondiente?: string;
  numeroCuentaBancaria?: string;
  titularCuenta?: string;
  beneficiario?: string;
  numeroOperacion?: string;
  horaPago?: string;
  notas?: string;
  archivoComprobante?: File | null;
  estado?: EstadoPago;
}

export interface ResolverPagoAdminInput {
  estado: 'Completo' | 'En Revisión' | 'Pago Rechazado';
  numeroOperacion?: string;
  horaPago?: string;
  justificacionCorreccion?: string;
  archivoEvidencia?: File | null;
  resueltoPorAdmin?: string;
}

export interface CorregirPagoInput {
  fechaVencimientoOC?: string;
  numeroCuentaBancaria: string;
  entidadCorrespondiente: string;
  banco?: string;
  titularCuenta: string;
  beneficiario?: string;
  concepto: ConceptoPago;
  conceptoPersonalizado?: string;
  monto: number;
  montoAjusteFlete?: number;
  moneda: 'PEN' | 'USD';
  fechaPago: string;
  metodoPago: MetodoPago;
  notas?: string;
}

export interface LiquidacionOC {
  oportunidadId: number;
  numeroOC: string;
  numeroRequerimiento: string;
  empresa: string;
  costoInicial?: number | null;
  costoRenegociado?: number | null;
  totalAjusteFlete?: number;
  techoConAjustes?: number;
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
