/**
 * @vitest-environment jsdom
 */
import type { MutableRefObject } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ShellSessionDto } from '@pockymoe/shared';
import type { ShellSocketConnection } from '../../adapters';
import {
  SHELL_ATTACH_RETRY_DELAY_MS,
  SHELL_ATTACH_TIMEOUT_MS,
  SHELL_RECONNECT_DELAY_MS,
} from './shellEvents';
import type {
  ShellSocketCloseApplication,
} from './shellSocketLifecycle';
import {
  applyShellSocketCleanupEffects,
  applyShellSocketCloseEffects,
  clearWindowTimerRef,
  deriveShellSocketCleanupApplicationFromRefs,
  scheduleShellAttachRetry,
  scheduleShellAttachTimeout,
  scheduleShellReconnect,
} from './shellSocketSideEffects';
import type { ShellSocketEffectCleanupAction } from './shellEvents';

function ref<T>(current: T): MutableRefObject<T> {
  return { current };
}

function fakeSocket(): ShellSocketConnection & {
  sentMessages: unknown[];
  closeSpy: ReturnType<typeof vi.fn>;
  rawCloseSpy: ReturnType<typeof vi.fn>;
} {
  const closeSpy = vi.fn();
  const rawCloseSpy = vi.fn();
  return {
    sentMessages: [],
    closeSpy,
    rawCloseSpy,
    socket: {
      close: rawCloseSpy,
    } as unknown as WebSocket,
    close: closeSpy,
    send(message: unknown) {
      this.sentMessages.push(message);
    },
  };
}

