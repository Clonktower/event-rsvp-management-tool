<script lang="ts">
  import type { RsvpStatus } from "../types/Rsvp";

  export let rsvp: RsvpStatus;
  export let attendeeName: string;
  export let onSubmit: (e: Event) => void;
  export let onNameInput: (e: Event) => void;

  let rsvpOptions: { value: RsvpStatus; label: string }[] = [
    { value: "going", label: "Going" },
    { value: "maybe", label: "Maybe" },
    { value: "not_going", label: "Not Going" },
  ];
</script>

<form class="mt-6 flex flex-col gap-4" on:submit|preventDefault={onSubmit}>
  <div>
    <label for="attendeeName" class="mb-1 block font-semibold"
      >Your Name<span class="ml-1 text-red-500" aria-hidden="true">*</span
      ></label
    >
    <input
      id="attendeeName"
      name="attendeeName"
      type="text"
      class="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none dark:bg-background-dark"
      placeholder="Enter your name"
      required
      aria-required="true"
      bind:value={attendeeName}
      on:input={onNameInput}
    />
  </div>

  <div class="flex items-center gap-4">

    <div class="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
      {#each rsvpOptions as opt (opt.value)}
        <button
          type="button"
          class="px-4 py-2 focus:outline-none focus:z-10 text-sm font-semibold transition-colors
            {rsvp === opt.value && opt.value === 'going' ? 'bg-green-800 text-white' : ''}
            {rsvp === opt.value && opt.value === 'maybe' ? 'bg-yellow-800 text-white' : ''}
            {rsvp === opt.value && opt.value === 'not_going' ? 'bg-red-800 text-white' : ''}
            {rsvp !== opt.value ? 'bg-transparent text-gray-700 dark:text-gray-200' : ''}
            {opt.value !== 'not_going' ? 'border-r border-gray-300 dark:border-gray-700' : ''}"
          aria-pressed={rsvp === opt.value}
          on:click={() => { rsvp = opt.value; }}
        >
          {opt.label}
        </button>
      {/each}
    </div>
  </div>

  <button
    type="submit"
    class="self-start rounded bg-primary px-6 py-2 font-bold text-white shadow transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-gray-400"
    >Submit</button
  >
</form>
