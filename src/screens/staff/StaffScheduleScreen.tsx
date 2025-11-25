import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Alert,
  Platform,
  FlatList,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import studentSlotService from '../../services/studentSlotService';
import { StudentSlotResponse } from '../../types/api';
import { COLORS } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';

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

const PAGE_SIZE = 100; // Lấy nhiều để có đủ dữ liệu cho tuần

type WeekdayKey = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const WEEKDAY_ORDER: WeekdayKey[] = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABELS: Record<WeekdayKey, { title: string; subtitle: string }> = {
  0: { title: 'Chủ nhật', subtitle: 'Ngày nghỉ' },
  1: { title: 'Thứ 2', subtitle: 'Khởi động tuần mới' },
  2: { title: 'Thứ 3', subtitle: 'Duy trì nhịp làm việc' },
  3: { title: 'Thứ 4', subtitle: 'Tăng tốc giữa tuần' },
  4: { title: 'Thứ 5', subtitle: 'Hoạt động chuyên môn' },
  5: { title: 'Thứ 6', subtitle: 'Chuẩn bị cuối tuần' },
  6: { title: 'Thứ 7', subtitle: 'Cuối tuần tại trung tâm' },
};

const normalizeWeekDate = (value: number): WeekdayKey => {
  if (value >= 0 && value <= 6) {
    return value as WeekdayKey;
  }
  return 0;
};

const formatTime = (time?: string | null) => {
  if (!time) {
    return '--:--';
  }
  const parts = time.split(':');
  if (parts.length < 2) {
    return time;
  }
  const hours = parts[0]?.padStart(2, '0') ?? '--';
  const minutes = parts[1]?.padStart(2, '0') ?? '00';
  return `${hours}:${minutes}`;
};

const formatTimeRange = (timeframe: StudentSlotResponse['timeframe']) => {
  if (!timeframe) {
    return 'Chưa có khung giờ';
  }
  return `${formatTime(timeframe.startTime)} - ${formatTime(timeframe.endTime)}`;
};

