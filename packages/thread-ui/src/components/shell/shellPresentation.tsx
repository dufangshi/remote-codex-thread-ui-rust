import { translate, useI18n } from '../../i18n';
import type { ShellStatusDto } from '@remote-codex/shared';

export function terminalThemeFor(effectiveTheme: 'light' | 'dark') {
  return {
    background: effectiveTheme === 'light' ? '#f2ede5' : '#0c1117',
    foreground: effectiveTheme === 'light' ? '#3f3a36' : '#d6dde6',
    cursor: effectiveTheme === 'light' ? '#3f3a36' : '#d6dde6',
    black: effectiveTheme === 'light' ? '#d8cfc2' : '#0f1720',
    brightBlack: effectiveTheme === 'light' ? '#8a7f73' : '#475569',
    red: '#f87171',
    brightRed: '#fb7185',
    green: effectiveTheme === 'light' ? '#16a34a' : '#86efac',
    brightGreen: effectiveTheme === 'light' ? '#22c55e' : '#4ade80',
    yellow: '#fbbf24',
    brightYellow: '#fcd34d',
    blue: effectiveTheme === 'light' ? '#2563eb' : '#93c5fd',
    brightBlue: effectiveTheme === 'light' ? '#3b82f6' : '#60a5fa',
    magenta: effectiveTheme === 'light' ? '#7c3aed' : '#c4b5fd',
    brightMagenta: effectiveTheme === 'light' ? '#8b5cf6' : '#a78bfa',
    cyan: effectiveTheme === 'light' ? '#0891b2' : '#67e8f9',
    brightCyan: effectiveTheme === 'light' ? '#06b6d4' : '#22d3ee',
    white: effectiveTheme === 'light' ? '#5b5148' : '#e2e8f0',
    brightWhite: effectiveTheme === 'light' ? '#2c2723' : '#f8fafc',
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

export function WrenchScrewdriverIcon() {
  useI18n();
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4 fill-current"
    >
      <path
        fillRule="evenodd"
        d="M14.5 10C16.9853 10 19 7.98528 19 5.5C19 5.01783 18.9242 4.55338 18.7838 4.11791C18.6792 3.79367 18.2734 3.72683 18.0325 3.96772L15.3402 6.66002C15.2098 6.79041 15.0168 6.84163 14.8466 6.77074C14.1172 6.46695 13.5334 5.88351 13.2292 5.15431C13.1582 4.98403 13.2094 4.79088 13.3398 4.66042L16.0327 1.9676C16.2735 1.72672 16.2067 1.32092 15.8825 1.21636C15.4469 1.07588 14.9823 1 14.5 1C12.0147 1 10 3.01472 10 5.5C10 5.59783 10.0031 5.69494 10.0093 5.79122C10.065 6.66418 9.88174 7.59855 9.20974 8.15855L1.98017 14.1832C1.3591 14.7008 1 15.4674 1 16.2759C1 17.7804 2.21962 19 3.7241 19C4.53256 19 5.29925 18.6409 5.81681 18.0198L11.8414 10.7903C12.4014 10.1183 13.3358 9.93497 14.2088 9.99073C14.3051 9.99688 14.4022 10 14.5 10ZM5 16C5 16.5523 4.55228 17 4 17C3.44772 17 3 16.5523 3 16C3 15.4477 3.44772 15 4 15C4.55228 15 5 15.4477 5 16Z"
        clipRule="evenodd"
      />
      <path d="M14.5 11.5C14.6731 11.5 14.8445 11.4927 15.0138 11.4783L18.7678 15.2323C19.7441 16.2086 19.7441 17.7915 18.7678 18.7678C17.7915 19.7441 16.2086 19.7441 15.2323 18.7678L10.8216 14.3571L12.9938 11.7505C13.0455 11.6885 13.1413 11.6131 13.3357 11.5552C13.5378 11.4951 13.805 11.468 14.1132 11.4877C14.2413 11.4959 14.3702 11.5 14.5 11.5Z" />
      <path d="M6.00003 4.58582L8.33056 6.91635C8.3027 6.95627 8.27496 6.98497 8.24946 7.00622L6.79994 8.21415L4.58582 6.00003H3.30905C3.11966 6.00003 2.94653 5.89303 2.86184 5.72364L1.1612 2.32237C1.06495 2.12987 1.10268 1.89739 1.25486 1.74521L1.74521 1.25486C1.89739 1.10268 2.12987 1.06495 2.32237 1.1612L5.72364 2.86184C5.89303 2.94653 6.00003 3.11966 6.00003 3.30905V4.58582Z" />
    </svg>
  );
}

export function ConnectionIcon({ connected }: { connected: boolean }) {
  useI18n();
  if (!connected) {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4.5 w-4.5 fill-none stroke-current"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13.181 8.68a4.503 4.503 0 0 1 1.903 6.405m-9.768-2.782L3.56 14.06a4.5 4.5 0 0 0 6.364 6.365l3.129-3.129m5.614-5.615 1.757-1.757a4.5 4.5 0 0 0-6.364-6.365l-4.5 4.5c-.258.26-.479.541-.661.84m1.903 6.405a4.495 4.495 0 0 1-1.242-.88 4.483 4.483 0 0 1-1.062-1.683m6.587 2.345 5.907 5.907m-5.907-5.907L8.898 8.898M2.991 2.99 8.898 8.9" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5 fill-none stroke-current"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
    </svg>
  );
}

export function ClipboardIcon() {
  useI18n();
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 fill-none stroke-current"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5.5 3.25h5" />
      <path d="M6.4 2h3.2a.9.9 0 0 1 .9.9v.35h1.3a1.2 1.2 0 0 1 1.2 1.2v7.35a1.2 1.2 0 0 1-1.2 1.2H4.2A1.2 1.2 0 0 1 3 11.8V4.45a1.2 1.2 0 0 1 1.2-1.2h1.3V2.9a.9.9 0 0 1 .9-.9Z" />
    </svg>
  );
}

export function ControlIcon({
  label,
  tone = 'stone',
}: {
  label: string;
  tone?: 'stone' | 'rose' | 'sky';
}) {
  useI18n();
  const toneClassName =
    tone === 'rose'
      ? 'border-rose-300/35 bg-rose-300/14 text-rose-600 dark:text-rose-50'
      : tone === 'sky'
        ? 'border-sky-300/35 bg-sky-300/14 text-sky-600 dark:text-sky-50'
        : 'shell-control-chip border';

  return (
    <span
      className={`inline-flex min-w-[3.45rem] items-center justify-center rounded-full border px-2.5 py-1.5 text-[11px] font-medium tracking-[0.12em] ${toneClassName}`}
    >
      {label}
    </span>
  );
}
