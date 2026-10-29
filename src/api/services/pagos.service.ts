// ─────────────────────────────────────────────────────────────────────────────
// src/api/services/pagos.service.ts
// Servicio para solicitud, validación, revisión administrativa, corrección y
// liquidación de pagos vinculados a Órdenes de Compra (OC)
// ─────────────────────────────────────────────────────────────────────────────

import type {
  PagoOC,
  RegistrarPagoInput,
  ResolverPagoAdminInput,
  CorregirPagoInput,
  LiquidacionOC,
} from '../../types/pagos';
import type { Oportunidad } from '../../types/oportunidades';
import { subirImagenOportunidadApi } from './oportunidades.service';
import { API_BASE } from '../../env/envoviment';
import { mapBackendDtoToPagoOC } from '../Mapers/mapBackendDtoToPagoOC';
import { montoAjusteItem } from '../../utils/ajusteFleteUtils';

const STORAGE_KEY = 'sales_rebel_pagos_v1';
const AJUSTE_FLETE_OC_STORAGE_KEY = 'sales_rebel_ajuste_flete_oc_v1';

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

/** Obtiene ajustes de flete manuales guardados por OC */
export function obtenerAjusteFleteGuardadoOC(claveOC?: string): number {
  if (!claveOC) return 0;
  try {
    const raw = localStorage.getItem(AJUSTE_FLETE_OC_STORAGE_KEY);
    if (!raw) return 0;
    const map = JSON.parse(raw);
    return Number(map[claveOC.trim().toUpperCase()]) || 0;
  } catch {
    return 0;
  }
}

