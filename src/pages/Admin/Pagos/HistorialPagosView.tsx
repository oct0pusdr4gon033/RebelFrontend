// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Admin/Pagos/HistorialPagosView.tsx
// Vista de tabla e historial interactivo de pagos vinculados a Órdenes de Compra
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import Swal from 'sweetalert2';
import { GoogleIcon } from '../../../components/GoogleIcon';
import type { PagoOC, ConceptoPago } from '../../../types/pagos';
import { eliminarPago, cambiarEstadoPago } from '../../../api/services/pagos.service';
import { VerComprobanteModal } from './VerComprobanteModal';
import './Pagos.css';

interface HistorialPagosViewProps {
  pagos: PagoOC[];
  roleAccent?: string;
  onNuevoPagoClick: () => void;
  onPagosActualizados: () => void;
  onFiltrarPorOC?: (numeroOC: string) => void;
}

const CONCEPTOS_FILTRO: { id: string; label: string; icon: string }[] = [
  { id: 'todos', label: 'Todos los Conceptos', icon: 'grid_view' },
  { id: 'Flete', label: 'Flete', icon: 'local_shipping' },
  { id: 'Comisión', label: 'Comisión', icon: 'handshake' },
  { id: 'Gastos Varios', label: 'Gastos Varios', icon: 'receipt' },
  { id: 'Mercadería / Proveedor', label: 'Mercadería', icon: 'inventory_2' },
  { id: 'Adelanto', label: 'Adelanto', icon: 'payments' },
  { id: 'Liquidación Final', label: 'Liquidación', icon: 'task_alt' },
];

