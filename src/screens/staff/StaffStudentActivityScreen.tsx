import React, { useCallback, useEffect, useState } from 'react';
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

import activityService, { StaffActivityResponse } from '../../services/activityService';
import { RootStackParamList } from '../../types';
import { ActivityResponse } from '../../types/api';
import { COLORS } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';

type StaffStudentActivityRouteProp = RouteProp<RootStackParamList, 'StaffStudentActivities'>;

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

const PAGE_SIZE = 20;
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
    return { date: dateStr, time: timeStr };
  } catch (e) {
    return { date: dateString, time: '' };
  }
};

const StaffStudentActivityScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const {
    params: { studentId, studentName, studentSlotId },
  } = useRoute<StaffStudentActivityRouteProp>();

  const [activities, setActivities] = useState<StaffActivityResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    pageIndex: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
  } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  const { user } = useAuth();

  const fetchActivities = useCallback(
    async ({ page = 1, append = false, silent = false }: { page?: number; append?: boolean; silent?: boolean } = {}) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setError(null);
        if (!silent) {
          setLoading(true);
        }
      }

      try {
        if (!studentId) {
          setError('Không tìm thấy ID học sinh');
          return;
        }

        console.log('Fetching activities for studentId:', studentId, 'studentSlotId:', studentSlotId);

        // Sử dụng API getStudentActivities để lấy activities của học sinh
        const response = await activityService.getStudentActivities({
          studentId: studentId,
          pageIndex: page,
          pageSize: PAGE_SIZE,
          // Không truyền studentSlotId để lấy tất cả activities của học sinh, không chỉ của một slot
        });

        // API đã filter theo studentId rồi, không cần filter lại
        const filteredItems: StaffActivityResponse[] = response.items || [];

        if (append) {
          setActivities((prev) => {
            // Tránh duplicate
            const existingIds = new Set(prev.map(a => a.id));
            const newItems = filteredItems.filter(a => !existingIds.has(a.id));
            return [...prev, ...newItems];
          });
        } else {
          setActivities(filteredItems);
        }

        // Tiếp tục fetch nếu API còn trang
        const hasMore = response.hasNextPage || false;

        // Cập nhật pagination từ response của API
        setPagination({
          pageIndex: response.pageIndex || page,
          totalPages: response.totalPages || 1,
          totalCount: response.totalCount || filteredItems.length, // Dùng totalCount từ API
          hasNextPage: hasMore,
        });
      } catch (err: any) {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          'Không thể tải danh sách hoạt động. Vui lòng thử lại.';
        if (!append) {
          setError(message);
        }
        console.error('Error fetching activities:', err);
      } finally {
        if (append) {
          setLoadingMore(false);
        } else {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [studentId]
  );

  useEffect(() => {
    fetchActivities({ page: 1 });
  }, [fetchActivities]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchActivities({ page: 1, silent: true });
  }, [fetchActivities]);

  const handleLoadMore = useCallback(() => {
    if (!pagination?.hasNextPage || loadingMore) {
      return;
    }
    const nextPage = (pagination.pageIndex ?? 1) + 1;
    fetchActivities({ page: nextPage, append: true });
  }, [fetchActivities, pagination, loadingMore]);

  const handleImagePress = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const handleActivityPress = (activity: StaffActivityResponse) => {
    navigation.navigate('ActivityDetail', { activityId: activity.id });
  };

  const handleEdit = (activity: StaffActivityResponse) => {
    navigation.navigate('EditActivity', { activityId: activity.id });
  };

  const handleDelete = (activity: StaffActivityResponse) => {
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
              setDeleting((prev) => new Set(prev).add(activity.id));
              await activityService.deleteActivity(activity.id);
              
              // Xóa activity khỏi danh sách
              setActivities((prev) => prev.filter((item) => item.id !== activity.id));
              
              // Cập nhật pagination
              if (pagination) {
                setPagination({
                  ...pagination,
                  totalCount: Math.max(0, pagination.totalCount - 1),
                });
              }
              
              Alert.alert('Thành công', 'Đã xóa hoạt động thành công!');
            } catch (err: any) {
              const message =
                err?.response?.data?.message ||
                err?.message ||
                'Không thể xóa hoạt động. Vui lòng thử lại.';
              Alert.alert('Lỗi', message);
            } finally {
              setDeleting((prev) => {
                const newSet = new Set(prev);
                newSet.delete(activity.id);
                return newSet;
              });
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.PRIMARY]} tintColor={COLORS.PRIMARY} />}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Hoạt động của {studentName}</Text>
            <Text style={styles.headerSubtitle}>
              Tổng số hoạt động: {pagination?.totalCount ?? activities.length}
            </Text>
          </View>
        </View>

        {loading && activities.length === 0 ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            <Text style={styles.stateText}>Đang tải danh sách hoạt động...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <MaterialIcons name="error-outline" size={42} color={COLORS.ERROR} />
            <Text style={[styles.stateText, { color: COLORS.ERROR }]}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchActivities({ page: 1 })}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : activities.length === 0 ? (
          <View style={styles.stateCard}>
            <MaterialIcons name="event-busy" size={40} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.stateText}>Chưa có hoạt động nào</Text>
          </View>
        ) : (
          <>
            {activities.map((activity) => {
              const timeInfo = formatDateTime(activity.createdTime);
              const isNew = !activity.isViewed;
              const isDeleting = deleting.has(activity.id);

              return (
                <View
                  key={activity.id}
                  style={[styles.activityCard, isNew && styles.newActivityCard]}
                >
                  {/* Activity Header */}
                  <View style={styles.activityHeader}>
                    <TouchableOpacity
                      style={styles.activityContentWrapper}
                      onPress={() => handleActivityPress(activity)}
                      activeOpacity={0.7}
                      disabled={isDeleting}
                    >
                      <View style={styles.activityIconContainer}>
                        <MaterialIcons
                          name={activity.activityType.name.includes('Bài tập') ? 'assignment' : 'child-care'}
                          size={24}
                          color={COLORS.PRIMARY}
                        />
                      </View>
                      <View style={styles.activityHeaderInfo}>
                        <Text style={styles.activityTypeName}>{activity.activityType.name}</Text>
                        <View style={styles.activityMetaRow}>
                          <MaterialIcons name="person" size={14} color={COLORS.TEXT_SECONDARY} />
                          <Text style={styles.activityMetaText}>{activity.staffName}</Text>
                        </View>
                        <View style={styles.activityMetaRow}>
                          <MaterialIcons name="access-time" size={14} color={COLORS.TEXT_SECONDARY} />
                          <Text style={styles.activityMetaText}>
                            {timeInfo.date} • {timeInfo.time}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                    <View style={styles.activityHeaderRight}>
                      {isNew && (
                        <View style={styles.newBadge}>
                          <MaterialIcons name="fiber-new" size={16} color={COLORS.SURFACE} />
                        </View>
                      )}
                      {/* Action Buttons - Chỉ hiện cho staff */}
                      <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.editButton]}
                          onPress={() => handleEdit(activity)}
                          disabled={isDeleting}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons name="edit" size={16} color={COLORS.SURFACE} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.deleteButton]}
                          onPress={() => handleDelete(activity)}
                          disabled={isDeleting}
                          activeOpacity={0.7}
                        >
                          {isDeleting ? (
                            <ActivityIndicator size="small" color={COLORS.SURFACE} />
                          ) : (
                            <MaterialIcons name="delete" size={16} color={COLORS.SURFACE} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Activity Description */}
                  {activity.activityType.description && (
                    <TouchableOpacity
                      onPress={() => handleActivityPress(activity)}
                      activeOpacity={0.7}
                      disabled={isDeleting}
                    >
                      <View style={styles.descriptionBox}>
                        <Text style={styles.descriptionText}>{activity.activityType.description}</Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* Activity Note */}
                  {activity.note && (
                    <TouchableOpacity
                      onPress={() => handleActivityPress(activity)}
                      activeOpacity={0.7}
                      disabled={isDeleting}
                    >
                      <View style={styles.noteBox}>
                        <MaterialIcons name="note" size={16} color={COLORS.PRIMARY} />
                        <Text style={styles.noteText}>{activity.note}</Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* Activity Image */}
                  {activity.imageUrl && (
                    <TouchableOpacity
                      style={styles.imageContainer}
                      onPress={() => activity.imageUrl && handleImagePress(activity.imageUrl)}
                      activeOpacity={0.9}
                      disabled={isDeleting}
                    >
                      <Image source={{ uri: activity.imageUrl }} style={styles.activityImage} resizeMode="cover" />
                      <View style={styles.imageOverlay}>
                        <MaterialIcons name="zoom-in" size={24} color={COLORS.SURFACE} />
                        <Text style={styles.imageOverlayText}>Chạm để xem ảnh</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {/* Load More */}
            {pagination?.hasNextPage && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                ) : (
                  <>
                    <MaterialIcons name="expand-more" size={24} color={COLORS.PRIMARY} />
                    <Text style={styles.loadMoreText}>Xem thêm hoạt động</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
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
  content: {
    padding: SPACING.MD,
  },
  header: {
    marginBottom: SPACING.LG,
  },
  headerTitle: {
    fontSize: FONTS.SIZES.XXL,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  headerSubtitle: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS,
  },
  stateCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.LG,
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  stateText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.SM,
  },
  retryButton: {
    marginTop: SPACING.SM,
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    borderRadius: 12,
  },
  retryButtonText: {
    color: COLORS.SURFACE,
    fontWeight: '600',
    fontSize: FONTS.SIZES.SM,
  },
  activityCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  newActivityCard: {
    borderWidth: 2,
    borderColor: COLORS.PRIMARY + '40',
    backgroundColor: COLORS.PRIMARY_50,
  },
  activityHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.MD,
    alignItems: 'flex-start',
  },
  activityContentWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  activityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.PRIMARY + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  activityHeaderInfo: {
    flex: 1,
  },
  activityTypeName: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  activityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.XS,
  },
  activityMetaText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.XS,
  },
  activityHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
  },
  newBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: SPACING.XS,
    marginLeft: SPACING.SM,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: COLORS.SECONDARY,
  },
  deleteButton: {
    backgroundColor: COLORS.ERROR,
  },
  descriptionBox: {
    backgroundColor: COLORS.INFO_BG,
    padding: SPACING.MD,
    borderRadius: 12,
    marginBottom: SPACING.MD,
  },
  descriptionText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 20,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.SECONDARY_50,
    padding: SPACING.MD,
    borderRadius: 12,
    marginBottom: SPACING.MD,
  },
  noteText: {
    flex: 1,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
    lineHeight: 20,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: SPACING.SM,
  },
  activityImage: {
    width: '100%',
    height: 250,
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
  loadMoreButton: {
    marginTop: SPACING.SM,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
    borderRadius: 16,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.SURFACE,
  },
  loadMoreText: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
    fontSize: FONTS.SIZES.MD,
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
});

export default StaffStudentActivityScreen;

