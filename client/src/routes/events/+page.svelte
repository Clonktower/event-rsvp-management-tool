<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import type { Event } from "../../types/Event";
  import { adminFetch } from "../../utils/adminFetch";
  import { formatDate } from "../../utils/format";
  import { API_HOST } from "../../utils/apiHost";
  import { splitAndSortByEvent, type Group } from "../../utils/sortAndGroupEvents";

  let events: Event[] = [];
  let groups: Group<Event>[] = [];
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
      events = data.events || [];
      groups = splitAndSortByEvent(events);
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
        groups = splitAndSortByEvent(events);
      } catch (e) {
        error = e.message || "Error deleting event";
      }
    }
  }
</script>

<svelte:head>
  <title>All Events | Event RSVP</title>
</svelte:head>

<div class="flex min-h-[60vh] flex-col items-center px-2 py-8">
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
    {:else if !groups.length}
      <div class="text-center text-gray-500">
        No events found.<br />
        <a href="/create-event" class="text-primary underline"
          >Click here to create new event.</a
        >
      </div>
    {:else}
      <div class="w-full flex flex-col items-center gap-4">
        {#each groups as { title, items }}
          <h2 class="text-xl font-semibold mt-4">{title}</h2>
          {#each items as event}
            <div
              class="relative mx-auto mt-8 w-full max-w-xs rounded-lg bg-gray-50 p-6 shadow-lg dark:bg-gray-900"
              on:click={() => openEvent(event.id)}
              role="presentation"
            >
              <div class="mb-1 flex items-center justify-between">
                <a class="text-xl font-bold" href={`/events/${event.id}`}>{event.name}</a>
                <div class="flex items-center gap-1">
                  <a
                    class="z-10 rounded-full bg-white p-1 text-blue-500 shadow hover:text-blue-700 dark:bg-gray-800"
                    href={`/events/${event.id}/edit`}
                    on:click|stopPropagation
                    aria-label="Edit event"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5">
                      <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                      <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                    </svg>
                  </a>
                  <button
                    class="z-10 rounded-full bg-white p-1 text-red-500 shadow hover:text-red-700 dark:bg-gray-800"
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
        {/each}
      </div>
    {/if}
  </div>
</div>
