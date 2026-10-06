import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { TimelineTurn } from './timelineItems';
import { TurnStatusBar } from './turnStatus';

function activeTurn(overrides: Partial<TimelineTurn> = {}): TimelineTurn {
  return {
    id: 'turn-1',
    status: 'inProgress',
    startedAt: '2026-09-02T15:20:00.000Z',
    error: null,
    model: 'gpt-5.4',
    reasoningEffort: 'medium',
    reasoningEffortAvailable: true,
    tokenUsage: null,
    priceEstimate: null,
    items: [],
    ...overrides,
  };
}

describe('TurnStatusBar footer', () => {
  it('explains background work after a reply and clears the label when the turn ends', () => {
    const html = renderToStaticMarkup(
      <TurnStatusBar turn={activeTurn()} variant="footer" backgroundAgentCount={1} />,
    );
    expect(html).toContain('1 background agent running');
    expect(html).not.toContain('animate-pulse');
    expect(html).toContain('gpt-5.4 · medium');
    const done = renderToStaticMarkup(
      <TurnStatusBar turn={activeTurn({ status: 'completed' })} variant="footer" backgroundAgentCount={1} />,
    );
    expect(done).not.toContain('background agent');
    const confirming = renderToStaticMarkup(
      <TurnStatusBar turn={activeTurn({ status: 'recovering' })} variant="footer" backgroundAgentCount={1} />,
    );
    expect(confirming).not.toContain('background agent');
  });

  it('renders a compact transparent summary without unavailable cost or tokens', () => {
    const now = Date.now();
    const html = renderToStaticMarkup(
      <TurnStatusBar
        turn={activeTurn({
          startedAt: new Date(now - 72_000).toISOString(),
        })}
        variant="footer"
        lastActivityAt="2026-09-02T15:20:48.000Z"
      />,
    );

    expect(html).toContain('thread-graph-turn-footer');
    expect(html).toContain('gpt-5.4 · medium');
    expect(html).toContain('1m 12s');
    expect(html.match(/animate-pulse/g)).toHaveLength(3);
    expect(html).not.toContain('token-badge');
    expect(html).not.toContain('--');
  });

  it('shows reported cost, including a real zero estimate', () => {
    const priceEstimate: NonNullable<TimelineTurn['priceEstimate']> = {
      pricingModelKey: 'gpt-5.4',
      pricingTierKey: 'standard',
      currency: 'USD',
      inputUsd: 0.01,
      cachedInputUsd: 0,
      outputUsd: 0.02,
      totalUsd: 0.03,
    };
    const pricedHtml = renderToStaticMarkup(
      <TurnStatusBar
        turn={activeTurn({ priceEstimate })}
        variant="footer"
      />,
    );
    const zeroHtml = renderToStaticMarkup(
      <TurnStatusBar
        turn={activeTurn({
          priceEstimate: { ...priceEstimate, totalUsd: 0 },
        })}
        variant="footer"
      />,
    );

    expect(pricedHtml).toContain('$0.030');
    expect(zeroHtml).toContain('$0');
  });

  it('shows a compact live total and model effort without inline token breakdowns', () => {
    const total = { totalTokens: 3500, inputTokens: 1500, outputTokens: 2000, cachedInputTokens: 500, reasoningOutputTokens: 800 };
    const html = renderToStaticMarkup(
      <TurnStatusBar
        turn={activeTurn({
          reasoningEffortAvailable: null,
          tokenUsage: { total, last: total, modelContextWindow: 128000 },
        })}
        variant="footer"
      />,
    );
    expect(html).toContain('gpt-5.4 · medium');
    expect(html).toContain('Total tokens: 3,500');
    expect(html).not.toContain('1k in');
    expect(html).not.toContain('2k out');
    expect(html).not.toContain('500 cached');
    expect(html).toContain('Price unavailable');
    expect(html).not.toContain('$0');
  });
});
