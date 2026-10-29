import type { PagoOC } from '../../types/pagos';

/** Mapea el response DTO del backend .NET a PagoOC */
export function mapBackendDtoToPagoOC(dto: any): PagoOC {
  const entidad = dto.entidadCorrespondiente || dto.banco || '';
  const titular = dto.titularCuenta || dto.beneficiario || '';
  return {
    id: String(dto.id || dto.codigoPago),
    codigoPago: dto.codigoPago,
    oportunidadId: dto.oportunidadId,
    ordenCompraId: dto.ordenCompraId,
    numeroOC: dto.numeroOC || '',
    numeroRequerimiento: dto.numeroRequerimiento || '',
    empresaRazonSocial: dto.empresaRazonSocial,
    entidadConvocante: dto.entidadConvocante,
    concepto: dto.concepto || 'Mercadería / Proveedor',
    conceptoPersonalizado: dto.conceptoPersonalizado,
    monto: Number(dto.monto) || 0,
    montoAjusteFlete: dto.montoAjusteFlete != null ? Number(dto.montoAjusteFlete) : undefined,
    moneda: dto.moneda || 'PEN',
    fechaPago: dto.fechaPago ? String(dto.fechaPago).slice(0, 10) : new Date().toISOString().slice(0, 10),
    fechaVencimientoOC: dto.fechaVencimientoOC ? String(dto.fechaVencimientoOC).slice(0, 10) : undefined,
    metodoPago: dto.metodoPago || 'Transferencia Bancaria',
    banco: entidad,
    entidadCorrespondiente: entidad,
    numeroCuentaBancaria: dto.numeroCuentaBancaria || '',
    titularCuenta: titular,
    beneficiario: titular,
    numeroOperacion: dto.numeroOperacion || '',
    horaPago: dto.horaPago || '',
    notas: dto.notas,
    comprobante: {
      nombreArchivo: dto.comprobante?.nombreArchivo || 'Pendiente de adjuntar por Administración',
      tamanoBytes: Number(dto.comprobante?.tamanoBytes) || 0,
      tamanoFormateado: dto.comprobante?.tamanoFormateado || '0 B',
      contentType: dto.comprobante?.contentType || 'image/jpeg',
      dataUrl: dto.comprobante?.dataUrl || '',
      backendImagenId: dto.comprobante?.backendImagenId,
      backendUrl: dto.comprobante?.backendUrl,
      fechaSubida: dto.comprobante?.fechaSubida || new Date().toISOString(),
    },
    registradoPor: dto.registradoPor || 'Ejecutiva de Ventas',
    registradoPorEmail: dto.registradoPorEmail,
    fechaRegistro: dto.fechaRegistro || new Date().toISOString(),
    estado: dto.estado || 'En Revisión',
    justificacionCorreccion: dto.justificacionCorreccion,
    resueltoPorAdmin: dto.resueltoPorAdmin,
    fechaResolucionAdmin: dto.fechaResolucionAdmin,
  };
}
