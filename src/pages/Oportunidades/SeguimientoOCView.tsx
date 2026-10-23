import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { GoogleIcon } from '../../components/GoogleIcon';
import { useAuth } from '../../context/AuthContext';
import { isOportunidadOwner } from '../../utils/oportunidadUtils';
import type { Oportunidad } from '../../types/oportunidades';
import { getOportunidadesApi } from '../../api/services/oportunidades.service';
import { mapApiToOportunidad } from '../../hooks/useOportunidades';
import { OCPanel, OC_ESTADO_CONFIG, OC_STATES, DetalleOCModal } from './OCPanel';
import { formatFechaHoraPeru } from '../../utils/dateUtils';
import { RegistrarOCScreen } from './RegistrarOCScreen';
import { RegistrarPagoView } from '../Admin/Pagos/RegistrarPagoView';
import './RegistroOportunidad.css';
import './SeguimientoOC.css';

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

function generatePageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | string)[] = [];
  pages.push(1);
  if (current > 3) {
    pages.push('...');
  }
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  if (current < total - 2) {
    pages.push('...');
  }
  pages.push(total);
  return pages;
}

interface SeguimientoOCProps {
  roleAccent?: string;
}

export const SeguimientoOCView: React.FC<SeguimientoOCProps> = ({ roleAccent = '#2563eb' }) => {
  const { empleado } = useAuth();
  const esAdminOC =
    empleado?.rolNombre === 'Administrador' ||
    empleado?.rolNombre === 'SysAdmin' ||
    empleado?.rolNombre === 'Ejecutivo(a) Master Ventas';

  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FiltroOC>('todas');
  const [busqueda, setBusqueda] = useState('');
  const [detalleOp, setDetalleOp] = useState<Oportunidad | null>(null);

  // Estados de navegación dedicada (pantallas completas)
  const [opParaRegistrar, setOpParaRegistrar] = useState<Oportunidad | null>(null);
  const [opParaGestionar, setOpParaGestionar] = useState<Oportunidad | null>(null);
  const [opParaSolicitarPago, setOpParaSolicitarPago] = useState<Oportunidad | null>(null);

  // Estados de paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);

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
          (op.empresaRazonSocial ?? '').toLowerCase().includes(q) ||
          (op.entidadConvocante ?? '').toLowerCase().includes(q)
      );
    }
    return [...lista].sort((a, b) => {
      const fa = a.ordenCompra?.fechaRegistro || a.fechaRegistro || '';
      const fb = b.ordenCompra?.fechaRegistro || b.fechaRegistro || '';
      return fb.localeCompare(fa);
    });
  }, [conOC, filtro, busqueda]);

  // Al cambiar de filtro o búsqueda, volver a la página 1
  useEffect(() => {
    setPaginaActual(1);
  }, [filtro, busqueda]);

  // Cálculo de paginación
  const totalRegistros = filtradas.length;
  const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina) || 1;

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
    }
  }, [paginaActual, totalPaginas]);

  const indiceInicio = (paginaActual - 1) * registrosPorPagina;
  const indiceFin = Math.min(indiceInicio + registrosPorPagina, totalRegistros);
  const itemsPaginados = useMemo(() => {
    return filtradas.slice(indiceInicio, indiceFin);
  }, [filtradas, indiceInicio, indiceFin]);

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
      return {
        color: cfg?.color ?? '#64748b',
        bg: cfg?.bg ?? '#f1f5f9',
        icon: cfg?.icon ?? 'receipt',
        label: cfg?.label ?? oc.estadoOC,
      };
    }
    return { color: '#059669', bg: '#d1fae5', icon: 'verified', label: op.estado };
  };

  // ── 1. VISTA DEDICADA DE REGISTRO DE ORDEN DE COMPRA (PANTALLA COMPLETA) ──
  if (opParaRegistrar) {
    return (
      <RegistrarOCScreen
        op={opParaRegistrar}
        roleAccent={roleAccent}
        onBack={() => setOpParaRegistrar(null)}
        onSuccess={(opActualizada) => {
          handleEstadoCambiado(opActualizada);
          setOpParaRegistrar(null);
        }}
      />
    );
  }

  // ── 2. VISTA DEDICADA DE GESTIÓN DE ORDEN DE COMPRA (OPERACIONES) ──
  if (opParaGestionar) {
    const isOwner = isOportunidadOwner(opParaGestionar, empleado);
    return (
      <div className="reg-listado-container">
        {/* Banner Superior Estilo reg-hero */}
        <div className="reg-hero">
          <div className="reg-hero__left">
            <div className="reg-hero__badge-icon" style={{ background: `${roleAccent}15` }}>
              <GoogleIcon name="tune" size={28} color={roleAccent} />
            </div>
            <div className="reg-hero__title">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1>Gestión Operativa de Orden de Compra</h1>
                <span className="reg-pill-express">
                  {opParaGestionar.numeroRequerimiento}
                </span>
              </div>
              <p>
                Entidad: <strong>{opParaGestionar.entidadConvocante || opParaGestionar.empresaRazonSocial || 'No especificada'}</strong> &bull; Límite Total: <strong>S/ {Number(opParaGestionar.limiteTotal).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              className="reg-hero__tag"
              style={{ background: `${roleAccent}12`, color: roleAccent, border: `1.5px solid ${roleAccent}30` }}
            >
              <GoogleIcon name="verified_user" size={15} color={roleAccent} />
              <span>VENTAS &bull; PERÚ COMPRAS</span>
            </div>
            <button
              type="button"
              onClick={() => setOpParaGestionar(null)}
              className="reg-btn-cancel-flat"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: 4,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <GoogleIcon name="arrow_back" size={16} />
              <span>Volver al Listado</span>
            </button>
          </div>
        </div>

        {/* Panel de Gestión en Tarjeta reg-card */}
        <div className="reg-card">
          <OCPanel
            op={opParaGestionar}
            isOwner={isOwner}
            esAdmin={esAdminOC}
            accent={roleAccent}
            onEstadoCambiado={(opAct) => {
              handleEstadoCambiado(opAct);
              setOpParaGestionar(opAct);
            }}
            onSolicitarPago={(op) => {
              setOpParaGestionar(null);
              setOpParaSolicitarPago(op);
            }}
          />
        </div>
      </div>
    );
  }

  // ── 3. VISTA DEDICADA DE SOLICITUD DE PAGOS DE LA OC (PANTALLA COMPLETA) ──
  if (opParaSolicitarPago) {
    const ocIdentificador =
      opParaSolicitarPago.ordenCompra?.numeroOC ||
      opParaSolicitarPago.ordenCompra?.nroOCAM ||
      opParaSolicitarPago.numeroRequerimiento;

    return (
      <div className="reg-listado-container">
        {/* Banner Superior Estilo reg-hero */}
        <div className="reg-hero">
          <div className="reg-hero__left">
            <div className="reg-hero__badge-icon" style={{ background: 'rgba(5, 150, 105, 0.12)' }}>
              <GoogleIcon name="payments" size={28} color="#059669" />
            </div>
            <div className="reg-hero__title">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1>Solicitud de Pagos de Orden de Compra</h1>
                <span className="reg-pill-express" style={{ background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }}>
                  {opParaSolicitarPago.numeroRequerimiento}
                </span>
                {opParaSolicitarPago.ordenCompra?.numeroOC && (
                  <span className="reg-pill-express">
                    OC: {opParaSolicitarPago.ordenCompra.numeroOC}
                  </span>
                )}
              </div>
              <p>
                Entidad: <strong>{opParaSolicitarPago.entidadConvocante || opParaSolicitarPago.empresaRazonSocial || 'No especificada'}</strong> &bull; Techo OCAM: <strong>S/ {Number(opParaSolicitarPago.ordenCompra?.montoOCAM || opParaSolicitarPago.limiteTotal).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              className="reg-hero__tag"
              style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669', border: '1.5px solid rgba(5, 150, 105, 0.25)' }}
            >
              <GoogleIcon name="account_balance_wallet" size={15} color="#059669" />
              <span>GESTIÓN DE PAGOS &bull; PROVEEDORES Y FLETE</span>
            </div>
            <button
              type="button"
              onClick={() => setOpParaSolicitarPago(null)}
              className="reg-btn-cancel-flat"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: 4,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <GoogleIcon name="arrow_back" size={16} />
              <span>Volver al Listado</span>
            </button>
          </div>
        </div>

        {/* Formulario de Pago dentro de Tarjeta Corporativa */}
        <div className="reg-card" style={{ padding: 0, overflow: 'hidden' }}>
          <RegistrarPagoView
            oportunidades={oportunidades}
            roleAccent={roleAccent}
            preselectedOC={ocIdentificador}
            onPagoRegistrado={(_nuevoPago) => {
              cargar();
              setOpParaSolicitarPago(null);
            }}
            onCancelar={() => setOpParaSolicitarPago(null)}
          />
        </div>
      </div>
    );
  }

  // ── 4. VISTA PRINCIPAL: LISTADO Y TABLA CORPORATIVA ESTILO EXACTO DEL SISTEMA ──
  return (
    <div className="reg-listado-container">
      {/* ── Banner Superior Dinámico (.reg-hero) ── */}
      <div className="reg-hero">
        <div className="reg-hero__left">
          <div className="reg-hero__badge-icon" style={{ background: `${roleAccent}15` }}>
            <GoogleIcon name="local_shipping" size={28} color={roleAccent} />
          </div>
          <div className="reg-hero__title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1>Seguimiento de Órdenes de Compra</h1>
              <span className="reg-pill-express">{conOC.length} Órdenes</span>
            </div>
            <p>
              Plataforma de Acuerdos Marco &bull; Catálogo Perú Compras &bull; Control OCAM y Seguimiento de Entrega
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            className="reg-hero__tag"
            style={{ background: `${roleAccent}12`, color: roleAccent, border: `1.5px solid ${roleAccent}30` }}
          >
            <GoogleIcon name="verified_user" size={15} color={roleAccent} />
            <span>VENTAS &bull; PERÚ COMPRAS</span>
          </div>

          <button
            type="button"
            onClick={cargar}
            disabled={loading}
            title="Actualizar listado"
            className="reg-btn-cancel-flat"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: 4,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <GoogleIcon name="refresh" size={16} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* ── Tarjetas Métricas Rápidas (.reg-kpis-grid) ── */}
      <div className="reg-kpis-grid">
        <div className="reg-kpi-card">
          <div className="reg-kpi-icon" style={{ background: `${roleAccent}15`, color: roleAccent }}>
            <GoogleIcon name="table_chart" size={22} color={roleAccent} />
          </div>
          <div>
            <div className="reg-kpi-label">Total Órdenes</div>
            <div className="reg-kpi-value">{conOC.length}</div>
            <div className="reg-kpi-sub">En seguimiento activo</div>
          </div>
        </div>

        <div className="reg-kpi-card">
          <div className="reg-kpi-icon" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04' }}>
            <GoogleIcon name="pending_actions" size={22} color="#ca8a04" />
          </div>
          <div>
            <div className="reg-kpi-label">Por Registrar</div>
            <div className="reg-kpi-value">{conteos.porRegistrar}</div>
            <div className="reg-kpi-sub">Adjudicadas sin OCAM</div>
          </div>
        </div>

        <div className="reg-kpi-card">
          <div className="reg-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#059669' }}>
            <GoogleIcon name="verified_user" size={22} color="#059669" />
          </div>
          <div>
            <div className="reg-kpi-label">OC Aceptadas</div>
            <div className="reg-kpi-value">{conteos.aceptadas}</div>
            <div className="reg-kpi-sub">En proceso de entrega</div>
          </div>
        </div>

        <div className="reg-kpi-card">
          <div className="reg-kpi-icon" style={{ background: 'rgba(5, 150, 105, 0.15)', color: '#059669' }}>
            <GoogleIcon name="savings" size={22} color="#059669" />
          </div>
          <div>
            <div className="reg-kpi-label">Margen Adicional</div>
            <div className="reg-kpi-value" style={{ fontSize: '20px', color: '#059669' }}>
              S/ {conteos.margen.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="reg-kpi-sub">Ganancia renegociada total</div>
          </div>
        </div>
      </div>

      {/* ── Tarjeta Principal del Listado (.reg-card) ── */}
      <div className="reg-card">
        {/* Barra de Filtros y Búsqueda (.reg-list-toolbar) */}
        <div className="reg-list-toolbar" style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'stretch' }}>
          {/* Fila Superior: Buscador */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div className="reg-search-box" style={{ margin: 0, flex: '1 1 320px', maxWidth: 'none' }}>
              <GoogleIcon name="manage_search" size={18} color="#94a3b8" />
              <input
                type="text"
                placeholder="Buscar por requerimiento, N° OC o entidad convocante..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="reg-search-input"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <GoogleIcon name="close" size={14} color="#94a3b8" />
                </button>
              )}
            </div>
          </div>

          {/* Fila Inferior: Chips de Filtro de Estado */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div className="reg-filter-pills">
              {FILTROS.map((f) => {
                const isActivo = filtro === f.id;
                const n = (conteos as any)[f.id] ?? 0;
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={`reg-filter-chip ${isActivo ? 'active' : ''}`}
                    onClick={() => setFiltro(f.id)}
                    style={
                      isActivo
                        ? { background: roleAccent, color: '#ffffff', borderColor: roleAccent }
                        : undefined
                    }
                  >
                    <span>{f.label} ({n})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Tabla de Datos (.reg-table-wrapper y .reg-table) ── */}
        {loading && conOC.length === 0 ? (
          <div className="reg-empty-history">
            <GoogleIcon name="hourglass_top" size={40} color="#94a3b8" />
            <p>Cargando órdenes de compra en seguimiento…</p>
          </div>
        ) : filtradas.length === 0 ? (
          <div className="reg-empty-history">
            <GoogleIcon name="inbox" size={40} color="#94a3b8" />
            <p>No se encontraron órdenes de compra que coincidan con este filtro o búsqueda.</p>
          </div>
        ) : (
          <div className="reg-table-wrapper">
            <table className="reg-table">
              <thead>
                <tr>
                  <th>N° Requerimiento</th>
                  <th>Entidad Convocante</th>
                  <th style={{ textAlign: 'right' }}>Límite Total</th>
                  <th>N° Orden de Compra</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Margen Adicional</th>
                  <th>Fecha</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {itemsPaginados.map((op) => {
                  const badge = estadoBadge(op);
                  const tieneOC = !!op.ordenCompra;
                  const fechaTexto = op.ordenCompra?.fechaEmisionOC
                    ? formatFechaHoraPeru(op.ordenCompra.fechaEmisionOC, { dateStyle: 'short' })
                    : op.ordenCompra?.fechaRegistro
                    ? formatFechaHoraPeru(op.ordenCompra.fechaRegistro, { dateStyle: 'short' })
                    : op.fechaRegistro
                    ? formatFechaHoraPeru(op.fechaRegistro, { dateStyle: 'short' })
                    : '—';

                  return (
                    <tr key={op.id}>
                      {/* Requerimiento */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className="reg-badge-req">
                            <GoogleIcon name="assignment" size={13} color={roleAccent} />
                            <strong>{op.numeroRequerimiento}</strong>
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {op.items?.length || 0} {op.items?.length === 1 ? 'producto' : 'productos'}
                          </span>
                        </div>
                      </td>

                      {/* Entidad Convocante */}
                      <td>
                        <div className="reg-cell-empresa">
                          <span className="empresa-name" title={op.entidadConvocante || op.empresaRazonSocial || 'No especificada'}>
                            {op.entidadConvocante || op.empresaRazonSocial || 'No especificada'}
                          </span>
                          {op.empresaRuc && (
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                              RUC: {op.empresaRuc}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Límite Total */}
                      <td style={{ textAlign: 'right' }}>
                        <span className="reg-limite-total" style={{ color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                          S/ {Number(op.limiteTotal).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* N° Orden de Compra */}
                      <td>
                        {op.ordenCompra?.numeroOC ? (
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '12px',
                              color: '#0369a1',
                              background: '#e0f2fe',
                              padding: '3px 8px',
                              borderRadius: 4,
                              display: 'inline-block',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {op.ordenCompra.numeroOC}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '11.5px',
                              color: '#b45309',
                              background: '#fef3c7',
                              border: '1px solid #fde68a',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontWeight: 700,
                              display: 'inline-block',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Por registrar
                          </span>
                        )}
                      </td>

                      {/* Estado */}
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 10px',
                            borderRadius: 20,
                            fontSize: '11.5px',
                            fontWeight: 700,
                            background: badge.bg,
                            color: badge.color,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <GoogleIcon name={badge.icon} size={13} color={badge.color} />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Margen Adicional */}
                      <td style={{ textAlign: 'right' }}>
                        {op.ordenCompra && Number(op.ordenCompra.margenAdicional) > 0 ? (
                          <span style={{ color: '#059669', fontWeight: 700, fontSize: '12.5px', fontVariantNumeric: 'tabular-nums' }}>
                            + S/ {Number(op.ordenCompra.margenAdicional).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>
                        )}
                      </td>

                      {/* Fecha */}
                      <td>
                        <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {fechaTexto}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td style={{ textAlign: 'center' }}>
                        {!tieneOC ? (
                          <button
                            type="button"
                            onClick={() => setOpParaRegistrar(op)}
                            title="Registrar Orden de Compra Oficial (Perú Compras)"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 5,
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: '#059669',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <GoogleIcon name="add_circle" size={14} color="#059669" />
                            <span>Registrar OC</span>
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setOpParaSolicitarPago(op)}
                              title="Solicitar Pago para esta Orden de Compra (Proveedor, Transporte o Producto Individual)"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                                background: 'rgba(5, 150, 105, 0.1)',
                                color: '#059669',
                                border: '1px solid rgba(5, 150, 105, 0.3)',
                                padding: '5px 9px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <GoogleIcon name="payments" size={13} color="#059669" />
                              <span>Solicitar Pago</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setOpParaGestionar(op)}
                              title="Gestionar Orden de Compra"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                                background: 'rgba(2, 132, 199, 0.1)',
                                color: '#0284c7',
                                border: '1px solid rgba(2, 132, 199, 0.25)',
                                padding: '5px 9px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <GoogleIcon name="tune" size={13} color="#0284c7" />
                              <span>Gestionar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDetalleOp(op)}
                              title="Ver detalle completo de la OC"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                                background: 'rgba(99, 102, 241, 0.09)',
                                color: '#4f46e5',
                                border: '1px solid rgba(99, 102, 241, 0.22)',
                                padding: '5px 9px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <GoogleIcon name="open_in_full" size={13} color="#4f46e5" />
                              <span>Detalle</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Controles de Paginación (.reg-pagination-bar) ── */}
        {filteredOportunidadesLengthSafe(totalRegistros) && (
          <div className="reg-pagination-bar">
            <div className="reg-pagination-info">
              Mostrando <strong>{totalRegistros === 0 ? 0 : indiceInicio + 1}</strong> - <strong>{indiceFin}</strong> de <strong>{totalRegistros}</strong> {totalRegistros === 1 ? 'orden' : 'órdenes'}

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 14 }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Por página:</span>
                <select
                  value={registrosPorPagina}
                  onChange={(e) => {
                    setRegistrosPorPagina(Number(e.target.value));
                    setPaginaActual(1);
                  }}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 4,
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    background: '#ffffff',
                    color: '#334155',
                    fontWeight: 600,
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>

            {totalPaginas > 1 && (
              <div className="reg-pagination-controls">
                <button
                  type="button"
                  className="reg-page-btn nav-btn"
                  disabled={paginaActual <= 1}
                  onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                  title="Página anterior"
                >
                  <GoogleIcon name="chevron_left" size={16} />
                  <span>Anterior</span>
                </button>

                <div className="reg-page-numbers">
                  {generatePageNumbers(paginaActual, totalPaginas).map((p, idx) => {
                    if (typeof p === 'string') {
                      return (
                        <span key={`dots-${idx}`} className="reg-page-ellipsis">
                          …
                        </span>
                      );
                    }
                    const isCurrent = p === paginaActual;
                    return (
                      <button
                        key={p}
                        type="button"
                        className={`reg-page-btn ${isCurrent ? 'active' : ''}`}
                        style={
                          isCurrent
                            ? { background: roleAccent, color: '#ffffff', borderColor: roleAccent }
                            : undefined
                        }
                        onClick={() => setPaginaActual(p)}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="reg-page-btn nav-btn"
                  disabled={paginaActual >= totalPaginas}
                  onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                  title="Página siguiente"
                >
                  <span>Siguiente</span>
                  <GoogleIcon name="chevron_right" size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Detalle */}
      <DetalleOCModal open={!!detalleOp} onClose={() => setDetalleOp(null)} op={detalleOp ?? ({} as Oportunidad)} />
    </div>
  );
};

function filteredOportunidadesLengthSafe(len: number): boolean {
  return len > 0;
}
