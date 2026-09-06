import { ComposerMenuSurface } from './ComposerMenuSurface';
import type {
  ModelOptionDto,
  ReasoningEffortDto,
  SandboxModeDto,
  ThreadContextUsageDto,
  UpdateThreadSettingsInput,
} from '@remote-codex/shared';
import { Check, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { InputGroupButton } from '../graph-ui/InputGroup';
import type { SettingsMenu } from './types';
import { formatReasoningEffortLabel } from './composerUtils';
import { ContextProgressBar } from './composerPresentation';

const sandboxOptions: Array<{
  mode: SandboxModeDto;
  label: string;
}> = [
  { mode: 'read-only', label: 'Read only' },
  { mode: 'workspace-write', label: 'Workspace write' },
  { mode: 'danger-full-access', label: 'Danger' },
];

function formatSandboxModeLabel(mode: SandboxModeDto | null | undefined) {
  return (
    sandboxOptions.find(
      (entry) => entry.mode === (mode ?? 'danger-full-access'),
    )?.label ?? 'Danger'
  );
}

function formatSandboxModeCompactLabel(
  mode: SandboxModeDto | null | undefined,
) {
  switch (mode) {
    case 'read-only':
      return 'RO';
    case 'workspace-write':
      return 'WW';
    case 'danger-full-access':
      return 'Full';
    default:
      return 'Full';
  }
}

export function ComposerSettingsToolbar({
  openMenu,
  model,
  modelOptions,
  modelContextTitle,
  contextUsage,
  reasoningEffort,
  supportedEfforts,
  sandboxMode,
  sandboxModeAvailable,
  settingsBusy,
  goalComposeMode,
  goalBusy,
  activeView,
  disabled,
  fastMode,
  sendButtonLabel,
  sendButtonClassName,
  modelControlsDisabled,
  effortControlsDisabled,
  effortControlTitle,
  inlineToggleClassName,
  menuItemClassName,
  sendButtonBaseClassName,
  onSetOpenMenu,
  onUpdateSettings,
}: {
  openMenu: SettingsMenu;
  model: string | null | undefined;
  modelOptions: ModelOptionDto[];
  modelContextTitle: string;
  contextUsage: ThreadContextUsageDto | null | undefined;
  reasoningEffort: ReasoningEffortDto | null | undefined;
  supportedEfforts: ModelOptionDto['supportedReasoningEfforts'];
  sandboxMode: SandboxModeDto | null | undefined;
  sandboxModeAvailable: boolean;
  settingsBusy: boolean;
  goalComposeMode: boolean;
  goalBusy: boolean;
  activeView: 'chat' | 'shell';
  disabled: boolean;
  fastMode: boolean;
  sendButtonLabel: string;
  sendButtonClassName: string;
  modelControlsDisabled: boolean;
  effortControlsDisabled: boolean;
  effortControlTitle: string;
  inlineToggleClassName: string;
  menuItemClassName: string;
  sendButtonBaseClassName: string;
  onSetOpenMenu: (updater: (current: SettingsMenu) => SettingsMenu) => void;
  onUpdateSettings: (input: UpdateThreadSettingsInput) => void;
}) {
  const [settingsSection, setSettingsSection] = useState<
    'model' | 'effort' | null
  >(null);
  const selectedModelLabel = (
    modelOptions.find((entry) => entry.model === model)?.displayName ||
    model ||
    'Select model'
  ).replace(/\s+\([^)]+\)\s*$/, '');

  return (
    <>
      <div className="relative min-w-0">
        <InputGroupButton
          type="button"
          variant="ghost"
          size="xs"
          data-composer-menu-trigger="true"
          aria-haspopup="menu"
          aria-expanded={openMenu === 'model'}
          aria-label={`Model and effort: ${selectedModelLabel}, ${formatReasoningEffortLabel(reasoningEffort)}`}
          disabled={modelControlsDisabled || modelOptions.length === 0}
          onClick={() => {
            setSettingsSection(null);
            onSetOpenMenu((current) => (current === 'model' ? null : 'model'));
          }}
          title={
            fastMode
              ? `Fast mode is on. Turn it off from the slash toolbox to edit model. ${modelContextTitle}`
              : modelContextTitle
          }
          className={`${inlineToggleClassName} relative min-w-0 max-w-[10rem] overflow-hidden rounded-full px-2.5 text-left text-stone-300 disabled:cursor-not-allowed disabled:text-stone-600 sm:max-w-[14rem]`}
        >
          <span className="relative z-[1] block min-w-0 truncate whitespace-nowrap">
            {selectedModelLabel} · {formatReasoningEffortLabel(reasoningEffort)}
          </span>
        </InputGroupButton>
        {model ? <ContextProgressBar contextUsage={contextUsage} /> : null}
        {openMenu === 'model' && (
          <ComposerMenuSurface
            align="end"
            className="w-[13.5rem] rounded-xl border border-stone-700 bg-stone-900 p-1.5 shadow-2xl shadow-stone-950/40"
          >
            <button
              type="button"
              onClick={() => setSettingsSection('model')}
              className={`${menuItemClassName} flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-stone-300`}
            >
              <span>Model</span>
              <span className="flex min-w-0 items-center gap-1 text-stone-500">
                <span className="max-w-[7rem] truncate">
                  {selectedModelLabel}
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              </span>
            </button>
            <button
              type="button"
              disabled={effortControlsDisabled}
              title={effortControlTitle}
              onClick={() => setSettingsSection('effort')}
              className={`${menuItemClassName} flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-stone-300 disabled:cursor-not-allowed disabled:text-stone-600`}
            >
              <span>Effort</span>
              <span className="flex items-center gap-1 text-stone-500">
                {formatReasoningEffortLabel(reasoningEffort)}
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </button>

            {settingsSection === 'model' ? (
              <div className="mt-1 w-full overflow-hidden border-t border-stone-700 bg-stone-900 p-1.5">
                <p className="px-3 py-1.5 text-xs text-stone-500">Model</p>
                <div className="max-h-72 overflow-auto">
                  {modelOptions.map((entry) => {
                    const selected = entry.model === model;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          const nextEffort =
                            reasoningEffort &&
                            entry.supportedReasoningEfforts.some(
                              (effort) =>
                                effort.reasoningEffort === reasoningEffort,
                            )
                              ? reasoningEffort
                              : entry.defaultReasoningEffort;
                          onUpdateSettings({
                            model: entry.model,
                            reasoningEffort: nextEffort,
                          });
                          onSetOpenMenu(() => null);
                        }}
                        className={`${menuItemClassName} flex w-full items-center justify-between rounded-lg px-3 py-2 text-left ${
                          selected ? 'ui-status-warning' : 'text-stone-300'
                        }`}
                      >
                        <span className="truncate text-sm font-medium">
                          {entry.displayName || entry.model}
                        </span>
                        {selected ? (
                          <Check className="h-3.5 w-3.5 shrink-0" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {settingsSection === 'effort' ? (
              <div className="mt-1 w-full overflow-hidden border-t border-stone-700 bg-stone-900 p-1.5">
                <p className="px-3 py-1.5 text-xs text-stone-500">Effort</p>
                {supportedEfforts.map((entry) => {
                  const selected = entry.reasoningEffort === reasoningEffort;
                  return (
                    <button
                      key={entry.reasoningEffort}
                      type="button"
                      onClick={() => {
                        onUpdateSettings({
                          reasoningEffort: entry.reasoningEffort,
                        });
                        onSetOpenMenu(() => null);
                      }}
                      className={`${menuItemClassName} flex w-full items-center justify-between rounded-lg px-3 py-2 text-left ${
                        selected ? 'ui-status-warning' : 'text-stone-300'
                      }`}
                    >
                      <span className="text-sm font-medium">
                        {formatReasoningEffortLabel(entry.reasoningEffort)}
                      </span>
                      {selected ? <Check className="h-3.5 w-3.5" /> : null}
                    </button>
                  );
                })}
                {supportedEfforts.some(
                  (entry) => entry.reasoningEffort === 'ultra',
                ) ? (
                  <p className="px-3 pb-1 pt-2 text-xs leading-4 text-stone-500">
                    Higher effort can consume usage limits faster.
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="mt-1 border-t border-[var(--theme-border)] px-3 py-2 text-xs leading-5 text-[var(--theme-fg-muted)]" aria-label="Context usage">
              {modelContextTitle}
            </div>
          </ComposerMenuSurface>
        )}
      </div>

      {sandboxModeAvailable && (
        <div className="relative">
          <InputGroupButton
            type="button"
            variant="ghost"
            size="xs"
            data-composer-menu-trigger="true"
            aria-haspopup="menu"
            aria-expanded={openMenu === 'sandbox'}
            aria-label={`Sandbox: ${formatSandboxModeLabel(sandboxMode)}`}
            disabled={settingsBusy}
            onClick={() =>
              onSetOpenMenu((current) =>
                current === 'sandbox' ? null : 'sandbox',
              )
            }
            title={`Sandbox: ${formatSandboxModeLabel(sandboxMode)}`}
            className={`${inlineToggleClassName} rounded-full px-2.5 text-stone-300 disabled:cursor-not-allowed disabled:text-stone-700`}
          >
            {formatSandboxModeCompactLabel(sandboxMode)}
          </InputGroupButton>
          {openMenu === 'sandbox' && (
            <ComposerMenuSurface
              align="end"
              className="w-max min-w-[9rem] rounded-2xl border border-stone-700 bg-stone-900 shadow-2xl shadow-stone-950/40"
            >
              <div className="max-h-72 overflow-auto p-2">
                {sandboxOptions.map((entry) => (
                  <button
                    key={entry.mode}
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        sandboxMode: entry.mode,
                      })
                    }
                    className={`block w-full rounded-xl px-3 py-2 text-left transition ${
                      entry.mode === (sandboxMode ?? 'danger-full-access')
                        ? 'ui-status-warning'
                        : `${menuItemClassName} text-stone-300`
                    }`}
                  >
                    <p className="text-sm font-medium">{entry.label}</p>
                  </button>
                ))}
              </div>
            </ComposerMenuSurface>
          )}
        </div>
      )}

      <InputGroupButton
        type="submit"
        variant="default"
        size="icon-xs"
        aria-label={goalComposeMode ? 'Set goal' : 'Send Prompt'}
        title={sendButtonLabel}
        disabled={goalBusy || (activeView === 'chat' ? disabled : false)}
        className={`${sendButtonBaseClassName} h-9 w-9 rounded-full text-sm font-medium disabled:cursor-not-allowed sm:h-8 sm:w-8 ${sendButtonClassName}`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="h-4 w-4 fill-none stroke-current"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 13V3" />
          <path d="m4 7 4-4 4 4" />
        </svg>
      </InputGroupButton>
    </>
  );
}
