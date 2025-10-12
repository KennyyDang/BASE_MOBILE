// Notification Service
import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../constants';
import { Notification, ApiResponse, PaginatedResponse } from '../types';

class NotificationService {
  // Get all notifications
  async getNotifications(
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<ApiResponse<PaginatedResponse<Notification>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      unreadOnly: unreadOnly.toString(),
    });

    return await apiClient.get<PaginatedResponse<Notification>>(
      `${API_ENDPOINTS.NOTIFICATIONS}?${params.toString()}`
    );
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<void>> {
    return await apiClient.post(API_ENDPOINTS.MARK_NOTIFICATION_READ.replace(':id', notificationId));
  }

  // Mark all notifications as read
  async markAllNotificationsAsRead(): Promise<ApiResponse<void>> {
    return await apiClient.post(`${API_ENDPOINTS.NOTIFICATIONS}/mark-all-read`);
  }

  // Get unread notification count
  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    return await apiClient.get<{ count: number }>(`${API_ENDPOINTS.NOTIFICATIONS}/unread-count`);
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
    return await apiClient.delete(`${API_ENDPOINTS.NOTIFICATIONS}/${notificationId}`);
  }

  // Get notification by ID
  async getNotificationById(notificationId: string): Promise<ApiResponse<Notification>> {
    return await apiClient.get<Notification>(`${API_ENDPOINTS.NOTIFICATIONS}/${notificationId}`);
  }

  // Update notification preferences
  async updateNotificationPreferences(preferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    notificationTypes: string[];
  }): Promise<ApiResponse<void>> {
    return await apiClient.put(`${API_ENDPOINTS.NOTIFICATIONS}/preferences`, preferences);
  }
}

export const notificationService = new NotificationService();
export default notificationService;
