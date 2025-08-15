<script lang="ts">
  import { goto } from '$app/navigation';
  let username = '';
  let password = '';
  let loading = false;
  let error = ''

  async function handleLogin() {
    loading = true;
    error = '';
    const res = await fetch('http://localhost:3000/admin/login', {
      headers: {
        'Authorization': `Basic ${username}:${password}`
      },
      method: "POST",
    });
    if (res.ok) {
      // ideally this shouldn't be stored in localStorage for security reasons, but we want a minimal solution. Can be improved later.
      localStorage.setItem("credentials", `${username}:${password}`);
      goto('/admin/events');
    } else {
      error = 'Invalid username or password';
    }
    loading = false;
  }
</script>

<main class="flex flex-col items-center py-8 min-h-screen">
  <h1 class="text-2xl font-bold mb-8 text-primary dark:text-primary-darkmode font-inter">Admin Login</h1>
  <form class="w-full max-w-md rounded-xl shadow p-6 flex flex-col gap-3 font-inter bg-surface dark:bg-gray-800 sm:bg-surface sm:dark:bg-gray-800 bg-background dark:dark:bg-gray-800" on:submit|preventDefault={handleLogin} autocomplete="off">
    <div>
      <label for="name" class="block mb-1 font-semibold">Username<span class="text-red-500 ml-1" aria-hidden="true">*</span></label>
      <input id="name" name="name" type="text" bind:value={username} required aria-required="true" aria-label="Event Name" class="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-background-dark dark:border-gray-700 dark:text-text-dark" />
    </div>
    <div>
      <label for="password" class="block mb-1 font-semibold">Password<span class="text-red-500 ml-1" aria-hidden="true">*</span></label>
      <input id="password" name="password" type="password" bind:value={password} required aria-required="true" aria-label="Password" class="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-background-dark dark:border-gray-700 dark:text-text-dark" />
    </div>

    {#if error}
      <div class="text-red-600 text-center text-sm font-semibold mb-2">{error}</div>
    {/if}
    <button type="submit" class="mt-4 px-6 py-2 bg-primary text-white rounded font-bold shadow hover:bg-primary-dark transition-colors dark:bg-primary-darkmode dark:hover:bg-primary-darkmode-hover flex items-center justify-center min-w-[140px]" aria-label="Create Event" disabled={loading}>
      {#if loading}
        <span class="relative flex h-5 w-5 mr-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span class="relative inline-flex rounded-full h-5 w-5 bg-white"></span>
        </span>
        Loading...
      {:else}
        Submit
      {/if}
    </button>
  </form>

</main>
