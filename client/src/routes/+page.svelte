<script lang="ts">
  import Header from '$lib/Header.svelte';
  import Footer from '$lib/Footer.svelte';
</script>

<Header />

<div class="flex flex-col items-center mt-8 bg-background dark:bg-background-dark min-h-screen transition-colors">
  <h1 class="text-3xl font-extrabold text-center text-primary drop-shadow-funky font-inter">Hola 👋</h1>
  <button class="mt-6 px-8 py-3 bg-primary text-white rounded-full shadow-lg hover:bg-primary-dark transition-colors text-lg font-bold font-inter">Create Event</button>
</div>

<Footer />
