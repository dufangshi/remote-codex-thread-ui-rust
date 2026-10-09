import {
  translate
} from "./chunk-4E7JQY2H.js";

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
