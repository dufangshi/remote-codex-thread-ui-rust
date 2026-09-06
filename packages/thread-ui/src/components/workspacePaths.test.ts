import {expect,it} from 'vitest';
import {relativeWorkspacePath,workspaceDisplayPath} from './workspacePaths';
it('uses the entire workspace-relative path and never matches a similar root or basename',()=>{
  expect(workspaceDisplayPath('/Users/mac/dev/ElAgente/el-agent/docs/design.md','/Users/mac/dev/ElAgente')).toBe('./el-agent/docs/design.md');
  expect(workspaceDisplayPath('docs/plan.md','/Users/mac/dev/ElAgente')).toBe('./docs/plan.md');
  expect(workspaceDisplayPath('C:\\Work\\Demo\\docs\\plan.md','c:/work/demo')).toBe('./docs/plan.md');
  expect(relativeWorkspacePath('/workspace/demo-other/file.md','/workspace/demo')).toBeNull();
  expect(relativeWorkspacePath('../outside.md','/workspace/demo')).toBeNull();
  expect(relativeWorkspacePath('./docs/../plan.md','/workspace/demo')).toBe('plan.md');
});