export const HistorialPagosView: React.FC<HistorialPagosViewProps> = ({
  pagos,
  roleAccent = '#2563eb',
  onNuevoPagoClick,
  onPagosActualizados,
  onFiltrarPorOC,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [conceptoFiltro, setConceptoFiltro] = useState<string>('todos');
  const [monedaFiltro, setMonedaFiltro] = useState<string>('todas');
  const [pagoParaVer, setPagoParaVer] = useState<PagoOC | null>(null);

  // Totales generales
  const resumen = useMemo(() => {
    let totalPEN = 0;
    let totalUSD = 0;
    let totalFlete = 0;
    let totalComision = 0;
    let totalGastosVarios = 0;
    let totalMercaderia = 0;

    pagos.forEach((p) => {
      if (p.moneda === 'PEN') {
        totalPEN += p.monto;
        if (p.concepto === 'Flete') totalFlete += p.monto;
        else if (p.concepto === 'Comisión') totalComision += p.monto;
        else if (p.concepto === 'Gastos Varios') totalGastosVarios += p.monto;
        else if (p.concepto === 'Mercadería / Proveedor' || p.concepto === 'Adelanto' || p.concepto === 'Liquidación Final') {
          totalMercaderia += p.monto;
        }
      } else {
        totalUSD += p.monto;
      }
    });

    return { totalPEN, totalUSD, totalFlete, totalComision, totalGastosVarios, totalMercaderia };
  }, [pagos]);

  // Filtrado de lista
  const pagosFiltrados = useMemo(() => {
    return pagos.filter((p) => {
      // Filtro concepto
      if (conceptoFiltro !== 'todos' && p.concepto !== conceptoFiltro) return false;

      // Filtro moneda
      if (monedaFiltro !== 'todas' && p.moneda !== monedaFiltro) return false;

      // Filtro de búsqueda
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const enOC = p.numeroOC.toLowerCase().includes(q);
        const enRQ = p.numeroRequerimiento.toLowerCase().includes(q);
        const enCod = p.codigoPago.toLowerCase().includes(q);
        const enOp = (p.numeroOperacion || '').toLowerCase().includes(q);
        const enBenef = (p.beneficiario || '').toLowerCase().includes(q);
        const enBanco = (p.banco || '').toLowerCase().includes(q);
        const enEmpresa = (p.empresaRazonSocial || '').toLowerCase().includes(q);
        if (!enOC && !enRQ && !enCod && !enOp && !enBenef && !enBanco && !enEmpresa) return false;
      }

      return true;
    });
  }, [pagos, conceptoFiltro, monedaFiltro, busqueda]);

  const handleEliminar = async (pago: PagoOC) => {
    const res = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar este pago?',
      html: `Estás a punto de anular el pago <strong>${pago.codigoPago}</strong> de <strong>${pago.moneda === 'PEN' ? 'S/' : '$'} ${pago.monto.toFixed(2)}</strong> vinculado a la OC <strong>${pago.numeroOC}</strong>. Esta acción no se puede deshacer.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
    });

    if (res.isConfirmed) {
      const ok = eliminarPago(pago.id);
      if (ok) {
        Swal.fire({
          icon: 'success',
          title: 'Pago eliminado',
          text: 'El registro de pago ha sido removido.',
          timer: 1600,
          showConfirmButton: false,
        });
        onPagosActualizados();
      }
    }
  };

  const handleToggleConciliar = (pago: PagoOC) => {
    const nuevoEstado = pago.estado === 'Conciliado' ? 'Registrado' : 'Conciliado';
    cambiarEstadoPago(pago.id, nuevoEstado);
    onPagosActualizados();
  };

  const getConceptoBadgeClass = (concepto: ConceptoPago) => {
    switch (concepto) {
      case 'Flete':
        return 'pagos-badge--flete';
      case 'Comisión':
        return 'pagos-badge--comision';
      case 'Gastos Varios':
        return 'pagos-badge--gastos';
      case 'Mercadería / Proveedor':
        return 'pagos-badge--mercaderia';
      case 'Adelanto':
        return 'pagos-badge--adelanto';
      case 'Liquidación Final':
        return 'pagos-badge--liquidacion';
      default:
        return 'pagos-badge--otro';
    }
  };

  return (
    <div className="pagos-historial-container">
      {/* KPI Cards Superiores */}
      <div className="pagos-stats-grid">
        <div className="pagos-stat-card pagos-stat-card--primary">
          <div className="pagos-stat-card__icon" style={{ background: `${roleAccent}15`, color: roleAccent }}>
            <GoogleIcon name="payments" size={26} color={roleAccent} />
          </div>
          <div className="pagos-stat-card__info">
            <span className="label">Total Desembolsado (PEN)</span>
            <div className="value">
              S/ {resumen.totalPEN.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="sub">En {pagos.length} pago(s) registrados</span>
          </div>
        </div>

        <div className="pagos-stat-card">
          <div className="pagos-stat-card__icon" style={{ background: '#8b5cf615', color: '#8b5cf6' }}>
            <GoogleIcon name="local_shipping" size={26} color="#8b5cf6" />
          </div>
          <div className="pagos-stat-card__info">
            <span className="label">Precio de Flete</span>
            <div className="value">
              S/ {resumen.totalFlete.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="sub">Transporte y despachos</span>
          </div>
        </div>

        <div className="pagos-stat-card">
          <div className="pagos-stat-card__icon" style={{ background: '#10b98115', color: '#10b981' }}>
            <GoogleIcon name="handshake" size={26} color="#10b981" />
          </div>
          <div className="pagos-stat-card__info">
            <span className="label">Comisiones Pagadas</span>
            <div className="value">
              S/ {resumen.totalComision.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="sub">Comisiones comerciales</span>
          </div>
        </div>

        <div className="pagos-stat-card">
          <div className="pagos-stat-card__icon" style={{ background: '#f59e0b15', color: '#f59e0b' }}>
            <GoogleIcon name="receipt" size={26} color="#f59e0b" />
          </div>
          <div className="pagos-stat-card__info">
            <span className="label">Gastos Varios</span>
            <div className="value">
              S/ {resumen.totalGastosVarios.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="sub">Embalaje, estiba y otros</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="pagos-controls-bar">
        <div className="pagos-search-wrap">
          <GoogleIcon name="search" size={20} color="#94a3b8" />
          <input
            type="text"
            className="pagos-search-input"
            placeholder="Buscar por N° OC, Requerimiento, Beneficiario, Banco u Operación..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button type="button" className="pagos-search-clear" onClick={() => setBusqueda('')}>
              <GoogleIcon name="close" size={16} />
            </button>
          )}
        </div>

        <div className="pagos-filter-group">
          <select
            className="pagos-select-compact"
            value={monedaFiltro}
            onChange={(e) => setMonedaFiltro(e.target.value)}
          >
            <option value="todas">Moneda: Todas</option>
            <option value="PEN">Soles (PEN)</option>
            <option value="USD">Dólares (USD)</option>
          </select>

          <button
            type="button"
            className="pagos-btn pagos-btn--primary"
            style={{ background: roleAccent }}
            onClick={onNuevoPagoClick}
          >
            <GoogleIcon name="add" size={18} color="#fff" />
            <span>Agregar Pago</span>
          </button>
        </div>
      </div>

      {/* Tabs rápidos por concepto */}
      <div className="pagos-concept-tabs">
        {CONCEPTOS_FILTRO.map((tab) => {
          const isActive = conceptoFiltro === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`pagos-concept-tab ${isActive ? 'pagos-concept-tab--active' : ''}`}
              style={isActive ? { borderColor: roleAccent, color: roleAccent, background: `${roleAccent}10` } : undefined}
              onClick={() => setConceptoFiltro(tab.id)}
            >
              <GoogleIcon name={tab.icon} size={17} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tabla de Pagos */}
      {pagosFiltrados.length === 0 ? (
        <div className="pagos-empty-state">
          <div className="pagos-empty-state__icon">
            <GoogleIcon name="receipt_long" size={48} color="#94a3b8" />
          </div>
          <h3>No se encontraron pagos</h3>
          <p>
            {busqueda || conceptoFiltro !== 'todos'
              ? 'No hay registros que coincidan con los criterios de búsqueda seleccionados.'
              : 'Aún no se han registrado pagos vinculados a Órdenes de Compra.'}
          </p>
          <button
            type="button"
            className="pagos-btn pagos-btn--primary"
            style={{ background: roleAccent }}
            onClick={onNuevoPagoClick}
          >
            <GoogleIcon name="add_card" size={18} color="#fff" />
            <span>Registrar Primer Pago</span>
          </button>
        </div>
      ) : (
        <div className="pagos-table-wrapper">
          <table className="pagos-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Captura</th>
                <th>Código & Fecha</th>
                <th>Orden de Compra</th>
                <th>Concepto</th>
                <th>Monto Pagado</th>
                <th>Método & Operación</th>
                <th>Beneficiario</th>
                <th>Estado</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagosFiltrados.map((p) => {
                const simbolo = p.moneda === 'PEN' ? 'S/' : '$';
                return (
                  <tr key={p.id}>
                    {/* Captura / Thumbnail */}
                    <td>
                      <div
                        className="pagos-thumb-wrapper"
                        onClick={() => setPagoParaVer(p)}
                        title="Clic para ver comprobante ampliado"
                      >
                        <img src={p.comprobante.dataUrl} alt={p.comprobante.nombreArchivo} />
                        <div className="pagos-thumb-overlay">
                          <GoogleIcon name="zoom_in" size={16} color="#fff" />
                        </div>
                      </div>
                    </td>

                    {/* Código y Fecha */}
                    <td>
                      <div className="pagos-cell-code">
                        <strong>{p.codigoPago}</strong>
                        <span>{p.fechaPago}</span>
                      </div>
                    </td>

                    {/* Orden de Compra */}
                    <td>
                      <div className="pagos-cell-oc">
                        <div className="pagos-oc-tag" onClick={() => onFiltrarPorOC && onFiltrarPorOC(p.numeroOC)}>
                          <GoogleIcon name="description" size={14} />
                          <span>{p.numeroOC}</span>
                        </div>
                        <span className="rq-sub">RQ: {p.numeroRequerimiento}</span>
                        {p.empresaRazonSocial && <span className="entidad-sub">{p.empresaRazonSocial}</span>}
                      </div>
                    </td>

                    {/* Concepto */}
                    <td>
                      <span className={`pagos-badge ${getConceptoBadgeClass(p.concepto)}`}>
                        {p.concepto}
                        {p.conceptoPersonalizado ? ` (${p.conceptoPersonalizado})` : ''}
                      </span>
                    </td>

                    {/* Monto */}
                    <td>
                      <div className="pagos-cell-monto">
                        <span className="curr">{simbolo}</span>
                        <strong>{p.monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                      </div>
                    </td>

                    {/* Método y Operación */}
                    <td>
                      <div className="pagos-cell-metodo">
                        <span className="metodo">{p.metodoPago}</span>
                        {p.banco && <span className="banco">{p.banco}</span>}
                        {p.numeroOperacion && <code className="op">Op: {p.numeroOperacion}</code>}
                      </div>
                    </td>

                    {/* Beneficiario */}
                    <td>
                      <div className="pagos-cell-benef">
                        <span className="benef">{p.beneficiario || 'No especificado'}</span>
                        <span className="audit">Por: {p.registradoPor}</span>
                      </div>
                    </td>

                    {/* Estado */}
                    <td>
                      <button
                        type="button"
                        className={`pagos-status-btn ${p.estado === 'Conciliado' ? 'pagos-status-btn--conciliado' : 'pagos-status-btn--registrado'}`}
                        onClick={() => handleToggleConciliar(p)}
                        title="Clic para cambiar estado de conciliación"
                      >
                        <GoogleIcon name={p.estado === 'Conciliado' ? 'check_circle' : 'schedule'} size={14} />
                        <span>{p.estado}</span>
                      </button>
                    </td>

                    {/* Acciones */}
                    <td>
                      <div className="pagos-row-actions">
                        <button
                          type="button"
                          className="pagos-action-btn"
                          title="Ver captura completa"
                          onClick={() => setPagoParaVer(p)}
                        >
                          <GoogleIcon name="visibility" size={17} color="#2563eb" />
                        </button>
                        <button
                          type="button"
                          className="pagos-action-btn pagos-action-btn--danger"
                          title="Eliminar registro de pago"
                          onClick={() => handleEliminar(p)}
                        >
                          <GoogleIcon name="delete" size={17} color="#ef4444" />
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

      {/* Modal para ver comprobante */}
      <VerComprobanteModal pago={pagoParaVer} onClose={() => setPagoParaVer(null)} />
    </div>
  );
};
