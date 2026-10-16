import React, { useState } from 'react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { GoogleIcon } from '../../components/GoogleIcon';
import type { Oportunidad } from '../../types/oportunidades';
import { registrarOCApi, cambiarEstadoApi } from '../../api/services/oportunidades.service';
import { PrecioInput } from '../../components/FormInputs/PrecioInput';
import './RegistroOportunidad.css';

interface RegistrarOCScreenProps {
  op: Oportunidad;
  roleAccent?: string;
  onBack: () => void;
  onSuccess: (opActualizada: Oportunidad) => void;
}

export const RegistrarOCScreen: React.FC<RegistrarOCScreenProps> = ({
  op,
  roleAccent = '#2563eb',
  onBack,
  onSuccess,
}) => {
  const [registrarBusy, setRegistrarBusy] = useState(false);

  const [formOC, setFormOC] = useState({
    numeroOC: '',
    fechaEmisionOC: '',
    nroOCAM: '',
    nroExpediente: '',
    nroFolio: '',
    unidad: op.entidadConvocante || op.empresaRazonSocial || '',
    codigoCIAF: '',
    montoOCAM: Number(op.limiteTotal) || 0,
    archivoOCUrl: '',
    archivoNombre: '',
  });

  const handleArchivoOCChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormOC((prev) => ({
        ...prev,
        archivoOCUrl: (event.target?.result as string) || '',
        archivoNombre: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRegistrarOC = async () => {
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
    if (!formOC.unidad.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Unidad de la entidad requerida',
        text: 'Ingresa la unidad operativa o dependencia de la entidad.',
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
    if (!formOC.archivoOCUrl.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Documento PDF obligatorio',
        text: 'Adjunta el archivo digital oficial de la Orden de Compra emitida por Perú Compras (PDF o imagen).',
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
        archivoOCUrl: formOC.archivoOCUrl,
        unidad: formOC.unidad.trim(),
        codigoCIAF: formOC.codigoCIAF.trim(),
        montoOCAM: formOC.montoOCAM,
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
        archivoOCUrl: formOC.archivoOCUrl,
        unidad: formOC.unidad.trim(),
        codigoCIAF: formOC.codigoCIAF.trim(),
        montoOCAM: formOC.montoOCAM,
      };

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
            <strong>Flujo Oficial:</strong> Al registrar Folio, Expediente, N° OCAM y adjuntar el documento emitido,
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
                Unidad (u.o.e.) <span className="required">*</span>
              </label>
              <input
                id="reg-ocam-unidad"
                type="text"
                placeholder="Ej. Gerencia de Logística / Sede Central"
                value={formOC.unidad}
                onChange={(e) => setFormOC({ ...formOC, unidad: e.target.value })}
                required
              />
              <span className="reg-field-hint">Unidad operativa o dependencia convocante de la entidad</span>
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
              />
              <span className="reg-field-hint">Monto techo presupuestal formal adjudicado en Soles (S/)</span>
            </div>
          </div>
        </div>

        {/* ── 3. SECCIÓN 3: DOCUMENTO DIGITAL OFICIAL DE PERÚ COMPRAS ── */}
        <div className="reg-flat-section reg-flat-section--required">
          <div className="reg-flat-section__header">
            <div className="reg-flat-section__title">
              <span className="reg-flat-section__badge-num">3</span>
              <div>
                <h3>Documento Oficial de Perú Compras (Sustento Digital)</h3>
                <span className="reg-flat-section__desc">
                  Adjunta el archivo digital formal de la Orden de Compra para habilitar las solicitudes de pago.
                </span>
              </div>
            </div>
            <span className="reg-flat-badge-obligatorio">Paso Obligatorio</span>
          </div>

          <div
            style={{
              border: '2px dashed #cbd5e1',
              background: '#f8fafc',
              borderRadius: 4,
              padding: '24px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <input
              type="file"
              id={`archivo-oc-standalone-${op.id}`}
              accept=".pdf,image/*"
              onChange={handleArchivoOCChange}
              style={{ display: 'none' }}
            />
            <GoogleIcon name="cloud_upload" size={40} color={roleAccent} />
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
              {formOC.archivoNombre ? formOC.archivoNombre : 'Selecciona o arrastra la Orden de Compra de Perú Compras'}
            </div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Formatos soportados: <strong>PDF, JPG, PNG</strong>
            </span>
            <label
              htmlFor={`archivo-oc-standalone-${op.id}`}
              className="reg-btn-quick-action"
              style={{
                background: roleAccent,
                cursor: 'pointer',
                marginTop: 6,
                padding: '9px 18px',
                fontSize: '12.5px',
              }}
            >
              <GoogleIcon name="upload_file" size={16} color="#ffffff" />
              <span>{formOC.archivoNombre ? 'Cambiar Documento' : 'Examinar Documento Oficial'}</span>
            </label>
          </div>

          {formOC.archivoOCUrl && (
            <div
              style={{
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
              disabled={registrarBusy}
              style={{
                padding: '10px 24px',
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                borderRadius: 4,
              }}
            >
              <GoogleIcon name="save" size={17} color="#ffffff" />
              <span>{registrarBusy ? 'Registrando y pasando a Cotización…' : 'Registrar OCAM y Pasar a Cotización'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
