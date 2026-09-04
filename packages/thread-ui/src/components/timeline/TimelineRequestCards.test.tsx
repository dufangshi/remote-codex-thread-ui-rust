// @vitest-environment jsdom

import type { ThreadActionRequestDto } from "@remote-codex/shared";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PendingRequestCard, RequestEntrySection } from "./TimelineRequestCards";

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
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  flushSync(() => {
    root?.render(
      <PendingRequestCard request={request} onRespond={onRespond} />,
    );
  });
  return { view: container, onRespond };
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

  it("does not render permission or request cards when permissions=0", () => {
    const request: ThreadActionRequestDto = {
      id: "perm-hidden",
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
          options: [{ label: "Allow once", description: "allow once" }],
        },
      ],
    };
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    flushSync(() => {
      root?.render(
        <RequestEntrySection
          hidePermissionCards
          entries={[
            {
              kind: "request",
              id: request.id,
              createdAt: request.createdAt,
              request,
            },
          ]}
        />,
      );
    });

    expect(container.textContent).not.toContain("Permission required");
    expect(container.querySelector(".timeline-pending-card")).toBeNull();
  });
});
