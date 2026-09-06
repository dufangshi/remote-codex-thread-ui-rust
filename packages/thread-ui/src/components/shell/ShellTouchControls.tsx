import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, MessageSquare, PanelsTopLeft, Pencil, Trash2, Plus } from 'lucide-react';
import type { ShellSessionDto } from '@remote-codex/shared';

// Retain the PTY canvas dimensions while the IME overlays it. Only the key bar
// follows visualViewport; a keyboard resize must not reflow terminal output.
export function useShellKeyboardLayout(visible: boolean, mobile: boolean) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ height: 0, inset: 0 });
  useEffect(() => {
    const panel = panelRef.current;
    if (!visible || !mobile || !panel) { setLayout({ height: 0, inset: 0 }); return; }
    let restingHeight = panel.getBoundingClientRect().height;
    let restingBottom = panel.getBoundingClientRect().bottom;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const viewport = window.visualViewport;
        const visibleBottom = (viewport?.height ?? window.innerHeight) + (viewport?.offsetTop ?? 0);
        const focused = panel.contains(document.activeElement) && document.activeElement?.matches('input, textarea');
        const inset = Math.max(0, restingBottom - visibleBottom);
        if (focused && inset > 80 && (viewport?.scale ?? 1) === 1) {
          setLayout({ height: restingHeight, inset });
        } else {
          setLayout({ height: 0, inset: 0 });
          // Measure after removing the frozen size, including orientation changes.
          frame = requestAnimationFrame(() => {
            restingHeight = panel.getBoundingClientRect().height;
            restingBottom = panel.getBoundingClientRect().bottom;
          });
        }
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(panel);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    panel.addEventListener('focusin', update);
    panel.addEventListener('focusout', update);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      panel.removeEventListener('focusin', update); panel.removeEventListener('focusout', update);
    };
  }, [visible, mobile]);
  return { panelRef, layout };
}

export function ShellTouchControls({ inset, enabled, ctrl, onCtrl, onInput, onFocus, onChat, onRename, onKill, sessions, activeId, onSelect, onCreate, busy }: {
  inset: number; enabled: boolean; ctrl: boolean; onCtrl: () => void;
  onInput: (data: string) => void; onFocus: () => void; onChat?: (() => void) | undefined;
  onRename: (shell: ShellSessionDto, label: string) => Promise<void>;
  onKill: (id: string) => Promise<void>; sessions: ShellSessionDto[];
  activeId: string | undefined; onSelect: (shell: ShellSessionDto) => void;
  onCreate: () => void; busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function rename(shell: ShellSessionDto) {
    setSaving(true); setError(null);
    try { await onRename(shell, name.trim()); setEditing(null); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to rename shell.'); }
    finally { setSaving(false); }
  }
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!host.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); onFocus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape, true);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape, true); };
  }, [open, onFocus]);
  const keys = [
    ['Esc', '\x1b'], ['Tab', '\t'], ['↑', '\x1b[A'], ['↓', '\x1b[B'],
    ['←', '\x1b[D'], ['→', '\x1b[C'],
  ] as const;
  const icons = { '↑': ArrowUp, '↓': ArrowDown, '←': ArrowLeft, '→': ArrowRight };
  return <div ref={host} className="shell-touch-controls" style={{ transform: `translateY(-${inset}px)` }} role="toolbar" aria-label="Terminal controls">
    {onChat && <button type="button" aria-label="Back to chat" onClick={onChat}><MessageSquare size={17} /></button>}
    <button type="button" aria-label="Control modifier" aria-pressed={ctrl} disabled={!enabled} onPointerDown={e => e.preventDefault()} onClick={() => { onCtrl(); onFocus(); }}>Ctrl</button>
    {keys.map(([label, data]) => {
      const Icon = icons[label as keyof typeof icons];
      return <button key={label} type="button" aria-label={`Terminal ${label}`} disabled={!enabled} onPointerDown={e => e.preventDefault()} onClick={() => { onInput(data); onFocus(); }}>{Icon ? <Icon size={17} /> : label}</button>;
    })}
    <button type="button" aria-label="Switch terminal session" aria-expanded={open} onPointerDown={e => e.preventDefault()} onClick={() => setOpen(v => !v)}><PanelsTopLeft size={18} /></button>
    {open && <div className="shell-session-popover" role="dialog" aria-label="Terminal sessions">
      {error && <p role="alert" className="px-2 text-xs text-red-500">{error}</p>}
      {sessions.map((shell, index) => {
        const label = shell.label || `Shell ${index + 1}`;
        return <div key={shell.id} className="shell-session-row" data-shell-id={shell.id}>
          {editing === shell.id ? <form onSubmit={event => { event.preventDefault(); void rename(shell); }}>
            <input aria-label="Shell name" autoFocus value={name} onChange={event => setName(event.target.value)} />
            <button type="submit" disabled={saving}>Save</button>
            <button type="button" onClick={() => setEditing(null)}>Cancel</button>
          </form> : <>
            <button className="shell-session-select" type="button" aria-pressed={shell.id === activeId} onPointerDown={e => e.preventDefault()} onClick={() => { onSelect(shell); setOpen(false); onFocus(); }}>{label}{shell.id === activeId ? ' •' : ''}</button>
            <button type="button" aria-label={`Rename ${label}`} title="Rename shell" disabled={busy} onClick={() => { setEditing(shell.id); setName(label); setError(null); }}><Pencil size={16} /></button>
            <button type="button" aria-label={`Kill ${label}`} title="Kill shell process" disabled={busy} onPointerDown={e => e.preventDefault()} onClick={() => void onKill(shell.id)}><Trash2 size={16} /></button>
          </>}
        </div>;
      })}
      <button type="button" disabled={busy} onPointerDown={e => e.preventDefault()} onClick={() => { onCreate(); setOpen(false); }}><Plus size={16} /> New shell</button>
    </div>}
  </div>;
}
