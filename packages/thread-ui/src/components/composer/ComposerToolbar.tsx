import type { ComponentProps, Dispatch, SetStateAction } from 'react';

import type { ThreadShellControlState } from '../../types';
import {
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
} from '../graph-ui/InputGroup';
import {
  ChatIcon,
  TerminalIcon,
  WrenchScrewdriverIcon,
} from './composerPresentation';
import { ComposerAttachmentMenu } from './ComposerAttachmentMenu';
import { ComposerSettingsToolbar } from './ComposerSettingsToolbar';
import { ComposerShellToolsPanel } from './ComposerShellToolsPanel';
import { ComposerSlashToolboxMenu } from './ComposerSlashToolboxMenu';
import type { SettingsMenu } from './types';

export type ComposerSlashToolboxProps = ComponentProps<
  typeof ComposerSlashToolboxMenu
>;
export type ComposerAttachmentMenuProps = ComponentProps<
  typeof ComposerAttachmentMenu
>;
export type ComposerSettingsToolbarProps = ComponentProps<
  typeof ComposerSettingsToolbar
>;
export type ComposerShellToolsPanelProps = ComponentProps<
  typeof ComposerShellToolsPanel
>;

export interface ComposerToolbarProps {
  isShellView: boolean;
  canToggleShellView: boolean;
  isMobileShell: boolean;
  shellPromptLabel: string | null;
  openMenu: SettingsMenu;
  toolbarClassName: string;
  iconButtonClassName: string;
  slashToolboxProps: ComposerSlashToolboxProps | null;
  attachmentMenuProps: ComposerAttachmentMenuProps | null;
  settingsToolbarProps: ComposerSettingsToolbarProps | null;
  shellToolsPanelProps: ComposerShellToolsPanelProps | null;
  shellControlState: ThreadShellControlState | null;
  onToggleView?: () => void;
  onDismissPromptFocus: () => void;
  onSetOpenMenu: Dispatch<SetStateAction<SettingsMenu>>;
}

export function ComposerToolbar({
  isShellView,
  canToggleShellView,
  isMobileShell,
  shellPromptLabel,
  openMenu,
  toolbarClassName,
  iconButtonClassName,
  slashToolboxProps,
  attachmentMenuProps,
  settingsToolbarProps,
  shellToolsPanelProps,
  onToggleView,
  onDismissPromptFocus,
  onSetOpenMenu,
}: ComposerToolbarProps) {
  return (
    <InputGroupAddon
      align="block-end"
      className={`${toolbarClassName} relative z-[100] mb-0 flex items-center gap-2 text-xs`}
    >
      <div className="flex shrink-0 items-center gap-1.5">
        {!isShellView && slashToolboxProps ? (
          <ComposerSlashToolboxMenu {...slashToolboxProps} />
        ) : null}

        {!isShellView && attachmentMenuProps ? (
          <ComposerAttachmentMenu {...attachmentMenuProps} />
        ) : null}

        {canToggleShellView && (
          <InputGroupButton
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={isShellView ? 'Switch to chat' : 'Switch to shell'}
            title={isShellView ? 'Switch to chat' : 'Switch to shell'}
            onClick={() => onToggleView?.()}
            className={`${iconButtonClassName} h-9 w-9 rounded-full sm:h-8 sm:w-8`}
          >
            {isShellView ? <ChatIcon /> : <TerminalIcon />}
          </InputGroupButton>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5">
        {!isShellView && settingsToolbarProps ? (
          <ComposerSettingsToolbar {...settingsToolbarProps} />
        ) : null}

        {isShellView && shellPromptLabel ? (
          <InputGroupText
            className="min-w-0 max-w-[12rem] truncate rounded-full px-1.5 py-1 text-stone-400"
            title={shellPromptLabel}
          >
            {shellPromptLabel}
          </InputGroupText>
        ) : null}

        {isMobileShell && (
          <div className="relative">
            <button
              type="button"
              data-composer-menu-trigger="true"
              aria-label={
                openMenu === 'shellTools'
                  ? 'Close shell tools'
                  : 'Open shell tools'
              }
              aria-haspopup="menu"
              aria-expanded={openMenu === 'shellTools'}
              title={
                openMenu === 'shellTools'
                  ? 'Close shell tools'
                  : 'Open shell tools'
              }
              onClick={() => {
                onDismissPromptFocus();
                onSetOpenMenu((current) =>
                  current === 'shellTools' ? null : 'shellTools',
                );
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-stone-700 bg-stone-900/92 text-stone-200 transition hover:bg-stone-800"
            >
              <WrenchScrewdriverIcon />
            </button>
            {openMenu === 'shellTools' && shellToolsPanelProps ? (
              <ComposerShellToolsPanel {...shellToolsPanelProps} />
            ) : null}
          </div>
        )}
      </div>
    </InputGroupAddon>
  );
}
