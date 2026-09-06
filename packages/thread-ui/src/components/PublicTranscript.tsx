import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkCjkFriendly from 'remark-cjk-friendly';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export interface PublicTranscriptSnapshot {
  title: string; createdAt: string; turnCount: number;
  turns: Array<{messages: Array<{role: 'user' | 'assistant'; text: string; createdAt?: string | null}>}>;
}

export function PublicTranscript({snapshot}: {snapshot: PublicTranscriptSnapshot}) {
  return <main className="public-transcript mx-auto w-full max-w-3xl px-5 py-8 sm:py-12">
    <header className="mb-8 border-b border-[var(--theme-border)] pb-5"><h1 className="text-xl font-semibold">{snapshot.title}</h1><p className="mt-2 text-xs text-[var(--theme-fg-muted)]">Read-only snapshot · {snapshot.turnCount} turns · {new Date(snapshot.createdAt).toLocaleString()}</p></header>
    {snapshot.turns.map((turn, index) => <section key={index} className="space-y-5 pb-7">
      {turn.messages.map((message, i) => <article key={i} data-role={message.role} className={message.role === 'user' ? 'ml-auto w-fit max-w-[90%] rounded-2xl bg-[var(--theme-panel)] px-4 py-3' : 'thread-graph-markdown py-1'}>
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkCjkFriendly, remarkMath]} rehypePlugins={[rehypeKatex]} components={{
          a: ({href, children}) => href && /^https?:\/\//i.test(href) ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span>,
          img: ({alt}) => <span className="text-xs text-[var(--theme-fg-muted)]">[{alt || 'Image attachment'}]</span>,
        }}>{message.text}</ReactMarkdown>
      </article>)}
    </section>)}
  </main>;
}
