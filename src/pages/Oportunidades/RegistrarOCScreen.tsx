import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import type { Oportunidad, DocumentoOCItem } from '../../types/oportunidades';
import {
  obtenerPoolDocumentosOC,
  guardarPoolDocumentosOC,
  procesarArchivosParaPool,
  getDocumentoVisualProps,
  cargarPoolCompletoAsync,
} from '../../utils/documentosPoolUtils';
import { registrarOCApi, cambiarEstadoApi } from '../../api/services/oportunidades.service';
import { PrecioInput } from '../../components/FormInputs/PrecioInput';
import './RegistroOportunidad.css';
import type { RegistrarOCScreenProps } from './RegistrarOCScreenProps';
import { VerDocumentoModal, type DocumentoVisualizable } from '../../components/DocumentoModal/VerDocumentoModal';

export const RegistrarOCScreen: React.FC<RegistrarOCScreenProps> = ({
  op,
  roleAccent = '#2563eb',
  onBack,
  onSuccess,
}) => {
  const [registrarBusy, setRegistrarBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [documentoParaVer, setDocumentoParaVer] = useState<DocumentoVisualizable | null>(null);

  const MAX_DOCS_OC = 2;

  // Pool de documentos oficiales (hasta 2 documentos acumulados sin reemplazarse)
  const initialPool = obtenerPoolDocumentosOC(op).slice(0, MAX_DOCS_OC);
  const [documentosPool, setDocumentosPool] = useState<DocumentoOCItem[]>(initialPool);

  const [formOC, setFormOC] = useState({
    numeroOC: op.ordenCompra?.numeroOC || '',
    fechaEmisionOC: op.ordenCompra?.fechaEmisionOC || '',
    nroOCAM: op.ordenCompra?.nroOCAM || '',
    nroExpediente: op.ordenCompra?.nroExpediente || '',
    nroFolio: op.ordenCompra?.nroFolio || '',
    codigoUnidadEjecutora: op.ordenCompra?.codigoUnidadEjecutora || op.entidadConvocante || op.empresaRazonSocial || '',
    codigoCIAF: op.ordenCompra?.codigoCIAF || '',
    montoOCAM: op.ordenCompra?.montoOCAM || Number(op.limiteTotal) || 0,
    flete: op.ordenCompra?.flete ?? 0,
    archivoOCUrl: initialPool[0]?.url || op.ordenCompra?.archivoOCUrl || '',
    archivoNombre: initialPool[0]?.nombre || (op.ordenCompra as any)?.archivoNombre || '',
  });

  const limiteOCAM = Number(op.limiteTotal) || 0;
  const limiteOCAMTexto = limiteOCAM.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Sincroniza el pool con formOC y persistencia local
  const sincronizarPool = (nuevoPool: DocumentoOCItem[]) => {
    setDocumentosPool(nuevoPool);
    setFormOC((prev) => ({
      ...prev,
      archivoOCUrl: nuevoPool[0]?.url || '',
      archivoNombre: nuevoPool[0]?.nombre || '',
    }));
    guardarPoolDocumentosOC(op.id, nuevoPool);
  };

  // Cargar documentos pesados (DataURLs) desde IndexedDB si se reinició la página
  useEffect(() => {
    cargarPoolCompletoAsync(op.id).then((poolCompleto) => {
      if (poolCompleto && poolCompleto.length > 0) {
        const limitado = poolCompleto.slice(0, MAX_DOCS_OC);
        setDocumentosPool(limitado);
        setFormOC((prev) => ({
          ...prev,
          archivoOCUrl: limitado[0]?.url || prev.archivoOCUrl,
          archivoNombre: limitado[0]?.nombre || prev.archivoNombre,
        }));
      }
    });
  }, [op.id]);

  // Agrega archivos acumulativamente al pool (no reemplaza los existentes)
  const agregarArchivosAlPool = async (files: FileList | File[]) => {
    if (!files || (files instanceof FileList && files.length === 0)) return;
    const disponibles = MAX_DOCS_OC - documentosPool.length;
    if (disponibles <= 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Máximo de documentos alcanzado',
        text: `Solo puedes adjuntar hasta ${MAX_DOCS_OC} documentos de la Orden de Compra.`,
        confirmButtonColor: roleAccent,
      });
      return;
    }

    const lista = Array.from(files).slice(0, disponibles);
    const procesados = await procesarArchivosParaPool(lista);
    if (!procesados.length) return;

    const actualizado = [...documentosPool, ...procesados].slice(0, MAX_DOCS_OC);
    sincronizarPool(actualizado);
  };

  const handleArchivoOCChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await agregarArchivosAlPool(e.target.files);
      // Limpia para que el usuario pueda volver a seleccionar el mismo archivo o nuevos
      e.target.value = '';
    }
  };

  const handleQuitarDocumento = (idOIndex: string | number) => {
    const filtrado = documentosPool.filter((d, idx) => (d.id != null ? d.id !== idOIndex : idx !== idOIndex));
    sincronizarPool(filtrado);
  };

  const esAceptadaPorPeruCompras = op.estado === 'Aceptada por Perú Compras' || op.estado === 'Adjudicada';

  const handleRegistrarOC = async () => {
    if (!esAceptadaPorPeruCompras) {
      Swal.fire({
        icon: 'warning',
        title: 'Requiere Aceptación de Perú Compras',
        html: `El Registro de Orden de Compra Oficial (OCAM) solo se puede generar cuando la oportunidad sea <strong>Aceptada por Perú Compras</strong>.<br/><br/>Estado actual: <strong>${op.estado}</strong>.<br/><br/><span style="color:#64748b; font-size:13px;">Primero debes adjuntar el documento oficial emitido por Perú Compras en <em>Subir Evidencias</em> para acreditar la adjudicación oficial.</span>`,
        confirmButtonColor: roleAccent,
      });
      return;
    }

    if (!formOC.numeroOC.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'N° de Orden de Compra requerido',
        text: 'Ingresa el número de Orden de Compra emitida (ej. OC-2026-0000001).',
        confirmButtonColor: roleAccent,
      });
      return;
    }
    if (!formOC.nroOCAM.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'N° OCAM requerido',
        text: 'Ingresa el número oficial de OCAM emitido en el portal Perú Compras.',
        confirmButtonColor: roleAccent,
      });
      return;
    }
    if (!formOC.nroExpediente.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'N° de Expediente requerido',
        text: 'Ingresa el número de expediente de contratación.',
        confirmButtonColor: roleAccent,
      });
      return;
    }
    if (!formOC.nroFolio.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'N° de Folio requerido',
        text: 'Ingresa el número de folio de la orden de compra.',
        confirmButtonColor: roleAccent,
      });
      return;
    }
    if (!formOC.codigoUnidadEjecutora.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Código de Unidad Ejecutora requerido',
        text: 'Ingresa el Código de Unidad Ejecutora (U.O.E.) de la entidad.',
        confirmButtonColor: roleAccent,
      });
      return;
    }
    if (!formOC.codigoCIAF.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Código CIAF requerido',
        text: 'Ingresa el código CIAF asignado a la orden de compra.',
        confirmButtonColor: roleAccent,
      });
      return;
    }
    if (!formOC.montoOCAM || formOC.montoOCAM <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Monto OCAM requerido',
        text: 'El monto de la OCAM (techo financiero presupuestal) debe ser mayor a S/ 0.00.',
        confirmButtonColor: roleAccent,
      });
      return;
    }
    if (limiteOCAM > 0 && formOC.montoOCAM > limiteOCAM) {
      Swal.fire({
        icon: 'warning',
        title: 'Monto OCAM supera el límite',
        text: `El monto de la OCAM no puede ser mayor al límite total del requerimiento (S/ ${limiteOCAMTexto}).`,
        confirmButtonColor: roleAccent,
      });
      return;
    }
    if (documentosPool.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Documento oficial obligatorio',
        text: `Adjunta al menos un archivo digital oficial de la Orden de Compra (máximo ${MAX_DOCS_OC}).`,
        confirmButtonColor: roleAccent,
      });
      return;
    }
    if (documentosPool.length > MAX_DOCS_OC) {
      Swal.fire({
        icon: 'warning',
        title: 'Demasiados documentos',
        text: `Solo puedes adjuntar hasta ${MAX_DOCS_OC} documentos de la Orden de Compra.`,
        confirmButtonColor: roleAccent,
      });
      return;
    }
    if (formOC.flete != null && (isNaN(Number(formOC.flete)) || Number(formOC.flete) < 0)) {
      Swal.fire({
        icon: 'warning',
        title: 'Flete inválido',
        text: 'El flete debe ser un monto numérico mayor o igual a S/ 0.00.',
        confirmButtonColor: roleAccent,
      });
      return;
    }

    setRegistrarBusy(true);
    try {
      const res = await registrarOCApi(op.id, {
        numeroOC: formOC.numeroOC.trim(),
        fechaEmisionOC: formOC.fechaEmisionOC || null,
        nroOCAM: formOC.nroOCAM.trim(),
        nroExpediente: formOC.nroExpediente.trim(),
        nroFolio: formOC.nroFolio.trim(),
        archivoOCUrl: formOC.archivoOCUrl || documentosPool[0]?.url || '',
        codigoUnidadEjecutora: formOC.codigoUnidadEjecutora.trim(),
        codigoCIAF: formOC.codigoCIAF.trim(),
        montoOCAM: formOC.montoOCAM,
        flete: Number(formOC.flete) || 0,
      });

      // Pasar la oportunidad formalmente a Cotización
      try {
        await cambiarEstadoApi(op.id, 'Cotización');
      } catch (err) {
        console.warn('Estado cambiado en backend/local:', err);
      }

      const ocActualizada = {
        ...(res.ordenCompra || {}),
        numeroOC: formOC.numeroOC.trim(),
        nroOCAM: formOC.nroOCAM.trim(),
        nroExpediente: formOC.nroExpediente.trim(),
        nroFolio: formOC.nroFolio.trim(),
        archivoOCUrl: formOC.archivoOCUrl || documentosPool[0]?.url || '',
        archivoNombre: formOC.archivoNombre || documentosPool[0]?.nombre || '',
        documentosPool: documentosPool,
        codigoUnidadEjecutora: formOC.codigoUnidadEjecutora.trim(),
        codigoCIAF: formOC.codigoCIAF.trim(),
        montoOCAM: formOC.montoOCAM,
        flete: Number(formOC.flete) || 0,
      };

      guardarPoolDocumentosOC(op.id, documentosPool);

      const opFinal: Oportunidad = {
        ...op,
        estado: 'Cotización',
        ordenCompra: ocActualizada as any,
      };

      await Swal.fire({
        icon: 'success',
        title: '¡Orden de Compra Registrada con Éxito!',
        html: `
          <div style="text-align: left; font-size: 13.5px; color: #334155;">
            <p>Se registró formalmente la OC <strong>${formOC.numeroOC}</strong> para el requerimiento <strong>${op.numeroRequerimiento}</strong>.</p>
            <p>Documentos adjuntados en el pool: <strong>${documentosPool.length}</strong> archivo(s).</p>
            <div style="background: #ecfdf5; border: 1px solid #86efac; border-radius: 4px; padding: 10px; margin: 10px 0; color: #166534; font-size: 13px;">
              ✓ La oportunidad pasó al estado <strong>Cotización</strong> y quedaron <strong>habilitadas las solicitudes de pago</strong>.
            </div>
          </div>
        `,
        confirmButtonColor: '#059669',
      });

      onSuccess(opFinal);
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error al registrar Orden de Compra',
        text: err.message || 'Ocurrió un error al contactar al servidor.',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setRegistrarBusy(false);
    }
  };

  return (
    <div
      className="reg-oportunidad"
      style={
        {
          '--accent-color': roleAccent,
          '--accent-bg': `${roleAccent}15`,
          '--accent-border': `${roleAccent}40`,
        } as React.CSSProperties
      }
    >
      {/* ── Banner Superior Idéntico al Sistema (.reg-hero) ── */}
      <div className="reg-hero">
        <div className="reg-hero__left">
          <div className="reg-hero__badge-icon" style={{ background: `${roleAccent}15` }}>
            <GoogleIcon name="verified" size={28} color={roleAccent} />
          </div>
          <div className="reg-hero__title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1>Registro de Orden de Compra Oficial (OCAM)</h1>
              <span className="reg-pill-express">
                PERÚ COMPRAS
              </span>
            </div>
            <p>
              Plataforma de Acuerdos Marco &bull; Catálogo Perú Compras &bull; Registro Oficial para Ejecutivas
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            className="reg-hero__tag"
            style={{ background: `${roleAccent}12`, color: roleAccent, border: `1.5px solid ${roleAccent}30` }}
          >
            <GoogleIcon name="verified_user" size={15} color={roleAccent} />
            <span>VENTAS &bull; PERÚ COMPRAS</span>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="reg-btn-cancel-flat"
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: 4,
              color: '#334155',
              fontWeight: 700,
            }}
          >
            <GoogleIcon name="arrow_back" size={16} />
            <span>Volver al Listado</span>
          </button>
        </div>
      </div>

      {/* ── Strip de Información Oficial ── */}
      <div
        className="reg-quick-action-strip"
        style={{ background: '#eff6ff', borderColor: '#bfdbfe', borderStyle: 'solid' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GoogleIcon name="info" size={22} color="#2563eb" />
          <div style={{ fontSize: '13px', color: '#1e40af' }}>
            <strong>Flujo Oficial:</strong> Al registrar Folio, Expediente, N° OCAM y adjuntar los documentos del pool,
            la oportunidad avanzará formalmente al estado <strong>Cotización</strong> y se habilitarán los pagos a proveedores y transportistas.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '12.5px', color: '#334155' }}>
          <span>Límite Cotizado:</span>
          <strong style={{ color: '#059669', fontSize: '14.5px' }}>
            S/ {Number(op.limiteTotal).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </strong>
        </div>
      </div>

      {/* ── Bloqueo visual por Regla de Negocio ── */}
      {!esAceptadaPorPeruCompras && (
        <div
          style={{
            background: '#fff7ed',
            border: '1.5px solid #fdba74',
            borderRadius: '4px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            color: '#9a3412',
            fontSize: '13px',
          }}
        >
          <GoogleIcon name="warning" size={24} color="#ea580c" />
          <div>
            <strong>Regla de negocio:</strong> El Registro de Orden de Compra Oficial (OCAM) solo se puede generar cuando la oportunidad sea <strong>Aceptada por Perú Compras</strong>.
            <br />
            Estado actual: <strong>{op.estado}</strong>. Debe adjuntarse primero el documento oficial emitido por Perú Compras en el módulo de <em>Subir Evidencias</em>.
          </div>
        </div>
      )}

      {/* ── Formulario Unificado (.reg-unified-form con esquinas rectas) ── */}
      <div className="reg-unified-form">
        {/* ── 1. SECCIÓN 1: DATOS DE LA ORDEN DE COMPRA EMITIDA ── */}
        <div className="reg-flat-section reg-flat-section--required">
          <div className="reg-flat-section__header">
            <div className="reg-flat-section__title">
              <span className="reg-flat-section__badge-num">1</span>
              <div>
                <h3>Datos de la Orden de Compra Emitida</h3>
                <span className="reg-flat-section__desc">
                  Información oficial obligatoria emitida para formalizar la adjudicación.
                </span>
              </div>
            </div>
            <span className="reg-flat-badge-obligatorio">Paso Obligatorio</span>
          </div>

          <div className="reg-form-row">
            <div className="reg-field">
              <label htmlFor="reg-oc-numero">
                Número de Orden de Compra <span className="required">*</span>
              </label>
              <input
                id="reg-oc-numero"
                type="text"
                placeholder="Ej. OC-2026-0000001"
                value={formOC.numeroOC}
                onChange={(e) => setFormOC({ ...formOC, numeroOC: e.target.value })}
                required
              />
              <span className="reg-field-hint">Código oficial en la plataforma Perú Compras</span>
            </div>

            <div className="reg-field">
              <label htmlFor="reg-oc-fecha">
                Fecha y hora de emisión
              </label>
              <input
                id="reg-oc-fecha"
                type="datetime-local"
                value={formOC.fechaEmisionOC}
                onChange={(e) => setFormOC({ ...formOC, fechaEmisionOC: e.target.value })}
              />
              <span className="reg-field-hint">Fecha y hora oficial registrada en la orden de compra</span>
            </div>
          </div>
        </div>

        {/* ── 2. SECCIÓN 2: DATOS DE LA OCAM (PERÚ COMPRAS) ── */}
        <div className="reg-flat-section reg-flat-section--required">
          <div className="reg-flat-section__header">
            <div className="reg-flat-section__title">
              <span className="reg-flat-section__badge-num">2</span>
              <div>
                <h3>Datos de la OCAM (Perú Compras)</h3>
                <span className="reg-flat-section__desc">
                  Número OCAM, expediente de contratación, folio, unidad operativa, CIAF y monto formal.
                </span>
              </div>
            </div>
            <span className="reg-flat-badge-obligatorio">Paso Obligatorio</span>
          </div>

          <div className="reg-form-row">
            <div className="reg-field">
              <label htmlFor="reg-ocam-numero">
                Número OCAM <span className="required">*</span>
              </label>
              <input
                id="reg-ocam-numero"
                type="text"
                placeholder="Ej. OCAM-2026-000001234"
                value={formOC.nroOCAM}
                onChange={(e) => setFormOC({ ...formOC, nroOCAM: e.target.value })}
                required
              />
              <span className="reg-field-hint">Identificador oficial emitido en el catálogo de acuerdos marco</span>
            </div>

            <div className="reg-field">
              <label htmlFor="reg-ocam-expediente">
                Número de Expediente <span className="required">*</span>
              </label>
              <input
                id="reg-ocam-expediente"
                type="text"
                placeholder="Ej. EE-2026-0000001"
                value={formOC.nroExpediente}
                onChange={(e) => setFormOC({ ...formOC, nroExpediente: e.target.value })}
                required
              />
              <span className="reg-field-hint">Expediente de contratación formal de la entidad</span>
            </div>
          </div>

          <div className="reg-form-row">
            <div className="reg-field">
              <label htmlFor="reg-ocam-folio">
                Número de Folio <span className="required">*</span>
              </label>
              <input
                id="reg-ocam-folio"
                type="text"
                placeholder="Ej. FOLIO-001"
                value={formOC.nroFolio}
                onChange={(e) => setFormOC({ ...formOC, nroFolio: e.target.value })}
                required
              />
              <span className="reg-field-hint">Folio registrado en el expediente de la orden</span>
            </div>

            <div className="reg-field">
              <label htmlFor="reg-ocam-unidad">
                Código de Unidad Ejecutora (U.O.E.) <span className="required">*</span>
              </label>
              <input
                id="reg-ocam-unidad"
                type="text"
                placeholder="Ej. 001-1234"
                value={formOC.codigoUnidadEjecutora}
                onChange={(e) => setFormOC({ ...formOC, codigoUnidadEjecutora: e.target.value })}
                required
              />
              <span className="reg-field-hint">Código de la Unidad Ejecutora de la entidad</span>
            </div>
          </div>

          <div className="reg-form-row">
            <div className="reg-field">
              <label htmlFor="reg-ocam-ciaf">
                Código CIAF <span className="required">*</span>
              </label>
              <input
                id="reg-ocam-ciaf"
                type="text"
                placeholder="Ej. CIAF-2026-000001"
                value={formOC.codigoCIAF}
                onChange={(e) => setFormOC({ ...formOC, codigoCIAF: e.target.value })}
                required
              />
              <span className="reg-field-hint">Código del sistema de administración financiera del estado</span>
            </div>

            <div className="reg-field">
              <label>
                Monto OCAM / Techo Presupuestal <span className="required">*</span>
              </label>
              <PrecioInput
                value={formOC.montoOCAM}
                onChange={(val) => setFormOC({ ...formOC, montoOCAM: val })}
                placeholder="0.00"
                min={0.01}
                max={limiteOCAM > 0 ? limiteOCAM : undefined}
              />
              <span className="reg-field-hint">Monto techo presupuestal formal adjudicado en Soles (S/)</span>
              {limiteOCAM > 0 && (
                <span className="reg-field-hint reg-field-hint--limit">
                  Máximo permitido: S/ {limiteOCAMTexto} (límite total del requerimiento)
                </span>
              )}
            </div>

            <div className="reg-field">
              <label htmlFor="reg-ocam-flete">
                Flete (S/)
              </label>
              <PrecioInput
                value={Number(formOC.flete) || 0}
                onChange={(val) => setFormOC({ ...formOC, flete: val })}
                placeholder="0.00"
                min={0}
              />
              <span className="reg-field-hint">Costo logístico acordado para la Orden de Compra</span>
            </div>
          </div>
        </div>

        {/* ── 3. SECCIÓN 3: DOCUMENTO DIGITAL OFICIAL DE PERÚ COMPRAS (POOL DE DOCUMENTOS) ── */}
        <div className="reg-flat-section reg-flat-section--required">
          <div className="reg-flat-section__header">
            <div className="reg-flat-section__title">
              <span className="reg-flat-section__badge-num">3</span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h3>Documentos Oficiales de Perú Compras (Pool de Documentos)</h3>
                  {documentosPool.length > 0 && (
                    <span
                      style={{
                        background: '#059669',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 12,
                        letterSpacing: '0.3px',
                      }}
                    >
                      {documentosPool.length} {documentosPool.length === 1 ? 'documento en pool' : 'documentos en pool'}
                    </span>
                  )}
                </div>
                <span className="reg-flat-section__desc">
                  Puedes subir 1 o más documentos en este pool (Orden de Compra, adendas, resolución, anexos técnicos). No se reemplazarán entre sí.
                </span>
              </div>
            </div>
            <span className="reg-flat-badge-obligatorio">Paso Obligatorio</span>
          </div>

          {/* Zona Drag & Drop para subir al pool */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                await agregarArchivosAlPool(e.dataTransfer.files);
              }
            }}
            style={{
              border: isDragging ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
              background: isDragging ? '#eff6ff' : '#f8fafc',
              borderRadius: 4,
              padding: '24px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              transition: 'all 0.15s ease',
            }}
          >
            <input
              type="file"
              multiple
              id={`archivo-oc-standalone-${op.id}`}
              accept=".pdf,image/*,.doc,.docx,.xls,.xlsx"
              onChange={handleArchivoOCChange}
              disabled={documentosPool.length >= MAX_DOCS_OC}
              style={{ display: 'none' }}
            />
            <GoogleIcon name="cloud_upload" size={40} color={isDragging ? '#2563eb' : roleAccent} />
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
              {documentosPool.length > 0
                ? `${documentosPool.length} de ${MAX_DOCS_OC} documento(s) adjunto(s).`
                : `Selecciona o arrastra hasta ${MAX_DOCS_OC} documentos de la Orden de Compra`}
            </div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Formatos soportados: <strong>PDF, JPG, PNG, DOCX, XLSX</strong> &bull; máximo {MAX_DOCS_OC} archivos
            </span>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <label
                htmlFor={`archivo-oc-standalone-${op.id}`}
                className="reg-btn-quick-action"
                style={{
                  background: documentosPool.length >= MAX_DOCS_OC ? '#94a3b8' : roleAccent,
                  cursor: documentosPool.length >= MAX_DOCS_OC ? 'not-allowed' : 'pointer',
                  padding: '9px 18px',
                  fontSize: '12.5px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <GoogleIcon name="upload_file" size={16} color="#ffffff" />
                <span>{documentosPool.length >= MAX_DOCS_OC ? 'Máximo alcanzado' : documentosPool.length > 0 ? '+ Agregar Documento' : 'Examinar Documentos (Pool)'}</span>
              </label>
            </div>
          </div>

          {/* LISTA COMPLETA DE DOCUMENTOS SUBIDOS AL POOL */}
          {documentosPool.length > 0 ? (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 4px',
                  borderBottom: '1.5px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <GoogleIcon name="folder_open" size={18} color="#2563eb" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Documentos Oficiales Subidos ({documentosPool.length})
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <GoogleIcon name="check_circle" size={15} color="#059669" />
                  Todos se conservan juntos en el pool
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {documentosPool.map((doc, idx) => {
                  const visual = getDocumentoVisualProps(doc.nombre, doc.tipo);
                  return (
                    <div
                      key={doc.id || idx}
                      style={{
                        padding: '12px 16px',
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <span
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 4,
                            background: visual.badgeBg,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <GoogleIcon name={visual.icon} size={20} color={visual.color} />
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '13.5px',
                              fontWeight: 700,
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              maxWidth: '460px',
                            }}
                            title={doc.nombre}
                          >
                            {doc.nombre}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', gap: 8, marginTop: 2 }}>
                            {doc.tamanoTexto && <span>{doc.tamanoTexto}</span>}
                            <span>&bull;</span>
                            <span>Documento #{idx + 1} del pool</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {doc.url && (
                          <button
                            type="button"
                            onClick={() => setDocumentoParaVer(doc)}
                            style={{
                              padding: '6px 12px',
                              background: '#eff6ff',
                              border: '1.5px solid #bfdbfe',
                              color: '#1d4ed8',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              borderRadius: 4,
                            }}
                            title="Ver documento en modal"
                          >
                            <GoogleIcon name="visibility" size={15} color="#1d4ed8" />
                            <span>Ver Documento</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleQuitarDocumento(doc.id || idx)}
                          title="Quitar este documento del pool"
                          style={{
                            padding: '6px 12px',
                            background: '#fff1f2',
                            border: '1px solid #fecdd3',
                            color: '#e11d48',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            borderRadius: 3,
                          }}
                        >
                          <GoogleIcon name="delete" size={15} color="#e11d48" />
                          <span>Quitar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mensaje de confirmación del pool */}
              <div
                style={{
                  padding: '10px 14px',
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: '12.5px',
                  color: '#166534',
                }}
              >
                <GoogleIcon name="verified" size={20} color="#16a34a" />
                <div>
                  <strong>Pool verificado:</strong> Hay {documentosPool.length} archivo(s) listo(s) para vincular a la Orden de Compra.
                </div>
              </div>
            </div>
          ) : (
            formOC.archivoOCUrl && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: '12.5px',
                  color: '#166534',
                }}
              >
                <GoogleIcon name="verified" size={20} color="#16a34a" />
                <div>
                  <strong>Documento adjuntado con éxito:</strong> {formOC.archivoNombre}
                </div>
              </div>
            )
          )}
        </div>

        {/* ── 4. SECCIÓN 4: RESUMEN DEL REQUERIMIENTO ADJUDICADO ── */}
        <div className="reg-flat-section">
          <div className="reg-flat-section__header">
            <div className="reg-flat-section__title">
              <span className="reg-flat-section__badge-num" style={{ background: '#059669' }}>
                <GoogleIcon name="description" size={16} color="#ffffff" />
              </span>
              <div>
                <h3>Resumen del Requerimiento Adjudicado ({op.numeroRequerimiento})</h3>
                <span className="reg-flat-section__desc">
                  Entidad: <strong>{op.entidadConvocante || op.empresaRazonSocial || 'No especificada'}</strong> &bull; Límite Total: <strong>S/ {Number(op.limiteTotal).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong>
                </span>
              </div>
            </div>
            <span
              className="reg-flat-badge-opcional"
              style={{ color: '#059669', borderColor: '#86efac', background: '#ecfdf5' }}
            >
              Buena Pro Asignada
            </span>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 4 }}>
            <table className="reg-table" style={{ width: '100%', minWidth: 'unset' }}>
              <thead>
                <tr>
                  <th>N° Parte</th>
                  <th style={{ textAlign: 'center' }}>Cantidad</th>
                  <th style={{ textAlign: 'right' }}>Límite Unitario</th>
                  <th style={{ textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(op.items || []).map((it) => {
                  const sub = (Number(it.cantidad) || 0) * (Number(it.limiteUnitario) || 0);
                  return (
                    <tr key={it.id}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{it.numeroParte}</td>
                      <td style={{ textAlign: 'center' }}>{it.cantidad}</td>
                      <td style={{ textAlign: 'right', color: '#64748b' }}>S/ {Number(it.limiteUnitario).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', color: '#059669', fontWeight: 700 }}>S/ {sub.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Barra de Acciones Inferior ── */}
        <div
          style={{
            padding: '24px 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            * Todos los campos y el documento digital son obligatorios para formalizar la adjudicación en Perú Compras.
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              className="reg-btn-cancel-flat"
              onClick={onBack}
              disabled={registrarBusy}
              style={{
                padding: '10px 20px',
                fontSize: '13px',
                cursor: 'pointer',
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                color: '#475569',
                fontWeight: 700,
                borderRadius: 4,
              }}
            >
              Cancelar y Volver
            </button>

            <button
              type="button"
              className="reg-btn-submit-complete"
              onClick={handleRegistrarOC}
              disabled={registrarBusy || !esAceptadaPorPeruCompras}
              title={
                !esAceptadaPorPeruCompras
                  ? 'La oportunidad debe estar "Aceptada por Perú Compras" para registrar la OCAM'
                  : undefined
              }
              style={{
                padding: '10px 24px',
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                cursor: registrarBusy || !esAceptadaPorPeruCompras ? 'not-allowed' : 'pointer',
                opacity: !esAceptadaPorPeruCompras ? 0.6 : 1,
                borderRadius: 4,
              }}
            >
              <GoogleIcon name="save" size={17} color="#ffffff" />
              <span>{registrarBusy ? 'Registrando y pasando a Cotización…' : 'Registrar OCAM y Pasar a Cotización'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal para previsualizar documento PDF o imagen */}
      <VerDocumentoModal
        documento={documentoParaVer}
        onClose={() => setDocumentoParaVer(null)}
      />
    </div>
  );
};
