import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import notificationService from '../services/notificationService';
import pushNotificationService from '../services/pushNotificationService';
import { Notification } from '../types';

const POLLING_INTERVAL = 45_000; // 45 seconds

const normalizeNotifications = (payload: unknown): Notification[] => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload as Notification[];
  }

  if (
    typeof payload === 'object' &&
    payload !== null &&
    Array.isArray((payload as Record<string, any>).items)
  ) {
    return (payload as { items: Notification[] }).items;
  }

  if (
    typeof payload === 'object' &&
    payload !== null &&
    Array.isArray((payload as Record<string, any>).data)
  ) {
    return (payload as { data: Notification[] }).data;
  }

  return [];
};

interface NotificationWatcherProps {
  enabled: boolean;
}

const NotificationWatcher: React.FC<NotificationWatcherProps> = ({ enabled }) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const hasBaselineRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    let isCancelled = false;
    let appStateSubscription: { remove: () => void } | undefined;

    const clearTimer = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const updateBadgeCount = (items: Notification[]) => {
      const unreadCount = items.filter((item) => !item.isRead).length;
      pushNotificationService.setBadgeCount(unreadCount).catch(() => {});
    };

    const pollNotifications = async () => {
      if (isCancelled) {
        return;
      }

      try {
        const response = await notificationService.getNotifications(1, 10, true);
        const notifications = normalizeNotifications(response);
        const currentIds = new Set<string>(notifications.map((item) => item.id));

        if (!hasBaselineRef.current) {
          knownIdsRef.current = currentIds;
          hasBaselineRef.current = true;
          updateBadgeCount(notifications);
          return;
        }

        const newlyAdded = notifications.filter(
          (item) => !knownIdsRef.current.has(item.id)
        );

        if (newlyAdded.length > 0) {
          for (const notification of newlyAdded) {
            await pushNotificationService.presentLocalNotification(
              notification.title || 'Thông báo mới',
              notification.message || '',
              {
                notificationId: notification.id,
                type: notification.type,
                data: notification.data,
              },
              typeof notification.channels === 'string'
                ? notification.channels
                : Array.isArray(notification.channels)
                ? notification.channels[0]
                : undefined
            );
          }
        }

        knownIdsRef.current = currentIds;
        updateBadgeCount(notifications);
      } catch (error) {
        if (__DEV__) {
          console.warn('Polling notifications failed:', error);
        }
      }
    };

    const startPolling = () => {
      clearTimer();
      pollNotifications();
      intervalRef.current = setInterval(pollNotifications, POLLING_INTERVAL);
    };

    if (enabled) {
      hasBaselineRef.current = false;
      startPolling();

      appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
        if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
          startPolling();
        } else if (nextAppState === 'background') {
          clearTimer();
        }
        appStateRef.current = nextAppState;
      });
    } else {
      clearTimer();
      knownIdsRef.current.clear();
      hasBaselineRef.current = false;
    }

    return () => {
      isCancelled = true;
      clearTimer();
      appStateSubscription?.remove();
    };
  }, [enabled]);

  return null;
};

export default NotificationWatcher;


