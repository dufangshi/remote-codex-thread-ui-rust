import type { ChangeEvent, RefObject } from 'react';

import type { PromptAttachmentKindDto } from '@pockymoe/shared';

export function ComposerHiddenAttachmentInputs({
  photoInputRef,
  fileInputRef,
  onAppendAttachments,
}: {
  photoInputRef: RefObject<HTMLInputElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onAppendAttachments: (
    files: FileList | null,
    kind: PromptAttachmentKindDto,
  ) => void;
}) {
  function handleInputChange(
    event: ChangeEvent<HTMLInputElement>,
    kind: PromptAttachmentKindDto,
  ) {
    onAppendAttachments(event.target.files, kind);
    event.target.value = '';
  }

  return (
    <>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        tabIndex={-1}
        className="sr-only"
        onChange={(event) => handleInputChange(event, 'photo')}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        tabIndex={-1}
        className="sr-only"
        onChange={(event) => handleInputChange(event, 'file')}
      />
    </>
  );
}
