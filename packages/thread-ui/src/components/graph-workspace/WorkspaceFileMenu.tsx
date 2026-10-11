import { ClipboardCopy, Copy, Download, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { translate, useI18n } from '../../i18n';

/** An inline icon shelf inherits the viewer's theme and takes layout space. */
export function WorkspaceFileActions({ children, metadata, path, onDownload, onRefresh }: {
  children?: ReactNode;
  metadata?: string;
  path: string;
  onDownload?: () => void;
  onRefresh?: () => Promise<string>;
}) {
  useI18n();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setError(null); setFeedback(translate('files.copied')); }
    catch { setError(translate('files.couldNotCopyPath')); }
  };
  return <div className="workspace-file-actions" role="toolbar" aria-label={translate('files.fileActions')} title={metadata}>
    {children}
    {onRefresh && <button type="button" className="thread-graph-editor-toolbar-button" disabled={busy} title={translate('files.reloadFile')} aria-label={translate('files.reloadFile')} onClick={async () => {
      const current = generation.current;
      setBusy(true); setFeedback(null); setError(null);
      try { const result = await onRefresh(); if (current === generation.current) setFeedback(result); }
      catch (cause) { if (current === generation.current) setError(cause instanceof Error ? cause.message : translate('files.fileOperationFailed')); }
      finally { if (current === generation.current) setBusy(false); }
    }}><RefreshCw size={15} className={busy ? 'animate-spin motion-reduce:animate-none' : ''}/></button>}
    {onDownload && <button type="button" className="thread-graph-editor-toolbar-button" title={translate('files.downloadFile')} aria-label={translate('files.downloadFile')} onClick={onDownload}><Download size={15}/></button>}
    <button type="button" title={translate('files.copyFilePath')} aria-label={translate('files.copyFilePath')} onClick={() => void copy(path)}><ClipboardCopy size={15}/></button>
    <button type="button" title={translate('files.copyFileName')} aria-label={translate('files.copyFileName')} onClick={() => void copy(path.replace(/\\/g, '/').split('/').pop() ?? path)}><Copy size={15}/></button>
    {feedback && <span role="status" className="workspace-file-action-feedback" title={feedback}>{feedback}</span>}
    {error && <span role="alert" className="workspace-file-action-feedback is-error" title={error}>{error}</span>}
  </div>;
}
