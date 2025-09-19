export function toGoogleCalendarDate(date: string, time: string): string {
  const [year, month, day] = date.split("-");
  const [hour, minute, secondRaw] = time.split(":");
  const second = secondRaw === undefined ? "00" : secondRaw;
  const pad = (n: string) => n.padStart(2, "0");
  return (
    year + pad(month) + pad(day) + "T" + pad(hour) + pad(minute) + pad(second)
  );
}

export function generateGoogleCalendarLink({
  name,
  date,
  start_time,
  end_time,
  location,
}: {
  name: string;
  date: string;
  start_time: string;
  end_time?: string;
  location?: string;
}): string {
  const start = toGoogleCalendarDate(date, start_time);
  const end = end_time ? toGoogleCalendarDate(date, end_time) : "";
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(name)}&dates=${start}/${end}&location=${encodeURIComponent(location || "")}`;
}
