import { useRef, useState, type ChangeEvent } from 'react';

import { workspaceDisplayPath } from '../../workspacePaths';
import type { ThreadWorkspaceAdapter } from '../../../adapters';
import type { WorkspaceTreeNode } from '../workspaceTree';
import type { WorkspaceExplorerIdentity } from './useWorkspaceExplorerPersistence';

export function useWorkspaceExplorerActions({
  activeNode,
  adapter,
  identity,
  onError,
  onLoadingChange,
  refreshTree,
  workspaceRootPath,
}: {
  activeNode: WorkspaceTreeNode | null;
  adapter?: ThreadWorkspaceAdapter | null;
  identity: WorkspaceExplorerIdentity;
  onError: (error: string | null) => void;
  onLoadingChange: (loading: boolean) => void;
  refreshTree: (preferredPath?: string | null) => Promise<void>;
  workspaceRootPath: string;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showGarbageDialog, setShowGarbageDialog] = useState(false);
  const [garbageFiles, setGarbageFiles] = useState<string[]>([]);

  async function uploadFile(file: File) {
    if (!adapter?.uploadFile || !file) {
      return;
    }
    onLoadingChange(true);
    onError(null);
    try {
      const result = await adapter.uploadFile({
        ...identity,
        path: file.name,
        file,
      });
      const preferredPath =
        result.kind === 'archive'
          ? (result.paths[0] ?? null)
          : result.file.path;
      await refreshTree(preferredPath);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      onLoadingChange(false);
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) {
      await uploadFile(file);
    }
  }

  function pickUploadFile() {
    if (!adapter?.uploadFile) {
      return;
    }
    const defaultPick = () => fileInputRef.current?.click();
    if (adapter.pickUploadFile) {
      void adapter.pickUploadFile({
        ...identity,
        defaultPick,
        upload: uploadFile,
      });
      return;
    }
    defaultPick();
  }

  function downloadNode(node: WorkspaceTreeNode) {
    void adapter?.downloadNode?.({
      ...identity,
      path: node.path,
      kind: node.kind === 'directory' ? 'directory' : 'file',
    });
  }

  function copyPath(node: WorkspaceTreeNode) {
    if (
      !node.path ||
      typeof navigator === 'undefined' ||
      !navigator.clipboard
    ) {
      return;
    }
    const path = workspaceDisplayPath(node.path, workspaceRootPath);
    if (path === null) return;
    void navigator.clipboard.writeText(path).catch((error) => {
      onError(
        error instanceof Error ? error.message : 'Failed to copy file path',
      );
    });
  }

  async function openGarbage() {
    if (!adapter?.emptyGarbage) {
      return;
    }
    onError(null);
    if (!adapter.listGarbage) {
      setGarbageFiles([]);
      setShowGarbageDialog(true);
      return;
    }
    try {
      const files = await adapter.listGarbage(identity);
      setGarbageFiles(files.map((file) => `garbage/${file}`));
    } catch (error) {
      setGarbageFiles([]);
      onError(
        error instanceof Error ? error.message : 'Failed to list garbage files',
      );
    } finally {
      setShowGarbageDialog(true);
    }
  }

  async function confirmEmptyGarbage() {
    if (!adapter?.emptyGarbage) {
      return;
    }
    setShowGarbageDialog(false);
    onError(null);
    try {
      await adapter.emptyGarbage(identity);
      await refreshTree(activeNode?.path ?? null);
    } catch (error) {
      onError(
        error instanceof Error ? error.message : 'Failed to empty garbage',
      );
    }
  }

  return {
    confirmEmptyGarbage,
    copyPath,
    downloadNode,
    fileInputRef,
    garbageFiles,
    handleUpload,
    openGarbage,
    pickUploadFile,
    setShowGarbageDialog,
    showGarbageDialog,
  };
}
