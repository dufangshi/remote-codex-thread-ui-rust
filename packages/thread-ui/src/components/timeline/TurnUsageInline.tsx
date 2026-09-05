import type { TimelineTurn } from './timelineItems';
import {
  buildTurnTokenDetails,
  formatCompactTokenCount,
  formatCompactUsd,
  formatDetailedUsd,
} from './tokenFormatting';

export function formatTurnRuntimeSummary(turn: TimelineTurn) {
  const model = turn.model?.trim() || 'Model unavailable';
  const effort = turn.reasoningEffort?.trim();
  return effort ? `${model} · ${effort}` : model;
}

/** Non-interactive so it can also live inside the worked-duration toggle. */
export function TurnUsageInline({ turn }: { turn: TimelineTurn }) {
  const usage = turn.tokenUsage?.total;
  const price = turn.priceEstimate;
  const hasPrice =
    price && Number.isFinite(price.totalUsd) && price.totalUsd >= 0;
  const counts = usage
    ? [
        { label: 'tokens', value: usage.totalTokens, title: 'Total tokens' },
        {
          label: 'in',
          value: usage.inputTokens,
          title: 'Input tokens (including cached input)',
        },
        {
          label: 'out',
          value: usage.outputTokens,
          title: 'Output tokens (including reasoning)',
        },
        {
          label: 'cached',
          value: usage.cachedInputTokens,
          title: 'Cached input tokens',
        },
        ...(usage.cacheWriteInputTokens
          ? [
              {
                label: 'cache write',
                value: usage.cacheWriteInputTokens,
                title: 'Cache write input tokens',
              },
            ]
          : []),
      ]
    : [];
  const priceTitle = hasPrice
    ? [
        `Estimated API cost: ${formatDetailedUsd(price.totalUsd)} USD (${price.pricingTierKey})`,
        ...buildTurnTokenDetails(turn).map(
          (detail) =>
            `${detail.label}: ${detail.tokenRawValue.toLocaleString('en-US')} tokens · ${detail.usdCompactValue}`,
        ),
      ].join('\n')
    : 'API price unavailable for this model or usage report.';

  return (
    <span className="thread-turn-usage" data-testid="turn-usage">
      <span
        className="thread-turn-usage-model"
        title={formatTurnRuntimeSummary(turn)}
      >
        {formatTurnRuntimeSummary(turn)}
      </span>
      {counts.length > 0 ? (
        <span
          className="thread-turn-usage-tokens"
          aria-label="Turn token usage"
        >
          {counts.map(({ label, value, title }) => (
            <span
              key={label}
              title={`${title}: ${value.toLocaleString('en-US')}`}
            >
              <span className="thread-turn-usage-value">
                {formatCompactTokenCount(value)}
              </span>{' '}
              {label}
            </span>
          ))}
        </span>
      ) : null}
      {hasPrice ? (
        <span className="thread-turn-usage-price" title={priceTitle}>
          ≈{formatCompactUsd(price.totalUsd)}
        </span>
      ) : usage ? (
        <span className="thread-turn-usage-unavailable" title={priceTitle}>
          Price unavailable
        </span>
      ) : null}
    </span>
  );
}
