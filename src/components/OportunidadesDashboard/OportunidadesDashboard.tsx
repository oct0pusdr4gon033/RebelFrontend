import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleIcon } from '../GoogleIcon/GoogleIcon';
import { useDashboardOportunidades, type DashboardScope } from './useDashboardOportunidades';
import {
  estadoMeta,
  fmtCountdown,
  fmtMoney,
  fmtMoneyCompact,
  fmtRelative,
  type OportunidadRow,
} from './dashboardStats';
import { formatFechaHoraPeru } from '../../utils/dateUtils';
import './OportunidadesDashboard.css';

export interface OportunidadesDashboardProps {
  /**
   * 'sistema'  → todas las oportunidades del sistema (Administrador)
   * 'personal' → solo las oportunidades registradas por el usuario (Ejecutiva)
   */
  scope: DashboardScope;
  /** Ruta a la que navegan las tarjetas/filas al hacer clic */
  detailPath: string;
  accent?: string;
}

const EstadoPill: React.FC<{ estado: string }> = ({ estado }) => {
  const m = estadoMeta(estado);
  return (
    <span
      className="od-pill"
      style={{ color: m.color, background: `${m.color}1a`, borderColor: `${m.color}40` }}
    >
      <i style={{ background: m.color }} />
      {m.label}
    </span>
  );
};

const SectionCard: React.FC<{
  title: string;
  icon: string;
  subtitle?: string;
  accent: string;
  className?: string;
  children: React.ReactNode;
}> = ({ title, icon, subtitle, accent, className = '', children }) => (
  <section className={`od-card ${className}`}>
    <header className="od-card__head">
      <span className="od-card__icon" style={{ color: accent, background: `${accent}14` }}>
        <GoogleIcon name={icon} size={18} color={accent} />
      </span>
      <div>
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </header>
    {children}
  </section>
);

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className="od-empty">
    <GoogleIcon name="inbox" size={28} color="#cbd5e1" />
    <span>{text}</span>
  </div>
);

