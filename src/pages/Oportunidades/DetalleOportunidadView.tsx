import React from 'react';
import { GoogleIcon } from '../../components/GoogleIcon';
import type { Oportunidad, ProductoItem } from '../../types/oportunidades';

interface DetalleOportunidadViewProps {
  oportunidad: Oportunidad;
  roleAccent: string;
  onClose: () => void;
  onEdit: (op: Oportunidad) => void;
  onSubirEvidencia: (opId: string | number) => void;
  getVencimientoBadge: (fechaIso: string) => { label: string; color: string; bg: string } | null;
}

const ESTADO_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  'En Licitación': { color: '#d97706', bg: '#fef3c7', icon: 'bolt' },
  'Por Vencer':    { color: '#dc2626', bg: '#fee2e2', icon: 'timer' },
  'Cotizada':      { color: '#0284c7', bg: '#e0f2fe', icon: 'description' },
  'Adjudicada':    { color: '#059669', bg: '#d1fae5', icon: 'verified' },
};

export const DetalleOportunidadView: React.FC<DetalleOportunidadViewProps> = ({
  oportunidad: op,
  roleAccent,
  onClose,
  onEdit,
  onSubirEvidencia,
  getVencimientoBadge,
}) => {
  const vBadge = getVencimientoBadge(op.fechaVencimiento);
  const estadoCfg = ESTADO_CONFIG[op.estado] ?? { color: '#64748b', bg: '#f1f5f9', icon: 'circle' };
  const totalLimite = op.items.reduce(
    (acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.limiteUnitario) || 0),
    0,
  );

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(6px)',
          zIndex: 9998,
          animation: 'detFadeIn 0.2s ease',
        }}
      />

      {/* Full Screen Panel */}
      <div
        className="det-fullscreen"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100dvh',
          background: '#f8fafc', // Softer background for full screen
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          animation: 'detFadeIn 0.25s ease',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 32px',
            borderBottom: '1px solid #e2e8f0',
            background: `linear-gradient(135deg, ${roleAccent}10 0%, #ffffff 100%)`,
            position: 'sticky',
            top: 0,
            zIndex: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: `${roleAccent}18`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <GoogleIcon name="assignment" size={22} color={roleAccent} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                    {op.numeroRequerimiento}
                  </h2>
                  {op.prioridadGanada && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        background: '#dcfce7',
                        color: '#15803d',
                        padding: '2px 8px',
                        borderRadius: 20,
                        border: '1px solid #bbf7d0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <GoogleIcon name="verified" size={11} color="#15803d" />
                      Prioridad 1°
                    </span>
                  )}
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                  {op.acuerdoMarco.codigo} · {op.acuerdoMarco.descripcion}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                width: 34,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              title="Cerrar"
            >
              <GoogleIcon name="close" size={18} color="#64748b" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', maxWidth: 1200, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Estado y Vencimiento */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: estadoCfg.bg,
                color: estadoCfg.color,
                fontWeight: 700,
                fontSize: '12.5px',
                padding: '5px 12px',
                borderRadius: 20,
              }}
            >
              <GoogleIcon name={estadoCfg.icon} size={14} color={estadoCfg.color} />
              {op.estado}
            </span>
            {vBadge && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: vBadge.bg,
                  color: vBadge.color,
                  fontWeight: 700,
                  fontSize: '12.5px',
                  padding: '5px 12px',
                  borderRadius: 20,
                }}
              >
                <GoogleIcon name="schedule" size={14} color={vBadge.color} />
                {vBadge.label}
              </span>
            )}
          </div>

          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Límite Total', value: `S/ ${Number(op.limiteTotal || totalLimite).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, icon: 'payments', color: '#0284c7', bg: '#e0f2fe' },
              { label: 'Productos', value: `${op.items.length} ítem${op.items.length !== 1 ? 's' : ''}`, icon: 'inventory_2', color: '#7c3aed', bg: '#ede9fe' },
              { label: 'Marcas', value: `${op.marcas.length} marca${op.marcas.length !== 1 ? 's' : ''}`, icon: 'local_offer', color: '#d97706', bg: '#fef3c7' },
            ].map((kpi) => (
              <div key={kpi.label} style={{ background: '#f8fafc', border: '1.5px solid #f1f5f9', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                  <GoogleIcon name={kpi.icon} size={16} color={kpi.color} />
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>{kpi.label}</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Convocatoria */}
          <Section title="Convocatoria Perú Compras" icon="feed" accent={roleAccent}>
            <FieldRow label="N° Requerimiento" value={op.numeroRequerimiento} mono />
            <FieldRow label="Acuerdo Marco" value={`${op.acuerdoMarco.codigo} — ${op.acuerdoMarco.descripcion}`} />
            <FieldRow
              label="Fecha de Vencimiento"
              value={op.fechaVencimiento ? new Date(op.fechaVencimiento).toLocaleString('es-PE', { dateStyle: 'full', timeStyle: 'short' }) : '—'}
            />
          </Section>

          {/* Empresa */}
          <Section title="Empresa / Entidad Solicitante" icon="business" accent={roleAccent}>
            {op.empresaRazonSocial ? (
              <>
                <FieldRow label="Razón Social" value={op.empresaRazonSocial} />
                <FieldRow label="RUC" value={op.empresaRuc || '—'} mono />
              </>
            ) : op.entidadConvocante ? (
              <FieldRow label="Entidad Convocante" value={op.entidadConvocante} />
            ) : (
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>Sin empresa asociada (Registro Exprés)</p>
            )}
          </Section>

          {/* Marcas */}
          <Section title="Marcas Participantes" icon="local_offer" accent={roleAccent}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {op.marcas.map((m) => (
                <span
                  key={m.id}
                  style={{ background: `${roleAccent}14`, color: roleAccent, border: `1px solid ${roleAccent}30`, borderRadius: 20, padding: '4px 12px', fontSize: '12.5px', fontWeight: 600 }}
                >
                  {m.nombre}
                </span>
              ))}
              {op.marcas.length === 0 && <span style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>Sin marcas</span>}
            </div>
          </Section>

          {/* Productos */}
          <Section title={`Productos / Ítems (${op.items.length})`} icon="inventory_2" accent={roleAccent}>
            <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #f1f5f9' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['#', 'N° Parte', 'Descripción', 'Cant.', 'Límite Unit.', 'Subtotal'].map((h) => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: ['Cant.', 'Límite Unit.', 'Subtotal'].includes(h) ? 'right' : 'left', color: '#64748b', fontWeight: 600, fontSize: '11.5px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {op.items.map((it: ProductoItem, idx: number) => {
                    const sub = (it.cantidad || 0) * (it.limiteUnitario || 0);
                    return (
                      <tr key={it.id} style={{ borderBottom: idx < op.items.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                        <td style={{ padding: '8px 10px', color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>
                          <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 4, fontSize: '11px' }}>{it.numeroParte || '—'}</code>
                        </td>
                        <td style={{ padding: '8px 10px', color: '#334155', maxWidth: 160, wordBreak: 'break-word' }}>{it.descripcion || '—'}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{it.cantidad}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b' }}>S/ {Number(it.limiteUnitario).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0284c7' }}>S/ {sub.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f8fafc' }}>
                    <td colSpan={4} style={{ padding: '8px 10px' }} />
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>Total Límite:</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                      S/ {totalLimite.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Section>

          {/* Auditoría */}
          <Section title="Auditoría y Trazabilidad" icon="history" accent={roleAccent}>
            <FieldRow label="Registrado por" value={op.creadoPor} />
            <FieldRow label="Fecha de Registro" value={op.createdAt} />
            {op.horaRegistroExacta && <FieldRow label="Hora exacta de captura" value={op.horaRegistroExacta} accent="#059669" />}
            {op.updatedAt && <FieldRow label="Última actualización" value={op.updatedAt} />}
          </Section>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '20px 32px',
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
            position: 'sticky',
            bottom: 0,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.03)',
            zIndex: 10,
          }}
        >
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '10px 18px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => { onSubirEvidencia(op.id); onClose(); }}
            style={{ padding: '10px 18px', borderRadius: 8, border: '1.5px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#059669', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <GoogleIcon name="upload_file" size={15} color="#059669" />
            Subir Evidencia
          </button>
          <button
            type="button"
            onClick={() => { onEdit(op); onClose(); }}
            style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: roleAccent, color: '#ffffff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: `0 4px 14px ${roleAccent}40` }}
          >
            <GoogleIcon name="edit" size={15} color="#ffffff" />
            Editar Oportunidad
          </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes detFadeIn  { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .det-fullscreen::-webkit-scrollbar       { width: 8px }
        .det-fullscreen::-webkit-scrollbar-track { background: #f8fafc }
        .det-fullscreen::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px }
        .det-fullscreen::-webkit-scrollbar-thumb:hover { background: #94a3b8 }
      `}</style>
    </>
  );
};

/* Sub-components */
const Section: React.FC<{ title: string; icon: string; accent: string; children: React.ReactNode }> = ({ title, icon, accent, children }) => (
  <div style={{ background: '#fafafa', border: '1.5px solid #f1f5f9', borderRadius: 14, overflow: 'hidden' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <GoogleIcon name={icon} size={15} color={accent} />
      </div>
      <span style={{ fontWeight: 700, fontSize: '13px', color: '#334155' }}>{title}</span>
    </div>
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
  </div>
);

const FieldRow: React.FC<{ label: string; value: string; mono?: boolean; accent?: string }> = ({ label, value, mono, accent }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap', paddingTop: 1 }}>{label}</span>
    <span style={{ fontSize: '13px', color: accent ?? '#0f172a', fontWeight: accent ? 700 : 600, textAlign: 'right', fontFamily: mono ? 'monospace' : undefined, wordBreak: 'break-word' }}>
      {value}
    </span>
  </div>
);
