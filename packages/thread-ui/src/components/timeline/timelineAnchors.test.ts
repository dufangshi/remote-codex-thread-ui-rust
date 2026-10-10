import { describe, expect, it } from 'vitest';

import type {
  ThreadActionRequestDto,
  ThreadActivityNoteDto,
  ThreadAnsweredRequestNoteDto,
} from '@pockymoe/shared';
import type { TimelineTurn } from './timelineItems';
import {
  buildActivityNoteAnchors,
  buildRequestEntryAnchors,
} from './timelineAnchors';

function turn(id: string, startedAt: string | null): TimelineTurn {
  return {
    id,
    startedAt,
    status: 'completed',
    error: null,
    items: [],
  };
}

function answeredNote(
  id: string,
  createdAt: string,
  turnId: string | null = null,
): ThreadAnsweredRequestNoteDto {
  return {
    id,
    turnId,
    title: id,
    summaryLines: [id],
    createdAt,
  };
}

function request(
  id: string,
  createdAt: string,
  turnId: string | null = null,
): ThreadActionRequestDto {
  return {
    id,
    kind: 'requestUserInput',
    title: id,
    description: null,
    turnId,
    itemId: null,
    createdAt,
    questions: [],
  };
}

function activity(
  id: string,
  createdAt: string,
  extra: Partial<ThreadActivityNoteDto> = {},
): ThreadActivityNoteDto {
  return {
    id,
    kind: 'fastMode',
    createdAt,
    text: id,
    ...extra,
  };
}

describe('timeline anchor utilities', () => {
  it('keeps request entries with visible turn ids grouped after those turns', () => {
    const anchors = buildRequestEntryAnchors({
      answeredRequestNotes: [
        answeredNote('note-visible', '2026-01-01T10:01:00.000Z', 'turn-1'),
        answeredNote('note-hidden', '2026-01-01T09:00:00.000Z', 'hidden'),
      ],
      pendingRequests: [
        request('request-visible', '2026-01-01T10:02:00.000Z', 'turn-1'),
      ],
      visibleTurns: [turn('turn-1', '2026-01-01T10:00:00.000Z')],
      optimisticTurn: null,
    });

    expect(anchors.notesByTurnId.get('turn-1')?.map((note) => note.id)).toEqual([
      'note-visible',
    ]);
    expect(
      anchors.pendingRequestsByTurnId
        .get('turn-1')
        ?.map((pendingRequest) => pendingRequest.id),
    ).toEqual(['request-visible']);
    expect(
      anchors.beforeTurnId.get('turn-1')?.map((entry) => entry.id),
    ).toEqual(['note-hidden']);
  });

  it('anchors unassigned request entries before the next chronological visible turn', () => {
    const anchors = buildRequestEntryAnchors({
      answeredRequestNotes: [
        answeredNote('later-note', '2026-01-01T12:00:00.000Z'),
        answeredNote('before-second', '2026-01-01T10:30:00.000Z'),
      ],
      pendingRequests: [
        request('before-first', '2026-01-01T09:30:00.000Z'),
      ],
      visibleTurns: [
        turn('turn-1', '2026-01-01T10:00:00.000Z'),
        turn('turn-2', '2026-01-01T11:00:00.000Z'),
      ],
      optimisticTurn: null,
    });

    expect(
      anchors.beforeTurnId.get('turn-1')?.map((entry) => entry.id),
    ).toEqual(['before-first']);
    expect(
      anchors.beforeTurnId.get('turn-2')?.map((entry) => entry.id),
    ).toEqual(['before-second']);
    expect(anchors.trailing.map((entry) => entry.id)).toEqual(['later-note']);
  });

  it('uses optimistic turns as chronological anchors for request entries', () => {
    const anchors = buildRequestEntryAnchors({
      answeredRequestNotes: [
        answeredNote('before-optimistic', '2026-01-01T11:30:00.000Z'),
      ],
      pendingRequests: [],
      visibleTurns: [turn('turn-1', '2026-01-01T10:00:00.000Z')],
      optimisticTurn: turn('optimistic', '2026-01-01T12:00:00.000Z'),
    });

    expect(
      anchors.beforeTurnId.get('optimistic')?.map((entry) => entry.id),
    ).toEqual(['before-optimistic']);
    expect(anchors.trailing).toEqual([]);
  });

  it('anchors activity notes by explicit anchors, chronological position, and trailing time', () => {
    const anchors = buildActivityNoteAnchors({
      activityNotes: [
        activity('trailing', '2026-01-01T12:00:00.000Z'),
        activity('explicit-leading', '2026-01-01T08:00:00.000Z', {
          anchorTurnId: '__leading__',
        }),
        activity('unknown-anchor', '2026-01-01T08:30:00.000Z', {
          anchorTurnId: 'hidden',
        }),
        activity('after-turn-1', '2026-01-01T10:05:00.000Z', {
          anchorTurnId: 'turn-1',
        }),
        activity('before-turn-2', '2026-01-01T10:30:00.000Z'),
      ],
      visibleTurns: [
        turn('turn-1', '2026-01-01T10:00:00.000Z'),
        turn('turn-2', '2026-01-01T11:00:00.000Z'),
      ],
      optimisticTurn: null,
    });

    expect(anchors.leading.map((note) => note.id)).toEqual([
      'explicit-leading',
      'unknown-anchor',
    ]);
    expect(anchors.afterTurnId.get('turn-1')?.map((note) => note.id)).toEqual([
      'after-turn-1',
    ]);
    expect(anchors.beforeTurnId.get('turn-2')?.map((note) => note.id)).toEqual([
      'before-turn-2',
    ]);
    expect(anchors.trailing.map((note) => note.id)).toEqual(['trailing']);
  });

  it('places unanchored activity notes in leading when there are no known turn times', () => {
    const anchors = buildActivityNoteAnchors({
      activityNotes: [activity('note', '2026-01-01T12:00:00.000Z')],
      visibleTurns: [turn('turn-without-time', null)],
      optimisticTurn: null,
    });

    expect(anchors.leading.map((note) => note.id)).toEqual(['note']);
    expect(anchors.trailing).toEqual([]);
  });
});
