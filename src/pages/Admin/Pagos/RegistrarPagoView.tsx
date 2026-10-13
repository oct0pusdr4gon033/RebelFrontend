// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Admin/Pagos/RegistrarPagoView.tsx
// Formulario para registrar pagos vinculados a una Orden de Compra (OC)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import { GoogleIcon } from '../../../components/GoogleIcon';
import { useAuth } from '../../../context/AuthContext';
import type { Oportunidad } from '../../../types/oportunidades';
import type { ConceptoPago, MetodoPago, PagoOC } from '../../../types/pagos';
import { registrarPago, obtenerPagos } from '../../../api/services/pagos.service';
import './Pagos.css';

interface RegistrarPagoViewProps {
  oportunidades: Oportunidad[];
  roleAccent?: string;
  preselectedOC?: string;
  onPagoRegistrado?: (nuevoPago: PagoOC) => void;
  onCancelar?: () => void;
}

const CONCEPTOS: { id: ConceptoPago; label: string; icon: string; desc: string; color: string }[] = [
  { id: 'Flete', label: 'Precio de Flete', icon: 'local_shipping', desc: 'Transporte, flete terrestre o aéreo', color: '#8b5cf6' },
  { id: 'Comisión', label: 'Comisión Comercial', icon: 'handshake', desc: 'Comisión ejecutiva / intermediación', color: '#10b981' },
  { id: 'Gastos Varios', label: 'Gastos Varios', icon: 'receipt', desc: 'Embalaje, estiba, seguros, trámites', color: '#f59e0b' },
  { id: 'Mercadería / Proveedor', label: 'Pago a Proveedor', icon: 'inventory_2', desc: 'Costo base o cancelación de productos', color: '#2563eb' },
  { id: 'Adelanto', label: 'Adelanto / Anticipo', icon: 'payments', desc: 'Anticipo para compra de stock', color: '#06b6d4' },
  { id: 'Liquidación Final', label: 'Liquidación Final', icon: 'task_alt', desc: 'Cierre total de la orden de compra', color: '#ec4899' },
  { id: 'Otro', label: 'Otro Concepto', icon: 'more_horiz', desc: 'Especificar concepto particular', color: '#64748b' },
];

const METODOS: MetodoPago[] = [
  'Transferencia Bancaria',
  'Depósito en Cuenta',
  'Yape / Plin',
  'Cheque de Gerencia',
  'Tarjeta de Crédito / Débito',
  'Efectivo',
];

const BANCOS = [
  'BCP (Banco de Crédito)',
  'BBVA',
  'Interbank',
  'Scotiabank',
  'Banco de la Nación',
  'BanBif',
  'Caja Municipal / Otro',
];

