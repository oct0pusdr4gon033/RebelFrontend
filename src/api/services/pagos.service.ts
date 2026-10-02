// ─────────────────────────────────────────────────────────────────────────────
// src/api/services/pagos.service.ts
// Servicio para el registro, consulta y persistencia de pagos vinculados a OC
// ─────────────────────────────────────────────────────────────────────────────

import type { PagoOC, RegistrarPagoInput, LiquidacionOC } from '../../types/pagos';
import type { Oportunidad } from '../../types/oportunidades';
import { subirImagenOportunidadApi } from './oportunidades.service';

const STORAGE_KEY = 'sales_rebel_pagos_v1';

/** Helper para convertir File a Base64 Data URL */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/** Formateador de bytes para visualización amigable */
export function formatTamanoBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/** Genera un comprobante placeholder en SVG Data URL si no hay archivo (ejemplo para seeds) */
function generarPlaceholderVoucher(titulo: string, monto: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
    </defs>
    <rect width="600" height="380" rx="16" fill="url(#bg)"/>
    <rect x="24" y="24" width="552" height="70" rx="10" fill="#2563eb" fill-opacity="0.2" stroke="#2563eb" stroke-dasharray="4"/>
    <text x="44" y="66" fill="#60a5fa" font-family="system-ui, sans-serif" font-size="20" font-weight="bold">COMPROBANTE DE TRANSFERENCIA BANCARIA</text>
    <circle cx="60" cy="150" r="22" fill="#10b981" fill-opacity="0.2"/>
    <path d="M52 150 L58 156 L70 144" stroke="#10b981" stroke-width="3" fill="none" stroke-linecap="round"/>
    <text x="96" y="145" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="16" font-weight="600">${titulo}</text>
    <text x="96" y="168" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">Operación Exitosa - BCP Conexión Negocios</text>
    <line x1="40" y1="200" x2="560" y2="200" stroke="#334155" stroke-width="1"/>
    <text x="40" y="240" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14">Monto Transferido:</text>
    <text x="40" y="280" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="32" font-weight="bold">${monto}</text>
    <text x="40" y="325" fill="#64748b" font-family="system-ui, sans-serif" font-size="12">Ref: Operación N° 09248201 · Fecha: 2026-09-28 · Canal: Banca Digital</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Pagos de demostración iniciales para enriquecer el módulo */
const SEED_PAGOS: PagoOC[] = [
  {
    id: 'pago_seed_1',
    codigoPago: 'PAG-2026-0001',
    oportunidadId: 33,
    numeroOC: 'OC-2026-001',
    numeroRequerimiento: 'REQ-100002002',
    empresaRazonSocial: 'MINISTERIO DE EDUCACIÓN - SEDE CENTRAL',
    entidadConvocante: 'PRONIED',
    concepto: 'Flete',
    monto: 1450.0,
    moneda: 'PEN',
    fechaPago: '2026-09-29',
    metodoPago: 'Transferencia Bancaria',
    banco: 'BCP (Banco de Crédito)',
    numeroOperacion: '08349210',
    beneficiario: 'Transportes Expreso del Norte S.A.C.',
    notas: 'Flete de 40 equipos de cómputo hacia almacén central Lima con seguro de carga incluido.',
    comprobante: {
      nombreArchivo: 'voucher_flete_bcp_08349210.png',
      tamanoBytes: 245100,
      tamanoFormateado: '239.35 KB',
      contentType: 'image/png',
      dataUrl: generarPlaceholderVoucher('Pago de Flete - OC-2026-001', 'S/ 1,450.00'),
      fechaSubida: '2026-09-29T14:30:00Z',
    },
    registradoPor: 'Carlos Perez H.',
    registradoPorEmail: 'admin@rebelqueen.com',
    fechaRegistro: '2026-09-29T14:35:12Z',
    estado: 'Registrado',
  },
  {
    id: 'pago_seed_2',
    codigoPago: 'PAG-2026-0002',
    oportunidadId: 21,
    numeroOC: 'OC-2026-002',
    numeroRequerimiento: 'REQ-000231990',
    empresaRazonSocial: 'GOBIERNO REGIONAL DE LA LIBERTAD',
    entidadConvocante: 'GERENCIA REGIONAL DE SALUD',
    concepto: 'Comisión',
    monto: 1200.0,
    moneda: 'PEN',
    fechaPago: '2026-09-30',
    metodoPago: 'Transferencia Bancaria',
    banco: 'BBVA',
    numeroOperacion: '04781923',
    beneficiario: 'Agencia de Enlace Comercial Trujillo EIRL',
    notas: 'Comisión del 3.3% por cierre y adjudicación de la licitación.',
    comprobante: {
      nombreArchivo: 'captura_pago_comision_bbva.jpg',
      tamanoBytes: 310500,
      tamanoFormateado: '303.22 KB',
      contentType: 'image/jpeg',
      dataUrl: generarPlaceholderVoucher('Comisión Comercial - OC-2026-002', 'S/ 1,200.00'),
      fechaSubida: '2026-09-30T10:15:00Z',
    },
    registradoPor: 'Carlos Perez H.',
    registradoPorEmail: 'admin@rebelqueen.com',
    fechaRegistro: '2026-09-30T10:18:44Z',
    estado: 'Registrado',
  },
  {
    id: 'pago_seed_3',
    codigoPago: 'PAG-2026-0003',
    oportunidadId: 21,
    numeroOC: 'OC-2026-002',
    numeroRequerimiento: 'REQ-000231990',
    empresaRazonSocial: 'GOBIERNO REGIONAL DE LA LIBERTAD',
    entidadConvocante: 'GERENCIA REGIONAL DE SALUD',
    concepto: 'Gastos Varios',
    monto: 480.0,
    moneda: 'PEN',
    fechaPago: '2026-10-01',
    metodoPago: 'Yape / Plin',
    banco: 'BCP (Banco de Crédito)',
    numeroOperacion: '98230198',
    beneficiario: 'Embalajes Industriales y Estiba La Libertad',
    notas: 'Embalaje con plástico burbuja reforzado, precintos de seguridad y estiba.',
    comprobante: {
      nombreArchivo: 'yape_gastos_embalaje_98230198.png',
      tamanoBytes: 185400,
      tamanoFormateado: '181.05 KB',
      contentType: 'image/png',
      dataUrl: generarPlaceholderVoucher('Gastos de Embalaje y Estiba', 'S/ 480.00'),
      fechaSubida: '2026-10-01T16:20:00Z',
    },
    registradoPor: 'Carlos Perez H.',
    registradoPorEmail: 'admin@rebelqueen.com',
    fechaRegistro: '2026-10-01T16:22:10Z',
    estado: 'Registrado',
  },
];

/** Obtiene todos los pagos registrados */
export function obtenerPagos(): PagoOC[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PAGOS));
      return SEED_PAGOS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PAGOS));
      return SEED_PAGOS;
    }
    return parsed;
  } catch {
    return SEED_PAGOS;
  }
}

