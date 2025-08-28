<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  // List of greetings with language
  const greetings = [
    { text: 'Hello', lang: 'English' },
    { text: 'Hallo', lang: 'German' },
    { text: 'Bonjour', lang: 'French' },
    { text: 'Olá', lang: 'Portuguese' },
    { text: 'નમસ્કાર', lang: 'Gujarati' },
    { text: 'Здравствуйте', lang: 'Russian' },
    { text: 'Bok', lang: 'Croatian' },
    { text: 'Dia dhuit', lang: 'Irish' },
    { text: 'مرحبا', lang: 'Arabic' },
    { text: 'Hei', lang: 'Finnish' }
  ];
  let current = 0;
  let interval: ReturnType<typeof setInterval>;

  onMount(() => {
    interval = setInterval(() => {
      current = (current + 1) % greetings.length;
    }, 3500);
  });


  let displayText = '';
  let typingTimeout: ReturnType<typeof setTimeout>;

  function typeGreeting(text: string, i = 0) {
    clearTimeout(typingTimeout);
    displayText = '';
    function typeChar() {
      if (i < text.length) {
        displayText += text[i];
        i++;
        typingTimeout = setTimeout(typeChar, 120); // Slower typing speed
      }
    }
    typeChar();
  }

  // Only type when current changes
  $: if (typeof window !== 'undefined') {
    typeGreeting(greetings[current].text);
  }

  onDestroy(() => {
    clearInterval(interval);
    clearTimeout(typingTimeout);
  });
</script>

<main id="main-content" class="flex flex-col items-center mt-8 bg-background dark:bg-background-dark min-h-screen transition-colors" tabindex="-1">
    <h1 class="text-3xl font-extrabold text-center drop-shadow-funky font-inter" id="page-title">
      <span class="inline-block min-w-[120px]">{displayText}</span> <span role="img" aria-label="waving hand">👋</span>
    </h1>
    <p class="mt-10 text-center text-gray-600 dark:text-gray-300 max-w-xl">A simple app to organise and manage our BOTC and other private events.<br/>Currently, <strong>only admins</strong> are allowed to create events, if you would like to use it for your own event, please contact your nearest admin for help!</p>
  <a
    href="/create-event"
    class="mt-6 px-8 py-3 bg-primary text-white rounded shadow-lg hover:bg-primary-dark transition-colors text-lg font-bold font-inter inline-block text-center dark:bg-primary-darkmode dark:hover:bg-primary-darkmode-hover"
    aria-label="Create Event"
    role="button"
  >
    Create Event
  </a>
</main>
