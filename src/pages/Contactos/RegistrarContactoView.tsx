// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Contactos/RegistrarContactoView.tsx
// Vista de registro de contactos en la Agenda:
// - Req 5: Permite agregar contacto SIN número de OCAM relacionada (Contacto, RUC, Nombre Entidad)
//          o CON número de OCAM relacionada.
// - Req 6: Permite agregar VARIOS contactos en un mismo registro.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import { crearContactosLoteApi } from '../../api/services/contactos.service';
import {
  getOportunidadesApi,
  type OportunidadApiResponse,
} from '../../api/services/oportunidades.service';
import type { TipoRelacionEmpresa, PersonaContactoItem } from '../../types/contactos';
import type { EmpresaOption } from '../../api/Dtos/Empresa';
import { BuscadorEmpresaModal } from '../../components/BuscadorEmpresaModal/BuscadorEmpresaModal';
import { useAuth } from '../../context/AuthContext';

interface RegistrarContactoViewProps {
  roleAccent?: string;
  onContactoRegistrado?: () => void;
}

interface FilaContactoForm {
  uid: string;
  contactoNumero: string;
  contactoNombre: string;
  contactoAreaCargo: string;
}

const crearFilaContactoVacia = (): FilaContactoForm => ({
  uid: `cnt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  contactoNumero: '',
  contactoNombre: '',
  contactoAreaCargo: '',
});

export const RegistrarContactoView: React.FC<RegistrarContactoViewProps> = ({
  roleAccent = '#2563eb',
  onContactoRegistrado,
}) => {
  const { empleado } = useAuth();

  // ── Modalidad: Con OCAM vs Sin Número de OCAM Relacionada (Req 5) ──
  const [sinOcamRelacionada, setSinOcamRelacionada] = useState<boolean>(false);
  const [numeroOcam, setNumeroOcam] = useState('');
  const [oportunidadSeleccionada, setOportunidadSeleccionada] =
    useState<OportunidadApiResponse | null>(null);

  // ── Datos de la Entidad: RUC y Nombre de la Entidad (Req 5) ──
  const [rucEntidad, setRucEntidad] = useState('');
  const [empresaRelacionada, setEmpresaRelacionada] = useState('');
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [tipoRelacion, setTipoRelacion] = useState<TipoRelacionEmpresa>('Entidad Solicitante');
  const [isEmpresaModalOpen, setIsEmpresaModalOpen] = useState(false);

  // ── Lista dinámica de Contactos para agregar varios contactos por registro (Req 6) ──
  const [contactosList, setContactosList] = useState<FilaContactoForm[]>(() => [
    crearFilaContactoVacia(),
  ]);

  // ── Motivo y Respuesta ──
  const [contactoMotivo, setContactoMotivo] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [loading, setLoading] = useState(false);

  // Lista de oportunidades para autocompletar OCAM
  const [oportunidades, setOportunidades] = useState<OportunidadApiResponse[]>([]);
  const [cargandoOportunidades, setCargandoOportunidades] = useState(false);

  useEffect(() => {
    const cargarOportunidades = async () => {
      setCargandoOportunidades(true);
      try {
        const ops = await getOportunidadesApi();
        if (Array.isArray(ops)) {
          setOportunidades(ops);
        }
      } catch (err) {
        console.warn('No se pudieron cargar oportunidades para autocompletar OCAM:', err);
      } finally {
        setCargandoOportunidades(false);
      }
    };
    cargarOportunidades();
  }, []);

  // Al seleccionar una OCAM existente de Licitaciones
  const handleSeleccionarOportunidad = (opIdStr: string) => {
    if (!opIdStr) {
      setOportunidadSeleccionada(null);
      return;
    }
    const op = oportunidades.find((o) => String(o.id) === opIdStr);
    if (op) {
      setOportunidadSeleccionada(op);
      const ocamNum =
        (op.ordenCompra as any)?.nroOCAM ||
        op.ordenCompra?.numeroOC ||
        `OCAM-${op.numeroRequerimiento}`;
      setNumeroOcam(ocamNum);

      if ((op as any).empresaRuc) {
        setRucEntidad((op as any).empresaRuc);
      }

      if (tipoRelacion === 'Entidad Solicitante') {
        setEmpresaRelacionada(op.entidadConvocante || op.empresaRazonSocial || 'Entidad Pública');
      } else if (tipoRelacion === 'Entidad / Marca de Cotización') {
        const marcasStr = op.marcas?.map((m) => m.nombre).join(', ');
        setEmpresaRelacionada(marcasStr || 'Proveedor / Marca');
      }
    }
  };

  // Al cambiar tipo de relación
  const handleCambiarTipoRelacion = (tipo: TipoRelacionEmpresa) => {
    setTipoRelacion(tipo);
    if (oportunidadSeleccionada && !sinOcamRelacionada) {
      if (tipo === 'Entidad Solicitante') {
        setEmpresaRelacionada(
          oportunidadSeleccionada.entidadConvocante ||
          oportunidadSeleccionada.empresaRazonSocial ||
          ''
        );
      } else if (tipo === 'Entidad / Marca de Cotización') {
        const marcasStr = oportunidadSeleccionada.marcas?.map((m) => m.nombre).join(', ');
        setEmpresaRelacionada(marcasStr || '');
      }
    }
  };

  // Selección desde el buscador de empresas (RUC + Nombre Entidad)
  const handleSelectEmpresaCatalogo = (emp: EmpresaOption) => {
    setRucEntidad(emp.ruc || '');
    setEmpresaRelacionada(emp.razonSocial || '');
    setEmpresaId(emp.id || null);
    setIsEmpresaModalOpen(false);
  };

  // ── Gestión de múltiples contactos por registro (Req 6) ──
  const handleAgregarContactoFila = () => {
    setContactosList((prev) => [...prev, crearFilaContactoVacia()]);
  };

  const handleEliminarContactoFila = (uid: string) => {
    setContactosList((prev) => (prev.length > 1 ? prev.filter((item) => item.uid !== uid) : prev));
  };

  const handleActualizarContactoFila = (
    uid: string,
    campo: keyof Omit<FilaContactoForm, 'uid'>,
    valor: string
  ) => {
    setContactosList((prev) =>
      prev.map((item) => (item.uid === uid ? { ...item, [campo]: valor } : item))
    );
  };

  const cargosFrecuentes = [
    'LOGÍSTICA - JEFE DE LOGÍSTICA',
    'ABASTECIMIENTO - ESPECIALISTA DE COMPRAS',
    'ALMACÉN CENTRAL - RECEPCIÓN',
    'TESORERÍA - GESTIÓN DE PAGOS',
    'ADMINISTRACIÓN - COORDINADOR',
  ];

  const motivosFrecuentes = [
    'SE CONTACTÓ SOBRE ESTADO EN EL QUE LLEGÓ EL PRODUCTO',
    'CONFIRMACIÓN DE GUÍA DE REMISIÓN Y ACTA DE ENTREGA',
    'COORDINACIÓN DE FECHA Y HORARIO DE DESCARGA',
    'CONSULTA DE CONFORMIDAD Y TRÁMITE DE PAGO OCAM',
    'REGISTRO DE CONTACTO DIRECTO DE ENTIDAD EN DIRECTORIO',
  ];

  const aplicarRespuestaCaso1 = () => {
    setRespuesta('CASO 1: DIJO QUE EL ESTADO DEL PRODUCTO LLEGO EN PERFECTAS CONDICIONES');
  };

  const aplicarRespuestaCaso2 = () => {
    setRespuesta('CASO 2: NO CONTESTO TELEFONO');
  };

  const aplicarRespuestaRecado = () => {
    setRespuesta('LLAMAR MÁS TARDE / SE DEJÓ MENSAJE A ASISTENTE');
  };

  const aplicarRespuestaDirectorio = () => {
    setRespuesta('CONTACTO REGISTRADO EN DIRECTORIO DE LA ENTIDAD');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validar OCAM si está en modo "Con OCAM Relacionada"
    if (!sinOcamRelacionada && !numeroOcam.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Número de OCAM requerido',
        text: 'Ingresa el número de OCAM o selecciona la opción "Sin Número de OCAM Relacionada".',
        confirmButtonColor: roleAccent,
      });
      return;
    }

    // 2. Validar RUC de la Entidad (obligatorio en todos los registros)
    if (!rucEntidad.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'RUC de la Entidad requerido',
        text: 'Debes indicar el RUC y el Nombre de la Entidad para asociar los contactos a un único registro de entidad.',
        confirmButtonColor: roleAccent,
      });
      return;
    }

    // 3. Validar Nombre de la Entidad
    if (!empresaRelacionada.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Nombre de la Entidad requerido',
        text: 'Ingresa o busca el nombre de la entidad o empresa relacionada.',
        confirmButtonColor: roleAccent,
      });
      return;
    }

    // 4. Validar lista de contactos (1 o varios contactos por registro)
    const contactosValidos: PersonaContactoItem[] = [];
    for (let i = 0; i < contactosList.length; i++) {
      const fila = contactosList[i];
      if (!fila.contactoNumero.trim() || !fila.contactoNombre.trim()) {
        Swal.fire({
          icon: 'warning',
          title: `Datos incompletos en Contacto #${i + 1}`,
          text: `Por favor completa el Teléfono/Contacto y el Nombre en el Contacto #${i + 1}.`,
          confirmButtonColor: roleAccent,
        });
        return;
      }
      if (!sinOcamRelacionada && !fila.contactoAreaCargo.trim()) {
        Swal.fire({
          icon: 'warning',
          title: `Área/Cargo requerido en Contacto #${i + 1}`,
          text: `Ingresa el área o cargo para el Contacto #${i + 1} (${fila.contactoNombre}).`,
          confirmButtonColor: roleAccent,
        });
        return;
      }

      contactosValidos.push({
        contactoNumero: fila.contactoNumero.trim(),
        contactoNombre: fila.contactoNombre.trim().toUpperCase(),
        contactoAreaCargo: (fila.contactoAreaCargo.trim() || 'CONTACTO DE ENTIDAD').toUpperCase(),
      });
    }

    // 5. Validar motivo/respuesta (en modo Sin OCAM se autocompletan si se dejan en blanco)
    const motivoFinal =
      contactoMotivo.trim() ||
      (sinOcamRelacionada
        ? 'REGISTRO DIRECTO DE CONTACTO DE ENTIDAD (SIN OCAM RELACIONADA)'
        : '');
    const respuestaFinal =
      respuesta.trim() ||
      (sinOcamRelacionada ? 'CONTACTO REGISTRADO EN DIRECTORIO DE ENTIDAD' : '');

    if (!motivoFinal || !respuestaFinal) {
      Swal.fire({
        icon: 'warning',
        title: 'Motivo y respuesta requeridos',
        text: 'Registra el motivo del contacto y la respuesta obtenida.',
        confirmButtonColor: roleAccent,
      });
      return;
    }

    const etiquetaOcam = sinOcamRelacionada ? 'SIN OCAM RELACIONADA' : numeroOcam.trim().toUpperCase();
    const resumenContactosHtml = contactosValidos
      .map(
        (c, idx) =>
          `<div style="padding: 6px 0; border-bottom: 1px dashed #e2e8f0;">
            <strong>#${idx + 1} ${c.contactoNombre}</strong> (${c.contactoAreaCargo}) — 📞 <strong>${c.contactoNumero}</strong>
          </div>`
      )
      .join('');

    const confirmar = await Swal.fire({
      title:
        contactosValidos.length > 1
          ? `¿Confirmar Registro de ${contactosValidos.length} Contactos?`
          : '¿Confirmar Registro de Contacto?',
      html: `
        <div style="text-align: left; font-size: 13px; line-height: 1.5; color: #334155;">
          <p>
            Vínculo OCAM: <strong style="color: #0f172a;">${etiquetaOcam}</strong><br/>
            ${rucEntidad.trim() ? `RUC: <strong>${rucEntidad.trim()}</strong> &bull; ` : ''}Entidad: <strong>${empresaRelacionada.trim()}</strong>
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-top: 8px; max-height: 180px; overflow-y: auto;">
            ${resumenContactosHtml}
          </div>
          <div style="margin-top: 10px; font-size: 12px; color: #b45309; background: #fffbeb; padding: 8px 12px; border-radius: 6px; border: 1px solid #fde68a;">
            🔒 <strong>Trazabilidad Inmutable:</strong> Se registrará(n) <strong>${contactosValidos.length}</strong> contacto(s) en la agenda.
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: roleAccent,
      cancelButtonColor: '#64748b',
      confirmButtonText:
        contactosValidos.length > 1
          ? `Sí, Guardar ${contactosValidos.length} Contactos`
          : 'Sí, Registrar en Agenda',
      cancelButtonText: 'Revisar datos',
      reverseButtons: true,
    });

    if (!confirmar.isConfirmed) return;

    setLoading(true);
    try {
      const usuarioNombre =
        empleado?.nombreCompleto ||
        (empleado?.nombres ? `${empleado.nombres} ${empleado.apellidos}` : 'Usuario Sales Rebel');
      const usuarioId = empleado?.userId;

      const creados = await crearContactosLoteApi(
        {
          numeroOCAM: sinOcamRelacionada ? 'SIN OCAM' : numeroOcam.trim().toUpperCase(),
          sinOcamRelacionada,
          rucEntidad: rucEntidad.trim() || undefined,
          oportunidadId:
            !sinOcamRelacionada && oportunidadSeleccionada
              ? Number(oportunidadSeleccionada.id)
              : null,
          ordenCompraId:
            !sinOcamRelacionada && oportunidadSeleccionada?.ordenCompra?.id
              ? Number(oportunidadSeleccionada.ordenCompra.id)
              : null,
          contactoNumero: contactosValidos[0].contactoNumero,
          contactoNombre: contactosValidos[0].contactoNombre,
          contactoAreaCargo: contactosValidos[0].contactoAreaCargo,
          contactoMotivo: motivoFinal,
          respuesta: respuestaFinal,
          tipoRelacion,
          empresaRelacionada: empresaRelacionada.trim(),
          empresaId: empresaId || oportunidadSeleccionada?.empresaId || null,
          contactos: contactosValidos,
        },
        usuarioNombre,
        usuarioId
      );

      await Swal.fire({
        icon: 'success',
        title:
          creados.length > 1
            ? `¡${creados.length} Contactos Registrados en Agenda!`
            : '¡Contacto Registrado en Agenda!',
        text: `Se guardó correctamente el registro para la entidad ${empresaRelacionada.trim()} (${etiquetaOcam}).`,
        confirmButtonColor: roleAccent,
        confirmButtonText: 'Ver Agenda de Contactos',
      });

      // Limpiar formulario
      setNumeroOcam('');
      setOportunidadSeleccionada(null);
      setRucEntidad('');
      setEmpresaRelacionada('');
      setEmpresaId(null);
      setContactosList([crearFilaContactoVacia()]);
      setContactoMotivo('');
      setRespuesta('');

      onContactoRegistrado?.();
    } catch (err: any) {
      console.error('Error al registrar contactos:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error al registrar',
        text: err?.message || 'No se pudo guardar el registro en el servidor.',
        confirmButtonColor: roleAccent,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agenda-form-container">
      <form onSubmit={handleSubmit}>
        {/* ── SECCIÓN 1: MODALIDAD (CON O SIN OCAM), RUC Y NOMBRE DE ENTIDAD ── */}
        <div className="agenda-section">
          <div className="agenda-section__header">
            <div className="agenda-section__title">
              <span className="agenda-section__num">1</span>
              <div>
                <h3>Entidad (RUC y Nombre) y Vínculo OCAM</h3>
              </div>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: roleAccent,
                background: `${roleAccent}15`,
                padding: '4px 10px',
                borderRadius: '6px',
              }}
            >
              Paso 1 de 3
            </span>
          </div>
          <span className="agenda-section__desc">
            Puedes registrar contactos vinculados a una <strong>OCAM</strong> o{' '}
            <strong>sin número de OCAM relacionada</strong> indicando directamente el{' '}
            <strong>RUC</strong> y <strong>Nombre de la Entidad</strong>.
          </span>

          {/* Selector de Modalidad: Con OCAM vs Sin Número de OCAM Relacionada (Req 5) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
            <button
              type="button"
              onClick={() => setSinOcamRelacionada(false)}
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                border: !sinOcamRelacionada ? `2px solid ${roleAccent}` : '1.5px solid #cbd5e1',
                background: !sinOcamRelacionada ? `${roleAccent}10` : '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '8px',
                  background: !sinOcamRelacionada ? roleAccent : '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <GoogleIcon
                  name="receipt_long"
                  size={20}
                  color={!sinOcamRelacionada ? '#ffffff' : '#64748b'}
                />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '13.5px', color: '#0f172a' }}>
                  Con Número de OCAM Relacionada
                </strong>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Vincular contacto(s) a una Orden de Compra / Licitación
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setSinOcamRelacionada(true);
                setOportunidadSeleccionada(null);
                setNumeroOcam('');
              }}
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                border: sinOcamRelacionada ? '2px solid #059669' : '1.5px solid #cbd5e1',
                background: sinOcamRelacionada ? '#ecfdf5' : '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '8px',
                  background: sinOcamRelacionada ? '#059669' : '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <GoogleIcon
                  name="domain_add"
                  size={20}
                  color={sinOcamRelacionada ? '#ffffff' : '#64748b'}
                />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '13.5px', color: '#065f46' }}>
                  Sin Número de OCAM Relacionada
                </strong>
                <span style={{ fontSize: '11.5px', color: '#047857' }}>
                  Registrar directamente con Contacto, RUC y Nombre Entidad
                </span>
              </div>
            </button>
          </div>

          {/* Si es CON OCAM RELACIONADA: Selector de Oportunidad y Número de OCAM */}
          {!sinOcamRelacionada && (
            <div className="agenda-grid-2" style={{ marginBottom: 16 }}>
              <div className="agenda-field">
                <label>Seleccionar OCAM existente (Licitaciones)</label>
                <select
                  className="agenda-select"
                  value={oportunidadSeleccionada ? String(oportunidadSeleccionada.id) : ''}
                  onChange={(e) => handleSeleccionarOportunidad(e.target.value)}
                  disabled={cargandoOportunidades}
                >
                  <option value="">-- Seleccionar de lista de Oportunidades --</option>
                  {oportunidades.map((op) => {
                    const ocam =
                      (op.ordenCompra as any)?.nroOCAM ||
                      op.ordenCompra?.numeroOC ||
                      `REQ-${op.numeroRequerimiento}`;
                    const ent = op.entidadConvocante || op.empresaRazonSocial || 'Entidad';
                    return (
                      <option key={op.id} value={String(op.id)}>
                        {ocam} &bull; {ent} ({op.estado})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="agenda-field">
                <label>
                  Número de OCAM <span className="req">*</span>
                </label>
                <input
                  type="text"
                  className="agenda-input"
                  placeholder="Ej: OCAM-2026-0001092"
                  value={numeroOcam}
                  onChange={(e) => setNumeroOcam(e.target.value)}
                  required={!sinOcamRelacionada}
                />
              </div>
            </div>
          )}

          {/* Selector de Tipo de Empresa Relacionada */}
          <div className="agenda-field" style={{ marginBottom: 16 }}>
            <label>
              Tipo de Entidad / Empresa Relacionada <span className="req">*</span>
            </label>
            <div className="agenda-relacion-tabs">
              <div
                className={`agenda-relacion-card ${tipoRelacion === 'Entidad Solicitante' ? 'agenda-relacion-card--active' : ''
                  }`}
                onClick={() => handleCambiarTipoRelacion('Entidad Solicitante')}
              >
                <div className="agenda-relacion-card__radio" />
                <div className="agenda-relacion-card__text">
                  <strong>Entidad Solicitante</strong>
                  <span>Cliente público o entidad convocante</span>
                </div>
              </div>

              <div
                className={`agenda-relacion-card ${tipoRelacion === 'Entidad / Marca de Cotización'
                  ? 'agenda-relacion-card--active'
                  : ''
                  }`}
                onClick={() => handleCambiarTipoRelacion('Entidad / Marca de Cotización')}
              >
                <div className="agenda-relacion-card__radio" />
                <div className="agenda-relacion-card__text">
                  <strong>Entidad / Marca de Cotización</strong>
                  <span>Fabricante, mayorista o proveedor</span>
                </div>
              </div>

              <div
                className={`agenda-relacion-card ${tipoRelacion === 'Relación Exterior' ? 'agenda-relacion-card--active' : ''
                  }`}
                onClick={() => handleCambiarTipoRelacion('Relación Exterior')}
              >
                <div className="agenda-relacion-card__radio" />
                <div className="agenda-relacion-card__text">
                  <strong>Relación Exterior</strong>
                  <span>Transportes, embalajes, couriers, etc.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fila: RUC de la Entidad y Nombre de la Entidad + Botón Buscador */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '240px 1fr auto',
              gap: 12,
              alignItems: 'flex-end',
            }}
          >
            <div className="agenda-field" style={{ marginBottom: 0 }}>
              <label>
                RUC de la Entidad <span className="req">*</span>
              </label>
              <input
                type="text"
                maxLength={15}
                className="agenda-input"
                placeholder="Ej: 20131370998"
                value={rucEntidad}
                onChange={(e) => setRucEntidad(e.target.value.replace(/[^\d]/g, ''))}
                style={{ fontFamily: 'monospace', fontWeight: 700 }}
                required
              />
            </div>

            <div className="agenda-field" style={{ marginBottom: 0 }}>
              <label>
                Nombre de la Entidad o Empresa <span className="req">*</span>
              </label>
              <input
                type="text"
                className="agenda-input"
                placeholder="Ej: MINISTERIO DE EDUCACIÓN (PRONIED), GOBIERNO REGIONAL..."
                value={empresaRelacionada}
                onChange={(e) => setEmpresaRelacionada(e.target.value)}
                required
              />
            </div>

            <button
              type="button"
              onClick={() => setIsEmpresaModalOpen(true)}
              style={{
                height: '42px',
                padding: '0 14px',
                borderRadius: '8px',
                border: `1.5px solid ${roleAccent}`,
                background: '#eff6ff',
                color: roleAccent,
                fontWeight: 700,
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
              }}
              title="Buscar RUC y Nombre de Entidad en el catálogo de empresas"
            >
              <GoogleIcon name="search" size={17} color={roleAccent} />
              <span>Buscar RUC / Entidad</span>
            </button>
          </div>
        </div>

        {/* ── SECCIÓN 2: PERSONAS DE CONTACTO (PERMITE VARIOS CONTACTOS POR REGISTRO - REQ 6) ── */}
        <div className="agenda-section">
          <div className="agenda-section__header">
            <div className="agenda-section__title">
              <span className="agenda-section__num">2</span>
              <div>
                <h3>Personas de Contacto ({contactosList.length})</h3>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={handleAgregarContactoFila}
                style={{
                  background: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <GoogleIcon name="person_add" size={16} color="#ffffff" />
                <span>+ Agregar Otro Contacto</span>
              </button>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: roleAccent,
                  background: `${roleAccent}15`,
                  padding: '4px 10px',
                  borderRadius: '6px',
                }}
              >
                Paso 2 de 3
              </span>
            </div>
          </div>
          <span className="agenda-section__desc">
            Puedes registrar <strong>uno o varios contactos</strong> para esta entidad u OCAM en una sola operación.
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {contactosList.map((fila, index) => (
              <div
                key={fila.uid}
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '14px 16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        background: roleAccent,
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      Contacto #{index + 1}
                    </span>
                    <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                      Datos del contacto de la entidad
                    </span>
                  </div>

                  {contactosList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleEliminarContactoFila(fila.uid)}
                      style={{
                        background: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fca5a5',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <GoogleIcon name="delete" size={14} color="#dc2626" />
                      <span>Quitar</span>
                    </button>
                  )}
                </div>

                <div className="agenda-grid-3">
                  {/* Número de Teléfono / Celular */}
                  <div className="agenda-field" style={{ marginBottom: 0 }}>
                    <label>
                      Contacto (Teléfono / Celular) <span className="req">*</span>
                    </label>
                    <input
                      type="tel"
                      className="agenda-input"
                      placeholder="Ej: 900900900"
                      value={fila.contactoNumero}
                      onChange={(e) =>
                        handleActualizarContactoFila(fila.uid, 'contactoNumero', e.target.value)
                      }
                      required
                    />
                  </div>

                  {/* Nombre Completo del Contacto */}
                  <div className="agenda-field" style={{ marginBottom: 0 }}>
                    <label>
                      Nombre Completo del Contacto <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className="agenda-input"
                      placeholder="Ej: JERRY MEDRANO"
                      value={fila.contactoNombre}
                      onChange={(e) =>
                        handleActualizarContactoFila(fila.uid, 'contactoNombre', e.target.value)
                      }
                      required
                    />
                  </div>

                  {/* Área y Cargo */}
                  <div className="agenda-field" style={{ marginBottom: 0 }}>
                    <label>
                      Área y Cargo {!sinOcamRelacionada && <span className="req">*</span>}
                    </label>
                    <input
                      type="text"
                      className="agenda-input"
                      placeholder="Ej: LOGÍSTICA - JEFE DE LOGÍSTICA"
                      value={fila.contactoAreaCargo}
                      onChange={(e) =>
                        handleActualizarContactoFila(fila.uid, 'contactoAreaCargo', e.target.value)
                      }
                      required={!sinOcamRelacionada}
                    />
                  </div>
                </div>

                {/* Sugerencias rápidas de Área y Cargo para esta fila */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    flexWrap: 'wrap',
                    marginTop: 8,
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                    Cargos rápidos:
                  </span>
                  {cargosFrecuentes.map((cargo) => (
                    <button
                      key={cargo}
                      type="button"
                      onClick={() =>
                        handleActualizarContactoFila(fila.uid, 'contactoAreaCargo', cargo)
                      }
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '10.5px',
                        color: '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      {cargo}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={handleAgregarContactoFila}
              style={{
                width: '100%',
                padding: '10px',
                background: '#f0fdf4',
                border: '1.5px dashed #16a34a',
                borderRadius: '8px',
                color: '#15803d',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <GoogleIcon name="group_add" size={18} color="#15803d" />
              <span>+ Agregar otro contacto adicional a este mismo registro</span>
            </button>
          </div>
        </div>

        {/* ── SECCIÓN 3: MOTIVO Y RESPUESTA ── */}
        <div className="agenda-section">
          <div className="agenda-section__header">
            <div className="agenda-section__title">
              <span className="agenda-section__num">3</span>
              <div>
                <h3>Motivo y Respuesta de la Comunicación</h3>
              </div>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: roleAccent,
                background: `${roleAccent}15`,
                padding: '4px 10px',
                borderRadius: '6px',
              }}
            >
              Paso 3 de 3
            </span>
          </div>
          <span className="agenda-section__desc">
            {sinOcamRelacionada
              ? 'Opcional en registro sin OCAM: puedes detallar el motivo o dejarlo en blanco para registrarlo como directorio directo.'
              : 'Registra el motivo del contacto y selecciona el caso de respuesta obtenido.'}
          </span>

          {/* CONTACTO_MOTIVO/DESCRIPCION */}
          <div className="agenda-field" style={{ marginBottom: 18 }}>
            <label>
              Motivo o Descripción del Contacto {!sinOcamRelacionada && <span className="req">*</span>}
            </label>
            <div className="agenda-chips-wrap">
              {motivosFrecuentes.map((m, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="agenda-chip-btn"
                  onClick={() => setContactoMotivo(m)}
                >
                  <GoogleIcon name="add" size={14} color="#64748b" />
                  <span>{m}</span>
                </button>
              ))}
            </div>
            <textarea
              className="agenda-textarea"
              placeholder={
                sinOcamRelacionada
                  ? 'Opcional: Ej. Registro de contactos de logística y almacén de la entidad...'
                  : 'Ej: SE CONTACTO SOBRE ESTADO EN EL QUE LLEGO EL PRODUCTO'
              }
              value={contactoMotivo}
              onChange={(e) => setContactoMotivo(e.target.value)}
              rows={2}
              required={!sinOcamRelacionada}
            />
          </div>

          {/* RESPUESTA */}
          <div className="agenda-field">
            <label>
              Respuesta / Resultado Obtenido {!sinOcamRelacionada && <span className="req">*</span>}
            </label>
            <div className="agenda-chips-wrap">
              <button
                type="button"
                className="agenda-chip-btn agenda-chip-btn--success"
                onClick={aplicarRespuestaCaso1}
              >
                <GoogleIcon name="check_circle" size={14} color="#15803d" />
                <strong>Caso 1:</strong> Producto en perfectas condiciones
              </button>

              <button
                type="button"
                className="agenda-chip-btn agenda-chip-btn--danger"
                onClick={aplicarRespuestaCaso2}
              >
                <GoogleIcon name="phone_missed" size={14} color="#b91c1c" />
                <strong>Caso 2:</strong> No contestó teléfono
              </button>

              <button
                type="button"
                className="agenda-chip-btn agenda-chip-btn--amber"
                onClick={aplicarRespuestaRecado}
              >
                <GoogleIcon name="schedule" size={14} color="#b45309" />
                Llamar más tarde / Recado
              </button>

              {sinOcamRelacionada && (
                <button
                  type="button"
                  className="agenda-chip-btn"
                  onClick={aplicarRespuestaDirectorio}
                >
                  <GoogleIcon name="contact_page" size={14} color="#2563eb" />
                  Directorio de Entidad
                </button>
              )}
            </div>

            <textarea
              className="agenda-textarea"
              placeholder={
                sinOcamRelacionada
                  ? 'Opcional: Ej. CONTACTO REGISTRADO EN DIRECTORIO DE ENTIDAD'
                  : 'Ej: CASO 1: DIJO QUE EL ESTADO DEL PRODUCTO LLEGO EN PERFECTAS CONDICIONES'
              }
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              rows={2}
              required={!sinOcamRelacionada}
            />
          </div>
        </div>

        {/* ── BANNER DE TRAZABILIDAD E INMUTABILIDAD ── */}
        <div className="agenda-inmutable-banner">
          <GoogleIcon name="lock" size={24} color="#15803d" />
          <div>
            <strong>Regla de Trazabilidad e Inmutabilidad de la Agenda</strong>
            <span>
              Todo contacto (con o sin OCAM relacionada) queda registrado permanentemente con fecha,
              hora, RUC, entidad y usuario. Por políticas de trazabilidad y auditoría empresarial,{' '}
              <strong>estos registros no podrán ser eliminados</strong> una vez guardados.
            </span>
          </div>
        </div>

        {/* ── BOTONES DE ENVÍO ── */}
        <div className="agenda-form-actions">
          <button
            type="submit"
            className="agenda-btn-submit"
            style={{ background: roleAccent }}
            disabled={loading}
          >
            <GoogleIcon name={loading ? 'hourglass_top' : 'save'} size={18} color="#ffffff" />
            <span>
              {loading
                ? 'Registrando en Agenda...'
                : contactosList.length > 1
                  ? `Guardar ${contactosList.length} Contactos en Agenda`
                  : 'Guardar Contacto en Agenda'}
            </span>
          </button>
        </div>
      </form>

      {/* Modal Buscador de Empresas por RUC / Razón Social */}
      {isEmpresaModalOpen && (
        <BuscadorEmpresaModal
          onClose={() => setIsEmpresaModalOpen(false)}
          onSelect={handleSelectEmpresaCatalogo}
        />
      )}
    </div>
  );
};
