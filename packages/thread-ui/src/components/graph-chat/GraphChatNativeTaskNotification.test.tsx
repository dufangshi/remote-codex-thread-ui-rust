/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it } from 'vitest';
import { GraphChatGenericHistoryItem } from './GraphChatHistoryItems';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let cleanup: (() => void) | undefined;
afterEach(() => { act(() => cleanup?.()); cleanup = undefined; });

async function renderNotice(taskStatus: string, status = 'interrupted') {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  cleanup = () => { root.unmount(); container.remove(); };
  await act(async () => root.render(<GraphChatGenericHistoryItem
    item={{id:'notice',kind:'other',origin:'nativeTaskNotification',taskStatus,status,
      text:'Rerun desktop E2E after edit-step fix',createdAt:'2026-10-10T18:35:11.482Z'}}
    timeMeta={<span>23s</span>}
  />));
  return container;
}

it('uses the task result rather than its interrupted parent and lazily expands details', async () => {
  const container = await renderNotice('completed');
  expect(container.textContent).toContain('Background task completed');
  expect(container.textContent).not.toContain('Noted');
  expect(container.querySelector('.thread-graph-task-notice-detail')).toBeNull();
  expect(container.querySelector('pre')).toBeNull();
  const toggle = container.querySelector('button')!;
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  await act(async () => toggle.click());
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(container.querySelector('.thread-graph-task-notice-detail')?.textContent).toContain('Rerun desktop E2E after edit-step fix');
  expect(container.querySelector('time')?.dateTime).toBe('2026-10-10T18:35:11.482Z');
  await act(async () => toggle.click());
  expect(container.querySelector('.thread-graph-task-notice-detail')).toBeNull();
});

it.each([
  ['failed', 'Background task failed'],
  ['cancelled', 'Background task stopped'],
  ['running', 'Background task updated'],
])('keeps %s task results explicit', async (status, label) => {
  const container = await renderNotice(status, 'completed');
  expect(container.textContent).toContain(label);
  expect(container.querySelector('.is-failed') !== null).toBe(status === 'failed');
});
