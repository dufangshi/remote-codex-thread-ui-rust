import { describe, expect, it } from 'vitest';

import type { WorkspaceTreeNode } from '../workspaceTree';
import {
  beginWorkspaceExplorerDirectoryRequest,
  completeWorkspaceExplorerDirectoryRequest,
  createWorkspaceExplorerModel,
  failWorkspaceExplorerDirectoryRequest,
  findWorkspaceExplorerNodeByPath,
  hasWorkspaceExplorerPath,
  mergeWorkspaceExplorerSubtree,
  workspaceExplorerModelToTree,
} from './workspaceExplorerModel';

function directory(
  path: string,
  children: WorkspaceTreeNode[] = [],
  childrenLoaded = true,
): WorkspaceTreeNode {
  return {
    id: `workspace:${path}`,
    name: path.split('/').at(-1) || 'workspace',
    path,
    kind: 'directory',
    children,
    childrenLoaded,
    hasChildren: children.length > 0 || !childrenLoaded,
  };
}

function file(path: string): WorkspaceTreeNode {
  return {
    id: `workspace:${path}`,
    name: path.split('/').at(-1) ?? path,
    path,
    kind: 'file',
    children: [],
    size: 12,
  };
}

describe('workspaceExplorerModel', () => {
  it('retains parent identity when an old adapter labels a subtree as the workspace', () => {
    const model = createWorkspaceExplorerModel(directory('', [directory('.cargo', [], false), directory('src', [], false)]));
    const loaded = {...directory('.cargo', [file('.cargo/config.toml')]), name:'remoteCodex'};
    const next = mergeWorkspaceExplorerSubtree(model, loaded);
    expect(findWorkspaceExplorerNodeByPath(next,'.cargo')?.name).toBe('.cargo');
    expect(findWorkspaceExplorerNodeByPath(next,'.cargo/config.toml')?.parentId).toBe('workspace:.cargo');
    expect(findWorkspaceExplorerNodeByPath(next,'src')?.childrenState).toBe('unresolved');
  });

  it('normalizes and reconstructs resolved and unresolved directories', () => {
    const root = directory('', [
      directory('empty'),
      directory('src', [], false),
      file('README.md'),
    ]);
    const model = createWorkspaceExplorerModel(root);

    expect(findWorkspaceExplorerNodeByPath(model, 'empty')?.childrenState).toBe(
      'resolved',
    );
    expect(findWorkspaceExplorerNodeByPath(model, 'src')?.childrenState).toBe(
      'unresolved',
    );
    expect(hasWorkspaceExplorerPath(model, 'README.md')).toBe(true);
    expect(workspaceExplorerModelToTree(model)).toEqual(root);
  });

  it('preserves resolved descendants when a refreshed parent is unresolved', () => {
    const previous = createWorkspaceExplorerModel(
      directory('', [directory('src', [file('src/index.ts')])]),
    );
    const refreshed = directory('', [
      directory('src', [], false),
      file('new.ts'),
    ]);
    const model = createWorkspaceExplorerModel(refreshed, previous);

    expect(hasWorkspaceExplorerPath(model, 'src/index.ts')).toBe(true);
    expect(hasWorkspaceExplorerPath(model, 'new.ts')).toBe(true);
    expect(findWorkspaceExplorerNodeByPath(model, 'src')?.childrenState).toBe(
      'resolved',
    );
  });

  it('removes stale descendants after a resolved subtree refresh', () => {
    const previous = createWorkspaceExplorerModel(
      directory('', [directory('src', [file('src/old.ts')])]),
    );
    const next = mergeWorkspaceExplorerSubtree(
      previous,
      directory('src', [file('src/new.ts')]),
    );

    expect(hasWorkspaceExplorerPath(next, 'src/old.ts')).toBe(false);
    expect(hasWorkspaceExplorerPath(next, 'src/new.ts')).toBe(true);
  });

  it('ignores stale directory request completions and errors', () => {
    const initial = createWorkspaceExplorerModel(
      directory('', [directory('src', [], false)]),
    );
    const first = beginWorkspaceExplorerDirectoryRequest(initial, 'src');
    const second = beginWorkspaceExplorerDirectoryRequest(first.model, 'src');
    expect(first.generation).toBe(1);
    expect(second.generation).toBe(2);

    const staleCompletion = completeWorkspaceExplorerDirectoryRequest(
      second.model,
      {
        path: 'src',
        generation: first.generation!,
        children: [file('src/stale.ts')],
      },
    );
    expect(staleCompletion).toBe(second.model);

    const failed = failWorkspaceExplorerDirectoryRequest(staleCompletion, {
      path: 'src',
      generation: second.generation!,
      error: 'offline',
    });
    expect(findWorkspaceExplorerNodeByPath(failed, 'src')).toMatchObject({
      childrenState: 'error',
      error: 'offline',
    });

    const completed = completeWorkspaceExplorerDirectoryRequest(failed, {
      path: 'src',
      generation: second.generation!,
      children: [file('src/current.ts')],
      truncated: true,
    });
    expect(hasWorkspaceExplorerPath(completed, 'src/current.ts')).toBe(true);
    expect(findWorkspaceExplorerNodeByPath(completed, 'src')).toMatchObject({
      childrenState: 'resolved',
      truncated: true,
    });
  });
});
