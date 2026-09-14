const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function startOfDay(date: Date | number) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result.getTime();
}

export function endOfDay(date: Date | number) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result.getTime();
}

export function addDays(date: Date | number, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.getTime();
}

export function combineDateAndTime(date: Date | number, time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result.getTime();
}

export function formatLongDate(value: Date | number) {
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(value));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatShortDate(value: Date | number) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

export function formatDateTime(value: Date | number) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatTime(value: Date | number) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function toDateInput(value: Date | number) {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

export function parseDateInput(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  if (
    date.getFullYear() !== Number(match[3]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[1])
  ) {
    return null;
  }
  return startOfDay(date);
}

export function isValidTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  return Boolean(match && Number(match[1]) <= 23 && Number(match[2]) <= 59);
}

export function weekdayShort(day: number) {
  return WEEKDAYS_SHORT[day];
}

export function isToday(value: Date | number) {
  return startOfDay(value) === startOfDay(Date.now());
}
