import type { DashboardStats } from "./IDashboardStats";
import type { EstadoMeta } from "./Estados";
import type { OportunidadRow } from "./OportunidadRow";
import { ESTADOS_ACTIVOS, ESTADOS_GANADOS, ESTADOS_PERDIDOS, ESTADOS_TERMINALES } from "./Estados";
import type { EstadoBucket } from "./EstadoBucket";
import type { GrupoBucket } from "./GrupoBucket";
import type { EjecutivaBucket } from "./EjecutivaBucket";
import type { MesBucket } from "./MesBucket";


const ESTADO_META: Record<string, EstadoMeta> = {
  'En Licitación': { label: 'En Licitación', color: '#2563eb' },
  'En Competencia': { label: 'En Competencia', color: '#6366f1' },
  'Asignación de Oportunidad': { label: 'Asignación', color: '#8b5cf6' },
  'Cotización': { label: 'Cotización', color: '#0ea5e9' },
  'Por Vencer': { label: 'Por Vencer', color: '#f59e0b' },
  'Adjudicada': { label: 'Adjudicada', color: '#10b981' },
  'Aceptada por el Administrador': { label: 'Aceptada (Admin)', color: '#14b8a6' },
  'Aceptada por Perú Compras': { label: 'Aceptada (Perú Compras)', color: '#059669' },
  'OC_RECIBIDA': { label: 'OC Recibida', color: '#06b6d4' },
  'OC_ACEPTADA': { label: 'OC Aceptada', color: '#22c55e' },
  'ENTREGADA': { label: 'Entregada', color: '#16a34a' },
  'Desestimada': { label: 'Desestimada', color: '#ef4444' },
  'Aceptada Desestimada': { label: 'Aceptada Desestimada', color: '#f43f5e' },
  'OC_RECHAZADA': { label: 'OC Rechazada', color: '#dc2626' },
};

