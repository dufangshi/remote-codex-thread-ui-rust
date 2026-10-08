import { translate, useI18n } from "../../i18n";
import type {
  ModelOptionDto,
  ReasoningEffortDto,
  SandboxModeDto,
  ThreadContextUsageDto,
  UpdateThreadSettingsInput,
} from "@remote-codex/shared";
import type { ReactNode } from "react";

import { InputGroupButton } from "../graph-ui/InputGroup";
import type { SettingsMenu } from "./types";
import { formatReasoningEffortLabel } from "./composerUtils";
import { ContextProgressBar } from "./composerPresentation";

export function ComposerSettingsToolbar({
  model,
  modelOptions,
  modelContextTitle,
  contextUsage,
  reasoningEffort,
  goalComposeMode,
  goalBusy,
  activeView,
  disabled,
  sendButtonLabel,
  sendButtonClassName,
  sendButtonBaseClassName,
  beforeSend,
}: {
  beforeSend?: ReactNode;
  openMenu: SettingsMenu;
  model: string | null | undefined;
  modelOptions: ModelOptionDto[];
  modelContextTitle: string;
  contextUsage: ThreadContextUsageDto | null | undefined;
  reasoningEffort: ReasoningEffortDto | null | undefined;
  supportedEfforts: ModelOptionDto["supportedReasoningEfforts"];
  sandboxMode: SandboxModeDto | null | undefined;
  sandboxModeAvailable: boolean;
  settingsBusy: boolean;
  goalComposeMode: boolean;
  goalBusy: boolean;
  activeView: "chat" | "shell";
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
  useI18n();
  const selectedModelLabel =
    modelOptions.find((entry) => entry.model === model)?.displayName ||
    model ||
    translate("chat.selectModel");

  return (
    <>
      <div className="composer-model-control relative min-w-0">
        <span
          data-testid="composer-model-label"
          title={`${selectedModelLabel} · ${formatReasoningEffortLabel(reasoningEffort)}\n${modelContextTitle}`}
          className="composer-model-label block truncate whitespace-nowrap px-1 text-xs text-stone-400"
        >
          {selectedModelLabel}
        </span>
        {model ? <ContextProgressBar contextUsage={contextUsage} /> : null}
      </div>

      {beforeSend}
      <InputGroupButton
        type="submit"
        variant="default"
        size="icon-xs"
        aria-label={
          goalComposeMode
            ? translate("chat.setGoal")
            : translate("chat.sendPrompt")
        }
        title={sendButtonLabel}
        disabled={goalBusy || (activeView === "chat" ? disabled : false)}
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
