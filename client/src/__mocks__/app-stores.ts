import { readable, writable } from 'svelte/store';

export const page = readable({ url: new URL('http://localhost/'), params: {}, route: { id: null } });
export const navigating = readable(null);
export const updated = { subscribe: readable(false).subscribe, check: async () => false };
