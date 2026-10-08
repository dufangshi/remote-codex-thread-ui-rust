import { translate, useI18n } from '../../i18n';
import type { AgentSubscriptionUsageDto } from '@remote-codex/shared';
import { ComposerSubscriptionUsage } from './ComposerSubscriptionUsage';

export function ComposerJumpLatestButton({
  activeView,
  followTail,
  onToggleFollow,
  canJumpToPreviousTurn,
  onJumpToPreviousTurn,
  canJumpToNextTurn,
  onJumpToNextTurn,
  subscriptionUsage,
}: {
  activeView: 'chat' | 'shell';
  followTail: boolean;
  onToggleFollow?: (() => void) | undefined;
  canJumpToPreviousTurn?: boolean | undefined;
  onJumpToPreviousTurn?: (() => void) | undefined;
  canJumpToNextTurn?: boolean | undefined;
  onJumpToNextTurn?: (() => void) | undefined;
  subscriptionUsage?: AgentSubscriptionUsageDto | null;
}) {
  useI18n();
  if (activeView !== 'chat') {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[90] h-11 -translate-y-full bg-transparent touch-manipulation sm:h-10">
      <span
        role="group"
        aria-label={translate("chat.timelineNavigation")}
        className={`thread-jump-latest-badge pointer-events-auto absolute bottom-1 left-1/2 inline-flex h-5 min-w-[7.5rem] -translate-x-1/2 overflow-hidden rounded-[0.7rem] border shadow-sm transition ${
          followTail
            ? 'is-active border-sky-300/36 bg-sky-300/[0.03] text-sky-100/86'
            : 'border-stone-500/70 bg-stone-950/[0.08] text-stone-200/86'
        }`}
      >
        <button
          type="button"
          aria-label={translate("chat.jumpToPreviousTurn")}
          title={canJumpToPreviousTurn ? translate("chat.jumpToTheStartOfThePrevious") : translate("chat.noEarlierTurn")}
          disabled={!canJumpToPreviousTurn}
          onClick={() => onJumpToPreviousTurn?.()}
          className="inline-flex w-10 items-center justify-center transition hover:bg-sky-300/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-sky-200/70 disabled:cursor-default disabled:opacity-35"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 12h9M8 10V5M6 7l2-2 2 2" />
          </svg>
        </button>
        <span aria-hidden="true" className="w-px bg-current opacity-20" />
        <button
          type="button"
          data-action="jump-latest" aria-label={translate("chat.jumpToLatest")}
          title={followTail ? translate("chat.latestMessagesAreInView") : translate("chat.jumpToTheBottom")}
          onClick={() => onToggleFollow?.()}
          className="inline-flex w-10 items-center justify-center transition hover:bg-sky-300/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-sky-200/70"
        >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5 fill-none stroke-current"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m4 5.5 4 4 4-4M3.5 12.5h9" />
        </svg>
        </button>
        <span aria-hidden="true" className="w-px bg-current opacity-20" />
        <button
          type="button"
          aria-label={translate("chat.jumpToNextTurn")}
          title={canJumpToNextTurn ? translate("chat.jumpToTheStartOfTheNext") : translate("chat.noLaterTurn")}
          disabled={!canJumpToNextTurn}
          onClick={() => onJumpToNextTurn?.()}
          className="inline-flex w-10 items-center justify-center transition hover:bg-sky-300/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-sky-200/70 disabled:cursor-default disabled:opacity-35"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 4h9M8 6v5m-2-2 2 2 2-2" />
          </svg>
        </button>
      </span>
      <ComposerSubscriptionUsage usage={subscriptionUsage} />
    </div>
  );
}
