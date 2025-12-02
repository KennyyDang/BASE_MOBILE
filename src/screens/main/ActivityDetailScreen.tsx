import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import activityService from '../../services/activityService';
import { RootStackParamList } from '../../types';
import { ActivityResponse } from '../../types/api';
import { COLORS } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';

type ActivityDetailRouteProp = RouteProp<RootStackParamList, 'ActivityDetail'>;
type ActivityDetailNavigationProp = StackNavigationProp<RootStackParamList>;

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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatDateTime = (dateString: string) => {
  try {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeStr = date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return { date: dateStr, time: timeStr, full: date.toLocaleString('vi-VN') };
  } catch (e) {
    return { date: dateString, time: '', full: dateString };
  }
};

const ActivityDetailScreen: React.FC = () => {
  const navigation = useNavigation<ActivityDetailNavigationProp>();
  const {
    params: { activityId },
  } = useRoute<ActivityDetailRouteProp>();
  const { user } = useAuth();

  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [markingViewed, setMarkingViewed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Kiểm tra xem user có phải staff không (có quyền sửa/xóa)
  const isStaff = user?.role && (user.role.toUpperCase().includes('STAFF') || user.role.toUpperCase() === 'ADMIN');

  const fetchActivity = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await activityService.getActivityById(activityId);
      setActivity(response);
    } catch (err: any) {
      const message =
        err?.message ||
        err?.response?.data?.message ||
        'Không thể tải chi tiết hoạt động. Vui lòng thử lại.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activityId]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // Refresh khi quay lại từ EditActivity
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchActivity(true);
    });
    return unsubscribe;
  }, [navigation, fetchActivity]);

  useEffect(() => {
    // Đánh dấu đã đọc khi activity được load
    if (activity && !activity.isViewed && !markingViewed) {
      handleMarkAsViewed(activity);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity?.id]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchActivity(true);
  }, [fetchActivity]);

  const handleMarkAsViewed = async (activityData: ActivityResponse) => {
    if (activityData.isViewed || markingViewed) {
      return;
    }

    setMarkingViewed(true);

    try {
      const updatedActivity = await activityService.markActivityAsViewed(activityData.id);
      setActivity(updatedActivity);
    } catch (err: any) {
      // Silent fail
      console.warn('Failed to mark activity as viewed:', err);
    } finally {
      setMarkingViewed(false);
    }
  };

  const handleImagePress = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const handleEdit = () => {
    if (!activity) return;
    navigation.navigate('EditActivity', { activityId: activity.id });
  };

  const handleDelete = () => {
    if (!activity) return;

    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa hoạt động này?\n\n"${activity.activityType?.name || 'Hoạt động'}"\n\nHành động này không thể hoàn tác.`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await activityService.deleteActivity(activity.id);
              Alert.alert('Thành công', 'Đã xóa hoạt động thành công!', [
                {
                  text: 'OK',
                  onPress: () => {
                    navigation.goBack();
                  },
                },
              ]);
            } catch (err: any) {
              const message =
                err?.response?.data?.message ||
                err?.message ||
                'Không thể xóa hoạt động. Vui lòng thử lại.';
              Alert.alert('Lỗi', message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Đang tải chi tiết hoạt động...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !activity) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={48} color={COLORS.ERROR} />
          <Text style={[styles.errorText, { color: COLORS.ERROR }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchActivity()}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!activity) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <MaterialIcons name="event-busy" size={48} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.errorText}>Không tìm thấy hoạt động</Text>
        </View>
      </SafeAreaView>
    );
  }

  const timeInfo = formatDateTime(activity.createdTime);
  const isNew = !activity.isViewed;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.PRIMARY]}
            tintColor={COLORS.PRIMARY}
          />
        }
      >
        {/* Header Card */}
        <View style={[styles.headerCard, isNew && styles.newHeaderCard]}>
          <View style={styles.headerTop}>
            <View style={styles.activityIconContainer}>
              <MaterialIcons
                name={activity.activityType.name.includes('Bài tập') ? 'assignment' : 'child-care'}
                size={32}
                color={COLORS.PRIMARY}
              />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.activityTypeName}>{activity.activityType.name}</Text>
              {isNew && (
                <View style={styles.newBadge}>
                  <MaterialIcons name="fiber-new" size={16} color={COLORS.SURFACE} />
                  <Text style={styles.newBadgeText}>Mới</Text>
                </View>
              )}
            </View>
          </View>

          {/* Activity Meta Info */}
          <View style={styles.metaContainer}>
            <View style={styles.metaRow}>
              <MaterialIcons name="person" size={18} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.metaText}>Nhân viên: {activity.staffName}</Text>
            </View>
            <View style={styles.metaRow}>
              <MaterialIcons name="access-time" size={18} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.metaText}>
                {timeInfo.date} • {timeInfo.time}
              </Text>
            </View>
            {activity.isViewed && activity.viewedTime && (
              <View style={styles.metaRow}>
                <MaterialIcons name="visibility" size={18} color={COLORS.SUCCESS} />
                <Text style={[styles.metaText, { color: COLORS.SUCCESS }]}>
                  Đã xem: {formatDateTime(activity.viewedTime).full}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Activity Type Description */}
        {activity.activityType.description && (
          <View style={styles.descriptionCard}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="info-outline" size={20} color={COLORS.PRIMARY} />
              <Text style={styles.sectionTitle}>Mô tả loại hoạt động</Text>
            </View>
            <Text style={styles.descriptionText}>{activity.activityType.description}</Text>
          </View>
        )}

        {/* Activity Note */}
        {activity.note && (
          <View style={styles.noteCard}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="note" size={20} color={COLORS.PRIMARY} />
              <Text style={styles.sectionTitle}>Ghi chú</Text>
            </View>
            <Text style={styles.noteText}>{activity.note}</Text>
          </View>
        )}

        {/* Activity Image */}
        {activity.imageUrl && (
          <View style={styles.imageCard}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="image" size={20} color={COLORS.PRIMARY} />
              <Text style={styles.sectionTitle}>Hình ảnh</Text>
            </View>
            <TouchableOpacity
              style={styles.imageContainer}
              onPress={() => handleImagePress(activity.imageUrl)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: activity.imageUrl }}
                style={styles.activityImage}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <MaterialIcons name="zoom-in" size={24} color={COLORS.SURFACE} />
                <Text style={styles.imageOverlayText}>Chạm để xem ảnh lớn</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading indicator khi đang đánh dấu */}
        {markingViewed && (
          <View style={styles.markingIndicator}>
            <ActivityIndicator size="small" color={COLORS.PRIMARY} />
            <Text style={styles.markingText}>Đang đánh dấu đã đọc...</Text>
          </View>
        )}

        {/* Action Buttons - Chỉ hiện cho staff */}
        {isStaff && activity && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={handleEdit}
              disabled={deleting}
              activeOpacity={0.7}
            >
              <MaterialIcons name="edit" size={20} color={COLORS.SURFACE} />
              <Text style={styles.actionButtonText}>Sửa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDelete}
              disabled={deleting}
              activeOpacity={0.7}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={COLORS.SURFACE} />
              ) : (
                <>
                  <MaterialIcons name="delete" size={20} color={COLORS.SURFACE} />
                  <Text style={styles.actionButtonText}>Xóa</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Image Modal */}
      <Modal
        visible={selectedImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <View style={styles.imageModalContainer}>
          <TouchableOpacity style={styles.imageModalClose} onPress={closeImageModal}>
            <MaterialIcons name="close" size={28} color={COLORS.SURFACE} />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
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
    textAlign: 'center',
    color: COLORS.TEXT_SECONDARY,
  },
  retryButton: {
    marginTop: SPACING.MD,
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    borderRadius: 12,
  },
  retryButtonText: {
    color: COLORS.SURFACE,
    fontWeight: '600',
    fontSize: FONTS.SIZES.MD,
  },
  content: {
    padding: SPACING.MD,
  },
  headerCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.LG,
    marginBottom: SPACING.MD,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  newHeaderCard: {
    borderWidth: 2,
    borderColor: COLORS.PRIMARY + '40',
    backgroundColor: COLORS.PRIMARY_50,
  },
  headerTop: {
    flexDirection: 'row',
    marginBottom: SPACING.MD,
  },
  activityIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.PRIMARY + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityTypeName: {
    fontSize: FONTS.SIZES.XL,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 12,
    gap: SPACING.XS,
  },
  newBadgeText: {
    color: COLORS.SURFACE,
    fontSize: FONTS.SIZES.XS,
    fontWeight: '600',
  },
  metaContainer: {
    gap: SPACING.SM,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  },
  metaText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  descriptionCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.LG,
    marginBottom: SPACING.MD,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  noteCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.LG,
    marginBottom: SPACING.MD,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  imageCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.LG,
    marginBottom: SPACING.MD,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
    gap: SPACING.SM,
  },
  sectionTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  descriptionText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 24,
  },
  noteText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 24,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  activityImage: {
    width: '100%',
    height: 300,
    backgroundColor: COLORS.BORDER,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: SPACING.SM,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlayText: {
    color: COLORS.SURFACE,
    fontSize: FONTS.SIZES.SM,
    marginLeft: SPACING.XS,
    fontWeight: '600',
  },
  markingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.MD,
    padding: SPACING.SM,
    backgroundColor: COLORS.INFO_BG,
    borderRadius: 8,
  },
  markingText: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.XS,
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: SPACING.SM,
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: '80%',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: SPACING.MD,
    marginTop: SPACING.MD,
    marginBottom: SPACING.LG,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    borderRadius: 12,
    gap: SPACING.SM,
    elevation: 2,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  editButton: {
    backgroundColor: COLORS.ACCENT,
  },
  deleteButton: {
    backgroundColor: COLORS.ERROR,
  },
  actionButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
});

export default ActivityDetailScreen;

