// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocale, translate as t } from '../../i18n';
import {
  MatterWorkbench,
  type MatterWorkbenchOptions,
} from '../MatterWorkbench';
import {
  WorkbenchPanels,
  type WorkbenchPanelsOptions,
} from './WorkbenchPanels';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement, root: Root;
let options: WorkbenchPanelsOptions;
function render() {
  act(() =>
    root.render(
      <WorkbenchPanels
        options={options}
        explorer={<input aria-label="File editor" />}
        revealExplorer={0}
      >
        <textarea aria-label="Primary draft" />
      </WorkbenchPanels>,
    ),
  );
}
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  setLocale('en', false);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  options = {
    deviceLabel: 'Secret device path',
    workspaceLabel: '/private/path',
    primaryTitle: 'Primary',
    primaryStatus: 'idle',
    primaryHarness: 'codex',
    presentation: {
      referenceId: 'peer',
      referenceDeviceId: 'other-device',
      mode: 'thread',
      ratio: 55,
    },
    candidates: [],
    onPresentationChange: vi.fn(),
    onMakePrimary: vi.fn(),
    onFocusPane: vi.fn(),
    referenceTitle: 'Second conversation',
    referenceContent: <textarea aria-label="Second draft" />,
    toolContent: <input aria-label="Terminal input" />,
    toolTitle: 'Terminal',
    onCloseTools: vi.fn(),
  };
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
describe('split panes and independent tools', () => {
  it('removes the context picker and changes composer focus from actual pane interaction', () => {
    render();
    expect(host.querySelector('select')).toBeNull();
    expect(host.textContent).not.toContain('/private/path');
    expect(host.textContent).not.toContain('Reference area');
    act(() =>
      host
        .querySelector('[aria-label="Second draft"]')!
        .dispatchEvent(new Event('pointerdown', { bubbles: true })),
    );
    expect(options.onFocusPane).toHaveBeenLastCalledWith('reference');
    act(() =>
      host
        .querySelector<HTMLTextAreaElement>('[aria-label="Primary draft"]')!
        .focus(),
    );
    expect(options.onFocusPane).toHaveBeenLastCalledWith('primary');
  });
  it('keeps both drafts mounted while files or terminal open and tool focus never retargets the composer', () => {
    render();
    const primary = host.querySelector<HTMLTextAreaElement>(
      '[aria-label="Primary draft"]',
    )!;
    const secondary = host.querySelector<HTMLTextAreaElement>(
      '[aria-label="Second draft"]',
    )!;
    primary.value = 'primary unsent';
    secondary.value = 'secondary unsent';
    options = {
      ...options,
      presentation: { ...options.presentation, mode: 'files' },
      toolsOpen: false,
      toolsTargetLabel: 'Other device · Workspace · Second conversation',
    };
    render();
    const file = host.querySelector<HTMLInputElement>(
      '[aria-label="File editor"]',
    )!;
    vi.mocked(options.onFocusPane!).mockClear();
    act(() => {
      file.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      file.focus();
    });
    expect(options.onFocusPane).not.toHaveBeenCalled();
    expect(host.querySelector('[aria-label="Second draft"]')).toBe(secondary);
    expect(secondary.closest('[hidden]')).toBeNull();
    expect(secondary.value).toBe('secondary unsent');
    expect(primary.value).toBe('primary unsent');
    act(() =>
      host
        .querySelector<HTMLButtonElement>('[aria-label="Close files"]')!
        .click(),
    );
    expect(options.onPresentationChange).toHaveBeenLastCalledWith({
      mode: 'thread',
    });
    options = {
      ...options,
      presentation: { ...options.presentation, mode: 'thread' },
      toolsOpen: true,
    };
    render();
    const terminal = host.querySelector<HTMLInputElement>(
      '[aria-label="Terminal input"]',
    )!;
    act(() => terminal.focus());
    expect(options.onFocusPane).not.toHaveBeenCalled();
    act(() =>
      terminal.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      ),
    );
    expect(options.onCloseTools).toHaveBeenCalledOnce();
    expect(host.querySelector('[aria-label="Second draft"]')).toBe(secondary);
  });
  it('returns from a mobile tool drawer with Back without closing split membership', () => {
    vi.stubGlobal('innerWidth', 500);
    options = {
      ...options,
      presentation: { ...options.presentation, mode: 'files' },
    };
    render();
    act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    expect(options.onPresentationChange).toHaveBeenLastCalledWith({
      mode: 'thread',
    });
    expect(options.presentation.referenceDeviceId).toBe('other-device');
    options = {
      ...options,
      presentation: { ...options.presentation, mode: 'thread' },
      toolsOpen: true,
    };
    render();
    act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    expect(options.onCloseTools).toHaveBeenCalledOnce();
  });
  it('honors refused mobile focus and Back while preserving the file editor focus and draft', () => {
    vi.stubGlobal('innerWidth', 500);
    vi.mocked(options.onFocusPane!).mockReturnValue(true);
    render();
    const views = host.querySelectorAll<HTMLButtonElement>(
      '.workbench-mobile-views button',
    );
    act(() => views[1]!.click());
    expect(
      host
        .querySelector('[data-testid="reference-pane"]')!
        .hasAttribute('hidden'),
    ).toBe(false);
    vi.mocked(options.onFocusPane!).mockReturnValue(false);
    act(() => views[0]!.click());
    expect(
      host
        .querySelector('[data-testid="reference-pane"]')!
        .hasAttribute('hidden'),
    ).toBe(false);
    act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    expect(
      host
        .querySelector('[data-testid="reference-pane"]')!
        .hasAttribute('hidden'),
    ).toBe(false);
    options = {
      ...options,
      presentation: { ...options.presentation, mode: 'files' },
    };
    render();
    const file = host.querySelector<HTMLInputElement>(
      '[aria-label="File editor"]',
    )!;
    file.value = 'unsaved file';
    act(() => file.focus());
    const primary = host.querySelector<HTMLTextAreaElement>(
      '[aria-label="Primary draft"]',
    )!;
    act(() => primary.focus());
    expect(document.activeElement).toBe(file);
    expect(file.value).toBe('unsaved file');
    expect(options.presentation.referenceId).toBe('peer');
  });
  it('keeps split membership and ratio through the sidebar file toggle and its guarded callback', () => {
    const workbench: MatterWorkbenchOptions = {
      panels: options,
      threads: [],
      currentKey: 'host:primary',
      favorite: false,
      workspacePath: '/workspace',
      activeView: 'chat',
      terminalEnabled: false,
      onViewChange: vi.fn(),
      onToggleFavorite: vi.fn(),
      onNavigate: vi.fn(),
      onSearch: vi.fn(),
      notifications: [],
      unreadCount: 0,
      onReadNotifications: vi.fn(),
    };
    const renderWorkbench = () =>
      act(() =>
        root.render(
          <MatterWorkbench
            options={{ ...workbench, panels: options }}
            title="Primary"
            homeHref="/"
            settings={null}
            newThread={null}
            actions={null}
            threadMenu={null}
            connection={null}
            explorer={<input aria-label="File editor" />}
            revealExplorer={0}
          >
            <textarea aria-label="Primary draft" />
          </MatterWorkbench>,
        ),
      );
    renderWorkbench();
    act(() =>
      host
        .querySelector<HTMLButtonElement>(
          `button[aria-label="${t('workbench.toggleExplorer')}"]`,
        )!
        .click(),
    );
    expect(options.onPresentationChange).toHaveBeenLastCalledWith({
      mode: 'files',
    });
    options = {
      ...options,
      presentation: { ...options.presentation, mode: 'files' },
    };
    renderWorkbench();
    act(() =>
      host
        .querySelector<HTMLButtonElement>(
          `button[aria-label="${t('workbench.toggleExplorer')}"]`,
        )!
        .click(),
    );
    expect(options.onPresentationChange).toHaveBeenLastCalledWith({
      mode: 'thread',
    });
    expect(options.presentation).toMatchObject({
      referenceId: 'peer',
      referenceDeviceId: 'other-device',
      ratio: 55,
    });
    vi.mocked(options.onPresentationChange).mockReturnValue(false);
    renderWorkbench();
    act(() =>
      host
        .querySelector<HTMLButtonElement>(
          `button[aria-label="${t('workbench.toggleExplorer')}"]`,
        )!
        .click(),
    );
    expect(
      host.querySelector('aside.workbench-tool-drawer')!.hasAttribute('hidden'),
    ).toBe(false);
  });
});
