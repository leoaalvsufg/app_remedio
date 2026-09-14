import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { MedicineService } from './medicine-service';
import type { IntakeWithMedicine } from '@/types/models';
import { NOTIFICATION_GROUP_WINDOW_MS, parseIntakeIds } from '@/utils/notification-data';

export const MEDICINE_CHANNEL = 'medicamentos';

function groupNearbyIntakes(intakes: IntakeWithMedicine[]) {
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

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function prepareAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(MEDICINE_CHANNEL, {
    name: 'Lembretes de medicamentos',
    description: 'Avisos dos horários dos seus medicamentos.',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#007AFF',
    sound: 'default',
  });
}

export async function notificationsAllowed() {
  if (Platform.OS === 'web') return false;
  const settings = await Notifications.getPermissionsAsync();
  return Boolean(
    settings.granted ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL,
  );
}

export async function requestNotificationPermission() {
  if (Platform.OS === 'web') return false;
  await prepareAndroidChannel();
  if (await notificationsAllowed()) return true;
  const settings = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return Boolean(
    settings.granted ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL,
  );
}

export async function cancelIntakeNotification(intakeId: string) {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const match = scheduled.find((item) =>
    parseIntakeIds(item.content.data?.intakeIds, item.content.data?.intakeId).includes(intakeId),
  );
  if (match) await Notifications.cancelScheduledNotificationAsync(match.identifier);
}

export async function resyncNotifications(service: MedicineService) {
  await service.regenerateRollingWindow();
  if (Platform.OS === 'web') return false;
  await prepareAndroidChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!(await notificationsAllowed())) return false;

  const pending = await service.listPendingNotifications();
  const groups = groupNearbyIntakes(pending).slice(0, 60);
  for (const group of groups) {
    const first = group[0];
    const intakeIds = group.map((intake) => intake.id);
    const grouped = group.length > 1;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: grouped ? `Hora de tomar ${group.length} medicamentos!` : 'Hora do remédio!',
        body: grouped
          ? group.map((intake) => `${intake.medicine.name} - ${intake.medicine.dosage}`).join('\n')
          : `${first.medicine.name} - ${first.medicine.dosage}`,
        data: {
          intakeId: first.id,
          intakeIds: JSON.stringify(intakeIds),
          medicineId: first.medicineId,
          grouped,
          url: grouped ? '/alerta/grupo' : `/alerta/${first.id}`,
        },
        sound: 'default',
        ...(Platform.OS === 'ios' && first.medicine.photoUri
          ? {
              attachments: [
                { identifier: 'medicine-photo', url: first.medicine.photoUri, type: 'image' },
              ],
            }
          : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(first.scheduledAt),
        channelId: Platform.OS === 'android' ? MEDICINE_CHANNEL : undefined,
      },
    });
  }
  return true;
}
