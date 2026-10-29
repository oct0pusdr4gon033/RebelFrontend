import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import { useAuth } from '../../context/AuthContext';
import { isOportunidadOwner } from '../../utils/oportunidadUtils';
import type { Oportunidad, ProductoItem } from '../../types/oportunidades';
import {
  cambiarEstadoApi,
  obtenerImagenesOportunidadApi,
  getImagenArchivoUrl,
  solicitarAjusteFleteApi,
  resolverAjusteFleteApi,
  type OportunidadApiResponse,
  type OportunidadImagenItem,
} from '../../api/services/oportunidades.service';
import { mapApiToOportunidad } from '../../hooks/useOportunidades';
import { montoAjusteUnitario, formatoSoles, validarSolicitudAjusteFlete } from '../../utils/ajusteFleteUtils';
import { formatFechaHoraPeru } from '../../utils/dateUtils';
import './DetalleOportunidadView.css';

interface DetalleOportunidadViewProps {
  oportunidad: Oportunidad;
  todasOportunidades?: Oportunidad[];
  roleAccent: string;
  onClose: () => void;
  onEdit: (op: Oportunidad) => void;
  onSubirEvidencia: (opId: string | number) => void;
  onEstadoCambiado?: (op: Oportunidad) => void;
  onOportunidadesActualizadas?: (ops: Oportunidad[]) => void;
  getVencimientoBadge: (fechaIso: string) => { label: string; color: string; bg: string } | null;
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  'En Licitación': { label: 'En Licitación', color: '#d97706', bg: '#fef3c7', icon: 'bolt' },
  'En Competencia': { label: 'En Competencia', color: '#2563eb', bg: '#eff6ff', icon: 'groups' },
  'Por Vencer': { label: 'Por Vencer', color: '#dc2626', bg: '#fee2e2', icon: 'timer' },
  'Adjudicada': { label: 'Adjudicada', color: '#059669', bg: '#ecfdf5', icon: 'verified' },
  'Aceptada por el Administrador': { label: 'Aceptada por Administrador', color: '#2563eb', bg: '#eff6ff', icon: 'how_to_reg' },
  'Aceptada por Perú Compras': { label: 'Aceptada por Perú Compras', color: '#059669', bg: '#ecfdf5', icon: 'verified' },
  'Aceptada Desestimada': { label: 'Aceptada Desestimada', color: '#b91c1c', bg: '#fef2f2', icon: 'unpublished' },
  'Desestimada': { label: 'Desestimada', color: '#dc2626', bg: '#fee2e2', icon: 'cancel' },
  'OC_RECIBIDA': { label: 'OC Recibida', color: '#0284c7', bg: '#e0f2fe', icon: 'receipt_long' },
  'OC_ACEPTADA': { label: 'OC Aceptada', color: '#059669', bg: '#ecfdf5', icon: 'thumb_up' },
  'OC_RECHAZADA': { label: 'OC Rechazada', color: '#dc2626', bg: '#fee2e2', icon: 'thumb_down' },
  'ENTREGADA': { label: 'Entregada', color: '#7c3aed', bg: '#f5f3ff', icon: 'inventory' },
};

