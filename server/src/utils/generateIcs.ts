// Builds an iCalendar file for an event.
//
// This exists because iOS Safari 26.6 and later refuse to hand a
// `data:text/calendar` URL to the Calendar app — the add-to-calendar-button
// library's default mechanism, which silently does nothing on those versions.
// Serving the same content from a real URL works, so the client points the
// library's `icsFile` option at this endpoint.

// The client renders every event in this zone, so the ICS has to match.
const TIME_ZONE = 'Europe/Berlin';

// Standard EU daylight saving rules for Europe/Berlin.
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${TIME_ZONE}`,
  `X-LIC-LOCATION:${TIME_ZONE}`,
  'BEGIN:DAYLIGHT',
  'TZNAME:CEST',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZNAME:CET',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

export type IcsEventInput = {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string | null; // HH:mm, defaults to one hour after startTime
  location?: string | null;
  createdAt?: string | null;
};

// Escapes the characters iCalendar treats as syntax within a text value.
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// RFC 5545 limits content lines to 75 octets, continued with a leading space.
function foldLine(line: string): string {
  if (Buffer.byteLength(line, 'utf8') <= 75) return line;

  const parts: string[] = [];
  let current = '';
  for (const char of line) {
    // Continuation lines carry a leading space, so they get one octet less.
    const limit = parts.length === 0 ? 75 : 74;
    if (Buffer.byteLength(current + char, 'utf8') > limit) {
      parts.push(current);
      current = '';
    }
    current += char;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

function addOneHour(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  return `${String((hours + 1) % 24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// YYYY-MM-DD + HH:mm -> YYYYMMDDTHHMMSS (local to TIME_ZONE, no trailing Z)
function toIcsLocalTime(date: string, time: string): string {
  return `${date.replace(/-/g, '')}T${time.replace(/:/g, '')}00`;
}

// Date -> YYYYMMDDTHHMMSSZ
function toIcsUtcTime(value: Date): string {
  return `${value.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

export function generateIcs(event: IcsEventInput, now: Date = new Date()): string {
  const endTime = event.endTime || addOneHour(event.startTime);
  const created = event.createdAt ? new Date(event.createdAt) : now;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//event-rsvp-management-tool//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...VTIMEZONE,
    'BEGIN:VEVENT',
    `UID:${event.id}`,
    `DTSTAMP:${toIcsUtcTime(now)}`,
    `DTSTART;TZID=${TIME_ZONE}:${toIcsLocalTime(event.date, event.startTime)}`,
    `DTEND;TZID=${TIME_ZONE}:${toIcsLocalTime(event.date, endTime)}`,
    `SUMMARY:${escapeText(event.name)}`,
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    'SEQUENCE:0',
    'STATUS:CONFIRMED',
    `CREATED:${toIcsUtcTime(created)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.map(foldLine).join('\r\n');
}
