// src/components/themeHooks.ts
import { useSyncExternalStore } from "react";
function subscribe(onChange) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme-preset"] });
  return () => observer.disconnect();
}
var readPreset = () => document.documentElement.dataset.themePreset ?? "";
function useDocumentThemePreset() {
  return useSyncExternalStore(subscribe, readPreset, () => "");
}
function cssHexVariable(element, name) {
  if (!element) return void 0;
  const value = getComputedStyle(element).getPropertyValue(name).trim();
  return /^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) ? value : void 0;
}

export {
  useDocumentThemePreset,
  cssHexVariable
};
