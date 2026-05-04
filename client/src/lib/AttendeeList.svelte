<script lang="ts">
  import type { Rsvp } from "../types/Rsvp";

  export let attendees: Rsvp[] = [];
  let attendeesOpen = false;
  export let onDelete: (id: string) => void = () => {};
  export let showDeleteButton: boolean = true;
  export let maxAttendees: number = 0;

  const groups = [
    {
      key: "going",
      label: "Going",
      color: "text-green-600 dark:text-green-400",
    },
    {
      key: "maybe",
      label: "Maybe",
      color: "text-yellow-600 dark:text-yellow-400",
    },
    {
      key: "not_going",
      label: "Not Going",
      color: "text-red-600 dark:text-red-400",
    },
  ];

  function formatRsvpTime(dateStr: string) {
    if (!dateStr) return "";
    const rsvpDate = new Date(dateStr);
    const rsvpYear = rsvpDate.getFullYear();
    const rsvpMonth = rsvpDate.getMonth();
    const rsvpDay = rsvpDate.getDate();

    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth();
    const nowDay = now.getDate();

    const yesterday = new Date(nowYear, nowMonth, nowDay - 1);

    const isToday =
      rsvpYear === nowYear && rsvpMonth === nowMonth && rsvpDay === nowDay;
    const isYesterday =
      rsvpYear === yesterday.getFullYear() &&
      rsvpMonth === yesterday.getMonth() &&
      rsvpDay === yesterday.getDate();

    const hour = rsvpDate.getHours().toString().padStart(2, "0");
    const min = rsvpDate.getMinutes().toString().padStart(2, "0");

    if (isToday) {
      return `Today, ${hour}:${min}`;
    } else if (isYesterday) {
      return `Yesterday, ${hour}:${min}`;
    } else {
      const monthShort = rsvpDate.toLocaleString("en-US", { month: "short" });
      return `${rsvpDay} ${monthShort}, ${hour}:${min}`;
    }
  }
</script>

