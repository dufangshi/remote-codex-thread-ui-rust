/**
 * @vitest-environment jsdom
 */
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentHookDto } from '@pockymoe/shared';
import {
  FALLBACK_HOOK_COMMAND,
  useComposerHookConfig,
  type UseComposerHookConfigInput,
  type UseComposerHookConfigResult,
} from './useComposerHookConfig';

let latestResult: UseComposerHookConfigResult | null = null;

function hook(overrides: Partial<AgentHookDto> = {}): AgentHookDto {
  return {
    key: 'project:PreToolUse:Bash',
    source: 'project',
    sourcePath: '/repo/.codex/hooks.json',
    eventName: 'preToolUse',
    matcher: 'Bash',
    handlerType: 'command',
    command: 'echo ok',
    timeoutSec: 30,
    statusMessage: 'Checking',
    pluginId: null,
    displayOrder: 0,
    enabled: true,
    isManaged: false,
    trustStatus: 'trusted',
    currentHash: 'hash',
    ...overrides,
  };
}

function HookHarness(props: UseComposerHookConfigInput) {
  latestResult = useComposerHookConfig(props);
  return null;
}

function renderHookHarness(input: Partial<UseComposerHookConfigInput> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const props: UseComposerHookConfigInput = {
    slashPanelView: 'hooks',
    ...input,
  };

  flushSync(() => {
    root.render(<HookHarness {...props} />);
  });

  return {
    rerender(nextInput: Partial<UseComposerHookConfigInput>) {
      Object.assign(props, nextInput);
      flushSync(() => {
        root.render(<HookHarness {...props} />);
      });
    },
    unmount() {
      flushSync(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

async function runAsyncAction(action: () => Promise<void> | undefined) {
  let actionPromise: Promise<void> | undefined;
  flushSync(() => {
    actionPromise = action();
  });

  await actionPromise;
  await new Promise((resolve) => window.setTimeout(resolve, 0));
  flushSync(() => {});
}

describe('useComposerHookConfig', () => {
  beforeEach(() => {
    latestResult = null;
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    latestResult = null;
    vi.restoreAllMocks();
  });

  it('resets form fields from the preToolUse command template', () => {
    const harness = renderHookHarness({
      hookCommandTemplates: [
        { eventName: 'preToolUse', command: 'echo templated' },
      ],
    });

    flushSync(() => {
      latestResult?.setHookCommand('custom command');
      latestResult?.setHookScope('global');
      latestResult?.resetHookForm();
    });

    expect(latestResult?.hookScope).toBe('project');
    expect(latestResult?.hookEventName).toBe('preToolUse');
    expect(latestResult?.hookMatcher).toBe('Bash');
    expect(latestResult?.hookCommand).toBe('echo templated');
    expect(latestResult?.hookTimeoutSec).toBe('30');
    harness.unmount();
  });

  it('updates default matcher and command when the event changes', async () => {
    const harness = renderHookHarness({
      hookCommandTemplates: [
        { eventName: 'preToolUse', command: 'echo pre' },
        { eventName: 'sessionStart', command: 'echo session' },
      ],
    });

    flushSync(() => {
      latestResult?.setHookEventName('sessionStart');
    });
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    flushSync(() => {});

    expect(latestResult?.hookMatcher).toBe('startup|resume');
    expect(latestResult?.hookCommand).toBe('echo session');
    harness.unmount();
  });

  it('starts editing only editable command hooks', () => {
    const harness = renderHookHarness();

    flushSync(() => {
      latestResult?.startEditingHook(hook({ source: 'sessionFlags' }));
    });

    expect(latestResult?.hookConfigError).toBe(
      'Only command hooks in global or project hooks.json can be edited here.',
    );

    flushSync(() => {
      latestResult?.startEditingHook(
        hook({
          source: 'user',
          eventName: 'postToolUse',
          matcher: 'Edit',
          command: 'echo edit',
          timeoutSec: 45,
          statusMessage: 'Editing',
        }),
      );
    });

    expect(latestResult?.hooksPanelMode).toBe('edit');
    expect(latestResult?.editingHookTarget).toMatchObject({
      scope: 'global',
      eventName: 'postToolUse',
      matcher: 'Edit',
      command: 'echo edit',
      timeoutSec: 45,
      statusMessage: 'Editing',
    });
    expect(latestResult?.hookScope).toBe('global');
    expect(latestResult?.hookCommand).toBe('echo edit');
    expect(latestResult?.hookConfigError).toBeNull();
    harness.unmount();
  });

  it('validates save input before creating a hook', async () => {
    const onCreateHook = vi.fn();
    const harness = renderHookHarness({ onCreateHook });

    flushSync(() => {
      latestResult?.setHookCommand('   ');
    });
    await runAsyncAction(() => latestResult?.saveHook());
    expect(onCreateHook).not.toHaveBeenCalled();
    expect(latestResult?.hookConfigError).toBe('Hook command cannot be empty.');

    flushSync(() => {
      latestResult?.setHookCommand('echo ok');
      latestResult?.setHookTimeoutSec('0');
    });
    await runAsyncAction(() => latestResult?.saveHook());
    expect(onCreateHook).not.toHaveBeenCalled();
    expect(latestResult?.hookConfigError).toBe(
      'Timeout must be a positive number of seconds.',
    );
    harness.unmount();
  });

  it('creates hooks and reports success', async () => {
    const onCreateHook = vi.fn();
    const harness = renderHookHarness({ onCreateHook });

    flushSync(() => {
      latestResult?.setHookScope('global');
      latestResult?.setHookEventName('postToolUse');
      latestResult?.setHookMatcher('Bash');
      latestResult?.setHookCommand(' echo ok ');
      latestResult?.setHookTimeoutSec('15');
      latestResult?.setHookStatusMessage(' Checking ');
    });
    await runAsyncAction(() => latestResult?.saveHook());

    expect(onCreateHook).toHaveBeenCalledWith({
      scope: 'global',
      eventName: 'postToolUse',
      matcher: 'Bash',
      command: 'echo ok',
      timeoutSec: 15,
      statusMessage: 'Checking',
    });
    expect(latestResult?.hooksPanelMode).toBe('list');
    expect(latestResult?.hookConfigBusy).toBe(false);
    expect(latestResult?.hookConfigSuccess).toBe(
      'Global hook written in hooks.json and trusted.',
    );
    harness.unmount();
  });

  it('updates editable hooks and clears the edit target on success', async () => {
    const onUpdateHook = vi.fn();
    const harness = renderHookHarness({ onUpdateHook });

    flushSync(() => {
      latestResult?.startEditingHook(hook());
      latestResult?.setHookCommand('echo updated');
    });
    await runAsyncAction(() => latestResult?.saveHook());

    expect(onUpdateHook).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'echo updated',
        target: expect.objectContaining({
          scope: 'project',
          eventName: 'preToolUse',
        }),
      }),
    );
    expect(latestResult?.editingHookTarget).toBeNull();
    expect(latestResult?.hookConfigSuccess).toBe(
      'Project hook updated in hooks.json and trusted.',
    );
    harness.unmount();
  });

  it('trusts and untrusts hooks while reporting unavailable handlers', async () => {
    const onTrustHook = vi.fn();
    const onUntrustHook = vi.fn();
    const harness = renderHookHarness({ onTrustHook, onUntrustHook });

    await runAsyncAction(() => latestResult?.trustHook(hook()));
    expect(onTrustHook).toHaveBeenCalledWith({
      key: 'project:PreToolUse:Bash',
      currentHash: 'hash',
    });
    expect(latestResult?.hookConfigSuccess).toBe('Hook trusted.');

    await runAsyncAction(() => latestResult?.untrustHook(hook()));
    expect(onUntrustHook).toHaveBeenCalledWith({
      key: 'project:PreToolUse:Bash',
    });
    expect(latestResult?.hookConfigSuccess).toBe('Hook untrusted.');

    harness.rerender({ onTrustHook: undefined, onUntrustHook: undefined });
    await runAsyncAction(() =>
      latestResult?.trustHook(hook({ currentHash: '' })),
    );
    expect(latestResult?.hookConfigError).toBe(
      'Hook trust is unavailable in this view.',
    );
    harness.unmount();
  });

  it('resets panel state and status when leaving the hooks panel', async () => {
    const harness = renderHookHarness({ onCreateHook: vi.fn() });

    flushSync(() => {
      latestResult?.setHooksPanelMode('add');
      latestResult?.setHookCommand('');
    });
    await runAsyncAction(() => latestResult?.saveHook());
    expect(latestResult?.hookConfigError).toBe('Hook command cannot be empty.');

    harness.rerender({ slashPanelView: 'root' });
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    flushSync(() => {});

    expect(latestResult?.hooksPanelMode).toBe('list');
    expect(latestResult?.hookConfigError).toBeNull();
    harness.unmount();
  });

  it('falls back to the built-in command when no templates exist', () => {
    const harness = renderHookHarness();

    expect(latestResult?.hookCommand).toBe(FALLBACK_HOOK_COMMAND);
    harness.unmount();
  });
});
