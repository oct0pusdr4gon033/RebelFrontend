import { useCallback, useEffect, useRef } from 'react';
import { ticketHubService } from '../services/ticketHubService';

const REFRESH_INTERVAL_MS = 30_000;
const EVENT_DEBOUNCE_MS = 150;

export function useTicketListUpdates(
  ticketIds: readonly number[],
  token: string | null,
  refresh: () => Promise<void>,
): () => Promise<void> {
  const refreshRef = useRef(refresh);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  const refreshPendingRef = useRef(false);
  const eventTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const refreshNow = useCallback((repeatIfActive = false): Promise<void> => {
    if (refreshPromiseRef.current) {
      if (repeatIfActive) refreshPendingRef.current = true;
      return refreshPromiseRef.current;
    }

    const operation = (async () => {
      do {
        refreshPendingRef.current = false;
        await refreshRef.current();
      } while (refreshPendingRef.current);
    })();

    const sharedOperation = operation.finally(() => {
      refreshPromiseRef.current = null;
    });
    refreshPromiseRef.current = sharedOperation;
    return sharedOperation;
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (eventTimerRef.current !== null) clearTimeout(eventTimerRef.current);
    eventTimerRef.current = setTimeout(() => {
      eventTimerRef.current = null;
      void refreshNow(true).catch((reason: unknown) => {
        console.error('No se pudo actualizar la bandeja de Tickets.', reason);
      });
    }, EVENT_DEBOUNCE_MS);
  }, [refreshNow]);

  const ticketIdsKey = [...new Set(ticketIds)]
    .sort((first, second) => first - second)
    .join(',');

  useEffect(() => {
    if (!token || !ticketIdsKey) return;
    const ids = ticketIdsKey.split(',').map(Number);
    const unsubscribe = ticketHubService.subscribeList(ids, token, {
      ticketIds: ids,
      onTicketUpdated: scheduleRefresh,
      onReconnected: scheduleRefresh,
    });

    return unsubscribe;
  }, [ticketIdsKey, token, scheduleRefresh]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') scheduleRefresh();
    };
    const interval = window.setInterval(() => {
      ticketHubService.retryListConnection();
      void refreshNow().catch((reason: unknown) => {
        console.error('No se pudo actualizar la bandeja de Tickets.', reason);
      });
    }, REFRESH_INTERVAL_MS);

    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      if (eventTimerRef.current !== null) {
        clearTimeout(eventTimerRef.current);
        eventTimerRef.current = null;
      }
    };
  }, [refreshNow, scheduleRefresh]);

  return refreshNow;
}
