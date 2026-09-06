import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type ExpansionCache = {
  messages: Map<string, boolean>;
  live: { text: string; expanded: boolean } | null;
};
const ExpansionContext = createContext<ExpansionCache | null>(null);

// Keep disclosure choices above history grouping and streaming/final renderers.
// Each turn owns its cache, so another message/thread cannot inherit the choice.
export function MessageExpansionScope({ children }: { children: ReactNode }) {
  const [cache] = useState<ExpansionCache>(() => ({ messages: new Map(), live: null }));
  return <ExpansionContext.Provider value={cache}>{children}</ExpansionContext.Provider>;
}

export function useMessageExpansion(messageId: string | undefined, text: string, streaming: boolean) {
  const cache = useContext(ExpansionContext);
  const remembered = messageId ? cache?.messages.get(messageId) : undefined;
  // Unstructured streaming uses a temporary ID; promote only a matching prefix
  // to the persisted message. Ordinary message IDs remain independent.
  const inherited = remembered ?? (cache?.live && text.startsWith(cache.live.text)
    ? cache.live.expanded : false);
  const [choice, setChoice] = useState({ messageId, expanded: inherited });
  const expanded = choice.messageId === messageId ? choice.expanded : inherited;
  const setExpanded = (next: boolean) => {
    if (messageId) cache?.messages.set(messageId, next);
    if (cache && messageId === 'live-agent-message') cache.live = { text, expanded: next };
    setChoice({ messageId, expanded: next });
  };
  useEffect(() => {
    if (!streaming) return;
    if (messageId) cache?.messages.set(messageId, true);
    if (cache && messageId === 'live-agent-message' && text) cache.live = { text, expanded: true };
    // Streaming text is already fully visible; finalization must not hide it.
    setChoice(current => current.messageId === messageId && current.expanded ? current : { messageId, expanded: true });
  }, [cache, messageId, streaming, text]);
  return [expanded, setExpanded] as const;
}
