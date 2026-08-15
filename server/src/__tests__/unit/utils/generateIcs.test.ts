import { describe, expect, it } from 'vitest';
import { generateIcs } from '../../../utils/generateIcs';

const now = new Date('2026-08-03T12:00:00.000Z');

const baseEvent = {
  id: 'abc-123',
  name: 'Board Game Night',
  date: '2027-02-26',
  startTime: '19:00',
  endTime: '22:30',
  location: 'Tales Untold',
  createdAt: '2026-08-01T10:00:00.000Z',
};

function lines(ics: string): string[] {
  return ics.split('\r\n');
}

describe('generateIcs', () => {
  it('wraps the event in a VCALENDAR with a VEVENT', () => {
    const result = lines(generateIcs(baseEvent, now));

    expect(result[0]).toBe('BEGIN:VCALENDAR');
    expect(result.at(-1)).toBe('END:VCALENDAR');
    expect(result).toContain('BEGIN:VEVENT');
    expect(result).toContain('END:VEVENT');
    expect(result).toContain('VERSION:2.0');
    expect(result).toContain('METHOD:PUBLISH');
  });

  it('uses CRLF line endings, as iCalendar requires', () => {
    const ics = generateIcs(baseEvent, now);

    expect(ics).toContain('\r\n');
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('emits start and end times qualified with the event time zone', () => {
    const result = lines(generateIcs(baseEvent, now));

    expect(result).toContain('DTSTART;TZID=Europe/Berlin:20270226T190000');
    expect(result).toContain('DTEND;TZID=Europe/Berlin:20270226T223000');
    expect(result).toContain('BEGIN:VTIMEZONE');
    expect(result).toContain('TZID:Europe/Berlin');
  });

  it('defaults the end time to one hour after the start', () => {
    const result = lines(generateIcs({ ...baseEvent, endTime: null }, now));

    expect(result).toContain('DTEND;TZID=Europe/Berlin:20270226T200000');
  });

  it('wraps a start time late in the day around midnight', () => {
    const result = lines(
      generateIcs({ ...baseEvent, startTime: '23:30', endTime: null }, now),
    );

    expect(result).toContain('DTEND;TZID=Europe/Berlin:20270226T003000');
  });

  it('stamps the current time as DTSTAMP', () => {
    const result = lines(generateIcs(baseEvent, now));

    expect(result).toContain('DTSTAMP:20260803T120000Z');
    expect(result).toContain('CREATED:20260801T100000Z');
  });

  it('falls back to the current time when the event has no created date', () => {
    const result = lines(generateIcs({ ...baseEvent, createdAt: null }, now));

    expect(result).toContain('CREATED:20260803T120000Z');
  });

  it('uses the event id as the UID', () => {
    const result = lines(generateIcs(baseEvent, now));

    expect(result).toContain('UID:abc-123');
  });

  it('escapes characters that iCalendar treats as syntax', () => {
    const result = generateIcs(
      { ...baseEvent, name: 'Pizza, beer; and games', location: 'Back\\room' },
      now,
    );

    expect(result).toContain('SUMMARY:Pizza\\, beer\\; and games');
    expect(result).toContain('LOCATION:Back\\\\room');
  });

  it('omits LOCATION when the event has none', () => {
    const result = lines(generateIcs({ ...baseEvent, location: null }, now));

    // X-LIC-LOCATION in the VTIMEZONE block is a different property.
    expect(result.some((line) => line.startsWith('LOCATION:'))).toBe(false);
  });

  it('folds content lines longer than 75 octets', () => {
    const ics = generateIcs({ ...baseEvent, name: 'A'.repeat(200) }, now);

    for (const line of lines(ics)) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    }
    // Continuation lines start with a single space and rejoin to the original.
    expect(ics).toContain('\r\n ');
    expect(ics.replace(/\r\n /g, '')).toContain(`SUMMARY:${'A'.repeat(200)}`);
  });

  it('folds without splitting multi-byte characters', () => {
    const ics = generateIcs({ ...baseEvent, name: '🎲'.repeat(40) }, now);

    for (const line of lines(ics)) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    }
    expect(ics.replace(/\r\n /g, '')).toContain(`SUMMARY:${'🎲'.repeat(40)}`);
  });
});
