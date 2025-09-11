<script lang="ts">
  import type {RsvpStatus} from "../types/Rsvp";

  export let rsvp: RsvpStatus;
  export let attendeeName: string;
  export let guests: string;
  export let onSubmit: (e: Event) => void;
  export let onNameInput: (e: Event) => void;
  export let onRSVPChange: (e: Event) => void;
  export let onGuestsChange: (e: Event) => void;

  let rsvpOptions: { value: RsvpStatus, label: string }[] = [
    { value: 'going', label: 'Going' },
    { value: 'maybe', label: 'Maybe' },
    { value: 'not_going', label: 'Not Going' }
  ];
</script>

<form class="mt-6 flex flex-col gap-4" on:submit|preventDefault={onSubmit}>
  <div>
    <label for="attendeeName" class="block font-semibold mb-1">Your Name<span class="text-red-500 ml-1" aria-hidden="true">*</span></label>
    <input id="attendeeName" name="attendeeName" type="text" class="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-background-dark" placeholder="Enter your name" required aria-required="true" bind:value={attendeeName} on:input={onNameInput} />
  </div>
  <div class="flex items-center gap-4">
    <span class="font-semibold">RSVP:</span>
    <div class="flex gap-2">
      {#each rsvpOptions as opt (opt.value)}
        <label class="inline-flex items-center cursor-pointer" >
          <input type="radio" class="form-radio accent-primary bg-white dark:bg-background-dark" bind:group={rsvp} value={opt.value} on:change={onRSVPChange} />
          <span class="ml-1">{opt.label}</span>
        </label>
      {/each}
    </div>
  </div>
  {#if rsvp === 'going'}
  <div>
    <label for="guests" class="block font-semibold mb-1">Guests</label>
    <select id="guests" name="guests" class="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-background-dark" bind:value={guests} on:change={onGuestsChange}>
      <option value="0">0</option>
      <option value="1">1</option>
      <option value="2">2</option>
    </select>
  </div>
  {/if}
  <button type="submit" class="self-start px-6 py-2 bg-primary text-white rounded font-bold shadow hover:bg-primary-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">Submit</button>
</form>
