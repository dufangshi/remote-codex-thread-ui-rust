import { useState } from 'react';
import { DollarSign, ArrowDownToLine, ArrowUpFromLine, Database, Brain, Save } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '../graph-ui/Tooltip';
import type { TimelineTurn } from './timelineItems';
import {
  formatCompactTokenCount,
  formatCompactUsd,
} from './tokenFormatting';

export function formatTurnRuntimeSummary(turn: TimelineTurn) {
  const model = turn.model?.trim() || 'Model unavailable';
  const effort = turn.reasoningEffort?.trim();
  return effort ? `${model} · ${effort}` : model;
}

export function TurnUsageInline({ turn, readOnly = false }: { turn: TimelineTurn; readOnly?: boolean }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const usage = turn.tokenUsage?.total;
  const price = turn.priceEstimate;
  const active = ['inProgress', 'sending', 'recovering'].includes(turn.status);
  const speed = turn.tokenUsage?.generationSpeed;
  const measured = speed?.latestOutputTokensPerSecond !== undefined;
  const rate = active
    ? measured ? speed?.latestOutputTokensPerSecond : speed?.recentTokensPerSecond
    : speed?.averageOutputTokensPerSecond ?? speed?.averageTokensPerSecond;
  const speedTitle = measured
    ? active
      ? `Latest confirmed response, ${((speed?.latestOutputTimeMs ?? 0) / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })} seconds: actual output tokens (including reasoning and tool arguments) / LLM response time, including time to first output. Tool execution and user waits excluded. Updates when the harness reports tokens, not on each text chunk.${speed?.latestOutputMeasuredAt ? ` Measured at ${new Date(speed.latestOutputMeasuredAt).toLocaleTimeString()}.` : ''}`
      : 'Whole-turn average of confirmed response intervals. Actual output tokens include reasoning and tool arguments; response latency is included. Tool execution, user waits and unreported idle tails are excluded. This is not instantaneous decoder speed.'
    : `${active ? 'Last 60 seconds, confirmed usage-report intervals only' : 'Whole-turn average'}: actual output tokens (including reasoning and tool arguments) / LLM response time. Tool execution and user waits excluded.`;
  const uncachedInput = usage ? Math.max(0, usage.inputTokens - usage.cachedInputTokens - (usage.cacheWriteInputTokens ?? 0)) : 0;
  const reasoning = usage ? Math.min(usage.outputTokens, usage.reasoningOutputTokens ?? 0) : 0;
  const reasoningUsd = usage?.outputTokens && price ? price.outputUsd * reasoning / usage.outputTokens : 0;
  const hasPrice =
    price && Number.isFinite(price.totalUsd) && price.totalUsd >= 0;
  const priceTitle = 'API price unavailable for this model or usage report.';
  const details = usage ? [
    { label: 'Input', icon: ArrowDownToLine, value: uncachedInput, usd: price?.inputUsd },
    { label: 'Cached input', icon: Database, value: usage.cachedInputTokens, usd: price?.cachedInputUsd },
    { label: 'Output', icon: ArrowUpFromLine, value: usage.outputTokens - reasoning, usd: price ? price.outputUsd - reasoningUsd : undefined },
    ...(usage.reasoningOutputTokens > 0 ? [{ label: 'Reasoning', icon: Brain, value: reasoning, usd: price ? reasoningUsd : undefined }] : []),
    ...(usage.cacheWriteInputTokens ? [{ label: 'Cache write', icon: Save, value: usage.cacheWriteInputTokens, usd: price?.cacheWriteInputUsd }] : []),
  ] : [];

  return (
    <span className="thread-turn-usage" data-testid="turn-usage">
      <span
        className="thread-turn-usage-model"
        title={formatTurnRuntimeSummary(turn)}
      >
        <span className="thread-turn-usage-model-name">{turn.model?.trim() || 'Model unavailable'}</span>
        {turn.reasoningEffort?.trim() ? <span className="thread-turn-usage-effort"> · {turn.reasoningEffort.trim()}</span> : null}
      </span>
      {usage ? (
        <span
          className="thread-turn-usage-tokens"
          aria-label="Turn token usage"
        >
            <span title={`Total tokens: ${usage.totalTokens.toLocaleString('en-US')}`}>
              <span className="thread-turn-usage-value">
                {formatCompactTokenCount(usage.totalTokens)}
              </span>{' '}
              tok
            </span>
        </span>
      ) : null}
      {hasPrice && readOnly ? <span className="thread-turn-usage-price">{formatCompactUsd(price.totalUsd)}</span> : (hasPrice || usage) ? (
        <Tooltip open={detailsOpen} onOpenChange={setDetailsOpen}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={hasPrice ? 'thread-turn-usage-price' : 'thread-turn-usage-unavailable'}
              aria-label={`${hasPrice ? `API cost ${formatCompactUsd(price.totalUsd)}` : 'API price unavailable'}. Show token details`}
              aria-expanded={detailsOpen}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setDetailsOpen((open) => !open);
              }}
            >
              {hasPrice ? formatCompactUsd(price.totalUsd) : 'Price unavailable'}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6} className="thread-usage-details"
            arrowStyle={{ fill: '#252622' }}
            style={{ background: '#252622', color: '#f2f1e9', border: '1px solid #484a41', borderRadius: 10, padding: '9px 12px', boxShadow: '0 6px 22px #0005', zIndex: 80 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '16px auto auto', gap: '6px 12px', alignItems: 'center', fontVariantNumeric: 'tabular-nums' }}>
              <DollarSign size={14} aria-label="API cost" /><span style={{gridColumn:"span 2", textAlign:"right"}}>{hasPrice ? formatCompactUsd(price.totalUsd) : priceTitle}</span>
              {details.map(({label, icon: Icon, value, usd}) => <span key={label} style={{display:'contents'}}>
                <Icon size={14} aria-label={label} />
                <span aria-label={`${label}: ${value.toLocaleString('en-US')} tokens`} title={`${label}: ${value.toLocaleString('en-US')}`}>{formatCompactTokenCount(value)}</span>
                <span aria-label={`${label} cost`} title={label === "Reasoning" ? "Included in output charges; not an additional fee" : undefined} style={{textAlign:"right"}}>{usd == null ? "—" : formatCompactUsd(usd)}</span>
              </span>)}
            </div>
          </TooltipContent>
        </Tooltip>
      ) : null}
      {(active || speed) ? <span className="thread-turn-token-speed" data-testid="turn-token-speed"
        aria-label={active ? measured ? 'Latest confirmed output token speed' : 'Recent output token speed' : 'Average output token speed'}
        title={`${speedTitle}${rate == null ? ' Waiting for the first output token usage report.' : ''}`}>
        {rate != null && Number.isFinite(rate) && rate >= 0 ? rate.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) : '—'} tok/s
      </span> : null}
    </span>
  );
}
