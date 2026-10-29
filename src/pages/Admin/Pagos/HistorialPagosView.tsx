// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Admin/Pagos/HistorialPagosView.tsx
// Vista de tabla e historial interactivo de Solicitudes de Pago vinculadas a Órdenes de Compra
// - Muestra Vencimiento de OC, Cuenta Bancaria, Entidad Correspondiente, Titular y Monto.
// - Para Administrador: permite abrir el modal de resolución (N° Operación, Hora, Evidencia,
//   Estado: Completo | En Revisión | Pago Rechazado con Justificación de Corrección).
// - Para Ejecutiva de Ventas: muestra alertas de Pagos Rechazados con la justificación
//   de la Administradora y botón directo para "Corregir Pago".
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import Swal from 'sweetalert2';
import { GoogleIcon } from '../../../components/GoogleIcon/GoogleIcon';
import { useAuth } from '../../../context/AuthContext';
import type { PagoOC, ConceptoPago } from '../../../types/pagos';
import { eliminarPago, pagoCuentaEnAcumulado } from '../../../api/services/pagos.service';
import { VerComprobanteModal } from './VerComprobanteModal';
import { ResolverPagoAdminModal } from './ResolverPagoAdminModal';
import './Pagos.css';
import { CONCEPTOS_FILTRO } from './CONCEPTOS_FILTRO';
import type { PropsHistorialPagosView } from './HistorialPagosViewProps';

