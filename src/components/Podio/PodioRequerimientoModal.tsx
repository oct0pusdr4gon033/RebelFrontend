import React, { useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { GoogleIcon } from '../GoogleIcon/GoogleIcon';
import type { Oportunidad } from '../../types/oportunidades';
import { cambiarEstadoApi } from '../../api/services/oportunidades.service';
import { formatFechaHoraPeru, formatHoraExacta, formatDiferenciaTiempo } from '../../utils/dateUtils';
import { DictamenBuenaProModal } from './DictamenBuenaProModal';
import type { DictamenBuenaProConfirmPayload } from './IDictamenBuenaProConfirmPayload';
import './PodioRequerimientoModal.css';
import type { PodioRequerimientoModalProps } from './PodioRequerimientoModalProps';

export const PodioRequerimientoModal: React.FC<PodioRequerimientoModalProps> = ({
  numeroRequerimiento,
  oportunidades,
  roleAccent = '#2563eb',
  onClose,
  onOportunidadesActualizadas,
  onVerDetalle,
}) => {
  const [asignandoId, setAsignandoId] = useState<string | number | null>(null);
  const [dictamenModalData, setDictamenModalData] = useState<{
    ganadorOp: Oportunidad;
    otrosCompetidores: Oportunidad[];
  } | null>(null);

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

  // Abrir modal de Dictamen de Buena Pro con casillas de comentarios individuales
  const handleAsignarGanador = (ganadorOp: Oportunidad) => {
    const otrosCompetidores = competidores.filter((c) => String(c.id) !== String(ganadorOp.id));
    setDictamenModalData({
      ganadorOp,
      otrosCompetidores,
    });
  };

  // Confirmar asignación de Buena Pro y desestimaciones individuales una por una
  const handleConfirmarDictamen = async (payload: DictamenBuenaProConfirmPayload) => {
    setAsignandoId(payload.ganadorId);
    try {
      // 1. Si otro competidor ya tenía la Buena Pro, desestimarlo primero para liberar la regla en backend
      const previoGanador = dictamenModalData?.otrosCompetidores.find(
        (c) =>
          c.estado === 'Aceptada por el Administrador' ||
          c.estado === 'Aceptada por Perú Compras' ||
          c.estado === 'Adjudicada' ||
          ['OC_RECIBIDA', 'OC_ACEPTADA', 'ENTREGADA'].includes(c.estado)
      );
      if (previoGanador) {
        const itemPrevio = payload.desestimaciones.find((d) => String(d.oportunidadId) === String(previoGanador.id));
        const motivoPrevio = itemPrevio ? `${itemPrevio.motivo}: ${itemPrevio.comentario}` : 'Reasignación de Buena Pro';
        const targetPrevio =
          previoGanador.estado === 'Aceptada por el Administrador' || previoGanador.estado === 'Adjudicada'
            ? 'Aceptada Desestimada'
            : 'Desestimada';
        await cambiarEstadoApi(previoGanador.id, targetPrevio, motivoPrevio);
      }

      // 2. Desestimar las otras oportunidades competidoras con su motivo individual uno por uno
      const promesasDesestimar = payload.desestimaciones
        .filter((d) => String(d.oportunidadId) !== String(previoGanador?.id))
        .map((des) => {
          const motivoCompleto = `${des.motivo}: ${des.comentario}`;
          return cambiarEstadoApi(des.oportunidadId, 'Desestimada', motivoCompleto).catch((e) =>
            console.warn(e)
          );
        });
      await Promise.all(promesasDesestimar);

      // 3. Adjudicar la oportunidad ganadora con su comentario de asignación
      await cambiarEstadoApi(payload.ganadorId, 'Aceptada por el Administrador', payload.comentarioGanador);

      // 4. Notificar lista actualizada
      const listaActualizada = oportunidades.map((item) => {
        if (String(item.id) === String(payload.ganadorId)) {
          return { ...item, estado: 'Aceptada por el Administrador' as const, motivoDesestimacion: null };
        }
        const des = payload.desestimaciones.find((d) => String(d.oportunidadId) === String(item.id));
        if (des) {
          return { ...item, estado: 'Desestimada' as const, motivoDesestimacion: `${des.motivo}: ${des.comentario}` };
        }
        return item;
      });

      onOportunidadesActualizadas?.(listaActualizada);
      setDictamenModalData(null);

      const nombreGanador = dictamenModalData?.ganadorOp.creadoPor || 'la vendedora seleccionada';

      Swal.fire({
        icon: 'success',
        title: '¡Buena Pro Asignada!',
        html: `
          <div style="text-align: left; font-size: 13.5px; color: #334155; line-height: 1.5;">
            <p>La postulación de <strong>${nombreGanador}</strong> ha sido Adjudicada con Buena Pro.</p>
            <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 10px; margin: 8px 0; font-size: 12.5px; color: #166534;">
              <strong>Motivo de asignación:</strong> ${payload.comentarioGanador}
            </div>
            ${payload.desestimaciones.length > 0
            ? `<p style="font-size: 12px; color: #64748b; margin-top: 8px;">
                    Se registraron los motivos individuales de desestimación para <strong>${payload.desestimaciones.length}</strong> otra(s) vendedora(s).
                  </p>`
            : ''
          }
          </div>
        `,
        confirmButtonColor: '#059669',
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
                      className={`pod-card__badge-time ${esLiderLlegada ? 'pod-card__badge-time--lead' : ''
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
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
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

      {dictamenModalData && (
        <DictamenBuenaProModal
          ganadorOp={dictamenModalData.ganadorOp}
          otrosCompetidores={dictamenModalData.otrosCompetidores}
          onClose={() => setDictamenModalData(null)}
          onConfirm={handleConfirmarDictamen}
          procesando={asignandoId !== null}
        />
      )}
    </div>
  );
};

export default PodioRequerimientoModal;
