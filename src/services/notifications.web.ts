import type { MedicineService } from './medicine-service';

export const MEDICINE_CHANNEL = 'medicamentos';

export async function notificationsAllowed() {
  return false;
}

export async function requestNotificationPermission() {
  return false;
}

export async function cancelIntakeNotification(_intakeId: string) {}

export async function resyncNotifications(service: MedicineService) {
  await service.regenerateRollingWindow();
  return false;
}
