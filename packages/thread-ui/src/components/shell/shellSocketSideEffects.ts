import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from 'react';

import type {
  ShellSessionDto,
  ShellStatusDto,
} from '@pockymoe/shared';
import type { ShellSocketConnection } from '../../adapters';
import {
  deriveShellAttachTimeoutAction,
  deriveShellSocketEffectCleanupAction,
  type ShellSocketEffectCleanupAction,
  SHELL_ATTACH_RETRY_DELAY_MS,
  SHELL_ATTACH_TIMEOUT_MS,
  SHELL_RECONNECT_DELAY_MS,
} from './shellEvents';
import type { ShellSocketCloseApplication } from './shellSocketLifecycle';

export function clearWindowTimerRef(
  ref: MutableRefObject<number | null>,
) {
  if (ref.current === null) {
    return false;
  }

  window.clearTimeout(ref.current);
  ref.current = null;
  return true;
}

export function scheduleShellAttachRetry({
  attachRetryTimerRef,
  setReconnectKey,
  delayMs = SHELL_ATTACH_RETRY_DELAY_MS,
}: {
  attachRetryTimerRef: MutableRefObject<number | null>;
  setReconnectKey: Dispatch<SetStateAction<number>>;
  delayMs?: number;
}) {
  attachRetryTimerRef.current = window.setTimeout(() => {
    attachRetryTimerRef.current = null;
    setReconnectKey((current) => current + 1);
  }, delayMs);
}

export function scheduleShellReconnect({
  reconnectTimerRef,
  setReconnectKey,
  delayMs = SHELL_RECONNECT_DELAY_MS,
}: {
  reconnectTimerRef: MutableRefObject<number | null>;
  setReconnectKey: Dispatch<SetStateAction<number>>;
  delayMs?: number;
}) {
  reconnectTimerRef.current = window.setTimeout(() => {
    reconnectTimerRef.current = null;
    setReconnectKey((current) => current + 1);
  }, delayMs);
}

export function scheduleShellAttachTimeout({
  shellSocket,
  socketRef,
  viewerIdRef,
  attachTimeoutRef,
  setConnectionError,
  setIsConnecting,
  settleAttachPromise,
  delayMs = SHELL_ATTACH_TIMEOUT_MS,
}: {
  shellSocket: ShellSocketConnection;
  socketRef: MutableRefObject<ShellSocketConnection | null>;
  viewerIdRef: MutableRefObject<string | null>;
  attachTimeoutRef: MutableRefObject<number | null>;
  setConnectionError: Dispatch<SetStateAction<string | null>>;
  setIsConnecting: Dispatch<SetStateAction<boolean>>;
  settleAttachPromise: (connected: boolean) => void;
  delayMs?: number;
}) {
  attachTimeoutRef.current = window.setTimeout(() => {
    attachTimeoutRef.current = null;
    const action = deriveShellAttachTimeoutAction({
      isCurrentSocket:
        !shellSocket.socket ||
        socketRef.current?.socket === shellSocket.socket,
      viewerId: viewerIdRef.current,
    });
    if (!action) {
      return;
    }
    setConnectionError(action.connectionError);
    setIsConnecting(action.isConnecting);
    settleAttachPromise(action.settleAttachPromise);
    if (action.closeSocket) {
      shellSocket.close?.();
      shellSocket.socket?.close();
    }
  }, delayMs);
}

function applyShellSocketCloseDetachUpdate(
  entry: ShellSessionDto,
): ShellSessionDto {
  return {
    ...entry,
    status: entry.status === 'attached' ? 'detached' : entry.status,
    attachedViewerId: null,
  };
}

export function deriveShellSocketCleanupApplicationFromRefs({
  shellId,
  viewerId,
  shellSocket,
  attachRetryTimerRef,
  attachTimeoutRef,
  socketRef,
  openReadyState,
}: {
  shellId: string;
  viewerId: string | null;
  shellSocket: ShellSocketConnection;
  attachRetryTimerRef: MutableRefObject<number | null>;
  attachTimeoutRef: MutableRefObject<number | null>;
  socketRef: MutableRefObject<ShellSocketConnection | null>;
  openReadyState: number;
}) {
  return deriveShellSocketEffectCleanupAction({
    shellId,
    viewerId,
    socketReadyState: shellSocket.socket.readyState,
    openReadyState,
    hasAttachRetryTimer: attachRetryTimerRef.current !== null,
    hasAttachTimeout: attachTimeoutRef.current !== null,
    isCurrentSocket: socketRef.current?.socket === shellSocket.socket,
  });
}

