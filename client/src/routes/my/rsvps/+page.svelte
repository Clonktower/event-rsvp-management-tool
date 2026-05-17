<script lang="ts">
import { onMount } from 'svelte';
import { getMyRsvps } from '../../../utils/getMyRsvps';
import {API_HOST} from "../../../utils/apiHost";
import type {RsvpStatus} from "../../../types/Rsvp";
import type {Event} from "../../../types/Event";
import {formatDate} from "../../../utils/format";
import { splitAndSortByEvent, type Group } from "../../../utils/sortAndGroupEvents";

type Attendee = {
  name: string;
  status: RsvpStatus;
};

type Rsvp = {
  event: Event;
  yourStatus: RsvpStatus;
  attendees?: Attendee[];
  isLast?: boolean;
};

function statusColor(s: RsvpStatus) {
  return s === 'going' ? 'bg-green-100 text-green-700'
       : s === 'maybe' ? 'bg-yellow-100 text-yellow-700'
       : s === 'not_going' ? 'bg-red-100 text-red-700'
       : 'bg-gray-200 text-gray-500';
}

function formatStatus(s: RsvpStatus) {
  return s ? s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'No Status';
}

let loading = true;
let rsvps: Rsvp[] = [];
let groups: Group<Rsvp>[] = [];

function flagLastRsvp(groups: Group<Rsvp>[]) {
  if (groups.length > 0) {
    const lastGroup = groups[groups.length - 1];
    const lastItem = lastGroup.items[lastGroup.items.length - 1];
    lastItem.isLast = true;
  }
}

onMount(async () => {
  const myRsvps = getMyRsvps();
  if (!myRsvps.length) {
    loading = false;
    return;
  }
  try {
    const res = await fetch(`${API_HOST}/rsvps/my`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ myRsvps })
    });
    const allRsvps = (await res.json()).rsvps || [];
    const byEvent = new Map<string, any[]>();
    for (const r of allRsvps) {
      if (!byEvent.has(r.event.id)) byEvent.set(r.event.id, []);
      byEvent.get(r.event.id)!.push(r);
    }
    rsvps = Array.from(byEvent.values()).map(group => {
      const first = group[0];
      const hasNames = group.some((r: any) => r.attendeeName);
      return {
        event: first.event,
        yourStatus: first.yourStatus,
        ...(hasNames && group.length > 1 && {
          attendees: group.map((r: any) => ({ name: r.attendeeName, status: r.yourStatus as RsvpStatus })),
        }),
      };
    });
    groups = splitAndSortByEvent(rsvps);
    flagLastRsvp(groups);
  } catch (err) {
    console.error('Failed to fetch RSVPs from backend:', err);
  } finally {
    loading = false;
  }
});
</script>

<svelte:head>
  <title>My RSVPs | Event RSVP</title>
</svelte:head>

<div class="flex flex-col items-center justify-center mt-16 w-full px-2">
  {#if loading}
    <span>Loading...</span>
  {:else if !groups.length}
    <span class="text-lg text-gray-500">You haven't RSVP'd to any events</span>
  {:else}
    <h1 class="text-2xl font-bold mb-6">Events you have responded to</h1>
    <div class="w-full flex flex-col items-center gap-4">
      {#each groups as { title, items }}
        <h2 class="text-xl font-semibold mt-4">{title}</h2>
        {#each items as { event, yourStatus, attendees, isLast } (event.id)}
          <a
            href={`/events/${event.id}`}
            class="w-full max-w-md bg-gray-50 dark:bg-gray-900 rounded-lg shadow p-5 flex flex-col gap-2 transition hover:shadow-lg hover:ring-2 hover:ring-primary cursor-pointer {isLast ? 'mb-5' : ''}"
          >
            <div class="flex items-start justify-between gap-2">
              <span class="min-w-0 text-xl font-semibold text-primary">{event.name}</span>
              {#if attendees}
                <div class="flex flex-col gap-1 items-end min-w-0">
                  {#each attendees as a}
                    <span class="px-2 py-0.5 rounded text-xs font-bold min-w-0 break-all text-right {statusColor(a.status)}">
                      {a.name}: {formatStatus(a.status)}
                    </span>
                  {/each}
                </div>
              {:else}
                <span class="px-3 py-1 rounded text-sm font-bold {statusColor(yourStatus)}">
                  {formatStatus(yourStatus)}
                </span>
              {/if}
            </div>
            <div class="text-gray-600 dark:text-gray-300 text-sm">
              <span class="font-medium">Date:</span> {formatDate(event.date)}<br />
              <span class="font-medium">Time:</span> {event.start_time} - {event.end_time}<br />
              <span class="font-medium">Location:</span> {event.location}
            </div>
          </a>
        {/each}
      {/each}
    </div>
  {/if}
</div>
