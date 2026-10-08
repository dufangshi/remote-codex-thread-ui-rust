import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Columns2, FolderOpen, Users, X, RotateCcw } from 'lucide-react';
import { translate as t, useI18n } from '../../i18n';
import type { WorkbenchPresentation } from './presentation';

export interface WorkbenchPanelsOptions {
  deviceLabel: string;
  workspaceLabel: string;
  primaryTitle: string;
  primaryStatus: string;
  primaryHarness: string;
  presentation: WorkbenchPresentation;
  onPresentationChange: (patch: Partial<WorkbenchPresentation>) => void;
  candidates: Array<{ id: string; title: string }>;
  referenceTitle?: string;
  referenceContent?: ReactNode;
  collaborationContent?: ReactNode;
  onMakePrimary: () => void;
  storageFailed?: boolean;
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
  const referenceTrigger = useRef<HTMLButtonElement>(null);
  const [compact, setCompact] = useState(() => window.innerWidth < 1000);
  const [mobileView, setMobileView] = useState<'primary' | 'reference'>(
    'primary',
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const previousMode = useRef(mode);
  useEffect(() => {
    if (previousMode.current !== mode) {
      previousMode.current = mode;
      if (mode !== 'focus') setMobileView('reference');
    }
  }, [mode]);
  const [filesVisited, setFilesVisited] = useState(mode === 'files');
  const drag = useRef<{ x: number; ratio: number; width: number } | null>(null);
  const [lastReveal, setLastReveal] = useState(revealExplorer);
  useEffect(() => {
    if (lastReveal !== revealExplorer) {
      setLastReveal(revealExplorer);
      if (revealExplorer > 0) {
        o.onPresentationChange({ mode: 'files', ratio: 35 });
        setMobileView('reference');
      }
    }
  }, [revealExplorer, lastReveal, o.onPresentationChange]);
  useEffect(() => {
    if (mode === 'files') setFilesVisited(true);
  }, [mode]);
  useEffect(() => {
    if (!root.current) return;
    const observer = new ResizeObserver((entries) =>
      setCompact(entries[0].contentRect.width < 800),
    );
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    setMobileView('primary');
    setPickerOpen(false);
  }, [o.primaryTitle]);
  const close = () => {
    o.onPresentationChange({ mode: 'focus' });
    setMobileView('primary');
    referenceTrigger.current?.focus();
  };
  const showReference = mode !== 'focus';
  // Phone panes are views, not route navigation. Back returns to the left conversation.
  useEffect(() => {
    if (!compact || mobileView !== 'reference' || mode === 'focus') return;
    const marker = `workbench-reference-${Date.now()}`;
    history.pushState({ ...history.state, workbenchReference: marker }, '');
    const back = () => setMobileView('primary');
    window.addEventListener('popstate', back);
    return () => {
      window.removeEventListener('popstate', back);
      if (history.state?.workbenchReference === marker) {
        const { workbenchReference: _, ...state } = history.state;
        history.replaceState(state, '');
      }
    };
  }, [compact, mobileView, showReference]);
  const selectMode = (next: 'thread' | 'files' | 'collaboration') => {
    // File mode includes both a tree and an editor; give its toolbar more room.
    o.onPresentationChange({ mode: next, ...(next === 'files' ? { ratio: 35 } : {}) });
    setPickerOpen(false);
    setMobileView('reference');
  };
  return (
    <div
      ref={root}
      className={`workbench-panels ${compact ? 'is-compact' : ''}`}
      data-testid="workbench-panels"
      data-mode={mode}
      style={{ '--primary-ratio': `${ratio}%` } as CSSProperties}
    >
      <header
        className="workbench-context"
        title={`${o.deviceLabel} / ${o.workspaceLabel}`}
      >
        <span className="workbench-source-device">{o.deviceLabel}</span>
        <span aria-hidden="true">/</span>
        <strong>{o.workspaceLabel}</strong>
        <label className="workbench-split-picker">
          <Columns2 size={15} aria-hidden="true" />
          <select
            aria-label={t('workbench.compareSession')}
            value={referenceId ?? ''}
            onChange={(event) => {
              if (event.target.value) {
                o.onPresentationChange({
                  referenceId: event.target.value,
                  mode: 'thread',
                });
                setMobileView('reference');
                setPickerOpen(false);
              }
            }}
          >
            <option value="">{t('workbench.splitSession')}</option>
            {o.candidates.map((thread) => (
              <option key={thread.id} value={thread.id}>
                {thread.title}
              </option>
            ))}
          </select>
        </label>
        <div className="workbench-reference-picker">
          <button
            ref={referenceTrigger}
            aria-expanded={pickerOpen}
            onClick={() => setPickerOpen((open) => !open)}
            data-testid="reference-picker"
          >
            <Columns2 size={15} />
            {t('workbench.referenceArea')}
          </button>
          {pickerOpen && (
            <div
              className="workbench-reference-menu"
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setPickerOpen(false);
                  referenceTrigger.current?.focus();
                }
              }}
            >
              <button onClick={() => selectMode('files')}>
                <FolderOpen size={15} />
                {t('workbench.referenceFiles')}
              </button>
              <button onClick={() => selectMode('collaboration')}>
                <Users size={15} />
                {t('workbench.collaboration')}
              </button>
              {referenceId && (
                <button onClick={() => selectMode('thread')}>
                  {t('workbench.restoreComparison')}
                </button>
              )}
              <button
                onClick={() => {
                  o.onPresentationChange({
                    ratio: 55,
                    mode: referenceId ? 'thread' : 'focus',
                  });
                  setPickerOpen(false);
                }}
              >
                <RotateCcw size={15} />
                {t('workbench.resetLayout')}
              </button>
            </div>
          )}
        </div>
      </header>
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
            onClick={() => setMobileView('primary')}
          >
            {o.primaryTitle}
          </button>
          <button
            aria-pressed={mobileView === 'reference'}
            onClick={() => setMobileView('reference')}
          >
            {mode === 'thread' ? o.referenceTitle : mode === 'files' ? t('workbench.referenceFiles') : t('workbench.collaboration')}
          </button>
        </nav>
      )}
      <div
        className={`workbench-pane-grid ${showReference ? 'has-reference' : ''}`}
      >
        <section
          className="workbench-primary matter-chat"
          data-testid="primary-pane"
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
          hidden={!showReference || (compact && mobileView !== 'reference')}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              close();
            }
          }}
        >
          <header className="workbench-pane-heading">
            <div>
              <strong>
                {mode === 'thread'
                  ? (o.referenceTitle ?? t('workbench.loadingThreadDetail'))
                  : mode === 'files'
                    ? t('workbench.referenceFiles')
                    : t('workbench.collaboration')}
              </strong>
            </div>
            {mode === 'thread' && (
              <button onClick={o.onMakePrimary} data-testid="make-primary">
                {t('workbench.makePrimary')}
              </button>
            )}
            <button
              onClick={close}
              aria-label={t('workbench.closeReference')}
              title={t('workbench.closeReferenceContinues')}
            >
              <X size={17} />
            </button>
          </header>
          <div className="workbench-pane-body" hidden={mode !== 'thread'}>
            {o.referenceContent}
          </div>
          {filesVisited && (
            <aside
              aria-label={t('workbench.explorer')}
              className="workbench-pane-body workbench-files"
              hidden={mode !== 'files'}
            >
              {explorer}
            </aside>
          )}
          <div
            className="workbench-pane-body workbench-collaboration"
            hidden={mode !== 'collaboration'}
          >
            {o.collaborationContent}
          </div>
        </section>
      </div>
    </div>
  );
}
