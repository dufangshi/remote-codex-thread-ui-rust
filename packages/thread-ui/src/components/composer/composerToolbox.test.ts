import { describe, expect, it } from 'vitest';

import type { AgentBackendToolboxItemSchemaDto } from '@remote-codex/shared';

import {
  filterToolboxItemsForCapabilities,
  toolboxItemActionDecision,
  toolboxItemClassName,
  toolboxItemDisabled,
  toolboxItemStatus,
} from './composerToolbox';

function item(
  action: AgentBackendToolboxItemSchemaDto['action'],
): AgentBackendToolboxItemSchemaDto {
  return {
    action,
    command: `/${action}`,
    label: action,
  };
}

describe('composerToolbox', () => {
  it('filters backend toolbox items by backend capabilities', () => {
    const items: AgentBackendToolboxItemSchemaDto[] = [
      item('fast'),
      item('compact'),
      item('goal'),
      item('fork'),
      item('skills'),
      item('mcp'),
      item('hooks'),
      {
        action: 'prompt',
        command: '/btw',
        label: '/btw',
      },
      { action: 'prompt', command: '/$release-runtime', label: 'Release skill' },
      { action: 'prompt', command: ' /$plugin:skill', label: 'Plugin skill' },
      item('unsupported'),
    ];

    expect(
      filterToolboxItemsForCapabilities(items, {
        compact: true,
        fast: false,
        fork: false,
        goal: true,
        hooks: false,
        mcp: false,
        skills: true,
      }).map((entry) => entry.action),
    ).toEqual(['compact', 'goal', 'skills', 'prompt', 'unsupported']);
  });

  it('derives action decisions without running side effects', () => {
    expect(
      toolboxItemActionDecision(item('fast'), {
        fastMode: false,
        goalComposeMode: false,
      }),
    ).toEqual({ type: 'toggleFast', fastMode: true });
    expect(
      toolboxItemActionDecision(item('compact'), {
        fastMode: false,
        goalComposeMode: false,
      }),
    ).toEqual({ type: 'runCompact' });
    expect(
      toolboxItemActionDecision(item('goal'), {
        fastMode: false,
        goalComposeMode: false,
      }),
    ).toEqual({ type: 'enterGoalCompose' });
    expect(
      toolboxItemActionDecision(item('goal'), {
        fastMode: false,
        goalComposeMode: true,
      }),
    ).toEqual({ type: 'exitGoalCompose' });
    expect(
      toolboxItemActionDecision(item('mcp'), {
        fastMode: false,
        goalComposeMode: false,
      }),
    ).toEqual({ type: 'openPanel', panel: 'mcp' });
    expect(
      toolboxItemActionDecision({
        action: 'prompt',
        command: '/compact',
        label: '/compact',
      }, {
        fastMode: false,
        goalComposeMode: false,
      }),
    ).toEqual({ type: 'insertPrompt', text: '/compact ' });
    expect(
      toolboxItemActionDecision(item('unsupported'), {
        fastMode: false,
        goalComposeMode: false,
      }),
    ).toEqual({ type: 'noop' });
  });

  it('derives status labels for root toolbox actions', () => {
    expect(
      toolboxItemStatus(item('fast'), {
        fastMode: true,
        compactBusy: false,
        goalComposeMode: false,
        goalStatus: null,
        busy: false,
      }),
    ).toBe('On');
    expect(
      toolboxItemStatus(item('compact'), {
        fastMode: false,
        compactBusy: true,
        goalComposeMode: false,
        goalStatus: null,
        busy: false,
      }),
    ).toBe('Busy');
    expect(
      toolboxItemStatus(item('goal'), {
        fastMode: false,
        compactBusy: false,
        goalComposeMode: true,
        goalStatus: 'paused',
        busy: false,
      }),
    ).toBe('Composing');
    expect(
      toolboxItemStatus(item('goal'), {
        fastMode: false,
        compactBusy: false,
        goalComposeMode: false,
        goalStatus: 'budgetLimited',
        busy: false,
      }),
    ).toBe('Budget');
    expect(
      toolboxItemStatus(item('fork'), {
        fastMode: false,
        compactBusy: false,
        goalComposeMode: false,
        goalStatus: null,
        busy: true,
      }),
    ).toBe('Idle only');
    expect(
      toolboxItemStatus(item('skills'), {
        fastMode: false,
        compactBusy: false,
        goalComposeMode: false,
        goalStatus: null,
        busy: false,
      }),
    ).toBe('View');
    expect(
      toolboxItemStatus(item('prompt'), {
        fastMode: false,
        compactBusy: false,
        goalComposeMode: false,
        goalStatus: null,
        busy: false,
      }),
    ).toBe('Compose');
    expect(
      toolboxItemStatus(item('unsupported'), {
        fastMode: false,
        compactBusy: false,
        goalComposeMode: false,
        goalStatus: null,
        busy: false,
      }),
    ).toBe('Unavailable');
  });

  it('disables actions that require idle state or settings availability', () => {
    expect(
      toolboxItemDisabled(item('fast'), {
        settingsBusy: true,
        compactBusy: false,
        busy: false,
        forkBusy: false,
      }),
    ).toBe(true);
    expect(
      toolboxItemDisabled(item('compact'), {
        settingsBusy: false,
        compactBusy: false,
        busy: true,
        forkBusy: false,
      }),
    ).toBe(true);
    expect(
      toolboxItemDisabled(item('fork'), {
        settingsBusy: false,
        compactBusy: false,
        busy: false,
        forkBusy: true,
      }),
    ).toBe(true);
    expect(
      toolboxItemDisabled(item('hooks'), {
        settingsBusy: true,
        compactBusy: true,
        busy: true,
        forkBusy: true,
      }),
    ).toBe(false);
    expect(
      toolboxItemDisabled(item('unsupported'), {
        settingsBusy: false,
        compactBusy: false,
        busy: false,
        forkBusy: false,
      }),
    ).toBe(true);
  });

  it('marks active fast and goal actions with warning styling', () => {
    expect(
      toolboxItemClassName(item('fast'), {
        fastMode: true,
        goalComposeMode: false,
        goalStatus: null,
        menuItemClassName: 'menu-item',
      }),
    ).toContain('ui-status-warning');
    expect(
      toolboxItemClassName(item('goal'), {
        fastMode: false,
        goalComposeMode: false,
        goalStatus: 'active',
        menuItemClassName: 'menu-item',
      }),
    ).toContain('ui-status-warning');
    expect(
      toolboxItemClassName(item('mcp'), {
        fastMode: false,
        goalComposeMode: false,
        goalStatus: null,
        menuItemClassName: 'menu-item',
      }),
    ).toContain('menu-item');
  });
});
