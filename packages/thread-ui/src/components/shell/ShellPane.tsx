import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import 'xterm/css/xterm.css';
import type { FitAddon } from '@xterm/addon-fit';
import type { Terminal } from 'xterm';

import type {
  ShellSessionDto,
  ShellStatusDto,
} from '@remote-codex/shared';
import type {
  ShellSocketConnection,
  ThreadShellAdapter,
} from '../../adapters';
import {
  controlSequenceForLetter,
  shellControlSequence,
} from './shellSnapshot';
import {
  deriveShellManualDisconnectAction,
  deriveShellMissingSessionResetAction,
  deriveShellPaneUnmountCleanupAction,
  deriveShellReconnectRequestAction,
  deriveShellReconnectStartAction,
  deriveShellResizeDecision,
  SHELL_RECONNECT_PROMISE_TIMEOUT_MS,
} from './shellEvents';
import {
  getVisibleTerminalText,
  renderShellSnapshot,
} from './shellTerminal';
import { createShellAttachPromiseController } from './shellAttachPromise';
import {
  basenameFromPath,
  buildPromptLabel,
  terminalThemeFor,
} from './shellPresentation';
import {
  shellCanAttach,
  type ShellPaneId,
  type ShellPaneRuntimeState,
} from './shellState';
import { useShellSocketLifecycle } from './useShellSocketLifecycle';

export type ToolboxFeedbackState = 'idle' | 'done' | 'failed';

export interface ShellPaneHandle {
  disconnect: () => void;
  reconnect: () => Promise<boolean>;
  sendInput: (data: string) => boolean;
  sendCommand: (command: string) => boolean;
  sendControl: (
    action: 'ctrl_c' | 'ctrl_d' | 'esc' | 'tab' | 'up' | 'down' | 'clear',
  ) => boolean;
  copyLastCommandOutput: () => Promise<boolean>;
  focus: () => void;
  refreshLayout: (options?: {
    focus?: boolean;
    syncBackendSize?: boolean;
  }) => void;
}

interface ShellPaneProps {
  inputTransform?: (data: string) => string;
  paneId: ShellPaneId;
  shell: ShellSessionDto | null;
  isActive: boolean;
  isVisible: boolean;
  isMobileShell: boolean;
  effectiveTheme: 'light' | 'dark';
  workspacePathMissing: boolean;
  shellAdapter: ThreadShellAdapter;
  onActivate: () => void;
  onShellUpdate: (
    shellId: string,
    updater: (shell: ShellSessionDto) => ShellSessionDto,
    nextState?: ShellStatusDto,
  ) => void;
  onRuntimeStateChange: (state: ShellPaneRuntimeState) => void;
  onFeedback?: (tone: ToolboxFeedbackState, text: string) => void;
}

function refValue<T>(ref: { current: T }) {
  return ref.current;
}

