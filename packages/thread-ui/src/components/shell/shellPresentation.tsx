import { translate } from '../../i18n';
import type { ShellStatusDto } from '@remote-codex/shared';

/** Matches the workbench panel surfaces so the terminal reads as part of the panel. */
export function terminalThemeFor(effectiveTheme: 'light' | 'dark') {
  const light = effectiveTheme === 'light';
  return {
    background: light ? '#ebeeeb' : '#0f1317',
    foreground: light ? '#22282b' : '#d6dde6',
    cursor: light ? '#22282b' : '#d6dde6',
    cursorAccent: light ? '#ebeeeb' : '#0f1317',
    selectionBackground: light ? 'rgba(0, 139, 83, 0.24)' : 'rgba(0, 204, 118, 0.28)',
    black: light ? '#c4c9c4' : '#1c242a',
    brightBlack: light ? '#6b736e' : '#5b6770',
    red: light ? '#c62f3a' : '#f87171',
    brightRed: light ? '#e0444f' : '#fb7185',
    green: light ? '#13803f' : '#4ade80',
    brightGreen: light ? '#18994c' : '#86efac',
    yellow: light ? '#9a6700' : '#fbbf24',
    brightYellow: light ? '#b07800' : '#fcd34d',
    blue: light ? '#2563eb' : '#93c5fd',
    brightBlue: light ? '#3b82f6' : '#60a5fa',
    magenta: light ? '#7c3aed' : '#c4b5fd',
    brightMagenta: light ? '#8b5cf6' : '#a78bfa',
    cyan: light ? '#0e7490' : '#67e8f9',
    brightCyan: light ? '#0891b2' : '#22d3ee',
    white: light ? '#4b5258' : '#e2e8f0',
    brightWhite: light ? '#121416' : '#f8fafc',
  };
}

export function statusLabel(status: ShellStatusDto) {
  switch (status) {
    case 'not_created':
      return translate("chat.notCreated");
    case 'creating':
      return translate("chat.creating");
    case 'running':
      return translate("chat.running");
    case 'attached':
      return translate("chat.attached");
    case 'detached':
      return translate("chat.detached");
    case 'exited':
      return translate("chat.exited");
    case 'not_found':
      return translate("chat.missing");
    case 'workspace_missing':
      return translate("chat.workspaceMissing");
  }
}

export function basenameFromPath(filePath: string | null | undefined) {
  if (!filePath) {
    return '';
  }

  const normalized = filePath.replace(/[\\/]+$/, '');
  if (!normalized) {
    return '';
  }

  const segments = normalized.split(/[\\/]/).filter(Boolean);
  return segments.at(-1) ?? normalized;
}

export function buildPromptLabel(
  cwdBaseName: string | null | undefined,
  envPrefix: string | null | undefined,
) {
  const parts = [envPrefix?.trim(), cwdBaseName?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

export function clampPaneRatio(value: number) {
  return Math.min(75, Math.max(25, value));
}
