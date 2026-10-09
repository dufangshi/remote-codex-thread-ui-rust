import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Check, Code2, Copy, Maximize2, Workflow } from 'lucide-react';
import { translate, useI18n } from '../../i18n';
import { GraphWorkspaceImageLightbox } from '../ZoomableImage';
import { renderChatMermaid } from './graphChatMermaid';

export const GraphChatMermaidDiagram = memo(function GraphChatMermaidDiagram({
  source, dark, pending = false,
}: { source: string; dark: boolean; pending?: boolean }) {
  useI18n();
  const [result, setResult] = useState<{ source: string; dark: boolean; svg?: string }>();
  const [showSource, setShowSource] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'copied' | 'failed'>();
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const expandButton = useRef<HTMLButtonElement>(null);
  const svg = result?.source === source && result.dark === dark ? result.svg : undefined;
  const failed = !pending && result?.source === source && result.dark === dark && !result.svg;

  useEffect(() => {
    if (pending) return;
    const controller = new AbortController();
    void renderChatMermaid(source, dark, controller.signal).then(
      svg => { if (!controller.signal.aborted) setResult({ source, dark, svg }); },
      () => { if (!controller.signal.aborted) setResult({ source, dark }); },
    );
    return () => controller.abort();
  }, [source, dark, pending]);

  useEffect(() => () => clearTimeout(copyTimer.current), []);
  const closeExpanded = useCallback(() => {
    setExpanded(false);
    expandButton.current?.focus();
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(source);
      setCopyStatus('copied');
    } catch { setCopyStatus('failed'); }
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyStatus(undefined), 1500);
  }

  return (
    <section className="thread-graph-mermaid not-prose" data-state={pending ? 'pending' : svg ? 'ready' : failed ? 'error' : 'loading'} data-theme={dark ? 'dark' : 'light'} aria-label={translate('chat.diagram')}>
      <div className="thread-graph-mermaid-toolbar">
        <span className="thread-graph-mermaid-label"><Workflow size={14} aria-hidden="true" />Mermaid</span>
        <div className="thread-graph-mermaid-actions">
          {svg && <button type="button" onClick={() => setShowSource(value => !value)} aria-label={translate(showSource ? 'chat.showDiagram' : 'chat.diagramSource')} title={translate(showSource ? 'chat.showDiagram' : 'chat.diagramSource')} aria-pressed={showSource}><Code2 size={16} /></button>}
          <button type="button" onClick={() => void copy()} aria-label={translate('chat.copyCode')} title={translate(copyStatus === 'copied' ? 'chat.copied' : copyStatus === 'failed' ? 'chat.copyFailed' : 'chat.copyCode')}>{copyStatus === 'copied' ? <Check size={16} /> : <Copy size={16} />}</button>
          {svg && <button ref={expandButton} type="button" onClick={() => setExpanded(true)} aria-label={translate('chat.expandDiagram')} title={translate('chat.expandDiagram')}><Maximize2 size={16} /></button>}
        </div>
      </div>
      {svg && !showSource ? (
        <div className="thread-graph-mermaid-canvas" role="img" aria-label={translate('chat.diagram')} dangerouslySetInnerHTML={{ __html: svg }} />
      ) : <pre className="thread-graph-mermaid-source"><code>{source}</code></pre>}
      {failed && <span className="thread-graph-mermaid-error">{translate('chat.diagramUnavailable')}</span>}
      {expanded && svg && <GraphWorkspaceImageLightbox alt={translate('chat.diagram')} backgroundColor={dark ? '#0f1419' : '#ffffff'} src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} onClose={closeExpanded} />}
    </section>
  );
});
