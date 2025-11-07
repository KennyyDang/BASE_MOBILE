import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Cấu hình notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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
   * Khởi tạo và đăng ký push notification
   * Trả về Expo Push Token cần gửi lên server
   */
  async registerForPushNotifications(): Promise<PushNotificationToken | null> {
    try {
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
        tokenData = await Notifications.getExpoPushTokenAsync();
      } catch (error: any) {
        // Nếu lỗi về projectId, bỏ qua và không đăng ký push notification
        if (error.message?.includes('projectId')) {
          return null;
        }
        // Nếu lỗi khác, throw lại để catch ở ngoài
        throw error;
      }

      this.expoPushToken = tokenData.data;

      // Cấu hình Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Thông báo mặc định',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2E7D32',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });

        // Channel cho các thông báo khác
        await Notifications.setNotificationChannelAsync('class-reminders', {
          name: 'Nhắc nhở lớp học',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2196F3',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });

        await Notifications.setNotificationChannelAsync('payments', {
          name: 'Thông báo thanh toán',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4CAF50',
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
      console.error('Lỗi khi đăng ký push notification:', error);
      return null;
    }
  }

  /**
   * Lắng nghe thông báo đến
   */
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): void {
    this.notificationListener = Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Lắng nghe khi user tap vào thông báo
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
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Lấy số lượng badge (số thông báo chưa đọc)
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set số lượng badge
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
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * Lên lịch local notification
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
   */
  async cancelScheduledNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Kiểm tra quyền notification
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

