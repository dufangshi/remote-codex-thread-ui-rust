/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';

import type { PluginDto } from '@remote-codex/shared';
import { builtinFrontendPlugins } from '../builtin-plugins';
import { createDefaultPluginContextValue, mergePluginState } from './plugin-context';

describe('built-in plugin rendering', () => {
  it('registers the terminal and DeepSeek Harness built-in plugins', () => {
    const plugins = createDefaultPluginContextValue(builtinFrontendPlugins);
    expect(plugins.plugins.map((plugin) => plugin.id)).toEqual([
      'remote-codex.terminal',
      'remote-codex.deepseek-harness',
    ]);
    expect(plugins.getThreadPanels()).toEqual([
      { id: 'terminal', kind: 'terminal', label: 'Terminal' },
      { id: 'deepseek-harness', kind: 'harness:deepseek', label: 'DeepSeek Harness' },
    ]);
    expect(
      plugins.renderInlineCode({
        code: '3\nwater\nO 0 0 0',
        language: 'xyz',
        isIncomplete: false,
      }),
    ).toBeNull();
  });

  it('keeps the device availability report for built-in plugins', () => {
    const reported = {
      id: 'remote-codex.deepseek-harness',
      enabled: false,
      source: 'builtin',
      available: false,
      unavailableReason: 'Install DeepSeek Harness (dsh) on this device to use this plugin.',
    } as unknown as PluginDto;
    const merged = mergePluginState(builtinFrontendPlugins, [reported]);
    const dsh = merged.find((plugin) => plugin.id === reported.id) as PluginDto & { available?: boolean; unavailableReason?: string };
    expect(dsh).toMatchObject({ name: 'DeepSeek Harness', enabled: false, available: false });
    expect(dsh.unavailableReason).toMatch(/Install DeepSeek Harness/);
    expect(dsh.capabilities.threadPanels[0]?.kind).toBe('harness:deepseek');
  });
});
