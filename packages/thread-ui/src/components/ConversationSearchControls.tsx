export type ConversationSearchScope = 'thread' | 'workspace' | 'device';

/** Host supplies labels and permissions; this picker never infers access. */
export function ConversationSearchScopePicker({ value, onChange, labels, allowGlobal }: {
  value: ConversationSearchScope;
  onChange: (scope: ConversationSearchScope) => void;
  labels: { scope: string; thread: string; workspace: string; device: string };
  allowGlobal: boolean;
}) {
  return <select className="workbench-search-scope" aria-label={labels.scope} value={value}
    onChange={event => onChange(event.target.value as ConversationSearchScope)}>
    <option value="thread">{labels.thread}</option>
    {allowGlobal && <><option value="workspace">{labels.workspace}</option>
      <option value="device">{labels.device}</option></>}
  </select>;
}

/** Map folded offsets to original Unicode characters (e.g. İ → i + ◌̇). */
export function searchHighlightParts(text: string, query: string) {
  const foldedQuery = query.trim().toLowerCase();
  const found = foldedQuery ? text.toLowerCase().indexOf(foldedQuery) : -1;
  if (found < 0) return { before: text, match: '', after: '' };
  const chars = Array.from(text);
  let folded = 0, first = -1, last = 0;
  for (let i = 0; i < chars.length; i++) {
    const next = folded + chars[i]!.toLowerCase().length;
    if (next > found && first < 0) first = i;
    if (folded < found + foldedQuery.length) last = i + 1;
    folded = next;
    if (folded >= found + foldedQuery.length) break;
  }
  const start = Math.max(0, first - 80), finish = Math.min(chars.length, last + 180);
  return {
    before: `${start ? '…' : ''}${chars.slice(start, first).join('')}`,
    match: chars.slice(first, last).join(''),
    after: `${chars.slice(last, finish).join('')}${finish < chars.length ? '…' : ''}`,
  };
}

export function ConversationSearchExcerpt({ text, query }: { text: string; query: string }) {
  const parts = searchHighlightParts(text, query);
  return <p>{parts.before}{parts.match && <mark>{parts.match}</mark>}{parts.after}</p>;
}
