import React, { useState, useMemo } from 'react';
import { GoogleIcon } from '../../components/GoogleIcon';
import { useAuth } from '../../context/AuthContext';
import { isOportunidadOwner } from '../../utils/oportunidadUtils';
import type { Oportunidad } from '../../types/oportunidades';
import { cambiarEstadoApi } from '../../api/services/oportunidades.service';

interface MisOportunidadesViewProps {
  oportunidades: Oportunidad[];
  userEmail: string;
  roleAccent?: string;
  onEdit: (op: Oportunidad) => void;
  onEstadoCambiado: (op: Oportunidad) => void;
}

/** Modal de confirmación con estilo corporativo plano */
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
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(3px)',
          zIndex: 9999,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#ffffff',
          borderRadius: 4,
          padding: 0,
          width: 400,
          maxWidth: '92vw',
          zIndex: 10000,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '24px 24px 18px', textAlign: 'center' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 4,
              background: `${confirmColor}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
            }}
          >
            <GoogleIcon name="warning" size={24} color={confirmColor} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>{title}</h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>{message}</p>
        </div>
        <div style={{ display: 'flex', gap: 0, borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '13px',
              border: 'none',
              background: 'transparent',
              color: '#475569',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              borderRight: '1px solid #e2e8f0',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '13px',
              border: 'none',
              background: confirmColor,
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
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
  'Cotizada':      { color: '#2563eb', bg: '#eff6ff', icon: 'description', next: 'Adjudicada' },
  'Adjudicada':    { color: '#059669', bg: '#ecfdf5', icon: 'verified', next: null },
  'Desestimada':   { color: '#dc2626', bg: '#fee2e2', icon: 'cancel', next: null },
  'OC_RECIBIDA':   { color: '#2563eb', bg: '#eff6ff', icon: 'receipt_long', next: null },
  'OC_ACEPTADA':   { color: '#059669', bg: '#ecfdf5', icon: 'thumb_up', next: null },
  'OC_RECHAZADA':  { color: '#dc2626', bg: '#fee2e2', icon: 'thumb_down', next: null },
  'ENTREGADA':     { color: '#7c3aed', bg: '#f5f3ff', icon: 'inventory', next: null },
};

const PIPELINE_ORDER = ['En Licitación', 'Cotizada', 'Adjudicada', 'Desestimada'];

const OC_STATES = ['OC_RECIBIDA', 'OC_ACEPTADA', 'OC_RECHAZADA', 'ENTREGADA'] as const;
const OC_ACTIVAS = ['OC_RECIBIDA', 'OC_ACEPTADA'] as const;
const ACTIVAS_STATES = ['En Licitación', 'Por Vencer', 'Cotizada'] as const;
const GANADAS_STATES = ['Adjudicada', 'OC_RECIBIDA', 'OC_ACEPTADA', 'ENTREGADA'] as const;
const PERDIDAS_STATES = ['Desestimada', 'OC_RECHAZADA'] as const;

/** Cálculo seguro de estado de vencimiento para evitar NaN */
function formatVencimientoSafe(dateStr?: string | null) {
  if (!dateStr || !dateStr.trim()) {
    return { text: 'Sin fecha límite', color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' };
  }
  const vencimiento = new Date(dateStr);
  if (isNaN(vencimiento.getTime())) {
    return { text: 'Sin fecha límite', color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' };
  }
  const hoy = new Date();
  const diffMs = vencimiento.getTime() - hoy.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    const diasVencido = Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    return {
      text: diasVencido === 0 ? 'Venció hoy' : `Vencida hace ${diasVencido}d`,
      color: '#dc2626',
      bg: '#fee2e2',
      border: '#fca5a5',
    };
  }
  if (diffHours < 24) {
    return {
      text: `Vence hoy (${Math.max(1, diffHours)}h)`,
      color: '#d97706',
      bg: '#fef3c7',
      border: '#fcd34d',
    };
  }
  if (diasRestantes <= 3) {
    return {
      text: `${diasRestantes}d para vencer`,
      color: '#d97706',
      bg: '#fef3c7',
      border: '#fcd34d',
    };
  }
  return {
    text: `${diasRestantes}d para vencer`,
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
  };
}

export const MisOportunidadesView: React.FC<MisOportunidadesViewProps> = ({
  oportunidades,
  userEmail,
  roleAccent = '#2563eb',
  onEdit,
  onEstadoCambiado,
}) => {
  const { empleado } = useAuth();
  const [cambiandoId, setCambiandoId] = useState<number | string | null>(null);
  const [filtro, setFiltro] = useState<'todos' | 'activas' | 'ganadas' | 'perdidas'>('activas');
  const [vista, setVista] = useState<'pipeline' | 'lista' | 'oc'>('pipeline');
  const [confirmDesestimar, setConfirmDesestimar] = useState<Oportunidad | null>(null);

  const misOportunidades = useMemo(() => {
    return oportunidades.filter((op) => isOportunidadOwner(op, empleado, userEmail));
  }, [oportunidades, userEmail, empleado]);

  const conOC = useMemo(
    () => misOportunidades.filter((op) => OC_STATES.includes((op.estado as string) as any) || op.ordenCompra),
    [misOportunidades]
  );

  const ocPendientes = useMemo(
    () => conOC.filter((op) => OC_ACTIVAS.includes((op.estado as string) as any)),
    [conOC]
  );

  const oportunidadesActivas = useMemo(
    () => misOportunidades.filter((op) => (ACTIVAS_STATES as readonly string[]).includes(op.estado)),
    [misOportunidades]
  );

  const oportunidadesGanadas = useMemo(
    () => misOportunidades.filter((op) => (GANADAS_STATES as readonly string[]).includes(op.estado)),
    [misOportunidades]
  );

  const oportunidadesPerdidas = useMemo(
    () => misOportunidades.filter((op) => (PERDIDAS_STATES as readonly string[]).includes(op.estado)),
    [misOportunidades]
  );

  const oportunidadesFiltradas = useMemo(() => {
    switch (filtro) {
      case 'activas':
        return oportunidadesActivas;
      case 'ganadas':
        return oportunidadesGanadas;
      case 'perdidas':
        return oportunidadesPerdidas;
      default:
        return misOportunidades;
    }
  }, [misOportunidades, oportunidadesActivas, oportunidadesGanadas, oportunidadesPerdidas, filtro]);

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
    adjudicadas: misOportunidades.filter((op) => op.estado === 'Adjudicada').length,
    ocPendientes: ocPendientes.length,
    montoTotal: misOportunidades.reduce((sum, op) => sum + (Number(op.limiteTotal) || 0), 0),
  }), [misOportunidades, ocPendientes]);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Encabezado Estilo Registro (Tarjeta limpia con bordes corporativos) ── */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 4,
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 4,
              background: `${roleAccent}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <GoogleIcon name="account_circle" size={26} color={roleAccent} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Mis Oportunidades
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: `${roleAccent}12`,
                  color: roleAccent,
                  border: `1px solid ${roleAccent}30`,
                }}
              >
                Pipeline Personal
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0' }}>
              {nombreEjecutiva} &bull; Mis licitaciones, estado comercial y órdenes de compra
            </p>
          </div>
        </div>

        {/* Selector de Vistas Estilo Registro */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: '#f8fafc',
            padding: 4,
            borderRadius: 4,
            border: '1px solid #e2e8f0',
          }}
        >
          {[
            { id: 'pipeline', label: 'Tablero', icon: 'view_kanban' },
            { id: 'lista', label: 'Lista', icon: 'view_list' },
            { id: 'oc', label: 'Órdenes OC', icon: 'local_shipping' },
          ].map((v) => {
            const isActive = vista === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setVista(v.id as any)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 4,
                  border: 'none',
                  background: isActive ? roleAccent : 'transparent',
                  color: isActive ? '#ffffff' : '#64748b',
                  fontSize: '12.5px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <GoogleIcon name={v.icon} size={15} color={isActive ? '#ffffff' : '#64748b'} />
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── KPIs Métricos con diseño plano del Registro (Blanco, bordes 4px, iconos limpios) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        {[
          { label: 'Total Registradas', value: kpis.total, icon: 'folder_shared', color: '#0f172a', iconColor: roleAccent, iconBg: `${roleAccent}15` },
          { label: 'Activas', value: oportunidadesActivas.length, icon: 'bolt', color: '#d97706', iconColor: '#d97706', iconBg: '#fef3c7' },
          { label: 'Adjudicadas', value: kpis.adjudicadas, icon: 'verified', color: '#059669', iconColor: '#059669', iconBg: '#ecfdf5' },
          { label: 'OC Activas', value: kpis.ocPendientes, icon: 'local_shipping', color: '#7c3aed', iconColor: '#7c3aed', iconBg: '#f5f3ff' },
          { label: 'Monto Acumulado', value: `S/ ${kpis.montoTotal.toLocaleString('es-PE')}`, icon: 'payments', color: '#0f172a', iconColor: '#0f172a', iconBg: '#f1f5f9' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: '#ffffff',
              borderRadius: 4,
              padding: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 4,
                background: kpi.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <GoogleIcon name={kpi.icon} size={20} color={kpi.iconColor} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {kpi.label}
              </div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: kpi.color,
                  marginTop: 2,
                  lineHeight: 1.1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {kpi.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar: Filtros (solo en modo lista) ── */}
      {vista === 'lista' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { id: 'activas', label: 'Activas', count: oportunidadesActivas.length },
            { id: 'todos', label: 'Todas', count: kpis.total },
            { id: 'ganadas', label: 'Ganadas', count: oportunidadesGanadas.length },
            { id: 'perdidas', label: 'Desestimadas', count: oportunidadesPerdidas.length },
          ].map((f) => {
            const isFiltroActive = filtro === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltro(f.id as any)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 4,
                  border: isFiltroActive ? `1px solid ${roleAccent}` : '1px solid #e2e8f0',
                  background: isFiltroActive ? roleAccent : '#ffffff',
                  color: isFiltroActive ? '#ffffff' : '#64748b',
                  fontWeight: isFiltroActive ? 700 : 500,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                }}
              >
                <span>{f.label}</span>
                <span
                  style={{
                    background: isFiltroActive ? 'rgba(255, 255, 255, 0.25)' : '#f1f5f9',
                    color: isFiltroActive ? '#ffffff' : '#475569',
                    borderRadius: 4,
                    padding: '1px 6px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Vista Pipeline (Tablero Kanban Corporativo) ── */}
      {vista === 'pipeline' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, alignItems: 'start' }}>
          {PIPELINE_ORDER.map((estado) => {
            const cfg = ESTADO_CONFIG[estado];
            const ops = pipeline[estado];
            return (
              <div
                key={estado}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 4,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  overflow: 'hidden',
                }}
              >
                {/* Cabecera de Columna */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: '#f8fafc',
                    borderBottom: `2px solid ${cfg.color}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 4,
                        background: cfg.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <GoogleIcon name={cfg.icon} size={15} color={cfg.color} />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>
                      {estado}
                    </span>
                  </div>
                  <span
                    style={{
                      background: cfg.bg,
                      color: cfg.color,
                      border: `1px solid ${cfg.color}30`,
                      borderRadius: 4,
                      padding: '2px 8px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                    }}
                  >
                    {ops.length}
                  </span>
                </div>

                {/* Lista de Tarjetas */}
                <div
                  style={{
                    background: '#f8fafc',
                    padding: 10,
                    minHeight: 240,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  {ops.length === 0 ? (
                    <div
                      style={{
                        padding: '36px 12px',
                        textAlign: 'center',
                        color: '#94a3b8',
                        fontSize: '12.5px',
                        background: '#ffffff',
                        border: '1px dashed #cbd5e1',
                        borderRadius: 4,
                      }}
                    >
                      Sin oportunidades en este estado
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

      {/* ── Vista Lista (Tabla Corporativa Limpia) ── */}
      {vista === 'lista' && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 4,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Requerimiento</th>
                <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Entidad Solicitante</th>
                <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right' }}>Monto Límite</th>
                <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'center' }}>Vencimiento</th>
                <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'center' }}>Estado</th>
                <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {oportunidadesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    No hay oportunidades que coincidan con el filtro seleccionado.
                  </td>
                </tr>
              ) : (
                oportunidadesFiltradas.map((op) => {
                  const cfg = ESTADO_CONFIG[op.estado] ?? { color: '#64748b', bg: '#f1f5f9', icon: 'circle', next: null };
                  const vInfo = formatVencimientoSafe(op.fechaVencimiento);
                  return (
                    <tr
                      key={op.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>
                          {op.numeroRequerimiento}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '13px', color: '#475569' }}>
                        {op.empresaRazonSocial || '—'}
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>
                        S/ {(Number(op.limiteTotal) || 0).toLocaleString('es-PE')}
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 4,
                            background: vInfo.bg,
                            color: vInfo.color,
                            border: `1px solid ${vInfo.border}`,
                          }}
                        >
                          {vInfo.text}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 10px',
                            borderRadius: 4,
                            background: cfg.bg,
                            color: cfg.color,
                            border: `1px solid ${cfg.color}30`,
                            fontSize: '11.5px',
                            fontWeight: 700,
                          }}
                        >
                          <GoogleIcon name={cfg.icon} size={13} color={cfg.color} />
                          {op.estado}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          {cfg.next && (
                            <button
                              type="button"
                              disabled={cambiandoId === op.id}
                              onClick={() => handleCambiarEstado(op, cfg.next!)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 4,
                                border: 'none',
                                background: roleAccent,
                                color: '#ffffff',
                                fontSize: '11.5px',
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
                                padding: '6px 8px',
                                borderRadius: 4,
                                border: '1px solid #fecaca',
                                background: '#fee2e2',
                                color: '#dc2626',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: cambiandoId === op.id ? 'not-allowed' : 'pointer',
                              }}
                              title="Marcar como Desestimada"
                            >
                              ✕
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onEdit(op)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 4,
                              border: '1px solid #e2e8f0',
                              background: '#f8fafc',
                              color: '#475569',
                              fontSize: '11.5px',
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

      {/* ── Vista OC / Seguimiento de Órdenes de Compra ── */}
      {vista === 'oc' && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 4,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Requerimiento</th>
                <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>N° Orden Compra</th>
                <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Estado OC</th>
                <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right' }}>Monto Licitado</th>
                <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right' }}>Margen Adicional</th>
                <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {conOC.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    Aún no hay Órdenes de Compra en seguimiento para tus licitaciones.
                  </td>
                </tr>
              ) : (
                conOC.map((op) => {
                  const oc = op.ordenCompra;
                  const cfg = ESTADO_CONFIG[op.estado] ?? { color: '#64748b', bg: '#f1f5f9', icon: 'circle', next: null };
                  const esPendiente = oc?.estadoOC === 'OC_RECIBIDA';
                  return (
                    <tr
                      key={op.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>{op.numeroRequerimiento}</span>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ fontSize: '13px', color: '#334155', fontWeight: 700, fontFamily: 'monospace' }}>
                          {oc?.numeroOC || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 10px',
                            borderRadius: 4,
                            background: cfg.bg,
                            color: cfg.color,
                            border: `1px solid ${cfg.color}30`,
                            fontSize: '11.5px',
                            fontWeight: 700,
                          }}
                        >
                          <GoogleIcon name={cfg.icon} size={12} color={cfg.color} />
                          {op.estado}
                        </span>
                        {oc?.estadoOC === 'OC_RECHAZADA' && oc.motivoRechazo && (
                          <div style={{ fontSize: '11px', color: '#dc2626', marginTop: 4, maxWidth: 200 }}>
                            {oc.motivoRechazo}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>
                        S/ {(Number(op.limiteTotal) || 0).toLocaleString('es-PE')}
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: 800, fontSize: '13px', color: '#059669' }}>
                        {oc?.margenAdicional != null ? `S/ ${oc.margenAdicional.toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                          <button
                            type="button"
                            onClick={() => onEdit(op)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 4,
                              border: '1px solid #c4b5fd',
                              background: '#ede9fe',
                              color: '#6d28d9',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Ver operación
                          </button>
                          {esPendiente && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '11.5px', color: '#2563eb', fontWeight: 600 }}>
                              <GoogleIcon name="admin_panel_settings" size={14} color="#2563eb" />
                              Decisión del Admin/Master
                            </span>
                          )}
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
        message={`¿Estás seguro de marcar "${confirmDesestimar?.numeroRequerimiento}" como Desestimada? Esta acción moverá la licitación al estado Desestimada.`}
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

/* ── Card del Pipeline (Diseño Corporativo Estilo Registro) ── */
const OpCard: React.FC<{
  op: Oportunidad;
  accent: string;
  changing: boolean;
  onChangeEstado: (op: Oportunidad, estado: string) => void;
  onConfirmDesestimar: (op: Oportunidad) => void;
  onEdit: (op: Oportunidad) => void;
}> = ({ op, accent, changing, onChangeEstado, onConfirmDesestimar, onEdit }) => {
  const cfg = ESTADO_CONFIG[op.estado] ?? { color: '#64748b', bg: '#f1f5f9', icon: 'circle', next: null };
  const vInfo = formatVencimientoSafe(op.fechaVencimiento);

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 4,
        padding: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accent;
        e.currentTarget.style.boxShadow = `0 4px 12px ${accent}15`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e2e8f0';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)';
      }}
    >
      {/* Fila Superior: Código Requerimiento y Estado Vencimiento */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a', letterSpacing: '-0.2px' }}>
          {op.numeroRequerimiento}
        </span>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: 4,
            background: vInfo.bg,
            color: vInfo.color,
            border: `1px solid ${vInfo.border}`,
            whiteSpace: 'nowrap',
          }}
        >
          {vInfo.text}
        </span>
      </div>

      {/* Razón Social Entidad */}
      {op.empresaRazonSocial ? (
        <div
          style={{
            fontSize: '12px',
            color: '#475569',
            fontWeight: 500,
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {op.empresaRazonSocial}
        </div>
      ) : (
        <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
          Sin entidad asignada
        </div>
      )}

      {/* Monto Límite */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          paddingTop: 6,
          borderTop: '1px dashed #e2e8f0',
        }}
      >
        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
          Límite Total:
        </span>
        <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
          S/ {(Number(op.limiteTotal) || 0).toLocaleString('es-PE')}
        </span>
      </div>

      {/* Acciones de la Tarjeta */}
      <div style={{ display: 'flex', gap: 6, paddingTop: 4 }}>
        {cfg.next && (
          <button
            type="button"
            disabled={changing}
            onClick={() => onChangeEstado(op, cfg.next!)}
            style={{
              flex: 1,
              padding: '7px 10px',
              borderRadius: 4,
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
              transition: 'opacity 0.15s ease',
            }}
          >
            <GoogleIcon name="arrow_forward" size={13} color="#ffffff" />
            <span>{changing ? '...' : cfg.next}</span>
          </button>
        )}
        {op.estado !== 'Desestimada' && op.estado !== 'Adjudicada' && (
          <button
            type="button"
            disabled={changing}
            onClick={() => onConfirmDesestimar(op)}
            style={{
              padding: '7px 10px',
              borderRadius: 4,
              border: '1px solid #fecaca',
              background: '#fee2e2',
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
            borderRadius: 4,
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            color: '#475569',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Editar licitación"
        >
          <GoogleIcon name="edit" size={13} color="#475569" />
        </button>
      </div>
    </div>
  );
};
