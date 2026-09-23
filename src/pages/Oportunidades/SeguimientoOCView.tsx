import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { GoogleIcon } from '../../components/GoogleIcon';
import { useAuth } from '../../context/AuthContext';
import { isOportunidadOwner } from '../../utils/oportunidadUtils';
import type { Oportunidad } from '../../types/oportunidades';
import { getOportunidadesApi } from '../../api/services/oportunidades.service';
import { mapApiToOportunidad } from '../../hooks/useOportunidades';
import { OCPanel, OC_ESTADO_CONFIG, OC_STATES } from './OCPanel';
import { formatFechaHoraPeru } from '../../utils/dateUtils';

type FiltroOC = 'todas' | 'activas' | 'pendientes' | 'aceptadas' | 'rechazadas' | 'entregadas' | 'por-registrar';

const FILTROS: { id: FiltroOC; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'por-registrar', label: 'Por registrar' },
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'aceptadas', label: 'Aceptadas' },
  { id: 'entregadas', label: 'Entregadas' },
  { id: 'activas', label: 'Activas' },
  { id: 'rechazadas', label: 'Rechazadas' },
];

interface SeguimientoOCProps {
  roleAccent?: string;
}

export const SeguimientoOCView: React.FC<SeguimientoOCProps> = ({ roleAccent = '#06b6d4' }) => {
  const { empleado } = useAuth();
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FiltroOC>('todas');
  const [busqueda, setBusqueda] = useState('');
  const [expandId, setExpandId] = useState<string | number | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOportunidadesApi();
      if (Array.isArray(data)) {
        setOportunidades(data.map(mapApiToOportunidad));
      }
    } catch {
      // Backend no disponible
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleEstadoCambiado = useCallback((opActualizada: Oportunidad) => {
    setOportunidades((prev) => prev.map((op) => (op.id === opActualizada.id ? opActualizada : op)));
  }, []);

  // Oportunidades que entran al seguimiento OC: tienen OC o están Adjudicadas (por registrar)
  const conOC = useMemo(
    () =>
      oportunidades.filter(
        (op) => op.ordenCompra || op.estado === 'Adjudicada' || OC_STATES.includes((op.estado as string) as any)
      ),
    [oportunidades]
  );

  const esActiva = (op: Oportunidad) => op.estado === 'OC_RECIBIDA' || op.estado === 'OC_ACEPTADA';

  const filtradas = useMemo(() => {
    let lista = conOC;
    switch (filtro) {
      case 'activas':
        lista = lista.filter(esActiva);
        break;
      case 'pendientes':
        lista = lista.filter((op) => op.estado === 'OC_RECIBIDA');
        break;
      case 'aceptadas':
        lista = lista.filter((op) => op.estado === 'OC_ACEPTADA');
        break;
      case 'rechazadas':
        lista = lista.filter((op) => op.estado === 'OC_RECHAZADA');
        break;
      case 'entregadas':
        lista = lista.filter((op) => op.estado === 'ENTREGADA');
        break;
      case 'por-registrar':
        lista = lista.filter((op) => !op.ordenCompra && op.estado === 'Adjudicada');
        break;
      default:
        break;
    }
    const q = busqueda.trim().toLowerCase();
    if (q) {
      lista = lista.filter(
        (op) =>
          op.numeroRequerimiento.toLowerCase().includes(q) ||
          (op.ordenCompra?.numeroOC ?? '').toLowerCase().includes(q) ||
          (op.empresaRazonSocial ?? '').toLowerCase().includes(q)
      );
    }
    return [...lista].sort((a, b) => {
      const fa = a.ordenCompra?.fechaRegistro || a.fechaRegistro || '';
      const fb = b.ordenCompra?.fechaRegistro || b.fechaRegistro || '';
      return fb.localeCompare(fa);
    });
  }, [conOC, filtro, busqueda]);

  const conteos = useMemo(() => {
    const activas = conOC.filter(esActiva).length;
    const pendientes = conOC.filter((op) => op.estado === 'OC_RECIBIDA').length;
    const aceptadas = conOC.filter((op) => op.estado === 'OC_ACEPTADA').length;
    const rechazadas = conOC.filter((op) => op.estado === 'OC_RECHAZADA').length;
    const entregadas = conOC.filter((op) => op.estado === 'ENTREGADA').length;
    const porRegistrar = conOC.filter((op) => !op.ordenCompra && op.estado === 'Adjudicada').length;
    const margen = conOC.reduce((acc, op) => acc + (Number(op.ordenCompra?.margenAdicional) || 0), 0);
    return { todas: conOC.length, activas, pendientes, aceptadas, rechazadas, entregadas, porRegistrar, margen };
  }, [conOC]);

  const estadoBadge = (op: Oportunidad) => {
    const oc = op.ordenCompra;
    if (oc) {
      const cfg = OC_ESTADO_CONFIG[oc.estadoOC];
      return { color: cfg?.color ?? '#64748b', bg: cfg?.bg ?? '#f1f5f9', icon: cfg?.icon ?? 'receipt', label: cfg?.label ?? oc.estadoOC };
    }
    return { color: '#059669', bg: '#d1fae5', icon: 'verified', label: op.estado };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: `${roleAccent}15`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <GoogleIcon name="local_shipping" size={20} color={roleAccent} />
          </span>
          <div>
            <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#0f172a' }}>Seguimiento de Órdenes de Compra</h2>
            <span style={{ fontSize: '12.5px', color: '#64748b' }}>Recepción, decisión, renegociación y entrega.</span>
          </div>
        </div>
        <button
          type="button"
          onClick={cargar}
          disabled={loading}
          title="Actualizar"
          style={{ width: 38, height: 38, borderRadius: 10, border: `1.5px solid ${roleAccent}40`, background: '#ffffff', color: roleAccent, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <GoogleIcon name="refresh" size={18} color={roleAccent} />
        </button>
      </div>

      {/* Filtros + búsqueda + margen */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTROS.map((f) => {
            const isActivo = filtro === f.id;
            const n = (conteos as any)[f.id] ?? 0;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltro(f.id)}
                style={{
                  padding: '6px 11px', borderRadius: 18, border: `1.5px solid ${isActivo ? roleAccent : '#e2e8f0'}`,
                  background: isActivo ? `${roleAccent}12` : '#ffffff', color: isActivo ? roleAccent : '#64748b',
                  fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                {f.label}
                <span style={{ background: isActivo ? roleAccent : '#f1f5f9', color: isActivo ? '#ffffff' : '#94a3b8', borderRadius: 10, padding: '0 6px', fontSize: '11px', fontWeight: 700 }}>
                  {n}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '12.5px', color: '#64748b' }}>
            Margen adicional <strong style={{ color: '#059669' }}>S/ {conteos.margen.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong>
          </span>
          <div style={{ position: 'relative' }}>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar requerimiento, N° OC o empresa…"
              style={{ padding: '8px 12px 8px 32px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: '12.5px', width: 260, outline: 'none', boxSizing: 'border-box' }}
            />
            <span style={{ position: 'absolute', left: 9, top: 8 }}>
              <GoogleIcon name="search" size={16} color="#94a3b8" />
            </span>
          </div>
        </div>
      </div>

      {/* Listado */}
      {loading && conOC.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: '13px' }}>Cargando órdenes de compra…</div>
      ) : filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, background: '#f8fafc', borderRadius: 14, border: '1.5px dashed #e2e8f0', color: '#94a3b8', fontSize: '13px' }}>
          No hay órdenes de compra que coincidan con este filtro.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtradas.map((op) => {
            const badge = estadoBadge(op);
            const isOwner = isOportunidadOwner(op, empleado);
            const expandida = expandId === op.id;
            return (
              <div
                key={op.id}
                style={{ background: '#ffffff', border: `1.5px solid ${expandida ? `${roleAccent}55` : '#f1f5f9'}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color .15s' }}
              >
                {/* Fila resumen */}
                <div
                  role="button"
                  aria-expanded={expandida}
                  title={expandida ? 'Ocultar detalle' : 'Ver detalle de la OC'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer', flexWrap: 'wrap',
                    background: expandida ? '#f8fafc' : undefined, transition: 'background .15s',
                  }}
                  onClick={() => setExpandId(expandida ? null : op.id)}
                >
                  <span style={{ background: badge.bg, color: badge.color, fontWeight: 700, fontSize: '11px', padding: '4px 10px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <GoogleIcon name={badge.icon} size={12} color={badge.color} /> {badge.label}
                  </span>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>{op.numeroRequerimiento}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: 2 }}>
                      {op.ordenCompra ? `N° OC ${op.ordenCompra.numeroOC}` : 'OC por registrar'} · {op.empresaRazonSocial || op.entidadConvocante || 'Sin empresa'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {op.ordenCompra && (
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#059669' }}>
                        S/ {(Number(op.ordenCompra.margenAdicional) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 2 }}>
                      {op.ordenCompra?.fechaRegistro ? formatFechaHoraPeru(op.ordenCompra.fechaRegistro, { dateStyle: 'medium' }) : '—'}
                    </div>
                  </div>
                  <GoogleIcon name={expandida ? 'expand_less' : 'expand_more'} size={20} color={expandida ? roleAccent : '#94a3b8'} />
                </div>

                {/* Panel de operaciones expandible */}
                {expandida && (
                  <div style={{ padding: '14px 16px', borderTop: '1px solid #f1f5f9' }}>
                    <OCPanel op={op} isOwner={isOwner} accent={roleAccent} onEstadoCambiado={handleEstadoCambiado} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
