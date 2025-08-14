<script lang="ts">
  export let data: { event: any };
  const event = data.event;

  import { formatDate, toHumanTime } from '../../../utils/format';

  let formattedDate = '';
  if (event && event.date) {
    formattedDate = formatDate(event.date);
  }

  let formattedTime = '';
  if (event && event.start_time) {
    formattedTime = toHumanTime(event.start_time);
    if (event.end_time) {
      formattedTime += ` - ${toHumanTime(event.end_time)}`;
    }
  }
</script>

{#if !event}
  <div class="text-center text-xl mt-10">No Such Event was found!</div>
{:else}
  <div class="max-w-xl mx-auto mt-8 p-6 rounded-lg shadow bg-background">
    <h1 class="text-2xl font-bold mb-4 text-primary">{event.name}</h1>
    <div class="mb-2"><span class="font-semibold">Date:</span> {formattedDate}</div>
    <div class="mb-2"><span class="font-semibold">Time:</span> {formattedTime}</div>
    <div class="mb-2"><span class="font-semibold">Location:</span> {event.location}</div>
    {#if event.maxAttendees}
      <div class="mb-2"><span class="font-semibold">Max Attendees:</span> {event.maxAttendees}</div>
    {/if}
  </div>
{/if}
