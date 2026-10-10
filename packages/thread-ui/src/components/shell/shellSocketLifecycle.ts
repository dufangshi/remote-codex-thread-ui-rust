import type {
  ShellEventEnvelope,
  ShellSessionDto,
} from '@pockymoe/shared';

import type {
  NormalizedShellOutputEvent,
  PendingShellCommand,
  ShellAttachStartAction,
  ShellLifecycleEventAction,
  ShellSnapshotUpdate,
  ShellSocketCloseAction,
  ShellSocketEffectCleanupAction,
  ShellSocketOpenAction,
  ShellTerminalSize,
} from './shellEvents';
import {
  deriveShellAttachStartAction,
  deriveShellSocketCloseAction,
  deriveShellSocketEffectCleanupAction,
  deriveShellSocketOpenAction,
  normalizeShellOutputEvent,
  updateShellSnapshotFromOutput,
} from './shellEvents';

export interface ShellEventSocketMatchInput {
  eventShellId: string;
  shellId: string;
  socketExists: boolean;
  isCurrentSocket: boolean;
}

export interface ShellConnectedEventAction {
  viewerId: string | null;
  settleAttachPromise: boolean;
  nextShell: (entry: ShellSessionDto) => ShellSessionDto;
}

export interface ShellOutputEventApplication {
  output: NormalizedShellOutputEvent;
  snapshotUpdate: ShellSnapshotUpdate | null;
}

export interface ShellAttachStartFacts {
  shellId: string | null;
  terminalReady: boolean;
  isVisible: boolean;
  canAttachShell: boolean;
  userDisconnectedShellId: string | null;
  hasTerminal: boolean;
  hasPendingAttachRetry: boolean;
  hasCurrentSocketForShell: boolean;
  hasReconnectTimer: boolean;
}

export interface ShellSocketOpenApplication {
  openAction: ShellSocketOpenAction | null;
  shouldClearAttachTimeout: boolean;
}

export interface ShellSocketCloseApplication {
  closeAction: ShellSocketCloseAction | null;
  shouldClearAttachTimeout: boolean;
  shouldClearSocketRef: boolean;
  viewerId: null;
  isConnecting: false;
  settleAttachPromise: false;
}

export type ShellSocketCleanupApplication = ShellSocketEffectCleanupAction;

export function shouldHandleShellSocketEvent({
  eventShellId,
  shellId,
  socketExists,
  isCurrentSocket,
}: ShellEventSocketMatchInput) {
  if (socketExists && !isCurrentSocket) {
    return false;
  }
  return eventShellId === shellId;
}

export function deriveInitialShellAttachStartAction(
  input: ShellAttachStartFacts,
): ShellAttachStartAction {
  return deriveShellAttachStartAction({
    ...input,
    attachSize: undefined,
  });
}

export function deriveMeasuredShellAttachStartAction({
  attachSize,
  ...input
}: ShellAttachStartFacts & {
  attachSize: ShellTerminalSize | null;
}): ShellAttachStartAction {
  return deriveShellAttachStartAction({
    ...input,
    attachSize,
  });
}

export function deriveShellSocketOpenApplication({
  isCurrentSocket,
  shellId,
  attachSize,
  hasAttachTimeout,
}: {
  isCurrentSocket: boolean;
  shellId: string;
  attachSize: ShellTerminalSize;
  hasAttachTimeout: boolean;
}): ShellSocketOpenApplication {
  const openAction = deriveShellSocketOpenAction({
    isCurrentSocket,
    shellId,
    attachSize,
  });

  return {
    openAction,
    shouldClearAttachTimeout: Boolean(openAction && hasAttachTimeout),
  };
}

export function deriveShellConnectedEventAction(
  event: Extract<ShellEventEnvelope, { type: 'shell.connected' }>,
): ShellConnectedEventAction {
  const viewerId = String(event.payload.viewerId ?? '');
  return {
    viewerId: viewerId || null,
    settleAttachPromise: Boolean(viewerId),
    nextShell: (entry) => ({
      ...entry,
      status: 'attached',
      attachedViewerId: viewerId,
    }),
  };
}

export function deriveShellOutputEventApplication({
  event,
  shellCwd,
  currentSnapshot,
  pendingCommand,
}: {
  event: Extract<ShellEventEnvelope, { type: 'shell.output' }>;
  shellCwd: string | null | undefined;
  currentSnapshot: string;
  pendingCommand: PendingShellCommand | null;
}): ShellOutputEventApplication {
  const output = normalizeShellOutputEvent(event.payload, shellCwd);
  const snapshotUpdate = output.data
    ? updateShellSnapshotFromOutput({
        currentSnapshot,
        data: output.data,
        replace: output.replace,
        isCommandRunning: output.isCommandRunning,
        pendingCommand,
      })
    : null;

  return {
    output,
    snapshotUpdate,
  };
}

export function deriveShellSocketCloseApplication({
  isCurrentSocket,
  hadViewer,
  intentionalDisconnect,
  userDisconnectedShellId,
  shellId,
  hasAttachTimeout,
}: {
  isCurrentSocket: boolean;
  hadViewer: boolean;
  intentionalDisconnect: boolean;
  userDisconnectedShellId: string | null;
  shellId: string;
  hasAttachTimeout: boolean;
}): ShellSocketCloseApplication {
  const closeAction = deriveShellSocketCloseAction({
    isCurrentSocket,
    hadViewer,
    intentionalDisconnect,
    userDisconnectedShellId,
    shellId,
  });

  return {
    closeAction,
    shouldClearAttachTimeout: Boolean(closeAction && hasAttachTimeout),
    shouldClearSocketRef: Boolean(closeAction),
    viewerId: null,
    isConnecting: false,
    settleAttachPromise: false,
  };
}

export function deriveShellSocketCleanupApplication(
  input: Parameters<typeof deriveShellSocketEffectCleanupAction>[0],
): ShellSocketCleanupApplication {
  return deriveShellSocketEffectCleanupAction(input);
}

export function applyShellLifecycleEventUpdate(
  entry: ShellSessionDto,
  action: ShellLifecycleEventAction,
): ShellSessionDto {
  if (!action.shellUpdate) {
    return entry;
  }

  return {
    ...entry,
    status:
      action.shellUpdate.status === 'attached' ||
      action.shellUpdate.status === 'detached' ||
      action.shellUpdate.status === 'exited' ||
      action.shellUpdate.status === 'not_found'
        ? action.shellUpdate.status
        : entry.status,
    attachedViewerId:
      action.shellUpdate.attachedViewerId === undefined
        ? entry.attachedViewerId
        : action.shellUpdate.attachedViewerId,
  };
}

export function applyShellSocketCloseDetachUpdate(
  entry: ShellSessionDto,
): ShellSessionDto {
  return {
    ...entry,
    status: entry.status === 'attached' ? 'detached' : entry.status,
    attachedViewerId: null,
  };
}
