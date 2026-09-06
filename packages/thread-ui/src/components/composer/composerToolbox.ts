import type {
  AgentBackendToolboxItemSchemaDto,
  ThreadGoalStatusDto,
} from '@remote-codex/shared';

import { goalStatusLabel } from './composerPresentation';
import type { SlashPanelView } from './types';

export type ToolboxActionDecision =
  | { type: 'toggleFast'; fastMode: boolean }
  | { type: 'runCompact' }
  | { type: 'enterGoalCompose' }
  | { type: 'exitGoalCompose' }
  | { type: 'openPanel'; panel: Exclude<SlashPanelView, 'root' | 'forkTurns'> }
  | { type: 'insertPrompt'; text: string }
  | { type: 'noop' };

export interface ToolboxItemCapabilities {
  compact: boolean;
  fast: boolean;
  fork: boolean;
  goal: boolean;
  hooks: boolean;
  mcp: boolean;
  skills: boolean;
}

export function filterToolboxItemsForCapabilities(
  toolboxItems: AgentBackendToolboxItemSchemaDto[] | null | undefined,
  capabilities: ToolboxItemCapabilities,
) {
  return (toolboxItems ?? []).filter((item) => {
    // Skill invocations are still valid prompts, but are not toolbox actions.
    // Also filter older supervisors which advertise each /$skill separately.
    if (item.command.trim().replace(/^\/+/, '').startsWith('$')) return false;
    switch (item.action) {
      case 'fast':
        return capabilities.fast;
      case 'compact':
        return capabilities.compact;
      case 'goal':
        return capabilities.goal;
      case 'fork':
        return capabilities.fork;
      case 'skills':
        return capabilities.skills;
      case 'mcp':
        return capabilities.mcp;
      case 'hooks':
        return capabilities.hooks;
      case 'prompt':
      case 'unsupported':
        return true;
      default:
        return false;
    }
  });
}

export function toolboxItemActionDecision(
  item: AgentBackendToolboxItemSchemaDto,
  {
    fastMode,
    goalComposeMode,
  }: {
    fastMode: boolean;
    goalComposeMode: boolean;
  },
): ToolboxActionDecision {
  switch (item.action) {
    case 'fast':
      return { type: 'toggleFast', fastMode: !fastMode };
    case 'compact':
      return { type: 'runCompact' };
    case 'goal':
      return goalComposeMode
        ? { type: 'exitGoalCompose' }
        : { type: 'enterGoalCompose' };
    case 'fork':
    case 'skills':
    case 'mcp':
    case 'hooks':
      return { type: 'openPanel', panel: item.action };
    case 'prompt':
      return { type: 'insertPrompt', text: `${item.command} ` };
    default:
      return { type: 'noop' };
  }
}

export function toolboxItemStatus(
  item: AgentBackendToolboxItemSchemaDto,
  {
    fastMode,
    compactBusy,
    goalComposeMode,
    goalStatus,
    busy,
  }: {
    fastMode: boolean;
    compactBusy: boolean;
    goalComposeMode: boolean;
    goalStatus: ThreadGoalStatusDto | null | undefined;
    busy: boolean;
  },
) {
  switch (item.action) {
    case 'fast':
      return fastMode ? 'On' : 'Off';
    case 'compact':
      return compactBusy ? 'Busy' : 'Run';
    case 'goal':
      return goalComposeMode
        ? 'Composing'
        : goalStatus
          ? goalStatusLabel(goalStatus)
          : 'Open';
    case 'fork':
      return busy ? 'Idle only' : 'Open';
    case 'skills':
    case 'mcp':
    case 'hooks':
      return 'View';
    case 'prompt':
      return 'Compose';
    case 'unsupported':
      return 'Unavailable';
    default:
      return '';
  }
}

export function toolboxItemDisabled(
  item: AgentBackendToolboxItemSchemaDto,
  {
    settingsBusy,
    compactBusy,
    busy,
    forkBusy,
  }: {
    settingsBusy: boolean;
    compactBusy: boolean;
    busy: boolean;
    forkBusy: boolean;
  },
) {
  switch (item.action) {
    case 'fast':
      return settingsBusy;
    case 'compact':
      return compactBusy || busy;
    case 'fork':
      return busy || forkBusy;
    case 'unsupported':
      return true;
    default:
      return false;
  }
}

export function toolboxItemClassName(
  item: AgentBackendToolboxItemSchemaDto,
  {
    fastMode,
    goalComposeMode,
    goalStatus,
    menuItemClassName,
  }: {
    fastMode: boolean;
    goalComposeMode: boolean;
    goalStatus: ThreadGoalStatusDto | null | undefined;
    menuItemClassName: string;
  },
) {
  const active =
    (item.action === 'fast' && fastMode) ||
    (item.action === 'goal' &&
      (goalComposeMode || goalStatus === 'active'));
  return `${active ? 'ui-status-warning' : menuItemClassName} mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60`;
}
