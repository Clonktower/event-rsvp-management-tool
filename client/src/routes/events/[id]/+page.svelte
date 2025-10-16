<script lang="ts">
  import type { RsvpStatus, Rsvp } from "../../../types/Rsvp";
  import type { Event } from "../../../types/Event";
  import { API_HOST } from "../../../utils/apiHost";
  import { formatDate, formatEventDuration } from "../../../utils/format";
  import { getUser } from "../../../utils/getUser";
  import AttendeeList from "$lib/AttendeeList.svelte";
  import RSVPForm from "$lib/RSVPForm.svelte";
  import { onMount } from "svelte";
  import { getTotalAttendance } from "../../../utils/getTotalAttendance";
  import { hasUserResponded } from "../../../utils/hasUserResponded";
  import type {User} from "../../../types/User";
  import {addNewRsvp} from "../../../utils/addNewRsvp";
  import {adminFetch} from "../../../utils/adminFetch";
  import { generateGoogleCalendarLink } from "../../../utils/generateGoogleCalendarLink";
  import {getAllUsersForEvent} from "../../../utils/getAllUsersForEvent";
  import {getUserDetailsByRsvpId} from "../../../utils/getUserDetailsByRsvpId";
  import {getUserFromUsersById} from "../../../utils/getUserFromUsersById";
  import MapLink from '$lib/MapLink.svelte';

  type RSVPRequestBody = {
    name: string;
    status: typeof rsvp;
    guests: number;
    attendeeId?: string;
    token?: string
  };

  export let data: { event: Event; rsvp: Rsvp[] };
  const event = data.event;

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

  onMount(() => {
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
    });
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

      if (user?.id) {
        await fetch(`${API_HOST}/events/${event.id}/rsvp/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        const response = await fetch(`${API_HOST}/events/${event.id}/rsvp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const data = await response.json();

          if(data.rsvp) {
            addNewRsvp(data.rsvp)
            user = getUser(event.id)

          }

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

{#if !event}
  <div class="mt-10 text-center text-xl">No Such Event was found!</div>
{:else}
  <div
    class="mx-auto mt-8 mb-8 max-w-xl rounded-lg bg-gray-50 p-6 shadow-lg dark:bg-gray-900"
  >
    <h1
      class="mb-4 flex items-center justify-between gap-4 text-2xl font-bold text-primary"
    >
      <span>{event.name}</span>
      {#if event.max_attendees}
        <a
          class="flex items-center gap-2 rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          href={generateGoogleCalendarLink(event)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3M16 7V3M4 11h16M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            /></svg
          >
          Add to calendar
        </a>
      {/if}
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

    <AttendeeList {attendees} onDelete={onDeleteAttendee} showDeleteButton={isAdmin} />

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
      />
    {:else if status !== undefined}
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
            tabindex="0"
          >
            Edit
          </button>
        </div>
      </div>
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
            Add new RSVP
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
