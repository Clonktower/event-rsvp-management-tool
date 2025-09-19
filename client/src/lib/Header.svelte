<script lang="ts">
  import { onMount } from 'svelte';
  let sidebarOpen = false;
  function openSidebar() { sidebarOpen = true; }
  function closeSidebar() { sidebarOpen = false; }
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') closeSidebar();
  }
  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

<header class="w-full bg-background-dark/90 py-2 text-text-light shadow-sm backdrop-blur-md transition-colors dark:bg-gray-900">
  <nav class="mx-auto flex max-w-3xl items-center justify-between px-4 relative h-14">
    <div class="w-10 flex-shrink-0"></div>
    <a
      href="/"
      class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-inter font-bold no-underline whitespace-nowrap text-lg sm:text-xl md:text-2xl lg:text-3xl max-w-xs sm:max-w-md md:max-w-lg truncate"
      >Event RSVP Tool</a
    >
    <button
      class="ml-auto flex items-center justify-center rounded p-2 text-xl hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
      aria-label="Open menu"
      on:click={openSidebar}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-7 w-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    </button>
  </nav>
</header>

{#if sidebarOpen}
  <div
    class="fixed inset-0 z-40 bg-black/40"
    on:click={closeSidebar}
  ></div>
  <aside
    class="fixed right-0 top-0 z-50 h-full w-72 max-w-full bg-white dark:bg-gray-900 shadow-lg transition-transform duration-200 transform translate-x-0 flex flex-col"
  >
    <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
      <span class="font-bold text-lg">Menu</span>
      <button
        class="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800"
        aria-label="Close menu"
        on:click={closeSidebar}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
    <nav class="flex flex-col gap-2 p-4">
      <a
        href="/"
        class="rounded px-3 py-2 text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
        on:click={closeSidebar}
        >Home</a
      >
      <a
        href="/events"
        class="rounded px-3 py-2 text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
        on:click={closeSidebar}
        >Events</a
      >
      <a
        href="/my/rsvps"
        class="rounded px-3 py-2 text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
        on:click={closeSidebar}
        >My RSVPs</a
      >
      <a
        href="/create-event"
        class="rounded px-3 py-2 text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
        on:click={closeSidebar}
        >Create Event</a
      >
      <a
        href="/admin/login"
        class="rounded px-3 py-2 text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
        on:click={closeSidebar}
        >Admin Login</a
      >
    </nav>
  </aside>
{/if}
