import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Image,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONTS } from '../../constants';
import activityService, { StaffActivityResponse } from '../../services/activityService';
import studentSlotService from '../../services/studentSlotService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ActivitiesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [activities, setActivities] = useState<StaffActivityResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<StaffActivityResponse | null>(null);

  const fetchActivities = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await activityService.getStaffActivities();
      
      // Enrich activities with student information if not provided
      const enrichedActivities = await Promise.all(
        data.map(async (activity) => {
          // If studentName is already provided, use it
          if (activity.studentName) {
            return activity;
          }

          // Otherwise, fetch from studentSlotId
          try {
            const studentSlot = await studentSlotService.getStudentSlotById(activity.studentSlotId);
            if (studentSlot) {
              return {
                ...activity,
                studentId: studentSlot.studentId,
                studentName: studentSlot.studentName,
              };
            }
          } catch (error) {
            // If fetching fails, continue without student info
            console.warn('Failed to fetch student info for activity:', activity.id);
          }

          return activity;
        })
      );

      setActivities(enrichedActivities);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Không thể tải danh sách hoạt động.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Refresh when coming back from edit screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchActivities(true);
    });
    return unsubscribe;
  }, [navigation, fetchActivities]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchActivities(true);
  }, [fetchActivities]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatShortDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        const hours = Math.floor(diffTime / (1000 * 60 * 60));
        if (hours === 0) {
          const minutes = Math.floor(diffTime / (1000 * 60));
          return minutes <= 1 ? 'Vừa xong' : `${minutes} phút trước`;
        }
        return hours === 1 ? '1 giờ trước' : `${hours} giờ trước`;
      } else if (diffDays === 1) {
        return 'Hôm qua';
      } else if (diffDays < 7) {
        return `${diffDays} ngày trước`;
      } else {
        return date.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
        });
      }
    } catch {
      return dateString;
    }
  };

  const handleActivityPress = (activity: StaffActivityResponse) => {
    setSelectedActivity(activity);
    setDetailModalVisible(true);
  };

  const handleCloseDetailModal = () => {
    setDetailModalVisible(false);
    setSelectedActivity(null);
  };

  const handleViewImage = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    setImageViewerVisible(true);
  };

  const handleCloseImageViewer = () => {
    setImageViewerVisible(false);
    setSelectedImageUrl(null);
  };

  const handleEditActivity = (activityId: string) => {
    handleCloseDetailModal();
    navigation.navigate('EditActivity', { activityId });
  };

  const handleDeleteActivity = (activity: StaffActivityResponse) => {
    handleCloseDetailModal();
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
          onPress: () => confirmDeleteActivity(activity.id),
        },
      ],
      { cancelable: true }
    );
  };

  const confirmDeleteActivity = async (activityId: string) => {
    try {
      setDeletingActivityId(activityId);
      await activityService.deleteActivity(activityId);
      Alert.alert('Thành công', 'Đã xóa hoạt động thành công!');
      fetchActivities(true);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Không thể xóa hoạt động. Vui lòng thử lại.';
      Alert.alert('Lỗi', message);
    } finally {
      setDeletingActivityId(null);
    }
  };

  if (loading && activities.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Đang tải hoạt động...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Info */}
      <View style={styles.topHeader}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Hoạt Động</Text>
            <Text style={styles.headerSubtitle}>
              {activities.length} {activities.length === 1 ? 'hoạt động' : 'hoạt động'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.PRIMARY]}
            tintColor={COLORS.PRIMARY}
          />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color={COLORS.ERROR} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchActivities()}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : activities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="event-note" size={64} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.emptyText}>Chưa có hoạt động nào</Text>
            <Text style={styles.emptySubtext}>
              Tạo hoạt động mới từ lịch làm việc
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {activities.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={[
                  styles.activityCard,
                  !activity.isViewed && styles.activityCardUnread,
                ]}
                onPress={() => handleActivityPress(activity)}
                activeOpacity={0.7}
              >
                <View style={styles.cardContent}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardLeftSection}>
                      <View
                        style={[
                          styles.cardIconContainer,
                          !activity.isViewed && styles.cardIconContainerUnread,
                        ]}
                      >
                        <MaterialIcons
                          name="event-note"
                          size={20}
                          color={activity.isViewed ? COLORS.PRIMARY : COLORS.SURFACE}
                        />
                      </View>
                      <View style={styles.cardTextSection}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {activity.activityType?.name || 'Hoạt động'}
                        </Text>
                        <Text style={styles.cardSubtitle} numberOfLines={1}>
                          {formatShortDate(activity.createdTime || activity.createdDate)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardRightSection}>
                      {!activity.isViewed && (
                        <View style={styles.newBadge}>
                          <View style={styles.newBadgeDot} />
                        </View>
                      )}
                      <MaterialIcons
                        name="chevron-right"
                        size={20}
                        color={COLORS.TEXT_SECONDARY}
                      />
                    </View>
                  </View>

                  {/* Card Body - Note Preview */}
                  {activity.note && (
                    <Text style={styles.cardNote} numberOfLines={2}>
                      {activity.note}
                    </Text>
                  )}

                  {/* Card Footer */}
                  <View style={styles.cardFooter}>
                    {activity.studentName && (
                      <View style={styles.cardFooterItem}>
                        <MaterialIcons name="child-care" size={14} color={COLORS.ACCENT} />
                        <Text style={[styles.cardFooterText, styles.studentNameText]} numberOfLines={1}>
                          {activity.studentName}
                        </Text>
                      </View>
                    )}
                    <View style={styles.cardFooterItem}>
                      <MaterialIcons name="person" size={14} color={COLORS.TEXT_SECONDARY} />
                      <Text style={styles.cardFooterText} numberOfLines={1}>
                        {activity.staffName}
                      </Text>
                    </View>
                    {activity.imageUrl && (
                      <View style={styles.cardFooterItem}>
                        <MaterialIcons name="image" size={14} color={COLORS.PRIMARY} />
                        <Text style={[styles.cardFooterText, styles.hasImageText]}>
                          Có ảnh
                        </Text>
                      </View>
                    )}
                    {activity.isViewed && (
                      <View style={styles.cardFooterItem}>
                        <MaterialIcons name="check-circle" size={14} color={COLORS.SUCCESS} />
                        <Text style={[styles.cardFooterText, styles.viewedText]}>
                          Đã xem
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Activity Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseDetailModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết hoạt động</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={handleCloseDetailModal}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            {selectedActivity && (
              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
              >
                {/* Activity Type */}
                <View style={styles.detailSection}>
                  <View style={styles.detailHeader}>
                    <MaterialIcons name="category" size={20} color={COLORS.PRIMARY} />
                    <Text style={styles.detailSectionTitle}>Loại hoạt động</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {selectedActivity.activityType?.name || 'Chưa có'}
                  </Text>
                  {selectedActivity.activityType?.description && (
                    <Text style={styles.detailDescription}>
                      {selectedActivity.activityType.description}
                    </Text>
                  )}
                </View>

                {/* Note */}
                {selectedActivity.note && (
                  <View style={styles.detailSection}>
                    <View style={styles.detailHeader}>
                      <MaterialIcons name="note" size={20} color={COLORS.PRIMARY} />
                      <Text style={styles.detailSectionTitle}>Ghi chú</Text>
                    </View>
                    <Text style={styles.detailValue}>{selectedActivity.note}</Text>
                  </View>
                )}

                {/* Image */}
                {selectedActivity.imageUrl && (
                  <View style={styles.detailSection}>
                    <View style={styles.detailHeader}>
                      <MaterialIcons name="image" size={20} color={COLORS.PRIMARY} />
                      <Text style={styles.detailSectionTitle}>Ảnh</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.detailImageContainer}
                      onPress={() => handleViewImage(selectedActivity.imageUrl!)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: selectedActivity.imageUrl }}
                        style={styles.detailImage}
                        resizeMode="cover"
                      />
                      <View style={styles.detailImageOverlay}>
                        <MaterialIcons name="zoom-in" size={24} color={COLORS.SURFACE} />
                        <Text style={styles.detailImageOverlayText}>Chạm để xem ảnh</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Metadata */}
                <View style={styles.detailSection}>
                  <View style={styles.detailHeader}>
                    <MaterialIcons name="info" size={20} color={COLORS.PRIMARY} />
                    <Text style={styles.detailSectionTitle}>Thông tin</Text>
                  </View>
                  {selectedActivity.studentName && (
                    <View style={styles.detailMetaRow}>
                      <MaterialIcons name="child-care" size={16} color={COLORS.ACCENT} />
                      <Text style={[styles.detailMetaText, styles.studentNameText]}>
                        Học sinh: {selectedActivity.studentName}
                      </Text>
                    </View>
                  )}
                  <View style={styles.detailMetaRow}>
                    <MaterialIcons name="person" size={16} color={COLORS.TEXT_SECONDARY} />
                    <Text style={styles.detailMetaText}>
                      Tạo bởi: {selectedActivity.staffName}
                    </Text>
                  </View>
                  <View style={styles.detailMetaRow}>
                    <MaterialIcons name="access-time" size={16} color={COLORS.TEXT_SECONDARY} />
                    <Text style={styles.detailMetaText}>
                      Tạo lúc: {formatDate(selectedActivity.createdTime || selectedActivity.createdDate)}
                    </Text>
                  </View>
                  {selectedActivity.isViewed && selectedActivity.viewedTime && (
                    <View style={styles.detailMetaRow}>
                      <MaterialIcons name="check-circle" size={16} color={COLORS.SUCCESS} />
                      <Text style={[styles.detailMetaText, styles.viewedText]}>
                        Đã xem: {formatDate(selectedActivity.viewedTime)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.editButton]}
                    onPress={() => handleEditActivity(selectedActivity.id)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="edit" size={20} color={COLORS.PRIMARY} />
                    <Text style={styles.editButtonText}>Chỉnh sửa</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.deleteButton]}
                    onPress={() => handleDeleteActivity(selectedActivity)}
                    activeOpacity={0.7}
                    disabled={deletingActivityId === selectedActivity.id}
                  >
                    {deletingActivityId === selectedActivity.id ? (
                      <ActivityIndicator size="small" color={COLORS.SURFACE} />
                    ) : (
                      <>
                        <MaterialIcons name="delete" size={20} color={COLORS.SURFACE} />
                        <Text style={styles.deleteButtonText}>Xóa</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        visible={imageViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseImageViewer}
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity
            style={styles.imageViewerCloseButton}
            onPress={handleCloseImageViewer}
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={28} color={COLORS.SURFACE} />
          </TouchableOpacity>
          {selectedImageUrl && (
            <Image
              source={{ uri: selectedImageUrl }}
              style={styles.imageViewerImage}
              resizeMode="contain"
            />
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
    paddingBottom: SPACING.XL,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  topHeader: {
    backgroundColor: COLORS.SURFACE,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FONTS.SIZES.XL,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  headerSubtitle: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  errorContainer: {
    alignItems: 'center',
    padding: SPACING.XL,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  errorText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.ERROR,
    textAlign: 'center',
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
    fontSize: FONTS.SIZES.SM,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: SPACING.XL * 2,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderStyle: 'dashed',
  },
  emptyText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  emptySubtext: {
    marginTop: SPACING.XS,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  listContainer: {
    gap: SPACING.SM,
  },
  activityCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activityCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY_50,
  },
  cardContent: {
    gap: SPACING.SM,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.SM,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.INFO_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconContainerUnread: {
    backgroundColor: COLORS.PRIMARY,
  },
  cardTextSection: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  cardSubtitle: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
  cardRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
  },
  newBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.PRIMARY,
  },
  newBadgeDot: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    backgroundColor: COLORS.PRIMARY,
  },
  cardNote: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 20,
    marginTop: SPACING.XS,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.MD,
    marginTop: SPACING.XS,
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  cardFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS / 2,
  },
  cardFooterText: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
  hasImageText: {
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  studentNameText: {
    color: COLORS.ACCENT,
    fontWeight: '600',
  },
  viewedText: {
    color: COLORS.SUCCESS,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? SPACING.XL : SPACING.MD,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  modalTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  modalCloseButton: {
    padding: SPACING.XS,
  },
  modalBody: {
    maxHeight: 600,
    padding: SPACING.MD,
  },
  detailSection: {
    marginBottom: SPACING.LG,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
    marginBottom: SPACING.SM,
  },
  detailSectionTitle: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  detailValue: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 22,
  },
  detailDescription: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    fontStyle: 'italic',
    marginTop: SPACING.XS,
  },
  detailImageContainer: {
    marginTop: SPACING.SM,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    height: 200,
    backgroundColor: COLORS.BORDER,
  },
  detailImage: {
    width: '100%',
    height: '100%',
  },
  detailImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: SPACING.MD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailImageOverlayText: {
    color: COLORS.SURFACE,
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    marginTop: SPACING.XS,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
    marginTop: SPACING.SM,
  },
  detailMetaText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.SM,
    marginTop: SPACING.MD,
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  modalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.MD,
    borderRadius: 12,
    gap: SPACING.SM,
  },
  editButton: {
    backgroundColor: COLORS.INFO_BG,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  editButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  deleteButton: {
    backgroundColor: COLORS.ERROR,
  },
  deleteButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: SPACING.MD,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: SPACING.SM,
  },
  imageViewerImage: {
    width: '100%',
    height: '80%',
  },
});

export default ActivitiesScreen;
