<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/Header.svelte';
	import Footer from '$lib/Footer.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Header />
<div class="flex-1 flex flex-col">
  <main class="flex-1 px-2 sm:px-0">
    {@render children?.()}
  </main>
</div>
<Footer />
