import React, { useState } from 'react';
import { GoogleIcon } from '../../components/GoogleIcon';
import type { Oportunidad } from '../../types/oportunidades';
import {
  registrarOCApi,
  cambiarEstadoOCApi,
  renegociarCostoApi,
  registrarEntregaApi,
} from '../../api/services/oportunidades.service';
import { formatFechaHoraPeru } from '../../utils/dateUtils';

export const OC_ESTADO_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  'OC_RECIBIDA':  { color: '#0284c7', bg: '#e0f2fe', icon: 'receipt_long', label: 'OC Recibida' },
  'OC_ACEPTADA':  { color: '#059669', bg: '#d1fae5', icon: 'thumb_up', label: 'OC Aceptada' },
  'OC_RECHAZADA': { color: '#dc2626', bg: '#fee2e2', icon: 'thumb_down', label: 'OC Rechazada' },
  'ENTREGADA':    { color: '#7c3aed', bg: '#ede9fe', icon: 'inventory', label: 'Entregada' },
};

export const OC_STATES = ['OC_RECIBIDA', 'OC_ACEPTADA', 'OC_RECHAZADA', 'ENTREGADA'] as const;
export const OC_ACTIVAS = ['OC_RECIBIDA', 'OC_ACEPTADA'] as const;

const money = (v: number | null | undefined) =>
  `S/ ${(Number(v) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

const Field: React.FC<{ label: string; value: React.ReactNode; mono?: boolean; accent?: string }> = ({ label, value, mono, accent }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 100 }}>
    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>{label}</span>
    <span style={{ display: 'block', fontSize: '13px', color: accent ?? '#0f172a', fontWeight: 600, fontFamily: mono ? 'monospace' : undefined, wordBreak: 'break-word' }}>
      {value}
    </span>
  </div>
);

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 11px',
  borderRadius: 8,
  border: '1.5px solid #e2e8f0',
  fontSize: '13px',
  background: '#ffffff',
  color: '#0f172a',
  outline: 'none',
  boxSizing: 'border-box',
};

const btn = (bg: string, color = '#ffffff'): React.CSSProperties => ({
  padding: '9px 16px', borderRadius: 8, border: 'none', background: bg, color,
  fontWeight: 700, fontSize: '12.5px', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
});

/** Modal de confirmación para acciones irreversibles de la OC */
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
        background: '#ffffff', borderRadius: 16, width: 380, maxWidth: 'calc(100vw - 32px)', zIndex: 10000,
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
        <div style={{ display: 'flex', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button" onClick={onCancel}
            style={{ flex: 1, padding: '14px', border: 'none', background: 'transparent', color: '#64748b', fontWeight: 600, fontSize: '13px', cursor: 'pointer', borderRight: '1px solid #f1f5f9' }}
          >
            Cancelar
          </button>
          <button
            type="button" onClick={onConfirm}
            style={{ flex: 1, padding: '14px', border: 'none', background: confirmColor, color: '#ffffff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
};

/** Modal de solo lectura con todos los detalles de la Orden de Compra */
export const DetalleOCModal: React.FC<{ open: boolean; onClose: () => void; op: Oportunidad }> = ({ open, onClose, op }) => {
  const oc = op.ordenCompra;
  if (!open || !oc) return null;
  const cfg = OC_ESTADO_CONFIG[oc.estadoOC];

  const Row: React.FC<{ label: string; value: React.ReactNode; accent?: string }> = ({ label, value, accent }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '9px 0', borderBottom: '1px solid #f8fafc' }}>
      <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: '13px', color: accent ?? '#0f172a', fontWeight: 600, textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );

  const Seccion: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  );

  const costos: { label: string; value: string }[] = [];
  if (oc.costoInicial != null) costos.push({ label: 'Costo inicial', value: money(oc.costoInicial) });
  if (oc.costoRenegociado != null) costos.push({ label: 'Costo renegociado', value: money(oc.costoRenegociado) });
  if (oc.margenAdicional != null) costos.push({ label: 'Margen adicional', value: money(oc.margenAdicional) });
  if (oc.fechaRenegociacion) costos.push({ label: 'Fecha de renegociación', value: formatFechaHoraPeru(oc.fechaRenegociacion) });

  const logistica: { label: string; value: string }[] = [];
  if (oc.fechaDespacho) logistica.push({ label: 'Fecha de despacho', value: formatFechaHoraPeru(oc.fechaDespacho) });
  if (oc.transportista) logistica.push({ label: 'Transportista', value: oc.transportista });
  if (oc.noGuiaRemision) logistica.push({ label: 'N° de guía', value: oc.noGuiaRemision });
  if (oc.fechaEntrega) logistica.push({ label: 'Fecha de entrega', value: formatFechaHoraPeru(oc.fechaEntrega) });

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 9999 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: '#ffffff', borderRadius: 16, width: 640, maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', zIndex: 10000, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '16px 20px', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, background: '#ffffff', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ background: cfg?.bg ?? '#f1f5f9', color: cfg?.color ?? '#64748b', fontWeight: 700, fontSize: '12px', padding: '4px 12px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <GoogleIcon name={cfg?.icon ?? 'receipt'} size={13} color={cfg?.color ?? '#64748b'} /> {cfg?.label ?? oc.estadoOC}
            </span>
            <strong style={{ fontSize: '15px', color: '#0f172a' }}>N° OC {oc.numeroOC}</strong>
          </div>
          <button type="button" onClick={onClose} style={{ border: 'none', background: '#f1f5f9', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <GoogleIcon name="close" size={18} color="#64748b" />
          </button>
        </div>

        <div style={{ padding: '4px 20px 20px' }}>
          <Seccion title="Convocatoria">
            <Row label="Requerimiento" value={op.numeroRequerimiento || '—'} />
            <Row label="Acuerdo Marco" value={op.acuerdoMarco ? `${op.acuerdoMarco.codigo} — ${op.acuerdoMarco.descripcion}` : '—'} />
            <Row label="RUC" value={op.empresaRuc || '—'} />
            <Row label="Entidad / Cliente" value={op.empresaRazonSocial || op.entidadConvocante || '—'} />
            <Row label="Vencimiento" value={op.fechaVencimiento ? formatFechaHoraPeru(op.fechaVencimiento) : '—'} />
            <Row label="Límite total" value={money(op.limiteTotal)} />
          </Seccion>

          <Seccion title={`Marcas participantes (${op.marcas.length})`}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 4 }}>
              {op.marcas.length === 0
                ? <span style={{ fontSize: '13px', color: '#94a3b8' }}>—</span>
                : op.marcas.map((m) => (
                    <span key={m.id} style={{ background: '#f1f5f9', color: '#334155', fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: 14 }}>{m.nombre}</span>
                  ))}
            </div>
          </Seccion>

          <Seccion title={`Productos / Ítems (${op.items.length})`}>
            <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #f1f5f9', marginTop: 4 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['N° Parte', 'Descripción', 'Cant.', 'Límite', 'Ficha', 'Marca'].map((h) => (
                      <th key={h} style={{ padding: '7px 9px', textAlign: h === 'Cant.' || h === 'Límite' ? 'right' : 'left', color: '#64748b', fontWeight: 600, fontSize: '11px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {op.items.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: '10px', textAlign: 'center', color: '#94a3b8' }}>Sin ítems</td></tr>
                  ) : op.items.map((it) => (
                    <tr key={it.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '7px 9px', fontWeight: 600, color: '#0f172a' }}>{it.numeroParte || '—'}</td>
                      <td style={{ padding: '7px 9px', color: '#334155', maxWidth: 180, wordBreak: 'break-word' }}>{it.descripcion || '—'}</td>
                      <td style={{ padding: '7px 9px', textAlign: 'right', color: '#334155' }}>{it.cantidad}</td>
                      <td style={{ padding: '7px 9px', textAlign: 'right', color: '#64748b' }}>{money(it.limiteUnitario)}</td>
                      <td style={{ padding: '7px 9px', color: '#64748b' }}>{it.fichaProducto || '—'}</td>
                      <td style={{ padding: '7px 9px', color: '#64748b' }}>{it.marcaProducto || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Seccion>

          <Seccion title="Orden de Compra">
            <Row label="Fecha de emisión" value={oc.fechaEmisionOC ? formatFechaHoraPeru(oc.fechaEmisionOC) : '—'} />
            {oc.estadoOC === 'OC_RECHAZADA'
              ? <Row label="Motivo de rechazo" value={oc.motivoRechazo || '—'} accent="#dc2626" />
              : <Row label="Fecha de decisión" value={oc.fechaDecisionOC ? formatFechaHoraPeru(oc.fechaDecisionOC) : '—'} />}
          </Seccion>

          {costos.length > 0 && (
            <Seccion title="Rentabilidad">
              {costos.map((f) => <Row key={f.label} label={f.label} value={f.value} accent={f.label === 'Margen adicional' ? '#059669' : undefined} />)}
            </Seccion>
          )}

          {logistica.length > 0 && (
            <Seccion title="Despacho y entrega">
              {logistica.map((f) => <Row key={f.label} label={f.label} value={f.value} />)}
            </Seccion>
          )}

          <Seccion title="Auditoría">
            <Row label="Registrado por" value={op.creadoPor || '—'} />
            <Row label="Fecha de registro (OC)" value={oc.fechaRegistro ? formatFechaHoraPeru(oc.fechaRegistro) : '—'} />
            <Row label="Última actualización" value={oc.fechaActualizacion ? formatFechaHoraPeru(oc.fechaActualizacion) : '—'} />
          </Seccion>
        </div>
      </div>
    </>
  );
};

/**
 * Panel de operaciones del Bloque 2 (OC & Logística): registrar OC, aceptar/rechazar,
 * renegociar rentabilidad y registrar despacho/entrega.
 */
export const OCPanel: React.FC<{
  op: Oportunidad;
  isOwner: boolean;
  accent: string;
  onEstadoCambiado?: (op: Oportunidad) => void;
}> = ({ op, isOwner, accent, onEstadoCambiado }) => {
  const oc = op.ordenCompra;
  const ocCfg = oc ? OC_ESTADO_CONFIG[oc.estadoOC] : null;

  const [mostrarRegistrar, setMostrarRegistrar] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [confirmarDecision, setConfirmarDecision] = useState<null | 'OC_ACEPTADA' | 'OC_RECHAZADA'>(null);
  const [verDetalle, setVerDetalle] = useState(false);
  const [registrarBusy, setRegistrarBusy] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [costoBusy, setCostoBusy] = useState(false);
  const [entregaBusy, setEntregaBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [formOC, setFormOC] = useState({ numeroOC: '', fechaEmisionOC: '' });
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [costoRenegociadoInput, setCostoRenegociadoInput] = useState('');
  const [formEntrega, setFormEntrega] = useState({
    fechaDespacho: '', transportista: '', noGuiaRemision: '', fechaEntrega: '',
  });

  // El costo inicial proviene del requerimiento (Σ cantidad × precio unitario base = límite total)
  const costoInicialRequerimiento = Number(op.limiteTotal) || 0;

  const flash = (err: boolean, msg: string) => {
    setErrorMsg(err ? msg : null);
    setOkMsg(err ? null : msg);
    setTimeout(() => { setErrorMsg(null); setOkMsg(null); }, 5000);
  };

  const aplicar = (res: any) => {
    onEstadoCambiado?.({
      ...op,
      estado: (res.estado as Oportunidad['estado']) || op.estado,
      ordenCompra: res.ordenCompra || op.ordenCompra,
      updatedAt: undefined,
    });
  };

  const handleRegistrarOC = async () => {
    setErrorMsg(null); setOkMsg(null);
    if (!formOC.numeroOC.trim()) { flash(true, 'El número de Orden de Compra es obligatorio.'); return; }
    setRegistrarBusy(true);
    try {
      const res = await registrarOCApi(op.id, {
        numeroOC: formOC.numeroOC.trim(),
        fechaEmisionOC: formOC.fechaEmisionOC || null,
      });
      aplicar(res);
      setMostrarRegistrar(false);
      setFormOC({ numeroOC: '', fechaEmisionOC: '' });
      flash(false, `OC ${res.ordenCompra?.numeroOC ?? ''} registrada correctamente.`);
    } catch (err: any) {
      flash(true, err.message || 'Error al registrar la OC');
    } finally {
      setRegistrarBusy(false);
    }
  };

  const handleDecisionOC = async (estadoOC: 'OC_ACEPTADA' | 'OC_RECHAZADA') => {
    setErrorMsg(null); setOkMsg(null);
    if (estadoOC === 'OC_RECHAZADA' && !motivoRechazo.trim()) {
      flash(true, 'Debe indicar el motivo al rechazar la Orden de Compra.');
      return;
    }
    setDecisionBusy(true);
    try {
      const res = await cambiarEstadoOCApi(op.id, { estadoOC, motivoRechazo: estadoOC === 'OC_RECHAZADA' ? motivoRechazo.trim() : null });
      aplicar(res);
      setMotivoRechazo('');
      setRechazando(false);
      flash(false, estadoOC === 'OC_ACEPTADA' ? 'OC aceptada. Puede renegociar el costo y registrar la entrega.' : 'OC rechazada.');
    } catch (err: any) {
      flash(true, err.message || 'Error al actualizar la OC');
    } finally {
      setDecisionBusy(false);
    }
  };

  const handleRenegociar = async () => {
    setErrorMsg(null); setOkMsg(null);
    const inicial = costoInicialRequerimiento;
    const renegociado = Number(costoRenegociadoInput);
    if (!inicial) { flash(true, 'El requerimiento no tiene un costo inicial (límite total) definido.'); return; }
    if (!renegociado) { flash(true, 'Ingrese el costo renegociado.'); return; }
    if (renegociado >= inicial) { flash(true, 'El costo renegociado debe ser menor al costo inicial del requerimiento.'); return; }
    setCostoBusy(true);
    try {
      const res = await renegociarCostoApi(op.id, { costoInicial: inicial, costoRenegociado: renegociado });
      aplicar(res);
      setCostoRenegociadoInput('');
      flash(false, `Margen adicional registrado: ${money(res.ordenCompra?.margenAdicional)}`);
    } catch (err: any) {
      flash(true, err.message || 'Error al renegociar el costo');
    } finally {
      setCostoBusy(false);
    }
  };

  const handleEntrega = async () => {
    setErrorMsg(null); setOkMsg(null);
    setEntregaBusy(true);
    try {
      const res = await registrarEntregaApi(op.id, {
        fechaDespacho: formEntrega.fechaDespacho || null,
        transportista: formEntrega.transportista.trim() || null,
        noGuiaRemision: formEntrega.noGuiaRemision.trim() || null,
        fechaEntrega: formEntrega.fechaEntrega || null,
      });
      aplicar(res);
      setFormEntrega({ fechaDespacho: '', transportista: '', noGuiaRemision: '', fechaEntrega: '' });
      flash(false, 'Entrega y despacho registrados.');
    } catch (err: any) {
      flash(true, err.message || 'Error al registrar la entrega');
    } finally {
      setEntregaBusy(false);
    }
  };

  const hayLogistica = !!(oc && (oc.fechaDespacho || oc.transportista || oc.noGuiaRemision || oc.fechaEntrega));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {!oc ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', color: '#64748b' }}>
            <GoogleIcon name="receipt_long" size={16} color="#94a3b8" />
            Aún no hay una Orden de Compra registrada.
          </div>
          {isOwner && op.estado === 'Adjudicada' && (
            mostrarRegistrar ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="N° de Orden de Compra *" value={
                    <input style={inputStyle} placeholder="OC-2026-0000001" value={formOC.numeroOC} onChange={(e) => setFormOC({ ...formOC, numeroOC: e.target.value })} />
                  } />
                  <Field label="Fecha y hora de emisión" value={
                    <input type="datetime-local" style={inputStyle} value={formOC.fechaEmisionOC} onChange={(e) => setFormOC({ ...formOC, fechaEmisionOC: e.target.value })} />
                  } />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" disabled={registrarBusy} onClick={handleRegistrarOC} style={{ ...btn(accent), opacity: registrarBusy ? 0.6 : 1 }}>
                    <GoogleIcon name="save" size={14} color="#ffffff" /> {registrarBusy ? 'Registrando…' : 'Registrar OC'}
                  </button>
                  <button type="button" onClick={() => setMostrarRegistrar(false)} style={{ ...btn('#ffffff', '#64748b'), border: '1.5px solid #e2e8f0' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setMostrarRegistrar(true)} style={{ ...btn(accent), alignSelf: 'flex-start' }}>
                <GoogleIcon name="receipt_long" size={14} color="#ffffff" /> Registrar Orden de Compra
              </button>
            )
          )}
        </div>
      ) : (
        <>
          {/* Encabezado: estado + número + emisión */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ background: ocCfg?.bg ?? '#f1f5f9', color: ocCfg?.color ?? '#64748b', fontWeight: 700, fontSize: '12px', padding: '4px 12px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <GoogleIcon name={ocCfg?.icon ?? 'receipt'} size={13} color={ocCfg?.color ?? '#64748b'} /> {ocCfg?.label ?? oc.estadoOC}
            </span>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>N° OC {oc.numeroOC}</span>
            {oc.fechaEmisionOC && (
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Emitida {formatFechaHoraPeru(oc.fechaEmisionOC)}</span>
            )}
            <button
              type="button"
              onClick={() => setVerDetalle(true)}
              style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
            >
              <GoogleIcon name="receipt_long" size={14} color="#475569" /> Ver detalle
            </button>
          </div>

          {/* Datos clave, sin cajas */}
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            {oc.estadoOC === 'OC_RECHAZADA'
              ? <Field label="Motivo del rechazo" value={oc.motivoRechazo || '—'} accent="#dc2626" />
              : oc.fechaDecisionOC && <Field label="Fecha de decisión" value={formatFechaHoraPeru(oc.fechaDecisionOC)} />}
            {(oc.costoInicial != null || oc.margenAdicional != null) && (
              <>
                <Field label="Costo inicial" value={money(oc.costoInicial)} />
                <Field label="Costo renegociado" value={money(oc.costoRenegociado)} />
                <Field label="Margen adicional" value={money(oc.margenAdicional)} accent="#059669" />
              </>
            )}
            {hayLogistica && (
              <>
                {oc.fechaDespacho && <Field label="Despacho" value={formatFechaHoraPeru(oc.fechaDespacho)} />}
                {oc.transportista && <Field label="Transportista" value={oc.transportista} />}
                {oc.noGuiaRemision && <Field label="N° de guía" value={oc.noGuiaRemision} mono />}
                {oc.fechaEntrega && <Field label="Entrega" value={formatFechaHoraPeru(oc.fechaEntrega)} />}
              </>
            )}
          </div>

          {/* Acción pendiente según estado */}
          {oc.estadoOC === 'OC_RECIBIDA' && isOwner && (
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>¿Aceptas la Orden de Compra?</span>
              {!rechazando ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" disabled={decisionBusy} onClick={() => setConfirmarDecision('OC_ACEPTADA')} style={{ ...btn('#059669'), opacity: decisionBusy ? 0.6 : 1 }}>
                    <GoogleIcon name="thumb_up" size={14} color="#ffffff" /> Aceptar OC
                  </button>
                  <button type="button" disabled={decisionBusy} onClick={() => setRechazando(true)} style={{ ...btn('#ffffff', '#dc2626'), border: '1.5px solid #fecaca' }}>
                    Rechazar OC
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input style={{ ...inputStyle, flex: 1, minWidth: 220 }} placeholder="Motivo de rechazo (obligatorio)" value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)} />
                  <button type="button" disabled={decisionBusy} onClick={() => {
                    if (!motivoRechazo.trim()) { flash(true, 'Debe indicar el motivo al rechazar la Orden de Compra.'); return; }
                    setConfirmarDecision('OC_RECHAZADA');
                  }} style={{ ...btn('#dc2626'), opacity: decisionBusy ? 0.6 : 1 }}>
                    Confirmar rechazo
                  </button>
                  <button type="button" onClick={() => { setRechazando(false); setMotivoRechazo(''); }} style={{ ...btn('#ffffff', '#64748b'), border: '1.5px solid #e2e8f0' }}>
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}

          {oc.estadoOC === 'OC_ACEPTADA' && isOwner && (
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>Renegociar costo</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'end' }}>
                  <Field label="Costo inicial (del requerimiento)" value={money(costoInicialRequerimiento)} />
                  <Field label="Costo renegociado (S/)" value={
                    <input type="number" step="0.01" min="0" style={inputStyle} placeholder="0.00" value={costoRenegociadoInput} onChange={(e) => setCostoRenegociadoInput(e.target.value)} />
                  } />
                  <button type="button" disabled={costoBusy} onClick={handleRenegociar} style={{ ...btn('#059669'), opacity: costoBusy ? 0.6 : 1 }}>
                    <GoogleIcon name="savings" size={14} color="#ffffff" /> {costoBusy ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
                {Number(costoRenegociadoInput) > 0 && Number(costoRenegociadoInput) < costoInicialRequerimiento && (
                  <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                    Margen adicional: {money(costoInicialRequerimiento - Number(costoRenegociadoInput))}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>Registrar entrega</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  <Field label="Fecha de despacho" value={<input type="date" style={inputStyle} value={formEntrega.fechaDespacho} onChange={(e) => setFormEntrega({ ...formEntrega, fechaDespacho: e.target.value })} />} />
                  <Field label="Transportista" value={<input style={inputStyle} placeholder="Transportista" value={formEntrega.transportista} onChange={(e) => setFormEntrega({ ...formEntrega, transportista: e.target.value })} />} />
                  <Field label="N° de guía de remisión" value={<input style={inputStyle} placeholder="G-00000000" value={formEntrega.noGuiaRemision} onChange={(e) => setFormEntrega({ ...formEntrega, noGuiaRemision: e.target.value })} />} />
                  <Field label="Fecha de entrega" value={<input type="date" style={inputStyle} value={formEntrega.fechaEntrega} onChange={(e) => setFormEntrega({ ...formEntrega, fechaEntrega: e.target.value })} />} />
                </div>
                <button type="button" disabled={entregaBusy} onClick={handleEntrega} style={{ ...btn('#7c3aed'), alignSelf: 'flex-end', opacity: entregaBusy ? 0.6 : 1 }}>
                  <GoogleIcon name="check_circle" size={14} color="#ffffff" /> {entregaBusy ? 'Registrando…' : 'Registrar entrega'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Mensajes */}
      {okMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#d1fae5', color: '#065f46', borderRadius: 8, padding: '9px 12px', fontSize: '12.5px', fontWeight: 600 }}>
          <GoogleIcon name="check_circle" size={15} color="#059669" /> {okMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '9px 12px', fontSize: '12.5px', fontWeight: 600 }}>
          <GoogleIcon name="error" size={15} color="#dc2626" /> {errorMsg}
        </div>
      )}

      <ConfirmModal
        open={confirmarDecision !== null}
        title={confirmarDecision === 'OC_ACEPTADA' ? '¿Aceptar la Orden de Compra?' : '¿Rechazar la Orden de Compra?'}
        message={
          confirmarDecision === 'OC_ACEPTADA'
            ? 'La oportunidad pasará a OC Aceptada y podrás renegociar el costo y registrar la entrega.'
            : 'La oportunidad quedará como OC Rechazada y saldrá de operación. Verifica que el motivo sea el correcto; esta acción no se puede deshacer.'
        }
        confirmLabel={confirmarDecision === 'OC_ACEPTADA' ? 'Sí, aceptar' : 'Sí, rechazar'}
        confirmColor={confirmarDecision === 'OC_ACEPTADA' ? '#059669' : '#dc2626'}
        onConfirm={() => {
          const tipo = confirmarDecision;
          setConfirmarDecision(null);
          if (tipo) handleDecisionOC(tipo);
        }}
        onCancel={() => setConfirmarDecision(null)}
      />

      <DetalleOCModal open={verDetalle} onClose={() => setVerDetalle(false)} op={op} />
    </div>
  );
};
