import { useCallback, useEffect, useRef, useState } from 'react';

import type { SlashPanelView } from './types';

export interface UseComposerForkActionsInput {
  slashPanelView: SlashPanelView;
  onForkLatest?: () => Promise<void> | void;
  onForkTurn?: (turnId: string) => Promise<void> | void;
  closeMenu: () => void;
}

export interface UseComposerForkActionsResult {
  forkBusy: boolean;
  forkError: string | null;
  forkLatest: () => Promise<void>;
  forkTurn: (turnId: string) => Promise<void>;
}

export function useComposerForkActions({
  slashPanelView,
  onForkLatest,
  onForkTurn,
  closeMenu,
}: UseComposerForkActionsInput): UseComposerForkActionsResult {
  const [forkBusy, setForkBusy] = useState(false);
  const [forkError, setForkError] = useState<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    setForkError(null);
  }, [slashPanelView]);

  const forkLatest = useCallback(async () => {
    if (inFlight.current) return;
    if (!onForkLatest) {
      setForkError('Fork is unavailable for this thread. Reload the page and try again.');
      return;
    }

    inFlight.current = true;
    setForkError(null);
    setForkBusy(true);
    try {
      await onForkLatest();
      closeMenu();
    } catch (error) {
      setForkError(error instanceof Error ? error.message : 'Unable to fork this thread. Please try again.');
    } finally {
      inFlight.current = false;
      setForkBusy(false);
    }
  }, [closeMenu, onForkLatest]);

  const forkTurn = useCallback(
    async (turnId: string) => {
      if (inFlight.current) return;
      if (!onForkTurn) {
        setForkError('Fork is unavailable for this thread. Reload the page and try again.');
        return;
      }

      inFlight.current = true;
      setForkError(null);
      setForkBusy(true);
      try {
        await onForkTurn(turnId);
        closeMenu();
      } catch (error) {
        setForkError(error instanceof Error ? error.message : 'Unable to fork this turn. Please try again.');
      } finally {
        inFlight.current = false;
        setForkBusy(false);
      }
    },
    [closeMenu, onForkTurn],
  );

  return {
    forkBusy,
    forkError,
    forkLatest,
    forkTurn,
  };
}
