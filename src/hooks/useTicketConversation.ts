import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComentarioTicketResponseDto } from '../api/Dtos/Ticket';
import {
  ticketHubService,
  type TicketHubConnectionState,
} from '../services/ticketHubService';

interface TicketConversationState {
  comments: ComentarioTicketResponseDto[];
  connectionState: TicketHubConnectionState | 'idle';
  connectionError: string | null;
  recoveryError: string | null;
  mergeComments: (comments: readonly ComentarioTicketResponseDto[]) => void;
}

interface TicketCommentsState {
  ticketId: number | null;
  comments: ComentarioTicketResponseDto[];
}

interface TicketStatusState {
  ticketId: number | null;
  state: TicketHubConnectionState;
  error: string | null;
}

export function useTicketConversation(
  ticketId: number | null,
  token: string | null,
  refreshTicket: (eventPayload?: unknown) => Promise<ComentarioTicketResponseDto[]>,
): TicketConversationState {
  const [commentState, setCommentState] = useState<TicketCommentsState>({
    ticketId,
    comments: [],
  });
  const [statusState, setStatusState] = useState<TicketStatusState>({
    ticketId: null,
    state: 'disconnected',
    error: null,
  });
  const [recoveryState, setRecoveryState] = useState<{
    ticketId: number | null;
    error: string | null;
  }>({ ticketId: null, error: null });
  const refreshTicketRef = useRef(refreshTicket);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  const refreshAgainRef = useRef(false);
  const pendingPayloadRef = useRef<unknown>(undefined);

  useEffect(() => {
    refreshTicketRef.current = refreshTicket;
  }, [refreshTicket]);

  const mergeComments = useCallback(
    (incoming: readonly ComentarioTicketResponseDto[]) => {
      if (ticketId === null || incoming.length === 0) return;
      setCommentState((currentState) => {
        const current =
          currentState.ticketId === ticketId ? currentState.comments : [];
        const byId = new Map(current.map((comment) => [comment.id, comment]));
        incoming.forEach((comment) => {
          const previous = byId.get(comment.id);
          byId.set(
            comment.id,
            previous && !comment.autorNombreCompleto
              ? { ...comment, autorNombreCompleto: previous.autorNombreCompleto }
              : comment,
          );
        });
        if (
          currentState.ticketId === ticketId &&
          byId.size === current.length &&
          current.every((comment) => byId.get(comment.id) === comment)
        ) {
          return currentState;
        }
        return {
          ticketId,
          comments: [...byId.values()].sort(
            (first, second) =>
              first.fecha.localeCompare(second.fecha) || first.id - second.id,
          ),
        };
      });
    },
    [ticketId],
  );

  const refreshFromServer = useCallback(async (eventPayload?: unknown) => {
    if (ticketId === null) return;
    if (eventPayload !== undefined) pendingPayloadRef.current = eventPayload;
    if (refreshPromiseRef.current) {
      refreshAgainRef.current = true;
      return refreshPromiseRef.current;
    }

    const operation = (async () => {
      do {
        refreshAgainRef.current = false;
        const payload = pendingPayloadRef.current;
        pendingPayloadRef.current = undefined;
        try {
          mergeComments(await refreshTicketRef.current(payload));
          setRecoveryState({ ticketId, error: null });
        } catch (reason) {
          setRecoveryState({
            ticketId,
            error:
              reason instanceof Error
                ? reason.message
                : 'No se pudieron recuperar los datos actualizados del ticket.',
          });
          throw reason;
        }
      } while (refreshAgainRef.current);
    })();

    const sharedOperation = operation.finally(() => {
      refreshPromiseRef.current = null;
    });
    refreshPromiseRef.current = sharedOperation;
    return sharedOperation;
  }, [mergeComments, ticketId]);

  useEffect(() => {
    if (ticketId === null || !token) return;

    const unsubscribe = ticketHubService.subscribe(ticketId, token, {
      onComment: (comment) => mergeComments([comment]),
      onTicketUpdated: refreshFromServer,
      onStatus: (state, error) => {
        setStatusState({ ticketId, state, error });
      },
      onReconnected: refreshFromServer,
    });

    return unsubscribe;
  }, [ticketId, token, mergeComments, refreshFromServer]);

  return {
    comments: commentState.ticketId === ticketId ? commentState.comments : [],
    connectionState:
      ticketId === null || !token
        ? 'idle'
        : statusState.ticketId === ticketId
          ? statusState.state
          : 'connecting',
    connectionError:
      statusState.ticketId === ticketId ? statusState.error : null,
    recoveryError:
      recoveryState.ticketId === ticketId ? recoveryState.error : null,
    mergeComments,
  };
}
