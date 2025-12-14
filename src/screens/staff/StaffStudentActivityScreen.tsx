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

import activityService, { StaffActivityResponse, PagedActivitiesResponse } from '../../services/activityService';
import studentSlotService from '../../services/studentSlotService';
import { RootStackParamList } from '../../types';
import { ActivityResponse, StudentSlotResponse } from '../../types/api';
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
  const route = useRoute<StaffStudentActivityRouteProp>();
  const {
    params: { studentId, studentName, studentSlotId, date },
  } = route;


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
  const [slotsMap, setSlotsMap] = useState<Map<string, StudentSlotResponse>>(new Map());
  const [servicesLoading, setServicesLoading] = useState<Set<string>>(new Set());

  const { user } = useAuth();

  // Tính toán FromDate và ToDate từ date param
  // Format: YYYY-MM-DD (chỉ date, không có time) như API yêu cầu
  const getDateRange = useCallback((dateString?: string) => {
    if (!dateString) {
      return { FromDate: undefined, ToDate: undefined };
    }

    try {
      const selectedDate = new Date(dateString);
      
      // Kiểm tra xem date có hợp lệ không
      if (isNaN(selectedDate.getTime())) {
        return { FromDate: undefined, ToDate: undefined };
      }

      // Format theo YYYY-MM-DD (chỉ date, không có time) như API yêu cầu
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateOnly = `${year}-${month}-${day}`;

      return {
        FromDate: dateOnly,
        ToDate: dateOnly,
      };
    } catch (error) {
      return { FromDate: undefined, ToDate: undefined };
    }
  }, []);

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

        // Tính toán date range nếu có date param
        const dateRange = getDateRange(date);

        // Dùng API /api/Activity/student-activities với cả studentId, studentSlotId và FromDate/ToDate
        // API này hỗ trợ filter theo studentId, studentSlotId và date range
        const response = await activityService.getStudentActivities({
          studentId: studentId,
          pageIndex: page,
          pageSize: PAGE_SIZE,
          studentSlotId: studentSlotId, // Truyền studentSlotId nếu có
          // Convert date từ YYYY-MM-DD sang ISO string với time
          FromDate: dateRange.FromDate ? new Date(dateRange.FromDate + 'T00:00:00').toISOString() : undefined,
          ToDate: dateRange.ToDate ? new Date(dateRange.ToDate + 'T23:59:59').toISOString() : undefined,
        });

        // API đã filter theo studentId rồi, không cần filter lại
        let filteredItems: StaffActivityResponse[] = response.items || [];

        // Fetch studentSlots để lấy parentNote và map vào activities
        try {
          const studentSlotsResponse = await studentSlotService.getStudentSlots({
            studentId: studentId,
            pageIndex: 1,
            pageSize: 100, // Lấy nhiều để cover tất cả slots
          });

          // Tạo map: studentSlotId -> parentNote
          const parentNoteMap = new Map<string, string>();
          studentSlotsResponse.items?.forEach((slot) => {
            if (slot.id && slot.parentNote) {
              parentNoteMap.set(slot.id, slot.parentNote);
            }
          });

          // Nếu có nhiều trang, fetch thêm
          let currentPage = 1;
          while (studentSlotsResponse.hasNextPage && currentPage < 10) {
            currentPage++;
            const nextPageResponse = await studentSlotService.getStudentSlots({
              studentId: studentId,
              pageIndex: currentPage,
              pageSize: 100,
            });
            nextPageResponse.items?.forEach((slot) => {
              if (slot.id && slot.parentNote) {
                parentNoteMap.set(slot.id, slot.parentNote);
              }
            });
            if (!nextPageResponse.hasNextPage) break;
          }

          // Map parentNote vào activities
          filteredItems = filteredItems.map((activity) => {
            const parentNote = activity.studentSlotId 
              ? parentNoteMap.get(activity.studentSlotId) 
              : undefined;
            return {
              ...activity,
              parentNote: parentNote || activity.parentNote, // Giữ parentNote từ API nếu có, nếu không thì dùng từ map
            };
          });
        } catch (slotError) {
          // Nếu không fetch được studentSlots, vẫn tiếp tục với activities (không có parentNote)
          console.warn('Could not fetch student slots for parentNote:', slotError);
        }

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
    [studentId, studentSlotId, date, getDateRange]
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

  const fetchSlotForActivity = useCallback(async (activityId: string, studentSlotId: string, studentId?: string) => {
    if (!studentSlotId) {
      return;
    }

    setServicesLoading((prev) => new Set(prev).add(activityId));
    try {
      // Fetch slot details để lấy services trực tiếp từ API
      const slotData = await studentSlotService.getStudentSlotById(studentSlotId, studentId);
      if (slotData) {
        setSlotsMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(activityId, slotData);
          return newMap;
        });
      }
    } catch (err: any) {
      console.warn('Failed to fetch slot for activity:', err);
    } finally {
      setServicesLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(activityId);
        return newSet;
      });
    }
  }, []);

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
              {date && (
                <Text style={styles.dateFilterText}>
                  {' • '}
                  {new Date(date).toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              )}
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

                  {/* Activity Note (from staff) */}
                  {activity.note && (
                    <TouchableOpacity
                      onPress={() => handleActivityPress(activity)}
                      activeOpacity={0.7}
                      disabled={isDeleting}
                    >
                      <View style={styles.noteBox}>
                        <MaterialIcons name="note" size={16} color={COLORS.PRIMARY} />
                        <View style={styles.noteContent}>
                          <Text style={styles.noteLabel}>Ghi chú từ staff:</Text>
                          <Text style={styles.noteText}>{activity.note}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* Parent Note (from parent) */}
                  {activity.parentNote && (
                    <TouchableOpacity
                      onPress={() => handleActivityPress(activity)}
                      activeOpacity={0.7}
                      disabled={isDeleting}
                    >
                      <View style={styles.parentNoteBox}>
                        <MaterialIcons name="family-restroom" size={16} color={COLORS.SECONDARY} />
                        <View style={styles.noteContent}>
                          <Text style={styles.parentNoteLabel}>Ghi chú từ phụ huynh:</Text>
                          <Text style={styles.parentNoteText}>{activity.parentNote}</Text>
                        </View>
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

                  {/* Services Add-On Section */}
                  {(() => {
                    const slot = slotsMap.get(activity.id);
                    const isLoading = servicesLoading.has(activity.id);
                    const services = slot?.services || [];
                    
                    // Fetch slot if not already loaded
                    if (!slot && !isLoading && activity.studentSlotId) {
                      fetchSlotForActivity(activity.id, activity.studentSlotId, studentId);
                    }

                    if (isLoading) {
                      return (
                        <View style={styles.servicesCard}>
                          <View style={styles.sectionHeader}>
                            <MaterialIcons name="shopping-cart" size={16} color={COLORS.PRIMARY} />
                            <Text style={styles.servicesSectionTitle}>Dịch vụ bổ sung</Text>
                          </View>
                          <View style={styles.servicesLoadingContainer}>
                            <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                            <Text style={styles.servicesLoadingText}>Đang tải...</Text>
                          </View>
                        </View>
                      );
                    }

                    if (services.length > 0) {
                      // Group services by serviceId để gộp các services giống nhau
                      const groupedServices = new Map<string, {
                        serviceId: string;
                        serviceName: string;
                        totalQuantity: number;
                        unitPrice: number;
                        totalPrice: number;
                      }>();

                      services.forEach((service, serviceIndex) => {
                        if (!service) return;
                        
                        const serviceId = service.serviceId || `service-${serviceIndex}`;
                        const quantity = service.quantity || 1;
                        const unitPrice = service.unitPrice || 0;
                        const totalPrice = service.totalPrice || (unitPrice * quantity);

                        const groupKey = serviceId;
                        
                        if (groupedServices.has(groupKey)) {
                          const existing = groupedServices.get(groupKey)!;
                          existing.totalQuantity += quantity;
                          existing.totalPrice += totalPrice;
                        } else {
                          groupedServices.set(groupKey, {
                            serviceId: serviceId,
                            serviceName: service.serviceName || 'Dịch vụ',
                            totalQuantity: quantity,
                            unitPrice: unitPrice,
                            totalPrice: totalPrice,
                          });
                        }
                      });

                      const servicesArray = Array.from(groupedServices.values());

                      return (
                        <View style={styles.servicesCard}>
                          <View style={styles.sectionHeader}>
                            <MaterialIcons name="shopping-cart" size={16} color={COLORS.PRIMARY} />
                            <Text style={styles.servicesSectionTitle}>Dịch vụ bổ sung</Text>
                          </View>
                          <View style={styles.servicesList}>
                            {servicesArray.map((service, index) => {
                              if (!service || service.totalQuantity <= 0) {
                                return null;
                              }

                              const unitPrice = service.unitPrice || 0;
                              const totalPrice = service.totalPrice || (unitPrice * service.totalQuantity);
                              
                              return (
                                <View key={`service-${activity.id}-${index}`} style={styles.serviceItem}>
                                  <View style={styles.serviceInfo}>
                                    <Text style={styles.serviceName} numberOfLines={2}>
                                      {service.serviceName || 'Dịch vụ'}
                                    </Text>
                                    <View style={styles.servicePriceRow}>
                                      <Text style={styles.serviceQuantity}>
                                        {service.totalQuantity} ×
                                      </Text>
                                      <Text style={styles.servicePrice}>
                                        {unitPrice.toLocaleString('vi-VN')} đ
                                      </Text>
                                      <Text style={styles.serviceTotal}>
                                        = {totalPrice.toLocaleString('vi-VN')} đ
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      );
                    }

                    return null;
                  })()}
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
  dateFilterText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
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
  noteContent: {
    flex: 1,
    marginLeft: SPACING.SM,
  },
  noteLabel: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '600',
    marginBottom: SPACING.XS,
    textTransform: 'uppercase',
  },
  noteText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 20,
  },
  parentNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.INFO_BG,
    padding: SPACING.MD,
    borderRadius: 12,
    marginBottom: SPACING.MD,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.SECONDARY,
  },
  parentNoteLabel: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.SECONDARY,
    fontWeight: '600',
    marginBottom: SPACING.XS,
    textTransform: 'uppercase',
  },
  parentNoteText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 20,
    fontStyle: 'italic',
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
  servicesCard: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    padding: SPACING.MD,
    marginTop: SPACING.SM,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.PRIMARY,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  servicesSectionTitle: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.PRIMARY,
    marginLeft: SPACING.XS,
  },
  servicesList: {
    gap: SPACING.SM,
    marginTop: SPACING.SM,
  },
  serviceItem: {
    padding: SPACING.SM,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
  },
  serviceInfo: {
    gap: SPACING.XS / 2,
  },
  serviceName: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  servicePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
    flexWrap: 'wrap',
  },
  serviceQuantity: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  servicePrice: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  serviceTotal: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.PRIMARY,
    fontWeight: '700',
  },
  servicesLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.SM,
  },
  servicesLoadingText: {
    marginLeft: SPACING.XS,
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
});

export default StaffStudentActivityScreen;

