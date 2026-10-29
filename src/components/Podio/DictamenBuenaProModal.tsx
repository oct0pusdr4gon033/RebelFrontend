import React, { useState } from 'react';
import { GoogleIcon } from '../GoogleIcon/GoogleIcon';
import './DictamenBuenaProModal.css';
import type { DictamenBuenaProModalProps } from './IDictamenBuenaProModalProps';
import type { DesestimacionIndividualItem } from './IDesestimacionIndividualItem';
import { SUGERENCIAS_GANADOR } from './Sugerencias';
import { MOTIVOS_DESESTIMACION_OPCIONES } from './Sugerencias'


export const DictamenBuenaProModal: React.FC<DictamenBuenaProModalProps> = ({
  ganadorOp,
  otrosCompetidores,
  onClose,
  onConfirm,
  procesando = false,
}) => {
  const nombreGanador = ganadorOp.creadoPor || 'Ejecutiva Ganadora';

  type TabDictamen = 'ganadora' | 'no-ganadoras';
  const [activeTab, setActiveTab] = useState<TabDictamen>('ganadora');

  // Comentario para la vendedora adjudicada
  const [comentarioGanador, setComentarioGanador] = useState('');
  const [errorGanador, setErrorGanador] = useState(false);

  // Comentarios y motivos individuales para cada una de las otras competidoras
  const [desestimaciones, setDesestimaciones] = useState<Record<string | number, { motivo: string; comentario: string }>>(() => {
    const inicial: Record<string | number, { motivo: string; comentario: string }> = {};
    otrosCompetidores.forEach((c) => {
      inicial[c.id] = {
        motivo: 'Llegada posterior a la vendedora adjudicada',
        comentario: `Postulación no seleccionada — Buena Pro adjudicada a ${nombreGanador}.`,
      };
    });
    return inicial;
  });

  const [erroresCompetidores, setErroresCompetidores] = useState<Record<string | number, boolean>>({});

  const handleUpdateCompetidorMotivo = (id: string | number, motivo: string) => {
    setDesestimaciones((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        motivo,
      },
    }));
  };

  const handleUpdateCompetidorComentario = (id: string | number, comentario: string) => {
    setDesestimaciones((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        comentario,
      },
    }));
    if (erroresCompetidores[id]) {
      setErroresCompetidores((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleAplicarSugerenciaGanador = (texto: string) => {
    setComentarioGanador(texto);
    setErrorGanador(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (procesando) return;

    // Validación 1: Comentario de la vendedora ganadora
    let hayErrorGanador = false;
    if (!comentarioGanador.trim()) {
      setErrorGanador(true);
      hayErrorGanador = true;
    } else {
      setErrorGanador(false);
    }

    // Validación 2: Comentario de cada competidora individual
    let hayErrorCompetidores = false;
    const nuevosErrores: Record<string | number, boolean> = {};
    otrosCompetidores.forEach((c) => {
      const data = desestimaciones[c.id];
      if (!data || !data.comentario.trim()) {
        nuevosErrores[c.id] = true;
        hayErrorCompetidores = true;
      }
    });
    setErroresCompetidores(nuevosErrores);

    if (hayErrorGanador) {
      setActiveTab('ganadora');
      return;
    }

    if (hayErrorCompetidores) {
      setActiveTab('no-ganadoras');
      return;
    }

    // Construir payload ordenado
    const listaDesestimaciones: DesestimacionIndividualItem[] = otrosCompetidores.map((c) => ({
      oportunidadId: c.id,
      vendedoraNombre: c.creadoPor || 'Ejecutiva',
      motivo: desestimaciones[c.id]?.motivo || 'No seleccionada',
      comentario: desestimaciones[c.id]?.comentario.trim() || '',
    }));

    await onConfirm({
      ganadorId: ganadorOp.id,
      comentarioGanador: comentarioGanador.trim(),
      desestimaciones: listaDesestimaciones,
    });
  };

  return (
    <div className="dictamen-modal-overlay" onClick={onClose}>
      <div className="dictamen-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* ── Header ── */}
        <div className="dictamen-modal-header">
          <div className="dictamen-modal-header__title">
            <div className="dictamen-modal-header__icon">
              <GoogleIcon name="emoji_events" size={24} color="#d97706" />
            </div>
            <div>
              <h2>Dictamen Oficial de Buena Pro</h2>
              <p>Justifica la asignación de la Buena Pro y los motivos de desestimación uno a uno</p>
            </div>
          </div>
          <button className="dictamen-modal-close" onClick={onClose} title="Cerrar">
            <GoogleIcon name="close" size={18} />
          </button>
        </div>

        {/* ── Banner de Requerimiento ── */}
        <div className="dictamen-req-banner">
          <div className="dictamen-req-badge">
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
              Requerimiento:
            </span>
            <span className="dictamen-req-pill">{ganadorOp.numeroRequerimiento}</span>
          </div>

          <div className="dictamen-req-meta">
            <span>
              <strong>Entidad:</strong> {ganadorOp.entidadConvocante || ganadorOp.empresaRazonSocial || 'N/A'}
            </span>
            <span>&bull;</span>
            <span>
              <strong>Límite Total:</strong> S/{' '}
              {Number(ganadorOp.limiteTotal).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </span>
            <span>&bull;</span>
            <span>
              <strong>Competidoras:</strong> {otrosCompetidores.length + 1} postulante(s)
            </span>
          </div>
        </div>

        {/* ── Barra de Navegación por Pestañas (Tabs) ── */}
        <div className="dictamen-tabs-nav">
          <button
            type="button"
            className={`dictamen-tab-btn tab-ganadora ${activeTab === 'ganadora' ? 'active' : ''}`}
            onClick={() => setActiveTab('ganadora')}
          >
            <GoogleIcon
              name="verified"
              size={18}
              color={activeTab === 'ganadora' ? '#059669' : '#64748b'}
            />
            <span>Vendedora Ganadora (Buena Pro)</span>
            <span
              className={`dictamen-tab-badge ${errorGanador
                ? 'badge-error'
                : comentarioGanador.trim()
                  ? 'badge-ganadora'
                  : 'badge-pending'
                }`}
            >
              {errorGanador ? '¡Requerido!' : comentarioGanador.trim() ? '✓ Listo' : 'Pendiente'}
            </span>
          </button>

          <button
            type="button"
            className={`dictamen-tab-btn tab-no-ganadoras ${activeTab === 'no-ganadoras' ? 'active' : ''}`}
            onClick={() => setActiveTab('no-ganadoras')}
          >
            <GoogleIcon
              name="group_remove"
              size={18}
              color={activeTab === 'no-ganadoras' ? '#dc2626' : '#64748b'}
            />
            <span>No Ganadoras / Desestimadas</span>
            <span
              className={`dictamen-tab-badge ${Object.values(erroresCompetidores).some(Boolean)
                ? 'badge-error'
                : 'badge-no-ganadoras'
                }`}
            >
              {otrosCompetidores.length} postulante(s)
            </span>
          </button>
        </div>

        {/* ── Cuerpo del Modal con Pestañas ── */}
        <form onSubmit={handleSubmit} className="dictamen-modal-body">
          {/* TAB 1: VENDEDORA GANADORA DE LA BUENA PRO */}
          {activeTab === 'ganadora' && (
            <div className="dictamen-tab-pane">
              <div className="dictamen-winner-card">
                <div className="dictamen-winner-header">
                  <div className="dictamen-winner-title">
                    <span className="dictamen-winner-tag">
                      <GoogleIcon name="how_to_reg" size={14} color="#ffffff" />
                      Aceptada por el Administrador (Buena Pro)
                    </span>
                    <div className="dictamen-winner-user">
                      <div className="dictamen-avatar">
                        {nombreGanador.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="dictamen-user-name">{nombreGanador}</div>
                        <div className="dictamen-user-sub">Vendedora / Ejecutiva seleccionada</div>
                      </div>
                    </div>
                  </div>

                  <div className="dictamen-winner-stats">
                    <span>Marcas: {ganadorOp.marcas.map((m) => m.nombre).join(', ') || 'N/A'}</span>
                    <span>&bull;</span>
                    <span>Llegada: {ganadorOp.horaRegistroExacta || 'Registrada'}</span>
                  </div>
                </div>

                {/* Casilla de Comentario Ganadora */}
                <div className="dictamen-field-group">
                  <label className="dictamen-field-label">
                    <span>¿Por qué se asignó la Buena Pro a {nombreGanador}?</span>
                    <span className="required">*</span>
                  </label>

                  <textarea
                    className={`dictamen-field-textarea ${errorGanador ? 'is-invalid' : ''}`}
                    placeholder="Escribe el sustento o motivo detallado de la asignación de la Buena Pro (ej: Mejor cotización presentada, validada en portal Perú Compras, stock confirmado con la marca)..."
                    value={comentarioGanador}
                    onChange={(e) => {
                      setComentarioGanador(e.target.value);
                      if (errorGanador) setErrorGanador(false);
                    }}
                    rows={3}
                  />

                  {errorGanador && (
                    <span style={{ fontSize: '11.5px', color: '#dc2626', fontWeight: 600 }}>
                      Por favor ingresa el motivo o comentario de asignación de la Buena Pro.
                    </span>
                  )}

                  {/* Sugerencias Rápidas */}
                  <div className="dictamen-chips-row">
                    <span style={{ fontSize: '11px', color: '#64748b', alignSelf: 'center' }}>Atajos sugeridos:</span>
                    {SUGERENCIAS_GANADOR.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="dictamen-chip"
                        onClick={() => handleAplicarSugerenciaGanador(sug)}
                      >
                        {sug.substring(0, 38)}...
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {otrosCompetidores.length > 0 && (
                <div className="dictamen-tab-footer-nav">
                  <button
                    type="button"
                    className="dictamen-btn-next-tab"
                    onClick={() => setActiveTab('no-ganadoras')}
                  >
                    <span>Revisar y comentar No Ganadoras ({otrosCompetidores.length})</span>
                    <GoogleIcon name="arrow_forward" size={16} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OTRAS VENDEDORAS POSTULANTES (DESESTIMACIÓN UNO A UNO) */}
          {activeTab === 'no-ganadoras' && (
            <div className="dictamen-tab-pane">
              <div className="dictamen-competitors-section">
                <div className="dictamen-competitors-header">
                  <h3>
                    <GoogleIcon name="cancel" size={18} color="#dc2626" />
                    <span>Otras Vendedoras Competidoras a Desestimar</span>
                    <span className="dictamen-competitors-count">
                      {otrosCompetidores.length} postulación(es)
                    </span>
                  </h3>
                </div>

                {otrosCompetidores.length === 0 ? (
                  <div
                    style={{
                      padding: '16px',
                      background: '#f8fafc',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '10px',
                      textAlign: 'center',
                      color: '#64748b',
                      fontSize: '13px',
                    }}
                  >
                    No hay otras ejecutivas registradas para este requerimiento. Únicamente postula {nombreGanador}.
                  </div>
                ) : (
                  <>
                    <div className="dictamen-competitors-notice">
                      <GoogleIcon name="info" size={16} color="#d97706" />
                      <span>
                        La regla de negocio estipula que solo una postulación puede ganar la Buena Pro. Indica el <strong>motivo y justificación individual para cada una de las demás vendedoras</strong> (uno por uno):
                      </span>
                    </div>

                    <div className="dictamen-competitors-list">
                      {otrosCompetidores.map((comp, idx) => {
                        const compNombre = comp.creadoPor || `Ejecutiva ${idx + 2}`;
                        const dataComp = desestimaciones[comp.id] || {
                          motivo: MOTIVOS_DESESTIMACION_OPCIONES[0],
                          comentario: '',
                        };
                        const esError = !!erroresCompetidores[comp.id];

                        return (
                          <div key={comp.id} className="dictamen-competitor-item">
                            <div className="dictamen-competitor-top">
                              <div className="dictamen-competitor-info">
                                <span className="dictamen-competitor-rank">
                                  Postulante #{idx + 2}
                                </span>
                                <div className="dictamen-competitor-avatar">
                                  {compNombre.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="dictamen-competitor-name">{compNombre}</div>
                                  <div className="dictamen-competitor-meta">
                                    <span>Llegada: {comp.horaRegistroExacta || comp.createdAt || 'Registrada'}</span>
                                    <span>&bull;</span>
                                    <span>Marcas: {comp.marcas.map((m) => m.nombre).join(', ') || 'N/A'}</span>
                                  </div>
                                </div>
                              </div>

                              <div style={{ fontSize: '12.5px', color: '#b91c1c', fontWeight: 700 }}>
                                Estado resultante: Desestimada
                              </div>
                            </div>

                            {/* Formulario individual: Motivo + Casilla de Comentario */}
                            <div className="dictamen-competitor-form">
                              <div>
                                <label
                                  style={{
                                    display: 'block',
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    color: '#475569',
                                    marginBottom: '4px',
                                  }}
                                >
                                  Motivo general:
                                </label>
                                <select
                                  className="dictamen-select-motivo"
                                  value={dataComp.motivo}
                                  onChange={(e) => handleUpdateCompetidorMotivo(comp.id, e.target.value)}
                                >
                                  {MOTIVOS_DESESTIMACION_OPCIONES.map((opcion, i) => (
                                    <option key={i} value={opcion}>
                                      {opcion}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label
                                  style={{
                                    display: 'block',
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    color: '#1e293b',
                                    marginBottom: '4px',
                                  }}
                                >
                                  Justificación / Comentario específico para {compNombre}: <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <textarea
                                  className={`dictamen-textarea-individual ${esError ? 'is-invalid' : ''}`}
                                  placeholder={`Explica por qué se desestima la postulación de ${compNombre}...`}
                                  value={dataComp.comentario}
                                  onChange={(e) => handleUpdateCompetidorComentario(comp.id, e.target.value)}
                                  rows={2}
                                />
                                {esError && (
                                  <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>
                                    Ingresa la justificación de desestimación para esta vendedora.
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <div className="dictamen-tab-footer-nav" style={{ justifyContent: 'flex-start' }}>
                <button
                  type="button"
                  className="dictamen-btn-prev-tab"
                  onClick={() => setActiveTab('ganadora')}
                >
                  <GoogleIcon name="arrow_back" size={16} />
                  <span>Volver a Vendedora Ganadora</span>
                </button>
              </div>
            </div>
          )}
        </form>

        {/* ── Footer ── */}
        <div className="dictamen-modal-footer">
          <div className="dictamen-modal-footer__left">
            <GoogleIcon name="gavel" size={16} color="#059669" />
            <span>Al confirmar, se actualizará el estado y las justificaciones quedarán registradas.</span>
          </div>

          <div className="dictamen-modal-footer__actions">
            <button
              type="button"
              className="dictamen-btn-cancel"
              onClick={onClose}
              disabled={procesando}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="dictamen-btn-confirm"
              onClick={handleSubmit}
              disabled={procesando}
            >
              <GoogleIcon name="verified" size={17} color="#ffffff" />
              <span>{procesando ? 'Dictaminando...' : 'Confirmar Dictamen de Buena Pro'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DictamenBuenaProModal;
