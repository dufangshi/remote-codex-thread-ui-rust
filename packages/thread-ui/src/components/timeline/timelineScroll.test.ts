import { describe, expect, it } from 'vitest';

import type { ThreadHistoryItemDto } from '@pockymoe/shared';
import {
  FOLLOW_TAIL_THRESHOLD_PX,
  buildSyntheticLiveTurn,
  inferTurnStartedAtFromItems,
  isElementVisible,
  isNearBottom,
} from './timelineScroll';

function item(
  id: string,
  extra: Partial<ThreadHistoryItemDto> & { createdAt?: unknown } = {},
): ThreadHistoryItemDto {
  return {
    id,
    kind: 'agentMessage',
    text: id,
    ...extra,
  } as ThreadHistoryItemDto;
}

function rect(top: number, bottom: number): DOMRect {
  return {
    top,
    bottom,
    left: 0,
    right: 100,
    width: 100,
    height: bottom - top,
    x: 0,
    y: top,
    toJSON: () => ({}),
  };
}

describe('timeline scroll utilities', () => {
  it('detects whether a scroll container is close to the bottom', () => {
    expect(
      isNearBottom({
        scrollHeight: 1000,
        scrollTop: 700,
        clientHeight: 220,
      }),
    ).toBe(true);
    expect(
      isNearBottom({
        scrollHeight: 1000,
        scrollTop: 699,
        clientHeight: 220,
      }),
    ).toBe(false);
    expect(
      isNearBottom(
        {
          scrollHeight: 1000,
          scrollTop: 899,
          clientHeight: 100,
        },
        1,
      ),
    ).toBe(true);
    expect(FOLLOW_TAIL_THRESHOLD_PX).toBe(80);
  });

  it('detects vertical intersection with a sentinel element', () => {
    const container = {
      getBoundingClientRect: () => rect(100, 300),
    };

    expect(
      isElementVisible(container, {
        getBoundingClientRect: () => rect(90, 110),
      }),
    ).toBe(true);
    expect(
      isElementVisible(container, {
        getBoundingClientRect: () => rect(290, 310),
      }),
    ).toBe(true);
    expect(
      isElementVisible(container, {
        getBoundingClientRect: () => rect(300, 320),
      }),
    ).toBe(false);
    expect(
      isElementVisible(container, {
        getBoundingClientRect: () => rect(50, 100),
      }),
    ).toBe(false);
  });

  it('infers live turn start time from the earliest item timestamp', () => {
    expect(
      inferTurnStartedAtFromItems([
        item('later', { createdAt: '2026-06-10T10:00:00.000Z' }),
        item('missing'),
        item('earlier', { createdAt: '2026-06-10T09:00:00.000Z' }),
      ]),
    ).toBe('2026-06-10T09:00:00.000Z');
    expect(inferTurnStartedAtFromItems([item('missing')])).toBeNull();
  });

  it('builds a synthetic in-progress turn for orphan live items', () => {
    const turn = buildSyntheticLiveTurn('live-turn', [
      item('entry', { createdAt: '2026-06-10T09:00:00.000Z' }),
    ]);

    expect(turn).toMatchObject({
      id: 'live-turn',
      startedAt: '2026-06-10T09:00:00.000Z',
      status: 'inProgress',
      items: [],
      error: null,
      model: null,
    });
  });
});
