import { translate, useI18n } from '../../i18n';
import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor/editor/editor.api.js';
import 'monaco-editor/languages/definitions/cpp/register.js';
import 'monaco-editor/languages/definitions/css/register.js';
import 'monaco-editor/languages/definitions/html/register.js';
import 'monaco-editor/languages/definitions/java/register.js';
import 'monaco-editor/languages/definitions/javascript/register.js';
import 'monaco-editor/languages/definitions/markdown/register.js';
import 'monaco-editor/languages/definitions/python/register.js';
import 'monaco-editor/languages/definitions/rust/register.js';
import 'monaco-editor/languages/definitions/shell/register.js';
import 'monaco-editor/languages/definitions/sql/register.js';
import 'monaco-editor/languages/definitions/typescript/register.js';
import 'monaco-editor/languages/definitions/yaml/register.js';

declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorker: (_moduleId: string, label: string) => Worker;
    };
  }
}

window.MonacoEnvironment ??= {
  getWorker: () => {
    return new Worker(new URL('./workspace-editor.worker.js', import.meta.url), {
      type: 'module',
    });
  },
};

if (!monaco.languages.getLanguages().some(({ id }) => id === 'json')) {
  monaco.languages.register({
    id: 'json',
    extensions: ['.json', '.jsonl'],
    aliases: ['JSON', 'json'],
  });
  monaco.languages.setMonarchTokensProvider('json', {
    tokenizer: {
      root: [
        [/[{}[\]]/, 'delimiter.bracket'],
        [/[,:]/, 'delimiter'],
        [/"(?:[^"\\]|\\.)*"(?=\s*:)/, 'key'],
        [/"(?:[^"\\]|\\.)*"/, 'string.value'],
        [/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, 'number'],
        [/\b(?:true|false|null)\b/, 'keyword'],
      ],
    },
  });
}

monaco.editor.defineTheme('remote-codex-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#111318',
    'editor.foreground': '#d8dde7',
    'editorLineNumber.foreground': '#6f7787',
    'editorLineNumber.activeForeground': '#d8dde7',
    'editor.lineHighlightBackground': '#1b2029',
    'editor.selectionBackground': '#39475d',
    'editor.inactiveSelectionBackground': '#2a3444',
    'editorCursor.foreground': '#e8edf5',
    'editorIndentGuide.background1': '#282e38',
    'editorIndentGuide.activeBackground1': '#505969',
  },
});

monaco.editor.defineTheme('remote-codex-light', {
  base: 'vs',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#f8f9fb',
    'editor.foreground': '#20242c',
    'editorLineNumber.foreground': '#9299a6',
    'editorLineNumber.activeForeground': '#3a404b',
    'editor.lineHighlightBackground': '#eef1f5',
    'editor.selectionBackground': '#c9d8eb',
    'editor.inactiveSelectionBackground': '#dde5ef',
    'editorCursor.foreground': '#242933',
    'editorIndentGuide.background1': '#e1e5eb',
    'editorIndentGuide.activeBackground1': '#aeb6c3',
  },
});

const releasedKeys = new Set<string>();
const retainedModels = new Map<string, {model:monaco.editor.ITextModel;view:monaco.editor.ICodeEditorViewState|null}>();
window.addEventListener('workspace-model-release', (event) => {
  const key = (event as CustomEvent<string>).detail;
  releasedKeys.add(key);
  retainedModels.get(key)?.model.dispose(); retainedModels.delete(key);
});
export interface GraphWorkspaceMonacoEditorProps {
  resourceKey?: string;
  retainModel?: boolean;
  content: string;
  dark: boolean;
  focusLine?: number | null;
  language: string;
  onChange?: (content: string) => void;
  onSave?: () => void;
  path: string;
  readOnly: boolean;
}

function monacoLanguage(language: string) {
  const aliases: Record<string, string> = {
    jsx: 'javascript',
    text: 'plaintext',
    tsx: 'typescript',
  };
  return aliases[language] ?? (language || 'plaintext');
}

