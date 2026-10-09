import {
  translate
} from "./chunk-MVQFHWO3.js";

// src/plugins/builtin-plugin-modules.tsx
import { terminalPluginManifest } from "@remote-codex/plugin-terminal";
var builtinFrontendPlugins = [
  {
    manifest: terminalPluginManifest,
    threadPanels: [
      {
        id: "terminal",
        kind: "terminal",
        get label() {
          return translate("workbench.terminal");
        }
      }
    ]
  }
];
export {
  builtinFrontendPlugins,
  builtinFrontendPlugins as defaultBuiltinFrontendPlugins
};
