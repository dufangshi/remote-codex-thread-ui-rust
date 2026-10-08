import { useEffect, useState, useRef, type ReactNode, type CSSProperties } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  ChevronDown,
  ChevronRight,
  Home,
  FolderOpen,
  MessageSquare,
  PanelLeft,
  PanelRight,
  Search,
  SlidersHorizontal,
  Star,
  Terminal,
  X,
} from 'lucide-react';
import { WorkbenchContext } from './WorkbenchContext';
import { WorkbenchPath } from './WorkbenchPath';
import { GroupedThreadTabs, groupThreads, threadGroupActivity } from './GroupedThreadTabs';

export interface WorkbenchThread {
  key: string;
  title: string;
  subtitle: string;
  href: string;
  status: string;
  favorite: boolean;
  parentKey?: string;
  rootKey?: string;
}
export interface WorkbenchNotification {
  id: string;
  title: string;
  href: string;
  occurredAt: string;
  summary?: string;
}
export interface MatterWorkbenchOptions {
  statusActions?: ReactNode;
  emptyWorkspace?: boolean;
  navigationReady?: boolean;
  harnessSessionId?: string | null;
  harnessSessionUrl?: string | null;
  threads: WorkbenchThread[];
  workspaceThreads?: WorkbenchThread[];
  currentKey: string;
  favorite: boolean;
  favoriteBusy?: boolean;
  error?: string | null;
  workspacePath: string;
  activeView: 'chat' | 'shell';
  terminalEnabled: boolean;
  onViewChange: (view: 'chat' | 'shell') => void;
  onToggleFavorite: () => void;
  onNavigate: (href: string) => void;
  onSearch: () => void;
  search?: ReactNode;
  searchOpen?: boolean;
  notifications: WorkbenchNotification[];
  unreadCount: number;
  onReadNotifications: () => void;
  renderThreadMenu?: (thread: WorkbenchThread) => ReactNode;
}

