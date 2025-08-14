<script lang="ts">
  let name = '';
  let date = '';
  let maxAttendees: number | '' = '';
  let location = '';
  let startTime = '';
  let endTime = '';
  let loading = false;

  async function handleSubmit(event: Event) {
    event.preventDefault();
    // Validate required fields
    if (!name.trim() || !date.trim() || !location.trim() || !startTime.trim()) {
      alert('Please fill in all required fields: Name, Date, Starting Time, and Location.');
      return;
    }
    loading = true;
    try {
      const response = await fetch('http://localhost:3000/create-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, date, startTime, endTime, maxAttendees, location })
      });
      const data = await response.json();
      if (response.ok) {
        alert('Event created successfully!');
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

<main class="flex flex-col items-center py-8 min-h-screen">
  <h1 class="text-2xl font-bold mb-8 text-primary dark:text-primary-darkmode font-inter">Create Event</h1>
  <form class="w-full max-w-md rounded-xl shadow p-6 flex flex-col gap-3 font-inter bg-surface dark:bg-surface-dark sm:bg-surface sm:dark:bg-surface-dark bg-background dark:bg-background-dark" on:submit|preventDefault={handleSubmit} autocomplete="off">
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
      <label for="maxAttendees" class="block mb-1 font-semibold">Max Attendees</label>
      <input id="maxAttendees" name="maxAttendees" type="number" min="1" bind:value={maxAttendees} aria-label="Max Attendees" class="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-background-dark dark:border-gray-700 dark:text-text-dark" />
    </div>
    <div>
      <label for="location" class="block mb-1 font-semibold">Location<span class="text-red-500 ml-1" aria-hidden="true">*</span></label>
      <input id="location" name="location" type="text" bind:value={location} required aria-required="true" aria-label="Location" class="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-background-dark dark:border-gray-700 dark:text-text-dark" />
    </div>
    <button type="submit" class="mt-4 px-6 py-2 bg-primary text-white rounded-full font-bold shadow hover:bg-primary-dark transition-colors dark:bg-primary-darkmode dark:hover:bg-primary-darkmode-hover flex items-center justify-center min-w-[140px]" aria-label="Create Event" disabled={loading}>
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
</main>
