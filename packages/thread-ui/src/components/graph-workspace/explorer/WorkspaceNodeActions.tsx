import {
  Copy,
  ClipboardCopy,
  Download,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RenameDialog } from '../../RenameDialog';
import { ConfirmDialog } from '../../ConfirmDialog';
import type { WorkspaceTreeNode } from '../workspaceTree';

export interface WorkspaceNodeActionProps {
  onCopyPath?: (
    node: WorkspaceTreeNode,
    kind?: 'relative' | 'absolute',
  ) => void;
  onDownload?: (node: WorkspaceTreeNode) => void;
  onRename?: (node: WorkspaceTreeNode, name: string) => Promise<void>;
  onDelete?: (node: WorkspaceTreeNode) => Promise<void>;
}

export function WorkspaceNodeActions({
  node,
  onCopyPath,
  onDownload,
  onRename,
  onDelete,
}: WorkspaceNodeActionProps & { node: WorkspaceTreeNode }) {
  const [menu, setMenu] = useState<{ left: number; top: number } | null>(null);
  const [dialog, setDialog] = useState<'rename' | 'delete' | null>(null);
  const [name, setName] = useState(node.name);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const close = () => {
    setMenu(null);
    trigger.current?.focus();
  };
  useEffect(() => {
    if (!menu) return;
    const outside = (event: PointerEvent) => {
      if (
        !popup.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        setMenu(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const resize = () => setMenu(null);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', resize);
    popup.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('resize', resize);
    };
  }, [menu]);
  const actionClass =
    'thread-graph-tree-action flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition sm:h-7 sm:w-7';
  const mutate = async () => {
    setBusy(true);
    setError(null);
    try {
      if (dialog === 'rename') await onRename?.(node, name);
      else await onDelete?.(node);
      setDialog(null);
      trigger.current?.focus();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'File operation failed.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className="thread-graph-tree-actions absolute inset-y-0 right-1 flex items-center gap-0.5 pl-1"
      onKeyDown={(event) => event.stopPropagation()}
    >
      {onDownload && (
        <button
          type="button"
          onClick={() => onDownload(node)}
          className={actionClass}
          title={`Download ${node.name}`}
          aria-label={`Download ${node.name}`}
        >
          <Download size={14} />
        </button>
      )}
      {onCopyPath && (
        <>
          <button
            type="button"
            onClick={() => onCopyPath(node, 'relative')}
            className={actionClass}
            title={`Copy relative path for ${node.name}`}
            aria-label={`Copy relative path for ${node.name}`}
          >
            <Copy size={14} />
          </button>
          <button
            type="button"
            onClick={() => onCopyPath(node, 'absolute')}
            className={actionClass}
            title={`Copy absolute path for ${node.name}`}
            aria-label={`Copy absolute path for ${node.name}`}
          >
            <ClipboardCopy size={14} />
          </button>
        </>
      )}
      {(onRename || onDelete) && (
        <button
          ref={trigger}
          type="button"
          aria-label={`More actions for ${node.name}`}
          aria-haspopup="menu"
          aria-expanded={!!menu}
          className={actionClass}
          onClick={() => {
            const box = trigger.current!.getBoundingClientRect();
            setMenu(
              menu
                ? null
                : {
                    left: Math.max(
                      8,
                      Math.min(box.right - 176, window.innerWidth - 184),
                    ),
                    top: Math.max(
                      8,
                      Math.min(box.bottom + 4, window.innerHeight - 104),
                    ),
                  },
            );
          }}
        >
          <MoreHorizontal size={14} />
        </button>
      )}
      {menu &&
        createPortal(
          <div
            ref={popup}
            role="menu"
            aria-label={`Actions for ${node.name}`}
            className="thread-ui-shell workspace-node-menu"
            style={{
              position: 'fixed',
              left: menu.left,
              top: menu.top,
              zIndex: 1000,
              width: 176,
              background: 'var(--theme-panel)',
              color: 'var(--theme-fg)',
              border: '1px solid var(--theme-border)',
              borderRadius: 8,
              padding: 4,
              boxShadow: '0 8px 24px #0004',
            }}
          >
            {onRename && (
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setName(node.name);
                  setError(null);
                  setDialog('rename');
                  setMenu(null);
                }}
              >
                <Pencil size={14} /> Rename
              </button>
            )}
            {onDelete && (
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setError(null);
                  setDialog('delete');
                  setMenu(null);
                }}
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>,
          document.body,
        )}
      <RenameDialog
        open={dialog === 'rename'}
        title={`Rename ${node.kind === 'directory' ? 'folder' : 'file'}`}
        label="Name"
        value={name}
        onChange={setName}
        onCancel={() => setDialog(null)}
        onSubmit={mutate}
        busy={busy}
        error={error}
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        title={`Delete ${node.kind === 'directory' ? 'folder' : 'file'}?`}
        description={`Permanently delete ${node.path}${node.kind === 'directory' ? ' and its contents' : ''}?`}
        onCancel={() => setDialog(null)}
        onConfirm={mutate}
        busy={busy}
        error={error}
      />
    </div>
  );
}