export function estadoMeta(estado: string): EstadoMeta {
  return ESTADO_META[estado] ?? { label: estado || 'Sin estado', color: '#94a3b8' };
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function computeDashboardStats(rows: OportunidadRow[], now: number = Date.now()): DashboardStats {
  const total = rows.length;
  const DAY = 86_400_000;

  const montoLimiteTotal = rows.reduce((a, r) => a + num(r.op.limiteTotal), 0);

  // ── OCAM ──
  const conOCAM = rows.filter((r) => num(r.op.ordenCompra?.montoOCAM) > 0);
  const montoOCAMTotal = conOCAM.reduce((a, r) => a + num(r.op.ordenCompra?.montoOCAM), 0);

  // ── Clasificación ──
  const activasRows = rows.filter((r) => ESTADOS_ACTIVOS.includes(r.op.estado));
  const ganadas = rows.filter((r) => ESTADOS_GANADOS.includes(r.op.estado)).length;
  const perdidas = rows.filter((r) => ESTADOS_PERDIDOS.includes(r.op.estado)).length;
  const cerradas = ganadas + perdidas;

  // ── Vencimientos ──
  const porVencerRows = activasRows
    .filter((r) => r.vencimiento !== null && r.vencimiento >= now)
    .sort((a, b) => (a.vencimiento as number) - (b.vencimiento as number));
  const porVencer72h = porVencerRows.filter((r) => (r.vencimiento as number) - now <= 3 * DAY).length;
  const vencidas = activasRows.filter((r) => r.vencimiento !== null && r.vencimiento < now).length;

  // ── Tendencia 6 meses ──
  const ref = new Date(now);
  const tendencia: MesBucket[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    tendencia.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: MESES[d.getMonth()],
      count: 0,
      monto: 0,
      actual: i === 0,
    });
  }
  rows.forEach((r) => {
    if (!r.registro) return;
    const d = new Date(r.registro);
    const b = tendencia.find((t) => t.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (b) {
      b.count += 1;
      b.monto += num(r.op.limiteTotal);
    }
  });
  const mesActual = tendencia[5].count;
  const mesAnterior = tendencia[4].count;
  const deltaMes = mesAnterior > 0 ? ((mesActual - mesAnterior) / mesAnterior) * 100 : null;

  // ── Última / más antigua ──
  const conFecha = rows.filter((r) => r.registro > 0);
  const ultima = conFecha.length ? conFecha.reduce((a, b) => (b.registro > a.registro ? b : a)) : null;

  const pendientes = conFecha.filter((r) => !ESTADOS_TERMINALES.includes(r.op.estado));
  const masAntigua = pendientes.length ? pendientes.reduce((a, b) => (b.registro < a.registro ? b : a)) : null;
  const masAntiguaDias = masAntigua ? Math.max(0, Math.floor((now - masAntigua.registro) / DAY)) : 0;

  // ── Por estado ──
  const estadoMap = new Map<string, { count: number; monto: number }>();
  rows.forEach((r) => {
    const cur = estadoMap.get(r.op.estado) ?? { count: 0, monto: 0 };
    cur.count += 1;
    cur.monto += num(r.op.limiteTotal);
    estadoMap.set(r.op.estado, cur);
  });
  const porEstado: EstadoBucket[] = [...estadoMap.entries()]
    .map(([estado, v]) => ({
      estado,
      ...estadoMeta(estado),
      count: v.count,
      monto: v.monto,
      pct: total ? (v.count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // ── Listas ──
  const recientes = [...rows].sort((a, b) => b.actualizacion - a.actualizacion).slice(0, 8);

  const topOCAM = [...conOCAM]
    .sort((a, b) => num(b.op.ordenCompra?.montoOCAM) - num(a.op.ordenCompra?.montoOCAM))
    .slice(0, 5);

  const entidadMap = new Map<string, GrupoBucket>();
  rows.forEach((r) => {
    const nombre = (r.op.entidadConvocante || r.op.empresaRazonSocial || 'Sin entidad').trim();
    const cur = entidadMap.get(nombre) ?? { nombre, count: 0, monto: 0 };
    cur.count += 1;
    cur.monto += num(r.op.limiteTotal);
    entidadMap.set(nombre, cur);
  });
  const topEntidades = [...entidadMap.values()].sort((a, b) => b.monto - a.monto).slice(0, 5);

  // ── Por ejecutiva ──
  const ejecMap = new Map<string, EjecutivaBucket>();
  rows.forEach((r) => {
    const nombre = (r.op.creadoPor || 'Sin asignar').trim();
    const cur =
      ejecMap.get(nombre) ??
      { nombre, total: 0, activas: 0, ganadas: 0, perdidas: 0, monto: 0, montoOCAM: 0, tasaExito: null };
    cur.total += 1;
    cur.monto += num(r.op.limiteTotal);
    cur.montoOCAM += num(r.op.ordenCompra?.montoOCAM);
    if (ESTADOS_ACTIVOS.includes(r.op.estado)) cur.activas += 1;
    if (ESTADOS_GANADOS.includes(r.op.estado)) cur.ganadas += 1;
    if (ESTADOS_PERDIDOS.includes(r.op.estado)) cur.perdidas += 1;
    ejecMap.set(nombre, cur);
  });
  const porEjecutiva = [...ejecMap.values()]
    .map((e) => ({
      ...e,
      tasaExito: e.ganadas + e.perdidas ? (e.ganadas / (e.ganadas + e.perdidas)) * 100 : null,
    }))
    .sort((a, b) => b.ganadas - a.ganadas || b.monto - a.monto);

  return {
    total,
    montoLimiteTotal,
    ticketPromedio: total ? montoLimiteTotal / total : 0,
    montoOCAMTotal,
    ocamCount: conOCAM.length,
    ocamPromedio: conOCAM.length ? montoOCAMTotal / conOCAM.length : 0,
    activas: activasRows.length,
    montoActivas: activasRows.reduce((a, r) => a + num(r.op.limiteTotal), 0),
    ganadas,
    perdidas,
    tasaExito: cerradas ? (ganadas / cerradas) * 100 : null,
    porVencer72h,
    vencidas,
    mesActual,
    mesAnterior,
    deltaMes,
    ultima,
    masAntigua,
    masAntiguaDias,
    porEstado,
    tendencia,
    recientes,
    proximasVencer: porVencerRows.slice(0, 5),
    topOCAM,
    topEntidades,
    porEjecutiva,
  };
}

// ── Formateadores ────────────────────────────────────────────────────────────
const moneyFmt = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const fmtMoney = (n: number): string => moneyFmt.format(n);

export function fmtMoneyCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `S/ ${(n / 1_000_000).toFixed(2)} M`;
  if (abs >= 10_000) return `S/ ${(n / 1_000).toFixed(1)} k`;
  return fmtMoney(n);
}

export function fmtRelative(ms: number, now: number = Date.now()): string {
  if (!ms) return '—';
  const diff = now - ms;
  if (diff < 0) return 'en el futuro';
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
  const m = Math.floor(d / 30);
  return `hace ${m} ${m === 1 ? 'mes' : 'meses'}`;
}

export function fmtCountdown(ms: number, now: number = Date.now()): { text: string; urgent: boolean } {
  const diff = ms - now;
  if (diff < 0) return { text: 'Vencida', urgent: true };
  const h = Math.floor(diff / 3_600_000);
  if (h < 24) return { text: `${h} h`, urgent: true };
  const d = Math.floor(h / 24);
  return { text: `${d} ${d === 1 ? 'día' : 'días'}`, urgent: d <= 3 };
}
