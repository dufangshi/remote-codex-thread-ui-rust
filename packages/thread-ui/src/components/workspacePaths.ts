/** Workspace paths are filesystem paths, never routes relative to the Web URL. */
export function relativeWorkspacePath(value: string, workspaceRoot: string): string | null {
  let path = value.trim().replace(/\\/g, '/');
  const root = workspaceRoot.trim().replace(/\\/g, '/').replace(/\/+$/, '');
  const absolute = path.startsWith('/') || /^[a-z]:\//i.test(path);
  if (absolute) {
    const windows = /^[a-z]:\//i.test(root);
    const comparePath = windows ? path.toLowerCase() : path;
    const compareRoot = windows ? root.toLowerCase() : root;
    if (comparePath === compareRoot) return '';
    if (!comparePath.startsWith(`${compareRoot}/`)) return null;
    path = path.slice(root.length + 1);
  }
  const segments: string[] = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (!segments.length) return null;
      segments.pop();
    } else segments.push(part);
  }
  return segments.join('/');
}

export function workspaceDisplayPath(path: string, root: string) {
  const relative = relativeWorkspacePath(path, root);
  return relative === null ? null : `./${relative}`;
}
