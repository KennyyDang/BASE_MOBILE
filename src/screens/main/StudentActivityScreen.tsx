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

import activityService from '../../services/activityService';
import { RootStackParamList } from '../../types';
import { ActivityResponse } from '../../types/api';
import { COLORS } from '../../constants';

type StudentActivityRouteProp = RouteProp<RootStackParamList, 'StudentActivities'>;

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

const formatFullDateTime = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return dateString;
  }
};

const StudentActivityScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const {
    params: { studentId, studentName, studentSlotId, slotDate, slotTimeframe },
  } = useRoute<StudentActivityRouteProp>();

  const [activities, setActivities] = useState<ActivityResponse[]>([]);
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
  const [markingViewed, setMarkingViewed] = useState<Set<string>>(new Set());

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
        const response = await activityService.getMyChildrenActivities({
          studentId,
          studentSlotId,
          pageIndex: page,
          pageSize: PAGE_SIZE,
        });

        const items = response?.items ?? [];

        setActivities((prev) => (append ? [...prev, ...items] : items));
        setPagination({
          pageIndex: response.pageIndex,
          totalPages: response.totalPages,
          totalCount: response.totalCount,
          hasNextPage: response.hasNextPage,
        });
      } catch (err: any) {
        const message =
          err?.message ||
          err?.response?.data?.message ||
          'Không thể tải danh sách hoạt động. Vui lòng thử lại.';
        setError(message);

        if (!append) {
          setActivities([]);
          setPagination(null);
        }
      } finally {
        if (append) {
          setLoadingMore(false);
        } else {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [studentId, studentSlotId]
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

  const handleMarkAsViewed = async (activity: ActivityResponse) => {
    // Nếu đã đọc rồi hoặc đang xử lý, không làm gì
    if (activity.isViewed || markingViewed.has(activity.id)) {
      return;
    }

    // Đánh dấu đang xử lý
    setMarkingViewed((prev) => new Set(prev).add(activity.id));

    try {
      const updatedActivity = await activityService.markActivityAsViewed(activity.id);
      
      // Cập nhật activity trong danh sách
      setActivities((prev) =>
        prev.map((item) =>
          item.id === activity.id
            ? {
                ...item,
                isViewed: updatedActivity.isViewed,
                viewedTime: updatedActivity.viewedTime,
              }
            : item
        )
      );
    } catch (err: any) {
      // Nếu lỗi, không hiển thị lỗi cho user (silent fail)
      console.warn('Failed to mark activity as viewed:', err);
    } finally {
      // Xóa khỏi set đang xử lý
      setMarkingViewed((prev) => {
        const newSet = new Set(prev);
        newSet.delete(activity.id);
        return newSet;
      });
    }
  };

  const handleActivityPress = (activity: ActivityResponse) => {
    // Khi tap vào activity card, đánh dấu là đã đọc và navigate đến detail
    handleMarkAsViewed(activity);
    navigation.navigate('ActivityDetail', { activityId: activity.id });
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
            {slotDate && (
              <Text style={styles.headerSubtitle}>
                {slotDate} {slotTimeframe ? `• ${slotTimeframe}` : ''}
              </Text>
            )}
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
            <Text style={[styles.stateText, { fontSize: FONTS.SIZES.SM, marginTop: SPACING.XS }]}>
              Nhân viên sẽ cập nhật hoạt động của con bạn tại đây
            </Text>
          </View>
        ) : (
          <>
            {activities.map((activity) => {
              const timeInfo = formatDateTime(activity.createdTime);
              const isNew = !activity.isViewed;
              const isMarking = markingViewed.has(activity.id);

              return (
                <TouchableOpacity
                  key={activity.id}
                  style={[styles.activityCard, isNew && styles.newActivityCard]}
                  onPress={() => handleActivityPress(activity)}
                  activeOpacity={0.7}
                >
                  {/* Activity Header */}
                  <View style={styles.activityHeader}>
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
                    {isNew && (
                      <View style={styles.newBadge}>
                        <MaterialIcons name="fiber-new" size={16} color={COLORS.SURFACE} />
                      </View>
                    )}
                  </View>

                  {/* Activity Description */}
                  {activity.activityType.description && (
                    <View style={styles.descriptionBox}>
                      <Text style={styles.descriptionText}>{activity.activityType.description}</Text>
                    </View>
                  )}

                  {/* Activity Note */}
                  {activity.note && (
                    <View style={styles.noteBox}>
                      <MaterialIcons name="note" size={16} color={COLORS.PRIMARY} />
                      <Text style={styles.noteText}>{activity.note}</Text>
                    </View>
                  )}

                  {/* Activity Image */}
                  {activity.imageUrl && (
                    <TouchableOpacity
                      style={styles.imageContainer}
                      onPress={() => {
                        handleImagePress(activity.imageUrl);
                        handleMarkAsViewed(activity);
                      }}
                      activeOpacity={0.9}
                    >
                      <Image source={{ uri: activity.imageUrl }} style={styles.activityImage} resizeMode="cover" />
                      <View style={styles.imageOverlay}>
                        <MaterialIcons name="zoom-in" size={24} color={COLORS.SURFACE} />
                        <Text style={styles.imageOverlayText}>Chạm để xem ảnh</Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* Loading indicator khi đang đánh dấu */}
                  {isMarking && (
                    <View style={styles.markingIndicator}>
                      <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                      <Text style={styles.markingText}>Đang đánh dấu đã đọc...</Text>
                    </View>
                  )}
                </TouchableOpacity>
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
      <Modal visible={selectedImage !== null} transparent={true} animationType="fade" onRequestClose={closeImageModal}>
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
  newBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
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
});

export default StudentActivityScreen;

