/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  AGENT_UI_WEB_CHROME_DEFAULTS,
  readAgentUiChromeFlags,
  readAgentUiChromeOverrides,
} from "./embedChrome";

describe("agent-ui-web embed chrome flags", () => {
  afterEach(() => {
    delete (window as Window & { __REMOTE_CODEX_THREAD_UI__?: unknown })
      .__REMOTE_CODEX_THREAD_UI__;
    window.history.replaceState({}, "", "/");
  });

  it("keeps today's embedded defaults when the query string is empty", () => {
    window.history.replaceState({}, "", "/");
    expect(readAgentUiChromeOverrides("")).toEqual({});
    expect(readAgentUiChromeFlags("")).toEqual({
      presentation: "embedded-single-thread",
      explorer: false,
      shell: false,
      permissions: true,
      nav: false,
      theme: "system",
    });
    expect(AGENT_UI_WEB_CHROME_DEFAULTS.presentation).toBe(
      "embedded-single-thread",
    );
  });

  it("applies Treer iframe query flags", () => {
    const search =
      "?presentation=embedded-single-thread&explorer=1&shell=0&permissions=0&nav=0";
    expect(readAgentUiChromeOverrides(search)).toEqual({
      presentation: "embedded-single-thread",
      explorer: true,
      shell: false,
      permissions: false,
      nav: false,
    });
    expect(readAgentUiChromeFlags(search)).toEqual({
      presentation: "embedded-single-thread",
      explorer: true,
      shell: false,
      permissions: false,
      nav: false,
      theme: "system",
    });
  });

  it("lets query flags override bootstrap flags", () => {
    const bootstrap = {
      presentation: "workspace",
      explorer: 0,
      shell: 1,
      permissions: 1,
      nav: 1,
    };
    expect(
      readAgentUiChromeFlags("?explorer=1&shell=0&nav=0", bootstrap),
    ).toEqual({
      presentation: "workspace",
      explorer: true,
      shell: false,
      permissions: true,
      nav: false,
      theme: "system",
    });
  });

  it("reads bootstrap flags from window when search is omitted", () => {
    (
      window as Window & {
        __REMOTE_CODEX_THREAD_UI__?: Record<string, unknown>;
      }
    ).__REMOTE_CODEX_THREAD_UI__ = {
      explorer: 1,
      permissions: 0,
    };
    expect(readAgentUiChromeFlags("")).toEqual({
      presentation: "embedded-single-thread",
      explorer: true,
      shell: false,
      permissions: false,
      nav: false,
      theme: "system",
    });
  });

  it("applies an explicit Treer theme query", () => {
    expect(readAgentUiChromeOverrides("?theme=light")).toEqual({
      theme: "light",
    });
    expect(readAgentUiChromeFlags("?theme=dark")).toEqual({
      presentation: "embedded-single-thread",
      explorer: false,
      shell: false,
      permissions: true,
      nav: false,
      theme: "dark",
    });
  });
});
