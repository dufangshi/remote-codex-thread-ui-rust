/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import { aisTreeToWorkspaceNode, asWorkspacePath } from "./workspaceFiles";

describe("AIS workspace tree mapping", () => {
  it("normalizes paths and wraps directory entries", () => {
    expect(asWorkspacePath("/src\\lib")).toBe("src/lib");
    const node = aisTreeToWorkspaceNode("src", [
      {
        name: "main.rs",
        path: "src/main.rs",
        kind: "file",
        size: 12,
      },
      {
        name: "acp",
        path: "src/acp",
        kind: "directory",
        has_children: true,
      },
    ]);
    expect(node.name).toBe("src");
    expect(node.kind).toBe("directory");
    expect(node.childrenLoaded).toBe(true);
    expect(node.children).toEqual([
      {
        name: "main.rs",
        path: "src/main.rs",
        kind: "file",
        size: 12,
        hasChildren: false,
      },
      {
        name: "acp",
        path: "src/acp",
        kind: "directory",
        size: undefined,
        hasChildren: true,
      },
    ]);
  });
});
