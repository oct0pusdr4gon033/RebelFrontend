import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  NotificacionDto,
  NotificacionesPageDto,
} from '../api/Dtos/Notificacion';
import {
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
  obtenerConteoNoLeidas,
  obtenerNotificaciones,
} from '../api/services/notificacion.service';
import {
  notificacionHubService,
  type NotificacionHubState,
} from '../services/notificacionHubService';

const PAGE_SIZE = 20;

interface NotificationPageState {
  page: number;
  totalCount: number;
}

export interface GlobalNotificationsState {
  notifications: NotificacionDto[];
  unreadCount: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  connectionState: NotificacionHubState | 'idle';
  loadMore: () => Promise<void>;
  markRead: (notification: NotificacionDto) => Promise<void>;
  markAllRead: () => Promise<void>;
}

function sortNotifications(items: NotificacionDto[]): NotificacionDto[] {
  return items.sort(
    (first, second) =>
      new Date(second.fechaCreacion).getTime() - new Date(first.fechaCreacion).getTime() ||
      second.id - first.id,
  );
}

export function useGlobalNotifications(token: string | null): GlobalNotificationsState {
  const [notifications, setNotifications] = useState<NotificacionDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pageState, setPageState] = useState<NotificationPageState>({
    page: 0,
    totalCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<
    NotificacionHubState | 'idle'
  >('idle');

  const notificationsRef = useRef<NotificacionDto[]>([]);
  const unreadCountRef = useRef(0);
  const activeTokenRef = useRef<string | null>(null);
  const refreshPromiseRef = useRef<{
    token: string;
    promise: Promise<void>;
    pending: boolean;
  } | null>(null);
  const loadingMoreRef = useRef(false);
  const countRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const replaceUnreadCount = useCallback((count: number) => {
    unreadCountRef.current = count;
    setUnreadCount(count);
  }, []);

  const mergeNotifications = useCallback(
    (incoming: readonly NotificacionDto[]) => {
      if (incoming.length === 0) return;
      const byId = new Map(
        notificationsRef.current.map((notification) => [notification.id, notification]),
      );
      incoming.forEach((notification) => {
        const previous = byId.get(notification.id);
        if (previous && previous.leida === notification.leida &&
          previous.fechaLectura === notification.fechaLectura &&
          previous.titulo === notification.titulo &&
          previous.mensaje === notification.mensaje) {
          return;
        }
        byId.set(notification.id, notification);
      });
      notificationsRef.current = sortNotifications([...byId.values()]);
      setNotifications(notificationsRef.current);
    },
    [],
  );

  const receiveNotification = useCallback((notification: NotificacionDto) => {
    if (activeTokenRef.current !== token) return;
    const previous = notificationsRef.current.find(
      (item) => item.id === notification.id,
    );
    mergeNotifications([notification]);
    if (!notification.leida && (!previous || previous.leida)) {
      replaceUnreadCount(unreadCountRef.current + 1);
    } else if (notification.leida && previous && !previous.leida) {
      replaceUnreadCount(Math.max(0, unreadCountRef.current - 1));
    }

    if (countRefreshTimerRef.current !== null) {
      clearTimeout(countRefreshTimerRef.current);
    }
    countRefreshTimerRef.current = setTimeout(() => {
      countRefreshTimerRef.current = null;
      if (!token || activeTokenRef.current !== token) return;
      void obtenerConteoNoLeidas(token)
        .then((count) => {
          if (activeTokenRef.current === token) replaceUnreadCount(count);
        })
        .catch((reason: unknown) => {
          if (activeTokenRef.current !== token) return;
          setError(
            reason instanceof Error
              ? reason.message
              : 'No se pudo actualizar el contador de notificaciones.',
          );
        });
    }, 250);
  }, [mergeNotifications, replaceUnreadCount, token]);

  const refresh = useCallback((): Promise<void> => {
    if (!token || activeTokenRef.current !== token) return Promise.resolve();
    const currentRefresh = refreshPromiseRef.current;
    if (currentRefresh?.token === token) {
      currentRefresh.pending = true;
      return currentRefresh.promise;
    }

    const refreshOperation = {
      token,
      promise: Promise.resolve(),
      pending: false,
    };
    refreshPromiseRef.current = refreshOperation;
    setLoading(true);
    const operation = async () => {
      do {
        refreshOperation.pending = false;
        const [pageResult, countResult] = await Promise.allSettled([
          obtenerNotificaciones(token, 1, PAGE_SIZE),
          obtenerConteoNoLeidas(token),
        ]);
        if (activeTokenRef.current !== token) return;

        if (pageResult.status === 'fulfilled') {
          mergeNotifications(pageResult.value.items);
          setPageState({
            page: pageResult.value.page,
            totalCount: pageResult.value.totalCount,
          });
        }

        if (countResult.status === 'fulfilled') {
          replaceUnreadCount(countResult.value);
        }

        if (pageResult.status === 'rejected' || countResult.status === 'rejected') {
          const reason =
            pageResult.status === 'rejected'
              ? pageResult.reason
              : countResult.status === 'rejected'
                ? countResult.reason
                : null;
          setError(
            reason instanceof Error
              ? reason.message
              : 'No se pudieron cargar las notificaciones.',
          );
        } else {
          setError(null);
        }
      } while (refreshOperation.pending && activeTokenRef.current === token);
    };
    refreshOperation.promise = operation().finally(() => {
      if (activeTokenRef.current === token) setLoading(false);
      if (refreshPromiseRef.current === refreshOperation) {
        refreshPromiseRef.current = null;
      }
    });
    return refreshOperation.promise;
  }, [mergeNotifications, replaceUnreadCount, token]);

  const loadMore = useCallback(async () => {
    if (
      !token ||
      activeTokenRef.current !== token ||
      loadingMoreRef.current ||
      notificationsRef.current.length >= pageState.totalCount
    ) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result: NotificacionesPageDto = await obtenerNotificaciones(
        token,
        pageState.page + 1,
        PAGE_SIZE,
      );
      if (activeTokenRef.current !== token) return;
      mergeNotifications(result.items);
      setPageState({ page: result.page, totalCount: result.totalCount });
      setError(null);
    } catch (reason) {
      if (activeTokenRef.current !== token) return;
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudieron cargar más notificaciones.',
      );
    } finally {
      if (activeTokenRef.current === token) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [mergeNotifications, pageState.page, pageState.totalCount, token]);

  const markRead = useCallback(async (notification: NotificacionDto) => {
    if (!token || activeTokenRef.current !== token || notification.leida) return;
    try {
      await marcarNotificacionLeida(token, notification.id);
      if (activeTokenRef.current !== token) return;
      const current = notificationsRef.current;
      const previous = current.find((item) => item.id === notification.id);
      if (previous && !previous.leida) {
        const updated = current.map((item) =>
          item.id === notification.id ? { ...item, leida: true } : item,
        );
        notificationsRef.current = updated;
        setNotifications(updated);
        replaceUnreadCount(Math.max(0, unreadCountRef.current - 1));
      }
      setError(null);
    } catch (reason) {
      if (activeTokenRef.current !== token) throw reason;
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudo marcar la notificación como leída.',
      );
      throw reason;
    }
  }, [replaceUnreadCount, token]);

  const markAllRead = useCallback(async () => {
    if (!token || activeTokenRef.current !== token || unreadCountRef.current === 0) return;
    try {
      const markedCount = await marcarTodasNotificacionesLeidas(token);
      if (activeTokenRef.current !== token) return;
      notificationsRef.current = notificationsRef.current.map((notification) =>
        notification.leida ? notification : { ...notification, leida: true },
      );
      setNotifications(notificationsRef.current);
      replaceUnreadCount(Math.max(0, unreadCountRef.current - markedCount));
      setError(null);
    } catch (reason) {
      if (activeTokenRef.current !== token) throw reason;
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudieron marcar todas las notificaciones como leídas.',
      );
      throw reason;
    }
  }, [replaceUnreadCount, token]);

  useEffect(() => {
    activeTokenRef.current = token;
    loadingMoreRef.current = false;
    if (!token) return;

    const unsubscribe = notificacionHubService.subscribe(token, {
      onNotification: receiveNotification,
      onStatus: (state) => {
        if (activeTokenRef.current === token) setConnectionState(state);
      },
      onConnected: refresh,
      onReconnected: refresh,
    });
    void refresh();
    return () => {
      if (activeTokenRef.current === token) activeTokenRef.current = null;
      if (countRefreshTimerRef.current !== null) {
        clearTimeout(countRefreshTimerRef.current);
        countRefreshTimerRef.current = null;
      }
      unsubscribe();
    };
  }, [receiveNotification, refresh, token]);

  useEffect(
    () => () => {
      if (countRefreshTimerRef.current !== null) {
        clearTimeout(countRefreshTimerRef.current);
      }
    },
    [],
  );

  return {
    notifications,
    unreadCount,
    hasMore: notifications.length < pageState.totalCount,
    loading,
    loadingMore,
    error,
    connectionState: token ? connectionState : 'idle',
    loadMore,
    markRead,
    markAllRead,
  };
}