export function MatterWorkbench({
  options: o,
  title,
  homeHref,
  settings,
  newThread,
  actions,
  threadMenu,
  connection,
  deviceMonitor,
  explorer,
  revealExplorer,
  children,
}: {
  options: MatterWorkbenchOptions;
  title: string;
  homeHref: string;
  settings: ReactNode;
  newThread: ReactNode;
  actions: ReactNode;
  threadMenu: ReactNode;
  connection: ReactNode;
  deviceMonitor?: ReactNode;
  explorer: ReactNode;
  revealExplorer: number;
  children: ReactNode;
}) {
  const tabs = o.workspaceThreads ?? o.threads.filter(thread => thread.key === o.currentKey);
  const tabsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    tabsRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [o.currentKey, tabs.length]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [mobile, setMobile] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 639px)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(max-width: 639px)');
    const change = () => setMobile(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  const [shortcutsOpen, setShortcutsOpen] = useState(true);
  const [recentsOpen, setRecentsOpen] = useState(true);
  const [bellOpen, setBellOpen] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [explorerWidth, setExplorerWidth] = useState(() => {
    try { return Math.max(260, Math.min(800, Number(localStorage.getItem('remote-codex.explorer-width')) || 360)); } catch { return 360; }
  });
  const contentRef = useRef<HTMLDivElement>(null);
  const resizeOrigin = useRef<{ x: number; width: number } | null>(null);
  const resizeExplorer = (width: number) => {
    const max = Math.max(260, (contentRef.current?.clientWidth ?? 1000) - 320);
    const next = Math.round(Math.max(260, Math.min(max, width)));
    setExplorerWidth(next);
    try { localStorage.setItem('remote-codex.explorer-width', String(next)); } catch { /* Optional preference. */ }
  };
  const [lastReveal, setLastReveal] = useState(revealExplorer);
  if (lastReveal !== revealExplorer) {
    setLastReveal(revealExplorer);
    if (revealExplorer > 0) setExplorerOpen(true);
  }
  const navigate = (href: string) => {
    setSidebarOpen(false);
    setBellOpen(false);
    o.onNavigate(href);
  };
  const renderThread = (thread: WorkbenchThread, activity = threadGroupActivity(thread)) => (
    <div key={thread.key} className="matter-thread-entry">
    <a
      href={thread.href}
      onClick={(e) => {
        e.preventDefault();
        navigate(thread.href);
      }}
      className="matter-thread-row"
      aria-current={thread.key === o.currentKey ? 'page' : undefined}
      title={`${thread.title}\n${thread.subtitle} · ${activity.label}`}
    >
      <span
        className="matter-status-dot"
        data-status={activity.status}
        role="img"
        aria-label={activity.label}
      />
      <span className="matter-thread-copy">
        <span>{thread.title}</span>
        <small>{thread.subtitle}</small>
      </span>
    </a>
    {o.renderThreadMenu?.(thread)}
    </div>
  );
  const renderThreadGroups = (threads: WorkbenchThread[]) => groupThreads(threads).map(({ root, children }) => (
    <div key={root.key}>
      {renderThread(root, threadGroupActivity(root, children))}
      {children.length > 0 && <details open={children.some(child => child.key === o.currentKey) || undefined} style={{ margin: '0 0 6px 14px' }}>
        <summary style={{ padding: '4px 8px', fontSize: 12, cursor: 'pointer', color: 'var(--theme-fg-soft)' }}>{children.length} agent threads</summary>
        {children.map(child => renderThread(child))}
      </details>}
    </div>
  ));
  return (
    <div
      className={`matter-workbench ${sidebarHidden ? 'is-sidebar-hidden' : ''}`}
      onClick={(e) => {
        if (
          e.target instanceof Element &&
          !e.target.closest('.matter-thread-menu')
        ) {
          e.currentTarget
            .querySelector('.matter-thread-menu[open]')
            ?.removeAttribute('open');
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setBellOpen(false);
          setSidebarOpen(false);
          e.currentTarget
            .querySelector('.matter-thread-menu[open]')
            ?.removeAttribute('open');
        }
      }}
    >
      {!mobile && <nav className="matter-rail" aria-label="Workspace tools">
        <a
          className="matter-brand"
          href={homeHref}
          aria-label="Remote Codex home"
        >
          r<span>c</span>
        </a>
        <button
          aria-label="Chat"
          aria-pressed={o.activeView === 'chat'}
          onClick={() => o.onViewChange('chat')}
        >
          <MessageSquare />
        </button>
        {o.terminalEnabled && (
          <button
            aria-label="Terminal"
            aria-pressed={o.activeView === 'shell'}
            onClick={() => o.onViewChange('shell')}
          >
            <Terminal />
          </button>
        )}
        <button aria-label="Toggle Explorer" aria-pressed={explorerOpen} aria-expanded={explorerOpen}
          title="Explorer" onClick={() => setExplorerOpen(open => !open)}><FolderOpen /></button>
        <div className="matter-rail-bottom">{deviceMonitor}{settings}</div>
      </nav>}
      <header className={`matter-topbar ${o.searchOpen ? 'is-search-open' : ''}`}>
        <button
          aria-label="Toggle shortcuts sidebar"
          aria-expanded={mobile ? sidebarOpen : !sidebarHidden}
          onClick={() => {
            if (mobile) setSidebarOpen(!sidebarOpen);
            else setSidebarHidden(!sidebarHidden);
          }}
        >
          <PanelLeft />
        </button>
        <span className="matter-topbar-brand">Remote Codex</span>
        <span className="matter-topbar-separator" />
        <button aria-label="Go back" onClick={() => history.back()}>
          <ArrowLeft />
        </button>
        <button aria-label="Go forward" onClick={() => history.forward()}>
          <ArrowRight />
        </button>
        <a href={homeHref} aria-label="Back to workspaces" title="Workspaces">
          <Home />
        </a>
        <div className="matter-topbar-search">{o.search ?? <button
          className="matter-search-trigger"
          aria-label="Search conversation"
          disabled={o.emptyWorkspace}
          onClick={o.onSearch}
        >
          <Search />
          <span>Search conversation</span>
        </button>}</div>
        <div className="matter-topbar-end">
          {mobile && deviceMonitor}
          {mobile && <>
            <button aria-label="Chat" aria-pressed={o.activeView === 'chat'} onClick={() => o.onViewChange('chat')}><MessageSquare /></button>
            {o.terminalEnabled && <button aria-label="Terminal" aria-pressed={o.activeView === 'shell'} onClick={() => o.onViewChange('shell')}><Terminal /></button>}
            {settings}
          </>}
          <div className="matter-connection">{connection}</div>
          <button
            aria-label="Notifications"
            aria-expanded={bellOpen}
            onClick={() => {
              setBellOpen(!bellOpen);
              o.onReadNotifications();
            }}
          >
            <Bell />
            {o.unreadCount > 0 && <span className="matter-unread" />}
          </button>
        </div>
      </header>
      {sidebarOpen && (
        <button
          className="matter-sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`matter-sidebar ${sidebarOpen ? 'is-open' : ''}`}
        aria-label="Thread navigation"
      >
        <div className="matter-sidebar-heading">
          <span>Workspace</span>
          <button className="matter-mobile-close" aria-label="Open Explorer" onClick={() => {setExplorerOpen(true);setSidebarOpen(false);}}><FolderOpen /></button>
          <button
            className="matter-mobile-close"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
          >
            <X />
          </button>
        </div>
        {o.error && (
          <p className="matter-sidebar-error" role="alert">
            {o.error}
          </p>
        )}
        <button
          className="matter-section-heading"
          aria-expanded={shortcutsOpen}
          onClick={() => setShortcutsOpen(!shortcutsOpen)}
        >
          {shortcutsOpen ? <ChevronDown /> : <ChevronRight />}
          <span>Shortcuts</span>
          <Star />
        </button>
        {shortcutsOpen && (
          <div className="matter-thread-section" data-testid="shortcuts">
            {o.threads.filter((t) => t.favorite).map(thread => renderThread(
              thread, threadGroupActivity(thread, o.threads.filter(child => child.rootKey === thread.key && child.key !== thread.key)),
            ))}
            {!o.threads.some((t) => t.favorite) && (
              <p className="matter-sidebar-hint">
                Star a thread to keep it close.
                <br />
                Across workspaces and devices.
              </p>
            )}
          </div>
        )}
        <button
          className="matter-section-heading"
          aria-expanded={recentsOpen}
          onClick={() => setRecentsOpen(!recentsOpen)}
        >
          {recentsOpen ? <ChevronDown /> : <ChevronRight />}
          <span>Recent chats</span>
          <span className="matter-section-count" title={`${o.threads.length} conversations, ${groupThreads(o.threads).length} groups`}>{groupThreads(o.threads).length}</span>
        </button>
        {recentsOpen && (
          <div className="matter-thread-section" data-testid="recent-chats">
            {renderThreadGroups(o.threads)}
          </div>
        )}
        <div className="matter-sidebar-footer">
          Your conversations, together.
        </div>
      </aside>
      <main className="matter-main">
        <div className="matter-tabs-row">
        <nav ref={tabsRef} className="matter-thread-tabs" aria-label="Workspace threads">
          <GroupedThreadTabs threads={tabs} currentKey={o.currentKey} onNavigate={navigate} />
          {newThread}
        </nav>
        {!o.emptyWorkspace && <button className="matter-toolbar-toggle" aria-label="Thread tools" aria-expanded={toolbarOpen} aria-controls="matter-thread-tools" onClick={() => setToolbarOpen(open => !open)} title={toolbarOpen ? 'Hide thread tools' : 'Show thread tools'}><SlidersHorizontal /></button>}
        {o.statusActions}
        {toolbarOpen && <div className="matter-breadcrumb" id="matter-thread-tools">
          <WorkbenchPath path={o.workspacePath} />
          <ChevronRight />
          <span className="matter-current-title" title={title}>
            {title}
          </span>
          <button
            aria-label={o.favorite ? 'Remove shortcut' : 'Add shortcut'}
            aria-pressed={o.favorite}
            disabled={o.favoriteBusy}
            onClick={o.onToggleFavorite}
          >
            <Star fill={o.favorite ? 'currentColor' : 'none'} />
          </button>
          <div className="matter-thread-actions">
            {actions}
            {threadMenu}
            <button
              aria-label="Toggle Explorer"
              aria-expanded={explorerOpen}
              onClick={() => setExplorerOpen(!explorerOpen)}
            >
              <PanelRight />
            </button>
          </div>
        </div>}
        </div>
        <div ref={contentRef} style={{ '--explorer-width': `${explorerWidth}px` } as CSSProperties} className={`matter-content ${explorerOpen ? 'has-explorer' : ''}`}>
          <div className="matter-chat">
            <WorkbenchContext.Provider value={true}>
              {children}
            </WorkbenchContext.Provider>
          </div>
          {explorerOpen && (
            <aside className="matter-explorer" aria-label="Explorer">
              {!mobile && <div role="separator" aria-label="Resize Explorer" aria-orientation="vertical" aria-valuemin={260} aria-valuemax={Math.max(260, (contentRef.current?.clientWidth ?? 1000) - 320)} aria-valuenow={explorerWidth} tabIndex={0} className="matter-explorer-resize"
                onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); resizeOrigin.current = { x: e.clientX, width: explorerWidth }; }}
                onPointerMove={e => { if (resizeOrigin.current) resizeExplorer(resizeOrigin.current.width + resizeOrigin.current.x - e.clientX); }}
                onPointerUp={e => { resizeOrigin.current = null; e.currentTarget.releasePointerCapture(e.pointerId); }}
                onLostPointerCapture={() => { resizeOrigin.current = null; }}
                onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); resizeExplorer(explorerWidth + (e.key === 'ArrowLeft' ? 24 : -24)); } }}
              />}
              <div className="matter-explorer-heading">
                Explorer
                <button
                  aria-label="Close Explorer"
                  onClick={() => setExplorerOpen(false)}
                >
                  <X />
                </button>
              </div>
              {explorer}
            </aside>
          )}
        </div>
      </main>
      {bellOpen && (
        <>
          <button
            className="matter-popover-scrim"
            aria-label="Close notifications"
            onClick={() => setBellOpen(false)}
          />
          <section
            className="matter-notifications"
            aria-label="Notifications"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setBellOpen(false);
            }}
          >
            <div className="matter-notifications-heading">
              Notifications
              <button
                aria-label="Close notification panel"
                onClick={() => setBellOpen(false)}
              >
                <X />
              </button>
            </div>
            {o.notifications.length ? (
              [...o.notifications].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)).slice(0, 10).map((n) => (
                <a
                  key={n.id}
                  href={n.href}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(n.href);
                  }}
                >
                  <span className="matter-status-dot" data-status="completed" />
                  <span>
                    {n.title}
                    {n.summary && <p className="matter-notification-summary">{n.summary}</p>}
                    <small>{new Date(n.occurredAt).toLocaleString()}</small>
                  </span>
                </a>
              ))
            ) : (
              <p>All caught up. Completed threads will appear here.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
