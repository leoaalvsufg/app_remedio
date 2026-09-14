import type { Intake, Schedule } from '@/types/models';
import { addDays, combineDateAndTime, startOfDay } from '@/utils/date';
import { createId } from '@/utils/id';

export const ROLLING_DAYS = 14;

export function rollingEnd(from = Date.now()) {
  return addDays(startOfDay(from), ROLLING_DAYS);
}

export function generateIntakes(schedule: Schedule, from: number, to: number): Intake[] {
  const effectiveFrom = Math.max(from, schedule.startDate);
  const effectiveTo = Math.min(to, schedule.endDate ?? to);
  if (effectiveFrom > effectiveTo) return [];

  const occurrences: number[] = [];

  if (schedule.type === 'interval' && schedule.intervalHours && schedule.startTime) {
    const anchor = combineDateAndTime(schedule.startDate, schedule.startTime);
    const intervalMs = schedule.intervalHours * 60 * 60 * 1000;
    const firstIndex = Math.max(0, Math.ceil((effectiveFrom - anchor) / intervalMs));
    for (let value = anchor + firstIndex * intervalMs; value <= effectiveTo; value += intervalMs) {
      occurrences.push(value);
    }
  } else {
    let day = startOfDay(effectiveFrom);
    while (day <= effectiveTo) {
      const weekdayAllowed = schedule.type !== 'weekly' || schedule.weekdays.includes(new Date(day).getDay());
      if (weekdayAllowed) {
        for (const time of schedule.times) {
          const occurrence = combineDateAndTime(day, time);
          if (occurrence >= effectiveFrom && occurrence <= effectiveTo) occurrences.push(occurrence);
        }
      }
      day = addDays(day, 1);
    }
  }

  return [...new Set(occurrences)]
    .sort((a, b) => a - b)
    .map((scheduledAt) => ({
      id: createId(),
      medicineId: schedule.medicineId,
      scheduleId: schedule.id,
      scheduledAt,
      takenAt: null,
      status: 'pending' as const,
      parentIntakeId: null,
      snoozeCount: 0,
      updatedAt: Date.now(),
    }));
}
