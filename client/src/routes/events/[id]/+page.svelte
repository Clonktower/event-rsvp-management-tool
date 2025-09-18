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
  import {legacyEventIds} from "../../../constants/legacyEventIds";
  import type {User} from "../../../types/User";
  import {addNewRsvp} from "../../../utils/addNewRsvp";
  import {adminFetch} from "../../../utils/adminFetch";

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

  onMount(() => {
    user = getUser(event.id)
    if (user?.id) {
      const found = attendees.find((a) => a.id === user?.id);
      if (found) {
        attendeeName = found.name;
        rsvp = found.status;
        guests = found.guests ? String(found.guests) : "0";
      }
    }
  });

  async function handleRSVPSubmitLegacy() {
    if (!attendeeName.trim()) return;
    const userDetails = getUser(event.id);
    let attendeeId =
      attendees.find((a) => a.id === userDetails?.id)?.id ?? undefined;

    const body: RSVPRequestBody = {
      name: attendeeName,
      status: rsvp,
      guests: rsvp === "going" ? Number(guests) : 0,
    };
    if (attendeeId) body.attendeeId = attendeeId;
    const response = await fetch(`${API_HOST}/events/${event.id}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.rsvp && data.rsvp.id && data.rsvp.name) {
        document.cookie = `user_details=${encodeURIComponent(JSON.stringify({ id: data.rsvp.id, name: data.rsvp.name }))}; path=/;`;
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
    }
  }

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
    } catch (_) {
      deleteError = 'Error deleting attendee.';
    }
  }

</script>

{#if !event}
  <div class="mt-10 text-center text-xl">No Such Event was found!</div>
{:else}
  <div
    class="mx-auto mt-8 max-w-xl rounded-lg bg-gray-50 p-6 shadow-lg dark:bg-gray-900"
  >
    <h1
      class="mb-4 flex items-center justify-between gap-4 text-2xl font-bold text-primary"
    >
      <span>{event.name}</span>
      {#if event.max_attendees}
        <a
          class="flex items-center gap-2 rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          href={`https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.name)}&dates=${event.start_time.replace(/[-:]/g, "").replace(".000Z", "")}/${event.end_time ? event.end_time.replace(/[-:]/g, "").replace(".000Z", "") : ""}&location=${encodeURIComponent(event.location || "")}`}
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
      {event.location}
    </div>
    {#if event.max_attendees}
      <div class="mb-2">
        <span class="font-semibold">Currently going:</span>
        {goingCount}/{event.max_attendees}
      </div>
    {/if}

    <AttendeeList {attendees} onDelete={onDeleteAttendee} />

    {#if isFormVisible}
      <RSVPForm
        {rsvp}
        bind:attendeeName
        bind:guests
        onSubmit={legacyEventIds.includes(event.id) ? handleRSVPSubmitLegacy : handleRsvpSubmit}
        onNameInput={(e) => attendeeName = (e.target as HTMLTextAreaElement)?.value}
        onRSVPChange={(e) => rsvp = (e.target as HTMLInputElement)?.value as RsvpStatus}
        onGuestsChange={(e) => guests = (e.target as HTMLTextAreaElement)?.value}
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
    {/if}

    {#if showToast}
      <div class="fixed bottom-20 left-0 z-50 flex w-full justify-center">
        <div class="rounded bg-green-600 px-4 py-2 text-white shadow-lg">
          Your response was saved!
        </div>
      </div>
    {/if}
    {#if showDeleteToast}
      <div class="w-full text-center bg-green-600 text-white py-2 rounded mb-2">Attendee deleted!</div>
    {/if}
    {#if deleteError}
      <div class="w-full text-center bg-red-600 text-white py-2 rounded mb-2">{deleteError}</div>
    {/if}
  </div>
{/if}
