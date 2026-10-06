import { TokenUsageCost } from './TokenUsageCost';
import type { TimelineTurn } from './timelineItems';
import { formatCompactTokenCount } from './tokenFormatting';

export function formatTurnRuntimeSummary(turn: TimelineTurn) {
  const model = turn.model?.trim() || 'Model unavailable';
  const effort = turn.reasoningEffort?.trim();
  return effort ? `${model} · ${effort}` : model;
}

export function TurnUsageInline({
  turn,
  readOnly = false,
  speedMode = 'recent',
}: {
  turn: TimelineTurn;
  readOnly?: boolean;
  speedMode?: 'average' | 'recent';
}) {
  const usage = turn.tokenUsage?.total;
  const price = turn.priceEstimate;
  const active = ['inProgress', 'sending', 'recovering'].includes(turn.status);
  const speed = turn.tokenUsage?.generationSpeed;
  const measured = speed?.latestOutputTokensPerSecond !== undefined;
  const recent = active && speedMode === 'recent';
  const rate = recent
    ? measured
      ? speed?.latestOutputTokensPerSecond
      : speed?.recentTokensPerSecond
    : (speed?.averageOutputTokensPerSecond ?? speed?.averageTokensPerSecond);
  const speedTitle = measured
    ? recent
      ? `Latest confirmed response, ${((speed?.latestOutputTimeMs ?? 0) / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })} seconds: actual output tokens (including reasoning and tool arguments) / LLM response time, including time to first output. Tool execution and user waits excluded. Updates when the harness reports tokens, not on each text chunk.${speed?.latestOutputMeasuredAt ? ` Measured at ${new Date(speed.latestOutputMeasuredAt).toLocaleTimeString()}.` : ''}`
      : 'Whole-turn average of confirmed response intervals. Actual output tokens include reasoning and tool arguments; response latency is included. Tool execution, user waits and unreported idle tails are excluded. This is not instantaneous decoder speed.'
    : `${recent ? 'Last 60 seconds, confirmed usage-report intervals only' : 'Whole-turn average'}: actual output tokens (including reasoning and tool arguments) / LLM response time. Tool execution and user waits excluded.`;

  return (
    <span className="thread-turn-usage" data-testid="turn-usage">
      <span
        className="thread-turn-usage-model"
        title={formatTurnRuntimeSummary(turn)}
      >
        <span className="thread-turn-usage-model-name">
          {turn.model?.trim() || 'Model unavailable'}
        </span>
        {turn.reasoningEffort?.trim() ? (
          <span className="thread-turn-usage-effort">
            {' '}
            · {turn.reasoningEffort.trim()}
          </span>
        ) : null}
      </span>
      {usage ? (
        <span
          className="thread-turn-usage-tokens"
          aria-label="Turn token usage"
        >
          <span
            title={`Total tokens: ${usage.totalTokens.toLocaleString('en-US')}`}
          >
            <span className="thread-turn-usage-value">
              {formatCompactTokenCount(usage.totalTokens)}
            </span>{' '}
            tok
          </span>
        </span>
      ) : null}
      <TokenUsageCost usage={usage} price={price} readOnly={readOnly} />
      {active || speed ? (
        <span
          className="thread-turn-token-speed"
          data-testid="turn-token-speed"
          aria-label={
            recent
              ? measured
                ? 'Latest confirmed output token speed'
                : 'Recent output token speed'
              : 'Average output token speed'
          }
          title={`${speedTitle}${rate == null ? ' Waiting for the first output token usage report.' : ''}`}
        >
          {rate != null && Number.isFinite(rate) && rate >= 0
            ? rate.toLocaleString('en-US', {
                maximumFractionDigits: 1,
                minimumFractionDigits: 1,
              })
            : '—'}{' '}
          tok/s
        </span>
      ) : null}
    </span>
  );
}