/** Guarda el monto de ajuste de flete asociado a una OC */
export function guardarAjusteFleteOC(claveOC: string, montoAjuste: number) {
  if (!claveOC) return;
  try {
    const raw = localStorage.getItem(AJUSTE_FLETE_OC_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[claveOC.trim().toUpperCase()] = Number(montoAjuste) || 0;
    localStorage.setItem(AJUSTE_FLETE_OC_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/**
 * Calcula el monto total de Ajustes de Flete de una Oportunidad / Orden de Compra.
 * Suma los ajustes por porcentaje de cada ítem (aprobados o solicitados vigentes)
 * o los costos de envío de proveedores, y respeta el ajuste registrado en la OC.
 */
export function calcularMontoAjusteFleteOC(op?: Oportunidad, overrideManual?: number): number {
  let totalItems = 0;
  if (op?.items && op.items.length > 0) {
    for (const it of op.items) {
      let pct = 0;
      if ((it.ajusteFletePorcentaje ?? 0) > 0) {
        pct = Number(it.ajusteFletePorcentaje) || 0;
      } else if (
        it.ajusteFleteEstado !== 'Rechazado' &&
        (it.ajusteFleteSolicitadoPorcentaje ?? 0) > 0
      ) {
        pct = Number(it.ajusteFleteSolicitadoPorcentaje) || 0;
      }

      let ajusteItem = montoAjusteItem(it, pct);
      if (ajusteItem <= 0 && it.proveedores && it.proveedores.length > 0) {
        ajusteItem = it.proveedores.reduce((sum, pv) => sum + (Number(pv.costoEnvio) || 0), 0);
      }
      totalItems += ajusteItem;
    }
  }

  const claveOC =
    op?.ordenCompra?.numeroOC ||
    op?.ordenCompra?.nroOCAM ||
    (op ? `OC-REQ-${op.numeroRequerimiento}` : '');
  const guardado = obtenerAjusteFleteGuardadoOC(claveOC);

  if (overrideManual !== undefined && !isNaN(overrideManual) && overrideManual >= 0) {
    return overrideManual;
  }
  return Math.max(totalItems, guardado);
}

/** Determina si un pago cuenta en el acumulado presupuestal (excluye rechazados/anulados) */
export function pagoCuentaEnAcumulado(
  pOrEstado?: Pick<PagoOC, 'estado'> | string | null
): boolean {
  const raw =
    typeof pOrEstado === 'string'
      ? pOrEstado
      : pOrEstado && typeof pOrEstado === 'object'
        ? pOrEstado.estado
        : '';
  const est = (raw || '').trim().toLowerCase();
  return est !== 'anulado' && est !== 'pago rechazado' && est !== 'rechazado';
}

/** Determina si un pago corresponde al concepto de Flete / Transporte */
export function esPagoDeFlete(
  pOrConcepto?: Pick<PagoOC, 'concepto' | 'conceptoPersonalizado'> | string | null,
  conceptoPersonalizadoArg?: string
): boolean {
  const c =
    typeof pOrConcepto === 'string'
      ? pOrConcepto.toLowerCase()
      : (pOrConcepto?.concepto || '').toLowerCase();
  const cp =
    typeof pOrConcepto === 'string'
      ? (conceptoPersonalizadoArg || '').toLowerCase()
      : (pOrConcepto?.conceptoPersonalizado || '').toLowerCase();
  return (
    c.includes('flete') ||
    c.includes('transporte') ||
    cp.includes('flete') ||
    cp.includes('transporte')
  );
}

/** Obtiene todos los pagos registrados */
export function obtenerPagos(): PagoOC[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    return parsed;
  } catch {
    return [];
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

/** Obtiene pagos consultando el API backend con fallback a almacenamiento local */
export async function obtenerPagosApi(): Promise<PagoOC[]> {
  try {
    const res = await fetch(`${API_BASE}/api/pagos`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const mapeados = data.map(mapBackendDtoToPagoOC);
        // Combinar con pagos locales que aún no tengan ID numérico en backend
        const locales = obtenerPagos();
        const codigosBackend = new Set(mapeados.map((m) => m.codigoPago));
        const soloLocales = locales.filter((l) => !codigosBackend.has(l.codigoPago));
        const consolidados = [...mapeados, ...soloLocales];
        guardarPagos(consolidados);
        return consolidados;
      }
    }
  } catch (err) {
    console.warn('Backend /api/pagos no accesible, usando almacenamiento local:', err);
  }
  return obtenerPagos();
}

/**
 * Registra una nueva solicitud de pago vinculada a una Orden de Compra.
 * Realiza la petición POST a /api/pagos en el backend y mantiene respaldo local.
 */
export async function registrarPago(
  input: RegistrarPagoInput,
  usuario?: { nombreCompleto?: string; email?: string },
  _oportunidad?: Oportunidad
): Promise<PagoOC> {
  let dataUrl = '';
  let tamanoBytes = 0;
  let tamanoFormateado = '0 B';
  let nombreArchivo = 'Pendiente de adjuntar por Administración';
  let contentType = 'image/jpeg';

  let backendImagenId: number | undefined;
  let backendUrl: string | undefined;

  if (input.archivoComprobante) {
    try {
      dataUrl = await fileToDataUrl(input.archivoComprobante);
      tamanoBytes = input.archivoComprobante.size;
      tamanoFormateado = formatTamanoBytes(tamanoBytes);
      nombreArchivo = input.archivoComprobante.name;
      contentType = input.archivoComprobante.type || 'image/jpeg';
    } catch {
      // ignore
    }

    try {
      const comentario = `Evidencia de Pago (${input.concepto}): ${input.moneda} ${input.monto.toFixed(2)} - Op #${input.numeroOperacion || 'S/N'}`;
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
      // Continuar
    }
  }

  const entidadFinal = (input.entidadCorrespondiente || input.banco || '').trim();
  const titularFinal = (input.titularCuenta || input.beneficiario || '').trim();
  const estadoInicial = input.estado || (input.archivoComprobante && input.numeroOperacion ? 'Completo' : 'En Revisión');

  if (input.montoAjusteFlete !== undefined && input.montoAjusteFlete > 0) {
    guardarAjusteFleteOC(input.numeroOC, input.montoAjusteFlete);
  }

  // Intento de registro en el backend .NET (/api/pagos)
  try {
    const payload = {
      oportunidadId: input.oportunidadId,
      ordenCompraId: input.ordenCompraId,
      numeroOC: input.numeroOC.trim(),
      numeroRequerimiento: input.numeroRequerimiento.trim(),
      empresaRazonSocial: input.empresaRazonSocial,
      entidadConvocante: input.entidadConvocante,
      concepto: input.concepto,
      conceptoPersonalizado: input.conceptoPersonalizado?.trim(),
      monto: Number(input.monto),
      montoAjusteFlete: input.montoAjusteFlete,
      moneda: input.moneda,
      fechaPago: input.fechaPago,
      fechaVencimientoOC: input.fechaVencimientoOC || null,
      metodoPago: input.metodoPago,
      banco: entidadFinal || undefined,
      entidadCorrespondiente: entidadFinal || undefined,
      numeroCuentaBancaria: input.numeroCuentaBancaria?.trim(),
      titularCuenta: titularFinal || undefined,
      beneficiario: titularFinal || undefined,
      numeroOperacion: input.numeroOperacion?.trim(),
      horaPago: input.horaPago?.trim(),
      notas: input.notas?.trim(),
      comprobanteNombreArchivo: nombreArchivo,
      comprobanteTamanoBytes: tamanoBytes,
      comprobanteContentType: contentType,
      comprobanteDataUrl: dataUrl,
      comprobanteBackendImagenId: backendImagenId,
      comprobanteBackendUrl: backendUrl,
      estado: estadoInicial,
      registradoPor: usuario?.nombreCompleto || 'Ejecutiva de Ventas',
      registradoPorEmail: usuario?.email || 'ventas@rebelqueen.com',
    };

    const res = await fetch(`${API_BASE}/api/pagos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const dataBackend = await res.json();
      const pagoCreado = mapBackendDtoToPagoOC(dataBackend);
      if (backendImagenId) {
        pagoCreado.comprobante.backendImagenId = backendImagenId;
        pagoCreado.comprobante.backendUrl = backendUrl;
      }
      const actuales = obtenerPagos().filter(
        (p) => p.id !== pagoCreado.id && p.codigoPago !== pagoCreado.codigoPago
      );
      guardarPagos([pagoCreado, ...actuales]);
      return pagoCreado;
    } else {
      const errJson = await res.json().catch(() => ({}));
      if (errJson.mensaje) {
        throw new Error(errJson.mensaje);
      }
    }
  } catch (err: any) {
    if (err.message && (err.message.includes('excede') || err.message.includes('mayor'))) {
      throw err;
    }
    console.warn('Servidor /api/pagos no disponible, guardando en persistencia local:', err);
  }

  // Fallback a persistencia local garantizada
  const pagosActuales = obtenerPagos();
  const codigoPago = generarCodigoPago(pagosActuales);

  const nuevoPago: PagoOC = {
    id: `pago_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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
    montoAjusteFlete: input.montoAjusteFlete,
    moneda: input.moneda,
    fechaPago: input.fechaPago,
    fechaVencimientoOC: input.fechaVencimientoOC,
    metodoPago: input.metodoPago,
    banco: entidadFinal || undefined,
    entidadCorrespondiente: entidadFinal || undefined,
    numeroCuentaBancaria: input.numeroCuentaBancaria?.trim(),
    titularCuenta: titularFinal || undefined,
    beneficiario: titularFinal || undefined,
    numeroOperacion: input.numeroOperacion?.trim(),
    horaPago: input.horaPago?.trim(),
    notas: input.notas?.trim(),
    comprobante: {
      nombreArchivo,
      tamanoBytes,
      tamanoFormateado,
      contentType,
      dataUrl,
      backendImagenId,
      backendUrl,
      fechaSubida: new Date().toISOString(),
    },
    registradoPor: usuario?.nombreCompleto || 'Ejecutiva de Ventas',
    registradoPorEmail: usuario?.email || 'ventas@rebelqueen.com',
    fechaRegistro: new Date().toISOString(),
    estado: estadoInicial,
  };

  const actualizados = [nuevoPago, ...pagosActuales];
  guardarPagos(actualizados);

  return nuevoPago;
}

/**
 * Acción del Usuario Administrador:
 * Completa los datos de Número de Operación, La Hora y Adjunta la Evidencia del Pago,
 * y marca el pago como 'Completo', 'En Revisión' o 'Pago Rechazado' (con justificación de corrección).
 */
export async function resolverPagoAdmin(
  pagoId: string,
  input: ResolverPagoAdminInput,
  adminNombre?: string
): Promise<PagoOC> {
  if (adminNombre && !input.resueltoPorAdmin) {
    input.resueltoPorAdmin = adminNombre;
  }
  const pagos = obtenerPagos();
  const actual = pagos.find((p) => p.id === pagoId || p.codigoPago === pagoId);

  let dataUrl = actual?.comprobante?.dataUrl || '';
  let tamanoBytes = actual?.comprobante?.tamanoBytes || 0;
  let tamanoFormateado = actual?.comprobante?.tamanoFormateado || '0 B';
  let nombreArchivo = actual?.comprobante?.nombreArchivo || 'Pendiente de adjuntar por Administración';
  let contentType = actual?.comprobante?.contentType || 'image/jpeg';
  let backendImagenId = actual?.comprobante?.backendImagenId;
  let backendUrl = actual?.comprobante?.backendUrl;

  if (input.archivoEvidencia) {
    dataUrl = await fileToDataUrl(input.archivoEvidencia);
    tamanoBytes = input.archivoEvidencia.size;
    tamanoFormateado = formatTamanoBytes(tamanoBytes);
    nombreArchivo = input.archivoEvidencia.name;
    contentType = input.archivoEvidencia.type || 'image/jpeg';

    if (actual?.oportunidadId) {
      try {
        const resp = await subirImagenOportunidadApi(
          actual.oportunidadId,
          input.archivoEvidencia,
          `Evidencia_Pago_${actual.codigoPago}`,
          `Evidencia de Pago ${actual.codigoPago} - Op: ${input.numeroOperacion || ''} - Hora: ${input.horaPago || ''}`
        );
        if (resp?.id) {
          backendImagenId = resp.id;
          backendUrl = resp.url;
        }
      } catch {
        // continuar con dataUrl local
      }
    }
  }

  const numericId = parseInt(pagoId, 10);
  if (!isNaN(numericId) && numericId > 0) {
    try {
      const res = await fetch(`${API_BASE}/api/pagos/${numericId}/resolver-admin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: input.estado,
          numeroOperacion: input.numeroOperacion?.trim(),
          horaPago: input.horaPago?.trim(),
          justificacionCorreccion: input.justificacionCorreccion?.trim(),
          comprobanteNombreArchivo: nombreArchivo,
          comprobanteTamanoBytes: tamanoBytes,
          comprobanteContentType: contentType,
          comprobanteDataUrl: dataUrl,
          comprobanteBackendImagenId: backendImagenId,
          comprobanteBackendUrl: backendUrl,
          resueltoPorAdmin: input.resueltoPorAdmin || 'Administradora',
        }),
      });
      if (res.ok) {
        const dto = await res.json();
        const actualizadoBackend = mapBackendDtoToPagoOC(dto);
        const nuevaLista = pagos.map((p) =>
          p.id === pagoId || p.codigoPago === actualizadoBackend.codigoPago ? actualizadoBackend : p
        );
        guardarPagos(nuevaLista);
        return actualizadoBackend;
      } else {
        const err = await res.json().catch(() => ({}));
        if (err.mensaje) throw new Error(err.mensaje);
      }
    } catch (err: any) {
      if (err.message && err.message.includes('obligatorio')) {
        throw err;
      }
      console.warn('Resolviendo pago en almacenamiento local:', err);
    }
  }

  if (!actual) {
    throw new Error('No se encontró el registro de pago.');
  }

  const modificado: PagoOC = {
    ...actual,
    estado: input.estado,
    numeroOperacion: input.numeroOperacion !== undefined ? input.numeroOperacion.trim() : actual.numeroOperacion,
    horaPago: input.horaPago !== undefined ? input.horaPago.trim() : actual.horaPago,
    justificacionCorreccion:
      input.estado === 'Pago Rechazado' ? input.justificacionCorreccion?.trim() : undefined,
    resueltoPorAdmin: input.resueltoPorAdmin || 'Administradora',
    fechaResolucionAdmin: new Date().toISOString(),
    comprobante: {
      nombreArchivo,
      tamanoBytes,
      tamanoFormateado,
      contentType,
      dataUrl,
      backendImagenId,
      backendUrl,
      fechaSubida: new Date().toISOString(),
    },
  };

  const actualizados = pagos.map((p) => (p.id === pagoId ? modificado : p));
  guardarPagos(actualizados);
  return modificado;
}

/**
 * Acción de la Ejecutiva de Ventas:
 * Corrige una solicitud de pago rechazada y la vuelve a enviar a estado 'En Revisión'.
 */
export async function corregirSolicitudPago(
  pagoId: string,
  input: CorregirPagoInput,
  _oportunidad?: Oportunidad
): Promise<PagoOC> {
  const pagos = obtenerPagos();
  const actual = pagos.find((p) => p.id === pagoId || p.codigoPago === pagoId);

  const numericId = parseInt(pagoId, 10);
  if (!isNaN(numericId) && numericId > 0) {
    try {
      const res = await fetch(`${API_BASE}/api/pagos/${numericId}/corregir`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaVencimientoOC: input.fechaVencimientoOC || null,
          numeroCuentaBancaria: input.numeroCuentaBancaria.trim(),
          entidadCorrespondiente: input.entidadCorrespondiente.trim(),
          banco: (input.banco || input.entidadCorrespondiente).trim(),
          titularCuenta: input.titularCuenta.trim(),
          beneficiario: (input.beneficiario || input.titularCuenta).trim(),
          concepto: input.concepto,
          conceptoPersonalizado: input.conceptoPersonalizado?.trim(),
          monto: Number(input.monto),
          montoAjusteFlete: input.montoAjusteFlete,
          moneda: input.moneda,
          fechaPago: input.fechaPago,
          metodoPago: input.metodoPago,
          notas: input.notas?.trim(),
        }),
      });
      if (res.ok) {
        const dto = await res.json();
        const actualizadoBackend = mapBackendDtoToPagoOC(dto);
        const nuevaLista = pagos.map((p) =>
          p.id === pagoId || p.codigoPago === actualizadoBackend.codigoPago ? actualizadoBackend : p
        );
        guardarPagos(nuevaLista);
        return actualizadoBackend;
      } else {
        const err = await res.json().catch(() => ({}));
        if (err.mensaje) throw new Error(err.mensaje);
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('excede') || err.message.includes('mayor'))) {
        throw err;
      }
      console.warn('Corrigiendo solicitud de pago en almacenamiento local:', err);
    }
  }

  if (!actual) {
    throw new Error('No se encontró la solicitud de pago a corregir.');
  }

  const corregido: PagoOC = {
    ...actual,
    fechaVencimientoOC: input.fechaVencimientoOC,
    numeroCuentaBancaria: input.numeroCuentaBancaria.trim(),
    entidadCorrespondiente: input.entidadCorrespondiente.trim(),
    banco: (input.banco || input.entidadCorrespondiente).trim(),
    titularCuenta: input.titularCuenta.trim(),
    beneficiario: (input.beneficiario || input.titularCuenta).trim(),
    concepto: input.concepto,
    conceptoPersonalizado: input.conceptoPersonalizado?.trim(),
    monto: Number(input.monto),
    montoAjusteFlete: input.montoAjusteFlete ?? actual.montoAjusteFlete,
    moneda: input.moneda,
    fechaPago: input.fechaPago,
    metodoPago: input.metodoPago,
    notas: input.notas?.trim(),
    estado: 'En Revisión',
  };

  const actualizados = pagos.map((p) => (p.id === pagoId ? corregido : p));
  guardarPagos(actualizados);
  return corregido;
}

/** Elimina un pago por su ID sincronizando con el backend */
export function eliminarPago(pagoId: string): boolean {
  const numericId = parseInt(pagoId, 10);
  if (!isNaN(numericId) && numericId > 0) {
    fetch(`${API_BASE}/api/pagos/${numericId}`, { method: 'DELETE' }).catch(() => {});
  }
  const pagos = obtenerPagos();
  const filtrados = pagos.filter((p) => p.id !== pagoId);
  if (filtrados.length !== pagos.length) {
    guardarPagos(filtrados);
    return true;
  }
  return false;
}

/** Actualiza el estado de un pago */
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
  const mapaOC = new Map<string, LiquidacionOC>();

  oportunidades.forEach((op) => {
    if (
      op.ordenCompra ||
      op.estado === 'OC_RECIBIDA' ||
      op.estado === 'OC_ACEPTADA' ||
      op.estado === 'ENTREGADA' ||
      op.estado === 'Cotización' ||
      op.estado === 'Adjudicada'
    ) {
      const ocNum = op.ordenCompra?.numeroOC || `OC-REQ-${op.numeroRequerimiento}`;
      const baseOC =
        op.ordenCompra?.montoOCAM && op.ordenCompra.montoOCAM > 0
          ? Number(op.ordenCompra.montoOCAM)
          : Number(op.limiteTotal) || 0;
      const ajusteFlete = calcularMontoAjusteFleteOC(op);

      mapaOC.set(ocNum, {
        oportunidadId: Number(op.id),
        numeroOC: ocNum,
        numeroRequerimiento: op.numeroRequerimiento,
        empresa: op.empresaRazonSocial || op.entidadConvocante || 'Entidad Convocante',
        costoInicial: op.ordenCompra?.costoInicial ?? baseOC,
        costoRenegociado: op.ordenCompra?.costoRenegociado ?? null,
        totalAjusteFlete: ajusteFlete,
        techoConAjustes: baseOC + ajusteFlete,
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
        totalAjusteFlete: p.montoAjusteFlete || 0,
        techoConAjustes: undefined,
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

    if (!pagoCuentaEnAcumulado(p)) {
      return;
    }

    if (p.moneda === 'PEN') {
      liq.totalPagadoPEN += p.monto;
    } else {
      liq.totalPagadoUSD += p.monto;
    }

    if (esPagoDeFlete(p)) {
      liq.totalFlete += p.monto;
      return;
    }

    switch (p.concepto) {
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
