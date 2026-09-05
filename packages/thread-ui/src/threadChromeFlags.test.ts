import { describe, expect, it } from "vitest";

import {
  DEFAULT_THREAD_CHROME_FLAGS,
  parseHostThreadChromeFlags,
  parseThreadChromeFlagOverrides,
  readThreadChromeBootstrap,
  resolveThreadChromeFlags,
  resolveThreadDetailChrome,
} from "./threadChromeFlags";

const AGENT_UI_WEB_CHROME_DEFAULTS = {
  presentation: "embedded-single-thread",
  explorer: false,
  shell: false,
  permissions: true,
  nav: false,
  theme: "system",
} as const;

describe("thread chrome flags", () => {
  it("keeps RC defaults when no query or bootstrap is present", () => {
    expect(parseThreadChromeFlagOverrides("")).toEqual({});
    expect(parseThreadChromeFlagOverrides("?agent=codex")).toEqual({});
    expect(resolveThreadChromeFlags("")).toEqual(DEFAULT_THREAD_CHROME_FLAGS);
    expect(resolveThreadChromeFlags(undefined)).toEqual({
      presentation: "workspace",
      explorer: true,
      shell: true,
      permissions: true,
      nav: true,
      theme: "system",
    });
  });

  it("keeps agent-ui-web host defaults when no query is present", () => {
    expect(
      resolveThreadChromeFlags("", AGENT_UI_WEB_CHROME_DEFAULTS),
    ).toEqual({
      presentation: "embedded-single-thread",
      explorer: false,
      shell: false,
      permissions: true,
      nav: false,
      theme: "system",
    });
  });

  it("parses Treer embed query flags", () => {
    expect(
      parseThreadChromeFlagOverrides(
        "presentation=embedded-single-thread&explorer=1&shell=0&permissions=0&nav=0&theme=light",
      ),
    ).toEqual({
      presentation: "embedded-single-thread",
      explorer: true,
      shell: false,
      permissions: false,
      nav: false,
      theme: "light",
    });
  });

  it("parses theme=light|dark|system and ignores unknown values", () => {
    expect(parseThreadChromeFlagOverrides("theme=light")).toEqual({
      theme: "light",
    });
    expect(parseThreadChromeFlagOverrides("theme=dark")).toEqual({
      theme: "dark",
    });
    expect(parseThreadChromeFlagOverrides("theme=system")).toEqual({
      theme: "system",
    });
    expect(parseThreadChromeFlagOverrides("theme=auto")).toEqual({});
  });

  it("parses boolean 1/0 aliases from search params and bootstrap records", () => {
    expect(
      parseThreadChromeFlagOverrides(
        new URLSearchParams("explorer=true&shell=off&permissions=yes&nav=no"),
      ),
    ).toEqual({
      explorer: true,
      shell: false,
      permissions: true,
      nav: false,
    });
    expect(
      parseThreadChromeFlagOverrides({
        presentation: "embedded-single-thread",
        explorer: 1,
        shell: 0,
        permissions: false,
        nav: true,
      }),
    ).toEqual({
      presentation: "embedded-single-thread",
      explorer: true,
      shell: false,
      permissions: false,
      nav: true,
    });
  });

  it("lets query flags override equivalent bootstrap flags", () => {
    expect(
      parseHostThreadChromeFlags({
        bootstrap: {
          presentation: "workspace",
          explorer: 0,
          shell: 1,
          permissions: 1,
          nav: 1,
        },
        search: "?presentation=embedded-single-thread&explorer=1&shell=0&nav=0",
      }),
    ).toEqual({
      presentation: "embedded-single-thread",
      explorer: true,
      shell: false,
      permissions: true,
      nav: false,
    });
  });

  it("reads bootstrap flags from known window globals", () => {
    expect(
      readThreadChromeBootstrap({
        __REMOTE_CODEX_THREAD_UI__: { explorer: 1, shell: 0 },
      }),
    ).toEqual({ explorer: 1, shell: 0 });
    expect(
      readThreadChromeBootstrap({
        __REMOTE_CODEX_EMBED__: { nav: 0 },
      }),
    ).toEqual({ nav: 0 });
    expect(readThreadChromeBootstrap({})).toBeNull();
  });

  it("maps optional chrome props onto ThreadDetailSurface hide flags without changing RC defaults", () => {
    expect(resolveThreadDetailChrome({})).toEqual({
      presentation: "workspace",
      hideExplorer: false,
      hideShell: false,
      hidePermissionCards: false,
      hideNav: false,
    });
    expect(
      resolveThreadDetailChrome({
        presentation: "embedded-single-thread",
        chrome: {
          shell: false,
          permissions: false,
          nav: false,
        },
        hideExplorer: true,
      }),
    ).toEqual({
      presentation: "embedded-single-thread",
      hideExplorer: true,
      hideShell: true,
      hidePermissionCards: true,
      hideNav: true,
    });
  });
});
