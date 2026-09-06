import { describe, expect, it } from 'vitest';
import type { ThreadTurnDto } from '@remote-codex/shared';
import { transcriptSnapshot } from './PublicTranscript';

describe('transcriptSnapshot', () => {
  const turn = {
    id: 'turn', status: 'completed', model: 'gpt-6-astra',
    startedAt: '2026-09-06T01:00:00Z', completedAt: '2026-09-06T01:01:00Z',
    items: [
      {id: 'u', kind: 'userMessage', text: 'Initial prompt'},
      {id: 'op', kind: 'commandExecution', text: 'private command'},
      {id: 'c', kind: 'agentMessage', text: 'private progress', phase: 'commentary'},
      {id: 's', kind: 'userMessage', text: 'Steered prompt'},
      {id: 'a', kind: 'agentMessage', text: '完整回复'.repeat(4000), previewText: 'truncated'},
    ],
  } as ThreadTurnDto;
  it('keeps complete replies and steer prompts but excludes private activity', () => {
    const snapshot = transcriptSnapshot('Title', [turn], 'dark');
    expect(snapshot.turns[0]?.messages.map(message => message.text)).toEqual([
      'Initial prompt', 'Steered prompt', '完整回复'.repeat(4000),
    ]);
    expect(snapshot.turns[0]?.completedAt).toBe(turn.completedAt);
    expect(snapshot.turns[0]?.model).toBe(turn.model);
    expect(JSON.stringify(snapshot)).not.toContain('private');
  });
  it('does not publish an unfinished assistant reply as a final answer', () => {
    const snapshot = transcriptSnapshot('Title', [{...turn, status: 'inProgress'}], 'light');
    expect(snapshot.turns[0]?.messages.every(message=>message.role==='user')).toBe(true);
  });
});
