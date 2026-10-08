import { useMemo } from 'react';

/** The hosting app serves the pinned official viewer locally, like 3Dmol. */
export const DRAWIO_VIEWER_PATH = '/vendor/drawio/viewer-static.v32.3.0.min.js';

export function drawioPreviewDocument(xml: string, origin: string) {
  const viewerUrl = new URL(DRAWIO_VIEWER_PATH, origin).href;
  // XML is data, never HTML or executable script. Escaping '<' also protects
  // script closing tags embedded in diagram labels or comments.
  const data = JSON.stringify(xml).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' ${viewerUrl}; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; base-uri 'none'; form-action 'none'">
<style>html,body{height:100%;margin:0;background:#fff;color:#222;font:14px system-ui;overflow:hidden}#diagram{position:absolute;inset:0;overflow:auto}#error{padding:20px;white-space:pre-wrap}button,select{font:inherit}</style>
<script>window.urlParams={offline:'1',math:'0'};window.mxLoadResources=false;window.mxLoadStylesheets=false;</script>
<script src="${viewerUrl}"></script></head><body><div id="diagram"></div><div id="error" role="alert" hidden></div>
<script>
try {
  var xml=${data};
  var doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.querySelector('parsererror') || !['mxfile','mxGraphModel'].includes(doc.documentElement.nodeName)) throw new Error('Invalid draw.io XML. Switch to source to inspect this file.');
  if(typeof GraphViewer==='undefined') throw new Error('The diagram viewer could not be loaded. Try refreshing this page.');
  document.getElementById('diagram').setAttribute('data-mxgraph',JSON.stringify({xml:xml,toolbar:'pages zoom layers','toolbar-nohide':true,'toolbar-position':'top',lightbox:false,editable:false,nav:true,center:true,resize:false,'auto-fit':true,'responsive-auto-fit':true,'allow-zoom-in':false,'browser-translate':false,target:'blank'}));
  GraphViewer.createViewerForElement(document.getElementById('diagram'));
} catch(error) {
  document.getElementById('diagram').hidden=true;
  var el=document.getElementById('error');el.hidden=false;el.textContent=error.message||'Unable to render this diagram. Switch to source to inspect this file.';
}
</script></body></html>`;
}

export function GraphDrawioPreview({ content, name, truncated }: { content: string; name: string; truncated: boolean }) {
  const srcDoc = useMemo(() => drawioPreviewDocument(content, typeof window === 'undefined' ? 'http://localhost' : window.location.origin), [content]);
  if (truncated) return <p role="status" className="p-5 text-sm">Diagram preview requires the complete file. Load the remaining content or download this file.</p>;
  return (
    <iframe
      title={`Draw.io preview: ${name}`}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      srcDoc={srcDoc}
      className="min-h-0 w-full flex-1 border-0"
      style={{ minHeight: 260, background: '#fff' }}
    />
  );
}
