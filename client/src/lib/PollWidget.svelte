<script lang="ts">
  import type { Poll, PollOption } from '../types/Poll';
  import type { User } from '../types/User';
  import { adminFetch } from '../utils/adminFetch';
  import { API_HOST } from '../utils/apiHost';

  export let poll: Poll | null;
  export let user: User | undefined;
  export let isAdmin: boolean;
  export let eventId: string;

  let currentPoll: Poll | null = poll;
  $: currentPoll = poll;

  // Voting state
  let selectedOptionIds: Set<string> = new Set();
  let voteLoading = false;
  let voteError = '';
  let voteSuccess = false;

  // Admin create form state
  let showCreateForm = false;
  let newTitle = '';
  let newOptions: { name: string; url: string; description: string }[] = [
    { name: '', url: '', description: '' },
  ];
  let createLoading = false;
  let createError = '';

  // Admin edit form state
  let showEditForm = false;
  let editTitle = '';
  let editOptions: { id?: string; name: string; url: string; description: string }[] = [];
  let editLoading = false;
  let editError = '';

  // Initialize selections from server state when poll or user changes
  function initSelectedOptions(p: Poll | null, u: User | undefined) {
    if (!p || !u) return;
    const myVotes = new Set<string>();
    for (const opt of p.options) {
      if (opt.votes.some(v => v.rsvp_id === u.id)) {
        myVotes.add(opt.id);
      }
    }
    selectedOptionIds = myVotes;
  }

  $: initSelectedOptions(currentPoll, user);

  function toggleOption(optId: string) {
    const next = new Set(selectedOptionIds);
    if (next.has(optId)) {
      next.delete(optId);
    } else {
      next.add(optId);
    }
    selectedOptionIds = next;
  }

  async function submitVote() {
    if (!user || !currentPoll) return;
    voteLoading = true;
    voteError = '';
    try {
      const res = await fetch(`${API_HOST}/polls/${currentPoll.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rsvpId: user.id,
          token: user.token,
          optionIds: Array.from(selectedOptionIds),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        voteError = data.error || 'Failed to save vote.';
      } else {
        currentPoll = data.poll;
        voteSuccess = true;
        setTimeout(() => (voteSuccess = false), 2500);
      }
    } catch {
      voteError = 'Network error.';
    } finally {
      voteLoading = false;
    }
  }

  async function handleClosePoll() {
    if (!currentPoll || !confirm('Close voting? Results will be sorted and locked.')) return;
    const res = await adminFetch(`${API_HOST}/admin/polls/${currentPoll.id}/close`, {
      method: 'PATCH',
    });
    if (res.ok) {
      const data = await res.json();
      currentPoll = data.poll;
    }
  }

  async function handleReopenPoll() {
    if (!currentPoll || !confirm('Re-open voting? Attendees will be able to change their votes again.')) return;
    const res = await adminFetch(`${API_HOST}/admin/polls/${currentPoll.id}/reopen`, { method: 'PATCH' });
    if (res.ok) {
      const data = await res.json();
      currentPoll = data.poll;
    }
  }

  function enterEditMode() {
    if (!currentPoll) return;
    editTitle = currentPoll.title;
    editOptions = currentPoll.options.map(o => ({
      id: o.id,
      name: o.name,
      url: o.url,
      description: o.description ?? '',
    }));
    editError = '';
    showEditForm = true;
  }

  function addEditOption() {
    editOptions = [...editOptions, { name: '', url: '', description: '' }];
  }

  function removeEditOption(i: number) {
    editOptions = editOptions.filter((_, idx) => idx !== i);
  }

  async function handleUpdatePoll() {
    const validOptions = editOptions.filter(o => o.name.trim() && o.url.trim());
    if (!editTitle.trim() || validOptions.length === 0) {
      editError = 'A title and at least one option with name and URL are required.';
      return;
    }
    editLoading = true;
    editError = '';
    try {
      const res = await adminFetch(`${API_HOST}/admin/polls/${currentPoll!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, options: validOptions }),
      });
      const data = await res.json();
      if (!res.ok) {
        editError = data.error || 'Failed to update poll.';
      } else {
        currentPoll = data.poll;
        showEditForm = false;
      }
    } catch {
      editError = 'Network error.';
    } finally {
      editLoading = false;
    }
  }

  async function handleDeletePoll() {
    if (!currentPoll || !confirm('Delete this poll? This cannot be undone.')) return;
    const res = await adminFetch(`${API_HOST}/admin/polls/${currentPoll.id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      currentPoll = null;
      showCreateForm = false;
    }
  }

  async function handleCreatePoll() {
    const validOptions = newOptions.filter(o => o.name.trim() && o.url.trim());
    if (!newTitle.trim() || validOptions.length === 0) {
      createError = 'A title and at least one option with name and URL are required.';
      return;
    }
    createLoading = true;
    createError = '';
    try {
      const res = await adminFetch(`${API_HOST}/admin/events/${eventId}/poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, options: validOptions }),
      });
      const data = await res.json();
      if (!res.ok) {
        createError = data.error || 'Failed to create poll.';
      } else {
        currentPoll = data.poll;
        showCreateForm = false;
        newTitle = '';
        newOptions = [{ name: '', url: '', description: '' }];
      }
    } catch {
      createError = 'Network error.';
    } finally {
      createLoading = false;
    }
  }

  function addOption() {
    newOptions = [...newOptions, { name: '', url: '', description: '' }];
  }

  function removeOption(i: number) {
    newOptions = newOptions.filter((_, idx) => idx !== i);
  }
