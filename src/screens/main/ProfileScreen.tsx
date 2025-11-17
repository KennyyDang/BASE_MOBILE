import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  SafeAreaView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../contexts/AuthContext';
import { RootStackParamList } from '../../types';
import parentProfileService, { CurrentUserResponse } from '../../services/parentProfileService';

// Inline constants
const COLORS = {
  PRIMARY: '#1976D2',
  PRIMARY_DARK: '#1565C0',
  PRIMARY_LIGHT: '#42A5F5',
  SECONDARY: '#2196F3',
  ACCENT: '#64B5F6',
  BACKGROUND: '#F5F7FA',
  SURFACE: '#FFFFFF',
  TEXT_PRIMARY: '#1A1A1A',
  TEXT_SECONDARY: '#6B7280',
  BORDER: '#E5E7EB',
  ERROR: '#F44336',
  SUCCESS: '#4CAF50',
  SHADOW: '#000000',
};

const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
};

const FONTS = {
  SIZES: {
    XS: 12,
    SM: 14,
    MD: 16,
    LG: 18,
    XL: 20,
    XXL: 24,
  },
};

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { user, logout } = useAuth();
  const [currentUser, setCurrentUser] = useState<CurrentUserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchCurrentUser = useCallback(async () => {
    try {
      setError(null);
      const userData = await parentProfileService.getCurrentUser();
      setCurrentUser(userData);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Không thể tải thông tin người dùng';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const handleEditProfile = () => {
    Alert.alert('Chỉnh sửa hồ sơ', 'Tính năng đang được phát triển');
  };

  const handlePickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập',
          'Cần quyền truy cập thư viện ảnh để upload ảnh profile.'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        await handleUploadImage(asset.uri, asset.mimeType || 'image/jpeg');
      }
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  const handleUploadImage = async (uri: string, mimeType: string) => {
    try {
      setUploading(true);
      setError(null);

      const updatedUser = await parentProfileService.uploadProfilePicture(uri, undefined, mimeType);
      
      // Update local state with new profile picture URL
      setCurrentUser(updatedUser);
      
      Alert.alert('Thành công', 'Đã cập nhật ảnh profile thành công!');
    } catch (err: any) {
      const errorMessage = err?.message || 'Không thể upload ảnh profile';
      
      // Check if it's an adult/racy content error
      if (errorMessage.includes('Adult content') || errorMessage.includes('Racy content') || errorMessage.includes('không phù hợp')) {
        Alert.alert(
          'Ảnh không phù hợp',
          errorMessage,
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        Alert.alert('Lỗi', errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleNotifications = () => {
    navigation.navigate('Notifications');
  };

  const handleMySubscriptions = () => {
    navigation.navigate('MySubscriptions');
  };

  const handleOrderHistory = () => {
    navigation.navigate('OrderHistory');
  };

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading && !currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={48} color={COLORS.ERROR} />
          <Text style={styles.errorText}>Không tìm thấy thông tin người dùng</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* User Info Card */}
        <View style={styles.userCard}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handlePickImage}
            disabled={uploading}
            activeOpacity={0.7}
          >
            {uploading ? (
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            ) : currentUser?.profilePictureUrl ? (
              <Image
                source={{ uri: currentUser.profilePictureUrl }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <MaterialIcons name="person" size={60} color={COLORS.PRIMARY} />
            )}
            <View style={styles.avatarEditOverlay}>
              <MaterialIcons name="camera-alt" size={24} color={COLORS.SURFACE} />
            </View>
          </TouchableOpacity>
          
          <Text style={styles.userName}>
            {currentUser?.name || user.email}
          </Text>
          
          <View style={styles.userBadge}>
            <MaterialIcons name="badge" size={16} color={COLORS.PRIMARY} />
            <Text style={styles.userRole}>
              {currentUser?.roleName || user.role}
            </Text>
          </View>

          {currentUser?.branchName && (
            <View style={styles.userInfoRow}>
              <MaterialIcons name="location-on" size={16} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.userInfoText}>{currentUser.branchName}</Text>
            </View>
          )}
        </View>

        {/* User Details Section */}
        {currentUser && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin chi tiết</Text>
            
            {error && (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error" size={20} color={COLORS.ERROR} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <MaterialIcons name="email" size={20} color={COLORS.PRIMARY} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{currentUser.email}</Text>
                </View>
              </View>

              {currentUser.phoneNumber && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="phone" size={20} color={COLORS.PRIMARY} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Số điện thoại</Text>
                    <Text style={styles.detailValue}>{currentUser.phoneNumber}</Text>
                  </View>
                </View>
              )}

              {currentUser.branchName && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="business" size={20} color={COLORS.PRIMARY} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Chi nhánh</Text>
                    <Text style={styles.detailValue}>{currentUser.branchName}</Text>
                  </View>
                </View>
              )}

              <View style={styles.detailRow}>
                <MaterialIcons name="calendar-today" size={20} color={COLORS.PRIMARY} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Ngày tạo tài khoản</Text>
                  <Text style={styles.detailValue}>{formatDate(currentUser.createdAt)}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <MaterialIcons 
                  name={currentUser.isActive ? 'check-circle' : 'cancel'} 
                  size={20} 
                  color={currentUser.isActive ? COLORS.SUCCESS : COLORS.ERROR} 
                />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Trạng thái</Text>
                  <Text style={[styles.detailValue, { color: currentUser.isActive ? COLORS.SUCCESS : COLORS.ERROR }]}>
                    {currentUser.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
            <MaterialIcons name="edit" size={24} color={COLORS.PRIMARY} />
            <Text style={styles.menuText}>Chỉnh sửa hồ sơ</Text>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
            <MaterialIcons name="settings" size={24} color={COLORS.PRIMARY} />
            <Text style={styles.menuText}>Cài đặt</Text>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleNotifications}>
            <MaterialIcons name="notifications" size={24} color={COLORS.PRIMARY} />
            <Text style={styles.menuText}>Thông báo</Text>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleMySubscriptions}>
            <MaterialIcons name="card-membership" size={24} color={COLORS.PRIMARY} />
            <Text style={styles.menuText}>Gói đăng ký của tôi</Text>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleOrderHistory}>
            <MaterialIcons name="receipt-long" size={24} color={COLORS.PRIMARY} />
            <Text style={styles.menuText}>Lịch sử đơn hàng</Text>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <MaterialIcons name="logout" size={24} color={COLORS.ERROR} />
            <Text style={[styles.menuText, { color: COLORS.ERROR }]}>Đăng xuất</Text>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  errorText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.ERROR,
    textAlign: 'center',
  },
  userCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.LG,
    alignItems: 'center',
    marginBottom: SPACING.LG,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.MD,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: COLORS.PRIMARY_LIGHT,
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarEditOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: SPACING.XS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: FONTS.SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
    textAlign: 'center',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY_LIGHT + '20',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS,
    borderRadius: 16,
    marginBottom: SPACING.SM,
  },
  userRole: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
    marginLeft: SPACING.XS,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.XS,
  },
  userInfoText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.XS,
  },
  section: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.MD,
    marginBottom: SPACING.LG,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: SPACING.SM,
    borderRadius: 8,
    marginBottom: SPACING.MD,
  },
  detailCard: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    padding: SPACING.MD,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.MD,
    paddingBottom: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  detailContent: {
    flex: 1,
    marginLeft: SPACING.MD,
  },
  detailLabel: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  detailValue: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  menuContainer: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: SPACING.LG,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  menuText: {
    flex: 1,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.MD,
  },
});

export default ProfileScreen;
