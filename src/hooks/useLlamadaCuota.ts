import { useCallback, useEffect, useState } from 'react';
import type { EstadoCuotaLlamadas } from '../api/Dtos/Llamada';
import { obtenerMiCuota } from '../api/services/llamadas.service';
import { useAuth } from '../context/AuthContext';

interface UseLlamadaCuotaOptions {
  enabled?: boolean;
  refreshMs?: number;
}

export function useLlamadaCuota(options: UseLlamadaCuotaOptions = {}) {
  const { enabled = true, refreshMs = 60000 } = options;
  const { token } = useAuth();
  const [cuota, setCuota] = useState<EstadoCuotaLlamadas | null>(null);
  const [loading, setLoading] = useState(enabled && Boolean(token));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !token) {
      setLoading(false);
      return;
    }

    try {
      const data = await obtenerMiCuota();
      setCuota(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo consultar la cuota.');
    } finally {
      setLoading(false);
    }
  }, [enabled, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled || !token) return;

    const interval = window.setInterval(() => {
      void refresh();
    }, refreshMs);

    const handleFocus = () => {
      void refresh();
    };

    const handleUpdate = () => {
      void refresh();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('rq:llamadas-actualizadas', handleUpdate);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('rq:llamadas-actualizadas', handleUpdate);
    };
  }, [enabled, token, refresh, refreshMs]);

  return { cuota, loading, error, refresh };
}