export default function GraphWorkspaceMonacoEditor({
  content,
  resourceKey,
  retainModel = false,
  dark,
  focusLine,
  language,
  onChange,
  onSave,
  path,
  readOnly,
}: GraphWorkspaceMonacoEditorProps) {
  const modelKey = resourceKey ?? path;
  const { locale } = useI18n();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelRef = useRef<monaco.editor.ITextModel | null>(null);
  const applyingContentRef = useRef(false);
  const initialContentRef = useRef(content);
  const initialDarkRef = useRef(dark);
  const initialLanguageRef = useRef(language);
  const initialReadOnlyRef = useRef(readOnly);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  onChangeRef.current = onChange;
  onSaveRef.current = onSave;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const uri = monaco.Uri.from({
      scheme: 'remote-codex-workspace',
      path: `/${encodeURIComponent(modelKey)}`,
    });
    releasedKeys.delete(modelKey);
    const retained = retainedModels.get(modelKey);
    retainedModels.delete(modelKey);
    const existingModel = retained?.model ?? monaco.editor.getModel(uri);
    const model =
      existingModel ??
      monaco.editor.createModel(
        initialContentRef.current,
        monacoLanguage(initialLanguageRef.current),
        uri,
      );
    modelRef.current = model;
    const editor = monaco.editor.create(host, {
      model,
      readOnly: initialReadOnlyRef.current,
      automaticLayout: true,
      theme: initialDarkRef.current
        ? 'remote-codex-dark'
        : 'remote-codex-light',
      ariaLabel: translate("files.workspaceEditor", { value1: path }),
      fontFamily:
        '"IBM Plex Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
      fontSize: 13,
      lineHeight: 21,
      lineNumbersMinChars: 3,
      minimap: { enabled: false },
      folding: true,
      foldingHighlight: true,
      glyphMargin: false,
      guides: { indentation: true, bracketPairs: true },
      bracketPairColorization: { enabled: true },
      renderLineHighlight: 'all',
      renderWhitespace: 'selection',
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      wordWrap: 'off',
      padding: { top: 10, bottom: 18 },
      overviewRulerBorder: false,
      stickyScroll: { enabled: true },
    });
    if (retained?.view) editor.restoreViewState(retained.view);
    editorRef.current = editor;
    const changeSubscription = model.onDidChangeContent(() => {
      if (!applyingContentRef.current) {
        onChangeRef.current?.(model.getValue());
      }
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSaveRef.current?.();
    });
    return () => {
      changeSubscription.dispose();
      if (retainModel && !releasedKeys.has(modelKey)) retainedModels.set(modelKey,{model,view:editor.saveViewState()});
      editor.dispose();
      editorRef.current = null;
      modelRef.current = null;
      if (!retainModel || releasedKeys.has(modelKey)) {
        model.dispose();
      }
    };
  }, [path,modelKey,retainModel]);

  useEffect(() => {
    const model = modelRef.current;
    if (!model || model.getValue() === content) {
      return;
    }
    applyingContentRef.current = true;
    model.setValue(content);
    applyingContentRef.current = false;
  }, [content]);

  useEffect(() => {
    monaco.editor.setTheme(dark ? 'remote-codex-dark' : 'remote-codex-light');
    editorRef.current?.updateOptions({ readOnly });
  }, [dark, readOnly]);

  useEffect(() => {
    editorRef.current?.updateOptions({ ariaLabel: translate('files.workspaceEditor', { value1: path }) });
  }, [locale, path]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !focusLine || focusLine < 1) {
      return;
    }
    const lineNumber = Math.min(focusLine, modelRef.current?.getLineCount() ?? focusLine);
    editor.setPosition({ lineNumber, column: 1 });
    editor.revealLineInCenter(lineNumber);
  }, [focusLine, path]);

  return (
    <div
      ref={hostRef}
      className="thread-graph-monaco-editor h-full min-h-0 w-full"
      data-testid="workspace-monaco-editor"
    />
  );
}
