import type { en } from './en';
export const zhCN = {
  'common.language': '语言',
  'common.languageDescription': '选择此浏览器的界面语言。',
  'common.items': { one: '{{count}} 项', other: '{{count}} 项' },
} satisfies Record<keyof typeof en, string | { one: string; other: string }>;