export const OportunidadesDashboard: React.FC<OportunidadesDashboardProps> = ({
  scope,
  detailPath,
  accent = '#2563eb',
}) => {
  const navigate = useNavigate();
  const { stats: s, loading, error, lastSync, reload } = useDashboardOportunidades(scope);
  const personal = scope === 'personal';

  const goListado = () => navigate(detailPath);

  const entidadOf = (r: OportunidadRow) =>
    r.op.entidadConvocante || r.op.empresaRazonSocial || 'Sin entidad asignada';

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const delta = s.deltaMes;
  const kpis = [
    {
      icon: 'bolt',
      label: personal ? 'Mis oportunidades registradas' : 'Oportunidades en el sistema',
      value: String(s.total),
      color: accent,
      foot:
        delta === null ? (
          <span className="od-muted">{s.mesActual} este mes</span>
        ) : (
          <span className={delta >= 0 ? 'od-up' : 'od-down'}>
            <GoogleIcon name={delta >= 0 ? 'trending_up' : 'trending_down'} size={14} />
            {Math.abs(delta).toFixed(0)}% vs mes anterior
          </span>
        ),
    },
    {
      icon: 'payments',
      label: personal ? 'Mi límite total licitado' : 'Límite total licitado',
      value: fmtMoneyCompact(s.montoLimiteTotal),
      color: '#0ea5e9',
      foot: <span className="od-muted">Ticket prom. {fmtMoneyCompact(s.ticketPromedio)}</span>,
    },
    {
      icon: 'request_quote',
      label: personal ? 'Mi OCAM precio total' : 'OCAM precio total',
      value: fmtMoneyCompact(s.montoOCAMTotal),
      color: '#10b981',
      highlight: true,
      foot: (
        <span className="od-muted">
          {s.ocamCount} OCAM · prom. {fmtMoneyCompact(s.ocamPromedio)}
        </span>
      ),
    },
    {
      icon: 'pending_actions',
      label: personal ? 'Mis oportunidades activas' : 'Oportunidades activas',
      value: String(s.activas),
      color: '#6366f1',
      foot: <span className="od-muted">{fmtMoneyCompact(s.montoActivas)} en juego</span>,
    },
    {
      icon: 'emoji_events',
      label: personal ? 'Mi tasa de éxito' : 'Tasa de éxito global',
      value: s.tasaExito === null ? '—' : `${s.tasaExito.toFixed(0)}%`,
      color: '#f59e0b',
      foot: (
        <span className="od-muted">
          {s.ganadas} ganadas · {s.perdidas} perdidas
        </span>
      ),
    },
    {
      icon: 'alarm',
      label: 'Vencen en 72 h',
      value: String(s.porVencer72h),
      color: s.porVencer72h > 0 ? '#ef4444' : '#94a3b8',
      foot: (
        <span className={s.vencidas > 0 ? 'od-down' : 'od-muted'}>
          {s.vencidas > 0 ? `${s.vencidas} vencida(s) sin cerrar` : 'Sin vencidas pendientes'}
        </span>
      ),
    },
  ];

  const maxMes = Math.max(1, ...s.tendencia.map((t) => t.count));
  const maxEnt = Math.max(1, ...s.topEntidades.map((e) => e.monto));

  if (loading && !lastSync) {
    return (
      <div className="od">
        <div className="od-skel-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="od-skel" />
          ))}
        </div>
        <div className="od-skel od-skel--tall" />
      </div>
    );
  }

  return (
    <div className="od" id="oportunidades-dashboard">
      {/* ── Cabecera ── */}
      <div className="od-top">
        <div>
          <p className="dash__section-title" style={{ margin: 0 }}>
            {personal ? 'Mi Dashboard de Ventas' : 'Dashboard General del Sistema'}
          </p>
          <span className="od-muted od-top__sync">
            {lastSync ? `Actualizado ${formatFechaHoraPeru(new Date(lastSync))}` : 'Sin sincronizar'}
          </span>
        </div>
        <button
          type="button"
          id="od-refresh-btn"
          className="od-refresh"
          onClick={reload}
          disabled={loading}
          style={{ color: accent, borderColor: `${accent}40` }}
        >
          <span className={loading ? 'od-spin' : ''}>
            <GoogleIcon name="sync" size={16} color={accent} />
          </span>
          Actualizar
        </button>
      </div>

      {error && (
        <div className="od-error" role="alert">
          <GoogleIcon name="error" size={18} color="#dc2626" />
          {error}
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="od-kpis">
        {kpis.map((k, i) => (
          <article
            key={k.label}
            className={`od-kpi ${k.highlight ? 'od-kpi--hl' : ''}`}
            style={{ ['--kc' as string]: k.color, animationDelay: `${i * 60}ms` }}
          >
            <div className="od-kpi__icon">
              <GoogleIcon name={k.icon} size={22} color={k.color} />
            </div>
            <div className="od-kpi__value">{k.value}</div>
            <div className="od-kpi__label">{k.label}</div>
            <div className="od-kpi__foot">{k.foot}</div>
          </article>
        ))}
      </div>

      {s.total === 0 && !error ? (
        <SectionCard
          title={personal ? 'Aún no tienes oportunidades' : 'Aún no hay oportunidades en el sistema'}
          icon="bolt"
          accent={accent}
        >
          <Empty
            text={
              personal
                ? 'Registra tu primera oportunidad para ver aquí tus indicadores.'
                : 'Cuando las ejecutivas registren oportunidades verás aquí los indicadores globales.'
            }
          />
        </SectionCard>
      ) : (
        <>
          {/* ── Última y más antigua ── */}
          <div className="od-grid od-grid--2">
            <SectionCard
              title="Última oportunidad"
              subtitle="El registro más reciente en el sistema"
              icon="new_releases"
              accent={accent}
            >
              {s.ultima ? (
                <div className="od-spot" onClick={goListado} role="button" tabIndex={0}>
                  <div className="od-spot__row">
                    <strong className="od-spot__req">{s.ultima.op.numeroRequerimiento}</strong>
                    <EstadoPill estado={s.ultima.op.estado} />
                  </div>
                  <p className="od-spot__ent">{entidadOf(s.ultima)}</p>
                  <dl className="od-spot__meta">
                    <div>
                      <dt>Registrada</dt>
                      <dd>{fmtRelative(s.ultima.registro)}</dd>
                    </div>
                    <div>
                      <dt>Límite total</dt>
                      <dd>{fmtMoney(s.ultima.op.limiteTotal || 0)}</dd>
                    </div>
                    <div>
                      <dt>Acuerdo Marco</dt>
                      <dd>{s.ultima.op.acuerdoMarco?.codigo || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt>OCAM</dt>
                      <dd>
                        {s.ultima.op.ordenCompra?.montoOCAM
                          ? fmtMoney(s.ultima.op.ordenCompra.montoOCAM)
                          : 'Pendiente'}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <Empty text="Sin registros" />
              )}
            </SectionCard>

            <SectionCard
              title="Más antigua sin cerrar"
              subtitle="La oportunidad pendiente con más tiempo en el sistema"
              icon="hourglass_top"
              accent="#f59e0b"
            >
              {s.masAntigua ? (
                <div className="od-spot od-spot--warn" onClick={goListado} role="button" tabIndex={0}>
                  <div className="od-spot__row">
                    <strong className="od-spot__req">{s.masAntigua.op.numeroRequerimiento}</strong>
                    <EstadoPill estado={s.masAntigua.op.estado} />
                  </div>
                  <p className="od-spot__ent">{entidadOf(s.masAntigua)}</p>
                  <div className="od-age">
                    <span className="od-age__n">{s.masAntiguaDias}</span>
                    <span className="od-age__u">
                      {s.masAntiguaDias === 1 ? 'día' : 'días'} en el sistema
                    </span>
                  </div>
                  <dl className="od-spot__meta">
                    <div>
                      <dt>Registrada</dt>
                      <dd>{formatFechaHoraPeru(s.masAntigua.registro ? new Date(s.masAntigua.registro) : null)}</dd>
                    </div>
                    <div>
                      <dt>Límite total</dt>
                      <dd>{fmtMoney(s.masAntigua.op.limiteTotal || 0)}</dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <Empty text="¡Todo al día! No hay oportunidades pendientes." />
              )}
            </SectionCard>
          </div>

          {/* ── Estados + Tendencia ── */}
          <div className="od-grid od-grid--2">
            <SectionCard
              title="Estado de las oportunidades"
              subtitle={`${s.total} en total`}
              icon="donut_large"
              accent={accent}
            >
              <div className="od-stack" aria-hidden="true">
                {s.porEstado.map((b) => (
                  <span
                    key={b.estado}
                    style={{ width: `${b.pct}%`, background: b.color }}
                    title={`${b.label}: ${b.count}`}
                  />
                ))}
              </div>
              <ul className="od-legend">
                {s.porEstado.map((b) => (
                  <li key={b.estado}>
                    <i style={{ background: b.color }} />
                    <span className="od-legend__name">{b.label}</span>
                    <span className="od-legend__bar">
                      <b style={{ width: `${b.pct}%`, background: b.color }} />
                    </span>
                    <span className="od-legend__n">{b.count}</span>
                    <span className="od-legend__pct">{b.pct.toFixed(0)}%</span>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard
              title="Actividad últimos 6 meses"
              subtitle="Oportunidades registradas por mes"
              icon="show_chart"
              accent={accent}
            >
              <div className="od-bars">
                {s.tendencia.map((t) => (
                  <div key={t.key} className="od-bars__col" title={`${t.count} · ${fmtMoney(t.monto)}`}>
                    <span className="od-bars__n">{t.count}</span>
                    <div className="od-bars__track">
                      <div
                        className={`od-bars__fill ${t.actual ? 'is-now' : ''}`}
                        style={{
                          height: `${(t.count / maxMes) * 100}%`,
                          background: t.actual
                            ? `linear-gradient(180deg, ${accent}, ${accent}b3)`
                            : `${accent}40`,
                        }}
                      />
                    </div>
                    <span className="od-bars__l">{t.label}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* ── Últimos movimientos + Próximas a vencer ── */}
          <div className="od-grid od-grid--2-1">
            <SectionCard
              title="Últimos estados"
              subtitle={personal ? 'Movimientos más recientes de tus oportunidades' : 'Movimientos más recientes en todo el sistema'}
              icon="history"
              accent={accent}
            >
              <div className="od-table-wrap">
                <table className="od-table">
                  <thead>
                    <tr>
                      <th>Requerimiento</th>
                      <th>Entidad</th>
                      <th>Estado</th>
                      <th className="r">Límite</th>
                      <th className="r">Actividad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.recientes.map((r) => (
                      <tr key={String(r.op.id)} onClick={goListado}>
                        <td className="strong">{r.op.numeroRequerimiento}</td>
                        <td className="ellipsis" title={entidadOf(r)}>
                          {entidadOf(r)}
                        </td>
                        <td>
                          <EstadoPill estado={r.op.estado} />
                        </td>
                        <td className="r">{fmtMoneyCompact(r.op.limiteTotal || 0)}</td>
                        <td className="r od-muted">{fmtRelative(r.actualizacion)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard
              title="Próximas a vencer"
              subtitle="Convocatorias activas por cerrar"
              icon="schedule"
              accent="#ef4444"
            >
              {s.proximasVencer.length ? (
                <ul className="od-list">
                  {s.proximasVencer.map((r) => {
                    const c = fmtCountdown(r.vencimiento as number);
                    return (
                      <li key={String(r.op.id)} onClick={goListado}>
                        <div>
                          <strong>{r.op.numeroRequerimiento}</strong>
                          <span>{entidadOf(r)}</span>
                        </div>
                        <em className={c.urgent ? 'is-urgent' : ''}>{c.text}</em>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <Empty text="No hay convocatorias próximas a vencer." />
              )}
            </SectionCard>
          </div>

          {/* ── Rendimiento por ejecutiva (solo vista del sistema) ── */}
          {!personal && (
            <SectionCard
              title="Rendimiento por ejecutiva"
              subtitle="Comparativo del equipo comercial"
              icon="groups"
              accent={accent}
            >
              <div className="od-table-wrap">
                <table className="od-table" id="od-tabla-ejecutivas">
                  <thead>
                    <tr>
                      <th>Ejecutiva</th>
                      <th className="r">Total</th>
                      <th className="r">Activas</th>
                      <th className="r">Ganadas</th>
                      <th className="r">Perdidas</th>
                      <th className="r">Éxito</th>
                      <th className="r">Límite total</th>
                      <th className="r">OCAM total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.porEjecutiva.map((e, i) => (
                      <tr key={e.nombre} style={{ cursor: 'default' }}>
                        <td className="strong">
                          <span className="od-medal" data-top={i === 0 ? '1' : undefined}>
                            {i + 1}
                          </span>
                          {e.nombre}
                        </td>
                        <td className="r">{e.total}</td>
                        <td className="r">{e.activas}</td>
                        <td className="r od-cell-up">{e.ganadas}</td>
                        <td className="r od-cell-down">{e.perdidas}</td>
                        <td className="r">{e.tasaExito === null ? '—' : `${e.tasaExito.toFixed(0)}%`}</td>
                        <td className="r">{fmtMoneyCompact(e.monto)}</td>
                        <td className="r">{fmtMoneyCompact(e.montoOCAM)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* ── Top OCAM + Top entidades ── */}
          <div className="od-grid od-grid--2">
            <SectionCard
              title="Top OCAM por precio"
              subtitle="Órdenes con mayor monto adjudicado"
              icon="request_quote"
              accent="#10b981"
            >
              {s.topOCAM.length ? (
                <ol className="od-rank">
                  {s.topOCAM.map((r, i) => (
                    <li key={String(r.op.id)} onClick={goListado}>
                      <span className="od-rank__pos">{i + 1}</span>
                      <div className="od-rank__body">
                        <strong>{r.op.ordenCompra?.nroOCAM || r.op.ordenCompra?.numeroOC || r.op.numeroRequerimiento}</strong>
                        <span>{entidadOf(r)}</span>
                      </div>
                      <b>{fmtMoney(r.op.ordenCompra?.montoOCAM || 0)}</b>
                    </li>
                  ))}
                </ol>
              ) : (
                <Empty text="Aún no hay OCAM con monto registrado." />
              )}
            </SectionCard>

            <SectionCard
              title="Top entidades por monto"
              subtitle="Dónde se concentra el volumen licitado"
              icon="corporate_fare"
              accent={accent}
            >
              <ul className="od-ent">
                {s.topEntidades.map((e) => (
                  <li key={e.nombre}>
                    <div className="od-ent__top">
                      <span className="ellipsis" title={e.nombre}>
                        {e.nombre}
                      </span>
                      <b>{fmtMoneyCompact(e.monto)}</b>
                    </div>
                    <div className="od-ent__bar">
                      <i style={{ width: `${(e.monto / maxEnt) * 100}%`, background: accent }} />
                    </div>
                    <small className="od-muted">
                      {e.count} {e.count === 1 ? 'oportunidad' : 'oportunidades'}
                    </small>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
};

export default OportunidadesDashboard;
