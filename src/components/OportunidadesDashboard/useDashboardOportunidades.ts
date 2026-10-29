// ─────────────────────────────────────────────────────────────────────────────
// src/components/OportunidadesDashboard/useDashboardOportunidades.ts
// Carga las oportunidades del backend y las convierte en filas listas para KPIs.
//  - scope 'sistema'  → todas las oportunidades (vista del Administrador)
//  - scope 'personal' → solo las registradas por el usuario autenticado
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getOportunidadesApi } from '../../api/services/oportunidades.service';
import { mapApiToOportunidad } from '../../hooks/useOportunidades';
import { useAuth } from '../../context/AuthContext';
import { isOportunidadOwner } from '../../utils/oportunidadUtils';
import { computeDashboardStats, type OportunidadRow } from './dashboardStats';

export type DashboardScope = 'sistema' | 'personal';

const toMs = (v?: string | null): number => {
  if (!v) return 0;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? 0 : t;
};

export function useDashboardOportunidades(scope: DashboardScope = 'sistema') {
  const { empleado } = useAuth();
  const [allRows, setAllRows] = useState<OportunidadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOportunidadesApi();
      const mapped: OportunidadRow[] = (Array.isArray(data) ? data : []).map((raw) => {
        const op = mapApiToOportunidad(raw);
        const registro = toMs(raw.fechaRegistro);
        const actualizacion = Math.max(
          registro,
          toMs(raw.fechaActualizacion),
          toMs(raw.ordenCompra?.fechaActualizacion),
        );
        const venc = toMs(raw.fechaVencimientoLicitacion);
        return { op, registro, actualizacion, vencimiento: venc || null };
      });
      setAllRows(mapped);
      setLastSync(Date.now());
    } catch {
      setError('No se pudo conectar con el servidor para obtener las oportunidades.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(
    () =>
      scope === 'personal'
        ? allRows.filter((r) => isOportunidadOwner(r.op, empleado, empleado?.userEmail))
        : allRows,
    [allRows, scope, empleado],
  );

  const stats = useMemo(() => computeDashboardStats(rows), [rows]);

  return { stats, loading, error, lastSync, reload: load };
}
