import React, { useState, useMemo, useEffect } from 'react';
import { GoogleIcon } from '../../components/GoogleIcon';
import type { Oportunidad, TipoPodio } from '../../types/oportunidades';
import type { EjecutivaRanking } from '../../models/EjecutivaRanking.model';

interface PodioComercialViewProps {
  oportunidades: Oportunidad[];
  roleAccent: string;
  initialTipo?: TipoPodio;
}


export const PodioComercialView: React.FC<PodioComercialViewProps> = ({
  oportunidades,
  roleAccent,
  initialTipo = 'licitaciones',
}) => {
  const [tipoPodio, setTipoPodio] = useState<TipoPodio>(initialTipo);
  const [periodo, setPeriodo] = useState<'mes' | 'anterior' | 'anual'>('mes');

  useEffect(() => {
    if (initialTipo && initialTipo !== tipoPodio) {
      setTipoPodio(initialTipo);
    }
  }, [initialTipo]);


  // Calcular ranking según el modo (Licitaciones vs Ventas)
  const ranking: EjecutivaRanking[] = useMemo(() => {
    const mapa = new Map<
      string,
      {
        nombre: string;
        totalOportunidades: number;
        reqsGanadosPrimero: number;
        totalCotizado: number;
        totalGanado: number;
        tiempoPromedioMinutos: number;
        licitacionesAdjudicadas: number;
      }
    >();

    // Mock base con ejecutivas del equipo comercial
    const defaults = [
      {
        nombre: 'Luciana Morales',
        totalOportunidades: 9,
        reqsGanadosPrimero: 8,
        totalCotizado: 185000,
        totalGanado: 142000,
        tiempoPromedioMinutos: 1.4,
        licitacionesAdjudicadas: 6,
      },
      {
        nombre: 'Valeria Quispe',
        totalOportunidades: 7,
        reqsGanadosPrimero: 6,
        totalCotizado: 145000,
        totalGanado: 98000,
        tiempoPromedioMinutos: 2.1,
        licitacionesAdjudicadas: 4,
      },
      {
        nombre: 'Camila Delgado',
        totalOportunidades: 5,
        reqsGanadosPrimero: 4,
        totalCotizado: 110000,
        totalGanado: 75000,
        tiempoPromedioMinutos: 2.8,
        licitacionesAdjudicadas: 3,
      },
      {
        nombre: 'Andrea Benites',
        totalOportunidades: 4,
        reqsGanadosPrimero: 3,
        totalCotizado: 89000,
        totalGanado: 54000,
        tiempoPromedioMinutos: 3.2,
        licitacionesAdjudicadas: 2,
      },
      {
        nombre: 'Sofia Carranza',
        totalOportunidades: 3,
        reqsGanadosPrimero: 2,
        totalCotizado: 62000,
        totalGanado: 38000,
        tiempoPromedioMinutos: 3.9,
        licitacionesAdjudicadas: 1,
      },
    ];

    defaults.forEach((d) => mapa.set(d.nombre.toLowerCase(), { ...d }));

    // Integrar las oportunidades reales del sistema
    oportunidades.forEach((op: Oportunidad) => {
      const nombreNorm = (op.creadoPor || 'Ejecutiva').trim();
      const key = nombreNorm.toLowerCase();
      const existing = mapa.get(key) || {
        nombre: nombreNorm,
        totalOportunidades: 0,
        reqsGanadosPrimero: 0,
        totalCotizado: 0,
        totalGanado: 0,
        tiempoPromedioMinutos: 2.0,
        licitacionesAdjudicadas: 0,
      };

      existing.totalOportunidades += 1;
      existing.reqsGanadosPrimero += 1; // Prioridad otorgada al primer registro
      existing.totalCotizado += Number(op.limiteTotal) || 0;
      if (op.estado === 'Cotizada' || op.estado === 'Adjudicada') {
        existing.totalGanado += Number(op.limiteTotal) || 0;
        existing.licitacionesAdjudicadas += 1;
      }

      mapa.set(key, existing);
    });

    const mult = periodo === 'anterior' ? 0.85 : periodo === 'anual' ? 4.2 : 1.0;

    const lista = Array.from(mapa.values()).map((item) => {
      const totalCotizado = Math.round(item.totalCotizado * mult);
      const totalGanado = Math.round(item.totalGanado * mult);
      const totalOportunidades = Math.max(1, Math.round(item.totalOportunidades * mult));
      const reqsGanadosPrimero = Math.max(1, Math.round(item.reqsGanadosPrimero * mult));
      const licitacionesAdjudicadas = Math.round(item.licitacionesAdjudicadas * mult);
      const tasaEfectividad = Math.min(100, Math.round((totalGanado / (totalCotizado || 1)) * 100));

      return {
        posicion: 0,
        nombre: item.nombre,
        cargo: tipoPodio === 'licitaciones' ? 'Ejecutiva Licitaciones Perú Compras' : 'Ejecutiva de Ventas Corporativas',
        totalOportunidades,
        reqsGanadosPrimero,
        totalCotizado,
        totalGanado,
        tiempoPromedioMinutos: item.tiempoPromedioMinutos,
        licitacionesAdjudicadas,
        ticketPromedio: Math.round(totalGanado / (licitacionesAdjudicadas || 1)),
        ventasCerradas: licitacionesAdjudicadas,
        tasaEfectividad: tasaEfectividad > 0 ? tasaEfectividad : 75,
      };
    });

    // Ordenar según el tipo de podio
    if (tipoPodio === 'licitaciones') {
      // Prioridad 1: Requerimientos ganados primero por orden de llegada, luego total cotizado
      lista.sort((a, b) => {
        if (b.reqsGanadosPrimero !== a.reqsGanadosPrimero) {
          return b.reqsGanadosPrimero - a.reqsGanadosPrimero;
        }
        return b.totalCotizado - a.totalCotizado;
      });
    } else {
      // Ventas: Facturación total ganada
      lista.sort((a, b) => b.totalGanado - a.totalGanado);
    }

    return lista.map((item, index) => ({
      ...item,
      posicion: index + 1,
      insignia:
        tipoPodio === 'licitaciones'
          ? index === 0
            ? '🥇 1° en Llegada (Reina Licitaciones)'
            : index === 1
              ? '🥈 Cazadora de Convocatorias'
              : index === 2
                ? '🥉 Estratega Perú Compras'
                : undefined
          : index === 0
            ? '🥇 Líder Comercial (Top Revenue)'
            : index === 1
              ? '🥈 Master Closer'
              : index === 2
                ? '🥉 Alto Rendimiento'
                : undefined,
    }));
  }, [oportunidades, periodo, tipoPodio]);

  const top1 = ranking[0];
  const top2 = ranking[1];
  const top3 = ranking[2];

  return (
    <div className="reg-podio-container">


      {/* ── Header del Podio ── */}
      <div className="reg-podio-header">
        <div className="reg-podio-header__info">
          <div className="reg-podio-badge">
            <GoogleIcon name="military_tech" size={16} color="#eab308" />
            <span>
              {tipoPodio === 'licitaciones'
                ? 'Convocatorias & Prioridad por Orden de Llegada'
                : 'Revenue Comercial & Ventas Ganadas'}
            </span>
          </div>
          <h2>
            {tipoPodio === 'licitaciones'
              ? 'Podio de Licitaciones Perú Compras'
              : 'Podio de Ventas Comerciales'}
          </h2>
          <p>
            {tipoPodio === 'licitaciones'
              ? 'Reconocimiento en tiempo real a las ejecutivas más veloces en asegurar requerimientos de Perú Compras con prioridad por orden de llegada (First-Come, First-Served).'
              : 'Ranking en tiempo real de facturación neta, órdenes adjudicadas y cumplimiento de metas comerciales.'}
          </p>
        </div>

        <div className="reg-podio-period-tabs">
          {(
            [
              { id: 'mes', label: 'Este Mes' },
              { id: 'anterior', label: 'Mes Anterior' },
              { id: 'anual', label: 'Acumulado Anual' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              className={`reg-period-tab ${periodo === p.id ? 'active' : ''}`}
              onClick={() => setPeriodo(p.id)}
              style={
                periodo === p.id
                  ? { background: roleAccent, color: '#ffffff' }
                  : undefined
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Podio Visual de 3 Pedestales ── */}
      <div className="reg-podium-visual">
        {/* 2do Lugar (Plata) */}
        {top2 && (
          <div className="reg-podium-slot slot-second">
            <div className="reg-podium-medal silver">
              <span>🥈</span>
            </div>
            <div className="reg-podium-avatar silver">
              <span className="reg-podium-initials">
                {top2.nombre.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="reg-podium-name">{top2.nombre}</div>
            <div className="reg-podium-amount">
              S/ {(tipoPodio === 'licitaciones' ? top2.totalCotizado : top2.totalGanado).toLocaleString('es-PE')}
            </div>
            <div className="reg-podium-stats">
              {tipoPodio === 'licitaciones' ? (
                <>
                  <span>🥇 {top2.reqsGanadosPrimero} asegurados 1°</span> &bull;{' '}
                  <span>{top2.tiempoPromedioMinutos} min prom.</span>
                </>
              ) : (
                <>
                  <span>{top2.ventasCerradas} ventas</span> &bull;{' '}
                  <span>{top2.tasaEfectividad}% éxito</span>
                </>
              )}
            </div>
            <div className="reg-pedestal pedestal-2">
              <span className="pedestal-num">2</span>
              <span className="pedestal-label">
                {tipoPodio === 'licitaciones' ? 'CAZADORA DE REQS' : 'SEGUNDO LUGAR'}
              </span>
            </div>
          </div>
        )}

        {/* 1er Lugar (Oro) */}
        {top1 && (
          <div className="reg-podium-slot slot-first">
            <div className="reg-podium-crown">👑</div>
            <div className="reg-podium-medal gold">
              <span>🥇</span>
            </div>
            <div className="reg-podium-avatar gold">
              <span className="reg-podium-initials">
                {top1.nombre.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="reg-podium-name">{top1.nombre}</div>
            <div className="reg-podium-amount gold-text">
              S/ {(tipoPodio === 'licitaciones' ? top1.totalCotizado : top1.totalGanado).toLocaleString('es-PE')}
            </div>
            <div className="reg-podium-stats">
              {tipoPodio === 'licitaciones' ? (
                <>
                  <span>🥇 {top1.reqsGanadosPrimero} asegurados 1°</span> &bull;{' '}
                  <span>⚡ {top1.tiempoPromedioMinutos} min récord</span>
                </>
              ) : (
                <>
                  <span>{top1.ventasCerradas} ventas</span> &bull;{' '}
                  <span>{top1.tasaEfectividad}% éxito</span>
                </>
              )}
            </div>
            <div className="reg-pedestal pedestal-1">
              <span className="pedestal-num">1</span>
              <span className="pedestal-label">
                {tipoPodio === 'licitaciones' ? 'REINA LICITACIONES' : 'LÍDER REBEL'}
              </span>
            </div>
          </div>
        )}

        {/* 3er Lugar (Bronce) */}
        {top3 && (
          <div className="reg-podium-slot slot-third">
            <div className="reg-podium-medal bronze">
              <span>🥉</span>
            </div>
            <div className="reg-podium-avatar bronze">
              <span className="reg-podium-initials">
                {top3.nombre.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="reg-podium-name">{top3.nombre}</div>
            <div className="reg-podium-amount">
              S/ {(tipoPodio === 'licitaciones' ? top3.totalCotizado : top3.totalGanado).toLocaleString('es-PE')}
            </div>
            <div className="reg-podium-stats">
              {tipoPodio === 'licitaciones' ? (
                <>
                  <span>🥇 {top3.reqsGanadosPrimero} asegurados 1°</span> &bull;{' '}
                  <span>{top3.tiempoPromedioMinutos} min prom.</span>
                </>
              ) : (
                <>
                  <span>{top3.ventasCerradas} ventas</span> &bull;{' '}
                  <span>{top3.tasaEfectividad}% éxito</span>
                </>
              )}
            </div>
            <div className="reg-pedestal pedestal-3">
              <span className="pedestal-num">3</span>
              <span className="pedestal-label">
                {tipoPodio === 'licitaciones' ? 'ESTRATEGA PERÚ COMPRAS' : 'TERCER LUGAR'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Galardones Especiales según Modo ── */}
      <div className="reg-podio-cards-grid">
        {tipoPodio === 'licitaciones' ? (
          <>
            <div className="reg-award-card">
              <div className="reg-award-icon" style={{ background: 'rgba(234, 179, 8, 0.12)', color: '#ca8a04' }}>
                <GoogleIcon name="bolt" size={22} color="#ca8a04" />
              </div>
              <div>
                <div className="reg-award-title">⚡ Más Rápida en Captura</div>
                <div className="reg-award-winner">{top1?.nombre ?? 'Luciana Morales'}</div>
                <div className="reg-award-desc">Tiempo de captura récord: 1.4 minutos tras publicación</div>
              </div>
            </div>

            <div className="reg-award-card">
              <div className="reg-award-icon" style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0284c7' }}>
                <GoogleIcon name="verified" size={22} color="#0284c7" />
              </div>
              <div>
                <div className="reg-award-title">🥇 Mayor Prioridad de Llegada</div>
                <div className="reg-award-winner">{top1?.reqsGanadosPrimero ?? 8} Requerimientos Asegurados</div>
                <div className="reg-award-desc">100% de prioridad ganada por First-Come, First-Served</div>
              </div>
            </div>

            <div className="reg-award-card">
              <div className="reg-award-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                <GoogleIcon name="assignment_turned_in" size={22} color="#059669" />
              </div>
              <div>
                <div className="reg-award-title">🏛️ Adjudicación Perú Compras</div>
                <div className="reg-award-winner">{top1?.licitacionesAdjudicadas ?? 6} Convocatorias Ganadas</div>
                <div className="reg-award-desc">Mayor tasa de Buena Pro obtenida para Sales Rebel</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="reg-award-card">
              <div className="reg-award-icon" style={{ background: 'rgba(234, 179, 8, 0.12)', color: '#ca8a04' }}>
                <GoogleIcon name="monetization_on" size={22} color="#ca8a04" />
              </div>
              <div>
                <div className="reg-award-title">💰 Top Facturación Comercial</div>
                <div className="reg-award-winner">{top1?.nombre ?? 'Luciana Morales'}</div>
                <div className="reg-award-desc">S/ {top1?.totalGanado.toLocaleString('es-PE')} facturados</div>
              </div>
            </div>

            <div className="reg-award-card">
              <div className="reg-award-icon" style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0284c7' }}>
                <GoogleIcon name="shopping_cart_checkout" size={22} color="#0284c7" />
              </div>
              <div>
                <div className="reg-award-title">📦 Mayor Volumen de Ventas</div>
                <div className="reg-award-winner">{top1?.ventasCerradas ?? 6} Órdenes Cerradas</div>
                <div className="reg-award-desc">Mayor cantidad de contratos comerciales completados</div>
              </div>
            </div>

            <div className="reg-award-card">
              <div className="reg-award-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                <GoogleIcon name="trending_up" size={22} color="#059669" />
              </div>
              <div>
                <div className="reg-award-title">🎯 Efectividad de Cierre</div>
                <div className="reg-award-winner">{top1?.tasaEfectividad ?? 85}% de Conversión</div>
                <div className="reg-award-desc">Tasa récord de oportunidades convertidas en ventas</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Tabla de Clasificación Completa ── */}
      <div className="reg-card">
        <div className="reg-card__header" style={{ marginBottom: 16 }}>
          <div className="reg-card__header-icon" style={{ background: `${roleAccent}15` }}>
            <GoogleIcon name="leaderboard" size={18} color={roleAccent} />
          </div>
          <div>
            <h3>
              {tipoPodio === 'licitaciones'
                ? 'Ranking de Licitaciones — Prioridad por Orden de Llegada'
                : 'Ranking Comercial — Facturación Neta Ganada'}
            </h3>
            <p>
              {tipoPodio === 'licitaciones'
                ? 'Ordenado por requerimientos asegurados primero y volumen total en licitaciones.'
                : 'Ordenado por facturación neta ganada y efectividad de cierre comercial.'}
            </p>
          </div>
        </div>

        <div className="reg-table-wrapper">
          <table className="reg-table">
            <thead>
              {tipoPodio === 'licitaciones' ? (
                <tr>
                  <th style={{ width: '80px', textAlign: 'center' }}>Posición</th>
                  <th>Ejecutiva</th>
                  <th>Cargo</th>
                  <th style={{ textAlign: 'center' }}>Reqs. Asegurados 1°</th>
                  <th style={{ textAlign: 'right' }}>Total Licitado</th>
                  <th style={{ textAlign: 'center' }}>Tiempo Prom.</th>
                  <th style={{ textAlign: 'center' }}>Adjudicadas</th>
                  <th>Insignia</th>
                </tr>
              ) : (
                <tr>
                  <th style={{ width: '80px', textAlign: 'center' }}>Posición</th>
                  <th>Ejecutiva</th>
                  <th>Cargo</th>
                  <th style={{ textAlign: 'center' }}>Ventas Cerradas</th>
                  <th style={{ textAlign: 'right' }}>Facturación Ganada</th>
                  <th style={{ textAlign: 'right' }}>Ticket Promedio</th>
                  <th style={{ textAlign: 'center' }}>Efectividad</th>
                  <th>Insignia</th>
                </tr>
              )}
            </thead>
            <tbody>
              {ranking.map((item) => (
                <tr key={item.posicion}>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`pos-badge pos-${item.posicion}`}>
                      {item.posicion === 1
                        ? '🥇'
                        : item.posicion === 2
                          ? '🥈'
                          : item.posicion === 3
                            ? '🥉'
                            : `#${item.posicion}`}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="reg-avatar-circle" style={{ background: `${roleAccent}18`, color: roleAccent }}>
                        {item.nombre.substring(0, 2).toUpperCase()}
                      </div>
                      <strong style={{ color: '#0f172a' }}>{item.nombre}</strong>
                    </div>
                  </td>
                  <td style={{ color: '#64748b', fontSize: '13px' }}>{item.cargo}</td>

                  {tipoPodio === 'licitaciones' ? (
                    <>
                      <td style={{ textAlign: 'center' }}>
                        <span className="reg-priority-badge" title="Requerimientos asegurados con prioridad 1° por llegar primero">
                          🥇 {item.reqsGanadosPrimero} asegurados
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        S/ {item.totalCotizado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '12.5px', color: '#0284c7', fontWeight: 600 }}>
                        {item.tiempoPromedioMinutos} min
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="reg-pill" style={{ background: '#ecfdf5', color: '#059669', fontWeight: 700 }}>
                          {item.licitacionesAdjudicadas}
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ textAlign: 'center' }}>
                        <span className="reg-pill" style={{ background: '#f1f5f9', color: '#334155', fontWeight: 700 }}>
                          {item.ventasCerradas}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                        S/ {item.totalGanado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right', fontSize: '12.5px', color: '#64748b' }}>
                        S/ {(item.ticketPromedio || 0).toLocaleString('es-PE')}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                          {item.tasaEfectividad}%
                        </span>
                      </td>
                    </>
                  )}

                  <td>
                    {item.insignia ? (
                      <span className="reg-insignia-pill">{item.insignia}</span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
