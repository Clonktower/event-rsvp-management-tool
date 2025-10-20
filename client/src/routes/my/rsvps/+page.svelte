<script lang="ts">
import { onMount } from 'svelte';
import { getMyRsvps } from '../../../utils/getMyRsvps';
import {API_HOST} from "../../../utils/apiHost";
import type {RsvpStatus} from "../../../types/Rsvp";
import type {Event} from "../../../types/Event";
import {formatDate} from "../../../utils/format";
import { splitAndSortByEvent, type Group } from "../../../utils/sortAndGroupEvents";

type Rsvp = {
  event: Event;
  yourStatus: RsvpStatus;
  isLast?: boolean;
};

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
    rsvps = (await res.json()).rsvps || [];
    groups = splitAndSortByEvent(rsvps);
    flagLastRsvp(groups);
  } catch (err) {
    console.error('Failed to fetch RSVPs from backend:', err);
  } finally {
    loading = false;
  }
});
</script>

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
        {#each items as { event, yourStatus, isLast } (event.id)}
          <a
            href={`/events/${event.id}`}
            class="w-full max-w-md bg-gray-50 dark:bg-gray-900 rounded-lg shadow p-5 flex flex-col gap-2 transition hover:shadow-lg hover:ring-2 hover:ring-primary cursor-pointer focus:outline-none {isLast ? 'mb-5' : ''}"
            tabindex="0"
            role="link"
          >
            <div class="flex items-center justify-between">
              <span class="text-xl font-semibold text-primary">{event.name}</span>
              <span class="px-3 py-1 rounded text-sm font-bold {yourStatus === 'going' ? 'bg-green-100 text-green-700' : yourStatus === 'maybe' ? 'bg-yellow-100 text-yellow-700' : yourStatus === 'not_going' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-500'}">
                {yourStatus ? yourStatus.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'No Status'}
              </span>
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
