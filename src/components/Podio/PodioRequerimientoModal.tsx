import React, { useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { GoogleIcon } from '../GoogleIcon';
import type { Oportunidad } from '../../types/oportunidades';
import { cambiarEstadoApi } from '../../api/services/oportunidades.service';
import { formatFechaHoraPeru, formatHoraExacta, formatDiferenciaTiempo } from '../../utils/dateUtils';
import './PodioRequerimientoModal.css';

interface PodioRequerimientoModalProps {
  numeroRequerimiento: string;
  oportunidades: Oportunidad[];
  roleAccent?: string;
  onClose: () => void;
  onOportunidadesActualizadas?: (ops: Oportunidad[]) => void;
  onVerDetalle?: (op: Oportunidad) => void;
}

export const PodioRequerimientoModal: React.FC<PodioRequerimientoModalProps> = ({
  numeroRequerimiento,
  oportunidades,
  roleAccent = '#2563eb',
  onClose,
  onOportunidadesActualizadas,
  onVerDetalle,
}) => {
  const [asignandoId, setAsignandoId] = useState<string | number | null>(null);

  // Filtrar postulaciones para este requerimiento y ordenar cronológicamente
  const competidores = useMemo(() => {
    const req = (numeroRequerimiento || '').trim().toUpperCase();
    return oportunidades
      .filter((op) => (op.numeroRequerimiento || '').trim().toUpperCase() === req)
      .sort((a, b) => {
        const tA = a.fechaRegistro ? new Date(a.fechaRegistro).getTime() : 0;
        const tB = b.fechaRegistro ? new Date(b.fechaRegistro).getTime() : 0;
        return tA - tB;
      });
  }, [oportunidades, numeroRequerimiento]);

  // Ganador actual (si alguno ya fue adjudicado)
  const ganadorActual = useMemo(
    () => competidores.find((c) => c.estado === 'Adjudicada'),
    [competidores]
  );

  // Cálculo del podio, diferencias de tiempo y empates técnicos
  const podioItems = useMemo(() => {
    if (competidores.length === 0) return [];

    const primerTiempo = competidores[0].fechaRegistro
      ? new Date(competidores[0].fechaRegistro).getTime()
      : 0;

    let posicionActual = 1;

    return competidores.map((op, idx) => {
      const tiempoActual = op.fechaRegistro ? new Date(op.fechaRegistro).getTime() : 0;
      const diffMs = Math.max(0, tiempoActual - primerTiempo);

      if (idx > 0) {
        const prevFecha = competidores[idx - 1].fechaRegistro;
        const prevTiempo = prevFecha ? new Date(prevFecha).getTime() : 0;
        const diffSegs = Math.abs(Math.round((tiempoActual - prevTiempo) / 1000));
        if (diffSegs > 0) {
          posicionActual = idx + 1;
        }
      } else {
        posicionActual = 1;
      }

      const esLiderLlegada = posicionActual === 1;
      const esGanador = op.estado === 'Adjudicada';

      let diferenciaTexto = '⚡ 1° en llegar';
      if (idx > 0) {
        if (diffMs === 0) {
          diferenciaTexto = '🤝 Empate técnico (0s)';
        } else {
          diferenciaTexto = formatDiferenciaTiempo(diffMs);
        }
      }

      return {
        op,
        posicion: posicionActual,
        esLiderLlegada,
        esGanador,
        diferenciaTexto,
      };
    });
  }, [competidores]);

// Iconos SVG corporativos para SweetAlert2
const SVG_TROPHY = `<svg width="26" height="26" viewBox="0 0 24 24" fill="#d97706" style="vertical-align: middle; display: inline-block;"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/></svg>`;
const SVG_CROWN = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#15803d" style="vertical-align: middle; display: inline-block; margin-right: 6px;"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>`;
const SVG_WARNING = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#b45309" style="vertical-align: middle; display: inline-block; margin-right: 6px; flex-shrink: 0;"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`;

  // Asignar ganador y dictaminar Buena Pro
  const handleAsignarGanador = async (ganadorOp: Oportunidad) => {
    const nombreGanador = ganadorOp.creadoPor || 'Ejecutiva';
    const otrosCompetidores = competidores.filter((c) => String(c.id) !== String(ganadorOp.id));

    const confirm = await Swal.fire({
      title: `<div style="display:flex; align-items:center; justify-content:center; gap:8px;">${SVG_TROPHY}<span style="font-weight:800; color:#0f172a;">Asignar Buena Pro</span></div>`,
      html: `
        <div style="text-align: left; font-size: 13.5px; line-height: 1.5; color: #334155;">
          <p style="margin-top: 4px;">¿Confirmas la asignación oficial de la <strong>BUENA PRO</strong> para este requerimiento a:</p>
          <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 12px; margin: 12px 0;">
            <div style="font-weight: 800; color: #166534; font-size: 15px; display: flex; align-items: center;">
              ${SVG_CROWN}
              <span>${nombreGanador}</span>
            </div>
            <div style="color: #15803d; font-size: 12.5px; margin-top: 6px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span>Requerimiento: <strong>${ganadorOp.numeroRequerimiento}</strong></span>
              <span>&bull;</span>
              <span>Límite Total: <strong>S/ ${Number(ganadorOp.limiteTotal).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong></span>
            </div>
          </div>
          ${
            otrosCompetidores.length > 0
              ? `<div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 12px; color: #92400e; font-size: 12px; margin-top: 10px; display: flex; align-items: flex-start;">
                  ${SVG_WARNING}
                  <span><strong>Regla de Adjudicación Única:</strong> Existen <strong>${otrosCompetidores.length}</strong> otra(s) postulación(es) para este requerimiento. Al confirmar, pasarán automáticamente a estado <strong>Desestimada</strong>.</span>
                </div>`
              : ''
          }
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, Asignar Ganador',
      cancelButtonText: 'Cancelar',
    });

    if (!confirm.isConfirmed) return;

    setAsignandoId(ganadorOp.id);
    try {
      // 1. Si otro competidor ya tenía la Buena Pro, desestimarlo primero para liberar la regla de Buena Pro única en el backend
      const previoGanador = otrosCompetidores.find(
        (c) => c.estado === 'Adjudicada' || ['OC_RECIBIDA', 'OC_ACEPTADA', 'ENTREGADA'].includes(c.estado)
      );
      if (previoGanador) {
        await cambiarEstadoApi(previoGanador.id, 'Desestimada');
      }

      // 2. Adjudicar la oportunidad ganadora
      await cambiarEstadoApi(ganadorOp.id, 'Adjudicada');

      // 3. Desestimar las otras oportunidades competidoras
      const promesasDesestimar = otrosCompetidores
        .filter((c) => c.id !== previoGanador?.id && c.estado !== 'Desestimada')
        .map((c) => cambiarEstadoApi(c.id, 'Desestimada').catch((e) => console.warn(e)));
      await Promise.all(promesasDesestimar);

      // 3. Notificar lista actualizada
      const listaActualizada = oportunidades.map((item) => {
        if (String(item.id) === String(ganadorOp.id)) {
          return { ...item, estado: 'Adjudicada' as const };
        }
        if (otrosCompetidores.some((o) => String(o.id) === String(item.id))) {
          return { ...item, estado: 'Desestimada' as const };
        }
        return item;
      });

      onOportunidadesActualizadas?.(listaActualizada);

      Swal.fire({
        icon: 'success',
        title: '¡Buena Pro Asignada!',
        text: `La postulación de ${nombreGanador} ha sido Adjudicada con éxito.${
          otrosCompetidores.length > 0
            ? ` Se marcaron ${otrosCompetidores.length} postulación(es) competidora(s) como Desestimadas.`
            : ''
        }`,
        confirmButtonColor: '#059669',
        timer: 3500,
        timerProgressBar: true,
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error al adjudicar oportunidad',
        text: err.message || 'Ocurrió un error al actualizar los estados en el servidor.',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setAsignandoId(null);
    }
  };

  return (
    <div className="pod-overlay" onClick={onClose}>
      <div className="pod-modal" onClick={(e) => e.stopPropagation()}>
        {/* ── Encabezado ── */}
        <div className="pod-header">
          <div className="pod-header__left">
            <div className="pod-header__icon">
              <GoogleIcon name="emoji_events" size={26} color="#d97706" />
            </div>
            <div className="pod-header__titles">
              <h2>
                <span>Podio de la Oportunidad</span>
                <span className="pod-header__req-badge">{numeroRequerimiento}</span>
              </h2>
              <p>
                Orden de llegada cronológico oficial y dictamen de Buena Pro para este requerimiento.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="pod-close-btn"
            onClick={onClose}
            title="Cerrar podio (Esc)"
            aria-label="Cerrar"
          >
            <GoogleIcon name="close" size={20} color="#64748b" />
          </button>
        </div>

        {/* ── Cuerpo Scrollable ── */}
        <div className="pod-body">
          {/* Banner de Resumen */}
          <div className="pod-summary-banner">
            <div className="pod-summary-item">
              <span className="pod-summary-item__label">Postulaciones en Disputa</span>
              <span className="pod-summary-item__value">
                {competidores.length} {competidores.length === 1 ? 'ejecutiva' : 'ejecutivas'}
              </span>
            </div>

            <div className="pod-summary-item">
              <span className="pod-summary-item__label">1° en Llegar (Prioridad Legal)</span>
              <span className="pod-summary-item__value" style={{ color: '#059669' }}>
                {competidores[0]?.creadoPor || 'N/A'}
              </span>
            </div>

            <div className="pod-summary-item">
              <span className="pod-summary-item__label">Límite Total</span>
              <span className="pod-summary-item__value" style={{ color: roleAccent }}>
                S/{' '}
                {Number(competidores[0]?.limiteTotal || 0).toLocaleString('es-PE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            <div className="pod-summary-item">
              <span className="pod-summary-item__label">Dictamen de Buena Pro</span>
              <span
                className="pod-summary-item__value"
                style={{ color: ganadorActual ? '#059669' : '#d97706', fontSize: '0.92rem' }}
              >
                {ganadorActual ? `👑 Adjudicada (${ganadorActual.creadoPor})` : '⏳ Pendiente de Resolver'}
              </span>
            </div>
          </div>

          {/* Alert Explicativo */}
          <div className="pod-alert-info">
            <GoogleIcon name="info" size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              {competidores.length > 1 ? (
                <>
                  En las licitaciones de Perú Compras con cotización simultánea,{' '}
                  <strong>la ejecutiva que registró primero tiene la prioridad legal ganada</strong>. Puedes
                  asignarle la Buena Pro directamente o decidir la adjudicación según el dictamen oficial.
                </>
              ) : (
                <>
                  Requerimiento con <strong>postulación única registrada</strong>. La ejecutiva tiene la
                  prioridad absoluta asegurada para la Buena Pro.
                </>
              )}
            </span>
          </div>

          {/* ── Tarjetas del Podio ── */}
          <div className="pod-cards-grid">
            {podioItems.map(({ op, posicion, esLiderLlegada, esGanador, diferenciaTexto }) => {
              const isFirst = posicion === 1;
              const isSecond = posicion === 2;
              const isThird = posicion === 3;
              const isProcessing = asignandoId === op.id;

              let cardMod = '';
              if (esGanador) cardMod = 'pod-card--winner';
              else if (op.estado === 'Desestimada') cardMod = 'pod-card--dismissed';
              else if (isFirst) cardMod = 'pod-card--gold';
              else if (isSecond) cardMod = 'pod-card--silver';
              else if (isThird) cardMod = 'pod-card--bronze';

              let posBadgeClass = 'pod-card__badge-pos--bronze';
              let posLabel = `${posicion}° Lugar`;
              if (esGanador) {
                posBadgeClass = 'pod-card__badge-pos--winner';
                posLabel = '🏆 Ganador Adjudicado';
              } else if (isFirst) {
                posBadgeClass = 'pod-card__badge-pos--gold';
                posLabel = '🥇 1° Lugar (Llegó Primero)';
              } else if (isSecond) {
                posBadgeClass = 'pod-card__badge-pos--silver';
                posLabel = '🥈 2° Lugar';
              } else if (isThird) {
                posBadgeClass = 'pod-card__badge-pos--bronze';
                posLabel = '🥉 3° Lugar';
              } else {
                posLabel = `🎖️ ${posicion}° Lugar`;
              }

              let avatarClass = 'pod-card__avatar--bronze';
              if (esGanador) avatarClass = 'pod-card__avatar--winner';
              else if (isFirst) avatarClass = 'pod-card__avatar--gold';
              else if (isSecond) avatarClass = 'pod-card__avatar--silver';

              return (
                <div key={op.id} className={`pod-card ${cardMod}`}>
                  {/* Cabecera de la Tarjeta */}
                  <div className="pod-card__header">
                    <span className={`pod-card__badge-pos ${posBadgeClass}`}>{posLabel}</span>
                    <span
                      className={`pod-card__badge-time ${
                        esLiderLlegada ? 'pod-card__badge-time--lead' : ''
                      }`}
                      title={op.horaRegistroExacta || op.createdAt}
                    >
                      {diferenciaTexto}
                    </span>
                  </div>

                  {/* Usuario / Ejecutiva */}
                  <div className="pod-card__user">
                    <div className={`pod-card__avatar ${avatarClass}`}>
                      {(op.creadoPor || 'E').charAt(0).toUpperCase()}
                    </div>
                    <div className="pod-card__user-data">
                      <span className="pod-card__name">{op.creadoPor || 'Ejecutiva'}</span>
                      <span className="pod-card__meta-time">
                        <GoogleIcon name="schedule" size={13} color="#94a3b8" />
                        <span>
                          {op.fechaRegistro
                            ? formatHoraExacta(op.fechaRegistro)
                            : op.horaRegistroExacta || 'Hora registrada'}
                          {op.fechaRegistro && ` (${formatFechaHoraPeru(op.fechaRegistro, { dateStyle: 'short' })})`}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Detalles Comerciales */}
                  <div className="pod-card__details">
                    <div className="pod-card__detail-row">
                      <span className="pod-card__detail-label">Límite Total:</span>
                      <span className="pod-card__amount">
                        S/{' '}
                        {Number(op.limiteTotal).toLocaleString('es-PE', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div className="pod-card__detail-row">
                      <span className="pod-card__detail-label">Marcas:</span>
                      <span className="pod-card__detail-val">
                        {op.marcas.map((m) => m.nombre).join(', ') || 'N/A'}
                      </span>
                    </div>

                    <div className="pod-card__detail-row">
                      <span className="pod-card__detail-label">Ítems / Proforma:</span>
                      <span className="pod-card__detail-val">
                        {op.items.length} {op.items.length === 1 ? 'ítem' : 'ítems'} (
                        {op.items.reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0)} unids)
                      </span>
                    </div>

                    <div className="pod-card__detail-row">
                      <span className="pod-card__detail-label">Estado Actual:</span>
                      <span
                        className="pod-card__status-pill"
                        style={{
                          background:
                            op.estado === 'Adjudicada'
                              ? '#ecfdf5'
                              : op.estado === 'Desestimada'
                              ? '#fee2e2'
                              : '#eff6ff',
                          color:
                            op.estado === 'Adjudicada'
                              ? '#059669'
                              : op.estado === 'Desestimada'
                              ? '#dc2626'
                              : '#2563eb',
                        }}
                      >
                        {op.estado}
                      </span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="pod-card__action">
                    {esGanador ? (
                      <div className="pod-badge-won">
                        <GoogleIcon name="verified" size={17} color="#059669" />
                        <span>Buena Pro Adjudicada</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="pod-btn-win"
                        disabled={isProcessing}
                        onClick={() => handleAsignarGanador(op)}
                        title="Dictaminar Buena Pro y adjudicar este requerimiento a esta ejecutiva"
                      >
                        <GoogleIcon name="emoji_events" size={17} color="#ffffff" />
                        <span>{isProcessing ? 'Adjudicando...' : 'Asignar como Ganador'}</span>
                      </button>
                    )}

                    {onVerDetalle && (
                      <button
                        type="button"
                        onClick={() => onVerDetalle(op)}
                        style={{
                          width: '100%',
                          marginTop: '8px',
                          background: 'transparent',
                          border: 'none',
                          color: '#2563eb',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                        <span>Ver Oportunidad Registrada</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="pod-footer">
          <div className="pod-footer__help">
            <GoogleIcon name="security" size={15} color="#64748b" />
            <span>
              Resolución con validez legal. Los cambios quedan registrados en la auditoría de Perú Compras.
            </span>
          </div>

          <button type="button" className="pod-btn-close" onClick={onClose}>
            Cerrar Podio
          </button>
        </div>
      </div>
    </div>
  );
};

export default PodioRequerimientoModal;
