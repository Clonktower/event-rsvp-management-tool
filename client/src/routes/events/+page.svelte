<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { Event } from '../../types/Event';
  import { adminFetch } from '../../utils/adminFetch';
  import { formatDate } from '../../utils/format';

  let events: Event[] = [];
  let loading = true;
  let error = '';

  onMount(async () => {
    try {
      const res = await adminFetch('http://localhost:3000/admin/events');
      if (res.status === 401 || res.status === 403) {
        error = 'unauthorized';
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      events = data.events;
    } catch (e) {
      if (error !== 'unauthorized') error = e.message || 'Error loading events';
    } finally {
      loading = false;
    }
  });

  function openEvent(id: string) {
    goto(`/events/${id}`);
  }
</script>

<main class="flex flex-col items-center min-h-[60vh] py-8 px-2">
  <h1 class="text-2xl font-bold mb-8 text-center">All Events</h1>
  <div class="w-full max-w-4xl flex flex-col items-center">
    {#if loading}
      <div class="text-center text-gray-500">Loading events...</div>
    {:else if error === 'unauthorized'}
      <div class="text-center text-red-500">
        You are unauthorized to see all events. Please <a href="/admin/login" class="underline text-primary">login</a>.
      </div>
    {:else if error}
      <div class="text-center text-red-500">{error}</div>
    {:else if events.length === 0}
      <div class="text-center text-gray-500">No events found.</div>
    {:else}
      <div class="w-full grid grid-cols-1 gap-8">
        {#each events as event}
          <div
            class="w-full max-w-xs mx-auto mt-8 p-6 rounded-lg shadow-lg bg-gray-50 dark:bg-gray-800"
            on:click={() => openEvent(event.id)}
            tabindex="0"
            role="button"
            aria-label={`View event ${event.name}`}
          >
            <div class="font-bold text-xl mb-1">{event.name}</div>
            <div class="text-sm text-gray-500 mb-1">{formatDate(event.date)}</div>
            <div class="text-sm text-gray-500 mb-1">{event.location}</div>
            <div class="text-xs text-gray-400 mt-2">Max Attendees: {event.max_attendees ?? 'Unlimited'}</div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</main>
