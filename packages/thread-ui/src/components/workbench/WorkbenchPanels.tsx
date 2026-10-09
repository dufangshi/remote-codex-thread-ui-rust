import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { FolderOpen, X } from 'lucide-react';
import { translate as t, useI18n } from '../../i18n';
import type { WorkbenchPresentation } from './presentation';

export interface WorkbenchPanelsOptions {
  deviceLabel: string;
  workspaceLabel: string;
  primaryTitle: string;
  primaryStatus: string;
  primaryHarness: string;
  presentation: WorkbenchPresentation;
  onPresentationChange: (
    patch: Partial<WorkbenchPresentation>,
  ) => boolean | void;
  candidates: Array<{ id: string; title: string }>;
  referenceTitle?: string;
  referenceContent?: ReactNode;
  collaborationContent?: ReactNode;
  onMakePrimary: () => void;
  storageFailed?: boolean;
  focusedPane?: 'primary' | 'reference';
  onFocusPane?: (pane: 'primary' | 'reference') => boolean | void;
  toolContent?: ReactNode;
  toolTitle?: string;
  toolsTargetLabel?: string;
  toolsOpen?: boolean;
  onCloseTools?: () => void;
}
export function WorkbenchPanels({
  options: o,
  children,
  explorer,
  revealExplorer,
}: {
  options: WorkbenchPanelsOptions;
  children: ReactNode;
  explorer: ReactNode;
  revealExplorer: number;
}) {
  useI18n();
  const { mode, referenceId, ratio } = o.presentation;
  const root = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(() => window.innerWidth < 1000);
  const [mobileView, setMobileView] = useState<'primary' | 'reference'>(
    'primary',
  );
  const previousMode = useRef(mode);
  useEffect(() => {
    if (previousMode.current !== mode) {
      const before = previousMode.current;
      previousMode.current = mode;
      if (mode === 'collaboration') setMobileView('reference');
      else if (
        mode === 'thread' &&
        before === 'focus' &&
        (!compact || o.onFocusPane?.('reference') !== false)
      )
        setMobileView('reference');
    }
  }, [mode, compact, o.onFocusPane]);
  const [filesVisited, setFilesVisited] = useState(mode === 'files');
  const drag = useRef<{ x: number; ratio: number; width: number } | null>(null);
  const [drawerWidth, setDrawerWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem('remote-codex.explorer-width'));
      return Number.isFinite(saved) && saved > 0 ? Math.max(360, saved) : 560;
    } catch { return 560; }
  });
  const [rootWidth, setRootWidth] = useState(window.innerWidth);
  const drawerDrag = useRef<{ x: number; width: number } | null>(null);
  const visibleDrawerWidth = Math.min(drawerWidth, Math.max(360, rootWidth - 280));
  const resizeDrawer = (width: number) => {
    const next = Math.round(Math.max(360, Math.min(Math.max(360, rootWidth - 280), width)));
    setDrawerWidth(next);
    try { localStorage.setItem('remote-codex.explorer-width', String(next)); } catch { /* Optional preference. */ }
  };
  const drawerResizeHandle = () => !compact && (
    <div
      role="separator"
      tabIndex={0}
      aria-label={t('workbench.resizeExplorer')}
      aria-orientation="vertical"
      aria-valuemin={360}
      aria-valuemax={Math.max(360, rootWidth - 280)}
      aria-valuenow={visibleDrawerWidth}
      className="workbench-tool-resize"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        drawerDrag.current = { x: event.clientX, width: visibleDrawerWidth };
      }}
      onPointerMove={(event) => {
        if (drawerDrag.current) resizeDrawer(drawerDrag.current.width + drawerDrag.current.x - event.clientX);
      }}
      onPointerUp={(event) => {
        drawerDrag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { drawerDrag.current = null; }}
      onLostPointerCapture={() => { drawerDrag.current = null; }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          resizeDrawer(visibleDrawerWidth + (event.key === 'ArrowLeft' ? 24 : -24));
        }
      }}
    />
  );
  const [lastReveal, setLastReveal] = useState(revealExplorer);
  useEffect(() => {
    if (lastReveal !== revealExplorer) {
      setLastReveal(revealExplorer);
      if (revealExplorer > 0) {
        o.onPresentationChange({ mode: 'files' });
      }
    }
  }, [revealExplorer, lastReveal, o.onPresentationChange]);
  useEffect(() => {
    if (mode === 'files') setFilesVisited(true);
  }, [mode]);
  useEffect(() => {
    if (!root.current) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      setCompact(width < 800);
      setRootWidth(width);
    });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    setMobileView('primary');
  }, [o.primaryTitle]);
  const close = () => {
    if (o.onPresentationChange({ mode: 'focus' }) === false) return;
    setMobileView('primary');
  };
  const showThread =
    Boolean(referenceId) && (mode === 'thread' || mode === 'files');
  const showReference = showThread || mode === 'collaboration';
  const closeFiles = () =>
    o.onPresentationChange({ mode: referenceId ? 'thread' : 'focus' });
  const historyHandlers = useRef({
    onFocusPane: o.onFocusPane,
    onPresentationChange: o.onPresentationChange,
    onCloseTools: o.onCloseTools,
  });
  historyHandlers.current = {
    onFocusPane: o.onFocusPane,
    onPresentationChange: o.onPresentationChange,
    onCloseTools: o.onCloseTools,
  };
  // Phone panes are views, not route navigation. Back returns to the left conversation.
  useEffect(() => {
    const drawerOpen = mode === 'files' || o.toolsOpen;
    if (
      !compact ||
      (!drawerOpen && (!showReference || mobileView !== 'reference'))
    )
      return;
    const marker = `workbench-reference-${Date.now()}`;
    history.pushState({ ...history.state, workbenchReference: marker }, '');
    const back = () => {
      const handlers = historyHandlers.current;
      if (o.toolsOpen) handlers.onCloseTools?.();
      else if (mode === 'files')
        handlers.onPresentationChange({
          mode: referenceId ? 'thread' : 'focus',
        });
      else {
        if (handlers.onFocusPane?.('primary') === false) {
          history.pushState(
            { ...history.state, workbenchReference: marker },
            '',
          );
          return;
        }
        setMobileView('primary');
      }
    };
    window.addEventListener('popstate', back);
    return () => {
      window.removeEventListener('popstate', back);
      if (history.state?.workbenchReference === marker) {
        const { workbenchReference: _, ...state } = history.state;
        history.replaceState(state, '');
      }
    };
  }, [compact, mobileView, showReference, mode, referenceId, o.toolsOpen]);
  return (
    <div
      ref={root}
      className={`workbench-panels ${compact ? 'is-compact' : ''}`}
      data-testid="workbench-panels"
      data-mode={mode}
      style={{ '--primary-ratio': `${ratio}%`, '--workbench-tool-width': `${visibleDrawerWidth}px` } as CSSProperties}
    >
      {o.storageFailed && (
        <p role="status" className="workbench-persistence-notice">
          {t('workbench.layoutSessionOnly')}
        </p>
      )}
      {compact && showReference && (
        <nav
          className="workbench-mobile-views"
          aria-label={t('workbench.panelViews')}
        >
          <button
            aria-pressed={mobileView === 'primary'}
            onClick={() => {
              if (o.onFocusPane?.('primary') !== false)
                setMobileView('primary');
            }}
          >
            {o.primaryTitle}
          </button>
          <button
            aria-pressed={mobileView === 'reference'}
            onClick={() => {
              if (!showThread || o.onFocusPane?.('reference') !== false)
                setMobileView('reference');
            }}
          >
            {showThread ? o.referenceTitle : t('workbench.collaboration')}
          </button>
        </nav>
      )}
      <div className="workbench-content">
      <div
        className={`workbench-pane-grid ${showReference ? 'has-reference' : ''}`}
      >
        <section
          className="workbench-primary matter-chat"
          data-testid="primary-pane"
          data-focused={o.focusedPane === 'primary'}
          onPointerDownCapture={(event) => {
            if (o.onFocusPane?.('primary') === false)
              event.preventDefault();
          }}
          onFocusCapture={(event) => {
            if (o.onFocusPane?.('primary') === false)
              (event.relatedTarget as HTMLElement | null)?.focus();
          }}
          hidden={compact && showReference && mobileView !== 'primary'}
        >
          <div className="workbench-pane-body">{children}</div>
        </section>
        {showReference && (
          <div
            role="separator"
            tabIndex={compact ? -1 : 0}
            aria-label={t('workbench.resizeComparison')}
            aria-orientation="vertical"
            aria-valuemin={35}
            aria-valuemax={65}
            aria-valuenow={ratio}
            className="workbench-pane-resize"
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = {
                x: e.clientX,
                ratio,
                width: root.current?.clientWidth ?? 1000,
              };
            }}
            onPointerMove={(e) => {
              if (drag.current)
                o.onPresentationChange({
                  ratio: Math.max(
                    35,
                    Math.min(
                      65,
                      drag.current.ratio +
                        ((e.clientX - drag.current.x) / drag.current.width) *
                          100,
                    ),
                  ),
                });
            }}
            onPointerUp={(e) => {
              drag.current = null;
              e.currentTarget.releasePointerCapture(e.pointerId);
            }}
            onLostPointerCapture={() => {
              drag.current = null;
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                o.onPresentationChange({
                  ratio: Math.max(
                    35,
                    Math.min(65, ratio + (e.key === 'ArrowLeft' ? -5 : 5)),
                  ),
                });
              }
            }}
          />
        )}
        <section
          className="workbench-reference"
          data-testid="reference-pane"
          data-focused={o.focusedPane === 'reference'}
          onPointerDownCapture={(event) => {
            if (showThread && o.onFocusPane?.('reference') === false)
              event.preventDefault();
          }}
          onFocusCapture={(event) => {
            if (showThread && o.onFocusPane?.('reference') === false)
              (event.relatedTarget as HTMLElement | null)?.focus();
          }}
          hidden={!showReference || (compact && mobileView !== 'reference')}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !e.defaultPrevented) {
              e.preventDefault();
              close();
            }
          }}
        >
          <header className="workbench-pane-heading">
            <div>
              <strong>
                {showThread
                  ? (o.referenceTitle ?? t('workbench.loadingThreadDetail'))
                  : t('workbench.collaboration')}
              </strong>
            </div>
            {mode !== 'files' && (
              <button
                aria-label={t('workbench.referenceFiles')}
                title={t('workbench.referenceFiles')}
                onClick={() => o.onPresentationChange({ mode: 'files' })}
              >
                <FolderOpen size={16} />
              </button>
            )}
            {showThread && (
              <button onClick={o.onMakePrimary} data-testid="make-primary">
                {t('workbench.makePrimary')}
              </button>
            )}
            <button
              onClick={close}
              aria-label={t('workbench.closeSplit')}
              title={t('workbench.closeSplitContinues')}
            >
              <X size={17} />
            </button>
          </header>
          <div className="workbench-pane-body" hidden={!showThread}>
            {o.referenceContent}
          </div>
          <div
            className="workbench-pane-body workbench-collaboration"
            hidden={mode !== 'collaboration'}
          >
            {o.collaborationContent}
          </div>
        </section>
      </div>
      {filesVisited && (
        <aside
          role="region"
          aria-label={t('workbench.referenceFiles')}
          className="workbench-tool-drawer"
          hidden={mode !== 'files' || Boolean(o.toolsOpen && o.toolContent)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !event.defaultPrevented) {
              event.preventDefault();
              event.stopPropagation();
              closeFiles();
            }
          }}
        >
          {drawerResizeHandle()}
          <header>
            <div>
              <strong>{t('workbench.referenceFiles')}</strong>
              {o.toolsTargetLabel && <small>{o.toolsTargetLabel}</small>}
            </div>
            <button
              data-testid="workbench-close-files"
              aria-label={t('workbench.closeFiles')}
              onClick={closeFiles}
            >
              <X size={17} />
            </button>
          </header>
          <div className="workbench-pane-body workbench-files">{explorer}</div>
        </aside>
      )}
      {o.toolContent && (
        <aside
          role="region"
          aria-label={o.toolTitle ?? t('workbench.terminal')}
          className="workbench-tool-drawer"
          hidden={!o.toolsOpen}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !event.defaultPrevented) {
              event.preventDefault();
              event.stopPropagation();
              o.onCloseTools?.();
            }
          }}
        >
          {drawerResizeHandle()}
          <header>
            <div>
              <strong>{o.toolTitle ?? t('workbench.terminal')}</strong>
              {o.toolsTargetLabel && <small>{o.toolsTargetLabel}</small>}
            </div>
            <button
              data-testid="workbench-close-tools"
              aria-label={t('workbench.closeTools')}
              onClick={o.onCloseTools}
            >
              <X size={17} />
            </button>
          </header>
          <div className="workbench-pane-body">{o.toolContent}</div>
        </aside>
      )}
      </div>
    </div>
  );
}
