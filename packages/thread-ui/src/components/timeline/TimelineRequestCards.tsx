import { useState } from 'react';

import type {
  RespondThreadActionRequestInput,
  ThreadActionRequestDto,
  ThreadActivityNoteDto,
  ThreadAnsweredRequestNoteDto,
} from '@remote-codex/shared';
import {
  formatLongTimestamp,
  formatShortTimestamp,
} from '../threadPresentation';
import type { RequestEntryAnchor } from './timelineAnchors';

export function PendingRequestCard({
  request,
  busy = false,
  onRespond,
}: {
  request: ThreadActionRequestDto;
  busy?: boolean;
  onRespond?: ((
    requestId: string,
    input: RespondThreadActionRequestInput,
  ) => Promise<void> | void) | undefined;
}) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [selectedPlanDecision, setSelectedPlanDecision] = useState<
    string | null
  >(null);
  const primaryQuestion = request.questions[0] ?? null;
  const OTHER_SENTINEL = '__other__';
  const isPermissionRequest = request.kind === 'permissionRequest';
  const cardTitle =
    request.kind === 'planDecision'
      ? 'Plan'
      : isPermissionRequest
        ? 'Permission required'
      : request.kind === 'requestUserInput'
        ? 'Answer Required'
        : request.title;

  function getOptionPresentation(label: string) {
    const recommended = /\s*\(recommended\)\s*$/i.test(label);
    return {
      rawLabel: label,
      displayLabel: label.replace(/\s*\(recommended\)\s*$/i, '').trim(),
      recommended,
    };
  }

  function respondWithSingleAnswer(answer: string) {
    if (!primaryQuestion) {
      return;
    }

    setSelectedPlanDecision(answer);
    void onRespond?.(request.id, {
      answers: {
        [primaryQuestion.id]: {
          answers: [answer],
        },
      },
    });
  }

  function currentAnswerForQuestion(
    question: ThreadActionRequestDto['questions'][number],
  ) {
    const selected = answers[question.id] ?? '';
    if (Array.isArray(selected)) {
      return selected
        .map((answer) =>
          answer === OTHER_SENTINEL
            ? (customAnswers[question.id] ?? '').trim()
            : answer.trim(),
        )
        .filter(Boolean)
        .join(', ');
    }
    if (selected === OTHER_SENTINEL) {
      return (customAnswers[question.id] ?? '').trim();
    }

    return selected.trim();
  }

  function currentAnswersForQuestion(
    question: ThreadActionRequestDto['questions'][number],
  ) {
    const selected = answers[question.id] ?? '';
    if (Array.isArray(selected)) {
      return selected
        .map((answer) =>
          answer === OTHER_SENTINEL
            ? (customAnswers[question.id] ?? '').trim()
            : answer.trim(),
        )
        .filter(Boolean);
    }
    if (selected === OTHER_SENTINEL) {
      const customAnswer = (customAnswers[question.id] ?? '').trim();
      return customAnswer ? [customAnswer] : [];
    }
    const singleAnswer = selected.trim();
    return singleAnswer ? [singleAnswer] : [];
  }

  function toggleMultiSelectAnswer(questionId: string, label: string) {
    setAnswers((current) => {
      const currentAnswers = current[questionId];
      const selectedAnswers = Array.isArray(currentAnswers)
        ? currentAnswers
        : [];
      const nextAnswers = selectedAnswers.includes(label)
        ? selectedAnswers.filter((entry) => entry !== label)
        : [...selectedAnswers, label];
      return {
        ...current,
        [questionId]: nextAnswers,
      };
    });
  }

  return (
    <div className="timeline-pending-card w-full rounded-[1rem] border px-3 py-3 sm:rounded-[1.2rem] sm:px-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="timeline-primary-text text-sm font-medium">{cardTitle}</p>
          {request.kind !== 'planDecision' && request.description && (
            <p className="timeline-soft-text mt-1 text-[13px] leading-5">
              {request.description}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 space-y-3">
        {request.questions.map((question) => (
          <div
            key={question.id}
            className="timeline-question-section rounded-xl border p-2.5 sm:p-3"
          >
            <p className="timeline-meta-text text-xs uppercase tracking-[0.2em]">
              {question.header}
            </p>
            <p className="timeline-primary-text mt-1 text-[13px] leading-5 sm:text-sm">
              {question.question}
            </p>
            {(request.kind === 'planDecision' || isPermissionRequest) &&
            question.options &&
            question.options.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {question.options.map((option, index) => {
                  const presentation = getOptionPresentation(option.label);
                  const isImplement =
                    presentation.displayLabel.toLowerCase() === 'implement';
                  const isReject = /reject|cancel/i.test(
                    `${option.label} ${option.description}`,
                  );
                  return (
                    <button
                      key={option.label}
                      type="button"
                      disabled={busy}
                      onClick={() => respondWithSingleAnswer(option.label)}
                      className={`relative rounded-2xl border px-2.5 py-1.5 pr-6 text-[12px] leading-4 transition sm:text-[13px] ${
                        isReject
                          ? 'border-stone-700 text-stone-300 hover:bg-stone-800'
                          : index === 0
                          ? 'ui-action-info'
                          : 'border-stone-700 text-stone-200 hover:bg-stone-800'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                      title={option.description}
                    >
                      {presentation.recommended ? (
                        <span
                          aria-hidden="true"
                          className="absolute right-1.5 top-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/18 text-[10px] leading-none text-current"
                        >
                          ✦
                        </span>
                      ) : null}
                      {busy && selectedPlanDecision === option.label
                        ? isPermissionRequest
                          ? 'Submitting...'
                          : isImplement
                          ? 'Starting...'
                          : 'Saving...'
                        : presentation.displayLabel}
                    </button>
                  );
                })}
              </div>
            ) : question.options && question.options.length > 0 ? (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  {question.options.map((option) => {
                    const presentation = getOptionPresentation(option.label);
                    const selectedAnswer = answers[question.id];
                    return (
                      <button
                        key={option.label}
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          question.multiSelect
                            ? toggleMultiSelectAnswer(question.id, option.label)
                            : setAnswers((current) => ({
                                ...current,
                                [question.id]: option.label,
                              }))
                        }
                        className={`relative rounded-2xl border px-3 py-1.5 pr-6 text-[12px] leading-4 transition sm:text-[13px] ${
                          (question.multiSelect
                            ? Array.isArray(selectedAnswer) &&
                              selectedAnswer.includes(option.label)
                            : selectedAnswer === option.label)
                            ? 'ui-status-warning'
                            : 'border-stone-700 text-stone-300 hover:bg-stone-800'
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                        title={option.description}
                      >
                        {presentation.recommended ? (
                          <span
                            aria-hidden="true"
                            className="absolute right-1.5 top-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/10 text-[10px] leading-none text-amber-100/90"
                          >
                            ✦
                          </span>
                        ) : null}
                        {presentation.displayLabel}
                      </button>
                    );
                  })}
                  {question.isOther &&
                    (() => {
                      const selectedAnswer = answers[question.id];
                      return (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            question.multiSelect
                              ? toggleMultiSelectAnswer(
                                  question.id,
                                  OTHER_SENTINEL,
                                )
                              : setAnswers((current) => ({
                                  ...current,
                                  [question.id]: OTHER_SENTINEL,
                                }))
                          }
                          className={`rounded-2xl border px-3 py-1.5 text-[12px] leading-4 transition sm:text-[13px] ${
                            (question.multiSelect
                              ? Array.isArray(selectedAnswer) &&
                                selectedAnswer.includes(OTHER_SENTINEL)
                              : selectedAnswer === OTHER_SENTINEL)
                              ? 'ui-status-info'
                              : 'border-stone-700 text-stone-300 hover:bg-stone-800'
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          Not from above
                        </button>
                      );
                    })()}
                </div>
                {question.isOther &&
                  (() => {
                    const selectedAnswer = answers[question.id];
                    const showOtherInput = question.multiSelect
                      ? Array.isArray(selectedAnswer) &&
                        selectedAnswer.includes(OTHER_SENTINEL)
                      : selectedAnswer === OTHER_SENTINEL;
                    return showOtherInput ? (
                      <input
                        aria-label={`${question.header} custom answer`}
                        value={customAnswers[question.id] ?? ''}
                        onChange={(event) =>
                          setCustomAnswers((current) => ({
                            ...current,
                            [question.id]: event.target.value,
                          }))
                        }
                        placeholder="Enter a custom answer"
                        className="mt-3 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-sky-300"
                      />
                    ) : null;
                  })()}
              </>
            ) : (
              <input
                aria-label={question.header}
                value={answers[question.id] ?? ''}
                onChange={(event) =>
                  setAnswers((current) => ({
                    ...current,
                    [question.id]: event.target.value,
                  }))
                }
                className="mt-3 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-amber-300"
              />
            )}
          </div>
        ))}
      </div>
      {request.kind !== 'planDecision' && !isPermissionRequest && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            disabled={
              busy ||
              request.questions.some(
                (question) => !currentAnswerForQuestion(question),
              )
            }
            onClick={() =>
              void onRespond?.(request.id, {
                answers: Object.fromEntries(
                  request.questions.map((question) => [
                    question.id,
                    {
                      answers: currentAnswersForQuestion(question),
                    },
                  ]),
                ),
              })
            }
            className="ui-action-info rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed"
          >
            {busy ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      )}
    </div>
  );
}

export function AnsweredRequestNote({
  note,
}: {
  note: ThreadAnsweredRequestNoteDto;
}) {
  return (
    <div className="timeline-note-card w-full rounded-2xl border px-3 py-2.5">
      <p className="timeline-meta-text text-[11px] uppercase tracking-[0.2em]">
        {note.title}
      </p>
      <div className="mt-1 space-y-1">
        {note.summaryLines.map((line, index) => (
          <p
            key={`${note.id}-${index}`}
            className="timeline-primary-text text-[13px] leading-5"
          >
            You selected {line}
          </p>
        ))}
      </div>
    </div>
  );
}

export function ActivityNoteCard({
  note,
  onOpenThread,
  onOpenLinkedThread,
}: {
  note: ThreadActivityNoteDto;
  onOpenThread?: ((threadId: string) => void) | undefined;
  onOpenLinkedThread?: ((threadId: string) => void) | undefined;
}) {
  const title =
    note.kind === 'forkCreated'
      ? 'Fork'
      : note.kind === 'forkSource'
        ? 'Fork source'
        : note.kind === 'goal'
          ? 'Goal'
          : 'System';
  const body =
    note.kind === 'forkCreated'
      ? `Thread forked from Turn ${note.turnIndex ?? '?'}`
      : note.kind === 'forkSource'
        ? `Forked from ${note.linkedThreadTitle ?? 'source thread'} at Turn ${note.turnIndex ?? '?'}`
        : note.text ?? '';

  return (
    <div className="timeline-activity-card w-full rounded-2xl border px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="timeline-meta-text text-[11px] uppercase tracking-[0.2em]">
          {title}
        </p>
        <time
          dateTime={note.createdAt}
          title={formatLongTimestamp(note.createdAt)}
          className="timeline-meta-text text-[10px]"
        >
          {formatShortTimestamp(note.createdAt)}
        </time>
      </div>
      <p className="timeline-primary-text mt-1 text-[13px] leading-5">{body}</p>
      {note.linkedThreadId ? (
        <button
          type="button"
          onClick={() => {
            const linkedThreadId = note.linkedThreadId;
            if (!linkedThreadId) {
              return;
            }
            onOpenLinkedThread?.(linkedThreadId);
            onOpenThread?.(linkedThreadId);
          }}
          className="relative z-10 mt-2 inline-flex cursor-pointer rounded-full border border-amber-300/30 px-3 py-1.5 text-xs text-amber-100 transition hover:bg-amber-300/10"
        >
          {note.kind === 'forkCreated' ? 'Open fork' : 'Back to source'}
        </button>
      ) : null}
    </div>
  );
}

export function ActivityNoteSection({
  notes,
  onOpenThread,
  onOpenLinkedThread,
}: {
  notes: ThreadActivityNoteDto[];
  onOpenThread?: ((threadId: string) => void) | undefined;
  onOpenLinkedThread?: ((threadId: string) => void) | undefined;
}) {
  if (notes.length === 0) {
    return null;
  }

  return (
    <div className="thread-graph-message-section space-y-3 px-3 py-4 sm:px-5">
      {notes.map((note) => (
        <ActivityNoteCard
          key={note.id}
          note={note}
          onOpenThread={onOpenThread}
          onOpenLinkedThread={onOpenLinkedThread}
        />
      ))}
    </div>
  );
}

export function RequestEntrySection({
  entries,
  respondingRequestId,
  onRespondToRequest,
  hidePermissionCards = false,
}: {
  entries: RequestEntryAnchor[];
  respondingRequestId?: string | null | undefined;
  onRespondToRequest?:
    | ((
        requestId: string,
        input: RespondThreadActionRequestInput,
      ) => Promise<void> | void)
    | undefined;
  hidePermissionCards?: boolean;
}) {
  const visibleEntries = hidePermissionCards
    ? entries.filter((entry) => entry.kind !== 'request')
    : entries;
  if (visibleEntries.length === 0) {
    return null;
  }

  return (
    <div className="thread-graph-message-section space-y-3 px-3 py-4 sm:px-5">
      {visibleEntries.map((entry) =>
        entry.kind === 'note' ? (
          <AnsweredRequestNote key={entry.id} note={entry.note} />
        ) : (
          <PendingRequestCard
            key={entry.id}
            request={entry.request}
            busy={respondingRequestId === entry.request.id}
            onRespond={onRespondToRequest}
          />
        ),
      )}
    </div>
  );
}

export function RequestEntrySectionForTurn({
  notes,
  requests,
  respondingRequestId,
  onRespondToRequest,
  hidePermissionCards = false,
}: {
  notes: ThreadAnsweredRequestNoteDto[];
  requests: ThreadActionRequestDto[];
  respondingRequestId?: string | null | undefined;
  onRespondToRequest?:
    | ((
        requestId: string,
        input: RespondThreadActionRequestInput,
      ) => Promise<void> | void)
    | undefined;
  hidePermissionCards?: boolean;
}) {
  const entries: RequestEntryAnchor[] = [
    ...notes.map((note) => ({
      kind: 'note' as const,
      id: note.id,
      createdAt: note.createdAt ?? '',
      note,
    })),
    ...requests.map((request) => ({
      kind: 'request' as const,
      id: request.id,
      createdAt: request.createdAt,
      request,
    })),
  ].sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  return (
    <RequestEntrySection
      entries={entries}
      respondingRequestId={respondingRequestId}
      onRespondToRequest={onRespondToRequest}
      hidePermissionCards={hidePermissionCards}
    />
  );
}

type ActivityRequestEntry =
  | RequestEntryAnchor
  | {
      kind: 'activity';
      id: string;
      createdAt: string;
      note: ThreadActivityNoteDto;
    };

export function ActivityRequestEntrySection({
  entries,
  respondingRequestId,
  onRespondToRequest,
  onOpenThread,
  onOpenLinkedThread,
  hidePermissionCards = false,
}: {
  entries: ActivityRequestEntry[];
  respondingRequestId?: string | null | undefined;
  onRespondToRequest?:
    | ((
        requestId: string,
        input: RespondThreadActionRequestInput,
      ) => Promise<void> | void)
    | undefined;
  onOpenThread?: ((threadId: string) => void) | undefined;
  onOpenLinkedThread?: ((threadId: string) => void) | undefined;
  hidePermissionCards?: boolean;
}) {
  const visibleEntries = hidePermissionCards
    ? entries.filter((entry) => entry.kind !== 'request')
    : entries;
  if (visibleEntries.length === 0) {
    return null;
  }

  return (
    <div className="thread-graph-message-section space-y-3 px-3 py-4 sm:px-5">
      {[...visibleEntries]
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
        .map((entry) =>
          entry.kind === 'activity' ? (
            <ActivityNoteCard
              key={entry.id}
              note={entry.note}
              onOpenThread={onOpenThread}
              onOpenLinkedThread={onOpenLinkedThread}
            />
          ) : entry.kind === 'note' ? (
            <AnsweredRequestNote key={entry.id} note={entry.note} />
          ) : (
            <PendingRequestCard
              key={entry.id}
              request={entry.request}
              busy={respondingRequestId === entry.request.id}
              onRespond={onRespondToRequest}
            />
          ),
        )}
    </div>
  );
}
