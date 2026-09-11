import { describe, expect, it } from 'vitest';

import { workspaceRelativeFocusPath, workspaceTreeNodeToGraphNode } from './workspaceTree';

describe('workspaceTreeNodeToGraphNode', () => {
  it('aligns dot-prefixed API paths with link focus and subtree keys', () => {
    const tree = workspaceTreeNodeToGraphNode({path:'.', name:'project', kind:'directory', children:[
      {path:'./AGENTS.md', name:'AGENTS.md', kind:'file'},
      {path:'./docs', name:'docs', kind:'directory', children:[{path:'./docs/policy.md',name:'policy.md',kind:'file'}]},
    ]});
    expect(tree.path).toBe('');
    expect(tree.children[0]?.id).toBe('workspace:AGENTS.md');
    expect(tree.children[1]?.path).toBe('docs');
    expect(tree.children[1]?.children[0]?.workspaceNode?.path).toBe('docs/policy.md');
    expect(workspaceRelativeFocusPath('./AGENTS.md ', '/project')).toBe(tree.children[0]?.path);
  });

  it.each(['/outside/file.md', 'C:/Work/file.md', '//server/share/file.md'])(
    'preserves the absolute linked-file path %s', path => {
      expect(workspaceTreeNodeToGraphNode({path,name:'file.md',kind:'file'}).path).toBe(path);
    },
  );
});

describe('workspaceRelativeFocusPath', () => {
  it('converts absolute Unix and Windows paths to workspace-relative paths', () => {
    expect(
      workspaceRelativeFocusPath(
        '/home/u/treer/docs/architecture.md',
        '/home/u/treer',
      ),
    ).toBe('docs/architecture.md');
    expect(
      workspaceRelativeFocusPath(
        'C:\\Users\\treer\\docs\\architecture.md',
        'C:\\Users\\treer',
      ),
    ).toBe('docs/architecture.md');
  });

  it('preserves paths that are already relative to the workspace', () => {
    expect(
      workspaceRelativeFocusPath('docs/architecture.md', '/home/u/treer'),
    ).toBe('docs/architecture.md');
  });
});