export const RegistrarPagoView: React.FC<RegistrarPagoViewProps> = ({
  oportunidades,
  roleAccent = '#2563eb',
  preselectedOC,
  onPagoRegistrado,
  onCancelar,
}) => {
  const { empleado } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtrar oportunidades con OC o adjudicadas
  const oportunidadesConOC = useMemo(() => {
    return oportunidades.filter(
      (op) =>
        op.ordenCompra ||
        op.estado === 'OC_RECIBIDA' ||
        op.estado === 'OC_ACEPTADA' ||
        op.estado === 'ENTREGADA' ||
        op.estado === 'Adjudicada'
    );
  }, [oportunidades]);

  // Selección de OC
  const [selectedOCNum, setSelectedOCNum] = useState<string>(() => {
    if (preselectedOC) return preselectedOC;
    const primera = oportunidadesConOC.find((o) => o.ordenCompra?.numeroOC);
    return primera?.ordenCompra?.numeroOC || '';
  });

  const oportunidadSeleccionada = useMemo(() => {
    return oportunidadesConOC.find(
      (op) => (op.ordenCompra?.numeroOC || `OC-REQ-${op.numeroRequerimiento}`) === selectedOCNum
    );
  }, [oportunidadesConOC, selectedOCNum]);

  // Historial de pagos de la OC seleccionada para mostrar acumulado previo
  const pagosPreviosOC = useMemo(() => {
    if (!selectedOCNum) return [];
    const todos = obtenerPagos();
    return todos.filter((p) => p.numeroOC === selectedOCNum);
  }, [selectedOCNum]);

  const totalAcumuladoPrevio = useMemo(() => {
    return pagosPreviosOC.reduce((sum, p) => sum + (p.moneda === 'PEN' ? p.monto : 0), 0);
  }, [pagosPreviosOC]);

  // Campos del formulario
  const [concepto, setConcepto] = useState<ConceptoPago>('Flete');
  const [conceptoPersonalizado, setConceptoPersonalizado] = useState('');
  const [monto, setMonto] = useState<string>('');
  const [moneda, setMoneda] = useState<'PEN' | 'USD'>('PEN');
  const [fechaPago, setFechaPago] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('Transferencia Bancaria');
  const [banco, setBanco] = useState<string>('BCP (Banco de Crédito)');
  const [numeroOperacion, setNumeroOperacion] = useState<string>('');
  const [beneficiario, setBeneficiario] = useState<string>('');
  const [notas, setNotas] = useState<string>('');

  // Archivo y preview
  const [archivo, setArchivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Escuchar pegado desde el portapapeles (Ctrl+V)
  useEffect(() => {
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
  }, []);

  const handleSetFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'warning',
        title: 'Formato no soportado',
        text: 'Por favor adjunta una imagen (PNG, JPG, WEBP) del comprobante de pago.',
        confirmButtonColor: roleAccent,
      });
      return;
    }
    setArchivo(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleClearFile = () => {
    setArchivo(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOCNum) {
      Swal.fire({
        icon: 'warning',
        title: 'Orden de Compra requerida',
        text: 'Debes seleccionar una Orden de Compra para vincular el pago.',
        confirmButtonColor: roleAccent,
      });
      return;
    }

    const valorMonto = parseFloat(monto);
    if (isNaN(valorMonto) || valorMonto <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Monto inválido',
        text: 'Ingresa un monto numérico mayor a 0.',
        confirmButtonColor: roleAccent,
      });
      return;
    }

    if (!archivo) {
      Swal.fire({
        icon: 'warning',
        title: 'Captura requerida',
        text: 'Es obligatorio adjuntar la captura o voucher del pago.',
        confirmButtonColor: roleAccent,
      });
      return;
    }

    if (concepto === 'Otro' && !conceptoPersonalizado.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Detalle del concepto',
        text: 'Por favor especifica la descripción del concepto "Otro".',
        confirmButtonColor: roleAccent,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const nuevo = await registrarPago(
        {
          oportunidadId: oportunidadSeleccionada ? Number(oportunidadSeleccionada.id) : 0,
          ordenCompraId: oportunidadSeleccionada?.ordenCompra?.id,
          numeroOC: selectedOCNum,
          numeroRequerimiento: oportunidadSeleccionada?.numeroRequerimiento || '',
          empresaRazonSocial:
            oportunidadSeleccionada?.empresaRazonSocial ||
            oportunidadSeleccionada?.entidadConvocante ||
            'Entidad Convocante',
          entidadConvocante: oportunidadSeleccionada?.entidadConvocante,
          concepto,
          conceptoPersonalizado,
          monto: valorMonto,
          moneda,
          fechaPago,
          metodoPago,
          banco: metodoPago === 'Efectivo' ? undefined : banco,
          numeroOperacion,
          beneficiario,
          notas,
          archivoComprobante: archivo,
        },
        {
          nombreCompleto: empleado?.nombreCompleto || `${empleado?.nombres ?? ''} ${empleado?.apellidos ?? ''}`.trim() || 'Administrador',
          email: empleado?.email || 'admin@rebelqueen.com',
        }
      );

      await Swal.fire({
        icon: 'success',
        title: '¡Pago Registrado!',
        html: `Se registró correctamente el pago <strong>${nuevo.codigoPago}</strong> vinculado a la OC <strong>${nuevo.numeroOC}</strong> por <strong>${moneda === 'PEN' ? 'S/' : '$'} ${valorMonto.toFixed(2)}</strong>.`,
        confirmButtonColor: roleAccent,
      });

      // Limpiar formulario o notificar
      setMonto('');
      setNumeroOperacion('');
      setBeneficiario('');
      setNotas('');
      handleClearFile();

      if (onPagoRegistrado) {
        onPagoRegistrado(nuevo);
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error al registrar',
        text: err?.message || 'No se pudo guardar el pago. Intenta nuevamente.',
        confirmButtonColor: roleAccent,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pagos-form-container">
      <div className="pagos-form-header">
        <div className="pagos-form-header__title">
          <div className="pagos-form-header__icon" style={{ background: `${roleAccent}15`, color: roleAccent }}>
            <GoogleIcon name="add_card" size={24} color={roleAccent} />
          </div>
          <div>
            <h2>Registrar Nuevo Pago de OC</h2>
            <p>
              Vincula pagos de <strong>flete</strong>, <strong>comisión</strong>, <strong>gastos varios</strong> o mercadería a una Orden de Compra y adjunta el comprobante.
            </p>
          </div>
        </div>
        {onCancelar && (
          <button type="button" className="pagos-btn pagos-btn--outline" onClick={onCancelar}>
            <GoogleIcon name="arrow_back" size={18} />
            <span>Volver al Historial</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="pagos-form">
        {/* BLOQUE 1: Selección de Orden de Compra */}
        <section className="pagos-card">
          <div className="pagos-card__header">
            <span className="pagos-card__badge" style={{ background: `${roleAccent}1a`, color: roleAccent }}>
              Paso 1
            </span>
            <div className="pagos-card__titles">
              <h3>Selección de Orden de Compra (OC)</h3>
              <p>Indica a qué orden de compra o requerimiento corresponde este pago</p>
            </div>
          </div>

          <div className="pagos-card__body">
            <div className="pagos-form-group">
              <label htmlFor="select-oc" className="pagos-label">
                Orden de Compra / Requerimiento <span className="req">*</span>
              </label>
              <select
                id="select-oc"
                className="pagos-select"
                value={selectedOCNum}
                onChange={(e) => setSelectedOCNum(e.target.value)}
                required
              >
                <option value="">-- Selecciona una Orden de Compra --</option>
                {oportunidadesConOC.map((op) => {
                  const ocNum = op.ordenCompra?.numeroOC || `Sin OC (RQ: ${op.numeroRequerimiento})`;
                  return (
                    <option key={op.id} value={op.ordenCompra?.numeroOC || `OC-REQ-${op.numeroRequerimiento}`}>
                      {ocNum} · RQ: {op.numeroRequerimiento} · {op.empresaRazonSocial || op.entidadConvocante || 'Entidad'} ({op.estado})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Ficha Resumen de la OC seleccionada */}
            {oportunidadSeleccionada && (
              <div className="pagos-oc-summary">
                <div className="pagos-oc-summary__header">
                  <div className="pagos-oc-summary__oc-num">
                    <GoogleIcon name="description" size={18} color="#2563eb" />
                    <strong>{oportunidadSeleccionada.ordenCompra?.numeroOC || selectedOCNum}</strong>
                  </div>
                  <span className="pagos-status-pill pagos-status-pill--active">
                    {oportunidadSeleccionada.ordenCompra?.estadoOC || oportunidadSeleccionada.estado}
                  </span>
                </div>

                <div className="pagos-oc-summary__grid">
                  <div>
                    <span className="label">Requerimiento:</span>
                    <span className="val">{oportunidadSeleccionada.numeroRequerimiento}</span>
                  </div>
                  <div>
                    <span className="label">Cliente / Entidad:</span>
                    <span className="val">
                      {oportunidadSeleccionada.empresaRazonSocial || oportunidadSeleccionada.entidadConvocante || 'No especificada'}
                    </span>
                  </div>
                  <div>
                    <span className="label">Costo Renegociado (Presupuesto):</span>
                    <span className="val highlight">
                      {oportunidadSeleccionada.ordenCompra?.costoRenegociado
                        ? `S/ ${Number(oportunidadSeleccionada.ordenCompra.costoRenegociado).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
                        : 'No registrado'}
                    </span>
                  </div>
                  <div>
                    <span className="label">Pagos Registrados Previos:</span>
                    <span className="val">
                      {pagosPreviosOC.length} pago(s) (Total: S/ {totalAcumuladoPrevio.toLocaleString('es-PE', { minimumFractionDigits: 2 })})
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* BLOQUE 2: Datos Financieros y Concepto */}
        <section className="pagos-card">
          <div className="pagos-card__header">
            <span className="pagos-card__badge" style={{ background: `${roleAccent}1a`, color: roleAccent }}>
              Paso 2
            </span>
            <div className="pagos-card__titles">
              <h3>Concepto y Datos Financieros</h3>
              <p>Clasifica el destino del pago (flete, comisión, mercadería, etc.)</p>
            </div>
          </div>

          <div className="pagos-card__body">
            {/* Selector visual de conceptos */}
            <div className="pagos-form-group">
              <label className="pagos-label">
                Concepto del Pago <span className="req">*</span>
              </label>
              <div className="pagos-concept-pills">
                {CONCEPTOS.map((c) => {
                  const isSelected = concepto === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`pagos-concept-pill ${isSelected ? 'pagos-concept-pill--selected' : ''}`}
                      style={{
                        borderColor: isSelected ? c.color : undefined,
                        background: isSelected ? `${c.color}15` : undefined,
                        color: isSelected ? c.color : undefined,
                      }}
                      onClick={() => setConcepto(c.id)}
                    >
                      <GoogleIcon name={c.icon} size={20} color={isSelected ? c.color : '#64748b'} />
                      <div className="pagos-concept-pill__info">
                        <strong>{c.label}</strong>
                        <span>{c.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {concepto === 'Otro' && (
              <div className="pagos-form-group">
                <label className="pagos-label">
                  Especificar concepto personalizado <span className="req">*</span>
                </label>
                <input
                  type="text"
                  className="pagos-input"
                  placeholder="Ej: Embalaje especial en madera, Seguro de tránsito, etc."
                  value={conceptoPersonalizado}
                  onChange={(e) => setConceptoPersonalizado(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Monto y Moneda */}
            <div className="pagos-row-2">
              <div className="pagos-form-group">
                <label className="pagos-label">
                  Monto Pagado <span className="req">*</span>
                </label>
                <div className="pagos-input-prefix-wrapper">
                  <span className="pagos-input-prefix">{moneda === 'PEN' ? 'S/' : '$'}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="pagos-input pagos-input--prefixed"
                    placeholder="0.00"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="pagos-form-group">
                <label className="pagos-label">Moneda</label>
                <div className="pagos-radio-group">
                  <label className="pagos-radio-label">
                    <input
                      type="radio"
                      name="moneda"
                      value="PEN"
                      checked={moneda === 'PEN'}
                      onChange={() => setMoneda('PEN')}
                    />
                    <span>Soles (PEN)</span>
                  </label>
                  <label className="pagos-radio-label">
                    <input
                      type="radio"
                      name="moneda"
                      value="USD"
                      checked={moneda === 'USD'}
                      onChange={() => setMoneda('USD')}
                    />
                    <span>Dólares (USD)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Fecha, Método y Banco */}
            <div className="pagos-row-3">
              <div className="pagos-form-group">
                <label className="pagos-label">
                  Fecha del Pago <span className="req">*</span>
                </label>
                <input
                  type="date"
                  className="pagos-input"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                  required
                />
              </div>

              <div className="pagos-form-group">
                <label className="pagos-label">Método de Pago</label>
                <select
                  className="pagos-select"
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                >
                  {METODOS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {metodoPago !== 'Efectivo' && (
                <div className="pagos-form-group">
                  <label className="pagos-label">Banco / Entidad</label>
                  <select className="pagos-select" value={banco} onChange={(e) => setBanco(e.target.value)}>
                    {BANCOS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* N° Operación y Beneficiario */}
            <div className="pagos-row-2">
              <div className="pagos-form-group">
                <label className="pagos-label">N° de Operación / Referencia Bancaria</label>
                <input
                  type="text"
                  className="pagos-input"
                  placeholder="Ej: 08472910 o Ref. Interbancaria"
                  value={numeroOperacion}
                  onChange={(e) => setNumeroOperacion(e.target.value)}
                />
              </div>

              <div className="pagos-form-group">
                <label className="pagos-label">Beneficiario / Destinatario del Pago</label>
                <input
                  type="text"
                  className="pagos-input"
                  placeholder="Ej: Transportes Marvisur, Juan Pérez, Proveedor Tech..."
                  value={beneficiario}
                  onChange={(e) => setBeneficiario(e.target.value)}
                />
              </div>
            </div>

            {/* Observaciones */}
            <div className="pagos-form-group">
              <label className="pagos-label">Observaciones / Notas Adicionales</label>
              <textarea
                className="pagos-textarea"
                rows={2}
                placeholder="Detalla cualquier acuerdo, plazo, número de guía asociada o condición de este pago..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* BLOQUE 3: Adjuntar Captura de Pago */}
        <section className="pagos-card">
          <div className="pagos-card__header">
            <span className="pagos-card__badge" style={{ background: `${roleAccent}1a`, color: roleAccent }}>
              Paso 3
            </span>
            <div className="pagos-card__titles">
              <h3>Captura de Pago / Voucher <span className="req">*</span></h3>
              <p>Arrastra, selecciona o presiona Ctrl+V para pegar la captura de pantalla</p>
            </div>
          </div>

          <div className="pagos-card__body">
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleFileChange}
            />

            {!archivo ? (
              <div
                className={`pagos-dropzone ${isDragging ? 'pagos-dropzone--active' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="pagos-dropzone__icon">
                  <GoogleIcon name="cloud_upload" size={44} color="#3b82f6" />
                </div>
                <h4>Arrastra aquí la captura del pago o haz clic para examinar</h4>
                <p>
                  Soporta formatos <strong>PNG, JPG, WEBP</strong> hasta 15MB.
                </p>
                <div className="pagos-dropzone__hint">
                  <GoogleIcon name="content_paste" size={16} color="#64748b" />
                  <span>Tip: También puedes capturar tu pantalla (Windows + Shift + S) y pegarla directamente con <strong>Ctrl + V</strong></span>
                </div>
              </div>
            ) : (
              <div className="pagos-preview-card">
                <div className="pagos-preview-card__img-wrap">
                  {previewUrl && <img src={previewUrl} alt="Vista previa de captura" />}
                </div>
                <div className="pagos-preview-card__info">
                  <div className="pagos-preview-card__name">
                    <GoogleIcon name="image" size={20} color="#10b981" />
                    <strong>{archivo.name}</strong>
                  </div>
                  <span className="pagos-preview-card__size">
                    {(archivo.size / 1024).toFixed(1)} KB · {archivo.type || 'image/jpeg'}
                  </span>
                  <div className="pagos-preview-card__actions">
                    <button
                      type="button"
                      className="pagos-btn pagos-btn--sm pagos-btn--outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <GoogleIcon name="sync" size={16} />
                      <span>Cambiar captura</span>
                    </button>
                    <button
                      type="button"
                      className="pagos-btn pagos-btn--sm pagos-btn--danger-outline"
                      onClick={handleClearFile}
                    >
                      <GoogleIcon name="delete" size={16} />
                      <span>Quitar</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Barra de Acciones */}
        <div className="pagos-form-actions">
          {onCancelar && (
            <button type="button" className="pagos-btn pagos-btn--secondary" onClick={onCancelar}>
              Cancelar
            </button>
          )}
          <button
            type="submit"
            className="pagos-btn pagos-btn--primary"
            disabled={isSubmitting}
            style={{ background: roleAccent }}
          >
            {isSubmitting ? (
              <>
                <span className="pagos-spinner" />
                <span>Registrando pago y voucher...</span>
              </>
            ) : (
              <>
                <GoogleIcon name="check_circle" size={19} color="#fff" />
                <span>Registrar Pago</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
