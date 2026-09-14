import type { MedicineService } from './medicine-service';

export const MEDICINE_CHANNEL = 'medicamentos';

function browserNotificationsAvailable() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function notificationsAllowed() {
  return browserNotificationsAvailable() && Notification.permission === 'granted';
}

export async function requestNotificationPermission() {
  if (!browserNotificationsAvailable()) return false;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  presentWebNotification(
    'Notificações ativadas',
    'O Zelo avisará enquanto esta página permanecer aberta.',
    'zelo-notifications-enabled',
  );
  return true;
}

export async function cancelIntakeNotification(_intakeId: string) {}

export async function resyncNotifications(service: MedicineService) {
  await service.regenerateRollingWindow();
  return notificationsAllowed();
}

export function presentWebNotification(title: string, body: string, tag: string) {
  if (!browserNotificationsAvailable() || Notification.permission !== 'granted') return false;
  try {
    const notification = new Notification(title, { body, icon: '/favicon.ico', tag });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}
