import { useRef, useState } from 'react';
import {
  DollarSign,
  ArrowDownToLine,
  ArrowUpFromLine,
  Database,
  Brain,
  Save,
} from 'lucide-react';
import type {
  ThreadTurnTokenBreakdownDto,
  ThreadTurnPriceEstimateDto,
} from '@remote-codex/shared';
import { Tooltip, TooltipTrigger, TooltipContent } from '../graph-ui/Tooltip';
import { formatCompactTokenCount, formatCompactUsd } from './tokenFormatting';

export interface TokenUsageCostProps {
  usage?: ThreadTurnTokenBreakdownDto | null;
  price?: Pick<
    ThreadTurnPriceEstimateDto,
    | 'totalUsd'
    | 'inputUsd'
    | 'cachedInputUsd'
    | 'cacheWriteInputUsd'
    | 'outputUsd'
  > | null;
  readOnly?: boolean;
  costLabel?: string;
  detailsNote?: string;
  tooltipZIndex?: number;
}

export function TokenUsageCost({
  usage,
  price,
  readOnly = false,
  costLabel = 'API cost',
  detailsNote,
  tooltipZIndex = 80,
}: TokenUsageCostProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const openAtPointerDown = useRef(false);
  const uncachedInput = usage
    ? Math.max(
        0,
        usage.inputTokens -
          usage.cachedInputTokens -
          (usage.cacheWriteInputTokens ?? 0),
      )
    : 0;
  const reasoning = usage
    ? Math.min(usage.outputTokens, usage.reasoningOutputTokens ?? 0)
    : 0;
  const reasoningUsd =
    usage?.outputTokens && price
      ? (price.outputUsd * reasoning) / usage.outputTokens
      : 0;
  const hasPrice =
    price && Number.isFinite(price.totalUsd) && price.totalUsd >= 0;
  const priceTitle = 'API price unavailable for this model or usage report.';
  const details = usage
    ? [
        {
          label: 'Input',
          icon: ArrowDownToLine,
          value: uncachedInput,
          usd: price?.inputUsd,
        },
        {
          label: 'Cached input',
          icon: Database,
          value: usage.cachedInputTokens,
          usd: price?.cachedInputUsd,
        },
        {
          label: 'Output',
          icon: ArrowUpFromLine,
          value: usage.outputTokens - reasoning,
          usd: price ? price.outputUsd - reasoningUsd : undefined,
        },
        ...(usage.reasoningOutputTokens > 0
          ? [
              {
                label: 'Reasoning',
                icon: Brain,
                value: reasoning,
                usd: price ? reasoningUsd : undefined,
              },
            ]
          : []),
        ...(usage.cacheWriteInputTokens
          ? [
              {
                label: 'Cache write',
                icon: Save,
                value: usage.cacheWriteInputTokens,
                usd: price?.cacheWriteInputUsd,
              },
            ]
          : []),
      ]
    : [];
  return (
    <span className="thread-usage-cost">
      {hasPrice && readOnly ? (
        <span className="thread-turn-usage-price">
          {formatCompactUsd(price.totalUsd)}
        </span>
      ) : hasPrice || usage ? (
        <Tooltip open={detailsOpen} onOpenChange={setDetailsOpen}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={
                hasPrice
                  ? 'thread-turn-usage-price'
                  : 'thread-turn-usage-unavailable'
              }
              aria-label={`${hasPrice ? `${costLabel} ${formatCompactUsd(price.totalUsd)}` : 'API price unavailable'}. Show token details`}
              aria-expanded={detailsOpen}
              onPointerDown={() => {
                openAtPointerDown.current = detailsOpen;
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                // Touch focus can open the tooltip between pointer-up and click.
                // Toggle from the press state; keyboard clicks use current state.
                const pointer = event.detail !== 0;
                setDetailsOpen(
                  (open) => !(pointer ? openAtPointerDown.current : open),
                );
              }}
            >
              {hasPrice
                ? formatCompactUsd(price.totalUsd)
                : 'Price unavailable'}
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            sideOffset={6}
            collisionPadding={12}
            className="thread-usage-details"
            arrowStyle={{ fill: '#252622' }}
            style={{
              background: '#252622',
              color: '#f2f1e9',
              border: '1px solid #484a41',
              borderRadius: 10,
              padding: '9px 12px',
              boxShadow: '0 6px 22px #0005',
              zIndex: tooltipZIndex,
              maxWidth: 'calc(100vw - 24px)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '16px auto auto',
                gap: '6px 12px',
                alignItems: 'center',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <DollarSign size={14} aria-label={costLabel} />
              <span style={{ gridColumn: 'span 2', textAlign: 'right' }}>
                {hasPrice ? formatCompactUsd(price.totalUsd) : priceTitle}
              </span>
              {details.map(({ label, icon: Icon, value, usd }) => (
                <span key={label} style={{ display: 'contents' }}>
                  <Icon size={14} aria-label={label} />
                  <span
                    aria-label={`${label}: ${value.toLocaleString('en-US')} tokens`}
                    title={`${label}: ${value.toLocaleString('en-US')}`}
                  >
                    {formatCompactTokenCount(value)}
                  </span>
                  <span
                    aria-label={`${label} cost`}
                    title={
                      label === 'Reasoning'
                        ? 'Included in output charges; not an additional fee'
                        : undefined
                    }
                    style={{ textAlign: 'right' }}
                  >
                    {usd == null ? '—' : formatCompactUsd(usd)}
                  </span>
                </span>
              ))}
            </div>
            {detailsNote ? (
              <p className="mt-2 max-w-xs text-xs">{detailsNote}</p>
            ) : null}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  );
}
