import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import notificationService from '../../services/notificationService';
import { Notification } from '../../types';

const COLORS = {
  PRIMARY: '#2E7D32',
  SECONDARY: '#2196F3',
  BACKGROUND: '#F5F5F5',
  SURFACE: '#FFFFFF',
  TEXT_PRIMARY: '#212121',
  TEXT_SECONDARY: '#757575',
  BORDER: '#E0E0E0',
  ERROR: '#F44336',
};

const SPACING = {
  XS: 6,
  SM: 12,
  MD: 16,
  LG: 24,
};

type NotificationItem = Notification & {
  createdAt: string;
};

const formatDateTime = (value?: string) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return value;
  }
};

const extractNotifications = (payload: any): NotificationItem[] => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload as NotificationItem[];
  }

  if (payload?.items && Array.isArray(payload.items)) {
    return payload.items as NotificationItem[];
  }

  if (payload?.data && Array.isArray(payload.data)) {
    return payload.data as NotificationItem[];
  }

  return [];
};

const mapIconName = (iconName?: string): keyof typeof MaterialIcons.glyphMap => {
  if (!iconName) {
    return 'notifications';
  }

  const normalized = iconName.toLowerCase();
  const iconMap: Record<string, keyof typeof MaterialIcons.glyphMap> = {
    wallet: 'account-balance-wallet',
    wallet_outline: 'account-balance-wallet',
    calendar: 'calendar-today',
    calendar_check: 'event-available',
    calendar_today: 'calendar-today',
    package: 'local-shipping',
    parcel: 'local-shipping',
    payment: 'payment',
    money: 'attach-money',
    bell: 'notifications',
  };

  return iconMap[normalized] ?? 'notifications';
};

const NotificationScreen: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async (opts?: { refresh?: boolean }) => {
    const { refresh } = opts || {};
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await notificationService.getNotifications(1, 50);
      const extracted = extractNotifications(response);
      setNotifications(extracted);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách thông báo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchNotifications({ refresh: true });
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId
            ? {
                ...item,
                isRead: true,
              }
            : item
        )
      );
    } catch (err) {
      // Ignore marking error; user can retry
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch (err) {
      // Ignore errors for now
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  useEffect(() => {
    fetchNotifications();
  }, []);

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const priorityColor = item.priority === 'High' ? COLORS.ERROR : COLORS.SECONDARY;
    return (
      <TouchableOpacity
        style={[styles.notificationCard, item.isRead ? styles.readCard : styles.unreadCard]}
        activeOpacity={0.8}
        onPress={() => {
          if (!item.isRead) {
            handleMarkAsRead(item.id);
          }
        }}
      >
        <View style={styles.iconWrapper}>
          <MaterialIcons
            name={mapIconName(item.iconName as string)}
            size={28}
            color={item.isRead ? COLORS.TEXT_SECONDARY : COLORS.PRIMARY}
          />
        </View>
        <View style={styles.contentWrapper}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, item.isRead && styles.readTitle]} numberOfLines={2}>
              {item.title || 'Thông báo'}
            </Text>
            <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
              <Text style={styles.priorityText}>{item.priority || 'Normal'}</Text>
            </View>
          </View>
          <Text style={styles.message} numberOfLines={3}>
            {item.message || ''}
          </Text>
          <View style={styles.footerRow}>
            <Text style={styles.timestamp}>{formatDateTime(item.createdAt)}</Text>
            {!item.isRead && (
              <TouchableOpacity onPress={() => handleMarkAsRead(item.id)}>
                <Text style={styles.markReadText}>Đánh dấu đã đọc</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="notifications-off" size={48} color={COLORS.TEXT_SECONDARY} />
      <Text style={styles.emptyText}>Chưa có thông báo nào</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
        <MaterialIcons name="refresh" size={20} color="#fff" />
        <Text style={styles.refreshButtonText}>Tải lại</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllAsRead}>
          <MaterialIcons name="done-all" size={20} color={COLORS.PRIMARY} />
          <Text style={styles.markAllText}>Đánh dấu tất cả</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.refreshInlineButton} onPress={handleRefresh}>
          <MaterialIcons name="refresh" size={20} color={COLORS.SECONDARY} />
          <Text style={styles.refreshInlineText}>Làm mới</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
        />
      )}

      {error && (
        <View style={styles.errorBanner}>
          <MaterialIcons name="error-outline" size={20} color="#fff" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    alignItems: 'center',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 12,
  },
  markAllText: {
    marginLeft: 6,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  refreshInlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 12,
  },
  refreshInlineText: {
    marginLeft: 6,
    color: COLORS.SECONDARY,
    fontWeight: '600',
  },
  listContent: {
    padding: SPACING.MD,
    paddingBottom: 80,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  unreadCard: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: '#E8F5E9',
  },
  readCard: {
    opacity: 0.75,
  },
  iconWrapper: {
    marginRight: SPACING.MD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginRight: SPACING.SM,
  },
  readTitle: {
    color: COLORS.TEXT_SECONDARY,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  markReadText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    marginTop: 12,
    color: COLORS.TEXT_SECONDARY,
    fontSize: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  refreshButtonText: {
    marginLeft: 8,
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    position: 'absolute',
    left: SPACING.MD,
    right: SPACING.MD,
    bottom: SPACING.MD,
    backgroundColor: COLORS.ERROR,
    borderRadius: 12,
    padding: SPACING.SM,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#fff',
    marginLeft: 8,
    textAlign: 'center',
  },
});

export default NotificationScreen;
