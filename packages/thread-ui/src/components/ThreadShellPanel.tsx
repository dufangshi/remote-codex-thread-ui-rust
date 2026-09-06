import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';

import type {
  ShellSessionDto,
  ShellStatusDto,
  ThreadShellStateDto,
} from '@remote-codex/shared';
import type { ThreadShellAdapter } from '../adapters';
import {
  ShellPane,
  type ShellPaneHandle,
  type ToolboxFeedbackState,
} from './shell/ShellPane';
import {
  ClipboardIcon,
  ConnectionIcon,
  ControlIcon,
  WrenchScrewdriverIcon,
  basenameFromPath,
  clampPaneRatio,
  statusLabel,
} from './shell/shellPresentation';
import {
  EMPTY_SHELL_PANE_RUNTIME_STATE,
  buildConnectionButtonState,
  buildShellControlState,
  isLiveShell,
  runtimeStatesEqual,
  selectInitialActiveShell,
  type ShellPaneId,
  type ShellPaneRuntimeState,
  type ThreadShellControlState,
} from './shell/shellState';

import { ShellTouchControls, useShellKeyboardLayout } from './shell/ShellTouchControls';
import { controlSequenceForLetter } from './shell/shellSnapshot';

export type { ThreadShellControlState } from './shell/shellState';

interface ThreadShellPanelProps {
  threadId: string;
  shellAdapter: ThreadShellAdapter;
  isVisible?: boolean;
  showHeader?: boolean;
  onBackToChat?: (() => void) | undefined;
  showFloatingToolbox?: boolean;
  effectiveTheme?: 'light' | 'dark';
  loadSplitRatio?: (threadId: string) => number | null | undefined;
  saveSplitRatio?: (threadId: string, ratio: number) => void;
  onStateChange?: (state: ThreadShellControlState) => void;
}

export interface ThreadShellPanelHandle {
  toggleConnection: () => Promise<void>;
  sendInput: (data: string) => boolean;
  sendCommand: (command: string) => boolean;
  sendControl: (
    action: 'ctrl_c' | 'ctrl_d' | 'esc' | 'tab' | 'up' | 'down' | 'clear',
  ) => boolean;
  copyLastCommandOutput: () => Promise<boolean>;
  terminate: () => Promise<void>;
  focus: () => void;
  refreshLayout: (options?: { focus?: boolean; syncBackendSize?: boolean }) => void;
}


export const ThreadShellPanel = forwardRef<
  ThreadShellPanelHandle,
  ThreadShellPanelProps
