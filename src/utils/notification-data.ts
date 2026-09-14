export const NOTIFICATION_GROUP_WINDOW_MS = 10 * 60 * 1000;

export function parseIntakeIds(value: unknown, fallback?: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string');
    } catch {
      if (value) return [value];
    }
  }
  return typeof fallback === 'string' ? [fallback] : [];
}
