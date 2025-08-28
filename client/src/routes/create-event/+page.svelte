<script lang="ts">
  import { onMount } from 'svelte';
  import { adminFetch } from '../../utils/adminFetch';
  import { API_HOST } from '../../utils/apiHost';

  let name = '';
  let date = '';
  let maxAttendees: number | '' = '';
  let location = '';
  let startTime = '';
  let endTime = '';
  let loading = false;
  let createdEventId: string | null = null;
  let authError = false;
  let authLoading = true;

  onMount(async () => {
    try {
      const res = await adminFetch(`${API_HOST}/admin/login`, { method: 'POST' });
      if (res.status === 401 || res.status === 403) {
        authError = true;
      }
    } catch (e) {
      authError = true;
    } finally {
      authLoading = false;
    }
  });

  async function handleSubmit(event: Event) {
    event.preventDefault();
    // Validate required fields
    if (!name.trim() || !date.trim() || !location.trim() || !startTime.trim()) {
      alert('Please fill in all required fields: Name, Date, Starting Time, and Location.');
      return;
    }
    loading = true;
    try {
      const response = await adminFetch(`${API_HOST}/admin/create-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, date, startTime, endTime, maxAttendees, location })
      });
      const data = await response.json();
      if (response.ok) {
        alert('Event created successfully!');
        createdEventId = data.event?.id
        // Reset the form fields
        name = '';
        date = '';
        startTime = '';
        endTime = '';
        maxAttendees = '';
        location = '';
        // Optionally, you could also focus the first input
      } else {
        alert(data.error || 'Failed to create event.');
      }
    } catch (err) {
      alert(`Failed to connect to server: ${err}`);
    } finally {
      loading = false;
    }
  }
</script>

{#if authLoading}
  <div class="flex flex-col items-center justify-center min-h-[60vh] mt-12">
    <div class="text-gray-500 text-center text-lg font-semibold mb-4">
      <span class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></span>
      <span class="block mt-4">Checking authorization...</span>
    </div>
  </div>
{:else if authError}
  <div class="flex flex-col items-center justify-center min-h-[60vh] mt-12">
      <div class="text-red-600 text-center text-lg font-semibold mb-4">
        You are not authorized to Create Events. Please <a href="/admin/login" class="underline text-primary">login</a>.
      </div>
  </div>
{:else}
<main class="flex flex-col items-center py-8 min-h-screen">
  <form class="w-full max-w-md rounded-xl shadow p-6 flex flex-col gap-3 font-inter bg-surface dark:bg-gray-900" on:submit|preventDefault={handleSubmit} autocomplete="off">
    <h1 class="text-2xl font-bold mb-5 text-primary dark:text-primary-darkmode font-inter text-center">Create Event</h1>
    <div>
      <label for="name" class="block mb-1 font-semibold">Event Name<span class="text-red-500 ml-1" aria-hidden="true">*</span></label>
      <input id="name" name="name" type="text" bind:value={name} required aria-required="true" aria-label="Event Name" class="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-background-dark dark:border-gray-700 dark:text-text-dark" />
    </div>
    <div>
      <label for="date" class="block mb-1 font-semibold">Date<span class="text-red-500 ml-1" aria-hidden="true">*</span></label>
      <input id="date" name="date" type="date" bind:value={date} required aria-required="true" aria-label="Event Date" class="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-background-dark dark:border-gray-700 dark:text-text-dark" />
    </div>
    <div>
      <label for="startTime" class="block mb-1 font-semibold">Starting Time</label>
      <input id="startTime" name="startTime" type="time" bind:value={startTime} aria-label="Starting Time" class="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-background-dark dark:border-gray-700 dark:text-text-dark" />
    </div>
    <div>
      <label for="endTime" class="block mb-1 font-semibold">Ending Time</label>
      <input id="endTime" name="endTime" type="time" bind:value={endTime} aria-label="Ending Time" class="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-background-dark dark:border-gray-700 dark:text-text-dark" />
    </div>
    <div>
      <label for="maxAttendees" class="block mb-1 font-semibold">Max Attendees<span class="text-red-500 ml-1" aria-hidden="true">*</span></label>
      <input id="maxAttendees" name="maxAttendees" type="number" min="1" bind:value={maxAttendees} required="true" aria-label="Max Attendees" class="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-background-dark dark:border-gray-700 dark:text-text-dark" />
    </div>
    <div>
      <label for="location" class="block mb-1 font-semibold">Location<span class="text-red-500 ml-1" aria-hidden="true">*</span></label>
      <input id="location" name="location" type="text" bind:value={location} required aria-required="true" aria-label="Location" class="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-background-dark dark:border-gray-700 dark:text-text-dark" />
    </div>
    <button type="submit" class="mt-4 px-6 py-2 bg-primary text-white rounded font-bold shadow hover:bg-primary-dark transition-colors dark:bg-primary-darkmode dark:hover:bg-primary-darkmode-hover flex items-center justify-center min-w-[140px]" aria-label="Create Event" disabled={loading}>
      {#if loading}
        <span class="relative flex h-5 w-5 mr-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span class="relative inline-flex rounded-full h-5 w-5 bg-white"></span>
        </span>
        Creating...
      {:else}
        Create Event
      {/if}
    </button>
  </form>

  {#if createdEventId}
    <div class="mt-6 flex flex-col items-center">
      <a class="text-primary underline text-lg font-semibold" href="/events/{createdEventId}">
        View Event
      </a>
    </div>
  {/if}
</main>
{/if}
