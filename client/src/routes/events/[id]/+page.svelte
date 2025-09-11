<script lang="ts">
  import type {RsvpStatus, Rsvp} from "../../../types/Rsvp";
  import type {Event} from "../../../types/Event";
  import { API_HOST } from '../../../utils/apiHost';
  import {formatDate, formatEventDuration} from '../../../utils/format';
  import { getUserFromCookie } from '../../../utils/getUserFromCookie';
  import AttendeeList from '$lib/AttendeeList.svelte';
  import RSVPForm from '$lib/RSVPForm.svelte';
  import { onMount } from 'svelte';
  import {getTotalAttendance} from "../../../utils/getTotalAttendance";

  type RSVPRequestBody = {
    name: string;
    status: typeof rsvp;
    guests: number;
    attendeeId?: string;
  }

  export let data: { event: Event, rsvp: Rsvp[] };
  const event = data.event;

  let attendees = data.rsvp
  $: goingCount = getTotalAttendance(attendees)

  let rsvp: RsvpStatus = 'going';
  let attendeeName = '';
  let guests = '0';
  let showToast = false;

  onMount(() => {
    const attendeeId = getUserFromCookie()?.id;
    if (attendeeId) {
      const found = attendees.find(a => a.id === attendeeId);
      if (found) {
        attendeeName = found.name;
        rsvp = found.status;
        guests = found.guests ? String(found.guests) : '0';
      }
    }
  });

  async function handleRSVPSubmit() {
    if (!attendeeName.trim()) return;
    const userDetails = getUserFromCookie();
    let attendeeId = attendees.find(a => a.id === userDetails?.id)?.id ?? undefined;

    const body: RSVPRequestBody = {
      name: attendeeName,
      status: rsvp,
      guests: rsvp === 'going' ? Number(guests) : 0
    };
    if (attendeeId) body.attendeeId = attendeeId;
    const response = await fetch(`${API_HOST}/events/${event.id}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (response.ok) {
      const data = await response.json();
      if (data.rsvp && data.rsvp.id && data.rsvp.name) {
        document.cookie = `user_details=${encodeURIComponent(JSON.stringify({id: data.rsvp.id, name: data.rsvp.name}))}; path=/;`;
      }
      // Refetch event and attendee list
      const refetchRes = await fetch(`${API_HOST}/events/${event.id}`);
      if (refetchRes.ok) {
        const refetchData = await refetchRes.json();
        attendees = refetchData.rsvp;
      }
      // Show toast on successful submit
      showToast = true;
      setTimeout(() => showToast = false, 2000);
    }
  }

</script>

{#if !event}
  <div class="text-center text-xl mt-10">No Such Event was found!</div>
{:else}
  <div class="max-w-xl mx-auto mt-8 p-6 rounded-lg shadow-lg bg-gray-50 dark:bg-gray-900  ">
    <h1 class="text-2xl font-bold mb-4 text-primary flex items-center gap-4 justify-between">
      <span>{event.name}</span>
      {#if event.max_attendees}
        <a
          class="px-3 py-1 rounded bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
          href={`https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.name)}&dates=${event.start_time.replace(/[-:]/g, '').replace('.000Z','')}/${event.end_time ? event.end_time.replace(/[-:]/g, '').replace('.000Z','') : ''}&location=${encodeURIComponent(event.location || '')}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3M16 7V3M4 11h16M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          Add to calendar
        </a>
      {/if}
    </h1>
    <div class="mb-2"><span class="font-semibold">Date:</span> {formatDate(event.date)}</div>
    <div class="mb-2"><span class="font-semibold">Time:</span> {formatEventDuration(event.start_time, event.end_time)}</div>
    <div class="mb-2"><span class="font-semibold">Location:</span> {event.location}</div>
    {#if event.max_attendees}
      <div class="mb-2"><span class="font-semibold">Currently going:</span> {goingCount}/{event.max_attendees}</div>
    {/if}


    <AttendeeList {attendees} />

    <RSVPForm
      rsvp={rsvp}
      bind:attendeeName
      bind:guests
      onSubmit={handleRSVPSubmit}
      onNameInput={(e) => attendeeName = (e.target as HTMLTextAreaElement)?.value}
      onRSVPChange={(e) => rsvp = (e.target as HTMLInputElement)?.value as RsvpStatus}
      onGuestsChange={(e) => guests = (e.target as HTMLTextAreaElement)?.value}
    />

    {#if showToast}
      <div class="fixed bottom-20 left-0 w-full flex justify-center z-50">
        <div class="bg-green-600 text-white px-4 py-2 rounded shadow-lg">
          Your response was saved!
        </div>
      </div>
    {/if}
  </div>
{/if}
