import { translate, useI18n } from '../i18n';
import { terminalPluginManifest } from '@remote-codex/plugin-terminal';
import type { FrontendPluginModule } from './plugin-types';

export const builtinFrontendPlugins: FrontendPluginModule[] = [
  {
    manifest: terminalPluginManifest,
    threadPanels: [
      {
        id: 'terminal',
        kind: 'terminal',
        get label() { return translate("workbench.terminal"); },
      },
    ],
  },
];
