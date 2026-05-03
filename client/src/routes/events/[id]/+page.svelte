<script lang="ts">
  import type { RsvpStatus, Rsvp } from "../../../types/Rsvp";
  import type { Event } from "../../../types/Event";
  import { API_HOST } from "../../../utils/apiHost";
  import { formatDate, formatEventDuration } from "../../../utils/format";
  import { getUser } from "../../../utils/getUser";
  import AttendeeList from "$lib/AttendeeList.svelte";
  import RSVPForm from "$lib/RSVPForm.svelte";
  import { onMount, onDestroy } from "svelte";
  import { getTotalAttendance } from "../../../utils/getTotalAttendance";
  import { hasUserResponded } from "../../../utils/hasUserResponded";
  import type {User} from "../../../types/User";
  import {addNewRsvp} from "../../../utils/addNewRsvp";
  import {adminFetch} from "../../../utils/adminFetch";
  import {getAllUsersForEvent} from "../../../utils/getAllUsersForEvent";
  import {getUserDetailsByRsvpId} from "../../../utils/getUserDetailsByRsvpId";
  import {getUserFromUsersById} from "../../../utils/getUserFromUsersById";
  import MapLink from '$lib/MapLink.svelte';
  import { isUserOnWaitlist } from '../../../utils/isUserOnWaitlist';
  import PollWidget from '$lib/PollWidget.svelte';
  import type { Poll } from '../../../types/Poll';

  function addOneHour(time: string): string {
    const [h, m] = time.split(':').map(Number);
    return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  type RSVPRequestBody = {
    name: string;
    status: typeof rsvp;
    guests: number;
    attendeeId?: string;
    token?: string
  };

  export let data: { event: Event; rsvp: Rsvp[]; poll: Poll | null; clockOffset: number };
  const event = data.event;
  let poll: Poll | null = data.poll;
  const clockOffset = data.clockOffset ?? 0;

  let attendees = data.rsvp;
  $: goingCount = getTotalAttendance(attendees);

  let rsvp: RsvpStatus = "going";
  let attendeeName = "";
  let guests = "0";
  let showToast = false;
  let showDeleteToast = false;
  let deleteError = '';
  let { hasResponded, status } = hasUserResponded(event.id, attendees)
  let isFormVisible = !hasResponded
  let user: User | undefined;
  let users: User[] | undefined;
  let isAdmin = false;
  let mounted = false;
  let registrationOpen = !event.registration_opens_at;
  let publicRegistrationOpen = !event.registration_opens_at;
  let countdown = '';
  let countdownInterval: ReturnType<typeof setInterval> | null = null;

  function startCountdown() {
    if (!event.registration_opens_at) {
      registrationOpen = true;
      publicRegistrationOpen = true;
      return;
    }
    if (isAdmin) registrationOpen = true;
    const opensAt = new Date(event.registration_opens_at);
    function tick() {
      const diff = opensAt.getTime() - (Date.now() + clockOffset);
      if (diff <= 0) {
        registrationOpen = true;
        publicRegistrationOpen = true;
        countdown = '';
        if (countdownInterval) clearInterval(countdownInterval);
        return;
      }
      publicRegistrationOpen = false;
      const totalSec = Math.floor(diff / 1000);
      const d = Math.floor(totalSec / 86400);
      const h = Math.floor((totalSec % 86400) / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      // Intl.DurationFormat not yet typed in TS; cast until types ship
      countdown = new (Intl as any).DurationFormat(navigator.language, { style: 'digital' })
        .format({ days: d, hours: h, minutes: m, seconds: s });
    }
    tick();
    countdownInterval = setInterval(tick, 1000);
  }

  onDestroy(() => { if (countdownInterval) clearInterval(countdownInterval); });

  async function removeStaleLocalStorageEntries(eventId: string) {
    const users = getAllUsersForEvent(eventId);
    if (!users || users.length === 0) return;

    const res = await fetch(`${API_HOST}/events/${event.id}`);
    if (!res.ok) {
      console.error('Failed to sync RSVPs');
      return;
    }
    const fetchData = await res.json();
    const rsvps = fetchData.rsvp;
    const validIds = rsvps.map((r: { id: any; }) => r.id);

    // Remove stale localStorage entries
    const myEvents = JSON.parse(localStorage.getItem('my_events') || '{}');
    if (!myEvents[eventId]) return;

    Object.keys(myEvents[eventId]).forEach(id => {
      if (!validIds.includes(id)) {
        delete myEvents[eventId][id];
      }
    });

    // Clean up empty event keys
    if (Object.keys(myEvents[eventId]).length === 0) {
      delete myEvents[eventId];
    }

    localStorage.setItem('my_events', JSON.stringify(myEvents));
  }

  onMount(async () => {
    mounted = true;

    await removeStaleLocalStorageEntries(event.id);

    user = getUser(event.id)
    users = getAllUsersForEvent(event.id)

    if (user?.id) {
      const found = attendees.find((a) => a.id === user?.id);
      if (found) {
        attendeeName = found.name;
        rsvp = found.status;
        guests = found.guests ? String(found.guests) : "0";
      }
    }
    adminFetch(`${API_HOST}/admin/login`, { method: 'POST' }).then(res => {
      isAdmin = res.ok;
    }).catch(() => {
      isAdmin = false;
    }).finally(() => {
      startCountdown();
    });

    // import the web component only in the browser
    import('add-to-calendar-button');
    mounted = true;
  });

  async function handleRsvpSubmit() {
    try {
      if (!attendeeName.trim()) return;
      const body: RSVPRequestBody = {
        name: attendeeName,
        status: rsvp,
        guests: rsvp === "going" ? Number(guests) : 0,
        token: user?.token
      };

      const isAdminEarlyAccess = isAdmin && !!event.registration_opens_at && new Date() < new Date(event.registration_opens_at);
      if (user?.id) {
        const res = await fetch(`${API_HOST}/events/${event.id}/rsvp/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) return;
      } else {
        const rsvpFetch = isAdminEarlyAccess ? adminFetch : fetch;
        const response = await rsvpFetch(`${API_HOST}/events/${event.id}/rsvp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) return;

        const data = await response.json();
        if (data.rsvp) {
          addNewRsvp(data.rsvp);
          user = getUser(event.id);
        }
      }

      // Refetch event and attendee list
      const refetchRes = await fetch(`${API_HOST}/events/${event.id}`);
      if (refetchRes.ok) {
        const refetchData = await refetchRes.json();
        attendees = refetchData.rsvp;
      }

      isFormVisible = false;
      status = rsvp;
      showToast = true;
      setTimeout(() => (showToast = false), 2000);
    } catch (err) {
      console.error(err)
    }
  }

  async function onDeleteAttendee(id: string) {
    if (!window.confirm('Are you sure you want to delete this attendee? This operation is not reversible.')) {
      return;
    }
    deleteError = '';
    try {
      const res = await adminFetch(`${API_HOST}/admin/events/rsvp/${id}`, { method: 'DELETE' });
      if (res.ok) {
        attendees = attendees.filter(a => a.id !== id);
        showDeleteToast = true;
        setTimeout(() => showDeleteToast = false, 2000);
      } else {
        deleteError = 'Failed to delete attendee.';
      }
    } catch {
      deleteError = 'Error deleting attendee.';
    }
  }

</script>

<svelte:head>
  <title>{event.name} | Event RSVP</title>
  <meta property="og:title" content={event.name} />
  <meta property="og:description" content="Join us for {event.name}! RSVP now." />
  <meta property="og:url" content={typeof window !== 'undefined' ? window.location.href : ''} />
</svelte:head>

{#if mounted}
{#if !event}
  <div class="mt-10 text-center text-xl">No Such Event was found!</div>
{:else}
  <div
    class="mx-auto mt-8 mb-8 max-w-xl rounded-lg bg-gray-50 p-6 shadow-lg dark:bg-gray-900"
  >
    <h1
      class="mb-4 flex flex-wrap justify-between gap-4 text-2xl font-bold text-primary"
      style="min-width: 0;"
    >
      <span class="break-words min-w-0 flex-1">{event.name}</span>
      <div class="flex items-center gap-2">
      {#if isAdmin}
        <a
          href="/events/{event.id}/edit"
          class="flex items-center gap-1 rounded bg-gray-100 px-3 py-2 text-sm font-semibold text-blue-600 shadow transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-gray-700"
          aria-label="Edit event"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5">
            <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
          </svg>
          Edit
        </a>
      {/if}
      {#if mounted}
        <add-to-calendar-button
          lightMode="system"
          name={event.name}
          startDate={event.date}
          startTime={event.start_time}
          endTime={event.end_time ?? addOneHour(event.start_time)}
          timeZone="Europe/Berlin"
          location={event.location}
          options="['Google', 'Apple', 'iCal', 'Microsoft365', 'MicrosoftTeams', 'Outlook.com', 'Yahoo']"
          label="Add to Calendar"
          hideBranding="True"
          style="--btn-background: #2563eb; --btn-text: #fff; --btn-hover-background: #1d4ed8; --btn-font-weight: 600; --btn-border-radius: 0.5rem; --btn-padding: 0.5rem 1rem; --btn-font-size: 1rem; --btn-box-shadow: 0 2px 8px 0 rgba(0,0,0,0.08); --btn-transition: background 0.2s; --btn-dark-background: #1e293b; --btn-dark-text: #fff; --btn-dark-hover-background: #334155; width: auto; min-width: 0; display: inline-block;"
          size="2"
        >
        </add-to-calendar-button>
      {/if}
      </div>
    </h1>
    <div class="mb-2">
      <span class="font-semibold">Date:</span>
      {formatDate(event.date)}
    </div>
    <div class="mb-2">
      <span class="font-semibold">Time:</span>
      {formatEventDuration(event.start_time, event.end_time)}
    </div>
    <div class="mb-2">
      <span class="font-semibold">Location:</span>
      <MapLink address={event.location} label={event.name} />
    </div>
    {#if event.max_attendees}
      <div class="mb-2">
        <span class="font-semibold">Currently going:</span>
        {goingCount}/{event.max_attendees}
      </div>
    {/if}

    <AttendeeList {attendees} maxAttendees={event.max_attendees} onDelete={onDeleteAttendee} showDeleteButton={isAdmin} />

    {#if !registrationOpen}
      <div class="mb-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 px-4 py-4 text-center">
        <p class="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
          Registration opens in <span class="font-mono">{countdown}</span>
        </p>
        {#if event.registration_opens_at}
          <p class="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
            {new Date(event.registration_opens_at).toLocaleString()}
          </p>
        {/if}
      </div>
    {/if}

    {#if isAdmin && !publicRegistrationOpen}
      <div class="mb-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 px-4 py-3 text-center">
        <p class="text-sm font-semibold text-blue-800 dark:text-blue-200">
          Public registration opens in <span class="font-mono">{countdown}</span>
        </p>
        {#if event.registration_opens_at}
          <p class="mt-1 text-xs text-blue-700 dark:text-blue-300">
            {new Date(event.registration_opens_at).toLocaleString()}
          </p>
        {/if}
      </div>
    {/if}

    <PollWidget {poll} {user} {isAdmin} eventId={event.id} />

    {#if users && users.length > 1}
      <div class="mb-4">
        <label for="user-select" class="block mb-1 font-semibold text-gray-700 dark:text-gray-200">Editing For</label>
        <select
          id="user-select"
          on:change={(e) => {
              if(!users) return;

              // @ts-expect-error ignore for now
              const value = e.target.value
              user = getUserFromUsersById(value, users)
              const userDetails = getUserDetailsByRsvpId(user?.id ?? '', attendees)
              attendeeName = userDetails?.name ?? ''
              rsvp = userDetails?.status || 'going'
          }}
          class="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-background-dark text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
        >
          {#each users as u (u.id)}
            <option value={u.id}>{getUserDetailsByRsvpId(u.id, attendees)?.name}</option>
          {/each}
        </select>
      </div>
    {/if}
    {#if isFormVisible}
      <RSVPForm
        bind:rsvp
        bind:attendeeName
        onSubmit={handleRsvpSubmit}
        onNameInput={e => attendeeName = (e.target as HTMLInputElement)?.value}
        disabled={!registrationOpen}
      />
    {:else if status !== undefined}
      {#if rsvp === 'going' && isUserOnWaitlist(attendees, user?.id ?? '', event.max_attendees)}
        <div class="mb-4 flex w-full items-center justify-center">
          <div class="relative w-full rounded px-4 py-2 font-semibold flex items-center bg-blue-100 dark:bg-blue-300 text-blue-900 dark:text-blue-800">
            <span>
              You are currently on the <span class="font-bold text-orange-900 dark:text-orange-900">Waitlist</span>.
            </span>
            <button type="button"
              class="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer underline text-blue-700 dark:text-blue-900"
              title="Edit RSVP"
              on:click={() => isFormVisible = true}
              on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { isFormVisible = true; } }}
            >
              Edit
            </button>
          </div>
        </div>
      {:else}
        <div class="mb-4 flex w-full items-center justify-center">
          <div class="relative w-full rounded px-4 py-2  font-semibold flex items-center bg-blue-100 dark:bg-blue-300 text-blue-900 dark:text-blue-800">
            <span>
              You are marked as
              <span class="px-1 py-1 rounded font-bold"
                class:text-green-700={rsvp === 'going'}
                class:text-red-800={rsvp === 'not_going'}
                class:text-yellow-800={rsvp === 'maybe'}
              >
                {rsvp === 'going' ? 'Going' : rsvp === 'maybe' ? 'Maybe' : 'Not Going'}
              </span>
            </span>
            <button type="button"
              class="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer underline text-blue-700 dark:text-blue-900"
              title="Edit RSVP"
              on:click={() => isFormVisible = true}
              on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { isFormVisible = true; } }}
            >
              Edit
            </button>
          </div>
        </div>
      {/if}
        <div class="flex w-full justify-center mb-4">
            <span class="text-gray-400 font-bold">----------OR----------</span>
        </div>
      <div class="flex w-full justify-center mb-4">
        <button
          class="w-64 rounded bg-blue-600 px-4 py-2 text-white font-semibold transition-colors hover:bg-blue-700"
          on:click={() => {
            user = undefined;
            attendeeName = '';
            rsvp = 'going';
            guests = '0';
            isFormVisible = true;
          }}
        >
            Bringing a +1? Click here
        </button>
      </div>

    {/if}

    {#if showToast}
      <div class="fixed bottom-20 left-0 z-50 flex w-full justify-center">
        <div class="rounded bg-green-600 px-4 py-2 text-white shadow-lg">
          Your response was saved!
        </div>
      </div>
    {/if}
    {#if showDeleteToast}
      <div class="w-full text-center bg-green-600 text-white py-2 rounded mb-2 mt-5">Attendee deleted!</div>
    {/if}
    {#if deleteError}
      <div class="w-full text-center bg-red-600 text-white py-2 rounded mb-2 mt-5">{deleteError}</div>
    {/if}
  </div>
{/if}
{/if}
