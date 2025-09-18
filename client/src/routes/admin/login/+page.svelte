<script lang="ts">
  import { goto } from "$app/navigation";
  import { API_HOST } from "../../../utils/apiHost";
  let username = "";
  let password = "";
  let loading = false;
  let error = "";

  async function handleLogin() {
    loading = true;
    error = "";
    const res = await fetch(`${API_HOST}/admin/login`, {
      headers: {
        Authorization: `Basic ${username}:${password}`,
      },
      method: "POST",
    });
    if (res.ok) {
      // ideally this shouldn't be stored in localStorage for security reasons, but we want a minimal solution. Can be improved later.
      localStorage.setItem("credentials", `${username}:${password}`);
      goto("/events");
    } else {
      error = "Invalid username or password";
    }
    loading = false;
  }
</script>

<main class="flex min-h-screen flex-col items-center py-8">
  <h1
    class="dark:text-primary-darkmode mb-8 font-inter text-2xl font-bold text-primary"
  >
    Admin Login
  </h1>
  <form
    class="flex w-full max-w-md flex-col gap-3 rounded-xl bg-background bg-surface p-6 font-inter shadow sm:bg-surface dark:bg-gray-800 dark:dark:bg-gray-800 sm:dark:bg-gray-800"
    on:submit|preventDefault={handleLogin}
    autocomplete="off"
  >
    <div>
      <label for="name" class="mb-1 block font-semibold"
        >Username<span class="ml-1 text-red-500" aria-hidden="true">*</span
        ></label
      >
      <input
        id="name"
        name="name"
        type="text"
        bind:value={username}
        required
        aria-required="true"
        aria-label="Event Name"
        class="w-full rounded border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none dark:border-gray-700 dark:bg-background-dark dark:text-text-dark"
      />
    </div>
    <div>
      <label for="password" class="mb-1 block font-semibold"
        >Password<span class="ml-1 text-red-500" aria-hidden="true">*</span
        ></label
      >
      <input
        id="password"
        name="password"
        type="password"
        bind:value={password}
        required
        aria-required="true"
        aria-label="Password"
        class="w-full rounded border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none dark:border-gray-700 dark:bg-background-dark dark:text-text-dark"
      />
    </div>

    {#if error}
      <div class="mb-2 text-center text-sm font-semibold text-red-600">
        {error}
      </div>
    {/if}
    <button
      type="submit"
      class="dark:bg-primary-darkmode dark:hover:bg-primary-darkmode-hover mt-4 flex min-w-[140px] items-center justify-center rounded bg-primary px-6 py-2 font-bold text-white shadow transition-colors hover:bg-primary-dark"
      aria-label="Create Event"
      disabled={loading}
    >
      {#if loading}
        <span class="relative mr-2 flex h-5 w-5">
          <span
            class="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"
          ></span>
          <span class="relative inline-flex h-5 w-5 rounded-full bg-white"
          ></span>
        </span>
        Loading...
      {:else}
        Submit
      {/if}
    </button>
  </form>
</main>
