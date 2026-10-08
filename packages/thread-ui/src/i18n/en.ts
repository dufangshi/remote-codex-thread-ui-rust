import { searchEn } from './search.en';
import { authEn } from './auth.en';
import { chatEn } from './chat.en';
import { commonEn } from './common.en';
import { devicesEn } from './devices.en';
import { filesEn } from './files.en';
import { settingsEn } from './settings.en';
import { sharingEn } from './sharing.en';
import { workbenchEn } from './workbench.en';
export const en = {
  ...authEn,
  ...chatEn,
  ...commonEn,
  ...devicesEn,
  ...filesEn,
  ...settingsEn,
  ...sharingEn,
  ...workbenchEn,
  ...searchEn,
} as const;
