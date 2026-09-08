export function textFromClipboardHtml(value: string) {
  if (!value) {
    return '';
  }

  const container = document.createElement('div');
  container.innerHTML = value;
  return serializePromptContent(container, false);
}

export function editorContainsStyledRichText(editor: HTMLDivElement) {
  return Array.from(editor.querySelectorAll('[style], font')).some(
    node => !node.closest('[data-segment-type="attachment"][contenteditable="false"]'),
  );
}

export interface EditorSelectionOffsets {
  start: number;
  end: number;
}

const BLOCK_PROMPT_TAGS = new Set(['DIV', 'LI', 'P']);

function serializePromptNode(node: ChildNode, currentText: string): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return currentText + (node.textContent ?? '');
  }

  if (!(node instanceof HTMLElement)) {
    return currentText;
  }

  if (node.dataset.segmentType === 'attachment' && node.dataset.placeholder) {
    return currentText + node.dataset.placeholder;
  }

  if (node.tagName === 'BR') {
    return `${currentText}\n`;
  }

  let nextText = currentText;
  if (
    BLOCK_PROMPT_TAGS.has(node.tagName) &&
    nextText.length > 0 &&
    !nextText.endsWith('\n')
  ) {
    nextText += '\n';
  }

  for (const child of Array.from(node.childNodes)) {
    nextText = serializePromptNode(child, nextText);
  }
  return nextText;
}

function serializePromptContent(root: HTMLElement, normalizeNbsp = true) {
  let text = '';
  for (const child of Array.from(root.childNodes)) {
    text = serializePromptNode(child, text);
  }
  return normalizeNbsp ? text.replace(/\u00a0/g, ' ') : text;
}

export function segmentNodeText(child: ChildNode) {
  if (
    child instanceof HTMLElement &&
    child.dataset.segmentType === 'attachment' &&
    child.dataset.placeholder
  ) {
    return child.dataset.placeholder;
  }

  return serializePromptNode(child, '');
}

export function serializeEditorPrompt(editor: HTMLDivElement) {
  return serializePromptContent(editor);
}

export function measureSelectionOffset(
  root: HTMLDivElement,
  container: Node,
  offset: number,
) {
  let resolvedChild: ChildNode | null = null;
  let offsetWithinChild = offset;

  if (container === root) {
    const childNodes = Array.from(root.childNodes);
    let total = 0;
    for (
      let index = 0;
      index < Math.min(offset, childNodes.length);
      index += 1
    ) {
      const child = childNodes[index];
      if (child) {
        total += segmentNodeText(child).length;
      }
    }
    return total;
  }

  if (container.nodeType === Node.TEXT_NODE) {
    resolvedChild = container as ChildNode;
  } else {
    const nearestChild = Array.from(root.childNodes).find((child) =>
      child.contains(container),
    );
    if (!nearestChild) {
      return serializeEditorPrompt(root).length;
    }
    resolvedChild = nearestChild;

    if (
      nearestChild instanceof HTMLElement &&
      nearestChild.dataset.segmentType === 'attachment'
    ) {
      const range = document.createRange();
      range.selectNodeContents(nearestChild);
      const placeholderLength = segmentNodeText(nearestChild).length;
      try {
        range.setEnd(container, offset);
        const visibleOffset = range.toString().length;
        const attachmentTextLength = nearestChild.textContent?.length ?? 0;
        if (attachmentTextLength === 0) {
          offsetWithinChild = placeholderLength;
        } else {
          offsetWithinChild = Math.round(
            Math.min(1, visibleOffset / attachmentTextLength) *
              placeholderLength,
          );
        }
      } catch {
        offsetWithinChild = placeholderLength;
      }
    } else {
      const range = document.createRange();
      range.selectNodeContents(nearestChild);
      try {
        range.setEnd(container, offset);
        offsetWithinChild = range.toString().length;
      } catch {
        offsetWithinChild = segmentNodeText(nearestChild).length;
      }
    }
  }

  const childNodes = Array.from(root.childNodes);
  let total = 0;
  for (const child of childNodes) {
    if (child === resolvedChild) {
      if (child.nodeType === Node.TEXT_NODE) {
        return total + offsetWithinChild;
      }
      return total + Math.min(offsetWithinChild, segmentNodeText(child).length);
    }
    total += segmentNodeText(child).length;
  }

  return total;
}

export function snapshotEditorSelection(editor: HTMLDivElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (
    !editor.contains(range.startContainer) ||
    !editor.contains(range.endContainer)
  ) {
    return null;
  }

  return {
    start: measureSelectionOffset(
      editor,
      range.startContainer,
      range.startOffset,
    ),
    end: measureSelectionOffset(editor, range.endContainer, range.endOffset),
  };
}

export function resolveOffsetToDomPosition(
  root: HTMLDivElement,
  targetOffset: number,
) {
  let remaining = Math.max(0, targetOffset);
  const childNodes = Array.from(root.childNodes);

  for (const [index, child] of childNodes.entries()) {
    const childText = segmentNodeText(child);
    const childLength = childText.length;

    if (child.nodeType === Node.TEXT_NODE) {
      if (remaining <= childLength) {
        return {
          node: child,
          offset: remaining,
        };
      }

      remaining -= childLength;
      continue;
    }

    if (
      child instanceof HTMLElement &&
      child.dataset.segmentType === 'attachment'
    ) {
      if (remaining === 0) {
        return {
          node: root,
          offset: index,
        };
      }

      if (remaining <= childLength) {
        const nextChild = childNodes[index + 1];
        if (
          remaining === childLength &&
          nextChild?.nodeType === Node.TEXT_NODE
        ) {
          return {
            node: nextChild,
            offset: 0,
          };
        }
        return {
          node: root,
          offset: index + 1,
        };
      }

      remaining -= childLength;
      continue;
    }

    if (remaining <= childLength) {
      return {
        node: root,
        offset: index + 1,
      };
    }

    remaining -= childLength;
  }

  return {
    node: root,
    offset: root.childNodes.length,
  };
}

export function restoreEditorSelection(
  editor: HTMLDivElement,
  selection: EditorSelectionOffsets,
) {
  const startPosition = resolveOffsetToDomPosition(editor, selection.start);
  const endPosition = resolveOffsetToDomPosition(editor, selection.end);
  const range = document.createRange();
  range.setStart(startPosition.node, startPosition.offset);
  range.setEnd(endPosition.node, endPosition.offset);

  const currentSelection = window.getSelection();
  currentSelection?.removeAllRanges();
  currentSelection?.addRange(range);
}

export function restoreSelectionAfterInsertedAttachments(
  editor: HTMLDivElement,
  insertedClientIds: string[],
) {
  if (insertedClientIds.length === 0) {
    return false;
  }

  const lastInsertedClientId = insertedClientIds.at(-1);
  if (!lastInsertedClientId) {
    return false;
  }

  const attachmentNode = Array.from(editor.childNodes).find(
    (child) =>
      child instanceof HTMLElement &&
      child.dataset.segmentType === 'attachment' &&
      child.dataset.clientId === lastInsertedClientId,
  );

  if (!(attachmentNode instanceof HTMLElement)) {
    return false;
  }

  const range = document.createRange();
  const trailingNode = attachmentNode.nextSibling;
  if (trailingNode?.nodeType === Node.TEXT_NODE) {
    range.setStart(trailingNode, 0);
  } else {
    range.setStartAfter(attachmentNode);
  }
  range.collapse(true);

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  return true;
}
