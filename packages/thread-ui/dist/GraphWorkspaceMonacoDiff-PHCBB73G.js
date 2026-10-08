import "./chunk-5KN2OZTF.js";
import {
  translate
} from "./chunk-IFNWVAHZ.js";
import {
  editor
} from "./chunk-JXQIYSAV.js";
import "./chunk-7O5E2ZHX.js";
import "./chunk-SSOM5P4O.js";

// src/components/graph-workspace/GraphWorkspaceMonacoDiff.tsx
import { useEffect, useRef } from "react";
import { jsx } from "react/jsx-runtime";
function WorkspaceDocumentDiff({
  original,
  modified,
  language,
  dark,
  compact
}) {
  const host = useRef(null);
  useEffect(() => {
    if (!host.current) return;
    const left = editor.createModel(
      original,
      language === "text" ? "plaintext" : language
    );
    const right = editor.createModel(
      modified,
      language === "text" ? "plaintext" : language
    );
    const editor2 = editor.createDiffEditor(host.current, {
      readOnly: true,
      automaticLayout: true,
      renderSideBySide: !compact,
      originalEditable: false,
      theme: dark ? "remote-codex-dark" : "remote-codex-light",
      minimap: { enabled: false },
      fontSize: 12,
      scrollBeyondLastLine: false,
      ariaLabel: translate("files.safeCompare")
    });
    editor2.setModel({ original: left, modified: right });
    return () => {
      editor2.dispose();
      left.dispose();
      right.dispose();
    };
  }, [original, modified, language, dark, compact]);
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref: host,
      className: "h-full w-full",
      "data-testid": "workspace-conflict-diff"
    }
  );
}
export {
  WorkspaceDocumentDiff as default
};
