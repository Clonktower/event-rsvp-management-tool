<script lang="ts">
  import "../app.css";
  import favicon from "$lib/assets/favicon.svg";
  import Header from "$lib/Header.svelte";
  import Footer from "$lib/Footer.svelte";

  let { children } = $props();

  import { onMount, setContext } from 'svelte';

  let menuOpen = $state(false);
  setContext('setMenuOpen', (isOpen: boolean) => menuOpen = isOpen);

  onMount(() => {
    // Marks the point where the client app has taken over from the SSR'd markup.
    // The E2E suite waits on this before interacting: forms here submit via
    // on:submit|preventDefault, so a click landing before hydration falls through
    // to a native GET submit instead of the handler. See e2e/helpers.ts.
    document.body.dataset.hydrated = 'true';
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<Header />
<div class="flex flex-1 flex-col">
  <main class="flex-1 px-2 sm:px-0" inert="{menuOpen}">
    {@render children?.()}
  </main>
</div>
<Footer />
