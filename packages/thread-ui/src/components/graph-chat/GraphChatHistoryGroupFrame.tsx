import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface GraphChatHistoryGroupFrameProps {
  children: ReactNode;
  className: string;
  expanded: boolean;
  expandedListClassName: string;
  icon?: ReactNode;
  plain?: boolean;
  onToggleExpanded: () => void;
  runningIndicator?: ReactNode;
  summary: ReactNode;
  timeMeta?: ReactNode;
  toggleAriaLabel: string;
  trailingSummary?: ReactNode;
}

export function GraphChatHistoryGroupFrame({
  children,
  className,
  expanded,
  expandedListClassName,
  icon,
  plain = false,
  onToggleExpanded,
  runningIndicator,
  summary,
  timeMeta,
  toggleAriaLabel,
  trailingSummary,
}: GraphChatHistoryGroupFrameProps) {
  return (
    <div
      className={`thread-graph-history-group is-compact-group ${plain ? 'is-plain-group' : ''} ${className}`}
    >
      <div className="thread-graph-history-group-card min-w-0 flex-1 rounded-[0.85rem] border px-3 py-2">
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={toggleAriaLabel}
          onClick={onToggleExpanded}
          className="thread-graph-history-group-toggle flex w-full min-w-0 items-center justify-between gap-3 text-left"
        >
          {!plain && icon ? <span className="thread-graph-history-group-inline-icon" aria-hidden="true">{icon}</span> : null}
          <div className="thread-graph-history-group-summary min-w-0 flex flex-1 flex-wrap items-center gap-2 pr-1">
            {summary}
            {runningIndicator}
          </div>
          {trailingSummary ? <span className="thread-graph-history-group-stats">{trailingSummary}</span> : null}
          {timeMeta ? <span className="thread-graph-history-group-time">{timeMeta}</span> : null}
          <span
            className="thread-graph-history-group-chevron inline-flex shrink-0"
            aria-hidden="true"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </span>
        </button>

        {expanded ? (
          <div
            className={`thread-graph-history-group-list mt-3 space-y-2 border-t pt-3 ${expandedListClassName}`}
          >
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
