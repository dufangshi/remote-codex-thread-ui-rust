/**
 * @vitest-environment jsdom
 */
import { useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ModelOptionDto,
  ReasoningEffortDto,
  SandboxModeDto,
  UpdateThreadSettingsInput,
} from '@remote-codex/shared';

import type { SettingsMenu } from './types';
import { ComposerSettingsToolbar } from './ComposerSettingsToolbar';

let root: Root | null = null;
let container: HTMLDivElement | null = null;

const modelOptions: ModelOptionDto[] = [
  {
    id: 'gpt-5',
    model: 'gpt-5',
    displayName: 'GPT-5',
    description: '',
    isDefault: true,
    hidden: false,
    supportedReasoningEfforts: [
      { reasoningEffort: 'low', description: '' },
      { reasoningEffort: 'medium', description: '' },
    ],
    defaultReasoningEffort: 'medium',
  },
  {
    id: 'gpt-5-mini',
    model: 'gpt-5-mini',
    displayName: 'GPT-5 mini',
    description: '',
    isDefault: false,
    hidden: false,
    supportedReasoningEfforts: [
      { reasoningEffort: 'minimal', description: '' },
    ],
    defaultReasoningEffort: 'minimal',
  },
];

function renderNode(node: ReactNode) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  flushSync(() => {
    root?.render(node);
  });

  return container;
}

function renderToolbar({
  initialOpenMenu = null,
  reasoningEffort = 'medium',
  disabled = false,
  goalBusy = false,
  activeView = 'chat',
  sandboxMode = 'workspace-write',
  sandboxModeAvailable = true,
  supportedEfforts = modelOptions[0]?.supportedReasoningEfforts ?? [],
  effortControlsDisabled = false,
  effortControlTitle = 'Select reasoning effort',
  onUpdateSettings = vi.fn(),
  model = 'gpt-5',
  availableModels = modelOptions,
  sendButtonLabel = 'Send',
}: {
  initialOpenMenu?: SettingsMenu;
  reasoningEffort?: ReasoningEffortDto | null;
  disabled?: boolean;
  goalBusy?: boolean;
  activeView?: 'chat' | 'shell';
  sandboxMode?: SandboxModeDto | null;
  sandboxModeAvailable?: boolean;
  supportedEfforts?: ModelOptionDto['supportedReasoningEfforts'];
  effortControlsDisabled?: boolean;
  effortControlTitle?: string;
  onUpdateSettings?: (input: UpdateThreadSettingsInput) => void;
  model?: string;
  availableModels?: ModelOptionDto[];
  sendButtonLabel?: string;
} = {}) {
  function Harness() {
    const [openMenu, setOpenMenu] = useState<SettingsMenu>(initialOpenMenu);

    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <ComposerSettingsToolbar
          openMenu={openMenu}
          model={model}
          modelOptions={availableModels}
          modelContextTitle="1k / 8k tokens"
          contextUsage={null}
          reasoningEffort={reasoningEffort}
          supportedEfforts={supportedEfforts}
          sandboxMode={sandboxMode}
          sandboxModeAvailable={sandboxModeAvailable}
          settingsBusy={false}
          goalComposeMode={false}
          goalBusy={goalBusy}
          activeView={activeView}
          disabled={disabled}
          fastMode={false}
          sendButtonLabel={sendButtonLabel}
          sendButtonClassName="send-state"
          modelControlsDisabled={false}
          effortControlsDisabled={effortControlsDisabled}
          effortControlTitle={effortControlTitle}
          inlineToggleClassName="inline-toggle"
          menuItemClassName="menu-item"
          sendButtonBaseClassName="send-base"
          onSetOpenMenu={setOpenMenu}
          onUpdateSettings={onUpdateSettings}
        />
      </form>
    );
  }

  return renderNode(<Harness />);
}

function buttonByText(view: HTMLElement, text: string) {
  return Array.from(view.querySelectorAll<HTMLButtonElement>('button')).find(
    (button) => button.textContent?.includes(text),
  );
}

function menuButtonByText(view: HTMLElement, text: string) {
  const menu = view.querySelector('[data-composer-menu-surface="true"]');
  return Array.from(
    menu?.querySelectorAll<HTMLButtonElement>('button') ?? [],
  ).find((button) => button.textContent?.includes(text));
}

