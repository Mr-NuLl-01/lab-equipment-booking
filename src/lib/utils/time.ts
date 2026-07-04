export const appTimeZone =
  process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || "Asia/Shanghai";

export function formatLocalDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: appTimeZone,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatLocalDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: appTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function isThirtyMinuteAligned(value: Date) {
  return (
    value.getSeconds() === 0 &&
    value.getMilliseconds() === 0 &&
    value.getMinutes() % 30 === 0
  );
}

export function isSameLocalDay(a: Date, b: Date) {
  return formatLocalDate(a) === formatLocalDate(b);
}

export function combineLocalDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00+08:00`);
}
