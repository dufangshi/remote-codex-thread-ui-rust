import { translate, useI18n } from '../../i18n';
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';

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

/** Phone key bar: keys a soft keyboard lacks. Sessions live in the title bar. */
export function ShellTouchControls({ inset, enabled, ctrl, onCtrl, onInput, onFocus }: {
  inset: number; enabled: boolean; ctrl: boolean; onCtrl: () => void;
  onInput: (data: string) => void; onFocus: () => void;
}) {
  useI18n();
  const keys = [
    ['Esc', '\x1b'], ['Tab', '\t'], ['↑', '\x1b[A'], ['↓', '\x1b[B'],
    ['←', '\x1b[D'], ['→', '\x1b[C'],
  ] as const;
  const icons = { '↑': ArrowUp, '↓': ArrowDown, '←': ArrowLeft, '→': ArrowRight };
  return <div className="shell-touch-controls" style={{ transform: `translateY(-${inset}px)` }} role="toolbar" aria-label={translate("files.terminalControls")}>
    <button type="button" aria-label={translate("files.controlModifier")} aria-pressed={ctrl} disabled={!enabled} onPointerDown={e => e.preventDefault()} onClick={() => { onCtrl(); onFocus(); }}>Ctrl</button>
    {keys.map(([label, data]) => {
      const Icon = icons[label as keyof typeof icons];
      return <button key={label} type="button" aria-label={translate("files.terminal", { value1: label })} disabled={!enabled} onPointerDown={e => e.preventDefault()} onClick={() => { onInput(data); onFocus(); }}>{Icon ? <Icon size={17} /> : label}</button>;
    })}
  </div>;
}
