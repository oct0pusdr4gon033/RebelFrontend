import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import { getOportunidadesApi } from '../../api/services/oportunidades.service';
import { getContactosApi } from '../../api/services/contactos.service';
import { mapApiToOportunidad, getVencimientoBadge } from '../../hooks/useOportunidades';
import type { Oportunidad } from '../../types/oportunidades';
import type { ContactoOCAM } from '../../types/contactos';
import { DetalleOportunidadView } from '../Oportunidades/DetalleOportunidadView';
import { formatFechaHoraPeru } from '../../utils/dateUtils';
import './SupervisionMaster.css';

interface SupervisionMasterPageProps {
  roleAccent?: string;
}

type TabType = 'resumen' | 'oportunidades' | 'ocams' | 'contactos' | 'ranking';

export const SupervisionMasterPage: React.FC<SupervisionMasterPageProps> = ({
  roleAccent = '#0284c7',
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as TabType) || 'resumen';

  const setTab = (tab: TabType) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  // ── Datos globales
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([]);
  const [contactos, setContactos] = useState<ContactoOCAM[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Filtro Global de Ejecutiva
  const [filtroEjecutiva, setFiltroEjecutiva] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstadoOp, setFiltroEstadoOp] = useState('todos');
  const [filtroEstadoOC, setFiltroEstadoOC] = useState('todos');

  // ── Detalle Modal
  const [detalleOp, setDetalleOp] = useState<Oportunidad | null>(null);

  // ── Carga de datos
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [opsData, contactosData] = await Promise.all([
        getOportunidadesApi().catch(() => []),
        getContactosApi().catch(() => []),
      ]);

      if (Array.isArray(opsData)) {
        setOportunidades(opsData.map(mapApiToOportunidad));
      }
      if (Array.isArray(contactosData)) {
        setContactos(contactosData);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ── Lista unificada de todas las ejecutivas registradas
  const todasLasEjecutivas = useMemo(() => {
    const set = new Set<string>();
    oportunidades.forEach((op) => {
      if (op.creadoPor) set.add(op.creadoPor);
    });
    contactos.forEach((c) => {
      if (c.registradoPor) set.add(c.registradoPor);
    });
    return Array.from(set).sort();
  }, [oportunidades, contactos]);

  // ── Filtrado Global por Ejecutiva
  const oportunidadesFiltradas = useMemo(() => {
    return oportunidades.filter((op) => {
      if (filtroEjecutiva !== 'todas' && op.creadoPor !== filtroEjecutiva) {
        return false;
      }
      if (filtroEstadoOp !== 'todos' && op.estado !== filtroEstadoOp) {
        return false;
      }
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const matches =
          op.numeroRequerimiento.toLowerCase().includes(q) ||
          (op.entidadConvocante || '').toLowerCase().includes(q) ||
          (op.empresaRazonSocial || '').toLowerCase().includes(q) ||
          (op.creadoPor || '').toLowerCase().includes(q) ||
          (op.ordenCompra?.numeroOC || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [oportunidades, filtroEjecutiva, filtroEstadoOp, busqueda]);

  // ── OCAMs / Órdenes de Compra
  const ocamsFiltradas = useMemo(() => {
    return oportunidades
      .filter((op) => Boolean(op.ordenCompra || op.estado === 'OC_RECIBIDA' || op.estado === 'OC_ACEPTADA'))
      .filter((op) => {
        if (filtroEjecutiva !== 'todas' && op.creadoPor !== filtroEjecutiva) {
          return false;
        }
        if (filtroEstadoOC !== 'todos') {
          const st = op.ordenCompra?.estadoOC || op.estado;
          if (st !== filtroEstadoOC) return false;
        }
        if (busqueda.trim()) {
          const q = busqueda.toLowerCase().trim();
          const matches =
            (op.ordenCompra?.numeroOC || '').toLowerCase().includes(q) ||
            (op.ordenCompra?.nroOCAM || '').toLowerCase().includes(q) ||
            op.numeroRequerimiento.toLowerCase().includes(q) ||
            (op.entidadConvocante || '').toLowerCase().includes(q) ||
            (op.creadoPor || '').toLowerCase().includes(q);
          if (!matches) return false;
        }
        return true;
      });
  }, [oportunidades, filtroEjecutiva, filtroEstadoOC, busqueda]);

  // ── Contactos
  const contactosFiltrados = useMemo(() => {
    return contactos.filter((c) => {
      if (filtroEjecutiva !== 'todas' && c.registradoPor !== filtroEjecutiva) {
        return false;
      }
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const matches =
          (c.contactoNombre || '').toLowerCase().includes(q) ||
          (c.contactoNumero || '').includes(q) ||
          (c.numeroOCAM || '').toLowerCase().includes(q) ||
          (c.empresaRelacionada || '').toLowerCase().includes(q) ||
          (c.registradoPor || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [contactos, filtroEjecutiva, busqueda]);

  // ── Métricas y KPIs de Supervisión
  const kpis = useMemo(() => {
    const opsBase = filtroEjecutiva === 'todas' ? oportunidades : oportunidades.filter((op) => op.creadoPor === filtroEjecutiva);
    const ocamsBase = opsBase.filter((op) => Boolean(op.ordenCompra));
    const montoTotalLicitaciones = opsBase.reduce((acc, op) => acc + (Number(op.limiteTotal) || 0), 0);
    const montoTotalOCs = ocamsBase.reduce((acc, op) => acc + (Number(op.ordenCompra?.montoOCAM || op.limiteTotal) || 0), 0);
    const adjudicadas = opsBase.filter((op) =>
      ['Adjudicada', 'Aceptada por Perú Compras', 'OC_RECIBIDA', 'OC_ACEPTADA', 'ENTREGADA'].includes(op.estado)
    ).length;

    const contsBase = filtroEjecutiva === 'todas' ? contactos : contactos.filter((c) => c.registradoPor === filtroEjecutiva);

    return {
      totalOps: opsBase.length,
      montoTotalLicitaciones,
      totalOCs: ocamsBase.length,
      montoTotalOCs,
      adjudicadas,
      tasaExito: opsBase.length > 0 ? Math.round((adjudicadas / opsBase.length) * 100) : 0,
      totalContactos: contsBase.length,
    };
  }, [oportunidades, contactos, filtroEjecutiva]);

  // ── Ranking por Ejecutiva
  const rankingEjecutivas = useMemo(() => {
    const mapa = new Map<
      string,
      {
        nombre: string;
        licitaciones: number;
        montoLicitaciones: number;
        ocsGanadas: number;
        montoOCs: number;
        contactos: number;
      }
    >();

    todasLasEjecutivas.forEach((ej) => {
      mapa.set(ej, {
        nombre: ej,
        licitaciones: 0,
        montoLicitaciones: 0,
        ocsGanadas: 0,
        montoOCs: 0,
        contactos: 0,
      });
    });

    oportunidades.forEach((op) => {
      const ej = op.creadoPor || 'Sin asignar';
      if (!mapa.has(ej)) {
        mapa.set(ej, {
          nombre: ej,
          licitaciones: 0,
          montoLicitaciones: 0,
          ocsGanadas: 0,
          montoOCs: 0,
          contactos: 0,
        });
      }
      const data = mapa.get(ej)!;
      data.licitaciones += 1;
      data.montoLicitaciones += Number(op.limiteTotal) || 0;
      if (op.ordenCompra || ['Adjudicada', 'OC_RECIBIDA', 'OC_ACEPTADA', 'ENTREGADA'].includes(op.estado)) {
        data.ocsGanadas += 1;
        data.montoOCs += Number(op.ordenCompra?.montoOCAM || op.limiteTotal) || 0;
      }
    });

    contactos.forEach((c) => {
      const ej = c.registradoPor || 'Sin asignar';
      if (mapa.has(ej)) {
        mapa.get(ej)!.contactos += 1;
      }
    });

    return Array.from(mapa.values()).sort((a, b) => b.montoOCs - a.montoOCs || b.licitaciones - a.licitaciones);
  }, [todasLasEjecutivas, oportunidades, contactos]);

  return (
    <div className="sup-page">
      {/* ── HERO BANNER DE SUPERVISIÓN ── */}
      <div className="sup-hero">
        <div className="sup-hero__left">
          <div className="sup-hero__icon">
            <GoogleIcon name="military_tech" size={32} color="#ffffff" />
          </div>
          <div className="sup-hero__title">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1>Panel de Supervisión Comercial Master</h1>
              <span
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: 6,
                  textTransform: 'uppercase',
                }}
              >
                Visión 360°
              </span>
            </div>
            <p>
              Supervisa en tiempo real las oportunidades registradas, órdenes de compra emitidas, agenda de contactos y desempeño de todas las ejecutivas de ventas.
            </p>
          </div>
        </div>

        {/* ── Selector Global de Ejecutiva ── */}
        <div className="sup-hero__exec-filter">
          <label>Filtro de Supervisión:</label>
          <select
            value={filtroEjecutiva}
            onChange={(e) => setFiltroEjecutiva(e.target.value)}
            className="sup-hero__exec-select"
          >
            <option value="todas">👥 Todo el Equipo ({todasLasEjecutivas.length} ejecutivas)</option>
            {todasLasEjecutivas.map((ej) => (
              <option key={ej} value={ej}>
                👤 {ej}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── CARDS DE KPIS GLOBALES ── */}
      <div className="sup-kpis">
        <div className="sup-kpi-card">
          <div className="sup-kpi-card__icon" style={{ background: '#e0f2fe', color: '#0369a1' }}>
            <GoogleIcon name="assignment" size={24} color="#0369a1" />
          </div>
          <div className="sup-kpi-card__content">
            <span className="sup-kpi-card__value">{kpis.totalOps}</span>
            <span className="sup-kpi-card__label">Requerimientos Registrados</span>
            <span className="sup-kpi-card__sub">S/ {kpis.montoTotalLicitaciones.toLocaleString('es-PE', { minimumFractionDigits: 2 })} en catálogo</span>
          </div>
        </div>

        <div className="sup-kpi-card">
          <div className="sup-kpi-card__icon" style={{ background: '#ecfdf5', color: '#059669' }}>
            <GoogleIcon name="verified" size={24} color="#059669" />
          </div>
          <div className="sup-kpi-card__content">
            <span className="sup-kpi-card__value">{kpis.adjudicadas}</span>
            <span className="sup-kpi-card__label">Adjudicadas / Aceptadas</span>
            <span className="sup-kpi-card__sub" style={{ color: '#059669' }}>{kpis.tasaExito}% de efectividad</span>
          </div>
        </div>

        <div className="sup-kpi-card">
          <div className="sup-kpi-card__icon" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
            <GoogleIcon name="receipt_long" size={24} color="#1d4ed8" />
          </div>
          <div className="sup-kpi-card__content">
            <span className="sup-kpi-card__value">{kpis.totalOCs}</span>
            <span className="sup-kpi-card__label">Órdenes de Compra (OCAMs)</span>
            <span className="sup-kpi-card__sub" style={{ color: '#1d4ed8' }}>S/ {kpis.montoTotalOCs.toLocaleString('es-PE', { minimumFractionDigits: 2 })} en OCs</span>
          </div>
        </div>

        <div className="sup-kpi-card">
          <div className="sup-kpi-card__icon" style={{ background: '#fef3c7', color: '#b45309' }}>
            <GoogleIcon name="contact_phone" size={24} color="#b45309" />
          </div>
          <div className="sup-kpi-card__content">
            <span className="sup-kpi-card__value">{kpis.totalContactos}</span>
            <span className="sup-kpi-card__label">Contactos en Agenda OCAM</span>
            <span className="sup-kpi-card__sub" style={{ color: '#b45309' }}>Red de llamadas trazable</span>
          </div>
        </div>
      </div>

      {/* ── TABS DE NAVEGACIÓN DEDICADA ── */}
      <div className="sup-tabs">
        <button
          type="button"
          className={`sup-tab-btn ${currentTab === 'resumen' ? 'sup-tab-btn--active' : ''}`}
          onClick={() => setTab('resumen')}
        >
          <GoogleIcon name="insights" size={18} />
          <span>Resumen y Rendimiento</span>
        </button>

        <button
          type="button"
          className={`sup-tab-btn ${currentTab === 'oportunidades' ? 'sup-tab-btn--active' : ''}`}
          onClick={() => setTab('oportunidades')}
        >
          <GoogleIcon name="bolt" size={18} />
          <span>Todas las Oportunidades</span>
          <span className="sup-tab-badge">{oportunidadesFiltradas.length}</span>
        </button>

        <button
          type="button"
          className={`sup-tab-btn ${currentTab === 'ocams' ? 'sup-tab-btn--active' : ''}`}
          onClick={() => setTab('ocams')}
        >
          <GoogleIcon name="local_shipping" size={18} />
          <span>Todas las OCAMs / OCs</span>
          <span className="sup-tab-badge">{ocamsFiltradas.length}</span>
        </button>

        <button
          type="button"
          className={`sup-tab-btn ${currentTab === 'contactos' ? 'sup-tab-btn--active' : ''}`}
          onClick={() => setTab('contactos')}
        >
          <GoogleIcon name="import_contacts" size={18} />
          <span>Agenda Global de Contactos</span>
          <span className="sup-tab-badge">{contactosFiltrados.length}</span>
        </button>

        <button
          type="button"
          className={`sup-tab-btn ${currentTab === 'ranking' ? 'sup-tab-btn--active' : ''}`}
          onClick={() => setTab('ranking')}
        >
          <GoogleIcon name="leaderboard" size={18} />
          <span>Ranking de Ejecutivas</span>
        </button>
      </div>

      {/* ── VISTA 1: RESUMEN Y MÉTRICAS ── */}
      {currentTab === 'resumen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Tarjeta de Comparativa de Ejecutivas */}
          <div className="sup-card">
            <div className="sup-toolbar">
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', color: '#0f172a' }}>
                  Desempeño Comparativo por Ejecutiva
                </h3>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                  Volumen de licitaciones gestionadas, órdenes de compra adjudicadas y montos facturados por cada integrante del equipo.
                </p>
              </div>
            </div>

            <div className="sup-table-wrap">
              <table className="sup-ranking-table">
                <thead>
                  <tr>
                    <th style={{ width: 60, textAlign: 'center' }}>Pos.</th>
                    <th>Ejecutiva</th>
                    <th style={{ textAlign: 'center' }}>Licitaciones</th>
                    <th style={{ textAlign: 'right' }}>Monto Licitado</th>
                    <th style={{ textAlign: 'center' }}>OCs Ganadas</th>
                    <th style={{ textAlign: 'right' }}>Monto OCs</th>
                    <th style={{ textAlign: 'center' }}>Contactos</th>
                    <th style={{ textAlign: 'center' }}>Efectividad</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingEjecutivas.map((row, idx) => {
                    const badgeClass =
                      idx === 0
                        ? 'sup-rank-1'
                        : idx === 1
                        ? 'sup-rank-2'
                        : idx === 2
                        ? 'sup-rank-3'
                        : 'sup-rank-other';
                    const tasa = row.licitaciones > 0 ? Math.round((row.ocsGanadas / row.licitaciones) * 100) : 0;

                    return (
                      <tr key={row.nombre}>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`sup-rank-badge ${badgeClass}`}>{idx + 1}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>
                              {row.nombre.slice(0, 2).toUpperCase()}
                            </div>
                            <strong style={{ color: '#0f172a' }}>{row.nombre}</strong>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{row.licitaciones}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#475569' }}>
                          S/ {row.montoLicitaciones.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 800, color: '#059669' }}>
                          {row.ocsGanadas}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                          S/ {row.montoOCs.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{row.contactos}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: tasa >= 50 ? '#dcfce7' : tasa > 0 ? '#eff6ff' : '#f1f5f9', color: tasa >= 50 ? '#15803d' : tasa > 0 ? '#1d4ed8' : '#64748b' }}>
                            {tasa}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── VISTA 2: TODAS LAS OPORTUNIDADES ── */}
      {currentTab === 'oportunidades' && (
        <div className="sup-card">
          <div className="sup-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 320px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', flex: 1 }}>
                <GoogleIcon name="search" size={18} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Buscar requerimiento, ejecutiva, entidad..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.88rem' }}
                />
              </div>

              <select
                value={filtroEstadoOp}
                onChange={(e) => setFiltroEstadoOp(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.86rem', fontWeight: 600, color: '#334155' }}
              >
                <option value="todos">Todos los Estados</option>
                <option value="En Licitación">En Licitación</option>
                <option value="En Competencia">En Competencia</option>
                <option value="Adjudicada">Adjudicada</option>
                <option value="Aceptada por el Administrador">Aceptada por Administrador</option>
                <option value="Aceptada por Perú Compras">Aceptada por Perú Compras</option>
                <option value="OC_RECIBIDA">OC Recibida</option>
                <option value="OC_ACEPTADA">OC Aceptada</option>
                <option value="Desestimada">Desestimada</option>
              </select>
            </div>
          </div>

          <div className="sup-table-wrap">
            <table className="sup-table">
              <thead>
                <tr>
                  <th>N° Requerimiento</th>
                  <th>Ejecutiva</th>
                  <th>Entidad Convocante</th>
                  <th>Acuerdo Marco</th>
                  <th style={{ textAlign: 'right' }}>Límite Total</th>
                  <th>Estado</th>
                  <th>Fecha Registro</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                      Cargando oportunidades globales...
                    </td>
                  </tr>
                ) : oportunidadesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 50, color: '#64748b' }}>
                      No se encontraron oportunidades con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  oportunidadesFiltradas.map((op) => (
                    <tr key={op.id}>
                      <td>
                        <strong>{op.numeroRequerimiento}</strong>
                      </td>
                      <td>
                        <span className="sup-exec-pill">
                          <GoogleIcon name="person" size={13} color="#2563eb" />
                          {op.creadoPor || 'Ejecutiva'}
                        </span>
                      </td>
                      <td>{op.entidadConvocante || op.empresaRazonSocial || 'No especificada'}</td>
                      <td>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {op.acuerdoMarco?.codigo || op.acuerdoMarco?.descripcion || '—'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                        S/ {Number(op.limiteTotal).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.76rem', fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: '#eff6ff', color: '#1d4ed8' }}>
                          {op.estado}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {formatFechaHoraPeru(op.fechaRegistro, { dateStyle: 'short' })}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setDetalleOp(op)}
                          style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.8rem', fontWeight: 700, color: '#0284c7', cursor: 'pointer' }}
                        >
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VISTA 3: TODAS LAS OCAMS ── */}
      {currentTab === 'ocams' && (
        <div className="sup-card">
          <div className="sup-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 320px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', flex: 1 }}>
                <GoogleIcon name="search" size={18} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Buscar N° OCAM, N° Requerimiento, ejecutiva..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.88rem' }}
                />
              </div>

              <select
                value={filtroEstadoOC}
                onChange={(e) => setFiltroEstadoOC(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.86rem', fontWeight: 600, color: '#334155' }}
              >
                <option value="todos">Todos los Estados OC</option>
                <option value="OC_RECIBIDA">OC Recibida</option>
                <option value="OC_ACEPTADA">OC Aceptada</option>
                <option value="OC_RECHAZADA">OC Rechazada</option>
                <option value="ENTREGADA">Entregada</option>
              </select>
            </div>
          </div>

          <div className="sup-table-wrap">
            <table className="sup-table">
              <thead>
                <tr>
                  <th>N° OCAM / OC</th>
                  <th>N° Requerimiento</th>
                  <th>Ejecutiva</th>
                  <th>Entidad Convocante</th>
                  <th style={{ textAlign: 'right' }}>Monto OCAM</th>
                  <th style={{ textAlign: 'right' }}>Flete</th>
                  <th>Estado OC</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ocamsFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 50, color: '#64748b' }}>
                      No se encontraron órdenes de compra registradas con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  ocamsFiltradas.map((op) => (
                    <tr key={op.id}>
                      <td>
                        <strong style={{ fontFamily: 'monospace', color: '#0369a1', background: '#e0f2fe', padding: '3px 8px', borderRadius: 4 }}>
                          {op.ordenCompra?.numeroOC || op.ordenCompra?.nroOCAM || 'Por registrar'}
                        </strong>
                      </td>
                      <td>{op.numeroRequerimiento}</td>
                      <td>
                        <span className="sup-exec-pill">
                          <GoogleIcon name="person" size={13} color="#2563eb" />
                          {op.creadoPor || 'Ejecutiva'}
                        </span>
                      </td>
                      <td>{op.entidadConvocante || op.empresaRazonSocial || 'No especificada'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                        S/ {Number(op.ordenCompra?.montoOCAM || op.limiteTotal).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right', color: '#7c3aed', fontVariantNumeric: 'tabular-nums' }}>
                        S/ {Number(op.ordenCompra?.flete || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.76rem', fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: '#ecfdf5', color: '#047857' }}>
                          {op.ordenCompra?.estadoOC || op.estado}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setDetalleOp(op)}
                          style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.8rem', fontWeight: 700, color: '#0284c7', cursor: 'pointer' }}
                        >
                          Ver OC
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VISTA 4: TODOS LOS CONTACTOS ── */}
      {currentTab === 'contactos' && (
        <div className="sup-card">
          <div className="sup-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', flex: '1 1 320px' }}>
              <GoogleIcon name="search" size={18} color="#94a3b8" />
              <input
                type="text"
                placeholder="Buscar contacto, número de teléfono, OCAM, ejecutiva..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.88rem' }}
              />
            </div>
          </div>

          <div className="sup-table-wrap">
            <table className="sup-table">
              <thead>
                <tr>
                  <th>Vínculo OCAM</th>
                  <th>Contacto</th>
                  <th>Teléfono</th>
                  <th>Área / Cargo</th>
                  <th>Entidad / Empresa</th>
                  <th>Registrado Por</th>
                  <th>Respuesta</th>
                </tr>
              </thead>
              <tbody>
                {contactosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 50, color: '#64748b' }}>
                      No se encontraron contactos registrados con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  contactosFiltrados.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong style={{ fontFamily: 'monospace', color: c.numeroOCAM ? '#1d4ed8' : '#059669' }}>
                          {c.numeroOCAM || 'SIN OCAM'}
                        </strong>
                      </td>
                      <td>
                        <strong>{c.contactoNombre}</strong>
                      </td>
                      <td>
                        <a href={`tel:${c.contactoNumero}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', color: '#0284c7', fontWeight: 700 }}>
                          <GoogleIcon name="call" size={13} color="#0284c7" />
                          {c.contactoNumero}
                        </a>
                      </td>
                      <td>{c.contactoAreaCargo || '—'}</td>
                      <td>{c.empresaRelacionada || '—'}</td>
                      <td>
                        <span className="sup-exec-pill">
                          <GoogleIcon name="person" size={13} color="#2563eb" />
                          {c.registradoPor || 'Ejecutiva'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.78rem', color: '#475569' }}>{c.respuesta || 'Sin respuesta'}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VISTA 5: RANKING EXCLUSIVO ── */}
      {currentTab === 'ranking' && (
        <div className="sup-card">
          <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem' }}>Métricas Comerciales Individuales por Ejecutiva</h3>
          <div className="sup-table-wrap">
            <table className="sup-ranking-table">
              <thead>
                <tr>
                  <th style={{ width: 60, textAlign: 'center' }}>Ranking</th>
                  <th>Ejecutiva</th>
                  <th style={{ textAlign: 'center' }}>Total Requerimientos</th>
                  <th style={{ textAlign: 'right' }}>Total Licitado</th>
                  <th style={{ textAlign: 'center' }}>OCs Emitidas</th>
                  <th style={{ textAlign: 'right' }}>Monto Total OCs</th>
                  <th style={{ textAlign: 'center' }}>Contactos Realizados</th>
                  <th style={{ textAlign: 'center' }}>Conversión</th>
                </tr>
              </thead>
              <tbody>
                {rankingEjecutivas.map((row, idx) => (
                  <tr key={row.nombre}>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`sup-rank-badge sup-rank-${idx < 3 ? idx + 1 : 'other'}`}>{idx + 1}</span>
                    </td>
                    <td>
                      <strong>{row.nombre}</strong>
                    </td>
                    <td style={{ textAlign: 'center' }}>{row.licitaciones}</td>
                    <td style={{ textAlign: 'right' }}>S/ {row.montoLicitaciones.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#059669' }}>{row.ocsGanadas}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>S/ {row.montoOCs.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: 'center' }}>{row.contactos}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>
                      {row.licitaciones > 0 ? Math.round((row.ocsGanadas / row.licitaciones) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL DE DETALLE COMPLETO DE OPORTUNIDAD ── */}
      {detalleOp && (
        <DetalleOportunidadView
          oportunidad={detalleOp}
          todasOportunidades={oportunidades}
          roleAccent={roleAccent}
          onClose={() => setDetalleOp(null)}
          onEdit={() => {}}
          onSubirEvidencia={() => {}}
          onEstadoCambiado={(opActualizada) => {
            setOportunidades((prev) =>
              prev.map((o) => (String(o.id) === String(opActualizada.id) ? opActualizada : o))
            );
            setDetalleOp(opActualizada);
          }}
          getVencimientoBadge={getVencimientoBadge}
        />
      )}
    </div>
  );
};
export default SupervisionMasterPage;

