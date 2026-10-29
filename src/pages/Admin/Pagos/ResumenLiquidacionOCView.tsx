// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Admin/Pagos/ResumenLiquidacionOCView.tsx
// Vista consolidada de pagos y liquidación financiera por cada Orden de Compra (OC)
// Incluye Monto Base OC, Ajustes del Flete y Techo Total (OC + Ajustes del Flete)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import { GoogleIcon } from '../../../components/GoogleIcon/GoogleIcon';
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
          <div
            className="pagos-liquidacion-banner__icon"
            style={{ background: `${roleAccent}15`, color: roleAccent }}
          >
            <GoogleIcon name="analytics" size={24} color={roleAccent} />
          </div>
          <div>
            <h3>Consolidado de Costos y Liquidación por Orden de Compra</h3>
            <p>
              Revisa el acumulado de pagos frente al <strong>Techo Total (Orden de Compra + Ajustes del Flete)</strong> y el control de flete de cada OC.
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
            const montoBaseOC = liq.costoInicial || 0;
            const techoConAjustes = liq.techoConAjustes ?? montoBaseOC + (liq.totalAjusteFlete || 0);

            return (
              <div
                key={liq.numeroOC}
                className={`pagos-oc-card ${isExpanded ? 'pagos-oc-card--expanded' : ''}`}
              >
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
                      <span>Solicitar Pago para esta OC</span>
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
                    <span className="label">Techo (OC + Ajustes Flete)</span>
                    <strong className="value" style={{ color: '#059669' }}>
                      S/{' '}
                      {techoConAjustes.toLocaleString('es-PE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </strong>
                    <span className="sub">
                      OC: S/ {montoBaseOC.toFixed(2)} + Ajuste Flete: S/{' '}
                      {(liq.totalAjusteFlete || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="pagos-oc-metric">
                    <span className="label">Total Solicitado / Pagado</span>
                    <strong className="value highlight">
                      S/{' '}
                      {liq.totalPagadoPEN.toLocaleString('es-PE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </strong>
                    <span className="sub">{liq.conteoPagos} solicitud(es)</span>
                  </div>

                  <div className="pagos-oc-metric">
                    <span className="label">Flete Acumulado / Ajuste</span>
                    <strong className="value text-flete">
                      S/{' '}
                      {liq.totalFlete.toLocaleString('es-PE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </strong>
                    <span className="sub">Tope Ajuste: S/ {(liq.totalAjusteFlete || 0).toFixed(2)}</span>
                  </div>

                  <div className="pagos-oc-metric">
                    <span className="label">Mercadería / Proveedor</span>
                    <strong className="value text-mercaderia">
                      S/{' '}
                      {liq.totalMercaderia.toLocaleString('es-PE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </strong>
                  </div>

                  <div className="pagos-oc-metric">
                    <span className="label">Saldo Disponible OC</span>
                    <strong className="value" style={{ color: '#1d4ed8' }}>
                      S/{' '}
                      {Math.max(0, techoConAjustes - liq.totalPagadoPEN).toLocaleString('es-PE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </strong>
                  </div>
                </div>

                {/* Lista desplegada de pagos de esta OC */}
                {isExpanded && tienePagos && (
                  <div className="pagos-oc-details-table-wrap">
                    <h4>Desglose individual de solicitudes de pago</h4>
                    <table className="pagos-subtable">
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Concepto</th>
                          <th>Venc. OC</th>
                          <th>Entidad & Cuenta Bancaria</th>
                          <th>Titular de Cuenta</th>
                          <th>N° Operación / Hora</th>
                          <th>Estado</th>
                          <th>Monto</th>
                          <th style={{ textAlign: 'center' }}>Detalle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liq.pagos.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <strong>{p.codigoPago}</strong>
                            </td>
                            <td>
                              <span className="pagos-subtable-concept">{p.concepto}</span>
                            </td>
                            <td>{p.fechaVencimientoOC || p.fechaPago}</td>
                            <td>
                              <strong>{p.entidadCorrespondiente || p.banco || '—'}</strong>
                              {p.numeroCuentaBancaria && (
                                <div style={{ fontSize: '11px', color: '#1d4ed8', fontFamily: 'monospace' }}>
                                  Cta: {p.numeroCuentaBancaria}
                                </div>
                              )}
                            </td>
                            <td>{p.titularCuenta || p.beneficiario || '—'}</td>
                            <td>
                              {p.numeroOperacion ? (
                                <span>
                                  Op: {p.numeroOperacion} {p.horaPago ? `(${p.horaPago})` : ''}
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '11px' }}>Pendiente Admin</span>
                              )}
                            </td>
                            <td>
                              <strong>{p.estado}</strong>
                            </td>
                            <td>
                              <strong>
                                {p.moneda === 'PEN' ? 'S/' : '$'}{' '}
                                {p.monto.toLocaleString('es-PE', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </strong>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="pagos-action-btn"
                                onClick={() => setPagoParaVer(p)}
                                title="Ver ficha completa"
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