export const DetalleOportunidadView: React.FC<DetalleOportunidadViewProps> = ({
  oportunidad: op,
  todasOportunidades: _todasOportunidades,
  roleAccent = '#2563eb',
  onClose,
  onEdit,
  onSubirEvidencia,
  onEstadoCambiado,
  onOportunidadesActualizadas: _onOportunidadesActualizadas,
  getVencimientoBadge,
}) => {
  const { empleado } = useAuth();
  const isOwner = isOportunidadOwner(op, empleado);
  const isAdmin = empleado?.rolNombre === 'Administrador' || empleado?.rolNombre === 'SysAdmin';
  const isMaster = empleado?.rolNombre === 'Ejecutivo(a) Master Ventas' || empleado?.rolNombre === 'Ejecutiva Master Ventas';
  const esGestion = isAdmin || isMaster;
  const canManageStatus = isOwner || isAdmin || isMaster;

  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [imagenes, setImagenes] = useState<OportunidadImagenItem[]>([]);
  const [loadingImagenes, setLoadingImagenes] = useState<boolean>(true);
  const [modalImagen, setModalImagen] = useState<OportunidadImagenItem | null>(null);

  const cargarImagenes = useCallback(() => {
    if (!op?.id) return;
    setLoadingImagenes(true);
    obtenerImagenesOportunidadApi(op.id)
      .then((data) => {
        setImagenes(data || []);
      })
      .catch((err) => {
        console.error('Error al cargar evidencias fotográficas en Detalle:', err);
        setImagenes([]);
      })
      .finally(() => {
        setLoadingImagenes(false);
      });
  }, [op?.id]);

  useEffect(() => {
    cargarImagenes();
  }, [cargarImagenes]);

  const vBadge = getVencimientoBadge(op.fechaVencimiento);
  const esEstadoFinal = [
    'Adjudicada',
    'Aceptada por el Administrador',
    'Aceptada por Perú Compras',
    'Desestimada',
    'Aceptada Desestimada',
    'OC_RECHAZADA',
    'ENTREGADA',
  ].includes(op.estado);
  const vColor = esEstadoFinal && vBadge ? '#64748b' : (vBadge?.color ?? '#64748b');
  const vBg = esEstadoFinal && vBadge ? '#f1f5f9' : (vBadge?.bg ?? '#f1f5f9');
  const vKpiColor = esEstadoFinal ? '#64748b' : '#d97706';
  const vKpiBg = esEstadoFinal ? '#f1f5f9' : '#fef3c7';
  const estadoCfg = ESTADO_CONFIG[op.estado] ?? {
    label: op.estado,
    color: '#64748b',
    bg: '#f1f5f9',
    icon: 'help',
  };

  // Atajo de teclado: cerrar con tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Totales
  const totalCantidad = useMemo(
    () => op.items.reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0),
    [op.items]
  );

  const totalCalculado = useMemo(
    () =>
      op.items.reduce(
        (acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.limiteUnitario) || 0),
        0
      ),
    [op.items]
  );

  const totalLimite = Number(op.limiteTotal || totalCalculado);

  // Transiciones de estado
  const handleCambiarEstado = useCallback(
    async (nuevoEstado: string, accionLabel: string, motivo?: string) => {
      setCambiandoEstado(true);
      try {
        const actualizada = await cambiarEstadoApi(op.id, nuevoEstado, motivo);
        const estadoFinal = (actualizada.estado || nuevoEstado) as Oportunidad['estado'];

        onEstadoCambiado?.({
          ...op,
          estado: estadoFinal,
          motivoDesestimacion: actualizada.motivoDesestimacion ?? null,
        });

        Swal.fire({
          icon: 'success',
          title: `¡Oportunidad ${accionLabel}!`,
          text: `El requerimiento "${op.numeroRequerimiento}" ahora está "${nuevoEstado}".`,
          confirmButtonColor: roleAccent,
          confirmButtonText: 'Aceptar',
          timer: 2500,
          timerProgressBar: true,
        });
      } catch (err: any) {
        Swal.fire({
          icon: 'error',
          title: 'No se pudo actualizar el estado',
          text: err.message || 'Ocurrió un error al comunicarse con el servidor.',
          confirmButtonColor: '#dc2626',
        });
      } finally {
        setCambiandoEstado(false);
      }
    },
    [op, onEstadoCambiado, roleAccent]
  );

  // Desestimar exige un motivo obligatorio y distingue si ya había sido aceptada por el Administrador
  const handleDesestimar = useCallback(async () => {
    const yaAceptadaPorAdmin = op.estado === 'Aceptada por el Administrador' || op.estado === 'Adjudicada';
    const estadoDestino = yaAceptadaPorAdmin ? 'Aceptada Desestimada' : 'Desestimada';
    const titulo = yaAceptadaPorAdmin ? 'Desestimar por Perú Compras' : 'Desestimar requerimiento';
    const explicacion = yaAceptadaPorAdmin
      ? `La oportunidad fue <strong>Aceptada por el Administrador</strong> pero desestimada por Perú Compras. Pasará al estado <strong>Aceptada Desestimada</strong>.`
      : `Indica el motivo por el cual se desestima directamente <strong>${op.numeroRequerimiento}</strong>.`;

    const { value, isConfirmed } = await Swal.fire({
      title: titulo,
      html: explicacion,
      input: 'textarea',
      inputPlaceholder: yaAceptadaPorAdmin ? 'Ej. Perú Compras no emitió OCAM / Desestimada en plataforma...' : 'Ej. Precio no competitivo, cliente canceló...',
      inputAttributes: { 'aria-label': 'Motivo de desestimación', maxlength: '500' },
      showCancelButton: true,
      confirmButtonText: yaAceptadaPorAdmin ? 'Sí, marcar Aceptada Desestimada' : 'Sí, desestimar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      inputValidator: (v) => (!v || !v.trim() ? 'El motivo es obligatorio para desestimar.' : undefined),
    });
    if (!isConfirmed || !value) return;
    await handleCambiarEstado(estadoDestino, estadoDestino, value.trim());
  }, [op.estado, op.numeroRequerimiento, handleCambiarEstado]);

  // Reabrir licitación con confirmación clara al frente
  const handleReabrir = useCallback(async () => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Reabrir oportunidad?',
      html: `¿Estás seguro de que deseas reabrir el requerimiento <strong>${op.numeroRequerimiento}</strong>?<br/><br/><span style="color:#64748b; font-size:13px;">Volverá al estado <strong>EN LICITACIÓN</strong> y se restablecerán sus opciones de dictamen.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, reabrir licitación',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d97706',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
    });
    if (!isConfirmed) return;
    await handleCambiarEstado('En Licitación', 'Reabierta');
  }, [op.numeroRequerimiento, handleCambiarEstado]);

  // ── Ajuste de flete por producto ──
  const [procesandoAjuste, setProcesandoAjuste] = useState<string | number | null>(null);

  const aplicarRespuestaAjuste = (resp: OportunidadApiResponse) => {
    const itemsActualizados = mapApiToOportunidad(resp).items;
    onEstadoCambiado?.({ ...op, items: itemsActualizados });
  };

  /** La ejecutiva dueña solicita un nuevo % (nunca se aplica hasta que la administradora lo apruebe) */
  const handleSolicitarAjuste = async (it: ProductoItem) => {
    const { value, isConfirmed } = await Swal.fire({
      title: `Solicitar ajuste de flete`,
      html: `
        <div style="text-align:left; font-size:13px; color:#475569;">
          Ítem <strong>${it.numeroParte}</strong> • Límite unitario S/ ${formatoSoles(Number(it.limiteUnitario) || 0)}<br/>
          Quedará <strong>pendiente de aprobación</strong> de la administradora.
        </div>
        <input id="swal-aj-pct" class="swal2-input" type="number" min="0" max="100" step="0.1" placeholder="Ajuste (%)" value="${it.ajusteFletePorcentaje ?? ''}">
        <textarea id="swal-aj-motivo" class="swal2-textarea" maxlength="300" placeholder="Motivo / justificación (obligatorio)"></textarea>`,
      showCancelButton: true,
      confirmButtonText: 'Enviar solicitud',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: roleAccent,
      focusConfirm: false,
      preConfirm: () => {
        const pct = Number((document.getElementById('swal-aj-pct') as HTMLInputElement).value);
        const motivo = (document.getElementById('swal-aj-motivo') as HTMLTextAreaElement).value;
        if (!(pct > 0)) {
          Swal.showValidationMessage('Ingresa un porcentaje mayor a 0.');
          return;
        }
        const err = validarSolicitudAjusteFlete(pct, motivo);
        if (err) {
          Swal.showValidationMessage(err);
          return;
        }
        return { pct, motivo: motivo.trim() };
      },
    });
    if (!isConfirmed || !value) return;

    setProcesandoAjuste(it.id);
    try {
      const resp = await solicitarAjusteFleteApi(op.id, it.id, { porcentaje: value.pct, motivo: value.motivo });
      aplicarRespuestaAjuste(resp);
      Swal.fire({ icon: 'success', title: 'Solicitud enviada', text: 'La administradora fue notificada para aprobar el ajuste.', confirmButtonColor: roleAccent, timer: 2500, timerProgressBar: true });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'No se pudo enviar la solicitud', text: err.message || 'Error al comunicarse con el servidor.', confirmButtonColor: '#dc2626' });
    } finally {
      setProcesandoAjuste(null);
    }
  };

  /** La administradora aprueba o rechaza (el rechazo exige comentario) */
  const handleResolverAjuste = async (it: ProductoItem, aprobar: boolean) => {
    const pct = it.ajusteFleteSolicitadoPorcentaje ?? 0;
    const { value, isConfirmed } = await Swal.fire({
      icon: aprobar ? 'question' : 'warning',
      title: aprobar ? 'Aprobar ajuste de flete' : 'Rechazar ajuste de flete',
      html: `<div style="text-align:left; font-size:13px; color:#475569;">Ítem <strong>${it.numeroParte}</strong> • Ajuste solicitado: <strong>${pct}%</strong> (S/ ${formatoSoles(montoAjusteUnitario(it.limiteUnitario, pct))} por unidad)<br/>Motivo: <em>${(it.ajusteFleteMotivo ?? '').replace(/</g, '&lt;')}</em></div>`,
      input: 'textarea',
      inputPlaceholder: aprobar ? 'Comentario (opcional)' : 'Motivo del rechazo (obligatorio)',
      inputAttributes: { maxlength: '300' },
      showCancelButton: true,
      confirmButtonText: aprobar ? 'Sí, aprobar' : 'Sí, rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: aprobar ? '#059669' : '#dc2626',
      inputValidator: (v) => (!aprobar && (!v || !v.trim()) ? 'El motivo del rechazo es obligatorio.' : undefined),
    });
    if (!isConfirmed) return;

    setProcesandoAjuste(it.id);
    try {
      const resp = await resolverAjusteFleteApi(op.id, it.id, { aprobado: aprobar, comentario: (value ?? '').trim() || null });
      aplicarRespuestaAjuste(resp);
      Swal.fire({ icon: 'success', title: aprobar ? 'Ajuste aprobado' : 'Ajuste rechazado', confirmButtonColor: roleAccent, timer: 2000, timerProgressBar: true });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'No se pudo resolver el ajuste', text: err.message || 'Error al comunicarse con el servidor.', confirmButtonColor: '#dc2626' });
    } finally {
      setProcesandoAjuste(null);
    }
  };

  // Copiar resumen al portapapeles
  const copiarResumen = () => {
    const resumen = [
      `📋 *OPORTUNIDAD PERÚ COMPRAS: ${op.numeroRequerimiento}*`,
      `🏢 *Entidad/Empresa:* ${op.entidadConvocante || op.empresaRazonSocial || 'No especificada'}`,
      op.empresaRuc ? `📄 *RUC:* ${op.empresaRuc}` : null,
      `🤝 *Acuerdo Marco:* ${op.acuerdoMarco ? `${op.acuerdoMarco.codigo} - ${op.acuerdoMarco.descripcion}` : 'Sin acuerdo'}`,
      `🏷️ *Marcas:* ${op.marcas.map((m) => m.nombre).join(', ') || 'N/A'}`,
      `📦 *Ítems:* ${op.items.length} productos (${totalCantidad} unidades)`,
      `💰 *Límite Total:* S/ ${totalLimite.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
      `⏰ *Vencimiento:* ${op.fechaVencimiento ? formatFechaHoraPeru(op.fechaVencimiento) : 'No especificado'}`,
      `👤 *Ejecutiva:* ${op.creadoPor}`,
      `📌 *Estado actual:* ${op.estado}`,
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(resumen);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };



  return (
    <div className="det-overlay" onClick={onClose}>
      <div className="det-modal" onClick={(e) => e.stopPropagation()}>
        {/* ── Encabezado Sticky ── */}
        <div className="det-header">
          <div className="det-header__top">
            <div className="det-header__main">
              <div
                className="det-header__icon-box"
                style={{
                  background: `linear-gradient(135deg, ${roleAccent}20, ${roleAccent}35)`,
                  color: roleAccent,
                }}
              >
                <GoogleIcon name="feed" size={24} color={roleAccent} />
              </div>

              <div className="det-header__title-wrap">
                <div className="det-header__req-row">
                  <h2 className="det-header__req-code">{op.numeroRequerimiento}</h2>

                  {/* Badge de Prioridad Ganada */}
                  {op.prioridadGanada && (
                    <span className="det-badge det-badge--priority" title="Prioridad de llegada legal ganada">
                      <GoogleIcon name="verified" size={13} color="#15803d" />
                      Prioridad 1°
                    </span>
                  )}

                  {/* Badge de Estado Actual */}
                  <span
                    className="det-badge"
                    style={{ background: estadoCfg.bg, color: estadoCfg.color, border: `1px solid ${estadoCfg.color}35` }}
                  >
                    <GoogleIcon name={estadoCfg.icon} size={13} color={estadoCfg.color} />
                    {estadoCfg.label}
                  </span>

                  {/* Badge de Vencimiento */}
                  {vBadge && (
                    <span
                      className="det-badge"
                      style={{ background: vBg, color: vColor, border: `1px solid ${vColor}35` }}
                    >
                      <GoogleIcon name="alarm" size={13} color={vColor} />
                      {vBadge.label}
                    </span>
                  )}

                  {/* Badge de Propiedad / Acceso */}
                  {isOwner ? (
                    <span className="det-badge det-badge--owner">
                      <GoogleIcon name="person" size={13} color="#0284c7" />
                      Tu Licitación
                    </span>
                  ) : isAdmin ? (
                    <span className="det-badge det-badge--admin">
                      <GoogleIcon name="shield_person" size={13} color="#6d28d9" />
                      Administración
                    </span>
                  ) : (
                    <span className="det-badge det-badge--readonly">
                      <GoogleIcon name="visibility" size={13} color="#475569" />
                      {op.creadoPor}
                    </span>
                  )}
                </div>

                {op.estado === 'Desestimada' && op.motivoDesestimacion && (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: '12.5px',
                      color: '#b91c1c',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 4,
                      padding: '8px 10px',
                      lineHeight: 1.45,
                    }}
                  >
                    <strong>Motivo de desestimación:</strong> {op.motivoDesestimacion}
                  </div>
                )}

                <p className="det-header__sub">
                  <span>
                    {op.acuerdoMarco
                      ? `${op.acuerdoMarco.codigo} — ${op.acuerdoMarco.descripcion}`
                      : 'Sin Acuerdo Marco oficial asociado'}
                  </span>
                  <span>&bull;</span>
                  <span>
                    Registrado el {op.createdAt || 'recientemente'}
                    {op.horaRegistroExacta ? ` a las ${op.horaRegistroExacta}` : ''}
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              className="det-close-btn"
              onClick={onClose}
              title="Cerrar ventana de detalles (Esc)"
              aria-label="Cerrar"
            >
              <GoogleIcon name="close" size={20} color="#64748b" />
            </button>
          </div>
        </div>

        {/* ── Cuerpo del Modal ── */}
        <div className="det-body">
          {/* KPIs Strip */}
          <div className="det-kpis">
            <div className="det-kpi-card" style={{ borderLeft: `4px solid ${roleAccent}` }}>
              <div className="det-kpi-card__icon" style={{ background: `${roleAccent}15` }}>
                <GoogleIcon name="payments" size={24} color={roleAccent} />
              </div>
              <div className="det-kpi-card__content">
                <span className="det-kpi-card__label">Límite Total Perú Compras</span>
                <span className="det-kpi-card__val" style={{ color: roleAccent }}>
                  S/ {totalLimite.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="det-kpi-card__sub">Tope oficial máximo para cotizar</span>
              </div>
            </div>

            <div className="det-kpi-card" style={{ borderLeft: '4px solid #7c3aed' }}>
              <div className="det-kpi-card__icon" style={{ background: '#ede9fe' }}>
                <GoogleIcon name="inventory_2" size={24} color="#7c3aed" />
              </div>
              <div className="det-kpi-card__content">
                <span className="det-kpi-card__label">Ítems / Productos</span>
                <span className="det-kpi-card__val">
                  {op.items.length} {op.items.length === 1 ? 'producto' : 'productos'}
                </span>
                <span className="det-kpi-card__sub">{totalCantidad} unidades en total</span>
              </div>
            </div>

            <div className="det-kpi-card" style={{ borderLeft: '4px solid #059669' }}>
              <div className="det-kpi-card__icon" style={{ background: '#ecfdf5' }}>
                <GoogleIcon name="local_offer" size={24} color="#059669" />
              </div>
              <div className="det-kpi-card__content">
                <span className="det-kpi-card__label">Marcas Participantes</span>
                <span className="det-kpi-card__val">
                  {op.marcas.length} {op.marcas.length === 1 ? 'marca' : 'marcas'}
                </span>
                <span className="det-kpi-card__sub">
                  {op.marcas.map((m) => m.nombre).join(', ') || 'Sin marcas'}
                </span>
              </div>
            </div>

            <div className="det-kpi-card" style={{ borderLeft: `4px solid ${vKpiColor}` }}>
              <div className="det-kpi-card__icon" style={{ background: vKpiBg }}>
                <GoogleIcon name="schedule" size={24} color={vKpiColor} />
              </div>
              <div className="det-kpi-card__content">
                <span className="det-kpi-card__label">Vencimiento Oficial</span>
                <span className="det-kpi-card__val" style={{ fontSize: '1.05rem', color: vColor }}>
                  {vBadge ? vBadge.label : 'Sin fecha'}
                </span>
                <span className="det-kpi-card__sub">
                  {op.fechaVencimiento
                    ? formatFechaHoraPeru(op.fechaVencimiento, { dateStyle: 'medium', timeStyle: 'short' })
                    : 'Sin límite fijado'}
                </span>
              </div>
            </div>
          </div>



          {/* ── 1. Convocatoria y Cliente ── */}
          <div className="det-section">
            <div className="det-section__header">
              <div className="det-section__title">
                <div className="det-section__icon" style={{ background: `${roleAccent}15` }}>
                  <GoogleIcon name="feed" size={17} color={roleAccent} />
                </div>
                <h3>1. Convocatoria y Cliente</h3>
              </div>
            </div>
            <div className="det-section__body">
              <div className="det-fields-grid">
                <div className="det-field">
                  <span className="det-field__label">Número de Requerimiento</span>
                  <div className="det-field__value">
                    <code>{op.numeroRequerimiento}</code>
                  </div>
                </div>

                <div className="det-field">
                  <span className="det-field__label">Acuerdo Marco</span>
                  <div className="det-field__value">
                    {op.acuerdoMarco ? (
                      <span>
                        <strong>{op.acuerdoMarco.codigo}</strong> — {op.acuerdoMarco.descripcion}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No asignado</span>
                    )}
                  </div>
                </div>

                <div className="det-field">
                  <span className="det-field__label">Entidad Convocante</span>
                  <div className="det-field__value">
                    {op.entidadConvocante ? (
                      <strong>{op.entidadConvocante}</strong>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No especificada en el registro</span>
                    )}
                  </div>
                </div>

                <div className="det-field">
                  <span className="det-field__label">Empresa Asociada (Cliente)</span>
                  <div className="det-field__value">
                    {op.empresaRazonSocial ? (
                      <strong>{op.empresaRazonSocial}</strong>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin empresa vinculada (Registro Rápido)</span>
                    )}
                  </div>
                </div>

                {op.empresaRuc && (
                  <div className="det-field">
                    <span className="det-field__label">RUC de Empresa</span>
                    <div className="det-field__value">
                      <code>{op.empresaRuc}</code>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── 3. Marcas Participantes ── */}
          <div className="det-section">
            <div className="det-section__header">
              <div className="det-section__title">
                <div className="det-section__icon" style={{ background: '#fef3c7' }}>
                  <GoogleIcon name="local_offer" size={17} color="#d97706" />
                </div>
                <h3>2. Marcas con las que se cotiza ({op.marcas.length})</h3>
              </div>
            </div>
            <div className="det-section__body">
              {op.marcas.length > 0 ? (
                <div className="det-brand-chips">
                  {op.marcas.map((m) => (
                    <span key={m.id} className="det-brand-chip">
                      <GoogleIcon name="check_circle" size={15} color="#2563eb" />
                      <span>{m.nombre}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  No se registraron marcas participantes.
                </p>
              )}
            </div>
          </div>

          {/* ── 4. Tabla de Productos e Ítems ── */}
          <div className="det-section">
            <div className="det-section__header">
              <div className="det-section__title">
                <div className="det-section__icon" style={{ background: '#ede9fe' }}>
                  <GoogleIcon name="inventory_2" size={17} color="#7c3aed" />
                </div>
                <h3>3. Detalle de Productos y Proforma ({op.items.length} ítems)</h3>
              </div>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                Total: {totalCantidad} unidades
              </span>
            </div>
            <div className="det-section__body" style={{ padding: 0 }}>
              <div className="det-table-wrap">
                <table className="det-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                      <th>N° de Parte</th>
                      <th>Descripción del Ítem</th>
                      <th style={{ textAlign: 'center' }}>Detalles / Ficha</th>
                      <th style={{ textAlign: 'right' }}>Cant.</th>
                      <th style={{ textAlign: 'right' }}>Límite Unitario</th>
                      <th style={{ textAlign: 'right' }}>Subtotal Límite</th>
                      <th style={{ minWidth: 190 }}>Ajuste de flete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {op.items.map((it: ProductoItem, idx: number) => {
                      const sub = (Number(it.cantidad) || 0) * (Number(it.limiteUnitario) || 0);

                      return (
                        <tr key={it.id || idx}>
                          <td style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>
                            {idx + 1}
                          </td>
                          <td>
                            <span className="det-item-part">{it.numeroParte || 'N/A'}</span>
                          </td>
                          <td>
                            <div className="det-item-desc">{it.descripcion || 'Sin descripción'}</div>
                            {it.condicionesAdicionales && (
                              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
                                <em>Condiciones: {it.condicionesAdicionales}</em>
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div className="det-item-meta" style={{ justifyContent: 'center' }}>
                              {it.marcaProducto && (
                                <span className="det-item-pill">Marca: {it.marcaProducto}</span>
                              )}
                              {it.fichaProducto && (
                                <span className="det-item-pill">Ficha: {it.fichaProducto}</span>
                              )}
                              {it.fichaTecnica && (
                                <span className="det-item-pill" style={{ color: '#2563eb' }}>
                                  PDF Técnico
                                </span>
                              )}
                              {!it.marcaProducto && !it.fichaProducto && !it.fichaTecnica && (
                                <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>—</span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                            {it.cantidad}
                          </td>
                          <td style={{ textAlign: 'right', color: '#64748b' }}>
                            S/{' '}
                            {Number(it.limiteUnitario).toLocaleString('es-PE', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#0284c7' }}>
                            S/{' '}
                            {sub.toLocaleString('es-PE', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td>
                            {(() => {
                              const estado = it.ajusteFleteEstado;
                              const colores: Record<string, { c: string; b: string }> = {
                                Pendiente: { c: '#b45309', b: '#fef3c7' },
                                Aprobado: { c: '#166534', b: '#dcfce7' },
                                Rechazado: { c: '#991b1b', b: '#fee2e2' },
                              };
                              const ocupado = procesandoAjuste === it.id;
                              const btn: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 6, border: '1.5px solid #cbd5e1', background: '#fff', cursor: ocupado ? 'wait' : 'pointer' };
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                                  {(it.ajusteFletePorcentaje ?? 0) > 0 && (
                                    <span>
                                      Vigente: <strong>{it.ajusteFletePorcentaje}%</strong> (S/ {formatoSoles(montoAjusteUnitario(it.limiteUnitario, it.ajusteFletePorcentaje ?? 0))} / unid)
                                    </span>
                                  )}
                                  {estado && (
                                    <span style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999, color: colores[estado].c, background: colores[estado].b }}>
                                      {estado === 'Aprobado' ? 'Aprobado' : `${estado}: ${it.ajusteFleteSolicitadoPorcentaje ?? 0}%`}
                                    </span>
                                  )}
                                  {estado === 'Pendiente' && it.ajusteFleteMotivo && (
                                    <em style={{ color: '#64748b' }}>{it.ajusteFleteMotivo}</em>
                                  )}
                                  {estado === 'Rechazado' && it.ajusteFleteComentarioAdmin && (
                                    <em style={{ color: '#991b1b' }}>{it.ajusteFleteComentarioAdmin}</em>
                                  )}
                                  {!estado && !((it.ajusteFletePorcentaje ?? 0) > 0) && (
                                    <span style={{ color: '#cbd5e1' }}>—</span>
                                  )}
                                  {isAdmin && estado === 'Pendiente' && (
                                    <div style={{ display: 'flex', gap: 6 }}>
                                      <button type="button" disabled={ocupado} onClick={() => handleResolverAjuste(it, true)} style={{ ...btn, color: '#166534', borderColor: '#86efac' }}>Aprobar</button>
                                      <button type="button" disabled={ocupado} onClick={() => handleResolverAjuste(it, false)} style={{ ...btn, color: '#991b1b', borderColor: '#fca5a5' }}>Rechazar</button>
                                    </div>
                                  )}
                                  {isOwner && !isAdmin && estado !== 'Pendiente' && (
                                    <button type="button" disabled={ocupado} onClick={() => handleSolicitarAjuste(it)} style={{ ...btn, alignSelf: 'flex-start', color: roleAccent }}>
                                      {estado === 'Aprobado' ? 'Solicitar cambio' : 'Solicitar ajuste'}
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'right', color: '#64748b' }}>
                        Límite Total Consolidado:
                      </td>
                      <td style={{ textAlign: 'right', color: '#0f172a' }}>{totalCantidad}</td>
                      <td style={{ textAlign: 'right', color: '#64748b' }}>Soles (PEN)</td>
                      <td style={{ textAlign: 'right', color: '#059669', fontSize: '1rem' }}>
                        S/{' '}
                        {totalLimite.toLocaleString('es-PE', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* ── 5. Evidencias y Capturas de Sustento ── */}
          <div className="det-section">
            <div className="det-section__header">
              <div className="det-section__title">
                <div className="det-section__icon" style={{ background: `${roleAccent}15` }}>
                  <GoogleIcon name="collections" size={17} color={roleAccent} />
                </div>
                <h3>4. Evidencias y Capturas Adjuntas ({imagenes.length})</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={cargarImagenes}
                  title="Refrescar lista de evidencias"
                  style={{
                    background: 'none',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    padding: '4px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: '12px',
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  <GoogleIcon name="refresh" size={14} color="#64748b" />
                  <span>Actualizar</span>
                </button>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => {
                      onSubirEvidencia(op.id);
                      onClose();
                    }}
                    title="Subir nueva captura o foto de sustento"
                    style={{
                      background: 'rgba(37, 99, 235, 0.08)',
                      border: '1px solid rgba(37, 99, 235, 0.25)',
                      borderRadius: 6,
                      padding: '4px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '12px',
                      color: roleAccent,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <GoogleIcon name="add_photo_alternate" size={14} color={roleAccent} />
                    <span>+ Adjuntar</span>
                  </button>
                )}
              </div>
            </div>

            <div className="det-section__body">
              {loadingImagenes ? (
                <div style={{ textAlign: 'center', padding: '28px 16px', color: '#64748b' }}>
                  <GoogleIcon name="hourglass_empty" size={28} color={roleAccent} />
                  <p style={{ marginTop: 8, fontSize: '13px', margin: 0 }}>Cargando evidencias fotográficas...</p>
                </div>
              ) : imagenes.length === 0 ? (
                <div className="det-evidence-empty">
                  <GoogleIcon name="photo_camera_back" size={36} color="#94a3b8" />
                  <p className="det-evidence-empty__title">Sin evidencias fotográficas adjuntas</p>
                  <p className="det-evidence-empty__sub">
                    Aún no se han registrado capturas de cotización o proformas para este requerimiento.
                  </p>
                  {isOwner && (
                    <button
                      type="button"
                      className="det-btn-secondary"
                      style={{ marginTop: 12, fontSize: '12.5px' }}
                      onClick={() => {
                        onSubirEvidencia(op.id);
                        onClose();
                      }}
                    >
                      <GoogleIcon name="upload_file" size={16} color="#059669" />
                      <span>Subir Primera Evidencia</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="det-evidence-grid">
                  {imagenes.map((ev) => {
                    const archivoUrl = getImagenArchivoUrl(ev.oportunidadId, ev.id);
                    return (
                      <div key={ev.id} className="det-evidence-card">
                        <div
                          className="det-evidence-card__preview"
                          onClick={() => setModalImagen(ev)}
                          title="Clic para ver en tamaño completo"
                        >
                          <img
                            src={archivoUrl}
                            alt={ev.nombreArchivo}
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/logo.png';
                            }}
                          />
                          <div className="det-evidence-card__overlay">
                            <GoogleIcon name="zoom_in" size={24} color="#ffffff" />
                            <span>Ampliar Imagen</span>
                          </div>
                        </div>
                        <div className="det-evidence-card__info">
                          <div className="det-evidence-card__type">
                            <GoogleIcon name="image" size={13} color={roleAccent} />
                            <span title={ev.tipoEvidencia}>{ev.tipoEvidencia}</span>
                          </div>
                          <div className="det-evidence-card__filename" title={ev.nombreArchivo}>
                            {ev.nombreArchivo}
                          </div>
                          {ev.comentario && (
                            <div className="det-evidence-card__comment" title={ev.comentario}>
                              <em>"{ev.comentario}"</em>
                            </div>
                          )}
                          <div className="det-evidence-card__meta">
                            <span>{ev.subidoPor}</span>
                            <span>&bull;</span>
                            <span>{ev.tamanoArchivo}</span>
                          </div>
                        </div>
                        <div className="det-evidence-card__actions">
                          <button
                            type="button"
                            className="det-evidence-btn"
                            onClick={() => setModalImagen(ev)}
                            title="Ver en pantalla completa"
                          >
                            <GoogleIcon name="visibility" size={14} color={roleAccent} />
                            <span>Ver</span>
                          </button>
                          <a
                            href={archivoUrl}
                            download={ev.nombreArchivo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="det-evidence-btn"
                            title="Descargar archivo original"
                          >
                            <GoogleIcon name="download" size={14} color="#64748b" />
                            <span>Descargar</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── 6. Orden de Compra (si existe) ── */}
          {op.ordenCompra && (
            <div className="det-section">
              <div className="det-section__header">
                <div className="det-section__title">
                  <div className="det-section__icon" style={{ background: '#e0f2fe' }}>
                    <GoogleIcon name="receipt_long" size={17} color="#0284c7" />
                  </div>
                  <h3>5. Orden de Compra Asociada (Bloque 2)</h3>
                </div>
              </div>
              <div className="det-section__body">
                <div className="det-fields-grid">
                  <div className="det-field">
                    <span className="det-field__label">N° de Orden de Compra</span>
                    <div className="det-field__value">
                      <code>{op.ordenCompra.numeroOC}</code>
                    </div>
                  </div>

                  <div className="det-field">
                    <span className="det-field__label">Estado de la OC</span>
                    <div className="det-field__value">
                      <strong>{op.ordenCompra.estadoOC}</strong>
                    </div>
                  </div>

                  {op.ordenCompra.fechaEmisionOC && (
                    <div className="det-field">
                      <span className="det-field__label">Fecha de Emisión</span>
                      <div className="det-field__value">
                        {formatFechaHoraPeru(op.ordenCompra.fechaEmisionOC)}
                      </div>
                    </div>
                  )}

                  {op.ordenCompra.transportista && (
                    <div className="det-field">
                      <span className="det-field__label">Transportista</span>
                      <div className="det-field__value">{op.ordenCompra.transportista}</div>
                    </div>
                  )}

                  {op.ordenCompra.noGuiaRemision && (
                    <div className="det-field">
                      <span className="det-field__label">Guía de Remisión</span>
                      <div className="det-field__value">
                        <code>{op.ordenCompra.noGuiaRemision}</code>
                      </div>
                    </div>
                  )}

                  {op.ordenCompra.fechaEntrega && (
                    <div className="det-field">
                      <span className="det-field__label">Fecha de Entrega</span>
                      <div className="det-field__value">
                        {formatFechaHoraPeru(op.ordenCompra.fechaEntrega)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── 6. Trazabilidad y Auditoría (solo gestión) ── */}
          {esGestion && (
            <div className="det-section">
              <div className="det-section__header">
                <div className="det-section__title">
                  <div className="det-section__icon" style={{ background: '#f1f5f9' }}>
                    <GoogleIcon name="history" size={17} color="#475569" />
                  </div>
                  <h3>Trazabilidad y Auditoría</h3>
                </div>
              </div>
              <div className="det-section__body">
                <div className="det-audit-row">
                  <div className="det-audit-user">
                    <div className="det-audit-avatar">
                      {(op.creadoPor || 'E').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div>Registrado por: <strong>{op.creadoPor || 'Ejecutiva'}</strong></div>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Usuario asignado a la oportunidad</div>
                    </div>
                  </div>

                  <div className="det-audit-times">
                    <div className="det-audit-time-item">
                      <GoogleIcon name="event" size={15} color="#64748b" />
                      <span>Fecha: <strong>{op.createdAt || 'N/A'}</strong></span>
                    </div>

                    {op.horaRegistroExacta && (
                      <div className="det-audit-time-item">
                        <GoogleIcon name="timer" size={15} color="#059669" />
                        <span>Captura legal: <strong style={{ color: '#059669' }}>{op.horaRegistroExacta}</strong></span>
                      </div>
                    )}

                    {op.updatedAt && (
                      <div className="det-audit-time-item">
                        <GoogleIcon name="update" size={15} color="#2563eb" />
                        <span>Modificado: <strong>{op.updatedAt}</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer Sticky con Acciones ── */}
        <div className="det-footer">
          <div className="det-footer__inner">
            {/* Acciones de Estado / Resolución */}
            <div className="det-footer__left">
              {canManageStatus &&
                op.estado !== 'Aceptada por el Administrador' &&
                op.estado !== 'Aceptada por Perú Compras' &&
                op.estado !== 'Adjudicada' &&
                !['OC_RECIBIDA', 'OC_ACEPTADA', 'ENTREGADA'].includes(op.estado) && (
                  <button
                    type="button"
                    className="det-btn-success"
                    disabled={cambiandoEstado}
                    onClick={() => handleCambiarEstado('Aceptada por el Administrador', 'Aceptada por el Administrador')}
                    title="Asignar Buena Pro (Aceptada por el Administrador)"
                  >
                    <GoogleIcon name="how_to_reg" size={16} color="#059669" />
                    <span>Aceptar (Admin)</span>
                  </button>
                )}

              {canManageStatus &&
                op.estado !== 'Desestimada' &&
                op.estado !== 'Aceptada Desestimada' &&
                op.estado !== 'Aceptada por el Administrador' &&
                op.estado !== 'Aceptada por Perú Compras' &&
                op.estado !== 'Adjudicada' &&
                !['OC_RECIBIDA', 'OC_ACEPTADA', 'ENTREGADA'].includes(op.estado) && (
                  <button
                    type="button"
                    className="det-btn-danger"
                    disabled={cambiandoEstado}
                    onClick={handleDesestimar}
                    title="Desestimar oportunidad directamente"
                  >
                    <GoogleIcon name="cancel" size={16} color="#dc2626" />
                    <span>Desestimar</span>
                  </button>
                )}

              {canManageStatus &&
                (op.estado === 'Desestimada' ||
                  op.estado === 'Aceptada Desestimada' ||
                  op.estado === 'Adjudicada' ||
                  op.estado === 'Aceptada por el Administrador') && (
                  <button
                    type="button"
                    className="det-btn-secondary"
                    disabled={cambiandoEstado}
                    onClick={handleReabrir}
                    title="Reabrir la licitación"
                  >
                    <GoogleIcon name="replay" size={16} color="#d97706" />
                    <span>Reabrir</span>
                  </button>
                )}
            </div>

            {/* Acciones Generales */}
            <div className="det-footer__right">
              {/* Botón Copiar Resumen (solo gestión) */}
              {esGestion && (
                <button
                  type="button"
                  className="det-btn-secondary"
                  onClick={copiarResumen}
                  title="Copiar resumen al portapapeles"
                >
                  <GoogleIcon name={copiado ? 'check' : 'content_copy'} size={16} color="#334155" />
                  <span>{copiado ? '¡Copiado!' : 'Copiar Resumen'}</span>
                </button>
              )}

              {/* Botón Subir Evidencia */}
              {isOwner && (
                <button
                  type="button"
                  className="det-btn-secondary"
                  onClick={() => {
                    onSubirEvidencia(op.id);
                    onClose();
                  }}
                  title="Adjuntar constancia oficial de Perú Compras"
                >
                  <GoogleIcon name="upload_file" size={16} color="#059669" />
                  <span>Subir Evidencia</span>
                </button>
              )}

              {/* Botón Editar Oportunidad */}
              {isOwner && (
                <button
                  type="button"
                  className="det-btn-primary"
                  style={{ background: roleAccent }}
                  onClick={() => {
                    onEdit(op);
                    onClose();
                  }}
                  title="Editar datos de la oportunidad"
                >
                  <GoogleIcon name="edit" size={16} color="#ffffff" />
                  <span>Editar Oportunidad</span>
                </button>
              )}

              {/* Botón Cerrar */}
              <button type="button" className="det-btn-secondary" onClick={onClose}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lightbox para Visualización en Pantalla Completa de la Imagen ── */}
      {modalImagen && (
        <div
          className="det-lightbox-overlay"
          onClick={() => setModalImagen(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="det-lightbox-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="det-lightbox-header">
              <div className="det-lightbox-title-wrap">
                <GoogleIcon name="image" size={22} color={roleAccent} />
                <div>
                  <h4>{modalImagen.nombreArchivo}</h4>
                  <p>
                    {modalImagen.tipoEvidencia} &bull; {modalImagen.tamanoArchivo} &bull; Subido por {modalImagen.subidoPor}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <a
                  href={getImagenArchivoUrl(modalImagen.oportunidadId, modalImagen.id)}
                  download={modalImagen.nombreArchivo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="det-btn-secondary"
                  style={{ textDecoration: 'none', padding: '6px 12px', fontSize: '12px' }}
                >
                  <GoogleIcon name="download" size={16} />
                  <span>Descargar</span>
                </a>
                <button
                  type="button"
                  className="det-close-btn"
                  onClick={() => setModalImagen(null)}
                  title="Cerrar vista previa (Esc)"
                >
                  <GoogleIcon name="close" size={20} color="#64748b" />
                </button>
              </div>
            </div>

            <div className="det-lightbox-body">
              <img
                src={getImagenArchivoUrl(modalImagen.oportunidadId, modalImagen.id)}
                alt={modalImagen.nombreArchivo}
              />
            </div>

            {modalImagen.comentario && (
              <div className="det-lightbox-footer">
                <strong>Observación / Comentario:</strong> {modalImagen.comentario}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DetalleOportunidadView;
