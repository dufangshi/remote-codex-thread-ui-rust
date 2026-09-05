import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatMessageTimestamp, formatPreciseMessageTimestamp } from './threadPresentation';

afterEach(() => vi.useRealTimers());

describe.each([
  [formatMessageTimestamp, false],
  [formatPreciseMessageTimestamp, true],
] as const)('message timestamp (precise=%s)', (format, precise) => {
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric', minute: '2-digit', ...(precise ? { second: '2-digit' } : {}),
  };

  it('shows only time for the current local calendar day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 5, 23, 59));
    const date = new Date(2026, 8, 5, 0, 1, 12);
    expect(format(date.toISOString())).toBe(date.toLocaleTimeString([], timeOptions));
  });

  it('includes the date across local midnight, even less than a minute ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 5, 0, 0, 10));
    const date = new Date(2026, 8, 4, 23, 59, 50);
    expect(format(date.toISOString())).toBe(date.toLocaleString([], {
      ...timeOptions, month: 'short', day: 'numeric',
    }));
  });

  it('includes the year for a different year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 5));
    const date = new Date(2025, 8, 5, 12, 30, 15);
    expect(format(date.toISOString())).toBe(date.toLocaleString([], {
      ...timeOptions, year: 'numeric', month: 'short', day: 'numeric',
    }));
  });

  it('handles a missing timestamp', () => {
    expect(format(null)).toBe('Time unavailable');
  });
});