export function applyShellSocketCloseEffects({
  closeApplication,
  shellId,
  attachTimeoutRef,
  socketRef,
  reconnectTimerRef,
  setViewerId,
  setIsConnecting,
  settleAttachPromise,
  onShellUpdate,
  setReconnectKey,
}: {
  closeApplication: ShellSocketCloseApplication;
  shellId: string;
  attachTimeoutRef: MutableRefObject<number | null>;
  socketRef: MutableRefObject<ShellSocketConnection | null>;
  reconnectTimerRef: MutableRefObject<number | null>;
  setViewerId: (nextViewerId: string | null) => void;
  setIsConnecting: Dispatch<SetStateAction<boolean>>;
  settleAttachPromise: (connected: boolean) => void;
  onShellUpdate: (
    shellId: string,
    updater: (shell: ShellSessionDto) => ShellSessionDto,
    nextState?: ShellStatusDto,
  ) => void;
  setReconnectKey: Dispatch<SetStateAction<number>>;
}) {
  const closeAction = closeApplication.closeAction;
  if (!closeAction) {
    return false;
  }

  if (closeApplication.shouldClearAttachTimeout) {
    clearWindowTimerRef(attachTimeoutRef);
  }
  if (closeApplication.shouldClearSocketRef) {
    socketRef.current = null;
  }
  setViewerId(closeApplication.viewerId);
  setIsConnecting(closeApplication.isConnecting);
  settleAttachPromise(closeApplication.settleAttachPromise);
  if (closeAction.shouldDetachShell) {
    onShellUpdate(
      shellId,
      applyShellSocketCloseDetachUpdate,
      'detached',
    );
  }
  if (closeAction.shouldScheduleReconnect) {
    scheduleShellReconnect({
      reconnectTimerRef,
      setReconnectKey,
    });
  }
  return true;
}

export function applyShellSocketCleanupEffects({
  cleanupAction,
  shellSocket,
  attachRetryTimerRef,
  attachTimeoutRef,
  socketRef,
  intentionalDisconnectRef,
  setViewerId,
  setIsConnecting,
  settleAttachPromise,
}: {
  cleanupAction: ShellSocketEffectCleanupAction;
  shellSocket: ShellSocketConnection;
  attachRetryTimerRef: MutableRefObject<number | null>;
  attachTimeoutRef: MutableRefObject<number | null>;
  socketRef: MutableRefObject<ShellSocketConnection | null>;
  intentionalDisconnectRef: MutableRefObject<boolean>;
  setViewerId: (nextViewerId: string | null) => void;
  setIsConnecting: Dispatch<SetStateAction<boolean>>;
  settleAttachPromise: (connected: boolean) => void;
}) {
  intentionalDisconnectRef.current = cleanupAction.intentionalDisconnect;
  if (cleanupAction.shouldClearAttachRetry) {
    clearWindowTimerRef(attachRetryTimerRef);
  }
  if (
    cleanupAction.shouldSendDetachMessage &&
    cleanupAction.detachMessage
  ) {
    shellSocket.send(cleanupAction.detachMessage);
  }
  if (cleanupAction.shouldClearViewer) {
    setViewerId(null);
  }
  setIsConnecting(cleanupAction.isConnecting);
  if (cleanupAction.settleAttachPromise !== undefined) {
    settleAttachPromise(cleanupAction.settleAttachPromise);
  }
  if (cleanupAction.shouldClearAttachTimeout) {
    clearWindowTimerRef(attachTimeoutRef);
  }
  if (cleanupAction.shouldCloseSocket) {
    shellSocket.socket.close();
  }
  if (cleanupAction.shouldClearSocketRef) {
    socketRef.current = null;
  }
}
