import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Check if running in Expo Go
// Note: Local notifications still work in Expo Go, only push notifications are unavailable
const isRunningInExpoGo = (): boolean => {
  if (Constants.executionEnvironment === 'storeClient') {
    return true;
  }
  if (Constants.appOwnership === 'expo') {
    return true;
  }
  return false;
};

// Cấu hình notification handler (works in both Expo Go and dev builds)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface PushNotificationToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

class PushNotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  /**
   * Kiểm tra xem có đang chạy trong Expo Go không
   * Expo Go không hỗ trợ push notifications từ SDK 53+
   * Nhưng local notifications vẫn hoạt động
   */
  private isRunningInExpoGo(): boolean {
    return isRunningInExpoGo();
  }

  /**
   * Khởi tạo và đăng ký push notification
   * Trả về Expo Push Token cần gửi lên server
   * Note: Push notifications không hoạt động trong Expo Go, nhưng method này vẫn có thể được gọi
   */
  async registerForPushNotifications(): Promise<PushNotificationToken | null> {
    try {
      // Kiểm tra xem có đang chạy trong Expo Go không
      // Push notifications không hoạt động trong Expo Go
      if (this.isRunningInExpoGo()) {
        return null;
      }

      // Kiểm tra xem có phải thiết bị thật không (không hỗ trợ trên simulator)
      if (!Device.isDevice) {
        return null;
      }

      // Yêu cầu quyền notification
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Nếu chưa có quyền, yêu cầu
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // Nếu không được cấp quyền, dừng lại
      if (finalStatus !== 'granted') {
        return null;
      }

      let tokenData;
      try {
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

        tokenData = projectId
          ? await Notifications.getExpoPushTokenAsync({ projectId })
          : await Notifications.getExpoPushTokenAsync();
      } catch (error: any) {
        // Nếu lỗi về Expo Go hoặc push notifications không hỗ trợ
        if (
          error.message?.includes('projectId') ||
          error.message?.includes('Expo Go') ||
          error.message?.includes('development build')
        ) {
          return null;
        }
        // Nếu lỗi khác, throw lại để catch ở ngoài
        throw error;
      }

      if (!tokenData?.data) {
        return null;
      }

      this.expoPushToken = tokenData.data;

      // Cấu hình Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Thông báo mặc định',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#5cbdb9',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });

        // Channel cho các thông báo khác
        await Notifications.setNotificationChannelAsync('class-reminders', {
          name: 'Nhắc nhở lớp học',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#7dd3cf',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });

        await Notifications.setNotificationChannelAsync('payments', {
          name: 'Thông báo thanh toán',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#5cbdb9',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
      }

      // Trả về token với thông tin platform
      return {
        token: this.expoPushToken,
        platform: Platform.OS as 'ios' | 'android' | 'web',
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Lắng nghe thông báo đến
   * Local notifications vẫn hoạt động trong Expo Go
   */
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): void {
    this.notificationListener = Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Lắng nghe khi user tap vào thông báo
   * Local notifications vẫn hoạt động trong Expo Go
   */
  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): void {
    this.responseListener = Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Xóa listeners
   */
  removeListeners(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }

    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
  }

  /**
   * Hủy tất cả notifications
   * Local notifications vẫn hoạt động trong Expo Go
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Lấy số lượng badge (số thông báo chưa đọc)
   * Local notifications vẫn hoạt động trong Expo Go
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set số lượng badge
   * Local notifications vẫn hoạt động trong Expo Go
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Lấy Expo Push Token hiện tại
   */
  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Lấy scheduled notifications
   * Local notifications vẫn hoạt động trong Expo Go
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * Hiển thị local notification ngay lập tức
   * Local notifications vẫn hoạt động trong Expo Go
   */
  async presentLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    channelId?: string
  ): Promise<string> {
    const content: Notifications.NotificationContentInput = {
      title: title || 'Thông báo mới',
      body: body || '',
      data: data ?? {},
      sound: true,
    };

    // For Android, channelId is set in the notification request, not in content
    const notificationRequest: Notifications.NotificationRequestInput = {
      content,
      trigger: null,
    };

    if (channelId && Platform.OS === 'android') {
      // Set channelId in the request for Android
      (notificationRequest as any).channelId = channelId;
    }

    return await Notifications.scheduleNotificationAsync(notificationRequest);
  }

  /**
   * Lên lịch local notification
   * Local notifications vẫn hoạt động trong Expo Go
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    trigger: Notifications.NotificationTriggerInput,
    data?: Record<string, any>
  ): Promise<string> {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger,
    });

    return id;
  }

  /**
   * Hủy scheduled notification
   * Local notifications vẫn hoạt động trong Expo Go
   */
  async cancelScheduledNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Kiểm tra quyền notification
   * Local notifications vẫn hoạt động trong Expo Go
   */
  async checkPermissions(): Promise<Notifications.PermissionStatus> {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }

  /**
   * Mở cài đặt notification của app
   */
  async openNotificationSettings(): Promise<void> {
    // Implementation moved to SettingsScreen using Linking.openSettings()
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