export const ShellPane = forwardRef<ShellPaneHandle, ShellPaneProps>(
  function ShellPane(
    {
      inputTransform,
      paneId,
      shell,
      isActive,
      isVisible,
      isMobileShell,
      effectiveTheme,
      workspacePathMissing,
      shellAdapter,
      onActivate,
      onShellUpdate,
      onRuntimeStateChange,
      onFeedback,
    },
    ref,
  ) {
    const transformRef = useRef(inputTransform);
    transformRef.current = inputTransform;
    const terminalRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const socketRef = useRef<ShellSocketConnection | null>(null);
    const viewerIdRef = useRef<string | null>(null);
    const shellIdRef = useRef<string | null>(null);
    const reconnectTimerRef = useRef<number | null>(null);
    const attachTimeoutRef = useRef<number | null>(null);
    const attachRetryTimerRef = useRef<number | null>(null);
    const intentionalDisconnectRef = useRef(false);
    const userDisconnectedShellIdRef = useRef<string | null>(null);
    const shellSnapshotRef = useRef('');
    const pendingCommandRef = useRef<{
      command: string;
      beforeSnapshot: string;
    } | null>(null);
    const lastCommandOutputRef = useRef('');
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const lastSentSizeRef = useRef<{ cols: number; rows: number } | null>(null);
    const snapshotCursorRef = useRef<{
      cursorX: number | undefined;
      cursorY: number | undefined;
      paneHeight: number | undefined;
    }>({
      cursorX: undefined,
      cursorY: undefined,
      paneHeight: undefined,
    });
    const terminalInitializingRef = useRef(false);
    const terminalInputSubscriptionRef = useRef<{
      dispose: () => void;
    } | null>(null);
    const isVisibleRef = useRef(isVisible);
    const isMobileShellRef = useRef(isMobileShell);
    const sendShellInputRef = useRef<(data: string) => boolean>(() => false);
    const syncTerminalSizeRef = useRef<
      () => { cols: number; rows: number } | null
    >(() => null);
    const refreshTerminalLayoutRef = useRef<() => void>(() => {});
    const attachPromiseControllerRef = useRef(
      createShellAttachPromiseController({
        clearTimeout: window.clearTimeout,
      }),
    );
    const [terminalHostNode, setTerminalHostNode] =
      useState<HTMLDivElement | null>(null);
    const [terminalReady, setTerminalReady] = useState(false);
    const [viewerId, setViewerIdState] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [runtimePromptLabel, setRuntimePromptLabel] = useState<string | null>(
      null,
    );
    const [isCommandRunning, setIsCommandRunning] = useState(false);
    const [reconnectKey, setReconnectKey] = useState(0);
    const shellStatus = shell?.status ?? 'not_created';
    const canAttachShell = shellCanAttach({ shell, workspacePathMissing });
    const fallbackPromptLabel = useMemo(
      () => buildPromptLabel(basenameFromPath(shell?.cwd), null),
      [shell?.cwd],
    );
    const promptLabel = runtimePromptLabel ?? fallbackPromptLabel;

    const setViewerId = useCallback((nextViewerId: string | null) => {
      viewerIdRef.current = nextViewerId;
      setViewerIdState(nextViewerId);
    }, []);

    const settleAttachPromise = useCallback((connected: boolean) => {
      attachPromiseControllerRef.current.settle(connected);
    }, []);

    useEffect(() => {
      isVisibleRef.current = isVisible;
    }, [isVisible]);

    useEffect(() => {
      isMobileShellRef.current = isMobileShell;
    }, [isMobileShell]);

    useEffect(() => {
      shellIdRef.current = shell?.id ?? null;
    }, [shell?.id]);

    const sendShellInput = useCallback((data: string) => {
      const socket = socketRef.current;
      const shellId = shellIdRef.current;
      const currentViewerId = viewerIdRef.current;
      if (!socket || !shellId || !currentViewerId) {
        return false;
      }

      socket.send({
        type: 'shell.input',
        shellId,
        viewerId: currentViewerId,
        data,
      });
      return true;
    }, []);

    useEffect(() => {
      sendShellInputRef.current = sendShellInput;
    }, [sendShellInput]);

    const sendShellClear = useCallback(() => {
      const socket = socketRef.current;
      const shellId = shellIdRef.current;
      const currentViewerId = viewerIdRef.current;
      if (!socket || !shellId || !currentViewerId) {
        return false;
      }

      socket.send({
        type: 'shell.clear',
        shellId,
        viewerId: currentViewerId,
      });
      return true;
    }, []);

    const isTerminalVisible = useCallback(() => {
      if (!isVisible || !terminalHostNode) {
        return false;
      }
      const rect = terminalHostNode.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }, [isVisible, terminalHostNode]);

    const syncTerminalSize = useCallback(
      (options?: { syncBackendSize?: boolean }) => {
        const terminal = terminalRef.current;
        const fitAddon = fitAddonRef.current;
        if (!terminal || !fitAddon || !isTerminalVisible()) {
          return null;
        }

        fitAddon.fit();
        if (terminal.cols <= 0 || terminal.rows <= 0) {
          return null;
        }

        const size = { cols: terminal.cols, rows: terminal.rows };
        const resizeDecision = deriveShellResizeDecision({
          size,
          previousSize: lastSentSizeRef.current,
          shellId: shellIdRef.current,
          viewerId: viewerIdRef.current,
          syncBackendSize: options?.syncBackendSize !== false,
        });
        if (options?.syncBackendSize === false) {
          return size;
        }

        lastSentSizeRef.current = resizeDecision.nextLastSentSize;
        if (!resizeDecision.message) {
          return size;
        }

        if (socketRef.current) {
          socketRef.current.send(resizeDecision.message);
        }
        return size;
      },
      [isTerminalVisible],
    );

    useEffect(() => {
      syncTerminalSizeRef.current = syncTerminalSize;
    }, [syncTerminalSize]);

    const refreshTerminalLayout = useCallback(
      (options?: { focus?: boolean; syncBackendSize?: boolean }) => {
        const terminal = terminalRef.current;
        if (!terminal || !isTerminalVisible()) {
          return;
        }

        syncTerminalSize(
          options?.syncBackendSize === undefined
            ? undefined
            : { syncBackendSize: options.syncBackendSize },
        );
        if (
          shellSnapshotRef.current &&
          !getVisibleTerminalText(terminalHostNode)
        ) {
          renderShellSnapshot(
            terminal,
            shellSnapshotRef.current,
            snapshotCursorRef.current.cursorX,
            snapshotCursorRef.current.cursorY,
            snapshotCursorRef.current.paneHeight,
          );
        } else {
          terminal.scrollToBottom();
        }

        if (options?.focus && !isMobileShell) {
          terminal.focus();
        }
      },
      [isMobileShell, isTerminalVisible, syncTerminalSize, terminalHostNode],
    );

    useEffect(() => {
      refreshTerminalLayoutRef.current = () => refreshTerminalLayout();
    }, [refreshTerminalLayout]);

    useEffect(() => {
      onRuntimeStateChange({
        status: viewerId ? 'attached' : shellStatus,
        shellInputEnabled: Boolean(viewerId && shell),
        isConnecting,
        isCommandRunning,
        promptLabel,
        error: connectionError,
        hasShell: Boolean(shell),
      });
    }, [
      connectionError,
      isConnecting,
      isCommandRunning,
      onRuntimeStateChange,
      promptLabel,
      shell,
      shellStatus,
      viewerId,
    ]);

    useEffect(() => {
      if (
        !terminalHostNode ||
        terminalRef.current ||
        terminalInitializingRef.current
      ) {
        return;
      }

      let cancelled = false;
      terminalInitializingRef.current = true;

      void (async () => {
        const [terminalModule, fitModule] = await Promise.all([
          import('xterm'),
          import('@xterm/addon-fit'),
        ]);

        if (cancelled || !terminalHostNode) {
          terminalInitializingRef.current = false;
          return;
        }

        // xterm 5 is CommonJS: Vite dev exposes it under default, while
        // production Rollup and tests can expose named exports.
        const TerminalConstructor = terminalModule.Terminal ??
          (terminalModule as unknown as {default: typeof terminalModule}).default.Terminal;
        const FitConstructor = fitModule.FitAddon ??
          (fitModule as unknown as {default: typeof fitModule}).default.FitAddon;
        const terminal = new TerminalConstructor({
          cursorBlink: true,
          disableStdin: false,
          fontFamily: 'IBM Plex Mono, SFMono-Regular, Menlo, monospace',
          fontSize: 13,
          lineHeight: 1.25,
          scrollback: 3000,
          theme: terminalThemeFor(effectiveTheme),
        });
        const fitAddon = new FitConstructor();
        terminal.loadAddon(fitAddon);
        terminal.open(terminalHostNode);
        terminalRef.current = terminal;
        fitAddonRef.current = fitAddon;
        syncTerminalSizeRef.current();
        terminal.attachCustomKeyEventHandler((event) => {
          if (event.type !== 'keydown') {
            return true;
          }

          if (
            event.ctrlKey &&
            !event.altKey &&
            !event.metaKey &&
            !event.shiftKey
          ) {
            const sequence = controlSequenceForLetter(event.key);
            if (!sequence) {
              return true;
            }

            if (sendShellInputRef.current(sequence)) {
              event.preventDefault();
              return false;
            }
          }

          return true;
        });
        setTerminalReady(true);
        terminalInitializingRef.current = false;

        resizeObserverRef.current = new ResizeObserver(() => {
          refreshTerminalLayoutRef.current();
        });
        resizeObserverRef.current.observe(terminalHostNode);

        terminalInputSubscriptionRef.current = terminal.onData((data) => {
          sendShellInputRef.current(transformRef.current?.(data) ?? data);
        });
      })().catch((error: unknown) => {
        if (cancelled) return;
        terminalInitializingRef.current = false;
        setConnectionError(error instanceof Error ? error.message : 'Unable to initialize terminal.');
      });

      return () => {
        cancelled = true;
        terminalInitializingRef.current = false;
        terminalInputSubscriptionRef.current?.dispose();
        terminalInputSubscriptionRef.current = null;
        resizeObserverRef.current?.disconnect();
        resizeObserverRef.current = null;
        setTerminalReady(false);
        terminalRef.current?.dispose();
        terminalRef.current = null;
        fitAddonRef.current = null;
        lastSentSizeRef.current = null;
      };
    }, [effectiveTheme, terminalHostNode]);

    useEffect(() => {
      const resetAction = deriveShellMissingSessionResetAction({
        hasShell: Boolean(shell),
      });
      if (!resetAction) {
        return;
      }
      setViewerId(resetAction.viewerId);
      setIsConnecting(resetAction.isConnecting);
      settleAttachPromise(resetAction.settleAttachPromise);
      setConnectionError(resetAction.connectionError);
      setRuntimePromptLabel(resetAction.runtimePromptLabel);
      setIsCommandRunning(resetAction.isCommandRunning);
      shellSnapshotRef.current = resetAction.shellSnapshot;
      lastCommandOutputRef.current = resetAction.lastCommandOutput;
      pendingCommandRef.current = resetAction.pendingCommand;
      if (resetAction.shouldResetTerminal) {
        terminalRef.current?.reset();
      }
    }, [setViewerId, settleAttachPromise, shell]);

    useEffect(() => {
      const terminal = terminalRef.current;
      if (!terminal) {
        return;
      }

      terminal.options.theme = terminalThemeFor(effectiveTheme);
    }, [effectiveTheme]);

    useEffect(() => {
      const terminal = terminalRef.current;
      if (!terminal) {
        return;
      }

      terminal.options.disableStdin = false;
    }, [isMobileShell]);

    useEffect(() => {
      if (!isVisible || !terminalReady) {
        return;
      }

      const frame = window.requestAnimationFrame(() => {
        refreshTerminalLayout({ focus: isActive, syncBackendSize: false });
        if (
          !socketRef.current &&
          shell?.id &&
          userDisconnectedShellIdRef.current !== shell.id
        ) {
          setReconnectKey((current) => current + 1);
        }
      });

      return () => {
        window.cancelAnimationFrame(frame);
      };
    }, [isActive, isVisible, refreshTerminalLayout, shell?.id, terminalReady]);

    useEffect(() => {
      const terminal = terminalRef.current;
      if (!terminalReady || !terminal || !isVisible) return;
      // The first fit can run before xterm has measured its font. Host size
      // does not change when those metrics arrive, so ResizeObserver alone
      // leaves the default 24 rows until another navigation/resize.
      let frame = 0;
      let disposed = false;
      const fit = () => {
        if (disposed || frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          syncTerminalSizeRef.current();
        });
      };
      const rendered = terminal.onRender(fit);
      void document.fonts?.ready.then(fit);
      fit();
      return () => { disposed = true; cancelAnimationFrame(frame); rendered.dispose(); };
    }, [terminalReady, isVisible]);

    useEffect(() => {
      if (!isMobileShell || !terminalReady || !terminalHostNode) return;
      const viewport = terminalHostNode.querySelector('.xterm-viewport');
      if (!viewport) return;
      // xterm 5's ancestor touchmove handler prevents the browser's default
      // scroll and only moves one delta at a time. Let the native viewport own
      // gestures (including momentum); its scroll event still updates xterm.
      const nativeScroll = (event: Event) => {
        if (terminalRef.current?.buffer.active.type === 'normal') event.stopPropagation();
      };
      viewport.addEventListener('touchstart', nativeScroll, {passive: true});
      viewport.addEventListener('touchmove', nativeScroll, {passive: true});
      return () => {
        viewport.removeEventListener('touchstart', nativeScroll);
        viewport.removeEventListener('touchmove', nativeScroll);
      };
    }, [isMobileShell, terminalReady, terminalHostNode]);

    useShellSocketLifecycle({
      shell,
      shellAdapter,
      canAttachShell,
      terminalReady,
      reconnectKey,
      terminalRef,
      socketRef,
      viewerIdRef,
      shellIdRef,
      reconnectTimerRef,
      attachTimeoutRef,
      attachRetryTimerRef,
      isVisibleRef,
      intentionalDisconnectRef,
      userDisconnectedShellIdRef,
      shellSnapshotRef,
      pendingCommandRef,
      lastCommandOutputRef,
      snapshotCursorRef,
      syncTerminalSizeRef,
      setReconnectKey,
      setViewerId,
      setIsConnecting,
      setConnectionError,
      setRuntimePromptLabel,
      setIsCommandRunning,
      settleAttachPromise,
      onShellUpdate,
    });

    useEffect(() => {
      return () => {
        const reconnectTimer = refValue(reconnectTimerRef);
        const attachTimeout = refValue(attachTimeoutRef);
        const attachRetry = refValue(attachRetryTimerRef);
        const cleanupAction = deriveShellPaneUnmountCleanupAction({
          hasReconnectTimer: reconnectTimer !== null,
          hasAttachTimeout: attachTimeout !== null,
          hasAttachRetry: attachRetry !== null,
        });
        if (
          cleanupAction.shouldClearReconnectTimer &&
          reconnectTimer !== null
        ) {
          window.clearTimeout(reconnectTimer);
        }
        if (
          cleanupAction.shouldClearAttachTimeout &&
          attachTimeout !== null
        ) {
          window.clearTimeout(attachTimeout);
        }
        if (
          cleanupAction.shouldClearAttachRetry &&
          attachRetry !== null
        ) {
          window.clearTimeout(attachRetry);
        }
        settleAttachPromise(cleanupAction.settleAttachPromise);
      };
    }, [settleAttachPromise]);

    useImperativeHandle(
      ref,
      () => ({
        disconnect() {
          const socket = socketRef.current;
          const shellId = shellIdRef.current;
          const currentViewerId = viewerIdRef.current;
          const action = deriveShellManualDisconnectAction({
            shellId,
            viewerId: currentViewerId,
            hasSocket: Boolean(socket),
          });
          userDisconnectedShellIdRef.current = action.userDisconnectedShellId;
          intentionalDisconnectRef.current = action.intentionalDisconnect;
          if (socket && action.detachMessage) {
            socket.send(action.detachMessage);
          }
          setViewerId(null);
          setIsConnecting(false);
          settleAttachPromise(false);
          if (action.shouldCloseSocket) {
            socket?.socket.close();
          }
          if (action.shouldClearSocketRef) {
            socketRef.current = null;
          }
          if (action.shouldClearLastSentSize) {
            lastSentSizeRef.current = null;
          }
          if (action.shouldDetachShell && shellId) {
            onShellUpdate(
              shellId,
              (entry) => ({
                ...entry,
                status: 'detached',
                attachedViewerId: null,
              }),
              'detached',
            );
          }
        },
        reconnect() {
          const reconnectAction = deriveShellReconnectRequestAction({
            hasShellId: Boolean(shellIdRef.current),
            terminalReady,
            workspacePathMissing,
            hasViewer: Boolean(viewerIdRef.current),
            hasPendingAttach: attachPromiseControllerRef.current.hasPending(),
          });
          if (reconnectAction.type === 'reject') {
            return Promise.resolve(false);
          }
          if (reconnectAction.type === 'alreadyConnected') {
            return Promise.resolve(true);
          }
          if (reconnectAction.type === 'joinPending') {
            return attachPromiseControllerRef.current.joinPending();
          }
          const attachPromise = attachPromiseControllerRef.current.start({
            timeoutMs: SHELL_RECONNECT_PROMISE_TIMEOUT_MS,
            setTimeout: window.setTimeout,
            onTimeout: () => {
              setIsConnecting(false);
            },
          });
          const startAction = deriveShellReconnectStartAction({
            shellId: shellIdRef.current,
            userDisconnectedShellId: userDisconnectedShellIdRef.current,
          });
          if (startAction.shouldClearUserDisconnectedShellId) {
            userDisconnectedShellIdRef.current = null;
          }
          intentionalDisconnectRef.current = startAction.intentionalDisconnect;
          setConnectionError(startAction.connectionError);
          setIsConnecting(startAction.isConnecting);
          if (startAction.shouldIncrementReconnectKey) {
            setReconnectKey((current) => current + 1);
          }
          return attachPromise;
        },
        sendInput(data: string) {
          return sendShellInput(data);
        },
        sendCommand(command: string) {
          const pendingCommand = {
            command,
            beforeSnapshot: shellSnapshotRef.current,
          };
          pendingCommandRef.current = pendingCommand;
          if (command.trim() === 'clear') {
            const sent = sendShellClear();
            if (!sent && pendingCommandRef.current === pendingCommand) {
              pendingCommandRef.current = null;
            }
            return sent;
          }
          const normalized = command.endsWith('\n') ? command : `${command}\n`;
          const sent = sendShellInput(normalized);
          if (!sent && pendingCommandRef.current === pendingCommand) {
            pendingCommandRef.current = null;
          }
          return sent;
        },
        sendControl(action) {
          if (action === 'clear') {
            return sendShellClear();
          }
          return sendShellInput(shellControlSequence(action));
        },
        async copyLastCommandOutput() {
          const output =
            lastCommandOutputRef.current.trim() ||
            getVisibleTerminalText(terminalHostNode);
          if (!output) {
            onFeedback?.('failed', 'Nothing to copy');
            return false;
          }

          try {
            await navigator.clipboard.writeText(output);
            onFeedback?.('done', 'Copied');
            return true;
          } catch {
            onFeedback?.('failed', 'Copy failed');
            return false;
          }
        },
        focus() {
          terminalRef.current?.focus();
        },
        refreshLayout(options) {
          refreshTerminalLayout(options);
        },
      }),
      [
        onFeedback,
        onShellUpdate,
        refreshTerminalLayout,
        sendShellClear,
        sendShellInput,
        setViewerId,
        settleAttachPromise,
        terminalHostNode,
        terminalReady,
        workspacePathMissing,
      ],
    );

    return (
      <div
        className={`relative min-h-0 flex-1 overflow-hidden ${
          isActive ? 'shell-pane-active' : ''
        }`}
        onMouseDown={onActivate}
        data-pane-id={paneId}
      >
        <div
          ref={setTerminalHostNode}
          className={`h-full w-full px-2 py-2 sm:px-3 sm:py-3 ${
            isMobileShell ? 'mobile-shell-direct' : ''
          }`}
          onClick={() => {
            onActivate();
            terminalRef.current?.focus();
          }}
        />
        {isActive && (
          <div className="pointer-events-none absolute right-2 top-2 rounded-md border border-sky-300/30 bg-sky-300/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-sky-100">
            Active
          </div>
        )}
      </div>
    );
  },
);
