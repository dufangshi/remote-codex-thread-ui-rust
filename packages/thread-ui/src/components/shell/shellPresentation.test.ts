import { describe, expect, it } from 'vitest';

import {
  basenameFromPath,
  buildPromptLabel,
  clampPaneRatio,
  statusLabel,
  terminalThemeFor,
} from './shellPresentation';

describe('shell presentation helpers', () => {
  it('formats shell status labels', () => {
    expect(statusLabel('not_created')).toBe('Not created');
    expect(statusLabel('attached')).toBe('Attached');
    expect(statusLabel('workspace_missing')).toBe('Workspace missing');
  });

  it('builds compact path and prompt labels', () => {
    expect(basenameFromPath('/home/u/project/')).toBe('project');
    expect(basenameFromPath('C:\\Users\\me\\repo')).toBe('repo');
    expect(basenameFromPath(null)).toBe('');
    expect(buildPromptLabel('repo', 'venv')).toBe('venv repo');
    expect(buildPromptLabel('repo', null)).toBe('repo');
    expect(buildPromptLabel('', '  ')).toBeNull();
  });

  it('clamps pane ratios and selects theme colors', () => {
    expect(clampPaneRatio(10)).toBe(25);
    expect(clampPaneRatio(50)).toBe(50);
    expect(clampPaneRatio(90)).toBe(75);
    // The terminal matches the workbench panel surfaces.
    expect(terminalThemeFor('light').background).toBe('#ebeeeb');
    expect(terminalThemeFor('dark').background).toBe('#0f1317');
  });
});
