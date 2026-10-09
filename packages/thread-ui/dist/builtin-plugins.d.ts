import { F as FrontendPluginModule } from './plugin-types-lcO37_1W.js';
import 'react';
import '@remote-codex/shared';

declare const builtinFrontendPlugins: FrontendPluginModule[];

declare const DEEPSEEK_HARNESS_PLUGIN_ID = "remote-codex.deepseek-harness";
/** Thread panel the host renders for DeepSeek Harness threads only. */
declare const DEEPSEEK_HARNESS_PANEL_KIND = "harness:deepseek";

export { DEEPSEEK_HARNESS_PANEL_KIND, DEEPSEEK_HARNESS_PLUGIN_ID, builtinFrontendPlugins, builtinFrontendPlugins as defaultBuiltinFrontendPlugins };
