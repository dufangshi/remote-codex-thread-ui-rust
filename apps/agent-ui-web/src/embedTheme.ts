import { useEffect, useState } from "react";
import type { ThreadThemeMode } from "@remote-codex/thread-ui";

export type EmbedThemeMode = ThreadThemeMode;
export type EffectiveTheme = "light" | "dark";

export const EMBED_THEME_MESSAGE_TYPE = "treer:embed-theme";

const DARK_BACKGROUND = "#101722";
const LIGHT_BACKGROUND = "#f6f8fb";
const DARK_FOREGROUND = "#e8edf2";
const LIGHT_FOREGROUND = "#0f172a";

export function readSystemTheme(): EffectiveTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function resolveEffectiveTheme(mode: EmbedThemeMode): EffectiveTheme {
  return mode === "system" ? readSystemTheme() : mode;
}

export function applyDocumentTheme(effective: EffectiveTheme) {
  if (typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  if (
    root.dataset.themeEffective === effective &&
    root.style.colorScheme === effective &&
    root.classList.contains("dark") === (effective === "dark")
  ) {
    return;
  }
  root.dataset.themeEffective = effective;
  root.dataset.themeMode = effective;
  root.style.colorScheme = effective;
  root.classList.toggle("dark", effective === "dark");
  document.body.style.background =
    effective === "dark" ? DARK_BACKGROUND : LIGHT_BACKGROUND;
  document.body.style.color =
    effective === "dark" ? DARK_FOREGROUND : LIGHT_FOREGROUND;
}

export function parseEmbedThemeMessage(data: unknown): EmbedThemeMode | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const record = data as { type?: unknown; theme?: unknown };
  if (record.type !== EMBED_THEME_MESSAGE_TYPE) {
    return null;
  }
  if (
    record.theme === "system" ||
    record.theme === "light" ||
    record.theme === "dark"
  ) {
    return record.theme;
  }
  return null;
}

export function useEmbedTheme(initialMode: EmbedThemeMode): {
  themeMode: EmbedThemeMode;
  setThemeMode: (mode: EmbedThemeMode) => void;
  effectiveTheme: EffectiveTheme;
} {
  const [themeMode, setThemeMode] = useState<EmbedThemeMode>(initialMode);
  const [systemTheme, setSystemTheme] = useState<EffectiveTheme>(readSystemTheme);
  const effectiveTheme =
    themeMode === "system" ? systemTheme : themeMode;

  useEffect(() => {
    applyDocumentTheme(effectiveTheme);
  }, [effectiveTheme]);

  useEffect(() => {
    if (themeMode !== "system" || typeof window.matchMedia !== "function") {
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystemTheme(media.matches ? "dark" : "light");
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [themeMode]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) {
        return;
      }
      const next = parseEmbedThemeMessage(event.data);
      if (next) {
        setThemeMode(next);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return { themeMode, setThemeMode, effectiveTheme };
}
