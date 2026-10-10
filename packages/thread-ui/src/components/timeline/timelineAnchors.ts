import type {
  ThreadActionRequestDto,
  ThreadActivityNoteDto,
  ThreadAnsweredRequestNoteDto,
} from '@pockymoe/shared';

import type { TimelineTurn } from './timelineItems';

type TurnAnchor = {
  id: string;
  startedAt: string;
};

export type RequestEntryAnchor =
  | {
      kind: 'note';
      id: string;
      createdAt: string;
      note: ThreadAnsweredRequestNoteDto;
    }
  | {
      kind: 'request';
      id: string;
      createdAt: string;
      request: ThreadActionRequestDto;
    };

export interface RequestEntryAnchors {
  notesByTurnId: Map<string, ThreadAnsweredRequestNoteDto[]>;
  pendingRequestsByTurnId: Map<string, ThreadActionRequestDto[]>;
  beforeTurnId: Map<string, RequestEntryAnchor[]>;
  trailing: RequestEntryAnchor[];
}

export interface ActivityNoteAnchors {
  leading: ThreadActivityNoteDto[];
  beforeTurnId: Map<string, ThreadActivityNoteDto[]>;
  afterTurnId: Map<string, ThreadActivityNoteDto[]>;
  trailing: ThreadActivityNoteDto[];
}

function buildTurnSequence(
  visibleTurns: TimelineTurn[],
  optimisticTurn: TimelineTurn | null,
) {
  return [
    ...visibleTurns.map((turn) => ({
      id: turn.id,
      startedAt: turn.startedAt ?? '',
    })),
    ...(optimisticTurn
      ? [
          {
            id: optimisticTurn.id,
            startedAt: optimisticTurn.startedAt ?? '',
          },
        ]
      : []),
  ];
}

function addToMapList<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const current = map.get(key) ?? [];
  current.push(value);
  map.set(key, current);
}

function firstTurnAtOrAfter(turnSequence: TurnAnchor[], createdAt: string) {
  return turnSequence.find(
    (turn) =>
      createdAt &&
      turn.startedAt &&
      createdAt.localeCompare(turn.startedAt) <= 0,
  );
}

export function buildRequestEntryAnchors({
  answeredRequestNotes,
  pendingRequests,
  visibleTurns,
  optimisticTurn,
}: {
  answeredRequestNotes: ThreadAnsweredRequestNoteDto[];
  pendingRequests: ThreadActionRequestDto[];
  visibleTurns: TimelineTurn[];
  optimisticTurn: TimelineTurn | null;
}): RequestEntryAnchors {
  const visibleTurnIds = new Set(visibleTurns.map((turn) => turn.id));
  const notesByTurnId = new Map<string, ThreadAnsweredRequestNoteDto[]>();
  const pendingRequestsByTurnId = new Map<string, ThreadActionRequestDto[]>();
  const unanchoredAnsweredNotes: ThreadAnsweredRequestNoteDto[] = [];
  const unanchoredPendingRequests: ThreadActionRequestDto[] = [];

  for (const note of answeredRequestNotes) {
    if (note.turnId && visibleTurnIds.has(note.turnId)) {
      addToMapList(notesByTurnId, note.turnId, note);
    } else {
      unanchoredAnsweredNotes.push(note);
    }
  }

  for (const request of pendingRequests) {
    if (request.turnId && visibleTurnIds.has(request.turnId)) {
      addToMapList(pendingRequestsByTurnId, request.turnId, request);
    } else {
      unanchoredPendingRequests.push(request);
    }
  }

  const turnSequence = buildTurnSequence(visibleTurns, optimisticTurn);
  const beforeTurnId = new Map<string, RequestEntryAnchor[]>();
  const trailing: RequestEntryAnchor[] = [];
  const entries: RequestEntryAnchor[] = [
    ...unanchoredAnsweredNotes.map((note) => ({
      kind: 'note' as const,
      id: note.id,
      createdAt: note.createdAt ?? '',
      note,
    })),
    ...unanchoredPendingRequests.map((request) => ({
      kind: 'request' as const,
      id: request.id,
      createdAt: request.createdAt,
      request,
    })),
  ].sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  for (const entry of entries) {
    const anchor = firstTurnAtOrAfter(turnSequence, entry.createdAt);
    if (!anchor) {
      trailing.push(entry);
      continue;
    }
    addToMapList(beforeTurnId, anchor.id, entry);
  }

  return {
    notesByTurnId,
    pendingRequestsByTurnId,
    beforeTurnId,
    trailing,
  };
}

export function buildActivityNoteAnchors({
  activityNotes,
  visibleTurns,
  optimisticTurn,
}: {
  activityNotes: ThreadActivityNoteDto[];
  visibleTurns: TimelineTurn[];
  optimisticTurn: TimelineTurn | null;
}): ActivityNoteAnchors {
  const sortedNotes = [...activityNotes].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );
  const turnSequence = buildTurnSequence(visibleTurns, optimisticTurn);
  const leading: ThreadActivityNoteDto[] = [];
  const beforeTurnId = new Map<string, ThreadActivityNoteDto[]>();
  const afterTurnId = new Map<string, ThreadActivityNoteDto[]>();
  const trailing: ThreadActivityNoteDto[] = [];
  const knownTurnTimes = turnSequence
    .map((turn) => turn.startedAt)
    .filter((startedAt): startedAt is string => Boolean(startedAt))
    .sort();
  const latestKnownTurnTime = knownTurnTimes.at(-1) ?? null;

  for (const note of sortedNotes) {
    if (note.anchorTurnId === '__leading__') {
      leading.push(note);
      continue;
    }

    if (note.anchorTurnId) {
      if (turnSequence.some((turn) => turn.id === note.anchorTurnId)) {
        addToMapList(afterTurnId, note.anchorTurnId, note);
      } else {
        leading.push(note);
      }
      continue;
    }

    const anchor = firstTurnAtOrAfter(turnSequence, note.createdAt);
    if (!anchor) {
      if (
        !latestKnownTurnTime ||
        note.createdAt.localeCompare(latestKnownTurnTime) <= 0
      ) {
        leading.push(note);
      } else {
        trailing.push(note);
      }
      continue;
    }

    addToMapList(beforeTurnId, anchor.id, note);
  }

  return {
    leading,
    beforeTurnId,
    afterTurnId,
    trailing,
  };
}
