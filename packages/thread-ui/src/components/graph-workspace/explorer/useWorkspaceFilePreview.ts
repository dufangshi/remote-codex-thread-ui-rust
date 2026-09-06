import { useLayoutEffect, useState } from 'react';

import type {
  ThreadWorkspaceAdapter,
  ThreadWorkspaceFilePreview,
} from '../../../adapters';
import {
  IMAGE_EXTENSIONS,
  PDF_EXTENSIONS,
  extensionOf,
} from '../workspaceTree';
import type { WorkspaceTreeNode } from '../workspaceTree';
import type { WorkspaceExplorerIdentity } from './useWorkspaceExplorerPersistence';

const PREVIEW_CHUNK_BYTES = 24_000;

export function useWorkspaceFilePreview({
  activeNode,
  adapter,
  identity,
  onError,
  refreshTree,
}: {
  activeNode: WorkspaceTreeNode | null;
  adapter?: ThreadWorkspaceAdapter | null;
  identity: WorkspaceExplorerIdentity;
  onError: (error: string | null) => void;
  refreshTree: (preferredPath?: string | null) => Promise<void>;
}) {
  const [previewFile, setPreviewFile] =
    useState<ThreadWorkspaceFilePreview | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useLayoutEffect(() => {
    const selectedPath = activeNode?.kind === 'file' ? activeNode.path : null;
    if (!adapter || !selectedPath) {
      setPreviewFile(null);
      setImageUrl(null);
      setPdfUrl(null);
      setPreviewLoading(false);
      return;
    }
    const currentAdapter = adapter;
    const currentPath = selectedPath;

    let cancelled = false;
    async function loadPreview() {
      setPreviewLoading(true);
      onError(null);
      setPreviewFile(null);
      setImageUrl(null);
      setPdfUrl(null);
      try {
        const extension = extensionOf(currentPath);
        const rawUrl = currentAdapter.getRawFileUrl?.({
          ...identity,
          path: currentPath,
        });
        if (rawUrl && IMAGE_EXTENSIONS.has(extension)) {
          if (!cancelled) {
            setImageUrl(rawUrl);
          }
          return;
        }
        if (rawUrl && PDF_EXTENSIONS.has(extension)) {
          if (!cancelled) {
            setPdfUrl(rawUrl);
          }
          return;
        }
        const file = await currentAdapter.readFile({
          ...identity,
          path: currentPath,
          limit: PREVIEW_CHUNK_BYTES,
        });
        if (!cancelled) {
          setPreviewFile(file);
        }
      } catch (error) {
        if (!cancelled) {
          onError(
            error instanceof Error ? error.message : 'Failed to read file',
          );
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    }
    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [
    activeNode?.id,
    activeNode?.kind,
    activeNode?.path,
    adapter,
    identity,
    onError,
  ]);

  async function loadMore() {
    if (!adapter || !previewFile?.truncated) {
      return;
    }
    const requestedPath = previewFile.path;
    setLoadingMore(true);
    try {
      const chunk = await adapter.readFile({
        ...identity,
        path: requestedPath,
        offset: previewFile.nextOffset,
        limit: PREVIEW_CHUNK_BYTES,
      });
      setPreviewFile((current) =>
        current?.path === requestedPath
          ? {
              ...current,
              content: current.content + chunk.content,
              truncated: chunk.truncated,
              nextOffset: chunk.nextOffset,
              size: chunk.size,
            }
          : current,
      );
    } finally {
      setLoadingMore(false);
    }
  }

  async function saveFile(input: { path: string; content: string }) {
    if (!adapter?.writeFile) {
      return;
    }
    onError(null);
    await adapter.writeFile({ ...identity, ...input });
    await refreshTree(input.path);
    const file = await adapter.readFile({
      ...identity,
      path: input.path,
      limit: PREVIEW_CHUNK_BYTES,
    });
    setPreviewFile(file);
  }

  return {
    imageUrl,
    loadingMore,
    loadMore,
    pdfUrl,
    previewFile,
    previewLoading,
    saveFile,
  };
}
