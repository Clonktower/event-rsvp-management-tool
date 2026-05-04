<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { adminFetch } from "../../../../utils/adminFetch";
  import { API_HOST } from "../../../../utils/apiHost";

  const eventId = $page.params.id;

  let name = "";
  let date = "";
  let maxAttendees: number | "" = "";
  let location = "";
  let startTime = "";
  let endTime = "";
  let registrationOpensAt = "";
  let loading = false;
  let fetchLoading = true;
  let authError = false;
  let fetchError = "";

  onMount(async () => {
    try {
      const authRes = await adminFetch(`${API_HOST}/admin/login`, { method: "POST" });
      if (authRes.status === 401 || authRes.status === 403) {
        authError = true;
        return;
      }
    } catch {
      authError = true;
      return;
    }

    try {
      const res = await fetch(`${API_HOST}/events/${eventId}`);
      if (!res.ok) {
        fetchError = "Event not found.";
        return;
      }
      const data = await res.json();
      const event = data.event;
      name = event.name;
      date = event.date;
      startTime = event.start_time;
      endTime = event.end_time ?? "";
      maxAttendees = event.max_attendees ?? "";
      location = event.location;
      if (event.registration_opens_at) {
        const d = new Date(event.registration_opens_at);
        const pad = (n: number) => String(n).padStart(2, '0');
        registrationOpensAt = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    } catch {
      fetchError = "Failed to load event.";
    } finally {
      fetchLoading = false;
    }
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!name.trim() || !date.trim() || !location.trim() || !startTime.trim() || !endTime.trim()) {
      alert("Please fill in all required fields: Name, Date, Starting Time, Ending Time, and Location.");
      return;
    }
    if (endTime <= startTime) {
      alert("Ending time must be after starting time.");
      return;
    }
    loading = true;
    try {
      const response = await adminFetch(`${API_HOST}/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, date, startTime, endTime, maxAttendees: maxAttendees === "" ? null : maxAttendees, location, registrationOpensAt: registrationOpensAt ? new Date(registrationOpensAt).toISOString() : null }),
      });
      const data = await response.json();
      if (response.ok) {
        goto(`/events/${eventId}`, { invalidateAll: true });
      } else {
        alert(data.error || "Failed to update event.");
      }
    } catch (err) {
      alert(`Failed to connect to server: ${err}`);
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Edit Event | Event RSVP</title>
</svelte:head>

{#if authError}
  <div class="mt-12 flex min-h-[60vh] flex-col items-center justify-center">
    <div class="mb-4 text-center text-lg font-semibold text-red-600">
      You are not authorized to edit events. Please <a href="/admin/login" class="text-primary underline">login</a>.
    </div>
  </div>
{:else if fetchLoading}
  <div class="mt-12 flex min-h-[60vh] flex-col items-center justify-center">
    <span class="inline-block h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-primary"></span>
    <span class="mt-4 block text-gray-500">Loading event...</span>
  </div>
{:else if fetchError}
  <div class="mt-12 flex min-h-[60vh] flex-col items-center justify-center">
    <div class="text-center text-red-600">{fetchError}</div>
  </div>
{:else}
  <div class="flex min-h-screen flex-col items-center py-8">
    <form
      class="flex w-full max-w-md flex-col gap-3 rounded-xl bg-surface p-6 font-inter shadow dark:bg-gray-900"
      on:submit|preventDefault={handleSubmit}
      autocomplete="off"
    >
      <h1 class="dark:text-primary-darkmode mb-5 text-center font-inter text-2xl font-bold text-primary">
        Edit Event
      </h1>
      <div>
        <label for="name" class="mb-1 block font-semibold">
          Event Name<span class="ml-1 text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          bind:value={name}
          required
          aria-required="true"
          class="w-full rounded border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none dark:border-gray-700 dark:bg-background-dark dark:text-text-dark"
        />
      </div>
      <div>
        <label for="date" class="mb-1 block font-semibold">
          Date<span class="ml-1 text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="date"
          name="date"
          type="date"
          bind:value={date}
          required
          aria-required="true"
          class="w-full rounded border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none dark:border-gray-700 dark:bg-background-dark dark:text-text-dark"
        />
      </div>
      <div>
        <label for="startTime" class="mb-1 block font-semibold">
          Starting Time<span class="ml-1 text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="startTime"
          name="startTime"
          type="time"
          bind:value={startTime}
          required
          aria-required="true"
          class="w-full rounded border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none dark:border-gray-700 dark:bg-background-dark dark:text-text-dark"
        />
      </div>
      <div>
        <label for="endTime" class="mb-1 block font-semibold">
          Ending Time<span class="ml-1 text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="endTime"
          name="endTime"
          type="time"
          bind:value={endTime}
          required
          aria-required="true"
          class="w-full rounded border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none dark:border-gray-700 dark:bg-background-dark dark:text-text-dark"
        />
      </div>
      <div>
        <label for="maxAttendees" class="mb-1 block font-semibold">Max Attendees</label>
        <input
          id="maxAttendees"
          name="maxAttendees"
          type="number"
          min="1"
          bind:value={maxAttendees}
          class="w-full rounded border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none dark:border-gray-700 dark:bg-background-dark dark:text-text-dark"
        />
      </div>
      <div>
        <label for="location" class="mb-1 block font-semibold">
          Location<span class="ml-1 text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="location"
          name="location"
          type="text"
          bind:value={location}
          required
          aria-required="true"
          class="w-full rounded border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none dark:border-gray-700 dark:bg-background-dark dark:text-text-dark"
        />
      </div>
      <div>
        <label for="registrationOpensAt" class="mb-1 block font-semibold">Registration Opens At</label>
        <input
          id="registrationOpensAt"
          name="registrationOpensAt"
          type="datetime-local"
          bind:value={registrationOpensAt}
          class="w-full rounded border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none dark:border-gray-700 dark:bg-background-dark dark:text-text-dark"
        />
      </div>
      <div class="mt-4 flex gap-3">
        <a
          href="/events/{eventId}"
          class="flex-1 rounded border border-gray-300 px-6 py-2 text-center font-bold transition-colors hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
        >
          Cancel
        </a>
        <button
          type="submit"
          class="dark:bg-primary-darkmode dark:hover:bg-primary-darkmode-hover flex flex-1 min-w-[140px] items-center justify-center rounded bg-primary px-6 py-2 font-bold text-white shadow transition-colors hover:bg-primary-dark"
          disabled={loading}
        >
          {#if loading}
            <span class="relative mr-2 flex h-5 w-5">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
              <span class="relative inline-flex h-5 w-5 rounded-full bg-white"></span>
            </span>
            Saving...
          {:else}
            Save Changes
          {/if}
        </button>
      </div>
    </form>
  </div>
{/if}
