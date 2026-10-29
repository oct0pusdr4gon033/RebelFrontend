// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Admin/Pagos/ResolverPagoAdminModal.tsx
// Modal para que el Usuario Administrador gestione las solicitudes de pago:
// - Visualiza los datos bancarios y de OC enviados por la Ejecutiva de Ventas
// - Completa solo: Número de Operación, La Hora y Adjunta la Evidencia del Pago
// - Marca el pago como: Completo, En Revisión o Pago Rechazado (con Justificación de Corrección)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { GoogleIcon } from '../../../components/GoogleIcon/GoogleIcon';
import { useAuth } from '../../../context/AuthContext';
import type { PagoOC } from '../../../types/pagos';
import { resolverPagoAdmin } from '../../../api/services/pagos.service';
import './Pagos.css';

interface ResolverPagoAdminModalProps {
  pago: PagoOC | null;
  roleAccent?: string;
  onClose: () => void;
  onPagoResuelto: (pagoActualizado: PagoOC) => void;
}

type EstadoAdminDecision = 'Completo' | 'En Revisión' | 'Pago Rechazado';

export const ResolverPagoAdminModal: React.FC<ResolverPagoAdminModalProps> = ({
  pago,
  roleAccent = '#2563eb',
  onClose,
  onPagoResuelto,
}) => {
  const { empleado } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [estadoSeleccionado, setEstadoSeleccionado] = useState<EstadoAdminDecision>('Completo');
  const [numeroOperacion, setNumeroOperacion] = useState('');
  const [horaPago, setHoraPago] = useState('');
  const [justificacionCorreccion, setJustificacionCorreccion] = useState('');

  const [archivoEvidencia, setArchivoEvidencia] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiadoCuenta, setCopiadoCuenta] = useState(false);

  // Inicializar campos al abrir el modal con un pago
  useEffect(() => {
    if (!pago) return;

    const estadoActual = pago.estado;
    if (estadoActual === 'Pago Rechazado') {
      setEstadoSeleccionado('Pago Rechazado');
    } else if (estadoActual === 'Completo' || estadoActual === 'Conciliado') {
      setEstadoSeleccionado('Completo');
    } else {
      setEstadoSeleccionado('Completo');
    }

    setNumeroOperacion(pago.numeroOperacion || '');
    const nowTime = new Date().toTimeString().slice(0, 5);
    setHoraPago(pago.horaPago || nowTime);
    setJustificacionCorreccion(pago.justificacionCorreccion || '');
    setArchivoEvidencia(null);
    setPreviewUrl(null);
  }, [pago]);

  const handleSetFile = useCallback(
    (file: File) => {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isImage && !isPdf) {
        Swal.fire({
          icon: 'warning',
          title: 'Formato no soportado',
          text: 'Adjunta una imagen (PNG, JPG, WEBP) o PDF como evidencia del pago.',
          confirmButtonColor: roleAccent,
        });
        return;
      }
      setArchivoEvidencia(file);
      setPreviewUrl(URL.createObjectURL(file));
    },
    [roleAccent]
  );

  // Pegar evidencia con Ctrl+V cuando el modal está abierto
  useEffect(() => {
    if (!pago) return;
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleSetFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [pago, handleSetFile]);

  if (!pago) return null;

  const simbolo = pago.moneda === 'PEN' ? 'S/' : '$';
  const tieneEvidenciaPrevia = Boolean(
    pago.comprobante?.dataUrl &&
      !pago.comprobante.dataUrl.includes('SIN%20VOUCHER') &&
      pago.comprobante.tamanoBytes > 0
  );

  const handleCopiarCuenta = () => {
    const cuenta = pago.numeroCuentaBancaria || '';
    if (!cuenta) return;
    navigator.clipboard?.writeText(cuenta);
    setCopiadoCuenta(true);
    setTimeout(() => setCopiadoCuenta(false), 1800);
  };

  const handleClearFile = () => {
    setArchivoEvidencia(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones según el estado elegido por la Administradora
    if (estadoSeleccionado === 'Pago Rechazado') {
      if (!justificacionCorreccion.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'Justificación de Corrección requerida',
          text: 'Cuando el pago es rechazado, debes ingresar una justificación de corrección como Administradora para enviarlo a corrección.',
          confirmButtonColor: '#dc2626',
        });
        return;
      }
    } else if (estadoSeleccionado === 'Completo') {
      if (!numeroOperacion.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'Número de Operación requerido',
          text: 'Completa el Número de Operación bancaria para marcar el pago como Completo.',
          confirmButtonColor: roleAccent,
        });
        return;
      }
      if (!horaPago.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'Hora del Pago requerida',
          text: 'Indica la hora en la que se realizó la operación bancaria.',
          confirmButtonColor: roleAccent,
        });
        return;
      }
      if (!archivoEvidencia && !tieneEvidenciaPrevia) {
        Swal.fire({
          icon: 'warning',
          title: 'Evidencia del Pago requerida',
          text: 'Adjunta la captura o comprobante de la operación para marcar el pago como Completo.',
          confirmButtonColor: roleAccent,
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const adminNombre =
        empleado?.nombreCompleto ||
        `${empleado?.nombres ?? ''} ${empleado?.apellidos ?? ''}`.trim() ||
        'Administradora';

      const actualizado = await resolverPagoAdmin(
        pago.id,
        {
          estado: estadoSeleccionado,
          numeroOperacion: numeroOperacion.trim() || undefined,
          horaPago: horaPago.trim() || undefined,
          archivoEvidencia: archivoEvidencia || null,
          justificacionCorreccion:
            estadoSeleccionado === 'Pago Rechazado' ? justificacionCorreccion.trim() : undefined,
        },
        adminNombre
      );

      await Swal.fire({
        icon: estadoSeleccionado === 'Pago Rechazado' ? 'warning' : 'success',
        title:
          estadoSeleccionado === 'Completo'
            ? '¡Pago Marcado como Completo!'
            : estadoSeleccionado === 'Pago Rechazado'
              ? 'Pago Enviado a Corrección'
              : 'Pago Actualizado en Revisión',
        html:
          estadoSeleccionado === 'Pago Rechazado'
            ? `<div style="text-align:left;font-size:13px;">
                <p>El pago <strong>${pago.codigoPago}</strong> fue marcado como <strong>Pago Rechazado</strong> y enviado a corrección para la Ejecutiva de Ventas.</p>
                <p style="margin-top:6px;padding:8px;background:#fef2f2;border-left:3px solid #dc2626;color:#991b1b;">
                  <strong>Justificación:</strong> ${justificacionCorreccion.trim()}
                </p>
              </div>`
            : `<div style="text-align:left;font-size:13px;">
                <p>Se actualizaron los datos de operación del pago <strong>${pago.codigoPago}</strong> (OC: <strong>${pago.numeroOC}</strong>).</p>
                <p>Estado actual: <strong>${estadoSeleccionado}</strong></p>
              </div>`,
        confirmButtonColor: estadoSeleccionado === 'Pago Rechazado' ? '#dc2626' : '#059669',
      });

      onPagoResuelto(actualizado);
      onClose();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error al procesar el pago',
        text: err?.message || 'No se pudo guardar la resolución del pago.',
        confirmButtonColor: roleAccent,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pagos-modal__backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="pagos-modal__card"
        style={{ maxWidth: '820px', width: '95%', borderRadius: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pagos-modal__header" style={{ borderRadius: 0 }}>
          <div className="pagos-modal__header-title">
            <div className="pagos-modal__icon-badge" style={{ background: '#eff6ff', borderRadius: 0 }}>
              <GoogleIcon name="admin_panel_settings" size={22} color="#2563eb" />
            </div>
            <div>
              <h3>Gestión de Solicitud de Pago (Administradora) · {pago.codigoPago}</h3>
              <p>
                Solicitado por <strong>{pago.registradoPor}</strong> para la OC <strong>{pago.numeroOC}</strong> (RQ: {pago.numeroRequerimiento})
              </p>
            </div>
          </div>
          <button type="button" className="pagos-modal__close-btn" onClick={onClose} title="Cerrar">
            <GoogleIcon name="close" size={20} color="#64748b" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', maxHeight: '80vh', overflowY: 'auto' }}>
          {/* SECCIÓN 1: Datos Solicitados por la Ejecutiva de Ventas */}
          <div
            style={{
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              padding: '16px',
              marginBottom: '18px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '10px',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <GoogleIcon name="account_balance" size={19} color="#1e3a8a" />
                <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase' }}>
                  Datos de la Cuenta y Orden de Compra (Enviados por Ejecutiva)
                </span>
              </div>
              <div
                style={{
                  background: '#1e3a8a',
                  color: '#ffffff',
                  padding: '4px 12px',
                  fontWeight: 800,
                  fontSize: '14px',
                }}
              >
                Monto Solicitado: {simbolo}{' '}
                {pago.monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
                fontSize: '12.5px',
              }}
            >
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>
                  ORDEN DE COMPRA / RQ:
                </span>
                <strong style={{ color: '#0f172a' }}>
                  {pago.numeroOC} (RQ: {pago.numeroRequerimiento})
                </strong>
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>
                  VENCIMIENTO DE OC:
                </span>
                <strong style={{ color: pago.fechaVencimientoOC ? '#b45309' : '#64748b' }}>
                  {pago.fechaVencimientoOC || 'No especificado'}
                </strong>
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>
                  ENTIDAD CORRESPONDIENTE (BANCO):
                </span>
                <strong style={{ color: '#0f172a' }}>
                  {pago.entidadCorrespondiente || pago.banco || 'No especificada'}
                </strong>
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>
                  NÚMERO DE CUENTA BANCARIA / CCI:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <code
                    style={{
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      padding: '2px 6px',
                      fontWeight: 800,
                      fontSize: '13px',
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    {pago.numeroCuentaBancaria || 'No especificado'}
                  </code>
                  {pago.numeroCuentaBancaria && (
                    <button
                      type="button"
                      onClick={handleCopiarCuenta}
                      title="Copiar número de cuenta"
                      style={{
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        padding: '2px 6px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <GoogleIcon name={copiadoCuenta ? 'check' : 'content_copy'} size={13} color="#2563eb" />
                      <span>{copiadoCuenta ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>
                  TITULAR DE LA CUENTA A DEPOSITAR:
                </span>
                <strong style={{ color: '#0f172a' }}>
                  {pago.titularCuenta || pago.beneficiario || 'No especificado'}
                </strong>
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>
                  CONCEPTO DEL PAGO:
                </span>
                <strong style={{ color: '#0f172a' }}>
                  {pago.concepto}
                  {pago.conceptoPersonalizado ? ` — ${pago.conceptoPersonalizado}` : ''}
                </strong>
              </div>
            </div>

            {pago.notas && (
              <div
                style={{
                  marginTop: 10,
                  paddingTop: 8,
                  borderTop: '1px dashed #cbd5e1',
                  fontSize: '12px',
                  color: '#475569',
                }}
              >
                <strong>Notas de la Ejecutiva:</strong> {pago.notas}
              </div>
            )}
          </div>

          {/* SECCIÓN 2: Selección de Estado de Resolución como Administradora */}
          <div style={{ marginBottom: '18px' }}>
            <label className="pagos-label" style={{ display: 'block', marginBottom: 8 }}>
              1. Seleccionar Estado del Pago <span className="req">*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {/* Opción Completo */}
              <button
                type="button"
                onClick={() => setEstadoSeleccionado('Completo')}
                style={{
                  padding: '12px',
                  border: estadoSeleccionado === 'Completo' ? '2px solid #059669' : '1.5px solid #cbd5e1',
                  background: estadoSeleccionado === 'Completo' ? '#ecfdf5' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: '#065f46', fontSize: '13px' }}>
                  <GoogleIcon name="check_circle" size={18} color="#059669" />
                  <span>Marcar como Completo</span>
                </div>
                <span style={{ fontSize: '11px', color: '#475569' }}>
                  Pago realizado con N° Operación, Hora y Evidencia
                </span>
              </button>

              {/* Opción En Revisión */}
              <button
                type="button"
                onClick={() => setEstadoSeleccionado('En Revisión')}
                style={{
                  padding: '12px',
                  border: estadoSeleccionado === 'En Revisión' ? '2px solid #d97706' : '1.5px solid #cbd5e1',
                  background: estadoSeleccionado === 'En Revisión' ? '#fffbeb' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: '#92400e', fontSize: '13px' }}>
                  <GoogleIcon name="schedule" size={18} color="#d97706" />
                  <span>En Revisión</span>
                </div>
                <span style={{ fontSize: '11px', color: '#475569' }}>
                  Mantener solicitud en verificación administrativa
                </span>
              </button>

              {/* Opción Pago Rechazado */}
              <button
                type="button"
                onClick={() => setEstadoSeleccionado('Pago Rechazado')}
                style={{
                  padding: '12px',
                  border: estadoSeleccionado === 'Pago Rechazado' ? '2px solid #dc2626' : '1.5px solid #cbd5e1',
                  background: estadoSeleccionado === 'Pago Rechazado' ? '#fef2f2' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: '#991b1b', fontSize: '13px' }}>
                  <GoogleIcon name="cancel" size={18} color="#dc2626" />
                  <span>Pago Rechazado</span>
                </div>
                <span style={{ fontSize: '11px', color: '#475569' }}>
                  Indicar justificación y mandar el pago a corrección
                </span>
              </button>
            </div>
          </div>

          {/* SECCIÓN 3A: Si es Pago Rechazado -> Justificación de Corrección obligatoria */}
          {estadoSeleccionado === 'Pago Rechazado' ? (
            <div
              style={{
                background: '#fef2f2',
                border: '1.5px solid #f87171',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <GoogleIcon name="edit_note" size={20} color="#dc2626" />
                <strong style={{ fontSize: '13px', color: '#991b1b', textTransform: 'uppercase' }}>
                  Justificación de Corrección (Administradora) <span className="req">*</span>
                </strong>
              </div>
              <p style={{ fontSize: '12px', color: '#7f1d1d', marginBottom: 10 }}>
                Explica el motivo del rechazo (ej. número de cuenta incorrecto, titular no coincide, monto excede ajuste, etc.) para que la Ejecutiva de Ventas corrija la solicitud.
              </p>
              <textarea
                className="pagos-textarea"
                rows={3}
                placeholder="Escribe aquí la justificación detallada para mandar el pago a corrección..."
                value={justificacionCorreccion}
                onChange={(e) => setJustificacionCorreccion(e.target.value)}
                style={{ borderRadius: 0, borderColor: '#f87171', background: '#ffffff' }}
                required
              />
            </div>
          ) : (
            /* SECCIÓN 3B: Datos que completa el Administrador (N° Operación, Hora y Evidencia del Pago) */
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <GoogleIcon name="verified" size={19} color="#059669" />
                <strong style={{ fontSize: '13px', color: '#0f172a', textTransform: 'uppercase' }}>
                  2. Completar Datos del Desembolso (Solo Administrador)
                </strong>
              </div>

              <div className="pagos-row-2" style={{ marginBottom: 14 }}>
                <div className="pagos-form-group">
                  <label htmlFor="admin-num-op" className="pagos-label">
                    Número de Operación {estadoSeleccionado === 'Completo' && <span className="req">*</span>}
                  </label>
                  <input
                    id="admin-num-op"
                    type="text"
                    className="pagos-input"
                    placeholder="Ej: 004829104"
                    value={numeroOperacion}
                    onChange={(e) => setNumeroOperacion(e.target.value)}
                    style={{ borderRadius: 0 }}
                    required={estadoSeleccionado === 'Completo'}
                  />
                </div>

                <div className="pagos-form-group">
                  <label htmlFor="admin-hora-pago" className="pagos-label">
                    Hora del Pago {estadoSeleccionado === 'Completo' && <span className="req">*</span>}
                  </label>
                  <input
                    id="admin-hora-pago"
                    type="time"
                    className="pagos-input"
                    value={horaPago}
                    onChange={(e) => setHoraPago(e.target.value)}
                    style={{ borderRadius: 0 }}
                    required={estadoSeleccionado === 'Completo'}
                  />
                </div>
              </div>

              {/* Adjuntar Evidencia del Pago */}
              <div className="pagos-form-group">
                <label className="pagos-label">
                  Adjuntar Evidencia del Pago (Voucher / Comprobante){' '}
                  {estadoSeleccionado === 'Completo' && !tieneEvidenciaPrevia && <span className="req">*</span>}
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*,.pdf,application/pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleSetFile(e.target.files[0]);
                    }
                  }}
                />

                {!archivoEvidencia ? (
                  <div
                    className={`pagos-dropzone ${isDragging ? 'pagos-dropzone--active' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleSetFile(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ borderRadius: 0, padding: '18px' }}
                  >
                    <GoogleIcon name="cloud_upload" size={34} color="#2563eb" />
                    <h4 style={{ margin: '6px 0 2px', fontSize: '13px' }}>
                      Arrastra la evidencia del pago aquí, haz clic para examinar o pega con Ctrl + V
                    </h4>
                    <p style={{ fontSize: '11.5px', color: '#64748b', margin: 0 }}>
                      Formatos soportados: PNG, JPG, WEBP o PDF
                    </p>
                    {tieneEvidenciaPrevia && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: '4px 10px',
                          background: '#ecfdf5',
                          color: '#059669',
                          fontSize: '11.5px',
                          fontWeight: 700,
                        }}
                      >
                        ✓ Ya cuenta con una evidencia adjunta ({pago.comprobante.nombreArchivo}). Puedes subir otra para reemplazarla.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pagos-preview-card" style={{ borderRadius: 0 }}>
                    <div className="pagos-preview-card__img-wrap" style={{ borderRadius: 0 }}>
                      {archivoEvidencia.type === 'application/pdf' ||
                      archivoEvidencia.name.toLowerCase().endsWith('.pdf') ? (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            background: '#fef2f2',
                            color: '#dc2626',
                            padding: 10,
                          }}
                        >
                          <GoogleIcon name="picture_as_pdf" size={36} color="#dc2626" />
                          <span style={{ fontSize: '10px', fontWeight: 800 }}>PDF</span>
                        </div>
                      ) : (
                        previewUrl && <img src={previewUrl} alt="Evidencia de pago" />
                      )}
                    </div>
                    <div className="pagos-preview-card__info">
                      <div className="pagos-preview-card__name">
                        <GoogleIcon name="check_circle" size={18} color="#10b981" />
                        <strong>{archivoEvidencia.name}</strong>
                      </div>
                      <span className="pagos-preview-card__size">
                        {(archivoEvidencia.size / 1024).toFixed(1)} KB
                      </span>
                      <div className="pagos-preview-card__actions">
                        <button
                          type="button"
                          className="pagos-btn pagos-btn--sm pagos-btn--outline"
                          onClick={() => fileInputRef.current?.click()}
                          style={{ borderRadius: 0 }}
                        >
                          <GoogleIcon name="sync" size={15} />
                          <span>Cambiar archivo</span>
                        </button>
                        <button
                          type="button"
                          className="pagos-btn pagos-btn--sm pagos-btn--danger-outline"
                          onClick={handleClearFile}
                          style={{ borderRadius: 0 }}
                        >
                          <GoogleIcon name="delete" size={15} />
                          <span>Quitar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer de acciones del modal */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8 }}>
            <button
              type="button"
              className="pagos-btn pagos-btn--secondary"
              onClick={onClose}
              style={{ borderRadius: 0 }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="pagos-btn pagos-btn--primary"
              style={{
                borderRadius: 0,
                background:
                  estadoSeleccionado === 'Pago Rechazado'
                    ? '#dc2626'
                    : estadoSeleccionado === 'En Revisión'
                      ? '#d97706'
                      : '#059669',
              }}
            >
              <GoogleIcon
                name={
                  estadoSeleccionado === 'Pago Rechazado'
                    ? 'reply'
                    : estadoSeleccionado === 'En Revisión'
                      ? 'schedule'
                      : 'check_circle'
                }
                size={18}
                color="#ffffff"
              />
              <span>
                {isSubmitting
                  ? 'Guardando...'
                  : estadoSeleccionado === 'Pago Rechazado'
                    ? 'Mandar Pago a Corrección'
                    : estadoSeleccionado === 'En Revisión'
                      ? 'Guardar En Revisión'
                      : 'Confirmar Pago Completo'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