{#if attendees.length}
  <div class="mb-6">
    <button
      type="button"
      class="flex items-center gap-2 font-semibold text-primary"
      on:click={() => (attendeesOpen = !attendeesOpen)}
      aria-expanded={attendeesOpen}
      aria-controls="attendees-list"
    >
      <span>{attendeesOpen ? "Hide" : "Show"} Responses ({attendees.length})</span>
      <svg
        class="h-4 w-4 transition-transform"
        style:transform={attendeesOpen ? "rotate(90deg)" : ""}
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      ><path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M9 5l7 7-7 7"
      /></svg>
    </button>
    {#if attendeesOpen}
      <ul
        id="attendees-list"
        class="mt-2 divide-y rounded border bg-surface dark:bg-surface-dark"
      >
        {#each groups as group (group.key)}
          {#if group.key === "going"}
            {#if attendees.filter((a) => a.status === "going").length}
              <li class="bg-gray-100 px-4 py-2 font-semibold dark:bg-gray-800 {group.color}">
                <div class="flex flex-col items-start">
                  <span class="flex items-center">
                    <span>{group.label}</span>
                    <span class="ml-1 flex min-w-8 items-center justify-center text-xs text-gray-500">
                      ({Math.min(attendees.filter((a) => a.status === "going").length, maxAttendees)})
                    </span>
                  </span>
                </div>
              </li>
              {#each attendees.filter((a) => a.status === "going").slice(0, maxAttendees) as a (a.id)}
                <li class="flex flex-row items-center gap-4 px-4 py-2">
                  <div class="flex min-w-0 flex-row items-center gap-4">
                    <span class="truncate font-medium">{a.name}</span>
                    {#if a.guests > 0}
                      <span class="text-xs text-gray-400">(+{a.guests} guest{a.guests > 1 ? "s" : ""})</span>
                    {/if}
                  </div>
                  <span class="ml-auto shrink-0 whitespace-nowrap text-xs text-gray-400">{a.created_at ? formatRsvpTime(a.created_at) : ""}</span>
                  {#if showDeleteButton}
                    <button
                      type="button"
                      class="ml-2 p-1 text-gray-400 hover:text-red-600 focus:outline-none"
                      aria-label="Delete attendee"
                      on:click={() => onDelete(a.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  {/if}
                </li>
              {/each}
            {/if}
            {#if attendees.filter((a) => a.status === "going").length > maxAttendees}
              <li class="bg-gray-100 px-4 py-2 font-semibold dark:bg-gray-800 text-orange-600 dark:text-orange-400">
                <div class="flex flex-col items-start">
                  <span class="flex items-center">
                    <span>Waitlist</span>
                    <span class="ml-1 flex min-w-8 items-center justify-center text-xs text-gray-500">
                      ({attendees.filter((a) => a.status === "going").length - maxAttendees})
                    </span>
                  </span>
                </div>
              </li>
              {#each attendees.filter((a) => a.status === "going").slice(maxAttendees) as a (a.id)}
                <li class="flex flex-row items-center gap-4 px-4 py-2">
                  <div class="flex min-w-0 flex-row items-center gap-4">
                    <span class="truncate font-medium">{a.name}</span>
                    {#if a.guests > 0}
                      <span class="text-xs text-gray-400">(+{a.guests} guest{a.guests > 1 ? "s" : ""})</span>
                    {/if}
                  </div>
                  <span class="ml-auto shrink-0 whitespace-nowrap text-xs text-gray-400">{a.created_at ? formatRsvpTime(a.created_at) : ""}</span>
                  {#if showDeleteButton}
                    <button
                      type="button"
                      class="ml-2 p-1 text-gray-400 hover:text-red-600 focus:text-red-600"
                      aria-label="Delete attendee"
                      on:click={() => onDelete(a.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  {/if}
                </li>
              {/each}
            {/if}
          {:else if group.key === "maybe"}
            {#if attendees.filter((a) => a.status === group.key).length}
              <li class="bg-gray-100 px-4 py-2 font-semibold dark:bg-gray-800 {group.color}">
                <div class="flex flex-col items-start">
                  <span class="flex items-center">
                    <span>{group.label}</span>
                    <span class="ml-1 flex min-w-8 items-center justify-center text-xs text-gray-500">
                      ({attendees.filter((a) => a.status === group.key).length})
                    </span>
                  </span>
                </div>
              </li>
              {#each attendees.filter((a) => a.status === group.key) as a (a.id)}
                <li class="flex flex-row items-center gap-4 px-4 py-2">
                  <div class="flex min-w-0 flex-row items-center gap-4">
                    <span class="truncate font-medium">{a.name}</span>
                    {#if a.guests > 0}
                      <span class="text-xs text-gray-400">(+{a.guests} guest{a.guests > 1 ? "s" : ""})</span>
                    {/if}
                  </div>
                  <span class="ml-auto shrink-0 whitespace-nowrap text-xs text-gray-400">{a.created_at ? formatRsvpTime(a.created_at) : ""}</span>
                  {#if showDeleteButton}
                    <button
                      type="button"
                      class="ml-2 p-1 text-gray-400 hover:text-red-600 focus:outline-none"
                      aria-label="Delete attendee"
                      on:click={() => onDelete(a.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  {/if}
                </li>
              {/each}
            {/if}
          {:else if group.key === "not_going"}
            {#if attendees.filter((a) => a.status === group.key).length}
              <li class="bg-gray-100 px-4 py-2 font-semibold dark:bg-gray-800 {group.color}">
                <div class="flex flex-col items-start">
                  <span class="flex items-center">
                    <span>{group.label}</span>
                    <span class="ml-1 flex min-w-8 items-center justify-center text-xs text-gray-500">
                      ({attendees.filter((a) => a.status === group.key).length})
                    </span>
                  </span>
                </div>
              </li>
              {#each attendees.filter((a) => a.status === group.key) as a (a.id)}
                <li class="flex flex-row items-center gap-4 px-4 py-2">
                  <div class="flex min-w-0 flex-row items-center gap-4">
                    <span class="truncate font-medium">{a.name}</span>
                    {#if a.guests > 0}
                      <span class="text-xs text-gray-400">(+{a.guests} guest{a.guests > 1 ? "s" : ""})</span>
                    {/if}
                  </div>
                  <span class="ml-auto shrink-0 whitespace-nowrap text-xs text-gray-400">{a.created_at ? formatRsvpTime(a.created_at) : ""}</span>
                  {#if showDeleteButton}
                    <button
                      type="button"
                      class="ml-2 p-1 text-gray-400 hover:text-red-600 focus:outline-none"
                      aria-label="Delete attendee"
                      on:click={() => onDelete(a.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  {/if}
                </li>
              {/each}
            {/if}
          {/if}
        {/each}
      </ul>
    {/if}
  </div>
{/if}
