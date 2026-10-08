import type {
  FormEvent,
  MutableRefObject,
  ReactNode,
} from 'react';

import type { AgentSubscriptionUsageDto, PromptAttachmentKindDto } from '@remote-codex/shared';
import { useCompactComposer } from './useCompactComposer';
import { InputGroup } from '../graph-ui/InputGroup';
import { ComposerHiddenAttachmentInputs } from './ComposerHiddenAttachmentInputs';
import { ComposerJumpLatestButton } from './ComposerJumpLatestButton';

export interface ComposerFrameProps {
  activeView: 'chat' | 'shell';
  layerClassName: string;
  formClassName: string;
  shellClassName: string;
  inputGroupClassName: string;
  error: string | null | undefined;
  followTail: boolean;
  photoInputRef: MutableRefObject<HTMLInputElement | null>;
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  onAppendAttachments: (
    files: FileList | null,
    kind: PromptAttachmentKindDto,
  ) => void;
  onToggleFollow?: () => void;
  canJumpToPreviousTurn?: boolean;
  onJumpToPreviousTurn?: () => void;
  canJumpToNextTurn?: boolean;
  onJumpToNextTurn?: () => void;
  subscriptionUsage?: AgentSubscriptionUsageDto | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  formRef: MutableRefObject<HTMLFormElement | null>;
  promptSlot: ReactNode;
  pendingQueueSlot?: ReactNode;
  toolbarSlot: ReactNode;
  goalSlot: ReactNode;
  shellPromptSlot: ReactNode;
}

export function ComposerFrame({
  activeView,
  layerClassName,
  formClassName,
  shellClassName,
  inputGroupClassName,
  error,
  followTail,
  photoInputRef,
  fileInputRef,
  onAppendAttachments,
  onToggleFollow,
  canJumpToPreviousTurn,
  onJumpToPreviousTurn,
  canJumpToNextTurn,
  onJumpToNextTurn,
  subscriptionUsage,
  onSubmit,
  formRef,
  promptSlot,
  pendingQueueSlot,
  toolbarSlot,
  goalSlot,
  shellPromptSlot,
}: ComposerFrameProps) {
  const { expanded, focusOwner, ...focusEvents } = useCompactComposer(formRef, activeView === 'chat');
  return (
    <div className={layerClassName}>
      <ComposerHiddenAttachmentInputs
        photoInputRef={photoInputRef}
        fileInputRef={fileInputRef}
        onAppendAttachments={onAppendAttachments}
      />
      <ComposerJumpLatestButton
        activeView={activeView}
        followTail={followTail}
        onToggleFollow={onToggleFollow}
        canJumpToPreviousTurn={canJumpToPreviousTurn}
        onJumpToPreviousTurn={onJumpToPreviousTurn}
        canJumpToNextTurn={canJumpToNextTurn}
        onJumpToNextTurn={onJumpToNextTurn}
        subscriptionUsage={subscriptionUsage}
      />

      {pendingQueueSlot}

      <form
        ref={formRef}
        {...focusEvents}
        data-composer-focus-owner={focusOwner}
        data-composer-layout={activeView === 'chat' ? (expanded ? 'expanded' : 'collapsed') : undefined}
        data-testid={activeView === 'chat' ? 'chat-composer' : undefined}
        onSubmit={onSubmit}
        className={formClassName}
      >
        <div
          className={`${shellClassName} flex w-full flex-col overflow-visible rounded-[16px] sm:rounded-[18px]`}
        >
          <InputGroup className={inputGroupClassName}>
            {promptSlot}
            {toolbarSlot}
          </InputGroup>

          {goalSlot}
          {shellPromptSlot}
        </div>
        {error ? (
          <div className="mt-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}
      </form>
    </div>
  );
}
