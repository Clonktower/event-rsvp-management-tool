<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import type { Event } from "../../types/Event";
  import { adminFetch } from "../../utils/adminFetch";
  import { formatDate } from "../../utils/format";
  import { API_HOST } from "../../utils/apiHost";

  let events: Event[] = [];
  let loading = true;
  let error = "";

  onMount(async () => {
    try {
      const res = await adminFetch(`${API_HOST}/admin/events`);
      if (res.status === 401 || res.status === 403) {
        error = "unauthorized";
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch events");
      const data = await res.json();
      events = data.events;
    } catch (e) {
      if (error !== "unauthorized") error = e.message || "Error loading events";
    } finally {
      loading = false;
    }
  });

  function openEvent(id: string) {
    goto(`/events/${id}`);
  }

  async function deleteEvent(id: string) {
    if (confirm("Are you sure you want to delete this event?")) {
      try {
        const res = await adminFetch(`${API_HOST}/admin/events/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete event");
        events = events.filter((event) => event.id !== id);
      } catch (e) {
        error = e.message || "Error deleting event";
      }
    }
  }
</script>

<main class="flex min-h-[60vh] flex-col items-center px-2 py-8">
  <h1 class="mb-8 text-center text-2xl font-bold">All Events</h1>
  <div class="flex w-full max-w-4xl flex-col items-center">
    {#if loading}
      <div class="text-center text-gray-500">Loading events...</div>
    {:else if error === "unauthorized"}
      <div class="text-center text-red-500">
        You are unauthorized to see all events. Please <a
          href="/admin/login"
          class="text-primary underline">login</a
        >.
      </div>
    {:else if error}
      <div class="text-center text-red-500">{error}</div>
    {:else if events.length === 0}
      <div class="text-center text-gray-500">
        No events found.<br />
        <a href="/create-event" class="text-primary underline"
          >Click here to create new event.</a
        >
      </div>
    {:else}
      <div class="grid w-full grid-cols-1 gap-8">
        {#each events as event}
          <div
            class="relative mx-auto mt-8 w-full max-w-xs rounded-lg bg-gray-50 p-6 shadow-lg dark:bg-gray-900"
            on:click={() => openEvent(event.id)}
            tabindex="0"
            role="button"
            aria-label={`View event ${event.name}`}
          >
            <div class="mb-1 flex items-center justify-between">
              <div class="text-xl font-bold">{event.name}</div>
              <button
                class="z-10 ml-2 rounded-full bg-white p-1 text-red-500 shadow hover:text-red-700 focus:outline-none dark:bg-gray-800"
                on:click|stopPropagation={() => deleteEvent(event.id)}
                aria-label="Delete event"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div class="mb-1 text-sm text-gray-500">
              {formatDate(event.date)}
            </div>
            <div class="mb-1 text-sm text-gray-500">{event.location}</div>
            <div class="mt-2 text-xs text-gray-400">
              Max Attendees: {event.max_attendees ?? "Unlimited"}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</main>
