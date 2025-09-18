<script lang="ts">
  import type { RsvpStatus } from "../types/Rsvp";

  export let rsvp: RsvpStatus;
  export let attendeeName: string;
  export let guests: string;
  export let onSubmit: (e: Event) => void;
  export let onNameInput: (e: Event) => void;
  export let onRSVPChange: (e: Event) => void;
  export let onGuestsChange: (e: Event) => void;

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
      class="w-full rounded border border-gray-300 bg-white px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none dark:bg-background-dark"
      placeholder="Enter your name"
      required
      aria-required="true"
      bind:value={attendeeName}
      on:input={onNameInput}
    />
  </div>

  <div class="flex items-center gap-4">
    <span class="font-semibold">RSVP:</span>
    <div class="flex gap-2">
      {#each rsvpOptions as opt (opt.value)}
        <label class="inline-flex cursor-pointer items-center">
          <input
            type="radio"
            class="form-radio bg-white accent-primary dark:bg-background-dark"
            bind:group={rsvp}
            value={opt.value}
            on:change={onRSVPChange}
          />
          <span class="ml-1">{opt.label}</span>
        </label>
      {/each}
    </div>
  </div>

  {#if rsvp === "going"}
    <div>
      <label for="guests" class="mb-1 block font-semibold">Guests</label>
      <select
        id="guests"
        name="guests"
        class="w-full rounded border border-gray-300 bg-white px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none dark:bg-background-dark"
        bind:value={guests}
        on:change={onGuestsChange}
      >
        <option value="0">0</option>
        <option value="1">1</option>
        <option value="2">2</option>
      </select>
    </div>
  {/if}
  <button
    type="submit"
    class="self-start rounded bg-primary px-6 py-2 font-bold text-white shadow transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-gray-400"
    >Submit</button
  >
</form>
