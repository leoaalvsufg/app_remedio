import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { parseIntakeIds } from '@/utils/notification-data';

function openNotification(notification: Notifications.Notification) {
  const intakeId = notification.request.content.data?.intakeId;
  const intakeIds = parseIntakeIds(notification.request.content.data?.intakeIds, intakeId);
  if (intakeIds.length > 1) {
    router.push({ pathname: '/alerta/grupo', params: { intakeIds: JSON.stringify(intakeIds) } });
  } else if (typeof intakeId === 'string') {
    router.push({ pathname: '/alerta/[intakeId]', params: { intakeId } });
  }
}

export function useNotificationRouting() {
  useEffect(() => {
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) openNotification(lastResponse.notification);
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openNotification(response.notification);
    });
    const receivedSubscription = Notifications.addNotificationReceivedListener(openNotification);
    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  }, []);
}
