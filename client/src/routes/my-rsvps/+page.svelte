<script lang="ts">
import { onMount } from 'svelte';
import { getMyRsvps } from '../../utils/getMyRsvps';
import {API_HOST} from "../../utils/apiHost";
import type {RsvpStatus} from "../../types/Rsvp";
import type {Event} from "../../types/Event";

let hasRsvps = true;
let loading = true;
let rsvps: { event: Event, yourStatus: RsvpStatus }[] = [];

onMount(async () => {
  const myRsvps = getMyRsvps();
  if (myRsvps.length === 0) {
    hasRsvps = false;
    loading = false;
    return;
  }
  try {
    const res = await fetch(`${API_HOST}/rsvps/my`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({myRsvps})
    });
    const data = await res.json();
    rsvps = data.rsvps || [];
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
  {:else if hasRsvps}
    <h1 class="text-2xl font-bold mb-6">Events you have responded to</h1>
    {#if rsvps.length === 0}
      <span class="text-lg text-gray-500">You Haven't RSVP'd to any events</span>
    {:else}
      <div class="w-full flex flex-col items-center gap-4">
        {#each rsvps as { event, yourStatus }, i (event.id)}
          <a
            href={`/events/${event.id}`}
            class="w-full max-w-md bg-gray-50 dark:bg-gray-900 rounded-lg shadow p-5 flex flex-col gap-2 transition hover:shadow-lg hover:ring-2 hover:ring-primary cursor-pointer focus:outline-none {i === rsvps.length - 1 ? 'mb-5' : ''}"
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
              <span class="font-medium">Date:</span> {event.date}<br />
              <span class="font-medium">Time:</span> {event.start_time} - {event.end_time}<br />
              <span class="font-medium">Location:</span> {event.location}
            </div>
          </a>
        {/each}
      </div>
    {/if}
  {:else}
    <span class="text-lg text-gray-500">You Haven't RSVP'd to any events</span>
  {/if}
</div>
