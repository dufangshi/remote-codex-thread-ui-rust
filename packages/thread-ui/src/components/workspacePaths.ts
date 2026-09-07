/** Browsers serialize Windows drive paths as /C:/... in file and HTTP URLs. */
export function normalizeFileSystemPath(value: string) {
  return value.trim().replace(/\\/g, '/').replace(/^\/([a-z]:\/)/i, '$1');
}

const APP_LOCAL_PATH_PREFIXES = [
  '/api/', '/assets/', '/control-plane', '/devices/', '/relay/',
  '/relay-account', '/relay-admin', '/relay-devices', '/relay-portal',
  '/threads', '/workspaces',
];

/** Decode a local Markdown resource once; never redirect remote URLs to the device. */
export function localFileHref(value: string, origin?: string): string | null {
  let candidate = value.trim();
  if (!candidate || candidate.startsWith('#') || candidate.startsWith('//')) return null;
  if (/^(https?:|file:)/i.test(candidate)) {
    try {
      const url = new URL(candidate);
      if (url.protocol !== 'file:' && url.origin !== origin) return null;
      candidate = (url.protocol === 'file:' && url.hostname ? `//${url.hostname}` : '') + url.pathname + url.hash;
    } catch { return null; }
  } else {
    candidate = candidate.split('?')[0] ?? '';
  }
  try { candidate = decodeURIComponent(candidate); } catch { /* Retain malformed literal escapes. */ }
  candidate = normalizeFileSystemPath(candidate);
  if (/^[a-z][a-z+.-]*:/i.test(candidate) && !/^[a-z]:\//i.test(candidate)) return null;
  if (APP_LOCAL_PATH_PREFIXES.some(prefix => candidate === prefix || candidate.startsWith(prefix))) return null;
  return candidate || null;
}

/** Workspace paths are filesystem paths, never routes relative to the Web URL. */
export function relativeWorkspacePath(value: string, workspaceRoot: string): string | null {
  let path = normalizeFileSystemPath(value);
  const root = normalizeFileSystemPath(workspaceRoot).replace(/\/+$/, '');
  const absolute = path.startsWith('/') || /^[a-z]:\//i.test(path);
  if (absolute) {
    const windows = /^[a-z]:\//i.test(root) || root.startsWith('//');
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
