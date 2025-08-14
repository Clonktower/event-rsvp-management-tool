<script lang="ts">
  import type {RsvpStatus, Rsvp} from "../../../types/Rsvp";
  import type {Event} from "../../../types/Event";

  export let data: { event: Event, rsvp: Rsvp[] };
  const event = data.event;

  let attendees = data.rsvp
  let isRsvpFull = attendees.filter(a => a.status === 'going').reduce((sum, a) => sum + 1 + (a.guests || 0), 0) >= event.max_attendees
  import { formatDate, toHumanTime } from '../../../utils/format';
  import { getUserFromCookie } from '../../../utils/getUserFromCookie';
  import AttendeeList from '$lib/AttendeeList.svelte';
  import RSVPForm from '$lib/RSVPForm.svelte';
  import { onMount } from 'svelte';

  interface RSVPRequestBody {
    name: string;
    status: typeof rsvp;
    guests: number;
    attendeeId?: string;
  }

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

  let rsvp: RsvpStatus = 'not_going';
  const rsvpOptions: {
    value: RsvpStatus;
    label: string;
  }[] = [
    { value: 'going', label: 'Going' },
    { value: 'maybe', label: 'Maybe' },
    { value: 'not_going', label: 'Not Going' }
  ];

  let attendeeName = '';
  let guests = '0';

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
    let attendeeId = userDetails?.name?.toLowerCase() === attendeeName?.toLowerCase() ? userDetails?.id : undefined;

    const body: RSVPRequestBody = {
      name: attendeeName,
      status: rsvp,
      guests: rsvp === 'going' ? Number(guests) : 0
    };
    if (attendeeId) body.attendeeId = attendeeId;
    const response = await fetch(`http://localhost:3000/events/${event.id}/rsvp`, {
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
      const refetchRes = await fetch(`http://localhost:3000/events/${event.id}`);
      if (refetchRes.ok) {
        const refetchData = await refetchRes.json();
        attendees = refetchData.rsvp;
      }
      // Show toast on successful submit
      showToast = true;
      setTimeout(() => showToast = false, 2000);
    }
  }

  let showToast = false;


</script>

{#if !event}
  <div class="text-center text-xl mt-10">No Such Event was found!</div>
{:else}
  <div class="max-w-xl mx-auto mt-8 p-6 rounded-lg shadow-lg bg-gray-50 dark:bg-gray-800  ">
    <h1 class="text-2xl font-bold mb-4 text-primary">{event.name}</h1>
    <div class="mb-2"><span class="font-semibold">Date:</span> {formattedDate}</div>
    <div class="mb-2"><span class="font-semibold">Time:</span> {formattedTime}</div>
    <div class="mb-2"><span class="font-semibold">Location:</span> {event.location}</div>
    {#if event.max_attendees}
      <div class="mb-2"><span class="font-semibold">Max Attendees:</span> {event.max_attendees}</div>
    {/if}

    <AttendeeList {attendees} />

    <RSVPForm
      rsvp={rsvp}
      rsvpOptions={rsvpOptions}
      bind:attendeeName
      bind:guests
      onSubmit={handleRSVPSubmit}
      onNameInput={(e) => attendeeName = (e.target as HTMLTextAreaElement)?.value}
      onRSVPChange={(e) => rsvp = (e.target as HTMLInputElement)?.value as RsvpStatus}
      onGuestsChange={(e) => guests = (e.target as HTMLTextAreaElement)?.value}
      isRsvpFull={isRsvpFull}
    />
    {#if showToast}
      <div class="fixed bottom-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50">
        Your response was saved!
      </div>
    {/if}
  </div>
{/if}
