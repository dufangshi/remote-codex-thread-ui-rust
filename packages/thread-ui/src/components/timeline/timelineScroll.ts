import type { ThreadHistoryItemDto } from '@pockymoe/shared';

import type { TimelineTurn } from './timelineItems';

export const INITIAL_VISIBLE_TURNS = 3;
export const LOAD_STEP = 3;
export const FOLLOW_TAIL_THRESHOLD_PX = 80;

export function isNearBottom(
  container: Pick<
    HTMLDivElement,
    'scrollHeight' | 'scrollTop' | 'clientHeight'
  >,
  threshold = FOLLOW_TAIL_THRESHOLD_PX,
) {
  const distanceFromBottom =
    container.scrollHeight - container.scrollTop - container.clientHeight;
  return distanceFromBottom <= threshold;
}

export function isElementVisible(
  container: Pick<HTMLDivElement, 'getBoundingClientRect'>,
  element: Pick<HTMLElement, 'getBoundingClientRect'>,
) {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const visibleTop = Math.max(containerRect.top, elementRect.top);
  const visibleBottom = Math.min(containerRect.bottom, elementRect.bottom);
  const visibleHeight = Math.max(0, visibleBottom - visibleTop);
  return visibleHeight > 0;
}

export function inferTurnStartedAtFromItems(items: ThreadHistoryItemDto[]) {
  const createdAt = items
    .map((item) => {
      const value = (item as ThreadHistoryItemDto & { createdAt?: unknown })
        .createdAt;
      return typeof value === 'string' && value.trim() ? value : null;
    })
    .filter((value): value is string => Boolean(value))
    .sort();

  return createdAt[0] ?? null;
}

export function buildSyntheticLiveTurn(
  turnId: string,
  items: ThreadHistoryItemDto[],
): TimelineTurn {
  return {
    id: turnId,
    startedAt: inferTurnStartedAtFromItems(items),
    status: 'inProgress',
    error: null,
    model: null,
    reasoningEffort: null,
    reasoningEffortAvailable: null,
    tokenUsage: null,
    priceEstimate: null,
    items: [],
  };
}
