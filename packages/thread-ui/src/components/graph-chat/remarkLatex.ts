import type { Extension as FromMarkdownExtension } from 'mdast-util-from-markdown';
import type { Extension, State, Tokenizer } from 'micromark-util-types';
import type { Processor } from 'unified';

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    latexMath: 'latexMath';
    latexMathData: 'latexMathData';
  }
}

// Parse before Markdown's character escapes, rather than replacing strings:
// code, links, escaped backslashes and existing dollar math retain their syntax.
const tokenize: Tokenizer = function (effects, ok, nok) {
  let closing: number;
  const start: State = code => {
    effects.enter('latexMath');
    effects.consume(code);
    return open;
  };
  const open: State = code => {
    if (code !== 40 && code !== 91) return nok(code);
    closing = code === 40 ? 41 : 93;
    effects.consume(code);
    return body;
  };
  const body: State = code => {
    if (code === null) return nok(code);
    if (code === -5 || code === -4 || code === -3) {
      effects.enter('lineEnding');
      effects.consume(code);
      effects.exit('lineEnding');
      return body;
    }
    effects.enter('latexMathData');
    return data(code);
  };
  const data: State = code => {
    if (code === null) return nok(code);
    if (code === -5 || code === -4 || code === -3) {
      effects.exit('latexMathData');
      return body(code);
    }
    effects.consume(code);
    return code === 92 ? slash : data;
  };
  const slash: State = code => {
    if (code === closing) {
      effects.consume(code);
      effects.exit('latexMathData');
      effects.exit('latexMath');
      return ok;
    }
    if (code === null) return nok(code);
    // Consume an escaped backslash as a pair (e.g. a matrix row separator).
    if (code === 92) {
      effects.consume(code);
      return data;
    }
    return data(code);
  };
  return start;
};

const syntax: Extension = { text: { 92: { name: 'latexMath', tokenize } } };
const fromMarkdown: FromMarkdownExtension = {
  enter: {
    latexMath(token) {
      const raw = this.sliceSerialize(token);
      this.enter({
        type: 'inlineMath',
        value: raw.slice(2, -2).trim(),
        data: {
          hName: 'code',
          hChildren: [{ type: 'text', value: raw.slice(2, -2).trim() }],
          hProperties: {
            className: ['language-math', raw[1] === '[' ? 'math-display' : 'math-inline'],
          },
        },
      }, token);
    },
  },
  exit: { latexMath(token) { this.exit(token); } },
};

export function remarkLatex(this: Processor) {
  const data = this.data() as {
    micromarkExtensions?: Extension[];
    fromMarkdownExtensions?: FromMarkdownExtension[];
  };
  (data.micromarkExtensions ??= []).push(syntax);
  (data.fromMarkdownExtensions ??= []).push(fromMarkdown);
}