function reconnectKeySetter() {
  return vi.fn((value: SetStateAction<number>) => {
    if (typeof value === 'function') {
      expect(value(2)).toBe(3);
    }
  }) as Dispatch<SetStateAction<number>>;
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('shellSocketSideEffects', () => {
  it('clears timer refs idempotently', () => {
    vi.useFakeTimers();
    const timer = window.setTimeout(() => {}, 1000);
    const timerRef = ref<number | null>(timer);

    expect(clearWindowTimerRef(timerRef)).toBe(true);
    expect(timerRef.current).toBeNull();
    expect(clearWindowTimerRef(timerRef)).toBe(false);
  });

  it('schedules attach retry and reconnect key increments', () => {
    vi.useFakeTimers();
    const attachRetryTimerRef = ref<number | null>(null);
    const setReconnectKey = reconnectKeySetter();

    scheduleShellAttachRetry({
      attachRetryTimerRef,
      setReconnectKey,
    });

    expect(attachRetryTimerRef.current).not.toBeNull();
    vi.advanceTimersByTime(SHELL_ATTACH_RETRY_DELAY_MS);

    expect(attachRetryTimerRef.current).toBeNull();
    expect(vi.mocked(setReconnectKey)).toHaveBeenCalledTimes(1);
  });

  it('schedules reconnect and clears the reconnect timer ref after firing', () => {
    vi.useFakeTimers();
    const reconnectTimerRef = ref<number | null>(null);
    const setReconnectKey = vi.fn((value: SetStateAction<number>) => {
      if (typeof value === 'function') {
        expect(value(10)).toBe(11);
      }
    }) as Dispatch<SetStateAction<number>>;

    scheduleShellReconnect({
      reconnectTimerRef,
      setReconnectKey,
    });

    expect(reconnectTimerRef.current).not.toBeNull();
    vi.advanceTimersByTime(SHELL_RECONNECT_DELAY_MS);

    expect(reconnectTimerRef.current).toBeNull();
    expect(vi.mocked(setReconnectKey)).toHaveBeenCalledTimes(1);
  });

  it('applies attach timeout state and closes the current unattached socket', () => {
    vi.useFakeTimers();
    const shellSocket = fakeSocket();
    const socketRef = ref<ShellSocketConnection | null>(shellSocket);
    const viewerIdRef = ref<string | null>(null);
    const attachTimeoutRef = ref<number | null>(null);
    const setConnectionError = vi.fn();
    const setIsConnecting = vi.fn();
    const settleAttachPromise = vi.fn();

    scheduleShellAttachTimeout({
      shellSocket,
      socketRef,
      viewerIdRef,
      attachTimeoutRef,
      setConnectionError,
      setIsConnecting,
      settleAttachPromise,
    });

    vi.advanceTimersByTime(SHELL_ATTACH_TIMEOUT_MS);

    expect(attachTimeoutRef.current).toBeNull();
    expect(setConnectionError).toHaveBeenCalledWith(
      'Shell connection timed out. Reconnecting...',
    );
    expect(setIsConnecting).toHaveBeenCalledWith(false);
    expect(settleAttachPromise).toHaveBeenCalledWith(false);
    expect(shellSocket.closeSpy).toHaveBeenCalledTimes(1);
    expect(shellSocket.rawCloseSpy).toHaveBeenCalledTimes(1);
  });

  it('ignores attach timeout for stale or already attached sockets', () => {
    vi.useFakeTimers();
    const shellSocket = fakeSocket();
    const socketRef = ref<ShellSocketConnection | null>(null);
    const viewerIdRef = ref<string | null>('viewer-1');
    const setConnectionError = vi.fn();

    scheduleShellAttachTimeout({
      shellSocket,
      socketRef,
      viewerIdRef,
      attachTimeoutRef: ref<number | null>(null),
      setConnectionError,
      setIsConnecting: vi.fn(),
      settleAttachPromise: vi.fn(),
    });

    vi.advanceTimersByTime(SHELL_ATTACH_TIMEOUT_MS);

    expect(setConnectionError).not.toHaveBeenCalled();
    expect(shellSocket.closeSpy).not.toHaveBeenCalled();
  });

  it('applies socket close effects, detach updates, and reconnect scheduling', () => {
    vi.useFakeTimers();
    const attachTimeout = window.setTimeout(() => {}, 1000);
    const closeApplication: ShellSocketCloseApplication = {
      closeAction: {
        shouldDetachShell: true,
        shouldScheduleReconnect: true,
      },
      shouldClearAttachTimeout: true,
      shouldClearSocketRef: true,
      viewerId: null,
      isConnecting: false,
      settleAttachPromise: false,
    };
    const socketRef = ref<ShellSocketConnection | null>(fakeSocket());
    const reconnectTimerRef = ref<number | null>(null);
    const onShellUpdate = vi.fn(
      (
        _shellId: string,
        updater: (shell: ShellSessionDto) => ShellSessionDto,
      ) =>
        updater({
          id: 'shell-1',
          threadId: 'thread-1',
          workspaceId: 'workspace-1',
          label: null,
          tmuxSessionName: 'tmux',
          backend: 'pty',
          cwd: '/repo',
          status: 'attached',
          attachedViewerId: 'viewer-1',
          createdAt: '2026-06-10T00:00:00.000Z',
          updatedAt: '2026-06-10T00:00:00.000Z',
          lastActivityAt: null,
        }),
    );

    expect(
      applyShellSocketCloseEffects({
        closeApplication,
        shellId: 'shell-1',
        attachTimeoutRef: ref<number | null>(attachTimeout),
        socketRef,
        reconnectTimerRef,
        setViewerId: vi.fn(),
        setIsConnecting: vi.fn(),
        settleAttachPromise: vi.fn(),
        onShellUpdate,
        setReconnectKey: vi.fn(),
      }),
    ).toBe(true);

    expect(socketRef.current).toBeNull();
    expect(onShellUpdate).toHaveBeenCalledWith(
      'shell-1',
      expect.any(Function),
      'detached',
    );
    expect(reconnectTimerRef.current).not.toBeNull();
  });

  it('returns false when there is no socket close action to apply', () => {
    expect(
      applyShellSocketCloseEffects({
        closeApplication: {
          closeAction: null,
          shouldClearAttachTimeout: false,
          shouldClearSocketRef: false,
          viewerId: null,
          isConnecting: false,
          settleAttachPromise: false,
        },
        shellId: 'shell-1',
        attachTimeoutRef: ref<number | null>(null),
        socketRef: ref<ShellSocketConnection | null>(null),
        reconnectTimerRef: ref<number | null>(null),
        setViewerId: vi.fn(),
        setIsConnecting: vi.fn(),
        settleAttachPromise: vi.fn(),
        onShellUpdate: vi.fn(),
        setReconnectKey: vi.fn(),
      }),
    ).toBe(false);
  });

  it('applies socket cleanup effects in cleanup order', () => {
    vi.useFakeTimers();
    const shellSocket = fakeSocket();
    const attachRetry = window.setTimeout(() => {}, 1000);
    const attachTimeout = window.setTimeout(() => {}, 1000);
    const socketRef = ref<ShellSocketConnection | null>(shellSocket);
    const intentionalDisconnectRef = ref(false);
    const setViewerId = vi.fn();
    const setIsConnecting = vi.fn();
    const settleAttachPromise = vi.fn();
    const cleanupAction: ShellSocketEffectCleanupAction = {
      intentionalDisconnect: true,
      shouldClearAttachRetry: true,
      detachMessage: {
        type: 'shell.detach',
        shellId: 'shell-1',
        viewerId: 'viewer-1',
      },
      shouldSendDetachMessage: true,
      shouldClearViewer: true,
      isConnecting: false,
      settleAttachPromise: false,
      shouldClearAttachTimeout: true,
      shouldCloseSocket: true,
      shouldClearSocketRef: true,
    };

    applyShellSocketCleanupEffects({
      cleanupAction,
      shellSocket,
      attachRetryTimerRef: ref<number | null>(attachRetry),
      attachTimeoutRef: ref<number | null>(attachTimeout),
      socketRef,
      intentionalDisconnectRef,
      setViewerId,
      setIsConnecting,
      settleAttachPromise,
    });

    expect(intentionalDisconnectRef.current).toBe(true);
    expect(shellSocket.sentMessages).toContainEqual({
      type: 'shell.detach',
      shellId: 'shell-1',
      viewerId: 'viewer-1',
    });
    expect(setViewerId).toHaveBeenCalledWith(null);
    expect(setIsConnecting).toHaveBeenCalledWith(false);
    expect(settleAttachPromise).toHaveBeenCalledWith(false);
    expect(shellSocket.rawCloseSpy).toHaveBeenCalledTimes(1);
    expect(socketRef.current).toBeNull();
  });

  it('derives cleanup applications from mutable refs', () => {
    const shellSocket = fakeSocket();
    Object.defineProperty(shellSocket.socket, 'readyState', {
      configurable: true,
      value: WebSocket.OPEN,
    });

    expect(
      deriveShellSocketCleanupApplicationFromRefs({
        shellId: 'shell-1',
        viewerId: 'viewer-1',
        shellSocket,
        attachRetryTimerRef: ref<number | null>(123),
        attachTimeoutRef: ref<number | null>(456),
        socketRef: ref<ShellSocketConnection | null>(shellSocket),
        openReadyState: WebSocket.OPEN,
      }),
    ).toMatchObject({
      shouldClearAttachRetry: true,
      shouldClearAttachTimeout: true,
      shouldSendDetachMessage: true,
      shouldClearSocketRef: true,
    });
  });
});
