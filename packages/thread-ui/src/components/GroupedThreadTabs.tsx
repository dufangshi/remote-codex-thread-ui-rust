import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import type { WorkbenchThread } from './MatterWorkbench';

export function groupThreads(threads: WorkbenchThread[]) {
  const keys = new Set(threads.map(t => t.key));
  const groups = threads.filter(t => !t.rootKey || t.rootKey === t.key || !keys.has(t.rootKey))
    .map(root => ({ root, children: threads.filter(t => t.key !== root.key && t.rootKey === root.key) }));
  return groups;
}

export function GroupedThreadTabs({ threads, currentKey, onNavigate }: {
  threads: WorkbenchThread[]; currentKey: string; onNavigate: (href: string) => void;
}) {
  const [menu, setMenu] = useState<{ key: string; left: number; top: number } | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const popup = useRef<HTMLDivElement>(null);
  useEffect(() => { setMenu(null); }, [currentKey]);
  useEffect(() => {
    if (!menu) return;
    const close = (event: PointerEvent) => {
      if (!popup.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setMenu(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenu(null); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    const resize = () => setMenu(null);
    window.addEventListener('resize', resize);
    popup.current?.querySelector<HTMLAnchorElement>('[aria-current="page"], a')?.focus();
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); window.removeEventListener('resize', resize); };
  }, [menu]);
  const groups = groupThreads(threads);
  const activeMenu = groups.find(group => group.root.key === menu?.key);
  return <>
    {groups.map(({ root, children }) => {
      const selected = children.find(child => child.key === currentKey);
      const active = root.key === currentKey || !!selected;
      return <div key={root.key} className="matter-thread-group" style={{ display: 'flex', flexShrink: 0, minWidth: 0 }}>
        <a className="matter-group-tab" href={root.href} aria-current={active ? 'page' : undefined}
          title={selected ? `${root.title} · ${selected.title}` : root.title}
          onClick={event => { event.preventDefault(); onNavigate(root.href); }}>
          <span className="matter-status-dot" role="img" aria-label={selected?.status ?? root.status} data-status={selected?.status ?? (children.some(child => child.status === 'running') ? 'running' : root.status)} />
          <span>{root.title}{selected ? ` · ${selected.title}` : ''}</span>
        </a>
        {children.length > 0 && <button className="matter-group-toggle" aria-label={`${root.title}: ${children.length} agent threads`}
          aria-expanded={menu?.key === root.key} aria-controls="matter-agent-threads" onClick={event => {
            const bounds = event.currentTarget.getBoundingClientRect(); trigger.current = event.currentTarget;
            setMenu(menu?.key === root.key ? null : { key: root.key, left: Math.max(8, Math.min(bounds.left, window.innerWidth - 296)), top: bounds.bottom + 4 });
          }}>{children.length}<ChevronDown size={12} /></button>}
      </div>;
    })}
    {menu && activeMenu && createPortal(<div ref={popup} id="matter-agent-threads" role="region" aria-label={`${activeMenu.root.title} agent threads`}
      style={{ position: 'fixed', left: menu.left, top: menu.top, zIndex: 1000, width: 'min(280px, calc(100vw - 16px))', maxHeight: 'min(420px, 65dvh)', overflowY: 'auto', background: 'var(--theme-surface)', color: 'var(--theme-fg)', border: '1px solid var(--theme-border)', borderRadius: 8, padding: 6, boxShadow: '0 8px 24px #0004' }}>
      {[activeMenu.root, ...activeMenu.children].map(thread => <a key={thread.key} href={thread.href}
        aria-current={thread.key === currentKey ? 'page' : undefined}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 4, background: thread.key === currentKey ? 'var(--theme-hover)' : undefined, color: 'inherit' }}
        onClick={event => { event.preventDefault(); setMenu(null); onNavigate(thread.href); }}>
        <span className="matter-status-dot" data-status={thread.status} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{thread.title}</span>
      </a>)}
    </div>, document.body)}
  </>;
}
