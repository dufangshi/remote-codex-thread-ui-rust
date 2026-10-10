import type {
  PromptAttachmentManifestEntryDto,
} from '@pockymoe/shared';

export interface PromptAttachmentUpload
  extends PromptAttachmentManifestEntryDto {
  file: File;
}

export type SendPromptInput = {
  prompt: string;
  attachments?: PromptAttachmentUpload[];
  delivery?: 'steer';
};

export interface ThreadShellControlState {
  status: import('@pockymoe/shared').ShellStatusDto;
  connectionButtonDisabled: boolean;
  connectionButtonLabel: string;
  shellInputEnabled: boolean;
  isConnecting: boolean;
  isCommandRunning: boolean;
  promptLabel: string | null;
  isMobileShell: boolean;
  hasShell: boolean;
  busy: boolean;
  loading: boolean;
  error: string | null;
}
