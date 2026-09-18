import React, { useState, useMemo } from 'react';
import { GoogleIcon } from '../../components/GoogleIcon';
import type { Oportunidad } from '../../types/oportunidades';
import { cambiarEstadoApi } from '../../api/services/oportunidades.service';

interface MisOportunidadesViewProps {
  oportunidades: Oportunidad[];
  userEmail: string;
  roleAccent: string;
  onEdit: (op: Oportunidad) => void;
  onEstadoCambiado: (op: Oportunidad) => void;
}

/** Modal de confirmación personalizado */
const ConfirmModal: React.FC<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, message, confirmLabel, confirmColor = '#dc2626', onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 9999 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: '#ffffff', borderRadius: 16, padding: 0, width: 380, zIndex: 10000,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
      }}>
        <div style={{ padding: '24px 24px 16px', textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: `${confirmColor}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
          }}>
            <GoogleIcon name="warning" size={24} color={confirmColor} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>{title}</h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>{message}</p>
        </div>
        <div style={{ display: 'flex', gap: 0, borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button" onClick={onCancel}
            style={{
              flex: 1, padding: '14px', border: 'none', background: 'transparent',
              color: '#64748b', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
              borderRight: '1px solid #f1f5f9',
            }}
          >
            Cancelar
          </button>
          <button
            type="button" onClick={onConfirm}
            style={{
              flex: 1, padding: '14px', border: 'none', background: confirmColor,
              color: '#ffffff', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
};

const ESTADO_CONFIG: Record<string, { color: string; bg: string; icon: string; next: string | null }> = {
  'En Licitación': { color: '#d97706', bg: '#fef3c7', icon: 'bolt', next: 'Cotizada' },
  'Cotizada':      { color: '#0284c7', bg: '#e0f2fe', icon: 'description', next: 'Adjudicada' },
  'Adjudicada':    { color: '#059669', bg: '#d1fae5', icon: 'verified', next: null },
  'Desestimada':   { color: '#dc2626', bg: '#fee2e2', icon: 'cancel', next: null },
};

const PIPELINE_ORDER = ['En Licitación', 'Cotizada', 'Adjudicada', 'Desestimada'];

export const MisOportunidadesView: React.FC<MisOportunidadesViewProps> = ({
  oportunidades,
  userEmail,
  roleAccent,
  onEdit,
  onEstadoCambiado,
}) => {
  const [cambiandoId, setCambiandoId] = useState<number | string | null>(null);
  const [filtro, setFiltro] = useState<'todos' | 'activas' | 'ganadas' | 'perdidas'>('activas');
  const [vista, setVista] = useState<'pipeline' | 'lista'>('pipeline');
  const [confirmDesestimar, setConfirmDesestimar] = useState<Oportunidad | null>(null);

  const misOportunidades = useMemo(() => {
    return oportunidades.filter((op) => {
      const creator = (op.creadoPor || '').toLowerCase().trim();
      const current = userEmail.toLowerCase().trim();
      return creator === current;
    });
  }, [oportunidades, userEmail]);

  const oportunidadesFiltradas = useMemo(() => {
    switch (filtro) {
      case 'activas':
        return misOportunidades.filter((op) => op.estado !== 'Desestimada' && op.estado !== 'Adjudicada');
      case 'ganadas':
        return misOportunidades.filter((op) => op.estado === 'Adjudicada');
      case 'perdidas':
        return misOportunidades.filter((op) => op.estado === 'Desestimada');
      default:
        return misOportunidades;
    }
  }, [misOportunidades, filtro]);

  const pipeline = useMemo(() => {
    const cols: Record<string, Oportunidad[]> = {
      'En Licitación': [],
      'Cotizada': [],
      'Adjudicada': [],
      'Desestimada': [],
    };
    misOportunidades.forEach((op) => {
      if (cols[op.estado]) cols[op.estado].push(op);
    });
    return cols;
  }, [misOportunidades]);

  const kpis = useMemo(() => ({
    total: misOportunidades.length,
    activas: misOportunidades.filter((op) => op.estado === 'En Licitación').length,
    cotizadas: misOportunidades.filter((op) => op.estado === 'Cotizada').length,
    adjudicadas: misOportunidades.filter((op) => op.estado === 'Adjudicada').length,
    montoTotal: misOportunidades.reduce((sum, op) => sum + (Number(op.limiteTotal) || 0), 0),
  }), [misOportunidades]);

  const handleCambiarEstado = async (op: Oportunidad, nuevoEstado: string) => {
    setCambiandoId(op.id);
    try {
      const actualizada = await cambiarEstadoApi(op.id, nuevoEstado);
      onEstadoCambiado({ ...op, estado: actualizada.estado as Oportunidad['estado'] });
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado');
    } finally {
      setCambiandoId(null);
    }
  };

  const nombreEjecutiva = userEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: `${roleAccent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GoogleIcon name="person" size={20} color={roleAccent} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Mis Oportunidades
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              {nombreEjecutiva} · Pipeline de licitaciones
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total', value: kpis.total, color: '#0f172a', bg: '#f8fafc' },
          { label: 'Activas', value: kpis.activas, color: '#d97706', bg: '#fef3c7' },
          { label: 'Cotizadas', value: kpis.cotizadas, color: '#0284c7', bg: '#e0f2fe' },
          { label: 'Adjudicadas', value: kpis.adjudicadas, color: '#059669', bg: '#d1fae5' },
          { label: 'Monto Total', value: `S/ ${kpis.montoTotal.toLocaleString('es-PE')}`, color: '#0f172a', bg: '#f8fafc', wide: true },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: kpi.bg,
              borderRadius: 12,
              padding: '14px 16px',
              border: '1px solid #f1f5f9',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: kpi.color, marginTop: 4 }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar: Filtros (solo en modo lista) + Vista */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 20, gap: 12 }}>
        {vista === 'lista' && (
          <div style={{ display: 'flex', gap: 6, marginRight: 'auto' }}>
            {[
              { id: 'activas', label: 'Activas', count: kpis.activas + kpis.cotizadas },
              { id: 'todos', label: 'Todas', count: kpis.total },
              { id: 'ganadas', label: 'Ganadas', count: kpis.adjudicadas },
              { id: 'perdidas', label: 'Perdidas', count: misOportunidades.filter(op => op.estado === 'Desestimada').length },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id as any)}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: filtro === f.id ? `1.5px solid ${roleAccent}` : '1.5px solid #e2e8f0',
                background: filtro === f.id ? `${roleAccent}10` : '#ffffff',
                color: filtro === f.id ? roleAccent : '#64748b',
                fontWeight: filtro === f.id ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {f.label}
              <span style={{
                background: filtro === f.id ? `${roleAccent}20` : '#f1f5f9',
                borderRadius: 6,
                padding: '1px 6px',
                fontSize: '11px',
                fontWeight: 700,
              }}>
                {f.count}
              </span>
            </button>
          ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 4, background: '#f8fafc', borderRadius: 8, padding: 3 }}>
          {[
            { id: 'pipeline', icon: 'view_kanban' },
            { id: 'lista', icon: 'view_list' },
          ].map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVista(v.id as any)}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: 'none',
                background: vista === v.id ? '#ffffff' : 'transparent',
                color: vista === v.id ? '#0f172a' : '#94a3b8',
                cursor: 'pointer',
                boxShadow: vista === v.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <GoogleIcon name={v.icon} size={16} />
            </button>
          ))}
        </div>
      </div>

      {/* Vista Pipeline */}
      {vista === 'pipeline' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, alignItems: 'start' }}>
          {PIPELINE_ORDER.map((estado) => {
            const cfg = ESTADO_CONFIG[estado];
            const ops = pipeline[estado];
            return (
              <div key={estado}>
                {/* Column Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  background: cfg.bg,
                  borderRadius: '10px 10px 0 0',
                  borderBottom: `2px solid ${cfg.color}30`,
                }}>
                  <GoogleIcon name={cfg.icon} size={16} color={cfg.color} />
                  <span style={{ fontWeight: 700, fontSize: '13px', color: cfg.color }}>
                    {estado}
                  </span>
                  <span style={{
                    marginLeft: 'auto',
                    background: `${cfg.color}20`,
                    color: cfg.color,
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}>
                    {ops.length}
                  </span>
                </div>

                {/* Cards */}
                <div style={{
                  background: '#fafafa',
                  border: '1px solid #f1f5f9',
                  borderTop: 'none',
                  borderRadius: '0 0 10px 10px',
                  padding: 8,
                  minHeight: 120,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  {ops.length === 0 ? (
                    <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                      Sin oportunidades
                    </div>
                  ) : (
                    ops.map((op) => (
                      <OpCard
                        key={op.id}
                        op={op}
                        accent={roleAccent}
                        changing={cambiandoId === op.id}
                        onChangeEstado={handleCambiarEstado}
                        onConfirmDesestimar={setConfirmDesestimar}
                        onEdit={onEdit}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Vista Lista */}
      {vista === 'lista' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Requerimiento</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Empresa</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Monto</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Estado</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {oportunidadesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    No hay oportunidades para mostrar
                  </td>
                </tr>
              ) : (
                oportunidadesFiltradas.map((op) => {
                  const cfg = ESTADO_CONFIG[op.estado] ?? { color: '#64748b', bg: '#f1f5f9', icon: 'circle', next: null };
                  return (
                    <tr key={op.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                          {op.numeroRequerimiento}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b' }}>
                        {op.empresaRazonSocial || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                        S/ {(Number(op.limiteTotal) || 0).toLocaleString('es-PE')}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '4px 10px',
                          borderRadius: 20,
                          background: cfg.bg,
                          color: cfg.color,
                          fontSize: '12px',
                          fontWeight: 700,
                        }}>
                          <GoogleIcon name={cfg.icon} size={12} color={cfg.color} />
                          {op.estado}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          {cfg.next && (
                            <button
                              type="button"
                              disabled={cambiandoId === op.id}
                              onClick={() => handleCambiarEstado(op, cfg.next!)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: 6,
                                border: `1px solid ${ESTADO_CONFIG[cfg.next!].color}40`,
                                background: ESTADO_CONFIG[cfg.next!].bg,
                                color: ESTADO_CONFIG[cfg.next!].color,
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: cambiandoId === op.id ? 'not-allowed' : 'pointer',
                              }}
                            >
                              → {cfg.next}
                            </button>
                          )}
                          {op.estado !== 'Desestimada' && op.estado !== 'Adjudicada' && (
                            <button
                              type="button"
                              disabled={cambiandoId === op.id}
                              onClick={() => setConfirmDesestimar(op)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: 6,
                                border: '1px solid #fecaca',
                                background: '#fef2f2',
                                color: '#dc2626',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: cambiandoId === op.id ? 'not-allowed' : 'pointer',
                              }}
                            >
                              ✕
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onEdit(op)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 6,
                              border: '1px solid #e2e8f0',
                              background: '#f8fafc',
                              color: '#64748b',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de confirmación para Desestimar */}
      <ConfirmModal
        open={confirmDesestimar !== null}
        title="Marcar como Desestimada"
        message={`¿Estás seguro de marcar "${confirmDesestimar?.numeroRequerimiento}" como Desestimada? Esta acción no se puede deshacer.`}
        confirmLabel="Sí, Desestimar"
        onConfirm={() => {
          if (confirmDesestimar) {
            handleCambiarEstado(confirmDesestimar, 'Desestimada');
            setConfirmDesestimar(null);
          }
        }}
        onCancel={() => setConfirmDesestimar(null)}
      />
    </div>
  );
};

/* ── Card del Pipeline ── */
const OpCard: React.FC<{
  op: Oportunidad;
  accent: string;
  changing: boolean;
  onChangeEstado: (op: Oportunidad, estado: string) => void;
  onConfirmDesestimar: (op: Oportunidad) => void;
  onEdit: (op: Oportunidad) => void;
}> = ({ op, accent, changing, onChangeEstado, onConfirmDesestimar, onEdit }) => {
  const cfg = ESTADO_CONFIG[op.estado] ?? { color: '#64748b', bg: '#f1f5f9', icon: 'circle', next: null };
  const vencimiento = new Date(op.fechaVencimiento);
  const hoy = new Date();
  const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  const vencido = diasRestantes < 0;

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 8,
        padding: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)')}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>
          {op.numeroRequerimiento}
        </span>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: vencido ? '#dc2626' : diasRestantes <= 3 ? '#d97706' : '#059669',
        }}>
          {vencido ? `Vencida hace ${Math.abs(diasRestantes)}d` : `${diasRestantes}d para vencer`}
        </span>
      </div>

      {/* Empresa */}
      {op.empresaRazonSocial && (
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: 6 }}>
          {op.empresaRazonSocial}
        </div>
      )}

      {/* Monto */}
      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
        S/ {(Number(op.limiteTotal) || 0).toLocaleString('es-PE')}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        {cfg.next && (
          <button
            type="button"
            disabled={changing}
            onClick={() => onChangeEstado(op, cfg.next!)}
            style={{
              flex: 1,
              padding: '7px 10px',
              borderRadius: 6,
              border: 'none',
              background: accent,
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: changing ? 'not-allowed' : 'pointer',
              opacity: changing ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <GoogleIcon name="arrow_forward" size={13} color="#ffffff" />
            {changing ? '...' : cfg.next}
          </button>
        )}
        {op.estado !== 'Desestimada' && op.estado !== 'Adjudicada' && (
          <button
            type="button"
            disabled={changing}
            onClick={() => onConfirmDesestimar(op)}
            style={{
              padding: '7px 10px',
              borderRadius: 6,
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#dc2626',
              fontSize: '12px',
              fontWeight: 600,
              cursor: changing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Marcar como Desestimada"
          >
            <GoogleIcon name="close" size={13} color="#dc2626" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onEdit(op)}
          style={{
            padding: '7px 10px',
            borderRadius: 6,
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            color: '#64748b',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <GoogleIcon name="edit" size={13} />
        </button>
      </div>
    </div>
  );
};