</script>

{#if !currentPoll}
  {#if isAdmin}
    <div class="mb-6">
      {#if !showCreateForm}
        <button
          type="button"
          class="w-full rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 px-4 py-3 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:border-primary hover:text-primary transition-colors"
          on:click={() => (showCreateForm = true)}
        >
          + Add script vote
        </button>
      {:else}
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h3 class="font-bold text-gray-800 dark:text-gray-100 mb-3">Create script vote</h3>

          <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Poll title</label>
            <input
              type="text"
              bind:value={newTitle}
              placeholder="e.g. Vote for tonight's scripts"
              class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div class="mb-3 space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Options</label>
            {#each newOptions as opt, i}
              <div class="flex flex-col gap-1 rounded border border-gray-200 dark:border-gray-600 p-2">
                <div class="flex gap-2">
                  <input
                    type="text"
                    bind:value={opt.name}
                    placeholder="Script name"
                    class="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {#if newOptions.length > 1}
                    <button
                      type="button"
                      class="text-gray-400 hover:text-red-500"
                      on:click={() => removeOption(i)}
                      aria-label="Remove option"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  {/if}
                </div>
                <input
                  type="url"
                  bind:value={opt.url}
                  placeholder="Link (URL)"
                  class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="text"
                  bind:value={opt.description}
                  placeholder="Short description (optional)"
                  class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            {/each}
            <button
              type="button"
              class="text-sm text-primary hover:underline"
              on:click={addOption}
            >
              + Add another option
            </button>
          </div>

          {#if createError}
            <p class="text-red-600 text-sm mb-2">{createError}</p>
          {/if}

          <div class="flex gap-2 justify-end">
            <button
              type="button"
              class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              on:click={() => { showCreateForm = false; createError = ''; }}
            >
              Cancel
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-sm rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
              on:click={handleCreatePoll}
              disabled={createLoading}
            >
              {createLoading ? 'Creating…' : 'Create poll'}
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}
{:else}
  <div class="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
      <h2 class="text-base font-bold text-gray-800 dark:text-gray-100">{currentPoll.title}</h2>
      <div class="flex items-center gap-2">
        <span
          class="text-xs px-2 py-0.5 rounded-full font-medium {currentPoll.status === 'open'
            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}"
        >
          {currentPoll.status === 'open' ? 'Voting open' : 'Voting closed'}
        </span>
        {#if isAdmin}
          {#if currentPoll.status === 'open'}
            <button
              type="button"
              class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
              on:click={handleClosePoll}
            >
              Close voting
            </button>
          {:else}
            <button
              type="button"
              class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
              on:click={handleReopenPoll}
            >
              Re-open
            </button>
          {/if}
          <button
            type="button"
            class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
            on:click={enterEditMode}
          >
            Edit
          </button>
          <button
            type="button"
            class="text-xs text-red-400 hover:text-red-600 underline"
            on:click={handleDeletePoll}
          >
            Delete
          </button>
        {/if}
      </div>
    </div>

    {#if showEditForm}
      <!-- Admin edit form -->
      <div class="mb-3">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="edit-poll-title">Poll title</label>
        <input
          id="edit-poll-title"
          type="text"
          bind:value={editTitle}
          class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div class="mb-3 space-y-2">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Options</p>
        {#each editOptions as opt, i}
          <div class="flex flex-col gap-1 rounded border border-gray-200 dark:border-gray-600 p-2">
            <div class="flex gap-2">
              <input
                type="text"
                bind:value={opt.name}
                placeholder="Script name"
                class="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {#if editOptions.length > 1}
                <button
                  type="button"
                  class="text-gray-400 hover:text-red-500"
                  on:click={() => removeEditOption(i)}
                  aria-label="Remove option"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              {/if}
            </div>
            <input
              type="url"
              bind:value={opt.url}
              placeholder="Link (URL)"
              class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="text"
              bind:value={opt.description}
              placeholder="Short description (optional)"
              class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {#if opt.id && currentPoll.options.some(o => o.id === opt.id && o.votes.length > 0)}
              <p class="text-xs text-amber-600 dark:text-amber-400">
                Removing this option will delete {currentPoll.options.find(o => o.id === opt.id)?.votes.length} vote(s).
              </p>
            {/if}
          </div>
        {/each}
        <button
          type="button"
          class="text-sm text-primary hover:underline"
          on:click={addEditOption}
        >
          + Add another option
        </button>
      </div>

      {#if editError}
        <p class="text-red-600 text-sm mb-2">{editError}</p>
      {/if}

      <div class="flex gap-2 justify-end">
        <button
          type="button"
          class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          on:click={() => { showEditForm = false; editError = ''; }}
        >
          Cancel
        </button>
        <button
          type="button"
          class="px-3 py-1.5 text-sm rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
          on:click={handleUpdatePoll}
          disabled={editLoading}
        >
          {editLoading ? 'Saving…' : 'Save changes'}
        </button>
      </div>

    {:else if currentPoll.status === 'closed'}
      <!-- Closed: sorted results -->
      {@const topVoteCount = currentPoll.options.length > 0 ? currentPoll.options[0].votes.length : 0}
      <ul class="space-y-2">
        {#each currentPoll.options as opt (opt.id)}
          {@const rank = currentPoll.options.filter(o => o.votes.length > opt.votes.length).length + 1}
          {@const isTop = opt.votes.length > 0 && opt.votes.length === topVoteCount}
          <li class="flex items-start gap-3 rounded-lg px-3 py-2 {isTop ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700' : 'bg-gray-50 dark:bg-gray-700/40'}">
            <span class="text-sm font-bold w-5 text-center text-gray-400 dark:text-gray-500 pt-0.5">
              {rank}
            </span>
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline gap-2 flex-wrap">
                <a
                  href={opt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="font-semibold text-blue-600 dark:text-blue-400 hover:underline break-words"
                >
                  {opt.name}
                </a>
                <span class="text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0">
                  {opt.votes.length} vote{opt.votes.length !== 1 ? 's' : ''}
                </span>
              </div>
              {#if opt.description}
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.description}</p>
              {/if}
              {#if opt.votes.length > 0}
                <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {opt.votes.map(v => v.voter_name).join(', ')}
                </p>
              {/if}
            </div>
          </li>
        {/each}
      </ul>

    {:else}
      <!-- Open: voting UI -->
      {#if !user}
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">
          RSVP first to participate in the vote.
        </p>
      {/if}

      <ul class="space-y-2">
        {#each currentPoll.options as opt (opt.id)}
          {@const isSelected = user ? selectedOptionIds.has(opt.id) : false}
          <li class="rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2
            {user ? 'hover:border-primary transition-colors' : ''}
            {isSelected ? 'border-primary bg-blue-50 dark:bg-blue-900/20' : ''}">
            {#if user}
              <label class="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected}
                  on:change={() => toggleOption(opt.id)}
                  class="mt-1 accent-primary shrink-0"
                />
                <div class="flex-1 min-w-0">
                  <div class="flex items-baseline gap-2 flex-wrap">
                    <a
                      href={opt.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="font-semibold text-blue-600 dark:text-blue-400 hover:underline break-words"
                      on:click|stopPropagation
                    >
                      {opt.name}
                    </a>
                    <span class="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                      {opt.votes.length} vote{opt.votes.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {#if opt.description}
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.description}</p>
                  {/if}
                  {#if opt.votes.length > 0}
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {opt.votes.map(v => v.voter_name).join(', ')}
                    </p>
                  {/if}
                </div>
              </label>
            {:else}
              <div class="flex items-start gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex items-baseline gap-2 flex-wrap">
                    <a
                      href={opt.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="font-semibold text-blue-600 dark:text-blue-400 hover:underline break-words"
                    >
                      {opt.name}
                    </a>
                    <span class="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                      {opt.votes.length} vote{opt.votes.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {#if opt.description}
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.description}</p>
                  {/if}
                  {#if opt.votes.length > 0}
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {opt.votes.map(v => v.voter_name).join(', ')}
                    </p>
                  {/if}
                </div>
              </div>
            {/if}
          </li>
        {/each}
      </ul>

      {#if user}
        <button
          type="button"
          class="mt-3 w-full rounded bg-blue-600 px-4 py-2 text-sm text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          on:click={submitVote}
          disabled={voteLoading}
        >
          {voteLoading ? 'Saving…' : 'Save vote'}
        </button>
        {#if voteSuccess}
          <p class="text-center text-sm text-green-600 dark:text-green-400 mt-1">Vote saved!</p>
        {/if}
        {#if voteError}
          <p class="text-center text-sm text-red-600 mt-1">{voteError}</p>
        {/if}
      {/if}
    {/if}
  </div>
{/if}
