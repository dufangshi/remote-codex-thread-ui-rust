export type ThreadPresentationMode = "workspace" | "embedded-single-thread";

export interface ThreadChromeFlags {
  presentation: ThreadPresentationMode;
  explorer: boolean;
  shell: boolean;
  permissions: boolean;
  nav: boolean;
}

export type ThreadChromeFlagOverrides = Partial<ThreadChromeFlags>;

export type ThreadChromeFlagSource =
  | string
  | URLSearchParams
  | URL
  | Record<string, unknown>
  | null
  | undefined;

export const DEFAULT_THREAD_CHROME_FLAGS: ThreadChromeFlags = {
  presentation: "workspace",
  explorer: true,
  shell: true,
  permissions: true,
  nav: true,
};

const BOOTSTRAP_GLOBAL_KEYS = [
  "__REMOTE_CODEX_THREAD_UI__",
  "__REMOTE_CODEX_EMBED__",
] as const;

function parseBooleanFlag(value: unknown): boolean | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
    return undefined;
  }
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") {
    return false;
  }
  return undefined;
}

function parsePresentationFlag(value: unknown): ThreadPresentationMode | undefined {
  if (value === "workspace" || value === "embedded-single-thread") {
    return value;
  }
  return undefined;
}

function recordFromSearchParams(params: URLSearchParams): Record<string, unknown> {
  return Object.fromEntries(params.entries());
}

function recordFromSource(source: ThreadChromeFlagSource): Record<string, unknown> {
  if (source == null) {
    return {};
  }
  if (typeof URLSearchParams !== "undefined" && source instanceof URLSearchParams) {
    return recordFromSearchParams(source);
  }
  if (typeof URL !== "undefined" && source instanceof URL) {
    return recordFromSearchParams(source.searchParams);
  }
  if (typeof source === "string") {
    const trimmed = source.trim();
    if (!trimmed) {
      return {};
    }
    if (/^https?:\/\//i.test(trimmed)) {
      try {
        return recordFromSearchParams(new URL(trimmed).searchParams);
      } catch {
        return {};
      }
    }
    const query = trimmed.startsWith("?") ? trimmed.slice(1) : trimmed;
    return recordFromSearchParams(new URLSearchParams(query));
  }
  if (typeof source === "object") {
    return { ...(source as Record<string, unknown>) };
  }
  return {};
}

export function parseThreadChromeFlagOverrides(
  source?: ThreadChromeFlagSource,
): ThreadChromeFlagOverrides {
  const record = recordFromSource(source);
  const presentation = parsePresentationFlag(record.presentation);
  const explorer = parseBooleanFlag(record.explorer);
  const shell = parseBooleanFlag(record.shell);
  const permissions = parseBooleanFlag(record.permissions);
  const nav = parseBooleanFlag(record.nav);
  return {
    ...(presentation ? { presentation } : {}),
    ...(explorer !== undefined ? { explorer } : {}),
    ...(shell !== undefined ? { shell } : {}),
    ...(permissions !== undefined ? { permissions } : {}),
    ...(nav !== undefined ? { nav } : {}),
  };
}

export function parseHostThreadChromeFlags(input: {
  search?: ThreadChromeFlagSource;
  bootstrap?: ThreadChromeFlagSource;
} = {}): ThreadChromeFlagOverrides {
  return {
    ...parseThreadChromeFlagOverrides(input.bootstrap),
    ...parseThreadChromeFlagOverrides(input.search),
  };
}

export function resolveThreadChromeFlags(
  source?: ThreadChromeFlagSource,
  defaults: ThreadChromeFlags = DEFAULT_THREAD_CHROME_FLAGS,
): ThreadChromeFlags {
  return {
    ...defaults,
    ...parseThreadChromeFlagOverrides(source),
  };
}

export function readThreadChromeBootstrap(
  globalObject: Record<string, unknown> | null | undefined = globalThis as Record<string, unknown>,
): Record<string, unknown> | null {
  if (!globalObject) {
    return null;
  }
  for (const key of BOOTSTRAP_GLOBAL_KEYS) {
    const value = globalObject[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return null;
}

export function resolveThreadDetailChrome(input: {
  presentation?: ThreadPresentationMode;
  hideExplorer?: boolean;
  hideShell?: boolean;
  hidePermissionCards?: boolean;
  hideNav?: boolean;
  chrome?: ThreadChromeFlagOverrides;
}): {
  presentation: ThreadPresentationMode;
  hideExplorer: boolean;
  hideShell: boolean;
  hidePermissionCards: boolean;
  hideNav: boolean;
} {
  return {
    presentation: input.chrome?.presentation ?? input.presentation ?? "workspace",
    hideExplorer: input.hideExplorer === true,
    hideShell: input.hideShell ?? input.chrome?.shell === false,
    hidePermissionCards:
      input.hidePermissionCards ?? input.chrome?.permissions === false,
    hideNav: input.hideNav ?? input.chrome?.nav === false,
  };
}