const formatDateDisplay = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const getWeekDate = (weekOffset: number, targetWeekday: WeekdayKey): Date => {
  const now = new Date();
  const currentDay = now.getDay();
  
  const currentMonday = new Date(now);
  const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
  currentMonday.setDate(currentMonday.getDate() - daysFromMonday);
  currentMonday.setHours(0, 0, 0, 0);
  
  const targetMonday = new Date(currentMonday);
  targetMonday.setDate(targetMonday.getDate() + (weekOffset * 7));
  
  const targetDate = new Date(targetMonday);
  if (targetWeekday === 0) {
    targetDate.setDate(targetMonday.getDate() + 6);
  } else {
    targetDate.setDate(targetMonday.getDate() + (targetWeekday - 1));
  }
  
  return targetDate;
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

interface SlotStudent {
  id: string;
  studentId: string;
  studentName: string;
  parentName?: string;
  status: string;
  parentNote?: string;
}

const StaffScheduleScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  
  // Kiểm tra quyền truy cập - chỉ dành cho staff, không phải manager
  useEffect(() => {
    const userRole = (user?.role || '').toUpperCase();
    const isManager = userRole.includes('MANAGER') || userRole === 'ADMIN';
    if (isManager) {
      Alert.alert(
        'Không có quyền truy cập',
        'Chức năng này chỉ dành cho nhân viên. Quản lý chỉ có quyền tạo tài khoản phụ huynh.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  }, [user, navigation]);
  
  const [slots, setSlots] = useState<StudentSlotResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  
  // Modal states
  const [slotDetailModalVisible, setSlotDetailModalVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<StudentSlotResponse | null>(null);
  const [slotStudents, setSlotStudents] = useState<SlotStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSlots = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      setError(null);
      if (!silent) {
        setLoading(true);
      }

      try {
        const response = await studentSlotService.getStaffSlots({
          pageIndex: 1,
          pageSize: PAGE_SIZE,
          upcomingOnly: false, // Lấy tất cả để có thể xem cả quá khứ
        });
        const items = response?.items ?? [];
        setSlots(items);
      } catch (error: any) {
        const message =
          error?.message ||
          error?.response?.data?.message ||
          'Không thể tải lịch làm việc. Vui lòng thử lại.';
        setError(message);
        setSlots([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSlots({ silent: true });
  }, [fetchSlots]);

  const handlePreviousWeek = useCallback(() => {
    setWeekOffset((prev) => prev - 1);
  }, []);

  const handleNextWeek = useCallback(() => {
    setWeekOffset((prev) => prev + 1);
  }, []);

  const handleGoToCurrentWeek = useCallback(() => {
    setWeekOffset(0);
  }, []);

  const handleSlotPress = async (slot: StudentSlotResponse) => {
    setSelectedSlot(slot);
    setSlotDetailModalVisible(true);
    setLoadingStudents(true);
    setSlotStudents([]);

    try {
      // Fetch all students in this slot (same branchSlotId and date)
      const response = await studentSlotService.getStaffSlots({
        branchSlotId: slot.branchSlotId,
        date: slot.date,
        pageSize: 100, // Get all students
      });

      // Map to SlotStudent format
      const students: SlotStudent[] = response.items.map((item) => ({
        id: item.id,
        studentId: item.studentId,
        studentName: item.studentName,
        parentName: item.parentName,
        status: item.status,
        parentNote: item.parentNote || undefined,
      }));

      setSlotStudents(students);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Không thể tải danh sách học sinh.';
      Alert.alert('Lỗi', message);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleCloseModal = () => {
    setSlotDetailModalVisible(false);
    setSelectedSlot(null);
    setSlotStudents([]);
    setSearchQuery('');
  };

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) {
      return slotStudents;
    }
    const query = searchQuery.toLowerCase().trim();
    return slotStudents.filter(
      (student) =>
        student.studentName.toLowerCase().includes(query) ||
        student.parentName?.toLowerCase().includes(query) ||
        student.studentId.toLowerCase().includes(query)
    );
  }, [slotStudents, searchQuery]);

  const getWeekRange = useCallback((): { startDate: Date; endDate: Date; displayText: string } => {
    const monday = getWeekDate(weekOffset, 1);
    const sunday = getWeekDate(weekOffset, 0);
    return {
      startDate: monday,
      endDate: sunday,
      displayText: `${formatDateDisplay(monday)} - ${formatDateDisplay(sunday)}`,
    };
  }, [weekOffset]);

  // Lọc và nhóm slots theo ngày trong tuần
  const groupedSlots = useMemo(() => {
    const groups: Record<WeekdayKey, StudentSlotResponse[]> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };

    const weekStart = getWeekDate(weekOffset, 1);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = getWeekDate(weekOffset, 0);
    weekEnd.setHours(23, 59, 59, 999);

    slots.forEach((slot) => {
      if (!slot.date) return;
      
      const slotDate = new Date(slot.date);
      slotDate.setHours(0, 0, 0, 0);
      
      // Kiểm tra xem slot có nằm trong tuần đang xem không
      if (slotDate >= weekStart && slotDate <= weekEnd) {
        const dayOfWeek = slotDate.getDay() as WeekdayKey;
        groups[dayOfWeek].push(slot);
      }
    });

    // Sắp xếp slots trong mỗi ngày theo thời gian
    Object.keys(groups).forEach((key) => {
      const dayKey = Number(key) as WeekdayKey;
      groups[dayKey].sort((a, b) => {
        const timeA = a.timeframe?.startTime || '';
        const timeB = b.timeframe?.startTime || '';
        return timeA.localeCompare(timeB);
      });
    });

    return groups;
  }, [slots, weekOffset]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.PRIMARY]} tintColor={COLORS.PRIMARY} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Lịch làm việc</Text>
          <Text style={styles.headerSubtitle}>
            Xem lịch làm việc của bạn theo tuần
          </Text>
        </View>

        {/* Điều hướng tuần */}
        <View style={[styles.sectionCard, styles.sectionSpacing]}>
          <View style={styles.weekNavigator}>
            <TouchableOpacity
              style={styles.weekNavButton}
              onPress={handlePreviousWeek}
              activeOpacity={0.7}
            >
              <MaterialIcons name="chevron-left" size={24} color={COLORS.PRIMARY} />
              <Text style={styles.weekNavButtonText}>Tuần trước</Text>
            </TouchableOpacity>

            <View style={styles.weekInfo}>
              <Text style={styles.weekRangeText}>{getWeekRange().displayText}</Text>
              {weekOffset !== 0 && (
                <TouchableOpacity
                  style={styles.goToCurrentWeekButton}
                  onPress={handleGoToCurrentWeek}
                  activeOpacity={0.7}
                >
                  <Text style={styles.goToCurrentWeekText}>Về tuần này</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.weekNavButton}
              onPress={handleNextWeek}
              activeOpacity={0.7}
            >
              <Text style={styles.weekNavButtonText}>Tuần sau</Text>
              <MaterialIcons name="chevron-right" size={24} color={COLORS.PRIMARY} />
            </TouchableOpacity>
          </View>
        </View>

        {loading && slots.length === 0 ? (
          <View style={[styles.stateCard, styles.surfaceCard]}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            <Text style={styles.stateText}>Đang tải lịch làm việc...</Text>
          </View>
        ) : error ? (
          <View style={[styles.stateCard, styles.surfaceCard]}>
            <MaterialIcons name="error-outline" size={42} color={COLORS.ERROR} />
            <Text style={[styles.stateText, { color: COLORS.ERROR }]}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchSlots()}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.slotListContainer}>
            {WEEKDAY_ORDER.map((day) => {
              const daySlots = groupedSlots[day];
              const { title, subtitle } = WEEKDAY_LABELS[day];
              const dayDate = getWeekDate(weekOffset, day);
              const dayDateDisplay = formatDateDisplay(dayDate);

              return (
                <View key={day} style={styles.daySection}>
                  <View style={styles.dayHeader}>
                    <View>
                      <Text style={styles.dayTitle}>{title} - {dayDateDisplay}</Text>
                      <Text style={styles.daySubtitle}>{subtitle}</Text>
                    </View>
                    <View style={styles.dayBadge}>
                      <MaterialIcons name="event-available" size={18} color={COLORS.PRIMARY} />
                      <Text style={styles.dayBadgeText}>{daySlots.length}</Text>
                    </View>
                  </View>

                  {daySlots.length === 0 ? (
                    <View style={styles.emptySlotCard}>
                      <MaterialIcons name="watch-later" size={32} color={COLORS.TEXT_SECONDARY} />
                      <Text style={styles.emptySlotText}>Không có ca làm việc trong ngày</Text>
                    </View>
                  ) : (
                    daySlots.map((slot) => {
                      return (
                        <TouchableOpacity
                          key={slot.id}
                          style={styles.slotCard}
                          onPress={() => handleSlotPress(slot)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.slotHeader}>
                            <View style={styles.slotIcon}>
                              <MaterialIcons name="access-time" size={22} color={COLORS.ACCENT} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.slotTime}>{formatTimeRange(slot.timeframe)}</Text>
                              <Text style={styles.slotTitle}>
                                {slot.timeframe?.name || 'Khung giờ chưa đặt tên'}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.statusTag,
                                {
                                  backgroundColor: getStatusColor(slot.status) + '20',
                                },
                              ]}
                            >
                              <MaterialIcons
                                name="check-circle"
                                size={18}
                                color={getStatusColor(slot.status)}
                              />
                              <Text
                                style={[
                                  styles.statusTagText,
                                  { color: getStatusColor(slot.status) },
                                ]}
                              >
                                {getStatusLabel(slot.status)}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.slotMetaRow}>
                            <MaterialIcons name="location-on" size={18} color={COLORS.SECONDARY} />
                            <Text style={styles.slotMetaText}>
                              {slot.branchSlot?.branchName || 'Chưa có thông tin chi nhánh'}
                            </Text>
                          </View>

                          {slot.room?.roomName && (
                            <View style={styles.slotMetaRow}>
                              <MaterialIcons name="meeting-room" size={18} color={COLORS.PRIMARY} />
                              <Text style={styles.slotMetaText}>
                                Phòng: {slot.room.roomName}
                              </Text>
                            </View>
                          )}

                          <View style={styles.slotMetaRow}>
                            <MaterialIcons name="people" size={18} color={COLORS.ACCENT} />
                            <Text style={styles.slotMetaText}>
                              Chạm để xem danh sách học sinh
                            </Text>
                            <MaterialIcons name="chevron-right" size={20} color={COLORS.TEXT_SECONDARY} />
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Slot Detail Modal - Danh sách học sinh */}
      <Modal
        visible={slotDetailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Danh sách học sinh</Text>
              <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            {selectedSlot && (
              <View style={styles.modalSlotInfo}>
                <View style={styles.modalSlotInfoRow}>
                  <MaterialIcons name="access-time" size={18} color={COLORS.PRIMARY} />
                  <Text style={styles.modalSlotInfoText}>
                    {formatTimeRange(selectedSlot.timeframe)} - {formatDateDisplay(new Date(selectedSlot.date))}
                  </Text>
                </View>
                {selectedSlot.room?.roomName && (
                  <View style={styles.modalSlotInfoRow}>
                    <MaterialIcons name="meeting-room" size={18} color={COLORS.PRIMARY} />
                    <Text style={styles.modalSlotInfoText}>
                      Phòng: {selectedSlot.room.roomName}
                    </Text>
                  </View>
                )}
                {selectedSlot.branchSlot?.branchName && (
                  <View style={styles.modalSlotInfoRow}>
                    <MaterialIcons name="location-on" size={18} color={COLORS.SECONDARY} />
                    <Text style={styles.modalSlotInfoText}>
                      {selectedSlot.branchSlot.branchName}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Search Bar */}
            {slotStudents.length > 0 && (
              <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={20} color={COLORS.TEXT_SECONDARY} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm kiếm học sinh..."
                  placeholderTextColor={COLORS.TEXT_SECONDARY}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    style={styles.clearSearchButton}
                  >
                    <MaterialIcons name="close" size={18} color={COLORS.TEXT_SECONDARY} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Students List */}
            {loadingStudents ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                <Text style={styles.modalLoadingText}>Đang tải danh sách học sinh...</Text>
              </View>
            ) : slotStudents.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <MaterialIcons name="person-off" size={48} color={COLORS.TEXT_SECONDARY} />
                <Text style={styles.modalEmptyText}>Chưa có học sinh nào trong slot này</Text>
              </View>
            ) : filteredStudents.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <MaterialIcons name="search-off" size={48} color={COLORS.TEXT_SECONDARY} />
                <Text style={styles.modalEmptyText}>
                  Không tìm thấy học sinh nào phù hợp với "{searchQuery}"
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredStudents}
                keyExtractor={(item) => item.id}
                renderItem={({ item: student }) => (
                  <TouchableOpacity
                    style={styles.studentCard}
                    onPress={() => {
                      handleCloseModal();
                      navigation.navigate('CreateActivity', {
                        studentSlotId: student.id,
                        studentId: student.studentId,
                        studentName: student.studentName,
                        slotDate: selectedSlot?.date
                          ? formatDateDisplay(new Date(selectedSlot.date))
                          : undefined,
                        slotTimeframe: selectedSlot?.timeframe?.name,
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.studentHeader}>
                      <View style={styles.studentIcon}>
                        <MaterialIcons name="person" size={24} color={COLORS.PRIMARY} />
                      </View>
                      <View style={styles.studentContent}>
                        <Text style={styles.studentName}>{student.studentName}</Text>
                        {student.parentName && (
                          <Text style={styles.studentParent}>
                            Phụ huynh: {student.parentName}
                          </Text>
                        )}
                      </View>
                      <View
                        style={[
                          styles.studentStatusBadge,
                          {
                            backgroundColor: getStatusColor(student.status) + '20',
                          },
                        ]}
                      >
                        <MaterialIcons
                          name="check-circle"
                          size={16}
                          color={getStatusColor(student.status)}
                        />
                        <Text
                          style={[
                            styles.studentStatusText,
                            { color: getStatusColor(student.status) },
                          ]}
                        >
                          {getStatusLabel(student.status)}
                        </Text>
                      </View>
                    </View>
                    {student.parentNote && (
                      <View style={styles.studentNoteBox}>
                        <MaterialIcons name="note" size={16} color={COLORS.TEXT_SECONDARY} />
                        <Text style={styles.studentNoteText}>{student.parentNote}</Text>
                      </View>
                    )}
                    <View style={styles.studentActionHint}>
                      <MaterialIcons name="add-circle" size={16} color={COLORS.PRIMARY} />
                      <Text style={styles.studentActionHintText}>
                        Chạm để tạo hoạt động
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                style={styles.modalBody}
                contentContainerStyle={styles.studentsList}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                  slotStudents.length > 0 ? (
                    <Text style={styles.studentsCount}>
                      Tìm thấy {filteredStudents.length} / {slotStudents.length} học sinh
                    </Text>
                  ) : null
                }
              />
            )}
          </View>
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
  header: {
    marginBottom: SPACING.SM,
  },
  headerTitle: {
    fontSize: FONTS.SIZES.XXL,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  headerSubtitle: {
    marginTop: SPACING.XS,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  sectionSpacing: {
    marginTop: SPACING.MD,
  },
  sectionCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.MD,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  stateCard: {
    borderRadius: 16,
    padding: SPACING.LG,
    alignItems: 'center',
  },
  surfaceCard: {
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  stateText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: SPACING.SM,
  },
  retryButton: {
    marginTop: SPACING.XS,
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
  weekNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 12,
    backgroundColor: COLORS.INFO_BG,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY_LIGHT,
  },
  weekNavButtonText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.PRIMARY,
    marginHorizontal: SPACING.XS,
  },
  weekInfo: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: SPACING.MD,
  },
  weekRangeText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  goToCurrentWeekButton: {
    marginTop: SPACING.XS,
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 8,
    backgroundColor: COLORS.PRIMARY,
  },
  goToCurrentWeekText: {
    fontSize: FONTS.SIZES.XS,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  slotListContainer: {
    marginTop: SPACING.LG,
  },
  daySection: {
    marginTop: SPACING.LG,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.SM,
  },
  dayTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  daySubtitle: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
  },
  dayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SUCCESS_BG,
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 16,
  },
  dayBadgeText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
    marginLeft: SPACING.XS,
  },
  emptySlotCard: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: SPACING.LG,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  emptySlotText: {
    marginTop: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  slotCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.INFO_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotTime: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  slotTitle: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 16,
  },
  statusTagText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    marginLeft: SPACING.XS,
  },
  slotMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.SM,
  },
  slotMetaText: {
    flex: 1,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 20,
    marginLeft: SPACING.SM,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.SECONDARY_50,
    padding: SPACING.MD,
    borderRadius: 12,
    marginTop: SPACING.SM,
  },
  noteText: {
    flex: 1,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
    lineHeight: 20,
    fontStyle: 'italic',
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
    paddingBottom: Platform.OS === 'ios' ? 0 : SPACING.MD,
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
  closeButton: {
    padding: SPACING.XS,
  },
  modalSlotInfo: {
    padding: SPACING.MD,
    backgroundColor: COLORS.INFO_BG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  modalSlotInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.XS,
    gap: SPACING.SM,
  },
  modalSlotInfoText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  modalBody: {
    maxHeight: 500,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    marginHorizontal: SPACING.MD,
    marginTop: SPACING.MD,
    marginBottom: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    gap: SPACING.SM,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    paddingVertical: 0,
  },
  clearSearchButton: {
    padding: SPACING.XS,
  },
  studentsCount: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.SM,
    paddingHorizontal: SPACING.MD,
  },
  modalLoadingContainer: {
    alignItems: 'center',
    padding: SPACING.XL,
  },
  modalLoadingText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  modalEmptyContainer: {
    alignItems: 'center',
    padding: SPACING.XL,
  },
  modalEmptyText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  studentsList: {
    padding: SPACING.MD,
    gap: SPACING.SM,
  },
  studentCard: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    padding: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.INFO_BG,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  studentContent: {
    flex: 1,
  },
  studentName: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  studentParent: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  studentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 12,
    gap: SPACING.XS,
  },
  studentStatusText: {
    fontSize: FONTS.SIZES.XS,
    fontWeight: '600',
  },
  studentNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.SM,
    padding: SPACING.SM,
    backgroundColor: COLORS.SECONDARY_50,
    borderRadius: 8,
    gap: SPACING.XS,
  },
  studentNoteText: {
    flex: 1,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  studentActionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.SM,
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    gap: SPACING.XS,
  },
  studentActionHintText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
});

export default StaffScheduleScreen;

