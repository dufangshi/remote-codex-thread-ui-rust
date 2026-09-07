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

it('normalizes browser Windows paths, URL encodings and UNC paths without capturing remote links', async () => {
  const {localFileHref, normalizeFileSystemPath} = await import('./workspacePaths');
  const origin = 'https://remote.lnz-study.com';
  for (const href of ['C:/Users/Admin/美股/a b.png', '/C:/Users/Admin/美股/a b.png', 'C:\\Users\\Admin\\美股\\a b.png', 'file:///C:/Users/Admin/%E7%BE%8E%E8%82%A1/a%20b.png', `${origin}/C%3A/Users/Admin/%E7%BE%8E%E8%82%A1/a%20b.png`]) {
    const path = localFileHref(href, origin)!;
    expect(path).toBe('C:/Users/Admin/美股/a b.png');
    expect(relativeWorkspacePath(path, 'c:\\users\\admin\\美股')).toBe('a b.png');
  }
  expect(normalizeFileSystemPath('/D:/output/x.png')).toBe('D:/output/x.png');
  expect(localFileHref('file://server/share/test.png', origin)).toBe('//server/share/test.png');
  expect(relativeWorkspacePath('\\\\SERVER\\SHARE\\a.png', '\\\\server\\share')).toBe('a.png');
  for (const url of ['https://other.test/C:/file.png', '//other.test/a.png', 'javascript:alert(1)', '/api/files/raw']) expect(localFileHref(url, origin)).toBeNull();
  expect(localFileHref(`${origin}/C:/100%2525.png`, origin)).toBe('C:/100%25.png');
});
