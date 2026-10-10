import { Download, MoreHorizontal, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { translate, useI18n } from '../../i18n';

/** Secondary file actions live outside the reading surface and clipped tab strip. */
export function WorkspaceFileMenu({ path, metadata, onDownload, onRefresh }: {
  path: string;
  metadata?: string;
  onDownload?: () => void;
  onRefresh?: () => Promise<string>;
}) {
  useI18n();
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    generation.current++;
    setPosition(null); setFeedback(null); setError(null); setBusy(false);
    return () => { generation.current++; };
  }, [path]);
  useEffect(() => {
    if (!position) return;
    const outside = (event: PointerEvent) => {
      if (!popup.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setPosition(null);
    };
    const escape = (event: KeyboardEvent) => { if (event.key==='Escape') { event.preventDefault(); event.stopPropagation(); close(); } };
    const resize = () => setPosition(null);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape, true);
    window.addEventListener('resize', resize);
    popup.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape, true); window.removeEventListener('resize', resize); };
  }, [position]);
  function close() { setPosition(null); trigger.current?.focus({ preventScroll: true }); }
  return <>
    <button ref={trigger} type="button" className="thread-graph-editor-toolbar-button workspace-file-more" aria-label={translate('files.fileActions')} title={translate('files.fileActions')} aria-haspopup="menu" aria-expanded={!!position} onClick={() => {
      const box = trigger.current!.getBoundingClientRect();
      setPosition(position ? null : { left: Math.max(8, Math.min(box.right - 240, innerWidth - 248)), top: Math.max(8, Math.min(box.bottom + 4, innerHeight - 240)) });
    }}><MoreHorizontal size={16} /></button>
    {position && createPortal(<div ref={popup} role="menu" aria-label={translate('files.fileActions')} className="thread-ui-shell workspace-node-menu workspace-file-menu" style={{ position:'fixed', ...position, zIndex:1000, width:240, maxWidth:'calc(100vw - 16px)', maxHeight:'calc(100dvh - 16px)', overflowY:'auto' }} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
      if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
        event.preventDefault();
        const buttons = [...(popup.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
        const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key==='Home' ? 0 : event.key==='End' ? buttons.length-1 : (current+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
        buttons[next]?.focus();
      }
    }}>
      <div className="workspace-file-menu-info"><span>{path}</span>{metadata && <small>{metadata}</small>}</div>
      {onDownload && <button type="button" role="menuitem" onClick={() => { onDownload(); close(); }}><Download size={15}/>{translate('files.downloadFile')}</button>}
      {onRefresh && <button type="button" role="menuitem" disabled={busy} onClick={async () => {
        const current = generation.current;
        setBusy(true); setFeedback(null); setError(null);
        try { const result = await onRefresh(); if (current===generation.current) setFeedback(result); }
        catch (cause) { if (current===generation.current) setError(cause instanceof Error ? cause.message : translate('files.fileOperationFailed')); }
        finally { if (current===generation.current) setBusy(false); }
      }}><RefreshCw size={15} className={busy ? 'animate-spin motion-reduce:animate-none' : ''}/>{translate('files.reloadFile')}</button>}
      {feedback && <p role="status" className="workspace-file-menu-feedback">{feedback}</p>}
      {error && <p role="alert" className="workspace-file-menu-feedback">{error}</p>}
    </div>, document.body)}
  </>;
}
