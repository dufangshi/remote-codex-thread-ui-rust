import { describe, expect, it } from 'vitest';

import type { ShellSessionDto } from '@pockymoe/shared';
import {
  applyShellLifecycleEventUpdate,
  applyShellSocketCloseDetachUpdate,
  deriveInitialShellAttachStartAction,
  deriveMeasuredShellAttachStartAction,
  deriveShellConnectedEventAction,
  deriveShellOutputEventApplication,
  deriveShellSocketCleanupApplication,
  deriveShellSocketCloseApplication,
  deriveShellSocketOpenApplication,
  shouldHandleShellSocketEvent,
} from './shellSocketLifecycle';

function shell(extra: Partial<ShellSessionDto> = {}): ShellSessionDto {
  return {
    id: 'shell-1',
    threadId: 'thread-1',
    workspaceId: 'workspace-1',
    label: null,
    tmuxSessionName: 'tmux-shell-1',
    backend: 'pty',
    cwd: '/repo',
    status: 'running',
    attachedViewerId: null,
    createdAt: '2026-06-10T00:00:00.000Z',
    updatedAt: '2026-06-10T00:00:00.000Z',
    lastActivityAt: null,
    ...extra,
  };
}

describe('shellSocketLifecycle helpers', () => {
  const attachFacts = {
    shellId: 'shell-1',
    terminalReady: true,
    isVisible: true,
    canAttachShell: true,
    userDisconnectedShellId: null,
    hasTerminal: true,
    hasPendingAttachRetry: false,
    hasCurrentSocketForShell: false,
    hasReconnectTimer: false,
  };

  it('derives initial and measured attach-start applications', () => {
    expect(deriveInitialShellAttachStartAction(attachFacts)).toEqual({
      type: 'measureSize',
    });
    expect(
      deriveMeasuredShellAttachStartAction({
        ...attachFacts,
        attachSize: null,
      }),
    ).toEqual({ type: 'scheduleRetry' });
    expect(
      deriveMeasuredShellAttachStartAction({
        ...attachFacts,
        attachSize: { cols: 100, rows: 30 },
        hasPendingAttachRetry: true,
        hasReconnectTimer: true,
      }),
    ).toEqual({
      type: 'startAttach',
      attachSize: { cols: 100, rows: 30 },
      shouldClearAttachRetry: true,
      shouldClearReconnectTimer: true,
    });
  });

  it('derives socket-open applications and stale socket suppression', () => {
    expect(
      deriveShellSocketOpenApplication({
        isCurrentSocket: false,
        shellId: 'shell-1',
        attachSize: { cols: 80, rows: 24 },
        hasAttachTimeout: true,
      }),
    ).toEqual({
      openAction: null,
      shouldClearAttachTimeout: false,
    });

    expect(
      deriveShellSocketOpenApplication({
        isCurrentSocket: true,
        shellId: 'shell-1',
        attachSize: { cols: 80, rows: 24 },
        hasAttachTimeout: true,
      }),
    ).toEqual({
      openAction: {
        message: {
          type: 'shell.attach',
          shellId: 'shell-1',
          cols: 80,
          rows: 24,
        },
        shouldScheduleAttachTimeout: true,
      },
      shouldClearAttachTimeout: true,
    });
  });

  it('filters stale socket events and events for other shells', () => {
    expect(
      shouldHandleShellSocketEvent({
        eventShellId: 'shell-1',
        shellId: 'shell-1',
        socketExists: true,
        isCurrentSocket: true,
      }),
    ).toBe(true);
    expect(
      shouldHandleShellSocketEvent({
        eventShellId: 'shell-1',
        shellId: 'shell-1',
        socketExists: true,
        isCurrentSocket: false,
      }),
    ).toBe(false);
    expect(
      shouldHandleShellSocketEvent({
        eventShellId: 'shell-2',
        shellId: 'shell-1',
        socketExists: false,
        isCurrentSocket: false,
      }),
    ).toBe(false);
  });

  it('derives connected event state updates and normalizes empty viewer ids', () => {
    const action = deriveShellConnectedEventAction({
      type: 'shell.connected',
      shellId: 'shell-1',
      timestamp: '2026-06-10T00:00:00.000Z',
      payload: {
        viewerId: 'viewer-1',
      },
    });

    expect(action.viewerId).toBe('viewer-1');
    expect(action.settleAttachPromise).toBe(true);
    expect(action.nextShell(shell())).toMatchObject({
      status: 'attached',
      attachedViewerId: 'viewer-1',
    });

    expect(
      deriveShellConnectedEventAction({
        type: 'shell.connected',
        shellId: 'shell-1',
        timestamp: '2026-06-10T00:00:00.000Z',
        payload: {
          viewerId: '',
        },
      }).viewerId,
    ).toBeNull();
  });

  it('derives output event snapshot updates', () => {
    expect(
      deriveShellOutputEventApplication({
        event: {
          type: 'shell.output',
          shellId: 'shell-1',
          timestamp: '2026-06-10T00:00:00.000Z',
          payload: {
            data: 'next\n',
            cwdBaseName: 'repo',
            isCommandRunning: false,
          },
        },
        shellCwd: '/fallback',
        currentSnapshot: 'prev\n',
        pendingCommand: null,
      }),
    ).toMatchObject({
      output: {
        data: 'next\n',
        replace: false,
        promptLabel: 'repo',
        isCommandRunning: false,
      },
      snapshotUpdate: {
        nextSnapshot: 'prev\nnext\n',
        nextPendingCommand: null,
        lastCommandOutput: null,
      },
    });
  });

  it('applies lifecycle event shell updates without accepting unsupported statuses', () => {
    expect(
      applyShellLifecycleEventUpdate(shell({ status: 'running' }), {
        viewerId: null,
        isConnecting: false,
        settleAttachPromise: false,
        isCommandRunning: false,
        connectionError: null,
        intentionalDisconnect: false,
        closeSocket: false,
        shellUpdate: {
          status: 'unknown' as ShellSessionDto['status'],
          attachedViewerId: 'viewer-1',
        },
      }),
    ).toMatchObject({
      status: 'running',
      attachedViewerId: 'viewer-1',
    });
  });

  it('applies socket-close detach updates only from attached shell status', () => {
    expect(
      deriveShellSocketCloseApplication({
        isCurrentSocket: true,
        hadViewer: true,
        intentionalDisconnect: false,
        userDisconnectedShellId: null,
        shellId: 'shell-1',
        hasAttachTimeout: true,
      }),
    ).toEqual({
      closeAction: {
        shouldDetachShell: true,
        shouldScheduleReconnect: true,
      },
      shouldClearAttachTimeout: true,
      shouldClearSocketRef: true,
      viewerId: null,
      isConnecting: false,
      settleAttachPromise: false,
    });
    expect(
      deriveShellSocketCloseApplication({
        isCurrentSocket: false,
        hadViewer: true,
        intentionalDisconnect: false,
        userDisconnectedShellId: null,
        shellId: 'shell-1',
        hasAttachTimeout: true,
      }).closeAction,
    ).toBeNull();
    expect(
      applyShellSocketCloseDetachUpdate(
        shell({ status: 'attached', attachedViewerId: 'viewer-1' }),
      ),
    ).toMatchObject({
      status: 'detached',
      attachedViewerId: null,
    });
    expect(
      applyShellSocketCloseDetachUpdate(
        shell({ status: 'running', attachedViewerId: 'viewer-1' }),
      ),
    ).toMatchObject({
      status: 'running',
      attachedViewerId: null,
    });
  });

  it('derives socket cleanup applications', () => {
    expect(
      deriveShellSocketCleanupApplication({
        shellId: 'shell-1',
        viewerId: 'viewer-1',
        socketReadyState: 1,
        openReadyState: 1,
        hasAttachRetryTimer: true,
        hasAttachTimeout: true,
        isCurrentSocket: true,
      }),
    ).toMatchObject({
      intentionalDisconnect: true,
      shouldClearAttachRetry: true,
      shouldSendDetachMessage: true,
      shouldClearAttachTimeout: true,
      shouldCloseSocket: true,
      shouldClearSocketRef: true,
    });
  });
});
