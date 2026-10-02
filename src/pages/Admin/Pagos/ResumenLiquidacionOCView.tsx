// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Admin/Pagos/ResumenLiquidacionOCView.tsx
// Vista consolidada de pagos y liquidación financiera por cada Orden de Compra (OC)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import { GoogleIcon } from '../../../components/GoogleIcon';
import type { PagoOC } from '../../../types/pagos';
import type { Oportunidad } from '../../../types/oportunidades';
import { calcularLiquidacionesOC } from '../../../api/services/pagos.service';
import { VerComprobanteModal } from './VerComprobanteModal';
import './Pagos.css';

interface ResumenLiquidacionOCViewProps {
  oportunidades: Oportunidad[];
  pagos: PagoOC[];
  roleAccent?: string;
  onRegistrarPagoParaOC: (numeroOC: string) => void;
}

export const ResumenLiquidacionOCView: React.FC<ResumenLiquidacionOCViewProps> = ({
  oportunidades,
  pagos,
  roleAccent = '#2563eb',
  onRegistrarPagoParaOC,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [expandedOC, setExpandedOC] = useState<string | null>(null);
  const [pagoParaVer, setPagoParaVer] = useState<PagoOC | null>(null);

  const liquidaciones = useMemo(() => {
    return calcularLiquidacionesOC(oportunidades, pagos);
  }, [oportunidades, pagos]);

  const filtradas = useMemo(() => {
    if (!busqueda.trim()) return liquidaciones;
    const q = busqueda.toLowerCase().trim();
    return liquidaciones.filter(
      (l) =>
        l.numeroOC.toLowerCase().includes(q) ||
        l.numeroRequerimiento.toLowerCase().includes(q) ||
        l.empresa.toLowerCase().includes(q)
    );
  }, [liquidaciones, busqueda]);

  const toggleExpand = (numeroOC: string) => {
    setExpandedOC((prev) => (prev === numeroOC ? null : numeroOC));
  };

  return (
    <div className="pagos-liquidacion-container">
      {/* Explicación y buscador */}
      <div className="pagos-liquidacion-banner">
        <div className="pagos-liquidacion-banner__info">
          <div className="pagos-liquidacion-banner__icon" style={{ background: `${roleAccent}15`, color: roleAccent }}>
            <GoogleIcon name="analytics" size={24} color={roleAccent} />
          </div>
          <div>
            <h3>Consolidado de Costos y Liquidación por Orden de Compra</h3>
            <p>
              Revisa el acumulado de desembolsos en <strong>flete</strong>, <strong>comisiones</strong>, <strong>gastos varios</strong> y <strong>mercadería</strong> vinculados a cada OC.
            </p>
          </div>
        </div>

        <div className="pagos-search-wrap" style={{ minWidth: '320px' }}>
          <GoogleIcon name="search" size={20} color="#94a3b8" />
          <input
            type="text"
            className="pagos-search-input"
            placeholder="Buscar por N° OC o Requerimiento..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de Liquidaciones por OC */}
      {filtradas.length === 0 ? (
        <div className="pagos-empty-state">
          <GoogleIcon name="inventory_2" size={48} color="#94a3b8" />
          <h3>No hay órdenes de compra disponibles</h3>
          <p>No se encontraron registros de órdenes de compra con los criterios especificados.</p>
        </div>
      ) : (
        <div className="pagos-oc-cards-list">
          {filtradas.map((liq) => {
            const isExpanded = expandedOC === liq.numeroOC;
            const tienePagos = liq.conteoPagos > 0;

            return (
              <div key={liq.numeroOC} className={`pagos-oc-card ${isExpanded ? 'pagos-oc-card--expanded' : ''}`}>
                {/* Cabecera de la OC */}
                <div className="pagos-oc-card__header">
                  <div className="pagos-oc-card__identity">
                    <div className="pagos-oc-card__code">
                      <GoogleIcon name="description" size={20} color="#2563eb" />
                      <strong>{liq.numeroOC}</strong>
                    </div>
                    <span className="pagos-oc-card__rq">RQ: {liq.numeroRequerimiento}</span>
                    <span className="pagos-oc-card__empresa">{liq.empresa}</span>
                  </div>

                  <div className="pagos-oc-card__actions">
                    <button
                      type="button"
                      className="pagos-btn pagos-btn--sm pagos-btn--primary"
                      style={{ background: roleAccent }}
                      onClick={() => onRegistrarPagoParaOC(liq.numeroOC)}
                    >
                      <GoogleIcon name="add_card" size={16} color="#fff" />
                      <span>Agregar Pago a esta OC</span>
                    </button>
                    {tienePagos && (
                      <button
                        type="button"
                        className="pagos-btn pagos-btn--sm pagos-btn--outline"
                        onClick={() => toggleExpand(liq.numeroOC)}
                      >
                        <GoogleIcon name={isExpanded ? 'expand_less' : 'expand_more'} size={18} />
                        <span>{isExpanded ? 'Ocultar' : `Ver ${liq.conteoPagos} pago(s)`}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Métricas clave de la OC */}
                <div className="pagos-oc-card__metrics-row">
                  <div className="pagos-oc-metric">
                    <span className="label">Total Pagado (PEN)</span>
                    <strong className="value highlight">
                      S/ {liq.totalPagadoPEN.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                    <span className="sub">{liq.conteoPagos} desembolso(s)</span>
                  </div>

                  <div className="pagos-oc-metric">
                    <span className="label">Flete Acumulado</span>
                    <strong className="value text-flete">
                      S/ {liq.totalFlete.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <div className="pagos-oc-metric">
                    <span className="label">Comisiones</span>
                    <strong className="value text-comision">
                      S/ {liq.totalComision.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <div className="pagos-oc-metric">
                    <span className="label">Gastos Varios</span>
                    <strong className="value text-gastos">
                      S/ {liq.totalGastosVarios.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <div className="pagos-oc-metric">
                    <span className="label">Mercadería / Stock</span>
                    <strong className="value text-mercaderia">
                      S/ {liq.totalMercaderia.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>

                {/* Barra de Distribución Visual */}
                {liq.totalPagadoPEN > 0 && (
                  <div className="pagos-dist-bar-wrapper">
                    <div className="pagos-dist-bar">
                      {liq.totalFlete > 0 && (
                        <div
                          className="pagos-dist-seg pagos-dist-seg--flete"
                          style={{ width: `${(liq.totalFlete / liq.totalPagadoPEN) * 100}%` }}
                          title={`Flete: S/ ${liq.totalFlete.toFixed(2)} (${Math.round((liq.totalFlete / liq.totalPagadoPEN) * 100)}%)`}
                        />
                      )}
                      {liq.totalComision > 0 && (
                        <div
                          className="pagos-dist-seg pagos-dist-seg--comision"
                          style={{ width: `${(liq.totalComision / liq.totalPagadoPEN) * 100}%` }}
                          title={`Comisión: S/ ${liq.totalComision.toFixed(2)} (${Math.round((liq.totalComision / liq.totalPagadoPEN) * 100)}%)`}
                        />
                      )}
                      {liq.totalGastosVarios > 0 && (
                        <div
                          className="pagos-dist-seg pagos-dist-seg--gastos"
                          style={{ width: `${(liq.totalGastosVarios / liq.totalPagadoPEN) * 100}%` }}
                          title={`Gastos Varios: S/ ${liq.totalGastosVarios.toFixed(2)} (${Math.round((liq.totalGastosVarios / liq.totalPagadoPEN) * 100)}%)`}
                        />
                      )}
                      {liq.totalMercaderia > 0 && (
                        <div
                          className="pagos-dist-seg pagos-dist-seg--mercaderia"
                          style={{ width: `${(liq.totalMercaderia / liq.totalPagadoPEN) * 100}%` }}
                          title={`Mercadería: S/ ${liq.totalMercaderia.toFixed(2)} (${Math.round((liq.totalMercaderia / liq.totalPagadoPEN) * 100)}%)`}
                        />
                      )}
                    </div>
                    <div className="pagos-dist-legend">
                      <span className="dot dot--flete">Flete</span>
                      <span className="dot dot--comision">Comisión</span>
                      <span className="dot dot--gastos">Gastos Varios</span>
                      <span className="dot dot--mercaderia">Mercadería</span>
                    </div>
                  </div>
                )}

                {/* Lista desplegada de pagos de esta OC */}
                {isExpanded && tienePagos && (
                  <div className="pagos-oc-details-table-wrap">
                    <h4>Desglose individual de pagos realizados</h4>
                    <table className="pagos-subtable">
                      <thead>
                        <tr>
                          <th>Voucher</th>
                          <th>Código</th>
                          <th>Concepto</th>
                          <th>Fecha</th>
                          <th>Método / Op</th>
                          <th>Beneficiario</th>
                          <th>Monto</th>
                          <th style={{ textAlign: 'center' }}>Captura</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liq.pagos.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <div
                                className="pagos-subtable-thumb"
                                onClick={() => setPagoParaVer(p)}
                                title="Ver comprobante"
                              >
                                <img src={p.comprobante.dataUrl} alt={p.comprobante.nombreArchivo} />
                              </div>
                            </td>
                            <td>
                              <strong>{p.codigoPago}</strong>
                            </td>
                            <td>
                              <span className="pagos-subtable-concept">{p.concepto}</span>
                            </td>
                            <td>{p.fechaPago}</td>
                            <td>
                              <span>{p.metodoPago}</span>
                              {p.numeroOperacion && <small> · Op: {p.numeroOperacion}</small>}
                            </td>
                            <td>{p.beneficiario || '—'}</td>
                            <td>
                              <strong>
                                {p.moneda === 'PEN' ? 'S/' : '$'}{' '}
                                {p.monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </strong>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="pagos-action-btn"
                                onClick={() => setPagoParaVer(p)}
                                title="Ver captura en pantalla completa"
                              >
                                <GoogleIcon name="visibility" size={16} color="#2563eb" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para ver comprobante */}
      <VerComprobanteModal pago={pagoParaVer} onClose={() => setPagoParaVer(null)} />
    </div>
  );
};
