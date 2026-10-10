/**
 * @vitest-environment jsdom
 */
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ComposerJumpLatestButton } from './ComposerJumpLatestButton';

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function renderButton({
  activeView,
  followTail = false,
  onToggleFollow = vi.fn(),
  canJumpToPreviousTurn = true,
  onJumpToPreviousTurn = vi.fn(),
  canJumpToNextTurn = true,
  onJumpToNextTurn = vi.fn(),
  subscriptionUsage,
}: {
  activeView: 'chat' | 'shell';
  followTail?: boolean;
  onToggleFollow?: () => void;
  canJumpToPreviousTurn?: boolean;
  onJumpToPreviousTurn?: () => void;
  canJumpToNextTurn?: boolean;
  onJumpToNextTurn?: () => void;
  subscriptionUsage?: ComponentProps<typeof ComposerJumpLatestButton>['subscriptionUsage'];
}) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  flushSync(() => {
    root?.render(
      <ComposerJumpLatestButton
        activeView={activeView}
        followTail={followTail}
        onToggleFollow={onToggleFollow}
        canJumpToPreviousTurn={canJumpToPreviousTurn}
        onJumpToPreviousTurn={onJumpToPreviousTurn}
        canJumpToNextTurn={canJumpToNextTurn}
        onJumpToNextTurn={onJumpToNextTurn}
        subscriptionUsage={subscriptionUsage}
      />,
    );
  });

  return { view: container, onToggleFollow, onJumpToPreviousTurn, onJumpToNextTurn };
}

describe('ComposerJumpLatestButton', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    if (root) {
      flushSync(() => {
        root?.unmount();
      });
    }
    container?.remove();
    root = null;
    container = null;
  });

  it('renders only in chat view and forwards clicks', () => {
    const { view, onToggleFollow } = renderButton({ activeView: 'chat' });
    const button = view.querySelector<HTMLButtonElement>(
      '[aria-label="Jump to latest"]',
    );

    expect(button).not.toBeNull();
    button?.click();
    expect(onToggleFollow).toHaveBeenCalledTimes(1);
  });

  it('is hidden in shell view', () => {
    const { view } = renderButton({ activeView: 'shell' });

    expect(view.querySelector('[aria-label="Jump to latest"]')).toBeNull();
  });

  it('marks the badge active when following the tail', () => {
    const { view } = renderButton({ activeView: 'chat', followTail: true });

    expect(view.querySelector('.thread-jump-latest-badge')?.className).toContain(
      'is-active',
    );
  });

  it('keeps timeline navigation centered when subscription usage is visible', () => {
    const { view } = renderButton({
      activeView: 'chat',
      subscriptionUsage: {
        provider: 'claude',
        authKind: 'subscription',
        observedAt: '2026-07-13T00:00:00.000Z',
        stale: false,
        windows: [{
          id: 'five_hour',
          durationMinutes: 300,
          label: '5h',
          usedPercent: 2,
          resetsAt: null,
        }],
      },
    });

    expect(view.querySelector('[aria-label="Timeline navigation"]')?.closest('.thread-jump-latest-cluster')?.className)
      .toContain('left-1/2');
    expect(view.querySelector('.thread-subscription-usage')?.className)
      .toContain('right-2');
  });

  it('jumps to the next turn and disables that segment at the last turn', () => {
    const { view, onJumpToNextTurn } = renderButton({ activeView: 'chat' });
    const next = view.querySelector<HTMLButtonElement>('[aria-label="Jump to next turn"]');
    next?.click();
    expect(onJumpToNextTurn).toHaveBeenCalledTimes(1);

    renderButton({ activeView: 'chat', canJumpToNextTurn: false });
    expect(
      container?.querySelector<HTMLButtonElement>('[aria-label="Jump to next turn"]')?.disabled,
    ).toBe(true);
  });

  it('jumps to the previous turn and disables that segment at the first turn', () => {
    const { view, onJumpToPreviousTurn } = renderButton({ activeView: 'chat' });
    const previous = view.querySelector<HTMLButtonElement>('[aria-label="Jump to previous turn"]');
    previous?.click();
    expect(onJumpToPreviousTurn).toHaveBeenCalledTimes(1);

    renderButton({ activeView: 'chat', canJumpToPreviousTurn: false });
    expect(
      container?.querySelector<HTMLButtonElement>('[aria-label="Jump to previous turn"]')?.disabled,
    ).toBe(true);
  });
});
