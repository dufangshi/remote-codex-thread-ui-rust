import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function WorkspaceFileLink({path, line, children, onOpen, className = 'thread-inline-link'}: {
  path: string; line?: number | undefined; children: ReactNode;
  onOpen: (input: {path: string; line?: number}) => void; className?: string;
}) {
  const [menu, setMenu] = useState<{x: number; y: number} | null>(null);
  const [copyError, setCopyError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const displayPath = path.startsWith('/') || /^[a-z]:/i.test(path) ? path : `./${path.replace(/^\.\//, '')}`;
  const address = displayPath + (line ? `#L${line}` : '');
  useEffect(() => {
    if (!menu) return;
    const dismiss = (event: Event) => { if (!menuRef.current?.contains(event.target as Node)) setMenu(null); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(null); };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', key);
    window.addEventListener('scroll', dismiss, true);
    menuRef.current?.querySelector('button')?.focus();
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', key); window.removeEventListener('scroll', dismiss, true); };
  }, [menu]);
  const open = () => {setMenu(null);onOpen({path,...(line ? {line} : {})});};
  return <>
    <a href={displayPath.split('/').map(encodeURIComponent).join('/') + (line ? `#L${line}` : '')} title={address} className={className}
      onClick={event=>{event.preventDefault();open();}}
      onContextMenu={event=>{event.preventDefault();setCopyError(false);setMenu({x:Math.min(event.clientX,window.innerWidth-190),y:Math.min(event.clientY,window.innerHeight-100)});}}>{children}</a>
    {menu && createPortal(<div ref={menuRef} role="menu" aria-label="File link" className="thread-workspace-link-menu" style={{left:Math.max(8,menu.x),top:Math.max(8,menu.y)}}>
      <button role="menuitem" onClick={open}>Open file</button>
      <button role="menuitem" onClick={()=>{void navigator.clipboard.writeText(address).then(()=>setMenu(null)).catch(()=>setCopyError(true));}}>Copy link address</button>
      {copyError && <span role="alert">Could not copy path</span>}
    </div>, document.body)}
  </>;
}
