import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { serializeEditorPrompt } from "./contentEditablePrompt";

/** Measure the rendered font and attachment chips against the *collapsed*
 * budget. The editor's current width/caret never decides the layout, avoiding
 * an expand/collapse feedback loop when the wide editor gains another row. */
export function promptExceedsCompactLine(
  editor: HTMLDivElement,
  group: HTMLElement,
  toolbar: HTMLElement,
) {
  const text = serializeEditorPrompt(editor);
  if (!text.trim() && !editor.querySelector('[data-segment-type="attachment"]'))
    return false;
  if (/[\r\n]/.test(text)) return true;
  const groupStyle = getComputedStyle(group);
  const scale = group.offsetWidth
    ? group.getBoundingClientRect().width / group.offsetWidth
    : 1;
  const gap = Number.parseFloat(groupStyle.columnGap) || 0;
  const padding =
    (Number.parseFloat(groupStyle.paddingLeft) || 0) +
    (Number.parseFloat(groupStyle.paddingRight) || 0);
  const available =
    group.getBoundingClientRect().width -
    toolbar.getBoundingClientRect().width -
    (gap + padding) * scale;
  // Hidden panes have no layout. Wait for ResizeObserver when they become visible.
  if (group.getBoundingClientRect().width <= 0) return false;
  const style = getComputedStyle(editor);
  const measurement = editor.cloneNode(true) as HTMLDivElement;
  measurement.removeAttribute("role");
  measurement.removeAttribute("contenteditable");
  measurement.removeAttribute("id");
  measurement.setAttribute("aria-hidden", "true");
  measurement.inert = true;
  Object.assign(measurement.style, {
    position: "absolute",
    visibility: "hidden",
    pointerEvents: "none",
    width: "max-content",
    minWidth: "0",
    maxWidth: "none",
    height: "auto",
    minHeight: "0",
    maxHeight: "none",
    overflow: "visible",
    whiteSpace: "pre",
    padding: "0",
    margin: "0",
    border: "0",
    font: style.font,
    letterSpacing: style.letterSpacing,
    wordSpacing: style.wordSpacing,
    textTransform: style.textTransform,
  });
  group.append(measurement);
  const width = measurement.getBoundingClientRect().width;
  measurement.remove();
  return width > Math.max(0, available) + 0.5 * scale;
}

export function useCompactComposer(
  formRef: RefObject<HTMLFormElement | null>,
  enabled: boolean,
) {
  const [expanded, setExpanded] = useState(false);
  const focusOwner = useId();
  // React capture also reaches portals rendered by composer descendants.
  const ownedEvents = useRef(new WeakSet<Event>());
  const captureOwnedEvent = (event: FocusEvent | ReactPointerEvent) => {
    ownedEvents.current.add(event.nativeEvent);
  };
  useLayoutEffect(() => {
    const form = formRef.current;
    const editor = form?.querySelector<HTMLDivElement>(
      '[role="textbox"][contenteditable]',
    );
    const group = form?.querySelector<HTMLElement>('[data-slot="input-group"]');
    const toolbar = form?.querySelector<HTMLElement>(
      '[data-slot="input-group-addon"]',
    );
    if (!enabled || !form || !editor || !group || !toolbar) {
      setExpanded(false);
      return;
    }
    let frame = 0;
    let alive = true;
    const ownsTarget = (target: EventTarget | null) =>
      target instanceof Node &&
      (form.contains(target) ||
        (target instanceof Element &&
          target
            .closest("[data-composer-focus-owner]")
            ?.getAttribute("data-composer-focus-owner") === focusOwner));
    const ownsEvent = (event: Event) =>
      ownedEvents.current.has(event) || ownsTarget(event.target);
    let focusWithin = ownsTarget(document.activeElement);
    let pointerWithin = false;
    let pendingPointerEvent: PointerEvent | null = null;
    const measure = () => {
      if (!alive || editor.dataset.imeComposing === "true") return;
      if (pendingPointerEvent) {
        pointerWithin = ownsEvent(pendingPointerEvent);
        focusWithin = pointerWithin;
        pendingPointerEvent = null;
      }
      const focused = focusWithin;
      const next = focused && promptExceedsCompactLine(editor, group, toolbar);
      setExpanded((current) => (current === next ? current : next));
      if (!focused) {
        editor.scrollTop = 0;
        if (editor.parentElement) editor.parentElement.scrollTop = 0;
      }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    // Track the complete interaction area, including buttons and owned portals.
    // Outside pointerdown also handles non-focusable timeline/background targets.
    const onPointerDown = (event: PointerEvent) => {
      // Read after React capture has marked portal events, even if a menu
      // stops native propagation before it can reach document's bubble phase.
      pendingPointerEvent = event;
      schedule();
    };
    const onFocusIn = (event: globalThis.FocusEvent) => {
      focusWithin = ownsEvent(event);
      schedule();
    };
    const onFocusOut = (event: globalThis.FocusEvent) => {
      if (!ownsEvent(event)) return;
      focusWithin =
        ownsTarget(event.relatedTarget) ||
        (!event.relatedTarget && pointerWithin);
      schedule();
    };
    const onKeyDown = () => {
      pointerWithin = false;
      pendingPointerEvent = null;
    };
    const onWindowBlur = () => {
      focusWithin = false;
      pendingPointerEvent = null;
      schedule();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("blur", onWindowBlur);
    editor.addEventListener("input", schedule);
    editor.addEventListener("compositionend", schedule);
    editor.addEventListener("load", schedule, true);
    const mutation = new MutationObserver(schedule);
    mutation.observe(editor, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["data-ime-composing"],
    });
    const resize =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(schedule);
    resize?.observe(group);
    resize?.observe(toolbar);
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    document.fonts?.addEventListener("loadingdone", schedule);
    measure();
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      mutation.disconnect();
      resize?.disconnect();
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("blur", onWindowBlur);
      editor.removeEventListener("input", schedule);
      editor.removeEventListener("compositionend", schedule);
      editor.removeEventListener("load", schedule, true);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      document.fonts?.removeEventListener("loadingdone", schedule);
    };
  }, [enabled, focusOwner, formRef]);
  return {
    expanded,
    focusOwner,
    onFocusCapture: captureOwnedEvent,
    onBlurCapture: captureOwnedEvent,
    onPointerDownCapture: captureOwnedEvent,
  };
}
