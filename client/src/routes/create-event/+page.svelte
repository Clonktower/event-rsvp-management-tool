<script lang="ts">
  import { onMount } from "svelte";
  import { adminFetch } from "../../utils/adminFetch";
  import { API_HOST } from "../../utils/apiHost";

  let name = "";
  let date = "";
  let maxAttendees: number | "" = "";
  let location = "";
  let startTime = "";
  let endTime = "";
  let loading = false;
  let createdEventId: string | null = null;
  let authError = false;
  let authLoading = true;

  onMount(async () => {
    try {
      const res = await adminFetch(`${API_HOST}/admin/login`, {
        method: "POST",
      });
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
      alert(
        "Please fill in all required fields: Name, Date, Starting Time, and Location.",
      );
      return;
    }
    loading = true;
    try {
      const response = await adminFetch(`${API_HOST}/admin/create-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          date,
          startTime,
          endTime,
          maxAttendees,
          location,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Event created successfully!");
        createdEventId = data.event?.id;
        // Reset the form fields
        name = "";
        date = "";
        startTime = "";
        endTime = "";
        maxAttendees = "";
        location = "";
        // Optionally, you could also focus the first input
      } else {
        alert(data.error || "Failed to create event.");
      }
    } catch (err) {
      alert(`Failed to connect to server: ${err}`);
    } finally {
      loading = false;
    }
  }
</script>

{#if authLoading}
  <div class="mt-12 flex min-h-[60vh] flex-col items-center justify-center">
    <div class="mb-4 text-center text-lg font-semibold text-gray-500">
      <span
        class="inline-block h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-primary"
      ></span>
      <span class="mt-4 block">Checking authorization...</span>
    </div>
  </div>
{:else if authError}
  <div class="mt-12 flex min-h-[60vh] flex-col items-center justify-center">
    <div class="mb-4 text-center text-lg font-semibold text-red-600">
      You are not authorized to Create Events. Please <a
        href="/admin/login"
        class="text-primary underline">login</a
      >.
    </div>
  </div>
{:else}
  <main class="flex min-h-screen flex-col items-center py-8">
    <form
      class="flex w-full max-w-md flex-col gap-3 rounded-xl bg-surface p-6 font-inter shadow dark:bg-gray-900"
      on:submit|preventDefault={handleSubmit}
      autocomplete="off"
    >
      <h1
        class="dark:text-primary-darkmode mb-5 text-center font-inter text-2xl font-bold text-primary"
      >
        Create Event
      </h1>
      <div>
        <label for="name" class="mb-1 block font-semibold"
          >Event Name<span class="ml-1 text-red-500" aria-hidden="true">*</span
          ></label
        >
        <input
          id="name"
          name="name"
          type="text"
          bind:value={name}
          required
          aria-required="true"
          aria-label="Event Name"
          class="w-full rounded border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none dark:border-gray-700 dark:bg-background-dark dark:text-text-dark"
        />
      </div>
      <div>
        <label for="date" class="mb-1 block font-semibold"
          >Date<span class="ml-1 text-red-500" aria-hidden="true">*</span
          ></label
        >
        <input
          id="date"
          name="date"
          type="date"
          bind:value={date}
          required
          aria-required="true"
          aria-label="Event Date"
          class="w-full rounded border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none dark:border-gray-700 dark:bg-background-dark dark:text-text-dark"
        />
      </div>
      <div>
        <label for="startTime" class="mb-1 block font-semibold"
          >Starting Time</label
        >
        <input
          id="startTime"
          name="startTime"
          type="time"
          bind:value={startTime}
          aria-label="Starting Time"
          class="w-full rounded border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none dark:border-gray-700 dark:bg-background-dark dark:text-text-dark"
        />
      </div>
      <div>
        <label for="endTime" class="mb-1 block font-semibold">Ending Time</label
        >
        <input
          id="endTime"
          name="endTime"
          type="time"
          bind:value={endTime}
          aria-label="Ending Time"
          class="w-full rounded border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none dark:border-gray-700 dark:bg-background-dark dark:text-text-dark"
        />
      </div>
      <div>
        <label for="maxAttendees" class="mb-1 block font-semibold"
          >Max Attendees<span class="ml-1 text-red-500" aria-hidden="true"
            >*</span
          ></label
        >
        <input
          id="maxAttendees"
          name="maxAttendees"
          type="number"
          min="1"
          bind:value={maxAttendees}
          required="true"
          aria-label="Max Attendees"
          class="w-full rounded border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none dark:border-gray-700 dark:bg-background-dark dark:text-text-dark"
        />
      </div>
      <div>
        <label for="location" class="mb-1 block font-semibold"
          >Location<span class="ml-1 text-red-500" aria-hidden="true">*</span
          ></label
        >
        <input
          id="location"
          name="location"
          type="text"
          bind:value={location}
          required
          aria-required="true"
          aria-label="Location"
          class="w-full rounded border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none dark:border-gray-700 dark:bg-background-dark dark:text-text-dark"
        />
      </div>
      <button
        type="submit"
        class="dark:bg-primary-darkmode dark:hover:bg-primary-darkmode-hover mt-4 flex min-w-[140px] items-center justify-center rounded bg-primary px-6 py-2 font-bold text-white shadow transition-colors hover:bg-primary-dark"
        aria-label="Create Event"
        disabled={loading}
      >
        {#if loading}
          <span class="relative mr-2 flex h-5 w-5">
            <span
              class="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"
            ></span>
            <span class="relative inline-flex h-5 w-5 rounded-full bg-white"
            ></span>
          </span>
          Creating...
        {:else}
          Create Event
        {/if}
      </button>
    </form>

    {#if createdEventId}
      <div class="mt-6 flex flex-col items-center">
        <a
          class="text-lg font-semibold text-primary underline"
          href="/events/{createdEventId}"
        >
          View Event
        </a>
      </div>
    {/if}
  </main>
{/if}
