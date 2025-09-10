<script lang="ts">
  import type {Rsvp} from "../types/Rsvp";

  export let attendees: Rsvp[] = [];
  let attendeesOpen = false;

  const groups = [
    { key: 'going', label: 'Going', color: 'text-green-600 dark:text-green-400' },
    { key: 'maybe', label: 'Maybe', color: 'text-yellow-600 dark:text-yellow-400' },
    { key: 'not_going', label: 'Not Going', color: 'text-red-600 dark:text-red-400' }
  ];

  function formatRsvpTime(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'short' });
    const hour = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${day} ${month}, ${hour}:${min}`;
  }
</script>

{#if attendees.length}
  <div class="mb-6">
    <button type="button" class="flex items-center gap-2 font-semibold text-primary focus:outline-none" on:click={() => attendeesOpen = !attendeesOpen} aria-expanded={attendeesOpen} aria-controls="attendees-list">
      <span>{attendeesOpen ? 'Hide' : 'Show'} Responses ({attendees.length})</span>
      <svg class="w-4 h-4 transition-transform" style:transform={attendeesOpen ? 'rotate(90deg)' : ''} fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
    </button>
    {#if attendeesOpen}
      <ul id="attendees-list" class="mt-2 border rounded bg-surface dark:bg-surface-dark divide-y">
        {#each groups as group (group.key)}
          {#if attendees.filter(a => a.status === group.key).length}
            <li class="px-4 py-2 font-semibold bg-gray-100 dark:bg-gray-800 {group.color}" key={group.key}>
              <div class="flex flex-col items-start">
                <span class="flex items-center">
                  <span>{group.label}</span>
                  <span class="text-xs text-gray-500 flex items-center justify-center min-w-8 ml-1">
                    ({group.key === 'going'
                      ? attendees.filter(a => a.status === 'going').reduce((sum, a) => sum + 1 + (a.guests || 0), 0)
                      : attendees.filter(a => a.status === group.key).length
                    })
                  </span>
                </span>
              </div>
            </li>
            {#each attendees.filter(a => a.status === group.key) as a (a.id)}
              <li class="px-4 py-2 flex flex-row items-center gap-4 justify-between">
                <div class="flex  flex-row items-center  gap-4">
                  <span class="font-medium">{a.name}</span>
                  {#if a.guests > 0}
                    <span class="text-xs text-gray-400">(+{a.guests} guest{a.guests > 1 ? 's' : ''})</span>
                  {/if}
                </div>
                <span class="text-xs text-gray-400 ml-auto">{a.created_at ? formatRsvpTime(a.created_at) : ''}</span>
              </li>
            {/each}
          {/if}
        {/each}
      </ul>
    {/if}
  </div>
{/if}