/** Guarda la lista de pagos en localStorage y notifica */
function guardarPagos(pagos: PagoOC[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pagos));
    window.dispatchEvent(new Event('sales_rebel_pagos_updated'));
  } catch (err) {
    console.error('Error al guardar pagos en storage:', err);
  }
}

/** Genera el siguiente código correlativo de pago */
function generarCodigoPago(pagosActuales: PagoOC[]): string {
  const anio = new Date().getFullYear();
  const prefijo = `PAG-${anio}-`;
  const numeros = pagosActuales
    .map((p) => {
      if (p.codigoPago && p.codigoPago.startsWith(prefijo)) {
        const numPart = parseInt(p.codigoPago.replace(prefijo, ''), 10);
        return isNaN(numPart) ? 0 : numPart;
      }
      return 0;
    })
    .filter((n) => n > 0);

  const maxNum = numeros.length > 0 ? Math.max(...numeros) : 0;
  const siguiente = maxNum + 1;
  return `${prefijo}${String(siguiente).padStart(4, '0')}`;
}

/**
 * Registra un nuevo pago vinculado a una Orden de Compra.
 * Almacena la captura en Base64 para visualización garantizada y, si es posible,
 * la respalda en el backend a través del endpoint de evidencias.
 */
export async function registrarPago(
  input: RegistrarPagoInput,
  usuario?: { nombreCompleto?: string; email?: string }
): Promise<PagoOC> {
  const dataUrl = await fileToDataUrl(input.archivoComprobante);
  const tamanoBytes = input.archivoComprobante.size;
  const tamanoFormateado = formatTamanoBytes(tamanoBytes);

  let backendImagenId: number | undefined;
  let backendUrl: string | undefined;

  // Intento de respaldo en el backend si hay conectividad
  try {
    const comentario = `Comprobante de Pago (${input.concepto}): ${input.moneda} ${input.monto.toFixed(2)} - Op #${input.numeroOperacion || 'S/N'}`;
    const respBackend = await subirImagenOportunidadApi(
      input.oportunidadId,
      input.archivoComprobante,
      `Pago_${input.concepto.replace(/\s+/g, '_')}`,
      comentario
    );
    if (respBackend && respBackend.id) {
      backendImagenId = respBackend.id;
      backendUrl = respBackend.url;
    }
  } catch {
    // Si falla el backend, continuamos de forma transparente con el storage seguro en base64
  }

  const pagosActuales = obtenerPagos();
  const codigoPago = generarCodigoPago(pagosActuales);

  const nuevoPago: PagoOC = {
    id: `pago_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    codigoPago,
    oportunidadId: input.oportunidadId,
    ordenCompraId: input.ordenCompraId,
    numeroOC: input.numeroOC.trim(),
    numeroRequerimiento: input.numeroRequerimiento.trim(),
    empresaRazonSocial: input.empresaRazonSocial,
    entidadConvocante: input.entidadConvocante,
    concepto: input.concepto,
    conceptoPersonalizado: input.conceptoPersonalizado?.trim(),
    monto: Number(input.monto),
    moneda: input.moneda,
    fechaPago: input.fechaPago,
    metodoPago: input.metodoPago,
    banco: input.banco?.trim(),
    numeroOperacion: input.numeroOperacion?.trim(),
    beneficiario: input.beneficiario?.trim(),
    notas: input.notas?.trim(),
    comprobante: {
      nombreArchivo: input.archivoComprobante.name,
      tamanoBytes,
      tamanoFormateado,
      contentType: input.archivoComprobante.type || 'image/jpeg',
      dataUrl,
      backendImagenId,
      backendUrl,
      fechaSubida: new Date().toISOString(),
    },
    registradoPor: usuario?.nombreCompleto || 'Administrador',
    registradoPorEmail: usuario?.email || 'admin@rebelqueen.com',
    fechaRegistro: new Date().toISOString(),
    estado: 'Registrado',
  };

  const actualizados = [nuevoPago, ...pagosActuales];
  guardarPagos(actualizados);

  return nuevoPago;
}

/** Elimina un pago por su ID */
export function eliminarPago(pagoId: string): boolean {
  const pagos = obtenerPagos();
  const filtrados = pagos.filter((p) => p.id !== pagoId);
  if (filtrados.length !== pagos.length) {
    guardarPagos(filtrados);
    return true;
  }
  return false;
}

/** Actualiza el estado de un pago (Conciliado / Observado) */
export function cambiarEstadoPago(pagoId: string, nuevoEstado: PagoOC['estado']): PagoOC | null {
  const pagos = obtenerPagos();
  let modificado: PagoOC | null = null;
  const actualizados = pagos.map((p) => {
    if (p.id === pagoId) {
      modificado = { ...p, estado: nuevoEstado };
      return modificado;
    }
    return p;
  });
  if (modificado) {
    guardarPagos(actualizados);
  }
  return modificado;
}

/** Calcula la consolidación y liquidación de pagos por cada Orden de Compra */
export function calcularLiquidacionesOC(
  oportunidades: Oportunidad[],
  pagos: PagoOC[]
): LiquidacionOC[] {
  // Oportunidades con OC o que tienen pagos registrados
  const mapaOC = new Map<string, LiquidacionOC>();

  // Inicializar con las oportunidades que tienen Orden de Compra
  oportunidades.forEach((op) => {
    if (op.ordenCompra || op.estado === 'OC_RECIBIDA' || op.estado === 'OC_ACEPTADA' || op.estado === 'ENTREGADA') {
      const ocNum = op.ordenCompra?.numeroOC || `OC-REQ-${op.numeroRequerimiento}`;
      mapaOC.set(ocNum, {
        oportunidadId: Number(op.id),
        numeroOC: ocNum,
        numeroRequerimiento: op.numeroRequerimiento,
        empresa: op.empresaRazonSocial || op.entidadConvocante || 'Entidad Convocante',
        costoInicial: op.ordenCompra?.costoInicial ?? null,
        costoRenegociado: op.ordenCompra?.costoRenegociado ?? null,
        totalPagadoPEN: 0,
        totalPagadoUSD: 0,
        totalFlete: 0,
        totalComision: 0,
        totalGastosVarios: 0,
        totalMercaderia: 0,
        totalOtros: 0,
        conteoPagos: 0,
        pagos: [],
      });
    }
  });

  // Agregar los pagos correspondientes
  pagos.forEach((p) => {
    let liq = mapaOC.get(p.numeroOC);
    if (!liq) {
      liq = {
        oportunidadId: p.oportunidadId,
        numeroOC: p.numeroOC,
        numeroRequerimiento: p.numeroRequerimiento,
        empresa: p.empresaRazonSocial || p.entidadConvocante || 'Entidad Convocante',
        costoInicial: null,
        costoRenegociado: null,
        totalPagadoPEN: 0,
        totalPagadoUSD: 0,
        totalFlete: 0,
        totalComision: 0,
        totalGastosVarios: 0,
        totalMercaderia: 0,
        totalOtros: 0,
        conteoPagos: 0,
        pagos: [],
      };
      mapaOC.set(p.numeroOC, liq);
    }

    liq.conteoPagos += 1;
    liq.pagos.push(p);

    if (p.moneda === 'PEN') {
      liq.totalPagadoPEN += p.monto;
    } else {
      liq.totalPagadoUSD += p.monto;
    }

    switch (p.concepto) {
      case 'Flete':
        liq.totalFlete += p.monto;
        break;
      case 'Comisión':
        liq.totalComision += p.monto;
        break;
      case 'Gastos Varios':
        liq.totalGastosVarios += p.monto;
        break;
      case 'Mercadería / Proveedor':
      case 'Adelanto':
      case 'Liquidación Final':
        liq.totalMercaderia += p.monto;
        break;
      default:
        liq.totalOtros += p.monto;
        break;
    }
  });

  return Array.from(mapaOC.values()).sort((a, b) => b.conteoPagos - a.conteoPagos);
}
