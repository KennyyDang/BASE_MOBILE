import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import studentSlotService from '../../services/studentSlotService';
import { RootStackParamList } from '../../types';
import { StudentSlotResponse } from '../../types/api';
import { COLORS } from '../../constants';

type StudentClassesRouteProp = RouteProp<RootStackParamList, 'StudentClasses'>;

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

const formatTime = (time?: string | null) => {
  if (!time) return '--:--';
  const parts = time.split(':');
  if (parts.length < 2) return time;
  const hours = parts[0]?.padStart(2, '0') ?? '--';
  const minutes = parts[1]?.padStart(2, '0') ?? '00';
  return `${hours}:${minutes}`;
};

const formatDateTime = (dateString: string) => {
  try {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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

const formatDateDisplay = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (e) {
    return dateString;
  }
};

const getStatusLabel = (status: string) => {
  const normalized = (status || '').toLowerCase();
  switch (normalized) {
    case 'booked':
      return 'Đã đặt';
    case 'confirmed':
      return 'Đã xác nhận';
    case 'completed':
      return 'Đã hoàn thành';
    case 'cancelled':
      return 'Đã hủy';
    default:
      return status || 'Chưa xác định';
  }
};

const getStatusColor = (status: string) => {
  const normalized = (status || '').toLowerCase();
  switch (normalized) {
    case 'booked':
    case 'confirmed':
      return COLORS.PRIMARY;
    case 'completed':
      return COLORS.SUCCESS;
    case 'cancelled':
      return COLORS.ERROR;
    default:
      return COLORS.TEXT_SECONDARY;
  }
};

const StudentClassesScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const {
    params: { studentId, studentName },
  } = useRoute<StudentClassesRouteProp>();

  const [classes, setClasses] = useState<StudentSlotResponse[]>([]);
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

  const fetchClasses = useCallback(
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
        const response = await studentSlotService.getStudentSlots({
          studentId,
          pageIndex: page,
          pageSize: PAGE_SIZE,
          // Không filter status để lấy tất cả các lớp đã đặt
        });

        const items = response?.items ?? [];

        setClasses((prev) => (append ? [...prev, ...items] : items));
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
          'Không thể tải danh sách lớp học. Vui lòng thử lại.';
        setError(message);

        if (!append) {
          setClasses([]);
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
    [studentId]
  );

  useEffect(() => {
    fetchClasses({ page: 1 });
  }, [fetchClasses]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClasses({ page: 1, silent: true });
  }, [fetchClasses]);

  const handleLoadMore = useCallback(() => {
    if (!pagination?.hasNextPage || loadingMore) {
      return;
    }
    const nextPage = (pagination.pageIndex ?? 1) + 1;
    fetchClasses({ page: nextPage, append: true });
  }, [fetchClasses, pagination, loadingMore]);

  const handleViewDetail = (classItem: StudentSlotResponse) => {
    navigation.navigate('StudentActivities', {
      studentId,
      studentName,
      studentSlotId: classItem.id,
      slotDate: formatDateDisplay(classItem.date),
      slotTimeframe: classItem.timeframe?.name || undefined,
    });
  };

  // Filter out cancelled classes
  const activeClasses = classes.filter((item) => {
    const status = (item.status || '').toLowerCase();
    return status !== 'cancelled';
  });

  // Sắp xếp: lớp sắp tới trước, đã qua sau
  const sortedClasses = [...activeClasses].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    const now = Date.now();

    // Lớp sắp tới (date >= now) sắp xếp tăng dần
    // Lớp đã qua (date < now) sắp xếp giảm dần (mới nhất trước)
    if (dateA >= now && dateB >= now) {
      return dateA - dateB; // Cả hai đều sắp tới: sắp xếp tăng dần
    } else if (dateA < now && dateB < now) {
      return dateB - dateA; // Cả hai đều đã qua: sắp xếp giảm dần (mới nhất trước)
    } else {
      return dateA >= now ? -1 : 1; // Lớp sắp tới lên trước
    }
  });

  const upcomingClasses = sortedClasses.filter((item) => {
    const classDate = new Date(item.date);
    classDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return classDate >= today;
  });

  const pastClasses = sortedClasses.filter((item) => {
    const classDate = new Date(item.date);
    classDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return classDate < today;
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.PRIMARY]} tintColor={COLORS.PRIMARY} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Lớp học của {studentName}</Text>
            <Text style={styles.headerSubtitle}>
              Tổng số lớp: {pagination?.totalCount ?? classes.length}
            </Text>
          </View>
        </View>

        {loading && classes.length === 0 ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            <Text style={styles.stateText}>Đang tải danh sách lớp học...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <MaterialIcons name="error-outline" size={42} color={COLORS.ERROR} />
            <Text style={[styles.stateText, { color: COLORS.ERROR }]}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchClasses({ page: 1 })}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : sortedClasses.length === 0 ? (
          <View style={styles.stateCard}>
            <MaterialIcons name="event-busy" size={40} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.stateText}>Chưa có lớp học nào</Text>
          </View>
        ) : (
          <>
            {/* Lớp học sắp tới */}
            {upcomingClasses.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="schedule" size={20} color={COLORS.PRIMARY} />
                  <Text style={styles.sectionTitle}>Lớp học sắp tới ({upcomingClasses.length})</Text>
                </View>
                {upcomingClasses.map((classItem) => {
                  const classDate = new Date(classItem.date);
                  const isToday = classDate.toDateString() === new Date().toDateString();
                  const isTomorrow =
                    classDate.toDateString() === new Date(Date.now() + 86400000).toDateString();

                  return (
                    <TouchableOpacity
                      key={classItem.id}
                      style={styles.classCard}
                      onPress={() => handleViewDetail(classItem)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.classCardHeader}>
                        <View style={styles.classIcon}>
                          <MaterialIcons name="event" size={24} color={COLORS.PRIMARY} />
                        </View>
                        <View style={styles.classInfo}>
                          <Text style={styles.className}>
                            {classItem.timeframe?.name || 'Lớp học'}
                          </Text>
                          <View style={styles.classMetaRow}>
                            <MaterialIcons name="access-time" size={16} color={COLORS.TEXT_SECONDARY} />
                            <Text style={styles.classMetaText}>
                              {formatTime(classItem.timeframe?.startTime)} - {formatTime(classItem.timeframe?.endTime)}
                            </Text>
                          </View>
                          <View style={styles.classMetaRow}>
                            <MaterialIcons name="calendar-today" size={16} color={COLORS.TEXT_SECONDARY} />
                            <Text style={styles.classMetaText}>
                              {formatDateDisplay(classItem.date)}
                              {isToday ? ' • Hôm nay' : isTomorrow ? ' • Ngày mai' : ''}
                            </Text>
                          </View>
                          <View style={styles.classMetaRow}>
                            <MaterialIcons name="meeting-room" size={16} color={COLORS.TEXT_SECONDARY} />
                            <Text style={styles.classMetaText}>
                              {classItem.room?.roomName || 'Chưa có thông tin phòng'}
                            </Text>
                          </View>
                          {classItem.branchSlot?.branchName && (
                            <View style={styles.classMetaRow}>
                              <MaterialIcons name="location-on" size={16} color={COLORS.TEXT_SECONDARY} />
                              <Text style={styles.classMetaText}>{classItem.branchSlot.branchName}</Text>
                            </View>
                          )}
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(classItem.status) + '20' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: getStatusColor(classItem.status) },
                            ]}
                          >
                            {getStatusLabel(classItem.status)}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Lớp học đã qua */}
            {pastClasses.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="history" size={20} color={COLORS.TEXT_SECONDARY} />
                  <Text style={styles.sectionTitle}>Lớp học đã qua ({pastClasses.length})</Text>
                </View>
                {pastClasses.map((classItem) => {
                  return (
                    <TouchableOpacity
                      key={classItem.id}
                      style={[styles.classCard, styles.pastClassCard]}
                      onPress={() => handleViewDetail(classItem)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.classCardHeader}>
                        <View style={[styles.classIcon, styles.pastClassIcon]}>
                          <MaterialIcons name="event" size={24} color={COLORS.TEXT_SECONDARY} />
                        </View>
                        <View style={styles.classInfo}>
                          <Text style={[styles.className, styles.pastClassName]}>
                            {classItem.timeframe?.name || 'Lớp học'}
                          </Text>
                          <View style={styles.classMetaRow}>
                            <MaterialIcons name="access-time" size={16} color={COLORS.TEXT_SECONDARY} />
                            <Text style={styles.classMetaText}>
                              {formatTime(classItem.timeframe?.startTime)} - {formatTime(classItem.timeframe?.endTime)}
                            </Text>
                          </View>
                          <View style={styles.classMetaRow}>
                            <MaterialIcons name="calendar-today" size={16} color={COLORS.TEXT_SECONDARY} />
                            <Text style={styles.classMetaText}>{formatDateDisplay(classItem.date)}</Text>
                          </View>
                          <View style={styles.classMetaRow}>
                            <MaterialIcons name="meeting-room" size={16} color={COLORS.TEXT_SECONDARY} />
                            <Text style={styles.classMetaText}>
                              {classItem.room?.roomName || 'Chưa có thông tin phòng'}
                            </Text>
                          </View>
                          {classItem.branchSlot?.branchName && (
                            <View style={styles.classMetaRow}>
                              <MaterialIcons name="location-on" size={16} color={COLORS.TEXT_SECONDARY} />
                              <Text style={styles.classMetaText}>{classItem.branchSlot.branchName}</Text>
                            </View>
                          )}
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(classItem.status) + '20' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: getStatusColor(classItem.status) },
                            ]}
                          >
                            {getStatusLabel(classItem.status)}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

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
                    <Text style={styles.loadMoreText}>Xem thêm lớp học</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
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
  section: {
    marginBottom: SPACING.LG,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  sectionTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
  },
  classCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  pastClassCard: {
    opacity: 0.7,
  },
  classCardHeader: {
    flexDirection: 'row',
  },
  classIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.PRIMARY + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  pastClassIcon: {
    backgroundColor: COLORS.TEXT_SECONDARY + '20',
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  pastClassName: {
    color: COLORS.TEXT_SECONDARY,
  },
  classMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.XS,
  },
  classMetaText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.XS,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginLeft: SPACING.SM,
  },
  statusBadgeText: {
    fontSize: FONTS.SIZES.XS,
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
});

export default StudentClassesScreen;

