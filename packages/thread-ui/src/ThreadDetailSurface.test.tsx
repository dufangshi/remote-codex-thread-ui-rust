/**
 * @vitest-environment jsdom
 */
import type { ComponentProps, ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ThreadActionRequestDto, ThreadDetailDto } from "@remote-codex/shared";
import { terminalPluginManifest } from "@remote-codex/plugin-terminal";

import { ThreadDetailSurface } from "./ThreadDetailSurface";
import { createDefaultPluginContextValue } from "./plugins/plugin-context";
import {
  parseHostThreadChromeFlags,
  resolveThreadChromeFlags,
  resolveThreadDetailChrome,
} from "./threadChromeFlags";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function installBrowserMocks() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  class IntersectionObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  Object.defineProperty(window, "ResizeObserver", {
    configurable: true,
    value: ResizeObserverMock,
  });
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    value: ResizeObserverMock,
  });
  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    value: IntersectionObserverMock,
  });
  Object.defineProperty(globalThis, "IntersectionObserver", {
    configurable: true,
    value: IntersectionObserverMock,
  });
}

const permissionRequest: ThreadActionRequestDto = {
  id: "perm-1",
  kind: "permissionRequest",
  title: "Run cargo test",
  description: "execute: cargo test",
  turnId: null,
  itemId: null,
  createdAt: "2026-09-04T00:00:00Z",
  questions: [
    {
      id: "permission",
      header: "Permission",
      question: "Run cargo test",
      isOther: false,
      isSecret: false,
      options: [
        { label: "Allow once", description: "allow once" },
        { label: "Allow always", description: "allow always" },
        { label: "Reject", description: "reject once" },
      ],
    },
  ],
};

const detail: ThreadDetailDto = {
  thread: {
    id: "thread-1",
    workspaceId: "workspace-1",
    provider: "codex",
    providerSessionId: "session-1",
    source: "supervisor",
    title: "Embed chrome thread",
    model: "gpt-5.4",
    reasoningEffort: "medium",
    collaborationMode: "default",
    approvalMode: "guarded",
    status: "idle",
    summaryText: null,
    lastError: null,
    activeTurnId: null,
    isLoaded: true,
    isPinned: false,
    createdAt: "2026-09-04T00:00:00Z",
    updatedAt: "2026-09-04T00:00:00Z",
    lastTurnStartedAt: null,
    lastTurnCompletedAt: null,
  },
  workspace: {
    id: "workspace-1",
    hostId: "local",
    label: "Demo workspace",
    absPath: "/workspace/demo",
    isFavorite: false,
    createdAt: "2026-09-04T00:00:00Z",
    lastOpenedAt: null,
  },
  workspacePathStatus: "present",
  turns: [],
  pendingRequests: [permissionRequest],
  pendingSteers: [],
};

const terminalPlugins = createDefaultPluginContextValue([
  {
    manifest: terminalPluginManifest,
    threadPanels: [{ id: "terminal", kind: "terminal", label: "Terminal" }],
  },
]);

function render(node: ReactNode) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  flushSync(() => {
    root?.render(node);
  });
  return container;
}

function surfaceProps(
  overrides: Partial<ComponentProps<typeof ThreadDetailSurface>> = {},
): ComponentProps<typeof ThreadDetailSurface> {
  return {
    threads: [detail.thread],
    detail,
    loading: false,
    error: null,
    adapter: {
      openThread: () => {},
      sendPrompt: async () => true,
    },
    plugins: terminalPlugins,
    workspaceContent: <div data-testid="workspace-tree">Workspace tree</div>,
    appMenuButton: (
      <button type="button" aria-label="Open Navigation">
        Menu
      </button>
    ),
    ...overrides,
  };
}

describe("ThreadDetailSurface chrome flags", () => {
  beforeEach(() => {
    installBrowserMocks();
  });

  afterEach(() => {
    if (root) {
      flushSync(() => {
        root?.unmount();
      });
    }
    root = null;
    container?.remove();
    container = null;
    vi.restoreAllMocks();
  });

  it("keeps RC workspace chrome when no query flags are applied", () => {
    const flags = resolveThreadChromeFlags("");
    const chrome = resolveThreadDetailChrome({
      presentation: flags.presentation,
      hideExplorer: flags.explorer === false,
      hideShell: flags.shell === false,
      hidePermissionCards: flags.permissions === false,
      hideNav: flags.nav === false,
    });
    expect(flags).toEqual({
      presentation: "workspace",
      explorer: true,
      shell: true,
      permissions: true,
      nav: true,
    });
    expect(chrome).toEqual({
      presentation: "workspace",
      hideExplorer: false,
      hideShell: false,
      hidePermissionCards: false,
      hideNav: false,
    });

    const view = render(<ThreadDetailSurface {...surfaceProps()} />);
    expect(view.querySelector(".thread-rooms-rail")).toBeTruthy();
    expect(view.querySelector('[aria-label="Expand workspace"]')).toBeTruthy();
    expect(view.querySelector('[data-testid="thread-app-nav"]')).toBeTruthy();
    expect(view.textContent).toContain("Permission required");

    flushSync(() => {
      root?.render(
        <ThreadDetailSurface {...surfaceProps({ activeView: "shell" })} />,
      );
    });
    expect(view.textContent).toContain("Thread disconnected");
    expect(view.textContent).not.toContain("Terminal plugin disabled");
  });

  it("hides rooms rail, explorer, shell, permission cards, and nav from query flags", () => {
    const overrides = parseHostThreadChromeFlags({
      search:
        "?presentation=embedded-single-thread&explorer=0&shell=0&permissions=0&nav=0",
    });
    const view = render(
      <ThreadDetailSurface
        {...surfaceProps({
          presentation: overrides.presentation,
          hideExplorer: overrides.explorer === false,
          hideShell: overrides.shell === false,
          hidePermissionCards: overrides.permissions === false,
          hideNav: overrides.nav === false,
          chrome: overrides,
          activeView: "shell",
        })}
      />,
    );

    expect(view.querySelector(".thread-rooms-rail")).toBeNull();
    expect(view.querySelector(".thread-shell-frame")?.className).toContain(
      "is-rail-hidden",
    );
    expect(view.querySelector('[aria-label="Expand workspace"]')).toBeNull();
    expect(view.querySelector('[data-testid="workspace-tree"]')).toBeNull();
    expect(view.querySelector('[data-testid="thread-app-nav"]')).toBeNull();
    expect(view.textContent).not.toContain("Permission required");
    expect(view.textContent).toContain("Terminal plugin disabled");
  });

  it("shows the workspace tree when explorer is enabled", () => {
    const view = render(<ThreadDetailSurface {...surfaceProps()} />);
    const expand = view.querySelector<HTMLButtonElement>(
      '[aria-label="Expand workspace"]',
    );
    expect(expand).toBeTruthy();
    flushSync(() => {
      expand?.click();
    });
    expect(view.querySelector('[data-testid="workspace-tree"]')?.textContent).toBe(
      "Workspace tree",
    );
  });
});
