import {
  parseHostThreadChromeFlags,
  readThreadChromeBootstrap,
  resolveThreadChromeFlags,
  type ThreadChromeFlagOverrides,
  type ThreadChromeFlags,
} from "@remote-codex/thread-ui";

/**
 * Host defaults for the Treer-embedded agent-ui-web surface when a flag is
 * omitted. `presentation` is already `embedded-single-thread` today; explorer,
 * shell, and nav stay off unless Treer opts in through the iframe URL.
 */
export const AGENT_UI_WEB_CHROME_DEFAULTS: ThreadChromeFlags = {
  presentation: "embedded-single-thread",
  explorer: false,
  shell: false,
  permissions: true,
  nav: false,
  theme: "system",
};

export function readAgentUiChromeOverrides(
  search: string | URLSearchParams = typeof window === "undefined"
    ? ""
    : window.location.search,
  bootstrap: Record<string, unknown> | null = typeof window === "undefined"
    ? null
    : readThreadChromeBootstrap(),
): ThreadChromeFlagOverrides {
  return parseHostThreadChromeFlags({
    search,
    ...(bootstrap ? { bootstrap } : {}),
  });
}

export function readAgentUiChromeFlags(
  search: string | URLSearchParams = typeof window === "undefined"
    ? ""
    : window.location.search,
  bootstrap: Record<string, unknown> | null = typeof window === "undefined"
    ? null
    : readThreadChromeBootstrap(),
): ThreadChromeFlags {
  return resolveThreadChromeFlags(
    readAgentUiChromeOverrides(search, bootstrap),
    AGENT_UI_WEB_CHROME_DEFAULTS,
  );
}
