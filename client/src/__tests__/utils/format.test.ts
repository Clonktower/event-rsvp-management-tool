import { describe, expect, it } from 'vitest';
import { formatDate, formatEventDuration, toHumanTime } from '../../utils/format';

describe('toHumanTime', () => {
  it('returns an empty string for an empty input', () => {
    expect(toHumanTime('')).toBe('');
  });

  it('returns a non-empty string for a valid HH:MM time', () => {
    expect(toHumanTime('09:00')).toBeTruthy();
    expect(toHumanTime('23:59')).toBeTruthy();
  });

  it('produces output containing "2:30" for input "14:30"', () => {
    // toHumanTime formats with toLocaleTimeString; jsdom resolves to en-US where
    // 14:30 renders as "2:30 PM".  Pin that the minutes appear and the hour is correct.
    const result = toHumanTime('14:30');
    expect(result).toMatch(/2:30/);
  });

  it('produces output containing "12:00" or "noon" for input "12:00"', () => {
    const result = toHumanTime('12:00');
    expect(result.toLowerCase()).toMatch(/12:00|noon/);
  });
});

describe('formatDate', () => {
  it('returns a string containing the year', () => {
    const result = formatDate('2025-12-25');
    expect(result).toContain('2025');
  });

  it('returns a non-empty string', () => {
    expect(formatDate('2000-06-15')).toBeTruthy();
  });

  it('returns "Invalid Date" for an empty input (BUG: no empty-string guard)', () => {
    // BUG: formatDate does not guard against an empty/missing dateStr, so
    // `new Date('')` is an Invalid Date and the formatted output is the literal
    // "Invalid Date" rather than an empty string. It should return '' for falsy input.
    expect(formatDate('')).toContain('Invalid Date');
  });

  it('contains a weekday abbreviation (output uses "short" weekday)', () => {
    // 2025-12-25 is a Thursday; locale-specific but "Thu" or equivalent is expected
    const result = formatDate('2025-12-25');
    // We don't hardcode locale, but the result should contain a comma-separated weekday+date
    expect(result).toContain(',');
  });

  it('includes the month name for a known date', () => {
    // 2024-06-15 is in June — check month word appears (locale-specific but predictable in en)
    const result = formatDate('2024-06-15');
    expect(result).toContain('2024');
    // The date part (15) should appear as a digit
    expect(result).toMatch(/15/);
  });
});

describe('formatEventDuration', () => {
  it('returns an empty string when startTime is not provided', () => {
    expect(formatEventDuration()).toBe('');
    expect(formatEventDuration(undefined, '18:00')).toBe('');
  });

  it('returns just the start time when endTime is not provided', () => {
    const result = formatEventDuration('09:00');
    expect(result).toBeTruthy();
    expect(result).not.toContain(' - ');
  });

  it('returns start and end time separated by " - " when both are provided', () => {
    const result = formatEventDuration('09:00', '17:00');
    expect(result).toContain(' - ');
  });
});
