import type { MedicineService } from './medicine-service';
import type { IntakeWithMedicine } from '@/types/models';
import { NOTIFICATION_GROUP_WINDOW_MS } from '@/utils/notification-data';

export type AlarmTrigger = {
  intakeId: string;
  intakeIds: string[];
  grouped: boolean;
};

export type AlarmListener = (trigger: AlarmTrigger) => void;

export interface AlarmScheduler {
  start(listener: AlarmListener): void;
  stop(): void;
  tick(): Promise<void>;
}

function groupNearby(intakes: IntakeWithMedicine[]) {
  const groups: IntakeWithMedicine[][] = [];
  for (const intake of intakes) {
    const current = groups.at(-1);
    if (current && intake.scheduledAt - current[0].scheduledAt <= NOTIFICATION_GROUP_WINDOW_MS) {
      current.push(intake);
    } else {
      groups.push([intake]);
    }
  }
  return groups;
}

function buildTrigger(group: IntakeWithMedicine[]): AlarmTrigger {
  const intakeIds = group.map((intake) => intake.id);
  return {
    intakeId: group[0].id,
    intakeIds,
    grouped: group.length > 1,
  };
}

export function createAlarmScheduler(service: MedicineService, intervalMs = 20_000): AlarmScheduler {
  let listener: AlarmListener | null = null;
  let firedAt = new Map<string, number>();
  let interval: ReturnType<typeof setInterval> | null = null;

  async function tick() {
    if (!listener) return;
    const now = Date.now();
    const pending = await service.listPendingNotifications();
    const groups = groupNearby(pending);
    for (const group of groups) {
      const first = group[0];
      const diff = first.scheduledAt - now;
      if (diff <= 0 && diff > -60_000) {
        const key = `${first.id}|${first.scheduledAt}`;
        const last = firedAt.get(key);
        if (last && now - last < 5 * 60_000) continue;
        firedAt.set(key, now);
        listener(buildTrigger(group));
      }
    }
  }

  return {
    start(fn) {
      listener = fn;
      firedAt = new Map();
      if (interval) clearInterval(interval);
      void tick();
      interval = setInterval(() => {
        tick().catch(() => undefined);
      }, intervalMs);
    },
    stop() {
      if (interval) clearInterval(interval);
      interval = null;
      listener = null;
    },
    tick,
  };
}

export const ALARM_TICK_INTERVAL_MS = 20_000;