describe('ComposerSettingsToolbar', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    if (root) {
      flushSync(() => {
        root?.unmount();
      });
    }
    container?.remove();
    root = null;
    container = null;
  });

  it('spins the send button while a prompt is in flight', () => {
    const view = renderToolbar({ sendButtonLabel: 'Sending...' });
    expect(view.querySelector('.animate-spin')).not.toBeNull();
  });

  it('opens the model menu and selects a model with its default effort', () => {
    const onUpdateSettings = vi.fn();
    const view = renderToolbar({ onUpdateSettings });

    flushSync(() => {
      view
        .querySelector<HTMLButtonElement>('[aria-label^="Model and effort:"]')
        ?.click();
    });
    expect(
      view.querySelector('[data-composer-menu-surface="true"]'),
    ).not.toBeNull();
    flushSync(() => {
      menuButtonByText(view, 'Model')?.click();
    });
    menuButtonByText(view, 'GPT-5 mini')?.click();

    expect(onUpdateSettings).toHaveBeenCalledWith({
      model: 'gpt-5-mini',
      reasoningEffort: 'minimal',
    });
  });

  it('shows versioned model display names while preserving the CLI model value', () => {
    const onUpdateSettings = vi.fn();
    const view = renderToolbar({
      model: 'opus[1m]',
      availableModels: [
        {
          ...modelOptions[0]!,
          id: 'opus[1m]',
          model: 'opus[1m]',
          displayName: 'Opus · 5 (1M context)',
        },
      ],
      onUpdateSettings,
    });

    expect(
      view.querySelector<HTMLButtonElement>('[aria-label^="Model and effort:"]')
        ?.textContent,
    ).toContain('Opus · 5');
    expect(view.textContent).not.toContain('(1M context)');
    flushSync(() => {
      view
        .querySelector<HTMLButtonElement>('[aria-label^="Model and effort:"]')
        ?.click();
    });
    flushSync(() => {
      menuButtonByText(view, 'Model')?.click();
    });
    expect(view.textContent).toContain('Opus · 5 (1M context)');
    Array.from(view.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.trim() === 'Opus · 5 (1M context)')
      ?.click();

    expect(onUpdateSettings).toHaveBeenCalledWith({
      model: 'opus[1m]',
      reasoningEffort: 'medium',
    });
  });

  it('selects reasoning effort from the effort menu', () => {
    const onUpdateSettings = vi.fn();
    const view = renderToolbar({
      initialOpenMenu: 'model',
      onUpdateSettings,
    });

    flushSync(() => {
      menuButtonByText(view, 'Effort')?.click();
    });
    buttonByText(view, 'low')?.click();

    expect(onUpdateSettings).toHaveBeenCalledWith({
      reasoningEffort: 'low',
    });
  });

  it('disables the reasoning effort menu when the selected model has no adjustable efforts', () => {
    const view = renderToolbar({
      initialOpenMenu: 'model',
      supportedEfforts: [],
      effortControlsDisabled: true,
      effortControlTitle:
        'The selected model does not expose adjustable reasoning effort.',
      reasoningEffort: null,
    });
    const effortButton = view.querySelector<HTMLButtonElement>(
      '[title="The selected model does not expose adjustable reasoning effort."]',
    );

    expect(effortButton?.disabled).toBe(true);
    expect(effortButton?.getAttribute('title')).toBe(
      'The selected model does not expose adjustable reasoning effort.',
    );
  });

  it('does not render a plan toggle in the composer toolbar', () => {
    const view = renderToolbar();

    expect(buttonByText(view, 'Plan')).toBeUndefined();
  });

  it('selects sandbox mode from the sandbox menu', () => {
    const onUpdateSettings = vi.fn();
    const view = renderToolbar({
      initialOpenMenu: 'sandbox',
      onUpdateSettings,
    });

    buttonByText(view, 'Danger')?.click();

    expect(onUpdateSettings).toHaveBeenCalledWith({
      sandboxMode: 'danger-full-access',
    });
  });

  it('shows the selected sandbox mode as a compact toolbar label', () => {
    const readOnly = renderToolbar({ sandboxMode: 'read-only' });
    expect(buttonByText(readOnly, 'RO')?.getAttribute('aria-label')).toBe(
      'Sandbox: Read only',
    );
    flushSync(() => root?.unmount());
    readOnly.remove();
    root = null;
    container = null;

    const workspaceWrite = renderToolbar({ sandboxMode: 'workspace-write' });
    expect(buttonByText(workspaceWrite, 'WW')?.getAttribute('aria-label')).toBe(
      'Sandbox: Workspace write',
    );
    flushSync(() => root?.unmount());
    workspaceWrite.remove();
    root = null;
    container = null;

    const fullAccess = renderToolbar({ sandboxMode: 'danger-full-access' });
    expect(buttonByText(fullAccess, 'Full')?.getAttribute('aria-label')).toBe(
      'Sandbox: Danger',
    );
  });

  it('defaults an unset sandbox mode to full access', () => {
    const view = renderToolbar({ sandboxMode: null });

    expect(buttonByText(view, 'Full')?.getAttribute('aria-label')).toBe(
      'Sandbox: Danger',
    );
  });

  it('hides sandbox controls when unavailable', () => {
    const view = renderToolbar({ sandboxModeAvailable: false });

    expect(buttonByText(view, 'Sandbox')).toBeUndefined();
  });

  it('keeps the chat send button disabled when composer input is disabled', () => {
    const view = renderToolbar({ disabled: true });

    expect(
      view.querySelector<HTMLButtonElement>('[aria-label="Send Prompt"]')
        ?.disabled,
    ).toBe(true);
  });

  it('does not disable the shell send button from chat prompt disabled state', () => {
    const view = renderToolbar({ activeView: 'shell', disabled: true });

    expect(
      view.querySelector<HTMLButtonElement>('[aria-label="Send Prompt"]')
        ?.disabled,
    ).toBe(false);
  });
});
