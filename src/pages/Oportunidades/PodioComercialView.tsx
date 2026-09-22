import React, { useState, useMemo, useEffect } from 'react';
import { GoogleIcon } from '../../components/GoogleIcon';
import type { Oportunidad, TipoPodio } from '../../types/oportunidades';
import type { EjecutivaRanking } from '../../models/EjecutivaRanking.model';
import { formatHoraExacta, formatDiferenciaTiempo } from '../../utils/dateUtils';

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
  const [selectedReq, setSelectedReq] = useState<string>('todos');

  useEffect(() => {
    if (initialTipo && initialTipo !== tipoPodio) {
      setTipoPodio(initialTipo);
    }
  }, [initialTipo]);

  // Lista de requerimientos únicos ordenados por mayor cantidad de registros (más disputados primero)
  const requerimientosDisponibles = useMemo(() => {
    const mapaConcurrencia = new Map<string, number>();
    oportunidades.forEach((op) => {
      const req = op.numeroRequerimiento?.trim().toUpperCase();
      if (req) {
        mapaConcurrencia.set(req, (mapaConcurrencia.get(req) || 0) + 1);
      }
    });

    return Array.from(mapaConcurrencia.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([req, count]) => ({ req, count }));
  }, [oportunidades]);

  // Si selectedReq no es 'todos' pero ya no existe, volver a 'todos'
  useEffect(() => {
    if (selectedReq !== 'todos' && !requerimientosDisponibles.some((r) => r.req === selectedReq)) {
      setSelectedReq('todos');
    }
  }, [requerimientosDisponibles, selectedReq]);

  // ── Cálculo del Ranking y Podio (Quién registró primero sin milisegundos y con empate técnico) ──
  const { ranking, podioReqInfo } = useMemo(() => {
    // ── MODO 1: Podio de un Requerimiento específico ──
    if (selectedReq !== 'todos') {
      const opsDelReq = oportunidades
        .filter((op) => op.numeroRequerimiento?.trim().toUpperCase() === selectedReq)
        .sort((a, b) => {
          const tA = a.fechaRegistro ? new Date(a.fechaRegistro).getTime() : 0;
          const tB = b.fechaRegistro ? new Date(b.fechaRegistro).getTime() : 0;
          return tA - tB; // Orden cronológico ascendente
        });

      // Tiempo del primer registro
      const primerTiempo = opsDelReq[0]?.fechaRegistro
        ? new Date(opsDelReq[0].fechaRegistro).getTime()
        : 0;

      // Conteo de registros por timestamp exacto para detectar empate técnico
      const conteoPorTiempo = new Map<number, number>();
      opsDelReq.forEach((op) => {
        const t = op.fechaRegistro ? new Date(op.fechaRegistro).getTime() : 0;
        conteoPorTiempo.set(t, (conteoPorTiempo.get(t) || 0) + 1);
      });

      let posicionActual = 1;
      const lista: EjecutivaRanking[] = opsDelReq.map((op, idx) => {
        const tiempoActual = op.fechaRegistro ? new Date(op.fechaRegistro).getTime() : 0;
        const diffMs = Math.max(0, tiempoActual - primerTiempo);
        const hayEmpate = (conteoPorTiempo.get(tiempoActual) || 0) > 1;

        if (idx > 0) {
          const prevDate = opsDelReq[idx - 1]?.fechaRegistro;
          const prevTiempo = prevDate
            ? new Date(prevDate).getTime()
            : 0;
          if (tiempoActual !== prevTiempo) {
            posicionActual = idx + 1;
          }
        } else {
          posicionActual = 1;
        }

        const esPrimerLugar = posicionActual === 1;
        const nombreLimpio = op.creadoPor?.includes('@')
          ? op.creadoPor.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
          : op.creadoPor || 'Ejecutiva';

        let cargo = `${posicionActual}° en Registro`;
        let insignia = `${posicionActual}° Lugar`;

        if (hayEmpate) {
          cargo = `🤝 Empate técnico (${posicionActual}° en Registro)`;
          insignia = `🤝 Empate técnico (${posicionActual}° Lugar)`;
        } else if (esPrimerLugar) {
          cargo = '👑 1° en Captura (Ganadora)';
          insignia = '🥇 1° Lugar (Ganadora)';
        } else if (posicionActual === 2) {
          insignia = '🥈 2° Lugar';
        } else if (posicionActual === 3) {
          insignia = '🥉 3° Lugar';
        } else if (posicionActual === 4) {
          insignia = '🎖️ 4° Lugar';
        } else if (posicionActual === 5) {
          insignia = '🏅 5° Lugar';
        }

        let diferenciaTexto = '⚡ 1° en llegar';
        if (hayEmpate && esPrimerLugar) {
          diferenciaTexto = '🤝 Empate técnico (0s)';
        } else if (hayEmpate && diffMs > 0) {
          diferenciaTexto = `🤝 Empate (${formatDiferenciaTiempo(diffMs)})`;
        } else if (diffMs > 0) {
          diferenciaTexto = formatDiferenciaTiempo(diffMs);
        }

        return {
          posicion: posicionActual,
          esEmpateTecnico: hayEmpate,
          puestoTexto: hayEmpate ? 'Empate técnico' : `${posicionActual}°`,
          nombre: nombreLimpio,
          cargo,
          totalOportunidades: 1,
          totalCotizado: Number(op.limiteTotal) || 0,
          totalGanado: esPrimerLugar ? Number(op.limiteTotal) || 0 : 0,
          tasaEfectividad: esPrimerLugar ? 100 : 0,
          reqsGanadosPrimero: esPrimerLugar ? 1 : 0,
          tiempoPromedioMinutos: 0,
          licitacionesAdjudicadas: op.estado === 'Adjudicada' ? 1 : 0,
          ticketPromedio: Number(op.limiteTotal) || 0,
          horaRegistro: formatHoraExacta(op.fechaRegistro),
          diferenciaTiempo: diferenciaTexto,
          esGanadoraReq: esPrimerLugar,
          numeroRequerimiento: op.numeroRequerimiento,
          insignia,
        };
      });

      return {
        ranking: lista,
        podioReqInfo: {
          numeroRequerimiento: selectedReq,
          totalRegistros: opsDelReq.length,
          montoTotal: opsDelReq[0]?.limiteTotal || 0,
          acuerdo: opsDelReq[0]?.acuerdoMarco?.codigo || 'Acuerdo Marco',
          primerRegistro: opsDelReq[0]?.fechaRegistro,
        },
      };
    }

    // ── MODO 2: Podio General Acumulado por Período ──
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const inicioAnio = new Date(ahora.getFullYear(), 0, 1);

    const oportunidadesFiltradas = oportunidades.filter((op: Oportunidad) => {
      if (!op.fechaRegistro) return true;
      const fecha = new Date(op.fechaRegistro);
      switch (periodo) {
        case 'mes':
          return fecha >= inicioMes;
        case 'anterior':
          return fecha >= inicioMesAnterior && fecha < inicioMes;
        case 'anual':
          return fecha >= inicioAnio;
        default:
          return true;
      }
    });

    // 1. Agrupar por número de requerimiento y determinar quién registró primero cada uno (con empate técnico al segundo)
    const ganadoresPorReq = new Map<string, { creadores: string[]; limite: number }>();
    const agrupadoPorReq = new Map<string, Oportunidad[]>();

    oportunidadesFiltradas.forEach((op) => {
      const req = op.numeroRequerimiento?.trim().toUpperCase();
      if (!req) return;
      const list = agrupadoPorReq.get(req) || [];
      list.push(op);
      agrupadoPorReq.set(req, list);
    });

    agrupadoPorReq.forEach((ops, req) => {
      ops.sort((a, b) => {
        const tA = a.fechaRegistro ? new Date(a.fechaRegistro).getTime() : 0;
        const tB = b.fechaRegistro ? new Date(b.fechaRegistro).getTime() : 0;
        return tA - tB;
      });
      const primero = ops[0];
      if (primero) {
        const primerTiempo = primero.fechaRegistro ? new Date(primero.fechaRegistro).getTime() : 0;
        const empatadosPrimero = ops.filter((op) => {
          const t = op.fechaRegistro ? new Date(op.fechaRegistro).getTime() : 0;
          return t === primerTiempo;
        });
        const creadores = empatadosPrimero.map((op) => (op.creadoPor || 'Sin asignar').toLowerCase().trim());
        ganadoresPorReq.set(req, {
          creadores,
          limite: Number(primero.limiteTotal) || 0,
        });
      }
    });

    // 2. Acumular estadísticas por ejecutiva
    const mapa = new Map<
      string,
      {
        nombre: string;
        email: string;
        totalOportunidades: number;
        totalCotizado: number;
        reqsGanadosPrimero: number;
        montoGanadoPrimero: number;
        licitacionesAdjudicadas: number;
      }
    >();

    oportunidadesFiltradas.forEach((op) => {
      const email = (op.creadoPor || 'Sin asignar').trim();
      const key = email.toLowerCase();
      const existing = mapa.get(key) || {
        nombre: email.includes('@')
          ? email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
          : email,
        email,
        totalOportunidades: 0,
        totalCotizado: 0,
        reqsGanadosPrimero: 0,
        montoGanadoPrimero: 0,
        licitacionesAdjudicadas: 0,
      };

      existing.totalOportunidades += 1;
      existing.totalCotizado += Number(op.limiteTotal) || 0;
      if (op.estado === 'Cotizada' || op.estado === 'Adjudicada') {
        existing.licitacionesAdjudicadas += 1;
      }
      mapa.set(key, existing);
    });

    // Sumar reqs ganados primero a cada ejecutiva (reconociendo empate técnico en primer lugar)
    ganadoresPorReq.forEach((info) => {
      info.creadores.forEach((creadorKey) => {
        const ejec = mapa.get(creadorKey);
        if (ejec) {
          ejec.reqsGanadosPrimero += 1;
          ejec.montoGanadoPrimero += info.limite;
        }
      });
    });

    const lista: EjecutivaRanking[] = Array.from(mapa.values()).map((item) => {
      const tasaVictoria = item.totalOportunidades > 0
        ? Math.round((item.reqsGanadosPrimero / item.totalOportunidades) * 100)
        : 0;

      return {
        posicion: 0,
        nombre: item.nombre,
        cargo: tipoPodio === 'licitaciones'
          ? 'Ejecutiva Licitaciones Perú Compras'
          : 'Ejecutiva de Ventas Corporativas',
        totalOportunidades: item.totalOportunidades,
        reqsGanadosPrimero: item.reqsGanadosPrimero,
        totalCotizado: item.totalCotizado,
        totalGanado: item.montoGanadoPrimero,
        tasaEfectividad: tasaVictoria,
        licitacionesAdjudicadas: item.licitacionesAdjudicadas,
        ticketPromedio: Math.round(item.totalCotizado / (item.totalOportunidades || 1)),
        ventasCerradas: item.licitacionesAdjudicadas,
        tiempoPromedioMinutos: 1.8,
      };
    });

    // Ordenar: En Licitaciones, premia a quien registró primero más requerimientos
    if (tipoPodio === 'licitaciones') {
      lista.sort((a, b) => {
        if ((b.reqsGanadosPrimero || 0) !== (a.reqsGanadosPrimero || 0)) {
          return (b.reqsGanadosPrimero || 0) - (a.reqsGanadosPrimero || 0);
        }
        if (b.totalGanado !== a.totalGanado) {
          return b.totalGanado - a.totalGanado;
        }
        return b.totalCotizado - a.totalCotizado;
      });
    } else {
      lista.sort((a, b) => b.totalCotizado - a.totalCotizado);
    }

    const conPosicion = lista.map((item, index, arr) => {
      const scoreActual = tipoPodio === 'licitaciones'
        ? `${item.reqsGanadosPrimero}-${item.totalGanado}-${item.totalCotizado}`
        : `${item.totalCotizado}`;

      let posicion = index + 1;
      let esEmpate = false;

      const cantidadConMismoScore = arr.filter((other) => {
        const otherScore = tipoPodio === 'licitaciones'
          ? `${other.reqsGanadosPrimero}-${other.totalGanado}-${other.totalCotizado}`
          : `${other.totalCotizado}`;
        return otherScore === scoreActual;
      }).length;

      if (cantidadConMismoScore > 1) {
        esEmpate = true;
        const primerIdxConScore = arr.findIndex((other) => {
          const otherScore = tipoPodio === 'licitaciones'
            ? `${other.reqsGanadosPrimero}-${other.totalGanado}-${other.totalCotizado}`
            : `${other.totalCotizado}`;
          return otherScore === scoreActual;
        });
        posicion = primerIdxConScore + 1;
      }

      let insignia = undefined;
      if (esEmpate) {
        insignia = `🤝 Empate técnico (${posicion}° Lugar)`;
      } else if (posicion === 1) {
        insignia = '🥇 1° Lugar (Reina Rebel)';
      } else if (posicion === 2) {
        insignia = '🥈 2° Lugar (Cazadora de Reqs)';
      } else if (posicion === 3) {
        insignia = '🥉 3° Lugar (Estratega Perú Compras)';
      } else if (posicion === 4) {
        insignia = '🎖️ 4° Lugar (Máxima Velocidad)';
      } else if (posicion === 5) {
        insignia = '🏅 5° Lugar (Élite Comercial)';
      }

      return {
        ...item,
        posicion,
        esEmpateTecnico: esEmpate,
        puestoTexto: esEmpate ? 'Empate técnico' : `${posicion}°`,
        insignia,
      };
    });

    return {
      ranking: conPosicion,
      podioReqInfo: null,
    };
  }, [oportunidades, periodo, tipoPodio, selectedReq]);

  const top1 = ranking[0];
  const top2 = ranking[1];
  const top3 = ranking[2];
  const top4 = ranking[3];
  const top5 = ranking[4];

  return (
    <div className="reg-podio-container">
      {/* ── Header del Podio ── */}
      <div className="reg-podio-header">
        <div className="reg-podio-header__info">
          <div className="reg-podio-badge">
            <GoogleIcon name="military_tech" size={16} color="#eab308" />
            <span>
              {selectedReq !== 'todos'
                ? `Orden de Llegada: ${selectedReq}`
                : tipoPodio === 'licitaciones'
                  ? 'Podio de Capturas por Orden de Llegada'
                  : 'Ranking por Volumen Licitado'}
            </span>
          </div>
          <h2>
            {selectedReq !== 'todos'
              ? `Podio del Requerimiento ${selectedReq}`
              : tipoPodio === 'licitaciones'
                ? 'Podio de Licitaciones — Quién Registró Primero'
                : 'Podio de Ventas Comerciales'}
          </h2>
          <p>
            {selectedReq !== 'todos'
              ? `Clasificación del 1° al 5° puesto según la hora exacta de registro para este requerimiento.`
              : tipoPodio === 'licitaciones'
                ? 'Reconocimiento en tiempo real a las ejecutivas que registran primero las convocatorias en Perú Compras.'
                : 'Ranking en tiempo real del monto total cotizado y licitado por cada ejecutiva.'}
          </p>
        </div>

        {selectedReq === 'todos' && (
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
        )}
      </div>

      {/* ── Selector Interactivo de Requerimiento ── */}
      <div className="reg-podio-req-selector-box">
        <div className="reg-podio-req-selector-title">
          <GoogleIcon name="manage_search" size={24} color={roleAccent} />
          <div>
            <h4>Filtrar Podio por N° de Requerimiento</h4>
            <p>
              {selectedReq !== 'todos' && podioReqInfo
                ? `Mostrando podio del 1ro al 5to para ${selectedReq} • ${podioReqInfo.totalRegistros} ejecutivas participantes`
                : 'Selecciona un requerimiento específico para ver el orden cronológico del 1ro al 5to puesto:'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
            Requerimiento:
          </label>
          <select
            className="reg-podio-req-select"
            value={selectedReq}
            onChange={(e) => setSelectedReq(e.target.value)}
          >
            <option value="todos">👑 Ranking General Acumulado (Todos los Reqs)</option>
            {requerimientosDisponibles.map(({ req, count }) => (
              <option key={req} value={req}>
                {req} ({count} {count === 1 ? 'registro' : 'registros'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Podio Visual de 5 Pedestales (1ro al 5to) ── */}
      <div className="reg-podium-visual">
        {/* 4to Lugar */}
        {top4 && (
          <div className="reg-podium-slot slot-fourth">
            {top4.esEmpateTecnico && top4.posicion === 1 && <div className="reg-podium-crown">👑</div>}
            <div className="reg-podium-medal">
              {top4.posicion === 1 ? '🥇' : top4.posicion === 2 ? '🥈' : top4.posicion === 3 ? '🥉' : '🎖️'}
            </div>
            <div className="reg-podium-avatar">
              <span>{top4.nombre.substring(0, 2).toUpperCase()}</span>
            </div>
            <div className="reg-podium-name" title={top4.nombre}>
              {top4.nombre}
            </div>
            <div className="reg-podium-amount">
              S/ {top4.totalCotizado.toLocaleString('es-PE')}
            </div>
            <div className="reg-podium-stats">
              {top4.horaRegistro ? (
                <span className={`reg-podium-timing-badge ${top4.esEmpateTecnico && top4.posicion === 1 ? 'timing-gold' : 'timing-delta'}`}>
                  {top4.esEmpateTecnico && top4.posicion === 1
                    ? `🤝 Empate técnico (${top4.horaRegistro})`
                    : `⏱️ ${top4.diferenciaTiempo}`}
                </span>
              ) : (
                <span>🥇 {top4.reqsGanadosPrimero} ganados</span>
              )}
            </div>
            <div className="reg-pedestal pedestal-4">
              <span className="pedestal-num">{top4.posicion}</span>
              <span className="pedestal-label">
                {top4.esEmpateTecnico ? 'EMPATE TÉCNICO' : '4TO LUGAR'}
              </span>
            </div>
          </div>
        )}

        {/* 2do Lugar (Plata) */}
        {top2 && (
          <div className="reg-podium-slot slot-second">
            {top2.esEmpateTecnico && top2.posicion === 1 && <div className="reg-podium-crown">👑</div>}
            <div className="reg-podium-medal">{top2.posicion === 1 ? '🥇' : '🥈'}</div>
            <div className="reg-podium-avatar">
              <span>{top2.nombre.substring(0, 2).toUpperCase()}</span>
            </div>
            <div className="reg-podium-name" title={top2.nombre}>
              {top2.nombre}
            </div>
            <div className="reg-podium-amount">
              S/ {top2.totalCotizado.toLocaleString('es-PE')}
            </div>
            <div className="reg-podium-stats">
              {top2.horaRegistro ? (
                <span className={`reg-podium-timing-badge ${top2.esEmpateTecnico && top2.posicion === 1 ? 'timing-gold' : 'timing-delta'}`}>
                  {top2.esEmpateTecnico && top2.posicion === 1
                    ? `🤝 Empate técnico (${top2.horaRegistro})`
                    : `⏱️ ${top2.diferenciaTiempo}`}
                </span>
              ) : (
                <span>🥇 {top2.reqsGanadosPrimero} ganados</span>
              )}
            </div>
            <div className="reg-pedestal pedestal-2">
              <span className="pedestal-num">{top2.posicion}</span>
              <span className="pedestal-label">
                {top2.esEmpateTecnico ? 'EMPATE TÉCNICO' : '2DO LUGAR'}
              </span>
            </div>
          </div>
        )}

        {/* 1er Lugar (Oro - Ganadora) */}
        {top1 && (
          <div className="reg-podium-slot slot-first">
            <div className="reg-podium-crown">👑</div>
            <div className="reg-podium-medal">🥇</div>
            <div className="reg-podium-avatar">
              <span>{top1.nombre.substring(0, 2).toUpperCase()}</span>
            </div>
            <div className="reg-podium-name" title={top1.nombre}>
              {top1.nombre}
            </div>
            <div className="reg-podium-amount gold-text">
              S/ {top1.totalCotizado.toLocaleString('es-PE')}
            </div>
            <div className="reg-podium-stats">
              {top1.horaRegistro ? (
                <span className="reg-podium-timing-badge timing-gold">
                  {top1.esEmpateTecnico
                    ? `🤝 Empate técnico (${top1.horaRegistro})`
                    : `⚡ 1° en llegar (${top1.horaRegistro})`}
                </span>
              ) : (
                <span>🥇 {top1.reqsGanadosPrimero} reqs ganados 1°</span>
              )}
            </div>
            <div className="reg-pedestal pedestal-1">
              <span className="pedestal-num">1</span>
              <span className="pedestal-label">
                {top1.esEmpateTecnico
                  ? 'EMPATE TÉCNICO'
                  : selectedReq !== 'todos'
                    ? 'GANADORA REQ'
                    : 'REINA DE CAPTURA'}
              </span>
            </div>
          </div>
        )}

        {/* 3er Lugar (Bronce) */}
        {top3 && (
          <div className="reg-podium-slot slot-third">
            {top3.esEmpateTecnico && top3.posicion === 1 && <div className="reg-podium-crown">👑</div>}
            <div className="reg-podium-medal">
              {top3.posicion === 1 ? '🥇' : top3.posicion === 2 ? '🥈' : '🥉'}
            </div>
            <div className="reg-podium-avatar">
              <span>{top3.nombre.substring(0, 2).toUpperCase()}</span>
            </div>
            <div className="reg-podium-name" title={top3.nombre}>
              {top3.nombre}
            </div>
            <div className="reg-podium-amount">
              S/ {top3.totalCotizado.toLocaleString('es-PE')}
            </div>
            <div className="reg-podium-stats">
              {top3.horaRegistro ? (
                <span className={`reg-podium-timing-badge ${top3.esEmpateTecnico && top3.posicion === 1 ? 'timing-gold' : 'timing-delta'}`}>
                  {top3.esEmpateTecnico && top3.posicion === 1
                    ? `🤝 Empate técnico (${top3.horaRegistro})`
                    : `⏱️ ${top3.diferenciaTiempo}`}
                </span>
              ) : (
                <span>🥇 {top3.reqsGanadosPrimero} ganados</span>
              )}
            </div>
            <div className="reg-pedestal pedestal-3">
              <span className="pedestal-num">{top3.posicion}</span>
              <span className="pedestal-label">
                {top3.esEmpateTecnico ? 'EMPATE TÉCNICO' : '3ER LUGAR'}
              </span>
            </div>
          </div>
        )}

        {/* 5to Lugar */}
        {top5 && (
          <div className="reg-podium-slot slot-fifth">
            {top5.esEmpateTecnico && top5.posicion === 1 && <div className="reg-podium-crown">👑</div>}
            <div className="reg-podium-medal">
              {top5.posicion === 1 ? '🥇' : top5.posicion === 2 ? '🥈' : top5.posicion === 3 ? '🥉' : top5.posicion === 4 ? '🎖️' : '🏅'}
            </div>
            <div className="reg-podium-avatar">
              <span>{top5.nombre.substring(0, 2).toUpperCase()}</span>
            </div>
            <div className="reg-podium-name" title={top5.nombre}>
              {top5.nombre}
            </div>
            <div className="reg-podium-amount">
              S/ {top5.totalCotizado.toLocaleString('es-PE')}
            </div>
            <div className="reg-podium-stats">
              {top5.horaRegistro ? (
                <span className={`reg-podium-timing-badge ${top5.esEmpateTecnico && top5.posicion === 1 ? 'timing-gold' : 'timing-delta'}`}>
                  {top5.esEmpateTecnico && top5.posicion === 1
                    ? `🤝 Empate técnico (${top5.horaRegistro})`
                    : `⏱️ ${top5.diferenciaTiempo}`}
                </span>
              ) : (
                <span>🥇 {top5.reqsGanadosPrimero} ganados</span>
              )}
            </div>
            <div className="reg-pedestal pedestal-5">
              <span className="pedestal-num">{top5.posicion}</span>
              <span className="pedestal-label">
                {top5.esEmpateTecnico ? 'EMPATE TÉCNICO' : '5TO LUGAR'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Galardones Especiales según Modo ── */}
      <div className="reg-podio-cards-grid">
        {selectedReq !== 'todos' && podioReqInfo ? (
          <>
            <div className="reg-award-card">
              <div
                className="reg-award-icon"
                style={{ background: 'rgba(234, 179, 8, 0.12)', color: '#ca8a04' }}
              >
                <GoogleIcon name="military_tech" size={22} color="#ca8a04" />
              </div>
              <div>
                <div className="reg-award-title">🏆 Ganadora de Prioridad</div>
                <div className="reg-award-winner">
                  {top1?.esEmpateTecnico ? `${top1.nombre} (Empate técnico)` : top1?.nombre ?? 'Sin registro'}
                </div>
                <div className="reg-award-desc">
                  {top1?.esEmpateTecnico
                    ? `Empate técnico a las ${top1?.horaRegistro ?? '—'}`
                    : `Registró primero a las ${top1?.horaRegistro ?? '—'}`}
                </div>
              </div>
            </div>

            <div className="reg-award-card">
              <div
                className="reg-award-icon"
                style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0284c7' }}
              >
                <GoogleIcon name="groups" size={22} color="#0284c7" />
              </div>
              <div>
                <div className="reg-award-title">👥 Concurrencia de Ejecutivas</div>
                <div className="reg-award-winner">{ranking.length} Registros en Disputa</div>
                <div className="reg-award-desc">
                  Requerimiento {selectedReq} registrado por {ranking.length} ejecutivas
                </div>
              </div>
            </div>

            <div className="reg-award-card">
              <div
                className="reg-award-icon"
                style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}
              >
                <GoogleIcon name="payments" size={22} color="#059669" />
              </div>
              <div>
                <div className="reg-award-title">💰 Límite Total de Licitación</div>
                <div className="reg-award-winner">
                  S/ {Number(podioReqInfo.montoTotal).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </div>
                <div className="reg-award-desc">Acuerdo Marco: {podioReqInfo.acuerdo}</div>
              </div>
            </div>
          </>
        ) : tipoPodio === 'licitaciones' ? (
          <>
            <div className="reg-award-card">
              <div
                className="reg-award-icon"
                style={{ background: 'rgba(234, 179, 8, 0.12)', color: '#ca8a04' }}
              >
                <GoogleIcon name="bolt" size={22} color="#ca8a04" />
              </div>
              <div>
                <div className="reg-award-title">⚡ Más Rápida en Captura</div>
                <div className="reg-award-winner">{top1?.nombre ?? 'Sin datos'}</div>
                <div className="reg-award-desc">
                  {top1?.reqsGanadosPrimero ?? 0} requerimientos registrados antes que nadie
                </div>
              </div>
            </div>

            <div className="reg-award-card">
              <div
                className="reg-award-icon"
                style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0284c7' }}
              >
                <GoogleIcon name="verified" size={22} color="#0284c7" />
              </div>
              <div>
                <div className="reg-award-title">🥇 Mayor Volumen de Licitaciones</div>
                <div className="reg-award-winner">
                  {top1?.totalOportunidades ?? 0} Oportunidades Registradas
                </div>
                <div className="reg-award-desc">Mayor actividad en la plataforma</div>
              </div>
            </div>

            <div className="reg-award-card">
              <div
                className="reg-award-icon"
                style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}
              >
                <GoogleIcon name="assignment_turned_in" size={22} color="#059669" />
              </div>
              <div>
                <div className="reg-award-title">🏛️ Adjudicación Perú Compras</div>
                <div className="reg-award-winner">
                  {top1?.licitacionesAdjudicadas ?? 0} Convocatorias Ganadas
                </div>
                <div className="reg-award-desc">Mayor tasa de adjudicación para Sales Rebel</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="reg-award-card">
              <div
                className="reg-award-icon"
                style={{ background: 'rgba(234, 179, 8, 0.12)', color: '#ca8a04' }}
              >
                <GoogleIcon name="monetization_on" size={22} color="#ca8a04" />
              </div>
              <div>
                <div className="reg-award-title">💰 Mayor Volumen Licitado</div>
                <div className="reg-award-winner">{top1?.nombre ?? '-'}</div>
                <div className="reg-award-desc">
                  S/ {top1?.totalCotizado.toLocaleString('es-PE') || 0} en licitaciones
                </div>
              </div>
            </div>

            <div className="reg-award-card">
              <div
                className="reg-award-icon"
                style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0284c7' }}
              >
                <GoogleIcon name="shopping_cart_checkout" size={22} color="#0284c7" />
              </div>
              <div>
                <div className="reg-award-title">📦 Total Oportunidades</div>
                <div className="reg-award-winner">
                  {top1?.totalOportunidades ?? 0} Oportunidades Registradas
                </div>
                <div className="reg-award-desc">Mayor cantidad de requerimientos cargados</div>
              </div>
            </div>

            <div className="reg-award-card">
              <div
                className="reg-award-icon"
                style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}
              >
                <GoogleIcon name="trending_up" size={22} color="#059669" />
              </div>
              <div>
                <div className="reg-award-title">🎯 Promedio por Oportunidad</div>
                <div className="reg-award-winner">
                  S/ {top1?.ticketPromedio?.toLocaleString('es-PE') ?? 0}
                </div>
                <div className="reg-award-desc">Ticket promedio por oportunidad</div>
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
              {selectedReq !== 'todos'
                ? `Orden de Llegada Completo — Requerimiento ${selectedReq}`
                : tipoPodio === 'licitaciones'
                  ? 'Ranking de Licitaciones — Requerimientos Ganados 1°'
                  : 'Ranking de Ventas — Monto Total Licitado'}
            </h3>
            <p>
              {selectedReq !== 'todos'
                ? 'Orden cronológico exacto al segundo de quién registró primero este requerimiento.'
                : tipoPodio === 'licitaciones'
                  ? 'Ordenado por número de requerimientos donde la ejecutiva registró primero por orden de llegada.'
                  : 'Ordenado por monto total cotizado por cada ejecutiva.'}
            </p>
          </div>
        </div>

        <div className="reg-table-wrapper">
          <table className="reg-table">
            <thead>
              {selectedReq !== 'todos' ? (
                <tr>
                  <th style={{ width: '130px', textAlign: 'center' }}>Posición</th>
                  <th>Ejecutiva</th>
                  <th>Hora Exacta (Hora de Perú)</th>
                  <th style={{ textAlign: 'center' }}>Diferencia de Llegada</th>
                  <th style={{ textAlign: 'right' }}>Monto Cotizado</th>
                  <th style={{ textAlign: 'center' }}>Prioridad</th>
                  <th>Insignia</th>
                </tr>
              ) : tipoPodio === 'licitaciones' ? (
                <tr>
                  <th style={{ width: '130px', textAlign: 'center' }}>Posición</th>
                  <th>Ejecutiva</th>
                  <th>Cargo</th>
                  <th style={{ textAlign: 'center' }}>Reqs Ganados 1°</th>
                  <th style={{ textAlign: 'center' }}>Total Registradas</th>
                  <th style={{ textAlign: 'right' }}>Total Licitado</th>
                  <th style={{ textAlign: 'center' }}>Efectividad 1°</th>
                  <th>Insignia</th>
                </tr>
              ) : (
                <tr>
                  <th style={{ width: '130px', textAlign: 'center' }}>Posición</th>
                  <th>Ejecutiva</th>
                  <th>Cargo</th>
                  <th style={{ textAlign: 'center' }}>Oportunidades</th>
                  <th style={{ textAlign: 'right' }}>Total Licitado</th>
                  <th style={{ textAlign: 'right' }}>Ticket Promedio</th>
                  <th style={{ textAlign: 'center' }}>Adjudicadas</th>
                  <th>Insignia</th>
                </tr>
              )}
            </thead>
            <tbody>
              {ranking.map((item) => (
                <tr key={`${item.posicion}-${item.nombre}`}>
                  <td style={{ textAlign: 'center' }}>
                    {item.esEmpateTecnico ? (
                      <span className="pos-badge pos-tie" title={`Empate técnico (${item.posicion}° lugar)`}>
                        🤝 Empate técnico
                      </span>
                    ) : (
                      <span className={`pos-badge pos-${item.posicion}`}>
                        {item.posicion === 1
                          ? '🥇'
                          : item.posicion === 2
                            ? '🥈'
                            : item.posicion === 3
                              ? '🥉'
                              : `#${item.posicion}`}
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        className="reg-avatar-circle"
                        style={{ background: `${roleAccent}18`, color: roleAccent }}
                      >
                        {item.nombre.substring(0, 2).toUpperCase()}
                      </div>
                      <strong style={{ color: '#0f172a' }}>{item.nombre}</strong>
                    </div>
                  </td>

                  {selectedReq !== 'todos' ? (
                    <>
                      <td style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                        {item.horaRegistro ?? '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className={`reg-podium-timing-badge ${item.esGanadoraReq ? 'timing-gold' : 'timing-delta'
                            }`}
                        >
                          {item.diferenciaTiempo}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        S/ {item.totalCotizado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {item.esEmpateTecnico ? (
                          <span
                            className="reg-pill"
                            style={{ background: '#fef3c7', color: '#b45309', fontWeight: 800 }}
                          >
                            🤝 Empate técnico ({item.posicion}°)
                          </span>
                        ) : item.esGanadoraReq ? (
                          <span
                            className="reg-pill"
                            style={{ background: '#fef3c7', color: '#b45309', fontWeight: 800 }}
                          >
                            👑 1° Asignada (Ganadora)
                          </span>
                        ) : (
                          <span
                            className="reg-pill"
                            style={{ background: '#f1f5f9', color: '#64748b', fontWeight: 600 }}
                          >
                            {item.posicion}° en Registro
                          </span>
                        )}
                      </td>
                    </>
                  ) : tipoPodio === 'licitaciones' ? (
                    <>
                      <td style={{ color: '#64748b', fontSize: '13px' }}>{item.cargo}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className="reg-priority-badge"
                          title="Requerimientos únicos donde registró antes que nadie"
                          style={{
                            background: item.reqsGanadosPrimero && item.reqsGanadosPrimero > 0 ? '#fef3c7' : '#f1f5f9',
                            color: item.reqsGanadosPrimero && item.reqsGanadosPrimero > 0 ? '#b45309' : '#64748b',
                            fontWeight: 800,
                          }}
                        >
                          🥇 {item.reqsGanadosPrimero ?? 0} ganados
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                        {item.totalOportunidades}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        S/ {item.totalCotizado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className="reg-pill"
                          style={{ background: '#ecfdf5', color: '#059669', fontWeight: 700 }}
                        >
                          {item.tasaEfectividad}%
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ color: '#64748b', fontSize: '13px' }}>{item.cargo}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className="reg-pill"
                          style={{ background: '#f1f5f9', color: '#334155', fontWeight: 700 }}
                        >
                          {item.totalOportunidades}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        S/ {item.totalCotizado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right', fontSize: '12.5px', color: '#64748b' }}>
                        S/ {(item.ticketPromedio || 0).toLocaleString('es-PE')}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className="reg-pill"
                          style={{ background: '#ecfdf5', color: '#059669', fontWeight: 700 }}
                        >
                          {item.licitacionesAdjudicadas}
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
