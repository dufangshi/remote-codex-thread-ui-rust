import type { ThreadWorkspaceAdapter } from "@remote-codex/thread-ui";

type WorkspaceTreeNode = Awaited<ReturnType<ThreadWorkspaceAdapter["listTree"]>>;

import { api } from "./api";

type AisTreeEntry = {
  name: string;
  path: string;
  kind: string;
  size?: number;
  has_children?: boolean;
  hasChildren?: boolean;
};

type AisTreeResponse = {
  path?: string;
  entries?: AisTreeEntry[];
};

type AisFilePreview = {
  path: string;
  name: string;
  content: string;
  language: string;
  size: number;
  truncated: boolean;
};

export function asWorkspacePath(path?: string | null) {
  return (path ?? "").replace(/^\/+/, "").replace(/\\/g, "/");
}

export function aisTreeToWorkspaceNode(
  path: string,
  entries: AisTreeEntry[],
): WorkspaceTreeNode {
  const rel = asWorkspacePath(path);
  const children = entries.map((entry) => {
    const directory = entry.kind === "directory";
    return {
      name: entry.name,
      path: asWorkspacePath(entry.path),
      kind: directory ? ("directory" as const) : ("file" as const),
      size: entry.size,
      hasChildren: directory
        ? Boolean(entry.has_children ?? entry.hasChildren)
        : false,
    };
  });
  return {
    name: rel.split("/").filter(Boolean).pop() || ".",
    path: rel,
    kind: "directory",
    childrenLoaded: true,
    hasChildren: children.length > 0,
    children,
  };
}

export function createAisWorkspaceAdapter(): ThreadWorkspaceAdapter {
  return {
    async listTree({ path }) {
      const rel = asWorkspacePath(path);
      const payload = await api<AisTreeResponse>(
        `v1/files/tree?path=${encodeURIComponent(rel)}`,
      );
      return aisTreeToWorkspaceNode(payload.path ?? rel, payload.entries ?? []);
    },
    async readFile({ path }) {
      const rel = asWorkspacePath(path);
      const preview = await api<AisFilePreview>(
        `v1/files?path=${encodeURIComponent(rel)}`,
      );
      return {
        path: preview.path,
        name: preview.name,
        content: preview.content,
        language: preview.language,
        size: preview.size,
        truncated: preview.truncated,
        nextOffset: preview.content.length,
      };
    },
    async writeFile({ path, content }) {
      const rel = asWorkspacePath(path);
      await api(`v1/files?path=${encodeURIComponent(rel)}`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      });
    },
  };
}
