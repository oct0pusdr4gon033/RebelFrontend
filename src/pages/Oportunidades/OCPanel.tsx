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
  const [registrarBusy, setRegistrarBusy] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [costoBusy, setCostoBusy] = useState(false);
  const [entregaBusy, setEntregaBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [formOC, setFormOC] = useState({ numeroOC: '', fechaEmisionOC: '' });
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [formCosto, setFormCosto] = useState({ costoInicial: '', costoRenegociado: '' });
  const [formEntrega, setFormEntrega] = useState({
    fechaDespacho: '', transportista: '', noGuiaRemision: '', fechaEntrega: '',
  });

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
    const inicial = Number(formCosto.costoInicial);
    const renegociado = Number(formCosto.costoRenegociado);
    if (!inicial || !renegociado) { flash(true, 'Ingrese costo inicial y costo renegociado.'); return; }
    setCostoBusy(true);
    try {
      const res = await renegociarCostoApi(op.id, { costoInicial: inicial, costoRenegociado: renegociado });
      aplicar(res);
      setFormCosto({ costoInicial: '', costoRenegociado: '' });
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
                  <button type="button" disabled={decisionBusy} onClick={() => handleDecisionOC('OC_ACEPTADA')} style={{ ...btn('#059669'), opacity: decisionBusy ? 0.6 : 1 }}>
                    <GoogleIcon name="thumb_up" size={14} color="#ffffff" /> Aceptar OC
                  </button>
                  <button type="button" disabled={decisionBusy} onClick={() => setRechazando(true)} style={{ ...btn('#ffffff', '#dc2626'), border: '1.5px solid #fecaca' }}>
                    Rechazar OC
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input style={{ ...inputStyle, flex: 1, minWidth: 220 }} placeholder="Motivo de rechazo (obligatorio)" value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)} />
                  <button type="button" disabled={decisionBusy} onClick={() => handleDecisionOC('OC_RECHAZADA')} style={{ ...btn('#dc2626'), opacity: decisionBusy ? 0.6 : 1 }}>
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
                  <Field label="Costo inicial (S/)" value={
                    <input type="number" step="0.01" min="0" style={inputStyle} placeholder="0.00" value={formCosto.costoInicial} onChange={(e) => setFormCosto({ ...formCosto, costoInicial: e.target.value })} />
                  } />
                  <Field label="Costo renegociado (S/)" value={
                    <input type="number" step="0.01" min="0" style={inputStyle} placeholder="0.00" value={formCosto.costoRenegociado} onChange={(e) => setFormCosto({ ...formCosto, costoRenegociado: e.target.value })} />
                  } />
                  <button type="button" disabled={costoBusy} onClick={handleRenegociar} style={{ ...btn('#059669'), opacity: costoBusy ? 0.6 : 1 }}>
                    <GoogleIcon name="savings" size={14} color="#ffffff" /> {costoBusy ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
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
    </div>
  );
};
