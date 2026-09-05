import { useEffect, useRef, useState } from 'react';
import type { AgentSubscriptionUsageDto } from '@remote-codex/shared';

function resetLabel(value: string | null) {
  if (!value) return 'reset time unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'reset time unavailable'
    : `resets ${date.toLocaleString()}`;
}

export function ComposerSubscriptionUsage({
  usage,
}: {
  usage?: AgentSubscriptionUsageDto | null;
}) {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!detailsVisible) return;
    const outside = (event: PointerEvent) => {if (!ref.current?.contains(event.target as Node)) setDetailsVisible(false);};
    const escape = (event: KeyboardEvent) => {if (event.key === 'Escape') setDetailsVisible(false);};
    document.addEventListener('pointerdown', outside);document.addEventListener('keydown', escape);
    return () => {document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[detailsVisible]);

  if (
    !usage ||
    usage.authKind !== 'subscription' ||
    usage.windows.length === 0 || usage.stale
  ) {
    return null;
  }

  const windows = usage.windows.filter(window => Number.isFinite(window.usedPercent) && window.usedPercent >= 0 && (!window.resetsAt || new Date(window.resetsAt).getTime() > Date.now())).slice(0, 2);
  if (!windows.length) return null;
  const description = windows
    .map((window) => {
      const remaining = Math.max(0, 100 - window.usedPercent);
      return `${window.label}: ${remaining}% remaining, ${resetLabel(window.resetsAt)}`;
    })
    .join('. ');

  return (
    <button
      ref={ref}
      type="button"
      className={`thread-subscription-usage group pointer-events-auto absolute bottom-0 right-2 inline-flex h-4 items-center gap-1 rounded-t-md border border-b-0 border-stone-500/50 bg-stone-950 px-1 text-[9px] font-normal leading-none text-stone-200 shadow-sm transition-[border-color,background-color,opacity] duration-200 hover:border-stone-400/75 hover:bg-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-200/70 sm:right-3 sm:text-[9px] ${usage.stale ? 'opacity-70' : 'opacity-95'}`}
      aria-label={`${usage.provider} subscription usage. ${description}`}
      aria-expanded={detailsVisible}
      onClick={() => setDetailsVisible((current) => !current)}
    >
      {windows.map((window) => {
        const remaining = Math.max(0, Math.min(100, 100 - window.usedPercent));
        const hue = Math.round(18 + (remaining / 100) * 190);
        return (
          <span key={window.id} className="inline-flex items-center gap-0.5">
            <span className="font-normal tracking-[-0.01em]">{window.label}</span>
            <span
              data-subscription-window-track="true"
              className="h-0.5 w-7 overflow-hidden rounded-full bg-stone-600/55 sm:w-9"
            >
              <span
                className="block h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${remaining}%`,
                  backgroundImage: `linear-gradient(90deg, oklch(68% 0.17 ${hue}), oklch(82% 0.13 ${Math.min(hue + 18, 235)}))`,
                }}
              />
            </span>
          </span>
        );
      })}
      <span
        role="tooltip"
        aria-hidden={!detailsVisible}
        className={`pointer-events-none absolute right-0 bottom-full mb-1 max-w-[calc(100vw-2rem)] rounded-md border border-stone-600/65 bg-stone-950/95 px-1.5 py-1 text-[9px] font-normal leading-4 text-stone-100 shadow-lg transition-[opacity,transform] duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 ${detailsVisible ? 'translate-y-0 opacity-100' : 'translate-y-0.5 opacity-0'}`}
      >
        {windows.map((window) => (
          <span key={window.id} className="block">
            {window.label} · {Math.max(0, Math.round(100 - window.usedPercent))}% remaining · {resetLabel(window.resetsAt)}
          </span>
        ))}
        {usage.stale ? ' · last known' : ''}
      </span>
    </button>
  );
}
