// Utility functions for formatting date and time in a human-readable way
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function toHumanTime(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(":");
  const d = new Date();
  d.setHours(Number(h), Number(m));
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