export const HistorialPagosView: React.FC<PropsHistorialPagosView> = ({
  pagos,
  roleAccent = '#2563eb',
  onNuevoPagoClick,
  onPagosActualizados,
  onFiltrarPorOC,
  onCorregirPago,
}) => {
  const { empleado } = useAuth();
  const rolNorm = (empleado?.rolNombre || '').toLowerCase();
  const esAdmin = rolNorm.includes('admin') || rolNorm.includes('sysadmin');

  const [busqueda, setBusqueda] = useState('');
  const [conceptoFiltro, setConceptoFiltro] = useState<string>('todos');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('todos');
  const [monedaFiltro, setMonedaFiltro] = useState<string>('todas');

  const [pagoParaVer, setPagoParaVer] = useState<PagoOC | null>(null);
  const [pagoParaResolverAdmin, setPagoParaResolverAdmin] = useState<PagoOC | null>(null);

  // Totales generales y contadores por estado
  const resumen = useMemo(() => {
    let totalPEN = 0;
    let totalUSD = 0;
    let totalFlete = 0;
    let totalComision = 0;
    let totalGastosVarios = 0;
    let totalMercaderia = 0;
    let enRevisionCount = 0;
    let completosCount = 0;
    let rechazadosCount = 0;

    pagos.forEach((p) => {
      const est = (p.estado || '').toLowerCase();
      if (est === 'completo' || est === 'conciliado') completosCount++;
      else if (est === 'pago rechazado' || est === 'rechazado') rechazadosCount++;
      else enRevisionCount++;

      if (!pagoCuentaEnAcumulado(p.estado)) return;

      if (p.moneda === 'PEN') {
        totalPEN += p.monto;
        if (p.concepto === 'Flete') totalFlete += p.monto;
        else if (p.concepto === 'Comisión') totalComision += p.monto;
        else if (p.concepto === 'Gastos Varios') totalGastosVarios += p.monto;
        else if (
          p.concepto === 'Mercadería / Proveedor' ||
          p.concepto === 'Adelanto' ||
          p.concepto === 'Liquidación Final'
        ) {
          totalMercaderia += p.monto;
        }
      } else {
        totalUSD += p.monto;
      }
    });

    return {
      totalPEN,
      totalUSD,
      totalFlete,
      totalComision,
      totalGastosVarios,
      totalMercaderia,
      enRevisionCount,
      completosCount,
      rechazadosCount,
    };
  }, [pagos]);

  // Pagos rechazados que requieren corrección
  const pagosRechazados = useMemo(() => {
    return pagos.filter((p) => p.estado === 'Pago Rechazado');
  }, [pagos]);

  // Filtrado de lista
  const pagosFiltrados = useMemo(() => {
    return pagos.filter((p) => {
      if (conceptoFiltro !== 'todos' && p.concepto !== conceptoFiltro) return false;
      if (monedaFiltro !== 'todas' && p.moneda !== monedaFiltro) return false;

      if (estadoFiltro !== 'todos') {
        const est = p.estado || 'En Revisión';
        if (estadoFiltro === 'Completo' && est !== 'Completo' && est !== 'Conciliado') return false;
        if (estadoFiltro === 'En Revisión' && est !== 'En Revisión' && est !== 'Registrado') return false;
        if (estadoFiltro === 'Pago Rechazado' && est !== 'Pago Rechazado') return false;
      }

      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const enOC = p.numeroOC.toLowerCase().includes(q);
        const enRQ = p.numeroRequerimiento.toLowerCase().includes(q);
        const enCod = p.codigoPago.toLowerCase().includes(q);
        const enOp = (p.numeroOperacion || '').toLowerCase().includes(q);
        const enTitular = (p.titularCuenta || p.beneficiario || '').toLowerCase().includes(q);
        const enEntidad = (p.entidadCorrespondiente || p.banco || '').toLowerCase().includes(q);
        const enCuenta = (p.numeroCuentaBancaria || '').toLowerCase().includes(q);
        const enEmpresa = (p.empresaRazonSocial || '').toLowerCase().includes(q);
        if (!enOC && !enRQ && !enCod && !enOp && !enTitular && !enEntidad && !enCuenta && !enEmpresa) {
          return false;
        }
      }

      return true;
    });
  }, [pagos, conceptoFiltro, estadoFiltro, monedaFiltro, busqueda]);

  const handleEliminar = async (pago: PagoOC) => {
    const res = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar esta solicitud de pago?',
      html: `Estás a punto de eliminar el registro <strong>${pago.codigoPago}</strong> de <strong>${pago.moneda === 'PEN' ? 'S/' : '$'} ${pago.monto.toFixed(2)}</strong> vinculado a la OC <strong>${pago.numeroOC}</strong>.`,
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
          title: 'Registro eliminado',
          text: 'La solicitud de pago ha sido removida.',
          timer: 1500,
          showConfirmButton: false,
        });
        onPagosActualizados();
      }
    }
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

  const renderEstadoBadge = (p: PagoOC) => {
    const est = p.estado || 'En Revisión';
    if (est === 'Completo' || est === 'Conciliado') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            background: '#ecfdf5',
            color: '#059669',
            border: '1px solid #a7f3d0',
            fontWeight: 700,
            fontSize: '11.5px',
          }}
        >
          <GoogleIcon name="check_circle" size={14} color="#059669" />
          <span>Completo</span>
        </span>
      );
    }
    if (est === 'Pago Rechazado') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            background: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fca5a5',
            fontWeight: 700,
            fontSize: '11.5px',
          }}
        >
          <GoogleIcon name="cancel" size={14} color="#dc2626" />
          <span>Pago Rechazado</span>
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          background: '#fffbeb',
          color: '#d97706',
          border: '1px solid #fde68a',
          fontWeight: 700,
          fontSize: '11.5px',
        }}
      >
        <GoogleIcon name="schedule" size={14} color="#d97706" />
        <span>En Revisión</span>
      </span>
    );
  };

  return (
    <div className="pagos-historial-container">
      {/* BANNER DE ALERTA SI HAY PAGOS RECHAZADOS PARA CORRECCIÓN */}
      {pagosRechazados.length > 0 && (
        <div
          style={{
            background: '#fef2f2',
            border: '1.5px solid #f87171',
            padding: '14px 18px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <GoogleIcon name="warning" size={24} color="#dc2626" />
            <div>
              <strong style={{ color: '#991b1b', fontSize: '13.5px', display: 'block' }}>
                Atención: Hay {pagosRechazados.length} solicitud(es) en estado "Pago Rechazado" enviadas a corrección
              </strong>
              <span style={{ color: '#7f1d1d', fontSize: '12px' }}>
                Revisa la justificación de corrección indicada por la Administradora y corrige los datos bancarios o el monto.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEstadoFiltro(estadoFiltro === 'Pago Rechazado' ? 'todos' : 'Pago Rechazado')}
            style={{
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              padding: '7px 14px',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {estadoFiltro === 'Pago Rechazado' ? 'Ver Todos los Pagos' : 'Filtrar Pagos Rechazados'}
          </button>
        </div>
      )}

      {/* KPI Cards Superiores */}
      <div className="pagos-stats-grid">
        <div className="pagos-stat-card pagos-stat-card--primary">
          <div
            className="pagos-stat-card__icon"
            style={{ background: `${roleAccent}15`, color: roleAccent }}
          >
            <GoogleIcon name="payments" size={26} color={roleAccent} />
          </div>
          <div className="pagos-stat-card__info">
            <span className="label">Total Solicitado / Pagado (PEN)</span>
            <div className="value">
              S/ {resumen.totalPEN.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="sub">
              {resumen.completosCount} completo(s) · {resumen.enRevisionCount} en revisión
            </span>
          </div>
        </div>

        <div className="pagos-stat-card">
          <div className="pagos-stat-card__icon" style={{ background: '#8b5cf615', color: '#8b5cf6' }}>
            <GoogleIcon name="local_shipping" size={26} color="#8b5cf6" />
          </div>
          <div className="pagos-stat-card__info">
            <span className="label">Pagos de Flete</span>
            <div className="value">
              S/ {resumen.totalFlete.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="sub">Controlado según ajuste de flete</span>
          </div>
        </div>

        <div className="pagos-stat-card">
          <div className="pagos-stat-card__icon" style={{ background: '#f59e0b15', color: '#d97706' }}>
            <GoogleIcon name="schedule" size={26} color="#d97706" />
          </div>
          <div className="pagos-stat-card__info">
            <span className="label">Solicitudes En Revisión</span>
            <div className="value">{resumen.enRevisionCount}</div>
            <span className="sub">Pendientes de operación / voucher</span>
          </div>
        </div>

        <div className="pagos-stat-card">
          <div className="pagos-stat-card__icon" style={{ background: '#ef444415', color: '#dc2626' }}>
            <GoogleIcon name="edit_note" size={26} color="#dc2626" />
          </div>
          <div className="pagos-stat-card__info">
            <span className="label">Pagos Rechazados</span>
            <div className="value">{resumen.rechazadosCount}</div>
            <span className="sub">Enviados a corrección por Admin</span>
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
            placeholder="Buscar por N° OC, Cuenta Bancaria, Titular, Entidad, Código u Operación..."
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
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
          >
            <option value="todos">Estado: Todos</option>
            <option value="En Revisión">En Revisión</option>
            <option value="Completo">Completo</option>
            <option value="Pago Rechazado">Pago Rechazado (Por Corregir)</option>
          </select>

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
            <span>Solicitar Pago</span>
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
              style={
                isActive
                  ? { borderColor: roleAccent, color: roleAccent, background: `${roleAccent}10` }
                  : undefined
              }
              onClick={() => setConceptoFiltro(tab.id)}
            >
              <GoogleIcon name={tab.icon} size={17} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tabla de Solicitudes de Pago */}
      {pagosFiltrados.length === 0 ? (
        <div className="pagos-empty-state">
          <div className="pagos-empty-state__icon">
            <GoogleIcon name="receipt_long" size={48} color="#94a3b8" />
          </div>
          <h3>No se encontraron solicitudes de pago</h3>
          <p>
            {busqueda || conceptoFiltro !== 'todos' || estadoFiltro !== 'todos'
              ? 'No hay registros que coincidan con los filtros seleccionados.'
              : 'Aún no se han registrado solicitudes de pago vinculadas a Órdenes de Compra.'}
          </p>
          <button
            type="button"
            className="pagos-btn pagos-btn--primary"
            style={{ background: roleAccent }}
            onClick={onNuevoPagoClick}
          >
            <GoogleIcon name="add_card" size={18} color="#fff" />
            <span>Solicitar Primer Pago</span>
          </button>
        </div>
      ) : (
        <div className="pagos-table-wrapper">
          <table className="pagos-table">
            <thead>
              <tr>
                <th style={{ width: '76px' }}>Evidencia</th>
                <th>Código & Fechas</th>
                <th>Orden de Compra</th>
                <th>Cuenta de la Entidad y Titular</th>
                <th>Concepto & Monto</th>
                <th>Operación & Hora (Admin)</th>
                <th>Estado & Justificación</th>
                <th style={{ width: '160px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagosFiltrados.map((p) => {
                const simbolo = p.moneda === 'PEN' ? 'S/' : '$';
                const tieneEvidenciaReal = Boolean(
                  p.comprobante?.dataUrl &&
                    !p.comprobante.dataUrl.includes('SIN%20VOUCHER') &&
                    p.comprobante.tamanoBytes > 0
                );

                return (
                  <tr
                    key={p.id}
                    style={
                      p.estado === 'Pago Rechazado'
                        ? { background: '#fff5f5' }
                        : undefined
                    }
                  >
                    {/* Evidencia / Captura */}
                    <td>
                      {tieneEvidenciaReal ? (
                        <div
                          className="pagos-thumb-wrapper"
                          onClick={() => setPagoParaVer(p)}
                          title="Clic para ver evidencia del pago"
                        >
                          <img src={p.comprobante.dataUrl} alt={p.comprobante.nombreArchivo} />
                          <div className="pagos-thumb-overlay">
                            <GoogleIcon name="zoom_in" size={16} color="#fff" />
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => (esAdmin ? setPagoParaResolverAdmin(p) : setPagoParaVer(p))}
                          title={
                            esAdmin
                              ? 'Clic para adjuntar evidencia del pago'
                              : 'Evidencia pendiente de adjuntar por Administración'
                          }
                          style={{
                            width: 54,
                            height: 44,
                            background: '#f1f5f9',
                            border: '1px dashed #94a3b8',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '9.5px',
                            color: '#64748b',
                            fontWeight: 700,
                            textAlign: 'center',
                          }}
                        >
                          <GoogleIcon name="hourglass_empty" size={14} color="#64748b" />
                          <span>Sin Voucher</span>
                        </div>
                      )}
                    </td>

                    {/* Código y Fechas (Solicitud + Vencimiento de OC) */}
                    <td>
                      <div className="pagos-cell-code">
                        <strong>{p.codigoPago}</strong>
                        <span>Solicitud: {p.fechaPago}</span>
                        {p.fechaVencimientoOC && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: '#b45309',
                              fontWeight: 700,
                              background: '#fffbeb',
                              padding: '1px 5px',
                              border: '1px solid #fde68a',
                              marginTop: 2,
                              display: 'inline-block',
                            }}
                          >
                            Venc. OC: {p.fechaVencimientoOC}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Orden de Compra */}
                    <td>
                      <div className="pagos-cell-oc">
                        <div
                          className="pagos-oc-tag"
                          onClick={() => onFiltrarPorOC && onFiltrarPorOC(p.numeroOC)}
                        >
                          <GoogleIcon name="description" size={14} />
                          <span>{p.numeroOC}</span>
                        </div>
                        <span className="rq-sub">RQ: {p.numeroRequerimiento}</span>
                        {p.empresaRazonSocial && (
                          <span className="entidad-sub">{p.empresaRazonSocial}</span>
                        )}
                      </div>
                    </td>

                    {/* Cuenta de la Entidad y Titular */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: '12.5px', color: '#1e3a8a' }}>
                          {p.entidadCorrespondiente || p.banco || 'Entidad no indicada'}
                        </span>
                        {p.numeroCuentaBancaria ? (
                          <code
                            style={{
                              fontSize: '11.5px',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              padding: '1px 6px',
                              border: '1px solid #bfdbfe',
                              fontWeight: 700,
                              width: 'fit-content',
                            }}
                          >
                            Cta: {p.numeroCuentaBancaria}
                          </code>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Sin N° de cuenta</span>
                        )}
                        <span style={{ fontSize: '11.5px', color: '#334155', fontWeight: 600 }}>
                          Titular: {p.titularCuenta || p.beneficiario || 'No especificado'}
                        </span>
                        <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                          Solicitado por: {p.registradoPor}
                        </span>
                      </div>
                    </td>

                    {/* Concepto & Monto */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span
                          className={`pagos-badge ${getConceptoBadgeClass(p.concepto)}`}
                          style={{ width: 'fit-content' }}
                        >
                          {p.concepto}
                        </span>
                        <div className="pagos-cell-monto">
                          <span className="curr">{simbolo}</span>
                          <strong>
                            {p.monto.toLocaleString('es-PE', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </strong>
                        </div>
                      </div>
                    </td>

                    {/* Operación & Hora (Completado por Administrador) */}
                    <td>
                      <div className="pagos-cell-metodo">
                        {p.numeroOperacion ? (
                          <>
                            <code className="op">Op: {p.numeroOperacion}</code>
                            {p.horaPago && (
                              <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: 700 }}>
                                🕒 Hora: {p.horaPago}
                              </span>
                            )}
                            <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                              {p.metodoPago}
                            </span>
                          </>
                        ) : (
                          <span
                            style={{
                              fontSize: '11px',
                              color: '#94a3b8',
                              fontStyle: 'italic',
                            }}
                          >
                            Pendiente completar N° Op y Hora (Admin)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Estado & Justificación de Corrección */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {renderEstadoBadge(p)}
                        {p.estado === 'Pago Rechazado' && p.justificacionCorreccion && (
                          <div
                            style={{
                              background: '#fef2f2',
                              borderLeft: '3px solid #dc2626',
                              padding: '5px 8px',
                              fontSize: '11px',
                              color: '#991b1b',
                              maxWidth: '240px',
                              lineHeight: 1.35,
                            }}
                          >
                            <strong>Corregir:</strong> {p.justificacionCorreccion}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Acciones según Rol */}
                    <td>
                      <div
                        className="pagos-row-actions"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}
                      >
                        {/* Acción para Administrador: Completar N° Operación, Hora, Evidencia y Estado */}
                        {esAdmin && (
                          <button
                            type="button"
                            onClick={() => setPagoParaResolverAdmin(p)}
                            title="Completar N° Operación, Hora, Evidencia o Rechazar con Justificación"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '5px 9px',
                              background: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <GoogleIcon name="fact_check" size={14} color="#ffffff" />
                            <span>Gestionar</span>
                          </button>
                        )}

                        {/* Acción para Corregir cuando el pago está Rechazado */}
                        {p.estado === 'Pago Rechazado' && onCorregirPago && (
                          <button
                            type="button"
                            onClick={() => onCorregirPago(p)}
                            title="Corregir datos del pago rechazado y reenviar a revisión"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '5px 9px',
                              background: '#dc2626',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <GoogleIcon name="edit" size={14} color="#ffffff" />
                            <span>Corregir</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="pagos-action-btn"
                          title="Ver ficha completa y comprobante"
                          onClick={() => setPagoParaVer(p)}
                        >
                          <GoogleIcon name="visibility" size={17} color="#2563eb" />
                        </button>

                        <button
                          type="button"
                          className="pagos-action-btn pagos-action-btn--danger"
                          title="Eliminar solicitud de pago"
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

      {/* Modal para ver comprobante y detalle */}
      <VerComprobanteModal pago={pagoParaVer} onClose={() => setPagoParaVer(null)} />

      {/* Modal de Resolución exclusiva del Administrador */}
      <ResolverPagoAdminModal
        pago={pagoParaResolverAdmin}
        roleAccent={roleAccent}
        onClose={() => setPagoParaResolverAdmin(null)}
        onPagoResuelto={() => {
          setPagoParaResolverAdmin(null);
          onPagosActualizados();
        }}
      />
    </div>
  );
};
