/** @vitest-environment jsdom */
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { describe, expect, it, vi } from 'vitest';
import { GroupedThreadTabs, groupThreads } from './GroupedThreadTabs';
import type { WorkbenchThread } from './MatterWorkbench';
const thread = (key: string, rootKey?: string): WorkbenchThread => ({key, rootKey, title: key, href: `/threads/${key}`, status: 'running', subtitle: '', favorite: false});

describe('agent thread groups', () => {
  it('groups children and grandchildren by the device-scoped root while preserving unrelated and missing-root threads', () => {
    const groups = groupThreads([thread('mac:child', 'mac:root'), thread('mac:root'), thread('mac:grandchild', 'mac:root'), thread('wsl:root'), thread('wsl:orphan', 'wsl:missing')]);
    expect(groups.map(g => g.root.key)).toEqual(['mac:root', 'wsl:root', 'wsl:orphan']);
    expect(groups[0].children.map(t => t.key)).toEqual(['mac:child', 'mac:grandchild']);
  });
  it('keeps fan-out collapsed, identifies the selected child and opens navigable child links outside the scrolling tabs', () => {
    const container = document.createElement('nav'); document.body.append(container);
    const root = createRoot(container); const navigate = vi.fn();
    try {
      flushSync(() => root.render(<GroupedThreadTabs threads={[thread('root'), thread('child', 'root'), thread('grandchild', 'root')]} currentKey="child" onNavigate={navigate} />));
      expect(container.querySelectorAll('a')).toHaveLength(1);
      expect(container.querySelector('[aria-current="page"]')?.textContent).toContain('root · child');
      const button = container.querySelector('button')!;
      expect(button.getAttribute('aria-expanded')).toBe('false');
      flushSync(() => button.click());
      const menu = document.querySelector('#matter-agent-threads')!;
      expect(container.contains(menu)).toBe(false);
      expect(menu.querySelectorAll('a')).toHaveLength(3);
      const child = menu.querySelector<HTMLAnchorElement>('a[href="/threads/grandchild"]')!;
      flushSync(() => child.click());
      expect(navigate).toHaveBeenCalledWith('/threads/grandchild');
      expect(document.querySelector('#matter-agent-threads')).toBeNull();
      flushSync(() => button.click());
      flushSync(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
      expect(document.querySelector('#matter-agent-threads')).toBeNull();
      expect(document.activeElement).toBe(button);
    } finally { flushSync(() => root.unmount()); container.remove(); }
  });
});
