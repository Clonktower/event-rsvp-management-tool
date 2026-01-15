<script lang="ts">
  import "../app.css";
  import favicon from "$lib/assets/favicon.svg";
  import Header from "$lib/Header.svelte";
  import Footer from "$lib/Footer.svelte";

  let { children } = $props();

  import { setContext } from 'svelte';

  let menuOpen = $state(false);
  setContext('setMenuOpen', (isOpen: boolean) => menuOpen = isOpen);
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
