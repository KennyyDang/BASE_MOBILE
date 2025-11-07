// Notification Service
import axiosInstance from '../config/axios.config';
import { API_ENDPOINTS } from '../constants';
import { Notification } from '../types';

class NotificationService {
  async getNotifications(
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    const response = await axiosInstance.get<Notification[]>(API_ENDPOINTS.NOTIFICATIONS, {
      params: {
        page,
        limit,
        unreadOnly,
      },
    });
    return Array.isArray(response.data) ? response.data : [];
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await axiosInstance.post(API_ENDPOINTS.MARK_NOTIFICATION_READ.replace(':id', notificationId));
  }

  async markAllNotificationsAsRead(): Promise<void> {
    await axiosInstance.post(`${API_ENDPOINTS.NOTIFICATIONS}/mark-all-read`);
  }

  async getUnreadCount(): Promise<number> {
    const response = await axiosInstance.get<{ count: number }>(`${API_ENDPOINTS.NOTIFICATIONS}/unread-count`);
    return response.data?.count ?? 0;
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await axiosInstance.delete(`${API_ENDPOINTS.NOTIFICATIONS}/${notificationId}`);
  }

  async getNotificationById(notificationId: string): Promise<Notification | null> {
    const response = await axiosInstance.get<Notification>(`${API_ENDPOINTS.NOTIFICATIONS}/${notificationId}`);
    return (response.data as Notification) ?? null;
  }

  async updateNotificationPreferences(preferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    notificationTypes: string[];
  }): Promise<void> {
    await axiosInstance.put(`${API_ENDPOINTS.NOTIFICATIONS}/preferences`, preferences);
  }

  async registerPushToken(token: string, platform: 'ios' | 'android' | 'web'): Promise<void> {
    await axiosInstance.post(API_ENDPOINTS.REGISTER_PUSH_TOKEN, {
      token,
      platform,
    });
  }
}

export const notificationService = new NotificationService();
export default notificationService;
