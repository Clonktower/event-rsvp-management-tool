export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const timeZone = "Europe/Berlin";
  const weekday = d.toLocaleDateString(undefined, {
    weekday: "short",
    timeZone,
  });
  const date = d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone,
  });
  return `${weekday}, ${date}`;
}

export function toHumanTime(t: string): string {
  if (!t) return "";
  const [h, m] = t.split(":");
  const d = new Date();
  d.setHours(Number(h), Number(m));
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatEventDuration(startTime?: string, endTime?: string) {
  let formattedTime = "";
  if (startTime) {
    formattedTime = toHumanTime(startTime);
    if (endTime) {
      formattedTime += ` - ${toHumanTime(endTime)}`;
    }
  }

  return formattedTime;
}
