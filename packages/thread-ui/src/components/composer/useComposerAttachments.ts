import { useCallback, type MutableRefObject } from 'react';

import type { PromptAttachmentKindDto } from '@pockymoe/shared';

import {
  buildAttachmentInsertionDraft,
  classifyAttachmentKind,
  type ComposerAttachmentDraft,
  type ComposerDraft,
  type PromptSelectionRange,
} from './composerUtils';

type DraftUpdater = (update: (current: ComposerDraft) => ComposerDraft) => void;

export interface UseComposerAttachmentsInput {
  prompt: string;
  attachments: ComposerAttachmentDraft[];
  updateDraft: DraftUpdater;
  getSelection: () => PromptSelectionRange | null;
  selectionSnapshotRef: MutableRefObject<PromptSelectionRange | null>;
  pendingSelectionRef: MutableRefObject<PromptSelectionRange | null>;
  pendingInsertedAttachmentIdsRef: MutableRefObject<string[]>;
  onInserted?: () => void;
  buildClientId?: () => string;
}

function defaultBuildClientId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `attachment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function orderDroppedAttachmentFiles(files: File[]) {
  return [
    ...files.filter((file) => classifyAttachmentKind(file) === 'photo'),
    ...files.filter((file) => classifyAttachmentKind(file) === 'file'),
  ];
}

export function useComposerAttachments({
  prompt,
  attachments,
  updateDraft,
  getSelection,
  selectionSnapshotRef,
  pendingSelectionRef,
  pendingInsertedAttachmentIdsRef,
  onInserted,
  buildClientId = defaultBuildClientId,
}: UseComposerAttachmentsInput) {
  const applyFiles = useCallback(
    (
      files: File[],
      kindForFile: (file: File) => PromptAttachmentKindDto,
    ) => {
      if (files.length === 0) {
        return false;
      }

      const insertion = buildAttachmentInsertionDraft({
        prompt,
        attachments,
        files,
        selection: getSelection() ?? selectionSnapshotRef.current,
        kindForFile,
        buildClientId,
      });

      updateDraft(() => insertion.draft);
      pendingSelectionRef.current = insertion.selection;
      selectionSnapshotRef.current = insertion.selection;
      pendingInsertedAttachmentIdsRef.current =
        insertion.insertedAttachmentIds;
      onInserted?.();
      return true;
    },
    [
      attachments,
      buildClientId,
      getSelection,
      onInserted,
      pendingInsertedAttachmentIdsRef,
      pendingSelectionRef,
      prompt,
      selectionSnapshotRef,
      updateDraft,
    ],
  );

  const appendAttachments = useCallback(
    (files: FileList | null, kind: PromptAttachmentKindDto) => {
      if (!files || files.length === 0) {
        return false;
      }

      return applyFiles(Array.from(files), () => kind);
    },
    [applyFiles],
  );

  const appendDroppedAttachments = useCallback(
    (files: File[]) =>
      applyFiles(orderDroppedAttachmentFiles(files), classifyAttachmentKind),
    [applyFiles],
  );

  return {
    appendAttachments,
    appendDroppedAttachments,
  };
}
