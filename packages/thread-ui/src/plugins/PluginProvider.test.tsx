/**
 * @vitest-environment jsdom
 */
import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { terminalPluginManifest } from '@remote-codex/plugin-terminal';
import type { PluginDto } from '@remote-codex/shared';
import { PluginProvider, type PluginProviderAdapter } from './PluginProvider';
import type { PluginContextValue } from './plugin-context';
import type { FrontendPluginModule } from './plugin-types';
import { usePlugins } from './usePlugins';

const terminalModule: FrontendPluginModule = {
  manifest: terminalPluginManifest,
  threadPanels: [{ id: 'terminal', kind: 'terminal', label: 'Terminal' }],
};

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

function Capture({ onValue }: { onValue: (value: PluginContextValue) => void }) {
  const value = usePlugins();
  useEffect(() => onValue(value), [onValue, value]);
  return null;
}

beforeEach(() => {
  (
    globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT: boolean;
    }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe('PluginProvider', () => {
  it('updates enabled state before the server request settles', async () => {
    let resolveUpdate: ((plugin: PluginDto) => void) | null = null;
    const updated = new Promise<PluginDto>((resolve) => {
      resolveUpdate = resolve;
    });
    const serverPlugin: PluginDto = {
      ...terminalPluginManifest,
      enabled: true,
      source: 'builtin',
    };
    const adapter: PluginProviderAdapter = {
      fetchPlugins: () => [serverPlugin],
      updatePlugin: () => updated,
    };
    let latest: PluginContextValue | null = null;

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <PluginProvider adapter={adapter} builtinPlugins={[terminalModule]}>
          <Capture onValue={(value) => { latest = value; }} />
        </PluginProvider>,
      );
    });

    let request: Promise<void> | undefined;
    act(() => {
      request = latest!.setPluginEnabled('remote-codex.terminal', false);
    });
    expect(latest!.plugins[0]?.enabled).toBe(false);

    await act(async () => {
      resolveUpdate?.({ ...serverPlugin, enabled: false });
      await request;
    });
    expect(latest!.plugins[0]?.enabled).toBe(false);
  });

  it('omits terminal panels when hideTerminalPanels is set', async () => {
    let latest: PluginContextValue | null = null;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <PluginProvider
          hideTerminalPanels
          builtinPlugins={[terminalModule]}
        >
          <Capture onValue={(value) => { latest = value; }} />
        </PluginProvider>,
      );
    });

    expect(latest!.getThreadPanels()).toEqual([]);
  });
});
