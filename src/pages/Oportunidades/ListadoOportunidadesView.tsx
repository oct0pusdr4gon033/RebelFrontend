import React, { useState, useMemo } from 'react';
import { GoogleIcon } from '../../components/GoogleIcon';
import type { Oportunidad, VencimientoBadge, Marca, ProductoItem } from '../../types/oportunidades';
import { DetalleOportunidadView } from './DetalleOportunidadView';


interface ListadoOportunidadesViewProps {
  oportunidades: Oportunidad[];
  roleAccent: string;
  onEdit: (op: Oportunidad) => void;
  onSubirEvidencia: (opId: string | number) => void;
  getVencimientoBadge: (fechaIso: string) => VencimientoBadge | null;
}

export const ListadoOportunidadesView: React.FC<ListadoOportunidadesViewProps> = ({
  oportunidades,
  roleAccent,
  onEdit,
  onSubirEvidencia,
  getVencimientoBadge,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'En Licitación' | 'Cotizada' | 'Adjudicada'>('Todos');
  const [selectedOpDetail, setSelectedOpDetail] = useState<Oportunidad | null>(null);
  const [detalleDrawerOp, setDetalleDrawerOp] = useState<Oportunidad | null>(null);

  // Estadísticas rápidas
  const totalMonto = useMemo(() => {
    return oportunidades.reduce((sum, op) => sum + (Number(op.limiteTotal) || 0), 0);
  }, [oportunidades]);

  const totalEnLicitacion = useMemo(() => {
    return oportunidades.filter((op) => op.estado === 'En Licitación').length;
  }, [oportunidades]);

  const totalCotizadas = useMemo(() => {
    return oportunidades.filter((op) => op.estado === 'Cotizada' || op.estado === 'Adjudicada').length;
  }, [oportunidades]);

  // Filtrado
  const filteredOportunidades = useMemo(() => {
    return oportunidades.filter((op) => {
      const matchesStatus = statusFilter === 'Todos' || op.estado === statusFilter;
      const term = searchTerm.toLowerCase().trim();
      if (!term) return matchesStatus;

      const matchesTerm =
        op.numeroRequerimiento.toLowerCase().includes(term) ||
        (op.acuerdoMarco?.codigo || '').toLowerCase().includes(term) ||
        (op.acuerdoMarco?.descripcion || '').toLowerCase().includes(term) ||
        (op.empresaRazonSocial || '').toLowerCase().includes(term) ||
        (op.entidadConvocante || '').toLowerCase().includes(term) ||
        (op.creadoPor || '').toLowerCase().includes(term) ||
        op.marcas.some((m: Marca) => m.nombre.toLowerCase().includes(term));

      return matchesStatus && matchesTerm;
    });
  }, [oportunidades, searchTerm, statusFilter]);

  return (
    <div className="reg-listado-container">
      {/* ── Tarjetas Métricas Rápidas ── */}
      <div className="reg-kpis-grid">
        <div className="reg-kpi-card">
          <div className="reg-kpi-icon" style={{ background: `${roleAccent}15`, color: roleAccent }}>
            <GoogleIcon name="table_chart" size={22} color={roleAccent} />
          </div>
          <div>
            <div className="reg-kpi-label">Total Registradas</div>
            <div className="reg-kpi-value">{oportunidades.length}</div>
            <div className="reg-kpi-sub">Requerimientos en sistema</div>
          </div>
        </div>

        <div className="reg-kpi-card">
          <div className="reg-kpi-icon" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04' }}>
            <GoogleIcon name="bolt" size={22} color="#ca8a04" />
          </div>
          <div>
            <div className="reg-kpi-label">En Licitación Activa</div>
            <div className="reg-kpi-value">{totalEnLicitacion}</div>
            <div className="reg-kpi-sub">Listas para cotizar</div>
          </div>
        </div>

        <div className="reg-kpi-card">
          <div className="reg-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#059669' }}>
            <GoogleIcon name="verified_user" size={22} color="#059669" />
          </div>
          <div>
            <div className="reg-kpi-label">Cotizadas / Adjudicadas</div>
            <div className="reg-kpi-value">{totalCotizadas}</div>
            <div className="reg-kpi-sub">Con propuesta presentada</div>
          </div>
        </div>

        <div className="reg-kpi-card">
          <div className="reg-kpi-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#4f46e5' }}>
            <GoogleIcon name="payments" size={22} color="#4f46e5" />
          </div>
          <div>
            <div className="reg-kpi-label">Volumen Total Licitado</div>
            <div className="reg-kpi-value" style={{ fontSize: '20px' }}>
              S/ {totalMonto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="reg-kpi-sub">Tope acumulado Perú Compras</div>
          </div>
        </div>
      </div>

      {/* ── Tarjeta Principal del Listado ── */}
      <div className="reg-card">
        {/* Barra de Filtros y Búsqueda */}
        <div className="reg-list-toolbar">
          <div className="reg-search-box">
            <GoogleIcon name="manage_search" size={18} color="#94a3b8" />
            <input
              type="text"
              placeholder="Buscar por N° Requerimiento, Acuerdo Marco, Empresa, Marca o Ejecutiva..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="reg-search-input"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <GoogleIcon name="close" size={14} color="#94a3b8" />
              </button>
            )}
          </div>

          <div className="reg-filter-pills">
            {(['Todos', 'En Licitación', 'Cotizada', 'Adjudicada'] as const).map((st) => (
              <button
                key={st}
                type="button"
                className={`reg-filter-chip ${statusFilter === st ? 'active' : ''}`}
                onClick={() => setStatusFilter(st)}
                style={
                  statusFilter === st
                    ? { background: roleAccent, color: '#ffffff', borderColor: roleAccent }
                    : undefined
                }
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla */}
        {filteredOportunidades.length === 0 ? (
          <div className="reg-empty-history">
            <GoogleIcon name="inbox" size={40} color="#94a3b8" />
            <p>
              {searchTerm || statusFilter !== 'Todos'
                ? 'No se encontraron oportunidades con los filtros seleccionados.'
                : 'Aún no hay oportunidades registradas en el sistema.'}
            </p>
          </div>
        ) : (
          <div className="reg-table-wrapper">
            <table className="reg-table">
              <thead>
                <tr>
                  <th>N° Requerimiento</th>
                  <th>Acuerdo Marco</th>
                  <th>Empresa / Entidad</th>
                  <th>Marcas</th>
                  <th>Productos</th>
                  <th>Límite Total</th>
                  <th>Vencimiento</th>
                  <th>Estado</th>
                  <th>Registrado por</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredOportunidades.map((op) => {
                  const vBadge = getVencimientoBadge(op.fechaVencimiento);
                  return (
                    <tr key={op.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className="reg-badge-req">
                            <GoogleIcon name="assignment" size={13} color="#0369a1" />
                            <strong>{op.numeroRequerimiento}</strong>
                          </span>
                          {op.prioridadGanada && (
                            <span className="reg-priority-badge" title="Primer registro oficial validado con prioridad">
                              <GoogleIcon name="verified" size={11} color="#15803d" />
                              Prioridad 1°
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="reg-cell-acuerdo">
                          <span className="acuerdo-code" style={{ fontWeight: 700, color: '#334155' }}>{op.acuerdoMarco.codigo}</span>
                        </div>
                      </td>
                      <td>
                        <div className="reg-cell-empresa">
                          {op.empresaRazonSocial ? (
                            <span className="empresa-name">{op.empresaRazonSocial}</span>
                          ) : op.entidadConvocante ? (
                            <span className="empresa-name">{op.entidadConvocante}</span>
                          ) : (
                            <span className="empresa-sin-asig">Pendiente de asociar</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="reg-table-tags">
                          {op.marcas.map((m: Marca) => (
                            <span key={m.id} className="reg-table-tag">
                              {m.nombre}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setSelectedOpDetail(op)}
                          className="reg-items-btn"
                          title="Ver detalle de productos"
                        >
                          <GoogleIcon name="visibility" size={14} color="#0284c7" />
                          <span>
                            {op.items.length} {op.items.length === 1 ? 'ítem' : 'ítems'}
                          </span>
                        </button>
                      </td>
                      <td>
                        <strong className="reg-limite-total">
                          S/{' '}
                          {Number(op.limiteTotal).toLocaleString('es-PE', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </strong>
                      </td>
                      <td>
                        {vBadge ? (
                          <span
                            className="reg-pill"
                            style={{ background: vBadge.bg, color: vBadge.color }}
                          >
                            {vBadge.label}
                          </span>
                        ) : (
                          <span className="reg-pill" style={{ background: '#f1f5f9', color: '#64748b' }}>
                            Sin fecha
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="reg-pill reg-pill-estado">{op.estado}</span>
                      </td>
                      <td>
                        <div className="reg-creado-por">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <GoogleIcon name="person" size={13} color="#64748b" />
                            <span style={{ fontWeight: 600 }}>{op.creadoPor}</span>
                          </div>
                          {op.horaRegistroExacta && (
                            <div style={{ fontSize: '11px', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                              <GoogleIcon name="schedule" size={11} color="#0284c7" />
                              <span>1° reg: {op.horaRegistroExacta}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setDetalleDrawerOp(op)}
                            title="Ver detalle completo"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4,
                              background: `rgba(99,102,241,0.09)`,
                              color: '#4f46e5',
                              border: '1px solid rgba(99,102,241,0.22)',
                              padding: '5px 9px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <GoogleIcon name="open_in_full" size={13} color="#4f46e5" />
                            <span>Detalle</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onEdit(op)}
                            title="Editar Oportunidad"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4,
                              background: 'rgba(2, 132, 199, 0.1)',
                              color: '#0284c7',
                              border: '1px solid rgba(2, 132, 199, 0.25)',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <GoogleIcon name="edit" size={13} color="#0284c7" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            className="reg-table-btn-evidence"
                            onClick={() => onSubirEvidencia(op.id)}
                            title="Subir Evidencia de esta Oportunidad"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4,
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: '#059669',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <GoogleIcon name="upload_file" size={13} color="#059669" />
                            <span>Evidencia</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Drawer de Detalle Completo ── */}
      {detalleDrawerOp && (
        <DetalleOportunidadView
          oportunidad={detalleDrawerOp}
          roleAccent={roleAccent}
          onClose={() => setDetalleDrawerOp(null)}
          onEdit={(op) => { setDetalleDrawerOp(null); onEdit(op); }}
          onSubirEvidencia={(id) => { setDetalleDrawerOp(null); onSubirEvidencia(id); }}
          getVencimientoBadge={getVencimientoBadge}
        />
      )}

      {/* ── Modal de Detalle de Productos (legacy, kept for fallback) ── */}
      {selectedOpDetail && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedOpDetail(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 750,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1.5px solid #f1f5f9', paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  Detalle de Requerimiento: {selectedOpDetail.numeroRequerimiento}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748b' }}>
                  {selectedOpDetail.acuerdoMarco.codigo} &bull; {selectedOpDetail.acuerdoMarco.descripcion}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOpDetail(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <GoogleIcon name="close" size={20} color="#94a3b8" />
              </button>
            </div>

            <div style={{ marginBottom: 16, background: '#f8fafc', padding: 12, borderRadius: 10, fontSize: '13px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <span style={{ color: '#64748b' }}>Empresa / Cliente: </span>
                <strong>{selectedOpDetail.empresaRazonSocial || selectedOpDetail.entidadConvocante || 'Sin asignar'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Límite Total: </span>
                <strong style={{ color: '#0284c7' }}>
                  S/ {Number(selectedOpDetail.limiteTotal).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            <h4 style={{ margin: '14px 0 8px', fontSize: '14px', fontWeight: 700, color: '#334155' }}>
              Productos y Precios Límites ({selectedOpDetail.items.length}):
            </h4>

            <div className="reg-table-wrapper">
              <table className="reg-table" style={{ fontSize: '12.5px' }}>
                <thead>
                  <tr>
                    <th>N° Parte</th>
                    <th>Descripción</th>
                    <th style={{ textAlign: 'center' }}>Cantidad</th>
                    <th style={{ textAlign: 'right' }}>Límite Unitario</th>
                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOpDetail.items.map((it: ProductoItem, idx: number) => {
                    const sub = (it.cantidad || 0) * (it.limiteUnitario || 0);
                    return (
                      <tr key={idx}>
                        <td><strong>{it.numeroParte}</strong></td>
                        <td>{it.descripcion || '-'}</td>
                        <td style={{ textAlign: 'center' }}>{it.cantidad}</td>
                        <td style={{ textAlign: 'right' }}>
                          S/ {Number(it.limiteUnitario).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          S/ {sub.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  const op = selectedOpDetail;
                  setSelectedOpDetail(null);
                  onEdit(op);
                }}
                className="reg-table-btn-edit"
                style={{ padding: '8px 16px' }}
              >
                <GoogleIcon name="edit" size={15} color="#0284c7" />
                <span>Editar Requerimiento</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedOpDetail(null)}
                className="reg-btn-cancel-sidebar"
                style={{ width: 'auto', padding: '8px 16px', margin: 0 }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
