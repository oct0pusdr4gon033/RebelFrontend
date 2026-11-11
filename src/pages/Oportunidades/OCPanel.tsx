import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import { useAuth } from '../../context/AuthContext';
import type { Oportunidad, DocumentoOCItem } from '../../types/oportunidades';
import {
  obtenerPoolDocumentosOC,
  guardarPoolDocumentosOC,
  procesarArchivosParaPool,
  getDocumentoVisualProps,
} from '../../utils/documentosPoolUtils';
import {
  registrarOCApi,
  cambiarEstadoOCApi,
  renegociarCostoApi,
  registrarEntregaApi,
  cambiarEstadoApi,
} from '../../api/services/oportunidades.service';
import { formatFechaHoraPeru } from '../../utils/dateUtils';
import { VerDocumentoModal, type DocumentoVisualizable } from '../../components/DocumentoModal/VerDocumentoModal';

export const OC_ESTADO_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  'OC_RECIBIDA': { color: '#0284c7', bg: '#e0f2fe', icon: 'receipt_long', label: 'OC Recibida' },
  'OC_ACEPTADA': { color: '#059669', bg: '#d1fae5', icon: 'thumb_up', label: 'OC Aceptada' },
  'OC_RECHAZADA': { color: '#dc2626', bg: '#fee2e2', icon: 'thumb_down', label: 'OC Rechazada' },
  'ENTREGADA': { color: '#7c3aed', bg: '#ede9fe', icon: 'inventory', label: 'Entregada' },
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

  const Row: React.FC<{ label: string; value: React.ReactNode; accent?: string; mono?: boolean }> = ({ label, value, accent, mono }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '9px 0', borderBottom: '1px solid #f8fafc' }}>
      <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: '13px', color: accent ?? '#0f172a', fontWeight: 600, textAlign: 'right', wordBreak: 'break-word', fontFamily: mono ? 'monospace' : undefined }}>{value}</span>
    </div>
  );

  const Seccion: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  );

  const costos: { label: string; value: string }[] = [];
  const [documentoParaVer, setDocumentoParaVer] = useState<DocumentoVisualizable | null>(null);
  const poolDocs = obtenerPoolDocumentosOC(op);
  if (oc.costoInicial != null) costos.push({ label: 'Costo inicial', value: money(oc.costoInicial) });
  if (oc.costoRenegociado != null) costos.push({ label: 'Costo renegociado', value: money(oc.costoRenegociado) });
  if (oc.margenAdicional != null) costos.push({ label: 'Margen adicional', value: money(oc.margenAdicional) });
  if (oc.fechaRenegociacion) costos.push({ label: 'Fecha de renegociación', value: formatFechaHoraPeru(oc.fechaRenegociacion) });

  const logistica: { label: string; value: string }[] = [];
  if (oc.fechaDespacho) logistica.push({ label: 'Fecha de despacho', value: formatFechaHoraPeru(oc.fechaDespacho) });
  if (oc.transportista) logistica.push({ label: 'Transportista', value: oc.transportista });
  if (oc.noGuiaRemision) logistica.push({ label: 'N° de guía', value: oc.noGuiaRemision });
  if (oc.fechaEntrega) logistica.push({ label: 'Fecha de entrega', value: formatFechaHoraPeru(oc.fechaEntrega) });
  if (oc.fechaLimitePago) logistica.push({ label: 'Límite para solicitar pagos (10 días)', value: formatFechaHoraPeru(oc.fechaLimitePago) });

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

          {(oc.nroOCAM || oc.nroExpediente || oc.nroFolio || oc.archivoOCUrl || oc.codigoUnidadEjecutora || oc.codigoCIAF || oc.montoOCAM != null) && (
            <Seccion title="Orden de Compra Oficial (Perú Compras)">
              {oc.nroOCAM && <Row label="N° OCAM" value={oc.nroOCAM} mono />}
              {oc.nroExpediente && <Row label="N° Expediente" value={oc.nroExpediente} mono />}
              {oc.nroFolio && <Row label="N° Folio" value={oc.nroFolio} mono />}
              {oc.codigoUnidadEjecutora && <Row label="Código de Unidad Ejecutora (U.O.E.)" value={oc.codigoUnidadEjecutora} />}
              {oc.codigoCIAF && <Row label="Código CIAF" value={oc.codigoCIAF} mono />}
              {oc.montoOCAM != null && <Row label="Monto OCAM (Techo)" value={money(oc.montoOCAM)} accent="#059669" />}
              {oc.flete != null && <Row label="Flete" value={money(oc.flete)} />}
              {oc.requiereAprobacionAdmin && <Row label="Autorización Administrador" value="Sí (monto excede costo de productos)" accent="#b45309" />}
              {poolDocs.length > 0 ? (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <GoogleIcon name="folder_open" size={14} color="#2563eb" />
                    <span>Pool de Documentos Oficiales ({poolDocs.length})</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {poolDocs.map((doc, idx) => {
                      const visual = getDocumentoVisualProps(doc.nombre, doc.tipo);
                      return (
                        <div
                          key={doc.id || idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 4,
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                            <span style={{ width: 22, height: 22, borderRadius: 3, background: visual.badgeBg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                              <GoogleIcon name={visual.icon} size={13} color={visual.color} />
                            </span>
                            <span style={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 220 }} title={doc.nombre}>
                              {doc.nombre}
                            </span>
                            {doc.tamanoTexto && (
                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>({doc.tamanoTexto})</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setDocumentoParaVer(doc)}
                            style={{
                              color: '#2563eb',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              padding: '3px 8px',
                              borderRadius: 3,
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '11.5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <GoogleIcon name="visibility" size={13} color="#2563eb" />
                            <span>Ver</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : oc.archivoOCUrl ? (
                <Row
                  label="Documento Perú Compras"
                  value={
                    <button
                      type="button"
                      onClick={() => setDocumentoParaVer({
                        nombre: oc.archivoNombre || 'Documento Oficial Perú Compras.pdf',
                        url: oc.archivoOCUrl!,
                        tipo: 'application/pdf',
                      })}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        color: '#2563eb',
                        textDecoration: 'underline',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <GoogleIcon name="visibility" size={14} color="#2563eb" /> Ver Documento Oficial
                    </button>
                  }
                />
              ) : null}
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #e2e8f0' }}>
                <a
                  href={`/admin/pagos?tab=registrar&oc=${encodeURIComponent(oc.numeroOC)}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#2563eb',
                    color: '#ffffff',
                    padding: '8px 12px',
                    borderRadius: 0,
                    fontWeight: 700,
                    fontSize: '12px',
                    textDecoration: 'none',
                  }}
                >
                  <GoogleIcon name="payments" size={15} color="#ffffff" />
                  <span>Solicitar Pagos (Proveedor / Transporte)</span>
                </a>
              </div>
            </Seccion>
          )}

          {costos.length > 0 && (
            <Seccion title="Rentabilidad">
              {costos.map((f) => <Row key={f.label} label={f.label} value={f.value} accent={f.label === 'Margen adicional' ? '#059669' : undefined} />)}
            </Seccion>
          )}

          {logistica.length > 0 && (
            <Seccion title="Despacho y entrega">
              {logistica.map((f) => <Row key={f.label} label={f.label} value={f.value} />)}
              {oc.estadoOC === 'ENTREGADA' && !oc.noGuiaRemision && (
                <div style={{ marginTop: 10, padding: '9px 12px', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GoogleIcon name="warning" size={16} color="#d97706" />
                  <span>Alerta: la OC fue entregada pero no se registró la Guía de Remisión.</span>
                </div>
              )}
            </Seccion>
          )}

          <Seccion title="Auditoría — Línea de tiempo (registro de oportunidad → OC)">
            {[
              { label: 'Registro de la oportunidad', fecha: op.fechaRegistro, icon: 'bolt', color: '#2563eb' },
              { label: 'Adjudicación con Buena Pro', fecha: oc.fechaRegistro, icon: 'verified', color: '#059669' },
              { label: 'Registro de la Orden de Compra', fecha: oc.fechaRegistro, icon: 'receipt_long', color: '#0284c7' },
              { label: 'Decisión de la OC (Admin/Master)', fecha: oc.fechaDecisionOC ?? undefined, icon: oc.estadoOC === 'OC_RECHAZADA' ? 'thumb_down' : 'thumb_up', color: oc.estadoOC === 'OC_RECHAZADA' ? '#dc2626' : '#059669' },
              { label: 'Renegociación del costo', fecha: oc.fechaRenegociacion ?? undefined, icon: 'savings', color: '#7c3aed' },
              { label: 'Entrega', fecha: oc.fechaEntrega ?? undefined, icon: 'inventory', color: '#7c3aed' },
            ].filter((h) => h.fecha).map((h, idx, arr) => (
              <div key={h.label} style={{ display: 'flex', gap: 10, padding: '7px 0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: `${h.color}18`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <GoogleIcon name={h.icon} size={12} color={h.color} />
                  </span>
                  {idx < arr.length - 1 && <span style={{ width: 1, flex: 1, minHeight: 8, background: '#e2e8f0' }} />}
                </div>
                <div style={{ paddingBottom: idx < arr.length - 1 ? 6 : 0 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>{h.label}</div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: 1 }}>{h.fecha ? formatFechaHoraPeru(h.fecha) : '—'}</div>
                </div>
              </div>
            ))}
          </Seccion>
        </div>
      </div>
      <VerDocumentoModal
        documento={documentoParaVer}
        onClose={() => setDocumentoParaVer(null)}
      />
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
  esAdmin?: boolean;
  accent: string;
  onEstadoCambiado?: (op: Oportunidad) => void;
  onSolicitarPago?: (op: Oportunidad) => void;
}> = ({ op, isOwner, esAdmin = false, accent, onEstadoCambiado, onSolicitarPago }) => {
  const navigate = useNavigate();
  const { empleado } = useAuth();
  const roleBasePath =
    empleado?.rolNombre === 'Administrador' || empleado?.rolNombre === 'SysAdmin'
      ? '/admin'
      : (empleado?.rolNombre === 'Ejecutivo(a) Master Ventas' || empleado?.rolNombre === 'Ejecutiva Master Ventas')
        ? '/master'
        : '/ejecutiva';

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

  const [formOC, setFormOC] = useState({
    numeroOC: '',
    fechaEmisionOC: '',
    nroOCAM: '',
    nroExpediente: '',
    nroFolio: '',
    codigoUnidadEjecutora: '',
    codigoCIAF: '',
    montoOCAM: '',
    flete: '',
  });
  const [documentosPool, setDocumentosPool] = useState<DocumentoOCItem[]>(() => obtenerPoolDocumentosOC(op));
  const [docParaVer, setDocParaVer] = useState<DocumentoVisualizable | null>(null);
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

  const MAX_DOCS_OC = 2;

  const handleAgregarDocsOC = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const disponibles = MAX_DOCS_OC - documentosPool.length;
    if (disponibles <= 0) {
      flash(true, `Solo puedes adjuntar hasta ${MAX_DOCS_OC} documentos de la Orden de Compra.`);
      e.target.value = '';
      return;
    }

    const seleccionados = Array.from(files).slice(0, disponibles);
    if (files.length > disponibles) {
      flash(true, `Solo se agregaron ${disponibles} archivo(s): el máximo es ${MAX_DOCS_OC}.`);
    }

    const nuevos = await procesarArchivosParaPool(seleccionados);
    const actualizado = [...documentosPool, ...nuevos].slice(0, MAX_DOCS_OC);
    setDocumentosPool(actualizado);
    guardarPoolDocumentosOC(op.id, actualizado);
    e.target.value = '';
  };

  const handleQuitarDocOC = (id?: string | number) => {
    const actualizado = documentosPool.filter((doc) => doc.id !== id);
    setDocumentosPool(actualizado);
    guardarPoolDocumentosOC(op.id, actualizado);
  };

  const handleRegistrarOC = async () => {
    setErrorMsg(null); setOkMsg(null);
    const esAceptadaPeruCompras = op.estado === 'Aceptada por Perú Compras' || op.estado === 'Adjudicada';
    if (!esAceptadaPeruCompras) {
      flash(true, `El Registro de Orden de Compra Oficial (OCAM) solo se puede generar cuando la oportunidad sea "Aceptada por Perú Compras". Estado actual: "${op.estado}".`);
      return;
    }
    if (!formOC.numeroOC.trim()) { flash(true, 'El número de Orden de Compra es obligatorio.'); return; }
    // ── Buena Pro: la OC se registra junto con los datos oficiales de Perú Compras ──
    if (!formOC.nroOCAM.trim()) { flash(true, 'El N° OCAM de la Orden de Compra (Perú Compras) es obligatorio.'); return; }
    if (!formOC.nroExpediente.trim()) { flash(true, 'El N° de Expediente oficial de Perú Compras es obligatorio.'); return; }
    if (!formOC.nroFolio.trim()) { flash(true, 'El N° de Folio de la Orden de Compra es obligatorio.'); return; }
    if (!formOC.codigoUnidadEjecutora.trim()) { flash(true, 'Indique el Código de Unidad Ejecutora (U.O.E.) de la entidad.'); return; }
    if (!formOC.codigoCIAF.trim()) { flash(true, 'El Código CIAF de la orden de compra es obligatorio.'); return; }
    const montoOCAM = Number(formOC.montoOCAM);
    if (!montoOCAM || montoOCAM <= 0) { flash(true, 'El Monto de la OCAM (techo financiero) debe ser mayor a S/ 0.00.'); return; }
    if (costoInicialRequerimiento > 0 && montoOCAM > costoInicialRequerimiento) {
      flash(true, `El Monto de la OCAM no puede ser mayor al límite total del requerimiento (S/ ${costoInicialRequerimiento.toLocaleString('es-PE', { minimumFractionDigits: 2 })}).`);
      return;
    }
    if (documentosPool.length === 0) { flash(true, 'Es obligatorio subir al menos un documento oficial (PDF o imagen), hasta un máximo de 2.'); return; }
    if (documentosPool.length > MAX_DOCS_OC) { flash(true, `Solo puedes adjuntar hasta ${MAX_DOCS_OC} documentos oficiales.`); return; }

    const fleteNum = formOC.flete.trim() ? Number(formOC.flete) : null;
    if (fleteNum != null && (isNaN(fleteNum) || fleteNum < 0)) { flash(true, 'El flete debe ser un monto numérico mayor o igual a S/ 0.00.'); return; }

    setRegistrarBusy(true);
    try {
      const res = await registrarOCApi(op.id, {
        numeroOC: formOC.numeroOC.trim(),
        fechaEmisionOC: formOC.fechaEmisionOC || null,
        nroOCAM: formOC.nroOCAM.trim(),
        nroExpediente: formOC.nroExpediente.trim(),
        nroFolio: formOC.nroFolio.trim(),
        codigoUnidadEjecutora: formOC.codigoUnidadEjecutora.trim(),
        codigoCIAF: formOC.codigoCIAF.trim(),
        montoOCAM: montoOCAM,
        flete: fleteNum,
      });

      // Pasar formalmente la oportunidad al estado Cotización con la OCAM de Perú Compras
      try {
        await cambiarEstadoApi(op.id, 'Cotización');
      } catch (e) {
        console.warn('Estado cambiado en backend o local:', e);
      }

      const ocActualizada = {
        ...(res.ordenCompra || {}),
        numeroOC: formOC.numeroOC.trim(),
        nroOCAM: formOC.nroOCAM.trim(),
        nroExpediente: formOC.nroExpediente.trim(),
        nroFolio: formOC.nroFolio.trim(),
        codigoUnidadEjecutora: formOC.codigoUnidadEjecutora.trim(),
        codigoCIAF: formOC.codigoCIAF.trim(),
        montoOCAM: montoOCAM,
        flete: fleteNum,
        documentosPool,
      };

      aplicar({
        ...res,
        estado: 'Cotización',
        ordenCompra: ocActualizada,
      });

      setMostrarRegistrar(false);
      setFormOC({ numeroOC: '', fechaEmisionOC: '', nroOCAM: '', nroExpediente: '', nroFolio: '', codigoUnidadEjecutora: '', codigoCIAF: '', montoOCAM: '', flete: '' });
      flash(false, `¡OC ${formOC.numeroOC} y datos oficiales de Perú Compras registrados! Estado avanzó a 'Cotización' y los pagos quedaron habilitados.`);
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
          {!mostrarRegistrar && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', color: '#64748b' }}>
              <GoogleIcon name="receipt_long" size={16} color="#94a3b8" />
              Aún no hay una Orden de Compra registrada.
            </div>
          )}
          {(isOwner || esAdmin || ['Asignación de Oportunidad', 'Cotización', 'Adjudicada', 'En Competencia', 'En Licitación'].includes(op.estado)) && (
            mostrarRegistrar ? (
              <div
                style={{
                  width: '100%',
                  minHeight: 'calc(100vh - 140px)',
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 0,
                  margin: '6px 0',
                }}
              >
                {/* HEADER FIJO SUPERIOR DE PANTALLA COMPLETA */}
                <div
                  style={{
                    background: '#0f172a',
                    borderBottom: '2px solid #2563eb',
                    padding: '16px 32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        background: '#16a34a',
                        borderRadius: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <GoogleIcon name="verified" size={26} color="#ffffff" />
                    </div>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span>REGISTRO DE ORDEN DE COMPRA OFICIAL (PERÚ COMPRAS)</span>
                        <span
                          style={{
                            fontSize: '12px',
                            padding: '3px 10px',
                            background: 'rgba(37,99,235,0.25)',
                            color: '#60a5fa',
                            border: '1px solid #3b82f6',
                            fontWeight: 700,
                            borderRadius: 0,
                          }}
                        >
                          Requerimiento: {op.numeroRequerimiento}
                        </span>
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: 2 }}>
                        Al registrar estos datos oficiales y adjuntar el documento, la oportunidad pasará al estado <strong>Cotización</strong> y se <strong>habilitarán los pagos</strong>.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMostrarRegistrar(false)}
                    style={{
                      background: 'transparent',
                      border: '1.5px solid #475569',
                      color: '#cbd5e1',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      borderRadius: 0,
                    }}
                  >
                    <GoogleIcon name="close" size={18} color="#cbd5e1" />
                    <span>Cerrar Pantalla</span>
                  </button>
                </div>

                {/* CUERPO CENTRAL DE PANTALLA COMPLETA CON SCROLL */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    background: '#f8fafc',
                    padding: '28px 36px',
                  }}
                >
                  <div style={{ maxWidth: 1360, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Banner Informativo Superior */}
                    <div
                      style={{
                        background: '#eff6ff',
                        border: '1.5px solid #bfdbfe',
                        borderRadius: 0,
                        padding: '14px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <GoogleIcon name="info" size={22} color="#2563eb" />
                        <div style={{ fontSize: '13px', color: '#1e40af' }}>
                          <strong>Flujo Oficial:</strong> Este registro formaliza la adjudicación con la <strong>Orden de Compra emitida por Perú Compras</strong>. Al completar Folio, Expediente, OCAM y documento, se habilitarán las solicitudes de pago a proveedores y flete.
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: '12px', color: '#334155' }}>
                        <span>Entidad: <strong>{op.entidadConvocante || op.empresaRazonSocial || 'Entidad'}</strong></span>
                        <span>&bull;</span>
                        <span>Límite Cotizado: <strong>S/ {Number(op.limiteTotal).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong></span>
                      </div>
                    </div>

                    {/* Grid de 2 Columnas: Izquierda Resumen y Evidencias, Derecha Formulario de la OC */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(420px, 1.4fr)', gap: 24, alignItems: 'start' }}>

                      {/* COLUMNA IZQUIERDA: Resumen de Requerimiento y Documento Oficial */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Card: Resumen del Requerimiento */}
                        <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: 0, padding: 20 }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <GoogleIcon name="description" size={16} color="#2563eb" />
                            <span>Detalle del Requerimiento</span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                            <div>
                              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>N° Requerimiento:</span>
                              <strong style={{ fontSize: '14px', color: '#0f172a' }}>{op.numeroRequerimiento}</strong>
                            </div>
                            <div>
                              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>Estado Actual:</span>
                              <span style={{ padding: '2px 8px', background: '#ecfdf5', color: '#059669', fontWeight: 700, fontSize: '12px' }}>
                                {op.estado}
                              </span>
                            </div>
                            <div>
                              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>Entidad Convocante:</span>
                              <span style={{ fontSize: '12.5px', color: '#1e293b', fontWeight: 600 }}>{op.entidadConvocante || op.empresaRazonSocial || 'No especificada'}</span>
                            </div>
                            <div>
                              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>Límite Total:</span>
                              <strong style={{ fontSize: '14px', color: '#059669' }}>S/ {Number(op.limiteTotal).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong>
                            </div>
                          </div>

                          {/* Items del Requerimiento */}
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
                            Productos a Atender ({op.items?.length || 0})
                          </div>
                          <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #e2e8f0' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                              <thead>
                                <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                                  <th style={{ padding: '6px 8px' }}>N° Parte</th>
                                  <th style={{ padding: '6px 8px' }}>Cant</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Límite</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(op.items || []).map((it) => (
                                  <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{it.numeroParte}</td>
                                    <td style={{ padding: '6px 8px' }}>{it.cantidad}</td>
                                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>S/ {Number(it.limiteUnitario).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Card: Documento Oficial de Perú Compras */}
                        <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: 0, padding: 20 }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <GoogleIcon name="attach_file" size={16} color="#059669" />
                            <span>3. Documento Oficial de Perú Compras *</span>
                          </div>
                          <p style={{ fontSize: '11.5px', color: '#64748b', margin: '0 0 14px' }}>
                            Requisito obligatorio para habilitar las solicitudes de pago de proveedor y transporte.
                          </p>

                          <div
                            style={{
                              border: '2px dashed #94a3b8',
                              background: '#f8fafc',
                              padding: 20,
                              textAlign: 'center',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 10,
                            }}
                          >
                            <input
                              type="file"
                              id={`archivo-oc-fullscreen-${op.id}`}
                              accept=".pdf,image/*"
                              multiple
                              onChange={handleAgregarDocsOC}
                              disabled={documentosPool.length >= MAX_DOCS_OC}
                              style={{ display: 'none' }}
                            />
                            <GoogleIcon name="cloud_upload" size={40} color="#2563eb" />
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                              {documentosPool.length > 0
                                ? `${documentosPool.length} de ${MAX_DOCS_OC} documento(s) adjunto(s)`
                                : `Adjunta hasta ${MAX_DOCS_OC} documentos de la Orden de Compra`}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                              Formatos soportados: <strong>PDF, JPG, PNG</strong> · máximo {MAX_DOCS_OC} archivos
                            </div>
                            <label
                              htmlFor={`archivo-oc-fullscreen-${op.id}`}
                              style={{
                                padding: '9px 18px',
                                background: documentosPool.length >= MAX_DOCS_OC ? '#94a3b8' : '#0f172a',
                                color: '#ffffff',
                                fontSize: '12.5px',
                                fontWeight: 700,
                                cursor: documentosPool.length >= MAX_DOCS_OC ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                borderRadius: 0,
                                marginTop: 6,
                              }}
                            >
                              <GoogleIcon name="upload_file" size={16} color="#ffffff" />
                              <span>{documentosPool.length >= MAX_DOCS_OC ? 'Máximo alcanzado' : 'Examinar Documentos'}</span>
                            </label>
                          </div>

                          {documentosPool.length > 0 && (
                            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {documentosPool.map((doc, idx) => {
                                const visual = getDocumentoVisualProps(doc.nombre, doc.tipo);
                                return (
                                  <div
                                    key={doc.id || idx}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: 8,
                                      padding: '7px 10px',
                                      background: '#f8fafc',
                                      border: '1px solid #e2e8f0',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                      <span style={{ width: 24, height: 24, borderRadius: 3, background: visual.badgeBg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <GoogleIcon name={visual.icon} size={14} color={visual.color} />
                                      </span>
                                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 220 }} title={doc.nombre}>
                                        {doc.nombre}
                                      </span>
                                      {doc.tamanoTexto && <span style={{ fontSize: '11px', color: '#94a3b8' }}>({doc.tamanoTexto})</span>}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <button
                                        type="button"
                                        onClick={() => setDocParaVer({ nombre: doc.nombre, url: doc.url, tipo: doc.tipo })}
                                        style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', padding: '3px 8px', cursor: 'pointer', fontWeight: 700, fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                      >
                                        <GoogleIcon name="visibility" size={13} color="#2563eb" /> Ver
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleQuitarDocOC(doc.id)}
                                        style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', padding: '3px 8px', cursor: 'pointer', fontWeight: 700, fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                      >
                                        <GoogleIcon name="delete" size={13} color="#dc2626" /> Quitar
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                              <div style={{ padding: 10, background: '#f0fdf4', border: '1px solid #86efac', display: 'flex', alignItems: 'center', gap: 8, fontSize: '12px', color: '#166534' }}>
                                <GoogleIcon name="verified" size={18} color="#16a34a" />
                                <span>Documento(s) listo(s). Se habilitarán los pagos al guardar.</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* COLUMNA DERECHA: Formulario de Datos Emitidos y OCAM */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Card: Datos de la Orden de Compra Emitida */}
                        <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: 0, padding: 20 }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <GoogleIcon name="receipt" size={16} color="#2563eb" />
                            <span>1. Datos de la Orden de Compra Emitida</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <Field label="N° de Orden de Compra *" value={
                              <input style={{ ...inputStyle, borderRadius: 0, padding: '11px 12px' }} placeholder="OC-2026-0000001" value={formOC.numeroOC} onChange={(e) => setFormOC({ ...formOC, numeroOC: e.target.value })} />
                            } />
                            <Field label="Fecha y hora de emisión" value={
                              <input type="datetime-local" style={{ ...inputStyle, borderRadius: 0, padding: '11px 12px' }} value={formOC.fechaEmisionOC} onChange={(e) => setFormOC({ ...formOC, fechaEmisionOC: e.target.value })} />
                            } />
                          </div>
                        </div>

                        {/* Card: Datos de la OCAM (Perú Compras) */}
                        <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: 0, padding: 20 }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <GoogleIcon name="verified" size={16} color="#059669" />
                            <span>2. Datos de la OCAM (Perú Compras)</span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                            <Field label="N° OCAM *" value={
                              <input style={{ ...inputStyle, borderRadius: 0, padding: '11px 12px' }} placeholder="OCAM-2026-000001234" value={formOC.nroOCAM} onChange={(e) => setFormOC({ ...formOC, nroOCAM: e.target.value })} />
                            } />
                            <Field label="N° Expediente *" value={
                              <input style={{ ...inputStyle, borderRadius: 0, padding: '11px 12px' }} placeholder="EE-2026-0000001" value={formOC.nroExpediente} onChange={(e) => setFormOC({ ...formOC, nroExpediente: e.target.value })} />
                            } />
                            <Field label="N° de Folio *" value={
                              <input style={{ ...inputStyle, borderRadius: 0, padding: '11px 12px' }} placeholder="FOLIO-001" value={formOC.nroFolio} onChange={(e) => setFormOC({ ...formOC, nroFolio: e.target.value })} />
                            } />
                            <Field label="Código de Unidad Ejecutora (U.O.E.) *" value={
                              <input style={{ ...inputStyle, borderRadius: 0, padding: '11px 12px' }} placeholder="Ej: 001-1234" value={formOC.codigoUnidadEjecutora} onChange={(e) => setFormOC({ ...formOC, codigoUnidadEjecutora: e.target.value })} />
                            } />
                            <Field label="Código CIAF *" value={
                              <input style={{ ...inputStyle, borderRadius: 0, padding: '11px 12px' }} placeholder="CIAF-2026-000001" value={formOC.codigoCIAF} onChange={(e) => setFormOC({ ...formOC, codigoCIAF: e.target.value })} />
                            } />
                            <Field label="Monto OCAM / Techo Presupuestal (S/) *" value={
                              <>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={costoInicialRequerimiento > 0 ? costoInicialRequerimiento : undefined}
                                  style={{ ...inputStyle, borderRadius: 0, padding: '11px 12px', fontWeight: 800, color: '#059669', fontSize: '14px' }}
                                  placeholder="0.00"
                                  value={formOC.montoOCAM}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    // No permitir un monto mayor al límite total del requerimiento
                                    if (costoInicialRequerimiento > 0 && Number(val) > costoInicialRequerimiento) {
                                      flash(true, `El monto OCAM no puede superar el límite total (S/ ${costoInicialRequerimiento.toLocaleString('es-PE', { minimumFractionDigits: 2 })}).`);
                                      return;
                                    }
                                    setFormOC({ ...formOC, montoOCAM: val });
                                  }}
                                />
                                {costoInicialRequerimiento > 0 && (
                                  <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 600, padding: '4px 12px 6px', background: '#fffbeb' }}>
                                    Máximo permitido: S/ {costoInicialRequerimiento.toLocaleString('es-PE', { minimumFractionDigits: 2 })} (límite total)
                                  </div>
                                )}
                              </>
                            } />
                            <Field label="Flete (S/)" value={
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                style={{ ...inputStyle, borderRadius: 0, padding: '11px 12px', fontWeight: 700, color: '#0f172a', fontSize: '14px' }}
                                placeholder="0.00"
                                value={formOC.flete}
                                onChange={(e) => setFormOC({ ...formOC, flete: e.target.value })}
                              />
                            } />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BARRA INFERIOR FIJA DE ACCIONES */}
                <div
                  style={{
                    background: '#ffffff',
                    borderTop: '2px solid #e2e8f0',
                    padding: '16px 36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    * Todos los campos marcados son obligatorios para validar la buena pro oficial de Perú Compras.
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => setMostrarRegistrar(false)}
                      style={{
                        padding: '11px 22px',
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        color: '#475569',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        borderRadius: 0,
                      }}
                    >
                      Cancelar y Volver
                    </button>
                    <button
                      type="button"
                      disabled={registrarBusy}
                      onClick={handleRegistrarOC}
                      style={{
                        padding: '11px 26px',
                        background: '#059669',
                        border: 'none',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '13.5px',
                        cursor: registrarBusy ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        borderRadius: 0,
                        opacity: registrarBusy ? 0.6 : 1,
                      }}
                    >
                      <GoogleIcon name="save" size={18} color="#ffffff" />
                      <span>{registrarBusy ? 'Registrando y pasando a Cotización…' : 'Registrar OCAM y Pasar a Cotización'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMostrarRegistrar(true)}
                style={{ ...btn(accent), borderRadius: 0, alignSelf: 'flex-start' }}
              >
                <GoogleIcon name="receipt_long" size={15} color="#ffffff" />
                Registrar Orden de Compra Oficial (Perú Compras) y Pasar a Cotización
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
              onClick={() => {
                if (onSolicitarPago) {
                  onSolicitarPago(op);
                } else {
                  navigate(
                    `${roleBasePath}/pagos?tab=registrar&oc=${encodeURIComponent(
                      oc.numeroOC || oc.nroOCAM || op.numeroRequerimiento
                    )}`
                  );
                }
              }}
              style={{
                marginLeft: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 0,
                border: 'none',
                background: '#059669',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <GoogleIcon name="payments" size={14} color="#ffffff" />
              Solicitar Pagos (Proveedor / Flete)
            </button>
            <button
              type="button"
              onClick={() => setVerDetalle(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 0, border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
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

          {/* Decisión de la OC (solo Admin/Master: quien resuelve las licitaciones) */}
          {oc.estadoOC === 'OC_RECIBIDA' && esAdmin && (
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                Decisión de la Orden de Compra <span style={{ fontWeight: 600, color: '#94a3b8' }}>(rol Admin/Master)</span>
              </span>
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

          {/* Para no-admins: la decisión la toma Admin/Master */}
          {oc.estadoOC === 'OC_RECIBIDA' && !esAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 8, padding: '10px 12px', fontSize: '12.5px', color: '#1d4ed8' }}>
              <GoogleIcon name="admin_panel_settings" size={16} color="#2563eb" />
              <span>
                La <strong>decisión de la OC</strong> (aceptar o rechazar) la realiza el rol <strong>Admin/Master</strong> tras la buena pro. La ejecutiva registró los datos de la adjudicación.
              </span>
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

      <VerDocumentoModal documento={docParaVer} onClose={() => setDocParaVer(null)} />

      <DetalleOCModal open={verDetalle} onClose={() => setVerDetalle(false)} op={op} />
    </div>
  );
};
