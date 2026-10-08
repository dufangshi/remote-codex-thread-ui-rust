// @vitest-environment jsdom
import { act, useRef } from "react";
import { createPortal } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCompactComposer } from "./useCompactComposer";

let root: Root;
let host: HTMLDivElement;
let portal: HTMLDivElement;

function Fixture() {
  const ref = useRef<HTMLFormElement>(null);
  const { expanded, focusOwner, ...events } = useCompactComposer(ref, true);
  return (
    <>
      <form
        ref={ref}
        data-composer-focus-owner={focusOwner}
        data-expanded={expanded}
        {...events}
      >
        <div data-slot="input-group">
          <div contentEditable role="textbox" suppressContentEditableWarning>
            {"one\ntwo"}
          </div>
          <div data-slot="input-group-addon">
            <button type="button">Tool</button>
          </div>
        </div>
        {createPortal(<button type="button">Portal action</button>, portal)}
      </form>
      <button type="button">Outside</button>
    </>
  );
}

async function settle(action: () => void) {
  await act(async () => {
    action();
    await vi.runOnlyPendingTimersAsync();
  });
}

function button(text: string) {
  return Array.from(document.querySelectorAll("button")).find(
    (node) => node.textContent === text,
  )!;
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(0), 0),
  );
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  host = document.createElement("div");
  portal = document.createElement("div");
  document.body.append(host, portal);
  root = createRoot(host);
  await settle(() => root.render(<Fixture />));
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  portal.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("composer interaction scope", () => {
  it("retains multiline expansion through toolbar and React portal focus, then collapses on outside keyboard focus", async () => {
    const editor = host.querySelector<HTMLDivElement>('[role="textbox"]')!;
    const form = host.querySelector("form")!;
    await settle(() => editor.focus());
    expect(form.dataset.expanded).toBe("true");
    await settle(() => button("Tool").focus());
    expect(form.dataset.expanded).toBe("true");
    await settle(() => button("Portal action").focus());
    expect(form.dataset.expanded).toBe("true");
    await settle(() => button("Outside").focus());
    expect(form.dataset.expanded).toBe("false");
  });

  it("owns external dialog roots by composer identity and collapses for a non-focusable outside click", async () => {
    const editor = host.querySelector<HTMLDivElement>('[role="textbox"]')!;
    const form = host.querySelector("form")!;
    const dialog = document.createElement("div");
    dialog.dataset.composerFocusOwner = form.dataset.composerFocusOwner;
    dialog.innerHTML = "<button>Owned settings</button>";
    document.body.append(dialog);
    await settle(() => editor.focus());
    await settle(() => dialog.querySelector("button")!.focus());
    expect(form.dataset.expanded).toBe("true");
    await settle(() =>
      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true })),
    );
    expect(form.dataset.expanded).toBe("false");
    dialog.remove();
  });

  it("collapses after keyboard focus leaves the document and keeps empty content on one line", async () => {
    const editor = host.querySelector<HTMLDivElement>('[role="textbox"]')!;
    const form = host.querySelector("form")!;
    await settle(() => editor.focus());
    expect(form.dataset.expanded).toBe("true");
    await settle(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
      );
      editor.blur();
    });
    expect(form.dataset.expanded).toBe("false");
    await settle(() => {
      editor.textContent = "";
      editor.focus();
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(form.dataset.expanded).toBe("false");
  });
});
