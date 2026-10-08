import { useCallback, useRef, useState } from 'react';

export type ReferenceMode = 'focus' | 'thread' | 'files' | 'collaboration';
export interface WorkbenchPresentation {
  referenceId: string | null;
  mode: ReferenceMode;
  ratio: number;
}
export const defaultPresentation: WorkbenchPresentation = {
  referenceId: null,
  mode: 'focus',
  ratio: 55,
};
export function normalizePresentation(
  members: unknown,
  arrangement: unknown,
): WorkbenchPresentation {
  const m = members as { schemaVersion?: number; referenceId?: unknown } | null;
  const a = arrangement as {
    schemaVersion?: number;
    mode?: unknown;
    ratio?: unknown;
  } | null;
  const referenceId =
    m?.schemaVersion === 1 &&
    typeof m.referenceId === 'string' &&
    /^[a-zA-Z0-9_-]{1,128}$/.test(m.referenceId)
      ? m.referenceId
      : null;
  const mode =
    a?.schemaVersion === 1 &&
    ['focus', 'thread', 'files', 'collaboration'].includes(String(a.mode))
      ? (a.mode as ReferenceMode)
      : referenceId
        ? 'thread'
        : 'focus';
  const ratio =
    a?.schemaVersion === 1 &&
    typeof a.ratio === 'number' &&
    Number.isFinite(a.ratio)
      ? Math.max(35, Math.min(65, a.ratio))
      : 55;
  return {
    referenceId,
    mode: mode === 'thread' && !referenceId ? 'focus' : mode,
    ratio,
  };
}
function read(scope: string | null): WorkbenchPresentation {
  if (!scope) return defaultPresentation;
  const parse = (suffix: string) => {
    try {
      return JSON.parse(localStorage.getItem(`${scope}.${suffix}`) ?? 'null');
    } catch {
      return null;
    }
  };
  return normalizePresentation(parse('members'), parse('arrangement'));
}
/** Members and arrangement are independent: a damaged ratio/mode never removes a reference. No transcript or drafts are written here. */
export function useWorkbenchPresentation(scope: string | null) {
  const owner = useRef({ scope });
  if (owner.current.scope !== scope) owner.current = { scope };
  const generation = owner.current;
  const [stored, setStored] = useState(() => ({
    generation,
    value: read(scope),
    storageFailed: false,
  }));
  if (stored.generation !== generation)
    setStored({ generation, value: read(scope), storageFailed: false });
  const value = stored.generation === generation ? stored.value : read(scope);
  const update = useCallback(
    (patch: Partial<WorkbenchPresentation>) => {
      if (owner.current !== generation) return;
      setStored((previous) => {
        if (owner.current !== generation) return previous;
        const next = {
          ...(previous.generation === generation
            ? previous.value
            : read(scope)),
          ...patch,
        };
        let storageFailed = false;
        if (scope)
          try {
            // Do not rewrite membership for a resize or mode change.
            if ('referenceId' in patch)
              localStorage.setItem(
                `${scope}.members`,
                JSON.stringify({
                  schemaVersion: 1,
                  referenceId: next.referenceId,
                }),
              );
            localStorage.setItem(
              `${scope}.arrangement`,
              JSON.stringify({
                schemaVersion: 1,
                mode: next.mode,
                ratio: next.ratio,
              }),
            );
          } catch {
            storageFailed = true;
          }
        return { generation, value: next, storageFailed };
      });
    },
    [generation, scope],
  );
  return {
    value,
    update,
    storageFailed: stored.generation === generation && stored.storageFailed,
  };
}
