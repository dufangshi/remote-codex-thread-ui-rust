import { useSyncExternalStore } from 'react';

/* Components that paint with JavaScript palettes (xterm, Monaco) cannot follow CSS
   variables by themselves. A host theme preset can set optional hex colors on
   their containers (`--terminal-*`, `--editor-*`); these helpers read them and
   report when the host switches `<html data-theme-preset>`. */

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme-preset'] });
  return () => observer.disconnect();
}
const readPreset = () => document.documentElement.dataset.themePreset ?? '';

/** The host's theme preset name, or '' when it has none. */
export function useDocumentThemePreset() {
  return useSyncExternalStore(subscribe, readPreset, () => '');
}

/** A `#rrggbb` or `#rrggbbaa` custom property inherited by `element`. */
export function cssHexVariable(element: Element | null | undefined, name: string) {
  if (!element) return undefined;
  const value = getComputedStyle(element).getPropertyValue(name).trim();
  return /^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) ? value : undefined;
}