>(function ThreadShellPanel(
  {
    threadId,
    shellAdapter,
    isVisible = true,
    showHeader = true,
    onBackToChat,
    showFloatingToolbox = true,
    effectiveTheme = 'dark',
    loadSplitRatio,
    saveSplitRatio,
    onStateChange,
  }: ThreadShellPanelProps,
  ref,
) {
  const primaryPaneRef = useRef<ShellPaneHandle | null>(null);
  const secondaryPaneRef = useRef<ShellPaneHandle | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const terminalSplitHostRef = useRef<HTMLDivElement | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const createShellInFlightRef = useRef(false);
  const [shellState, setShellState] = useState<ThreadShellStateDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePaneId, setActivePaneId] = useState<ShellPaneId>('primary');
  const [primaryShellId, setPrimaryShellId] = useState<string | null>(null);
  const [secondaryShellId, setSecondaryShellId] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState<'single' | 'columns'>('single');
  const [splitRatio, setSplitRatio] = useState(50);
  const [renamingShellId, setRenamingShellId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [isMobileShell, setIsMobileShell] = useState(false);
  const { panelRef, layout: keyboardLayout } = useShellKeyboardLayout(isVisible, isMobileShell);
  const [ctrlPressed, setCtrlPressed] = useState(false);
  const ctrlRef = useRef(false);
  const transformInput = useCallback((data: string) => {
    if (!ctrlRef.current) return data;
    ctrlRef.current = false;
    setCtrlPressed(false);
    return data.length === 1 ? controlSequenceForLetter(data) ?? data : data;
  }, []);
  const [toolboxOpen, setToolboxOpen] = useState(false);
  const [paneRuntime, setPaneRuntime] = useState<Record<ShellPaneId, ShellPaneRuntimeState>>({
    primary: EMPTY_SHELL_PANE_RUNTIME_STATE,
    secondary: EMPTY_SHELL_PANE_RUNTIME_STATE,
  });
  const [toolboxFeedback, setToolboxFeedback] = useState<{
    tone: ToolboxFeedbackState;
    text: string;
  } | null>(null);
  const status = shellState?.state ?? 'not_created';
  const shells = useMemo(() => shellState?.shells ?? [], [shellState?.shells]);
  const liveShells = useMemo(
    () => shells.filter(isLiveShell),
    [shells],
  );
  const primaryShell = useMemo(
    () => liveShells.find((shell) => shell.id === primaryShellId) ?? null,
    [liveShells, primaryShellId],
  );
  const secondaryShell = useMemo(
    () => liveShells.find((shell) => shell.id === secondaryShellId) ?? null,
    [liveShells, secondaryShellId],
  );
  const activeShell = activePaneId === 'secondary' ? secondaryShell : primaryShell;
  const activeRuntime = paneRuntime[activePaneId];
  const workspacePathMissing = shellState?.workspacePathStatus === 'missing';
  const activePaneRef = activePaneId === 'secondary' ? secondaryPaneRef : primaryPaneRef;
  const connectionButtonState = buildConnectionButtonState({
    activeRuntime,
    activeShell,
    busy,
    loading,
    status,
    workspacePathMissing,
  });
  const connectionButtonDisabled = connectionButtonState.disabled;
  const connectionButtonLabel = connectionButtonState.label;
  const connectionButtonClassName = connectionButtonState.className;
  const toolboxFeedbackToneClassName =
    toolboxFeedback?.tone === 'done'
      ? 'shell-floating-feedback shell-floating-feedback-done'
      : toolboxFeedback?.tone === 'failed'
        ? 'shell-floating-feedback shell-floating-feedback-failed'
        : 'shell-floating-feedback';

  const setTransientToolboxFeedback = useCallback(
    (tone: ToolboxFeedbackState, text: string) => {
      setToolboxFeedback({ tone, text });
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
      feedbackTimerRef.current = window.setTimeout(() => {
        setToolboxFeedback(null);
        feedbackTimerRef.current = null;
      }, 1800);
    },
    [],
  );

  const updateShellEntry = useCallback(
    (
      shellId: string,
      updater: (shell: ShellSessionDto) => ShellSessionDto,
      nextState?: ShellStatusDto,
    ) => {
      setShellState((current) => {
        if (!current) {
          return current;
        }

        const nextShells = current.shells.map((shell) =>
          shell.id === shellId ? updater(shell) : shell,
        );
        const nextShell =
          current.shell?.id === shellId
            ? updater(current.shell)
            : nextShells.find((shell) => shell.id === current.shell?.id) ?? current.shell;

        return {
          ...current,
          ...(nextState ? { state: nextState } : {}),
          shell: nextShell,
          shells: nextShells,
        };
      });
    },
    [],
  );

  const loadShellState = useCallback(async () => {
    setLoading(true);
    try {
      const response = await shellAdapter.fetchState(threadId);
      setShellState(response);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load shell state.');
    } finally {
      setLoading(false);
    }
  }, [shellAdapter, threadId]);

  useEffect(() => {
    void loadShellState();
  }, [loadShellState]);

  useEffect(() => {
    const storedRatio = loadSplitRatio?.(threadId);
    if (storedRatio === null || storedRatio === undefined) {
      setSplitRatio(50);
      return;
    }
    const parsed =
      typeof storedRatio === 'number'
        ? storedRatio
        : Number.parseFloat(String(storedRatio));
    setSplitRatio(Number.isFinite(parsed) ? clampPaneRatio(parsed) : 50);
  }, [loadSplitRatio, threadId]);

  useEffect(() => {
    if (!shellState) {
      setPrimaryShellId(null);
      setSecondaryShellId(null);
      return;
    }

    const nextActiveShell = selectInitialActiveShell(shellState);

    setPrimaryShellId((current) => {
      if (current && shellState.shells.some((shell) => shell.id === current && isLiveShell(shell))) {
        return current;
      }
      return nextActiveShell?.id ?? null;
    });
    setSecondaryShellId((current) => {
      if (splitMode !== 'columns') {
        return null;
      }
      if (current && shellState.shells.some((shell) => shell.id === current && isLiveShell(shell))) {
        return current;
      }
      const fallback = shellState.shells.find(
        (shell) => isLiveShell(shell) && shell.id !== nextActiveShell?.id,
      );
      return fallback?.id ?? null;
    });
  }, [shellState, splitMode]);

  useEffect(() => {
    if (splitMode === 'columns') {
      return;
    }
    setActivePaneId('primary');
    setSecondaryShellId(null);
  }, [splitMode]);

  useEffect(() => {
    if (splitMode !== 'columns' || secondaryShellId || liveShells.length < 2) {
      return;
    }
    const nextSecondary = liveShells.find((shell) => shell.id !== primaryShell?.id) ?? null;
    if (nextSecondary) {
      setSecondaryShellId(nextSecondary.id);
    }
  }, [liveShells, primaryShell?.id, secondaryShellId, splitMode]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 767px), (hover: none) and (pointer: coarse)');
    const update = () => {
      setIsMobileShell(mediaQuery.matches);
      if (!mediaQuery.matches) {
        setToolboxOpen(false);
      }
    };

    update();
    mediaQuery.addEventListener('change', update);
    return () => {
      mediaQuery.removeEventListener('change', update);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current);
      }
    };
  }, []);

  const updatePaneRuntime = useCallback(
    (paneId: ShellPaneId, nextState: ShellPaneRuntimeState) => {
      setPaneRuntime((current) => {
        const previous = current[paneId];
        if (runtimeStatesEqual(previous, nextState)) {
          return current;
        }
        return {
          ...current,
          [paneId]: nextState,
        };
      });
    },
    [],
  );
  const handlePrimaryRuntimeStateChange = useCallback(
    (nextState: ShellPaneRuntimeState) => updatePaneRuntime('primary', nextState),
    [updatePaneRuntime],
  );
  const handleSecondaryRuntimeStateChange = useCallback(
    (nextState: ShellPaneRuntimeState) => updatePaneRuntime('secondary', nextState),
    [updatePaneRuntime],
  );

  const shellLabel = useCallback(
    (shell: ShellSessionDto) => {
      if (shell.label?.trim()) {
        return shell.label.trim();
      }
      const index = shells.findIndex((entry) => entry.id === shell.id);
      return `Shell ${index >= 0 ? index + 1 : ''}`.trim();
    },
    [shells],
  );

  const handleStartRenameShell = useCallback(
    (shell: ShellSessionDto) => {
      setRenamingShellId(shell.id);
      setRenameDraft(shell.label?.trim() || shellLabel(shell));
    },
    [shellLabel],
  );

  const handleCancelRenameShell = useCallback(() => {
    setRenamingShellId(null);
    setRenameDraft('');
  }, []);

  const handleSubmitRenameShell = useCallback(async () => {
    if (!renamingShellId) {
      return;
    }

    setBusy(true);
    try {
      const label = renameDraft.trim();
      const updated = await shellAdapter.updateShell(renamingShellId, {
        label: label.length > 0 ? label : null,
      });
      setShellState((current) =>
        current
          ? {
              ...current,
              state: current.activeShellId === updated.id ? updated.status : current.state,
              shell: current.shell?.id === updated.id ? updated : current.shell,
              shells: current.shells.map((shell) =>
                shell.id === updated.id ? updated : shell,
              ),
            }
          : current,
      );
      setRenamingShellId(null);
      setRenameDraft('');
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to rename shell.');
    } finally {
      setBusy(false);
    }
  }, [renameDraft, renamingShellId, shellAdapter]);

  const setPaneShell = useCallback((paneId: ShellPaneId, shellId: string) => {
    if (paneId === 'primary') {
      setPrimaryShellId(shellId);
      setSecondaryShellId((current) => (current === shellId ? null : current));
      return;
    }
    setSecondaryShellId(shellId);
    setPrimaryShellId((current) => (current === shellId ? null : current));
  }, []);

  const handleClosePane = useCallback((paneId: ShellPaneId) => {
    if (paneId === 'primary') {
      primaryPaneRef.current?.disconnect();
      setPrimaryShellId(null);
      if (splitMode === 'columns') {
        setActivePaneId('secondary');
      }
      return;
    }
    secondaryPaneRef.current?.disconnect();
    setSecondaryShellId(null);
    setActivePaneId('primary');
    setSplitMode('single');
  }, [splitMode]);

  const handleSelectShell = useCallback(
    (shell: ShellSessionDto, paneId: ShellPaneId = activePaneId) => {
      const targetPaneId = splitMode === 'columns' ? paneId : 'primary';
      setPaneShell(targetPaneId, shell.id);
      if (splitMode !== 'columns') {
        setSecondaryShellId(null);
      }
      setActivePaneId(targetPaneId);
    },
    [activePaneId, setPaneShell, splitMode],
  );

  const handleCreateShell = useCallback(
    async (paneId: ShellPaneId = activePaneId) => {
      if (createShellInFlightRef.current) {
        return;
      }
      createShellInFlightRef.current = true;
      setBusy(true);
      try {
        const response = await shellAdapter.createShell(threadId);
        setShellState(current => ({
          ...response,
          shells: [...new Map([
            ...(current?.shells ?? []).map(shell => [shell.id, shell] as const),
            ...(response.shells ?? (response.shell ? [response.shell] : [])).map(shell => [shell.id, shell] as const),
          ]).values()],
        }));
        const shellId = response.activeShellId ?? response.shell?.id ?? null;
        if (shellId) {
          const targetPaneId = splitMode === 'columns' ? paneId : 'primary';
          setPaneShell(targetPaneId, shellId);
          if (splitMode !== 'columns') {
            setSecondaryShellId(null);
          }
          setActivePaneId(targetPaneId);
        }
        setError(null);
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : 'Unable to create shell.',
        );
      } finally {
        createShellInFlightRef.current = false;
        setBusy(false);
      }
    },
    [activePaneId, setPaneShell, shellAdapter, splitMode, threadId],
  );

  useEffect(() => {
    if (
      !isVisible ||
      !shellState ||
      loading ||
      busy ||
      workspacePathMissing ||
      status === 'creating' ||
      liveShells.length > 0
    ) {
      return;
    }

    void handleCreateShell('primary');
  }, [
    busy,
    handleCreateShell,
    isVisible,
    liveShells.length,
    loading,
    shellState,
    status,
    workspacePathMissing,
  ]);

  const handleTerminateShell = useCallback(
    async (shellId: string = activeShell?.id ?? '') => {
      if (!shellId) {
        return;
      }

      setBusy(true);
      try {
        await shellAdapter.terminateShell(shellId);
        setPrimaryShellId((current) => (current === shellId ? null : current));
        setSecondaryShellId((current) => (current === shellId ? null : current));
        await loadShellState();
        setError(null);
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : 'Unable to terminate shell.',
        );
      } finally {
        setBusy(false);
      }
    },
    [activeShell?.id, loadShellState, shellAdapter],
  );

  const handleConnectionToggle = useCallback(async () => {
    if (connectionButtonDisabled) {
      return;
    }
    if (activeRuntime.shellInputEnabled) {
      activePaneRef.current?.disconnect();
      return;
    }
    if (!activeShell || activeShell.status === 'exited' || activeShell.status === 'not_found') {
      await handleCreateShell(activePaneId);
      return;
    }
    await activePaneRef.current?.reconnect();
  }, [
    activePaneId,
    activePaneRef,
    activeRuntime.shellInputEnabled,
    activeShell,
    connectionButtonDisabled,
    handleCreateShell,
  ]);

  const persistSplitRatio = useCallback(
    (nextRatio: number) => {
      if (typeof window === 'undefined') {
        return;
      }
      saveSplitRatio?.(threadId, clampPaneRatio(nextRatio));
    },
    [saveSplitRatio, threadId],
  );

  const refreshPaneLayouts = useCallback(() => {
    primaryPaneRef.current?.refreshLayout({ syncBackendSize: true });
    secondaryPaneRef.current?.refreshLayout({ syncBackendSize: true });
  }, []);

  const handleSplitDividerPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (splitMode !== 'columns') {
        return;
      }
      const host = terminalSplitHostRef.current;
      if (!host) {
        return;
      }

      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      const updateRatioFromClientX = (clientX: number) => {
        const rect = host.getBoundingClientRect();
        if (rect.width <= 0) {
          return;
        }
        const nextRatio = clampPaneRatio(((clientX - rect.left) / rect.width) * 100);
        setSplitRatio(nextRatio);
        if (dragFrameRef.current !== null) {
          window.cancelAnimationFrame(dragFrameRef.current);
        }
        dragFrameRef.current = window.requestAnimationFrame(() => {
          dragFrameRef.current = null;
          refreshPaneLayouts();
        });
      };

      const handlePointerMove = (moveEvent: PointerEvent) => {
        updateRatioFromClientX(moveEvent.clientX);
      };
      const handlePointerUp = (upEvent: PointerEvent) => {
        updateRatioFromClientX(upEvent.clientX);
        const rect = host.getBoundingClientRect();
        if (rect.width > 0) {
          persistSplitRatio(((upEvent.clientX - rect.left) / rect.width) * 100);
        }
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp, { once: true });
    },
    [persistSplitRatio, refreshPaneLayouts, splitMode],
  );

  const handleAssignShellToPane = useCallback(
    (shell: ShellSessionDto, paneId: ShellPaneId) => {
      setPaneShell(paneId, shell.id);
      setActivePaneId(paneId);
    },
    [setPaneShell],
  );

  const handleCopyVisibleShellText = useCallback(async () => {
    const copied = await activePaneRef.current?.copyLastCommandOutput();
    if (!copied) {
      setTransientToolboxFeedback('failed', 'Nothing to copy');
      return false;
    }
    return true;
  }, [activePaneRef, setTransientToolboxFeedback]);

  useEffect(() => {
    onStateChange?.(buildShellControlState({
      activeRuntime,
      activeShell,
      connectionButtonDisabled,
      connectionButtonLabel,
      isMobileShell,
      busy,
      loading,
      error,
    }));
  }, [
    activeRuntime,
    activeShell,
    busy,
    connectionButtonDisabled,
    connectionButtonLabel,
    error,
    isMobileShell,
    loading,
    onStateChange,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      async toggleConnection() {
        await handleConnectionToggle();
      },
      sendInput(data: string) {
        return activePaneRef.current?.sendInput(data) ?? false;
      },
      sendCommand(command: string) {
        return activePaneRef.current?.sendCommand(command) ?? false;
      },
      sendControl(action) {
        return activePaneRef.current?.sendControl(action) ?? false;
      },
      async copyLastCommandOutput() {
        return (await activePaneRef.current?.copyLastCommandOutput()) ?? false;
      },
      async terminate() {
        await handleTerminateShell();
      },
      focus() {
        activePaneRef.current?.focus();
      },
      refreshLayout(options) {
        primaryPaneRef.current?.refreshLayout(options);
        if (splitMode === 'columns') {
          secondaryPaneRef.current?.refreshLayout(options);
        }
      },
    }),
    [activePaneRef, handleConnectionToggle, handleTerminateShell, splitMode],
  );

  const renderProcessRow = (shell: ShellSessionDto) => (
    <div
      key={shell.id}
      className={`rounded-md border px-2 py-1.5 text-xs ${
        shell.id === activeShell?.id
          ? 'border-sky-300/40 bg-sky-300/12 text-sky-50'
          : 'border-stone-800 bg-stone-900/40 text-stone-300'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        {renamingShellId === shell.id ? (
          <form
            className="min-w-0 flex-1"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmitRenameShell();
            }}
          >
            <input
              value={renameDraft}
              onChange={(event) => setRenameDraft(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  handleCancelRenameShell();
                }
              }}
              autoFocus
              className="w-full rounded border border-sky-300/35 bg-stone-950/70 px-2 py-1 text-xs text-stone-100 outline-none"
              aria-label="Shell name"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => handleSelectShell(shell)}
            onDoubleClick={() => handleStartRenameShell(shell)}
            className="min-w-0 flex-1 text-left"
            title={shell.tmuxSessionName}
          >
            <span className="block truncate">{shellLabel(shell)}</span>
            <span className="block truncate text-[10px] text-[var(--theme-fg-muted)]">
              {statusLabel(shell.status)} · {basenameFromPath(shell.cwd) || shell.cwd}
            </span>
          </button>
        )}
        <div className="flex shrink-0 items-center gap-1">
          {renamingShellId === shell.id ? (
            <>
              <button
                type="button"
                onClick={() => void handleSubmitRenameShell()}
                className="rounded border border-sky-300/35 bg-sky-300/12 px-1.5 py-1 text-[10px] text-sky-50"
                title="Save shell name"
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleCancelRenameShell}
                className="rounded border border-stone-700 px-1.5 py-1 text-[10px] text-stone-200"
                title="Cancel rename"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => handleStartRenameShell(shell)}
              className="rounded border border-stone-700 px-1.5 py-1 text-[10px] text-stone-200 hover:border-sky-300/40"
              title="Rename shell"
            >
              Rename
            </button>
          )}
          {splitMode === 'columns' && (
            <>
              <button
                type="button"
                onClick={() => handleAssignShellToPane(shell, 'primary')}
                className="rounded border border-stone-700 px-1.5 py-1 text-[10px] text-stone-200 hover:border-sky-300/40"
                title="Open in left pane"
              >
                L
              </button>
              <button
                type="button"
                onClick={() => handleAssignShellToPane(shell, 'secondary')}
                className="rounded border border-stone-700 px-1.5 py-1 text-[10px] text-stone-200 hover:border-sky-300/40"
                title="Open in right pane"
              >
                R
              </button>
            </>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleTerminateShell(shell.id)}
            className="rounded border border-rose-300/35 bg-rose-300/12 px-1.5 py-1 text-[10px] text-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
            title="Kill shell process"
          >
            Kill
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={panelRef} className="shell-panel shell-direct-input relative flex min-h-0 flex-1 flex-col"
      style={keyboardLayout.height ? { height: keyboardLayout.height, flex: '0 0 auto' } : undefined}>
      {showHeader && (
        <div className="shell-header shrink-0 border-b px-3 py-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--theme-fg-muted)]">Shell</p>
              <p className="mt-1 truncate text-sm text-[var(--theme-fg-soft)]">
                {activeRuntime.promptLabel ?? activeShell?.cwd ?? 'Create a terminal for this thread.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label={connectionButtonLabel}
                title={`${connectionButtonLabel} (${statusLabel(activeRuntime.status)})`}
                disabled={connectionButtonDisabled}
                onClick={() => void handleConnectionToggle()}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-lg shadow-stone-950/25 transition disabled:cursor-not-allowed disabled:opacity-60 ${connectionButtonClassName}`}
              >
                <ConnectionIcon connected={activeRuntime.shellInputEnabled} />
              </button>
              {activeShell && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleTerminateShell(activeShell.id)}
                  className="rounded-full border border-rose-300/35 bg-rose-300/12 px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-300/18 dark:text-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Terminate
                </button>
              )}
            </div>
          </div>
          {(error || loading || workspacePathMissing) && (
            <div className="shell-banner mt-3 rounded-2xl border px-3 py-3 text-sm">
              {loading && <p className="text-[var(--theme-fg-muted)]">Loading shell state...</p>}
              {!loading && workspacePathMissing && (
                <p className="text-rose-600 dark:text-rose-100">
                  Workspace path is missing on this machine. Restore the path before creating a shell.
                </p>
              )}
              {!loading && error && (
                <p className="text-amber-700 dark:text-amber-100">{error}</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col">
          <div className="shell-terminal-bar flex shrink-0 items-center gap-2 border-b px-2 py-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
              <span className="min-w-0 truncate text-xs text-[var(--theme-fg-soft)]">
                {activeShell ? shellLabel(activeShell) : 'No live shell process'}
              </span>
              {activeShell && (
                <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-[var(--theme-fg-muted)]">
                  {statusLabel(activeRuntime.status)}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="hidden text-xs text-[var(--theme-fg-muted)] sm:inline">
                Live {liveShells.length}
              </span>
            </div>
          </div>
          {status === 'not_created' || workspacePathMissing ? (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <div className="shell-empty-state max-w-md rounded-[1.6rem] border px-6 py-8">
                <p className="text-base font-medium text-[var(--theme-fg)]">Durable thread shell</p>
                <p className="mt-3 text-sm leading-6 text-[var(--theme-fg-muted)]">
                  The shell runs under a supervisor-managed PTY and reconnects after browser disconnects.
                  Create it explicitly when you want to inspect or take over the workspace.
                </p>
                {!workspacePathMissing && (
                  <button
                    type="button"
                    disabled={busy || loading}
                    onClick={() => void handleCreateShell('primary')}
                    className="mt-5 rounded-md border border-sky-300/35 bg-sky-300/12 px-3 py-2 text-sm text-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    New Shell
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid h-full min-h-0 grid-cols-1 gap-2 p-2 sm:grid-cols-[minmax(0,1fr)_16rem] sm:p-3">
              <div className="shell-terminal-frame relative min-h-0 overflow-hidden rounded-[1.4rem] border shadow-inner">
                {!showHeader && (error || loading || workspacePathMissing) && (
                  <div className="shell-banner absolute left-2 right-2 top-2 z-10 rounded-2xl border px-3 py-3 text-sm backdrop-blur sm:left-3 sm:right-3 sm:top-3">
                    {loading && <p className="text-[var(--theme-fg-muted)]">Loading shell state...</p>}
                    {!loading && workspacePathMissing && (
                      <p className="text-rose-600 dark:text-rose-100">
                        Workspace path is missing on this machine. Restore the path before creating a shell.
                      </p>
                    )}
                    {!loading && error && (
                      <p className="text-amber-700 dark:text-amber-100">{error}</p>
                    )}
                  </div>
                )}
                <div
                  ref={terminalSplitHostRef}
                  className={`relative grid h-full min-h-0 ${
                    splitMode === 'columns' ? 'grid-cols-1 sm:grid-cols-[var(--shell-left)_0.35rem_var(--shell-right)]' : 'grid-cols-1'
                  }`}
                  style={
                    splitMode === 'columns'
                      ? ({
                          '--shell-left': `${splitRatio}fr`,
                          '--shell-right': `${100 - splitRatio}fr`,
                        } as CSSProperties)
                      : undefined
                  }
                  data-shell-split-ratio={splitRatio}
                >
                  <ShellPane
                    ref={primaryPaneRef}
                    paneId="primary"
                    shell={primaryShell}
                    isActive={activePaneId === 'primary'}
                    isVisible={isVisible}
                    inputTransform={transformInput}
                    isMobileShell={isMobileShell}
                    effectiveTheme={effectiveTheme}
                    workspacePathMissing={workspacePathMissing}
                    shellAdapter={shellAdapter}
                    onActivate={() => setActivePaneId('primary')}
                    onShellUpdate={updateShellEntry}
                    onRuntimeStateChange={handlePrimaryRuntimeStateChange}
                    onFeedback={setTransientToolboxFeedback}
                  />
                  {splitMode === 'columns' && (
                    <button
                      type="button"
                      onClick={() => handleClosePane('primary')}
                      className="absolute left-2 top-2 z-10 rounded-md border border-stone-700/80 bg-stone-950/70 px-2 py-1 text-[10px] text-stone-200 hover:border-rose-300/40"
                      title="Close left pane"
                    >
                      Close
                    </button>
                  )}
                  {splitMode === 'columns' && (
                    <button
                      type="button"
                      aria-label="Resize shell panes"
                      title="Resize shell panes"
                      onPointerDown={handleSplitDividerPointerDown}
                      className="hidden cursor-col-resize border-x border-stone-800/80 bg-stone-900/60 transition hover:border-sky-300/40 hover:bg-sky-300/10 sm:block"
                    />
                  )}
                  {splitMode === 'columns' && (
                    <div className="relative min-h-0 border-t border-stone-800/80 sm:border-l sm:border-t-0">
                      <ShellPane
                        ref={secondaryPaneRef}
                        paneId="secondary"
                        shell={secondaryShell}
                        isActive={activePaneId === 'secondary'}
                        isVisible={isVisible}
                        inputTransform={transformInput}
                      isMobileShell={isMobileShell}
                        effectiveTheme={effectiveTheme}
                        workspacePathMissing={workspacePathMissing}
                        shellAdapter={shellAdapter}
                        onActivate={() => setActivePaneId('secondary')}
                        onShellUpdate={updateShellEntry}
                        onRuntimeStateChange={handleSecondaryRuntimeStateChange}
                        onFeedback={setTransientToolboxFeedback}
                      />
                      <button
                        type="button"
                        onClick={() => handleClosePane('secondary')}
                        className="absolute left-2 top-2 z-10 rounded-md border border-stone-700/80 bg-stone-950/70 px-2 py-1 text-[10px] text-stone-200 hover:border-rose-300/40"
                        title="Close right pane"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
                {showFloatingToolbox && isMobileShell && (
                  <div className="pointer-events-none absolute bottom-3 right-3 z-20 flex flex-col items-end gap-2">
                    {toolboxFeedback && (
                      <div
                        className={`pointer-events-auto rounded-full border px-3 py-1.5 text-[11px] shadow-lg shadow-stone-950/30 backdrop-blur ${toolboxFeedbackToneClassName}`}
                      >
                        {toolboxFeedback.text}
                      </div>
                    )}
                    {toolboxOpen && (
                      <div className="shell-toolbox pointer-events-auto rounded-[1.2rem] border p-2 shadow-2xl backdrop-blur">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setTransientToolboxFeedback('idle', 'Use the prompt box tools to paste');
                            }}
                            className="inline-flex items-center justify-center rounded-full border border-sky-300/35 bg-sky-300/12 px-2.5 py-2 text-sky-600 dark:text-sky-50"
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <ClipboardIcon />
                              <span className="text-[11px] font-medium tracking-[0.12em]">Paste</span>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleCopyVisibleShellText()}
                            className="shell-toolbox-copy inline-flex items-center justify-center rounded-full border px-2.5 py-2"
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <ClipboardIcon />
                              <span className="text-[11px] font-medium tracking-[0.12em]">Copy</span>
                            </span>
                          </button>
                          <button
                            type="button"
                            disabled={!activeRuntime.shellInputEnabled}
                            onClick={() => {
                              if (activePaneRef.current?.sendControl('clear')) {
                                setTransientToolboxFeedback('done', 'Cleared');
                              } else {
                                setTransientToolboxFeedback('failed', 'Connect the shell first');
                              }
                            }}
                            className="disabled:opacity-45"
                          >
                            <ControlIcon label="CLEAR" tone="sky" />
                          </button>
                          <button
                            type="button"
                            disabled={!activeRuntime.shellInputEnabled || !activeRuntime.isCommandRunning}
                            onClick={() => {
                              if (activePaneRef.current?.sendInput('\u0003')) {
                                setTransientToolboxFeedback('done', 'Sent Ctrl-C');
                              } else {
                                setTransientToolboxFeedback('failed', 'Connect the shell first');
                              }
                            }}
                            className="disabled:opacity-45"
                          >
                            <ControlIcon label="CTRL-C" tone="rose" />
                          </button>
                          {(['ctrl_d', 'esc', 'tab', 'up', 'down'] as const).map((action) => (
                            <button
                              key={action}
                              type="button"
                              disabled={!activeRuntime.shellInputEnabled}
                              onClick={() => {
                                if (activePaneRef.current?.sendControl(action)) {
                                  setTransientToolboxFeedback('done', `Sent ${action.toUpperCase().replace('_', '-')}`);
                                } else {
                                  setTransientToolboxFeedback('failed', 'Connect the shell first');
                                }
                              }}
                              className="disabled:opacity-45"
                            >
                              <ControlIcon label={action.toUpperCase().replace('_', '-')} tone="stone" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      aria-expanded={toolboxOpen}
                      aria-label={toolboxOpen ? 'Close shell tools' : 'Open shell tools'}
                      onClick={() => setToolboxOpen((current) => !current)}
                      className="shell-toolbox-trigger pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border shadow-2xl backdrop-blur transition"
                    >
                      <WrenchScrewdriverIcon />
                    </button>
                  </div>
                )}
              </div>

              <aside className="hidden min-h-0 overflow-hidden rounded-[1rem] border border-stone-800/80 bg-stone-950/30 p-2 sm:flex sm:flex-col">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--theme-fg-muted)]">
                    Processes
                  </p>
                  <span className="text-[10px] text-[var(--theme-fg-muted)]">{liveShells.length} live</span>
                </div>
                <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                  {liveShells.map(renderProcessRow)}
                  {liveShells.length === 0 && (
                    <p className="px-2 py-3 text-xs text-[var(--theme-fg-muted)]">No live shell processes</p>
                  )}
                </div>
                <div className="mt-2 flex justify-end border-t border-stone-800/80 pt-2">
                  <button
                    type="button"
                    aria-label="New shell"
                    title="New shell"
                    disabled={busy || loading || workspacePathMissing}
                    onClick={() => void handleCreateShell(activePaneId)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-sky-300/35 bg-sky-300/12 text-base leading-none text-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
      <ShellTouchControls
        inset={keyboardLayout.inset} enabled={activeRuntime.shellInputEnabled}
        ctrl={ctrlPressed} onCtrl={() => { ctrlRef.current = !ctrlRef.current; setCtrlPressed(ctrlRef.current); }}
        onInput={data => { activePaneRef.current?.sendInput(transformInput(data)); }}
        onFocus={() => activePaneRef.current?.focus()} onChat={onBackToChat}
        onConnect={() => void handleConnectionToggle()} connectionLabel={connectionButtonLabel}
        sessions={liveShells} activeId={activeShell?.id} onSelect={handleSelectShell}
        onCreate={() => void handleCreateShell(activePaneId)} busy={busy || loading || workspacePathMissing}
      />
    </div>
  );
});
