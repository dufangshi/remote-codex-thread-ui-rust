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

export function TurnUsageInline({ turn }: { turn: TimelineTurn }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const usage = turn.tokenUsage?.total;
  const price = turn.priceEstimate;
  const hasPrice =
    price && Number.isFinite(price.totalUsd) && price.totalUsd >= 0;
  const counts = usage
    ? [
        { label: 'tok', value: usage.totalTokens, title: 'Total tokens' },
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
  const priceTitle = 'API price unavailable for this model or usage report.';
  const details = usage ? [
    { label: 'Input', icon: ArrowDownToLine, value: usage.inputTokens },
    { label: 'Cached input', icon: Database, value: usage.cachedInputTokens },
    { label: 'Output', icon: ArrowUpFromLine, value: usage.outputTokens },
    ...(usage.reasoningOutputTokens > 0 ? [{ label: 'Reasoning', icon: Brain, value: usage.reasoningOutputTokens }] : []),
    ...(usage.cacheWriteInputTokens ? [{ label: 'Cache write', icon: Save, value: usage.cacheWriteInputTokens }] : []),
  ] : [];

  return (
    <span className="thread-turn-usage" data-testid="turn-usage">
      <span
        className="thread-turn-usage-model"
        title={formatTurnRuntimeSummary(turn)}
      >
        {turn.model?.trim() || 'Model unavailable'}
        {turn.reasoningEffort?.trim() ? <span className="thread-turn-usage-effort"> · {turn.reasoningEffort.trim()}</span> : null}
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
        <Tooltip open={detailsOpen} onOpenChange={setDetailsOpen}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="thread-turn-usage-price"
              aria-label={`API cost ${formatCompactUsd(price.totalUsd)}. Show token details`}
              aria-expanded={detailsOpen}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setDetailsOpen((open) => !open);
              }}
            >
              {formatCompactUsd(price.totalUsd)}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6} className="thread-usage-details"
            style={{ background: '#252622', color: '#f2f1e9', border: '1px solid #484a41', borderRadius: 10, padding: '9px 12px', boxShadow: '0 6px 22px #0005', zIndex: 80 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '16px auto', gap: '6px 12px', alignItems: 'center', fontVariantNumeric: 'tabular-nums' }}>
              <DollarSign size={14} aria-label="API cost" /><span>{formatCompactUsd(price.totalUsd)}</span>
              {details.map(({label, icon: Icon, value}) => <span key={label} style={{display:'contents'}}>
                <Icon size={14} aria-label={label} />
                <span aria-label={`${label}: ${value.toLocaleString('en-US')} tokens`} title={`${label}: ${value.toLocaleString('en-US')}`}>{formatCompactTokenCount(value)}</span>
              </span>)}
            </div>
          </TooltipContent>
        </Tooltip>
      ) : usage ? (
        <span className="thread-turn-usage-unavailable" title={priceTitle}>
          Price unavailable
        </span>
      ) : null}
    </span>
  );
}
