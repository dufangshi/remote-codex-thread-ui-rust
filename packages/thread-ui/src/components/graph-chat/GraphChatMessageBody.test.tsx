// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { GraphChatUserMessageBody } from './GraphChatMessageBody';

it('opens attachments and closes only outside the image or with Escape', () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    act(() => root.render(<GraphChatUserMessageBody text="See [PHOTO screenshot.png]" attachmentPreviewUrls={{ 'screenshot.png': '/test.png' }} />));
    const trigger = container.querySelector<HTMLButtonElement>('[aria-label="Open image preview: screenshot.png"]')!;
    expect(trigger).not.toBeNull();
    act(() => trigger.click());
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-label')).toBe('Image preview: screenshot.png');
    act(() => dialog.querySelector<HTMLImageElement>('img')!.click());
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    act(() => dialog.querySelector<HTMLElement>('.thread-graph-image-lightbox-viewport')!.click());
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    act(() => trigger.click());
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape'})));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});
