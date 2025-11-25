import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import pushNotificationService from '../../services/pushNotificationService';
import notificationService from '../../services/notificationService';
import { COLORS } from '../../constants';

const SPACING = {
  SM: 8,
  MD: 16,
  LG: 24,
};

const FONTS = {
  SIZES: {
    SM: 14,
    MD: 16,
    LG: 18,
    XL: 20,
  },
};

const SettingsScreen: React.FC = () => {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkPermissions();
    loadBadgeCount();
  }, []);

  const checkPermissions = async () => {
    try {
      const status = await pushNotificationService.checkPermissions();
      setPushEnabled(status === 'granted');
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const loadBadgeCount = async () => {
    try {
      const count = await pushNotificationService.getBadgeCount();
      setBadgeCount(count);
    } catch (error) {
      console.error('Error loading badge count:', error);
    }
  };

  const handleTogglePush = async (value: boolean) => {
    if (!value) {
      // Tắt thông báo
      setPushEnabled(false);
      Alert.alert(
        'Đã tắt thông báo',
        'Bạn có thể bật lại thông báo trong Cài đặt hệ thống',
        [{ text: 'OK' }]
      );
      return;
    }

    // Bật thông báo
    setLoading(true);
    try {
      const pushToken = await pushNotificationService.registerForPushNotifications();
      if (pushToken) {
        await notificationService.registerPushToken(pushToken.token, pushToken.platform);
        setPushEnabled(true);
        Alert.alert('Thành công', 'Đã bật thông báo đẩy');
      } else {
        setPushEnabled(false);
        Alert.alert(
          'Không thể bật thông báo',
          'Vui lòng kiểm tra quyền thông báo trong Cài đặt'
        );
      }
    } catch (error: any) {
      console.error('Error enabling push:', error);
      setPushEnabled(false);
      Alert.alert('Lỗi', 'Không thể bật thông báo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSettings = async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openSettings();
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      console.error('Error opening settings:', error);
      Alert.alert('Lỗi', 'Không thể mở cài đặt');
    }
  };

  const handleClearBadge = async () => {
    try {
      await pushNotificationService.setBadgeCount(0);
      setBadgeCount(0);
      Alert.alert('Thành công', 'Đã xóa số thông báo chưa đọc');
    } catch (error: any) {
      console.error('Error clearing badge:', error);
      Alert.alert('Lỗi', 'Không thể xóa số thông báo: ' + error.message);
    }
  };

  const handleTestNotification = async () => {
    try {
      Alert.alert(
        'Gửi thông báo test',
        'Bạn có muốn gửi thông báo test?',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Gửi',
            onPress: async () => {
              try {
                await pushNotificationService.scheduleLocalNotification(
                  'Thông báo test',
                  'Đây là thông báo test từ ứng dụng BASE',
                  { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
                  { type: 'test' }
                );
                Alert.alert('Thành công', 'Thông báo test sẽ hiển thị sau 2 giây');
              } catch (error: any) {
                Alert.alert('Lỗi', 'Không thể gửi thông báo test: ' + error.message);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error in test notification:', error);
    }
  };

  const handleViewToken = async () => {
    try {
      const token = pushNotificationService.getExpoPushToken();
      if (token) {
        Alert.alert('Expo Push Token', token);
      } else {
        Alert.alert('Thông báo', 'Chưa có token. Vui lòng bật thông báo trước.');
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Notification Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông báo đẩy</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="notifications" size={24} color={COLORS.PRIMARY} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Thông báo đẩy</Text>
                <Text style={styles.settingDescription}>
                  Nhận thông báo về lớp học, thanh toán, và tin tức
                </Text>
              </View>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={handleTogglePush}
              disabled={loading}
              trackColor={{ false: COLORS.BORDER, true: COLORS.PRIMARY + '80' }}
              thumbColor={pushEnabled ? COLORS.PRIMARY : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity style={styles.actionButton} onPress={handleOpenSettings}>
            <MaterialIcons name="settings" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.actionButtonText}>Mở cài đặt hệ thống</Text>
          </TouchableOpacity>
        </View>

        {/* Notification Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quản lý thông báo</Text>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Số thông báo chưa đọc:</Text>
            <Text style={styles.infoValue}>{badgeCount}</Text>
          </View>

          <TouchableOpacity style={styles.actionButton} onPress={handleClearBadge}>
            <MaterialIcons name="notifications-off" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.actionButtonText}>Xóa số thông báo</Text>
          </TouchableOpacity>
        </View>

        {/* Developer Tools Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Công cụ phát triển</Text>

          <TouchableOpacity style={styles.actionButton} onPress={handleTestNotification}>
            <MaterialIcons name="send" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.actionButtonText}>Gửi thông báo test</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleViewToken}>
            <MaterialIcons name="code" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.actionButtonText}>Xem Push Token</Text>
          </TouchableOpacity>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin ứng dụng</Text>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Phiên bản:</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Nền tảng:</Text>
            <Text style={styles.infoValue}>React Native (Expo)</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollContent: {
    padding: SPACING.MD,
  },
  section: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
  },
  sectionTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.MD,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.MD,
  },
  settingTextContainer: {
    flex: 1,
    marginLeft: SPACING.MD,
  },
  settingTitle: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.SM,
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 8,
    marginTop: SPACING.SM,
  },
  actionButtonText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.PRIMARY,
    marginLeft: SPACING.SM,
    fontWeight: '500',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  infoLabel: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
  },
  infoValue: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '600',
  },
});

export default SettingsScreen;

