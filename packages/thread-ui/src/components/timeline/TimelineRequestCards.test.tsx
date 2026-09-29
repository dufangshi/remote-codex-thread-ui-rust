// @vitest-environment jsdom

import type { ThreadActionRequestDto } from "@remote-codex/shared";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PendingRequestCard } from "./TimelineRequestCards";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  if (root) {
    flushSync(() => root?.unmount());
  }
  container?.remove();
  root = null;
  container = null;
});

function renderRequest(request: ThreadActionRequestDto, onRespond = vi.fn()) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  flushSync(() => {
    root?.render(<PendingRequestCard request={request} onRespond={onRespond} />);
  });
  return { view: container, onRespond };
}

function renderPermission(onRespond = vi.fn()) {
  const request: ThreadActionRequestDto = {
    id: "perm-7",
    kind: "permissionRequest",
    title: "Run cargo test",
    description: "execute: cargo test",
    turnId: "turn-1",
    itemId: "call-1",
    createdAt: "2026-09-04T00:00:00Z",
    questions: [
      {
        id: "permission",
        header: "Permission",
        question: "Run cargo test",
        isOther: false,
        isSecret: false,
        options: [
          { label: "Allow once", description: "allow once" },
          { label: "Allow always", description: "allow always" },
          { label: "Reject", description: "reject once" },
        ],
      },
    ],
  };
  return renderRequest(request, onRespond);
}

describe("PendingRequestCard permissions", () => {
  it("renders ACP choices as immediate permission actions", () => {
    const { view, onRespond } = renderPermission();

    expect(view.textContent).toContain("Permission required");
    expect(view.textContent).toContain("execute: cargo test");
    expect(view.textContent).not.toContain("Submit");

    const allowAlways = Array.from(view.querySelectorAll("button")).find(
      (button) => button.textContent === "Allow always",
    );
    flushSync(() => allowAlways?.click());

    expect(onRespond).toHaveBeenCalledWith("perm-7", {
      answers: {
        permission: { answers: ["Allow always"] },
      },
    });
  });
});

describe("PendingRequestCard optional answers", () => {
  const request: ThreadActionRequestDto = {
    id: "form-1", kind: "requestUserInput", title: "Questions", description: null,
    turnId: "turn-1", itemId: null, createdAt: "2026-09-29T00:00:00Z",
    questions: [
      { id: "scope", header: "Scope", question: "How much?", isOther: true, isSecret: false,
        options: [{label: "All", description: ""}] },
      { id: "style", header: "Style", question: "What style?", required: true, isOther: false, isSecret: false,
        options: [{label: "Glass", description: ""}] },
      { id: "note", header: "Optional note", question: "Any extra detail?", required: false, isOther: false, isSecret: false, options: null },
    ],
  };

  it("submits selected answers without an optional field, but still requires real required questions", () => {
    const {view, onRespond} = renderRequest(request);
    const button = (label: string) => Array.from(view.querySelectorAll("button")).find(b => b.textContent === label)!;
    expect(button("Submit").disabled).toBe(true);
    flushSync(() => button("All").click());
    expect(button("Submit").disabled).toBe(true);
    flushSync(() => button("Glass").click());
    expect(button("Submit").disabled).toBe(false);
    flushSync(() => button("Submit").click());
    expect(onRespond).toHaveBeenCalledWith("form-1", {answers: {scope: {answers: ["All"]}, style: {answers: ["Glass"]}}});
    flushSync(() => button("Not from above").click());
    expect(button("Submit").disabled).toBe(true);
    expect(view.querySelector('[aria-label="Scope custom answer"]')).not.toBeNull();
  });

  it("allows skipping a fully optional Claude form without inventing blank answers", () => {
    const {view, onRespond} = renderRequest({...request, questions: request.questions.map(q => ({...q, required: false}))});
    const submit = Array.from(view.querySelectorAll("button")).find(b => b.textContent === "Submit")!;
    expect(submit.disabled).toBe(false);
    flushSync(() => submit.click());
    expect(onRespond).toHaveBeenCalledWith("form-1", {answers: {}});
  });
});
