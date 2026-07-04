import { describe, expect, it } from 'vitest';
import { splitAndSortByEvent } from '../../utils/sortAndGroupEvents';
import type { Event } from '../../types/Event';

function event(id: string, date: string, start_time = '12:00'): Event {
  return { id, name: id, date, start_time, max_attendees: 10, location: 'Venue' };
}

const FUTURE = '2099-01-01';
const PAST = '2000-01-01';

describe('splitAndSortByEvent', () => {
  it('returns an empty array for no items', () => {
    expect(splitAndSortByEvent([])).toEqual([]);
  });

  it('creates only an "Upcoming Events" group when all events are in the future', () => {
    const groups = splitAndSortByEvent([event('e1', FUTURE), event('e2', FUTURE)]);
    expect(groups).toHaveLength(1);
    expect(groups[0].title).toBe('Upcoming Events');
    expect(groups[0].items).toHaveLength(2);
  });

  it('creates only a "Past Events" group when all events are in the past', () => {
    const groups = splitAndSortByEvent([event('e1', PAST), event('e2', PAST)]);
    expect(groups).toHaveLength(1);
    expect(groups[0].title).toBe('Past Events');
  });

  it('creates both groups when there are upcoming and past events', () => {
    const groups = splitAndSortByEvent([event('past', PAST), event('future', FUTURE)]);
    expect(groups).toHaveLength(2);
    expect(groups[0].title).toBe('Upcoming Events');
    expect(groups[1].title).toBe('Past Events');
  });

  it('sorts upcoming events chronologically (earliest first)', () => {
    const items = [event('later', '2099-06-01'), event('earlier', '2099-01-01')];
    const groups = splitAndSortByEvent(items);
    expect(groups[0].items[0].id).toBe('earlier');
    expect(groups[0].items[1].id).toBe('later');
  });

  it('sorts past events chronologically (earliest first)', () => {
    const items = [event('newer', '2000-06-01'), event('older', '2000-01-01')];
    const groups = splitAndSortByEvent(items);
    expect(groups[0].items[0].id).toBe('older');
    expect(groups[0].items[1].id).toBe('newer');
  });

  it('works with items that contain an event property (e.g. RSVP objects)', () => {
    const items = [
      { event: event('e1', FUTURE), yourStatus: 'going' },
      { event: event('e2', PAST), yourStatus: 'maybe' },
    ];
    const groups = splitAndSortByEvent(items);
    expect(groups).toHaveLength(2);
    expect(groups[0].items[0]).toHaveProperty('yourStatus', 'going');
  });

  it('places a today event with a future start_time in Upcoming Events', () => {
    const today = new Date().toISOString().slice(0, 10);
    const groups = splitAndSortByEvent([event('today', today, '23:59')]);
    expect(groups).toHaveLength(1);
    expect(groups[0].title).toBe('Upcoming Events');
  });

  it('places a today event with a past start_time in Past Events', () => {
    const today = new Date().toISOString().slice(0, 10);
    const groups = splitAndSortByEvent([event('today-past', today, '00:01')]);
    expect(groups).toHaveLength(1);
    expect(groups[0].title).toBe('Past Events');
  });
});
