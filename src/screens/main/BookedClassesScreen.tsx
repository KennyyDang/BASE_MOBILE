import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

import { useMyChildren } from '../../hooks/useChildrenApi';
import studentSlotService from '../../services/studentSlotService';
import activityService from '../../services/activityService';
import childrenService from '../../services/childrenService';
import {
  StudentResponse,
  StudentSlotResponse,
} from '../../types/api';
import { COLORS } from '../../constants';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainTabParamList, RootStackParamList } from '../../types';

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

const PAGE_SIZE = 50;
type WeekdayKey = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const WEEKDAY_ORDER: WeekdayKey[] = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABELS: Record<WeekdayKey, { title: string; subtitle: string }> = {
  0: { title: 'Chủ nhật', subtitle: 'Ngày nghỉ / Chủ động đăng ký thêm' },
  1: { title: 'Thứ 2', subtitle: 'Khởi động tuần mới cho con' },
  2: { title: 'Thứ 3', subtitle: 'Duy trì nhịp học tập' },
  3: { title: 'Thứ 4', subtitle: 'Tăng tốc giữa tuần' },
  4: { title: 'Thứ 5', subtitle: 'Hoạt động kỹ năng mềm' },
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

const formatDateDisplay = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

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


type BookedClassesNavigationProp = BottomTabNavigationProp<MainTabParamList, 'BookedClasses'>;
type RootNavigationProp = StackNavigationProp<RootStackParamList>;

const BookedClassesScreen: React.FC = () => {
  const tabNavigation = useNavigation<BookedClassesNavigationProp>();
  const rootNavigation = useNavigation<RootNavigationProp>();
  const {
    students,
    loading: studentsLoading,
    error: studentsError,
    refetch: refetchStudents,
  } = useMyChildren();

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<StudentSlotResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [selectedSlot, setSelectedSlot] = useState<StudentSlotResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<WeekdayKey>>(new Set()); // Mặc định đóng tất cả

  useEffect(() => {
    if (students.length && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  const selectedStudent: StudentResponse | null = useMemo(() => {
    return students.find((student) => student.id === selectedStudentId) ?? null;
  }, [selectedStudentId, students]);

  const fetchBookedSlots = useCallback(
    async (studentId: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await studentSlotService.getStudentSlots({
          studentId,
          pageIndex: 1,
          pageSize: PAGE_SIZE,
          status: 'Booked',
        });
        setBookedSlots(response.items || []);
      } catch (err: any) {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          'Không thể tải danh sách lớp học đã đặt. Vui lòng thử lại.';
        setError(message);
        setBookedSlots([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedStudentId) {
      fetchBookedSlots(selectedStudentId);
    } else {
      setBookedSlots([]);
    }
  }, [selectedStudentId, fetchBookedSlots]);

  useEffect(() => {
    if (selectedStudentId) {
      fetchBookedSlots(selectedStudentId);
    }
  }, [weekOffset, selectedStudentId, fetchBookedSlots]);

  const handleRefresh = useCallback(() => {
    if (!selectedStudentId) {
      return;
    }
    setRefreshing(true);
    fetchBookedSlots(selectedStudentId);
  }, [selectedStudentId, fetchBookedSlots]);

  const handlePreviousWeek = useCallback(() => {
    setWeekOffset((prev) => prev - 1);
  }, []);

  const handleNextWeek = useCallback(() => {
    setWeekOffset((prev) => prev + 1);
  }, []);

  const handleGoToCurrentWeek = useCallback(() => {
    setWeekOffset(0);
  }, []);

  const getWeekRange = useCallback((): { startDate: Date; endDate: Date; displayText: string } => {
    const monday = getWeekDate(weekOffset, 1);
    const sunday = getWeekDate(weekOffset, 0);
    return {
      startDate: monday,
      endDate: sunday,
      displayText: `${formatDateDisplay(monday)} - ${formatDateDisplay(sunday)}`,
    };
  }, [weekOffset]);

  const weekRange = useMemo(() => getWeekRange(), [weekOffset]);

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

    bookedSlots.forEach((slot) => {
      const slotDate = new Date(slot.date);
      slotDate.setHours(0, 0, 0, 0);
      const slotDay = slotDate.getDay() as WeekdayKey;
      
      // Check if slot is in the current week
      const startDate = new Date(weekRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(weekRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      if (slotDate >= startDate && slotDate <= endDate) {
        groups[slotDay].push(slot);
      }
    });

    return groups;
  }, [bookedSlots, weekRange]);

  const handleSlotPress = useCallback(async (slot: StudentSlotResponse) => {
    setSelectedSlot(slot);
    setModalVisible(true);
    setLoadingDetails(true);
    setAttendance([]);
    setActivities([]);

    try {
      // Fetch attendance
      if (slot.studentId) {
        const slotDate = new Date(slot.date);
        const startDate = new Date(slotDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(slotDate);
        endDate.setHours(23, 59, 59, 999);

        try {
          const attendanceData = await childrenService.getChildAttendanceHistory(
            slot.studentId,
            startDate.toISOString(),
            endDate.toISOString()
          );
          setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
        } catch (err) {
          // API chưa có, bỏ qua lỗi
          setAttendance([]);
        }
      }

      // Fetch activities
      if (slot.id && slot.studentId) {
        try {
          const activitiesResponse = await activityService.getMyChildrenActivities({
            studentId: slot.studentId,
            studentSlotId: slot.id,
            pageIndex: 1,
            pageSize: 50,
          });
          setActivities(activitiesResponse.items || []);
        } catch (err) {
          console.warn('Failed to fetch activities:', err);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch slot details:', err);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  const handlePurchaseService = useCallback((slot: StudentSlotResponse) => {
    // Navigate to PurchaseService screen with slot info
    rootNavigation.navigate('PurchaseService', {
      studentSlotId: slot.id,
      studentId: slot.studentId,
    });
  }, [rootNavigation]);

  const renderStudentSelector = () => {
    if (!students.length) {
      return null;
    }

    return (
      <View style={[styles.sectionCard, styles.sectionSpacing]}>
        <Text style={styles.sectionTitle}>Chọn con cần xem lịch</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.studentChipList}
        >
          {students.map((student) => {
            const active = student.id === selectedStudentId;
            return (
              <TouchableOpacity
                key={student.id}
                style={[styles.studentChip, active && styles.studentChipActive]}
                onPress={() => setSelectedStudentId(student.id)}
              >
                <MaterialIcons
                  name={active ? 'child-care' : 'face-retouching-natural'}
                  size={18}
                  color={active ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY}
                />
                <Text
                  style={[
                    styles.studentChipText,
                    active && { color: COLORS.PRIMARY, fontWeight: '700' },
                  ]}
                >
                  {student.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderSelectedStudentInfo = () => {
    if (!selectedStudent) {
      return null;
    }

    return (
      <View style={[styles.studentInfoCard, styles.sectionSpacing]}>
        <View style={[styles.studentInfoHeader, styles.withBottomSpacing]}>
          <View style={styles.studentAvatar}>
            <MaterialIcons name="emoji-emotions" size={26} color={COLORS.PRIMARY} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.studentName}>{selectedStudent.name}</Text>
            <Text style={styles.studentMeta}>
              {selectedStudent.studentLevelName || 'Chưa có cấp độ phù hợp'}
            </Text>
          </View>
        </View>
        <View style={[styles.studentMetaRow, styles.withTopSpacing]}>
          <MaterialIcons name="location-on" size={18} color={COLORS.SECONDARY} />
          <Text style={styles.studentMetaText}>
            {selectedStudent.branchName || 'Chưa gắn chi nhánh'}
          </Text>
        </View>
        <View style={[styles.studentMetaRow, styles.withTopSpacing]}>
          <MaterialIcons name="school" size={18} color={COLORS.PRIMARY} />
          <Text style={styles.studentMetaText}>
            {selectedStudent.schoolName || 'Chưa cập nhật trường học'}
          </Text>
        </View>
      </View>
    );
  };

  const renderSlotList = () => {
    if (loading && bookedSlots.length === 0) {
      return (
        <View style={[styles.stateCard, styles.surfaceCard, styles.sectionSpacing]}>
          <ActivityIndicator color={COLORS.PRIMARY} size="large" />
          <Text style={styles.stateText}>Đang tải lớp học đã đặt...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={[styles.stateCard, styles.surfaceCard, styles.sectionSpacing]}>
          <MaterialIcons name="error-outline" size={42} color={COLORS.ERROR} />
          <Text style={[styles.stateText, { color: COLORS.ERROR }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => selectedStudentId && fetchBookedSlots(selectedStudentId)}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!loading && bookedSlots.length === 0) {
      return (
        <View style={[styles.stateCard, styles.surfaceCard, styles.sectionSpacing]}>
          <MaterialIcons name="event-busy" size={40} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.stateText}>
            Chưa có lớp học nào đã đặt trong tuần này. Vui lòng đặt lịch tại mục Lịch Học.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.slotListContainer}>
        {WEEKDAY_ORDER.map((day) => {
          const daySlots = groupedSlots[day];
          const { title, subtitle } = WEEKDAY_LABELS[day];
          const dayDate = getWeekDate(weekOffset, day);
          const dayDateDisplay = formatDateDisplay(dayDate);

          const isExpanded = expandedDays.has(day);
          const toggleDay = () => {
            setExpandedDays((prev) => {
              const newSet = new Set(prev);
              if (newSet.has(day)) {
                newSet.delete(day);
              } else {
                newSet.add(day);
              }
              return newSet;
            });
          };

          return (
            <View key={day} style={styles.daySection}>
              <TouchableOpacity
                style={styles.dayHeader}
                onPress={toggleDay}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.dayTitle}>{title} - {dayDateDisplay}</Text>
                  <Text style={styles.daySubtitle}>{subtitle}</Text>
                </View>
                <View style={styles.dayHeaderRight}>
                  <View style={styles.dayBadge}>
                    <MaterialIcons name="event-available" size={18} color={COLORS.PRIMARY} />
                    <Text style={styles.dayBadgeText}>{daySlots.length}</Text>
                  </View>
                  <MaterialIcons
                    name={isExpanded ? 'keyboard-arrow-down' : 'keyboard-arrow-right'}
                    size={24}
                    color={COLORS.PRIMARY}
                    style={styles.dayChevron}
                  />
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <>
                  {daySlots.length === 0 ? (
                <View style={styles.emptySlotCard}>
                  <MaterialIcons name="watch-later" size={32} color={COLORS.TEXT_SECONDARY} />
                  <Text style={styles.emptySlotText}>Chưa có lớp học nào trong ngày</Text>
                </View>
              ) : (
                daySlots.map((slot) => {
                  const slotDate = new Date(slot.date);
                  const slotDateDisplay = formatDateDisplay(slotDate);

                  return (
                    <TouchableOpacity
                      key={slot.id}
                      style={styles.slotCard}
                      onPress={() => handleSlotPress(slot)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.slotHeader}>
                        <View style={styles.slotIcon}>
                          <MaterialIcons name="event-available" size={22} color={COLORS.PRIMARY} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.slotTime}>
                            {slot.timeframe ? formatTimeRange(slot.timeframe) : 'Chưa có khung giờ'}
                          </Text>
                          <Text style={styles.slotTitle}>
                            {slot.timeframe?.name || 'Khung giờ chưa đặt tên'}
                          </Text>
                        </View>
                        <View style={styles.statusTag}>
                          <MaterialIcons name="check-circle" size={18} color={COLORS.PRIMARY} />
                          <Text style={styles.statusTagText}>Đã đặt</Text>
                        </View>
                      </View>

                      <View style={styles.slotMetaRow}>
                        <MaterialIcons name="calendar-today" size={18} color={COLORS.SECONDARY} />
                        <Text style={styles.slotMetaText}>{slotDateDisplay}</Text>
                      </View>

                      {slot.branchSlot?.branchName && (
                        <View style={styles.slotMetaRow}>
                          <MaterialIcons name="location-on" size={18} color={COLORS.SECONDARY} />
                          <Text style={styles.slotMetaText}>
                            {slot.branchSlot.branchName}
                          </Text>
                        </View>
                      )}

                      {slot.room?.roomName && (
                        <View style={styles.slotMetaRow}>
                          <MaterialIcons name="meeting-room" size={18} color={COLORS.PRIMARY} />
                          <Text style={styles.slotMetaText}>Phòng: {slot.room.roomName}</Text>
                        </View>
                      )}

                      <View style={styles.slotActionRow}>
                        <MaterialIcons name="info-outline" size={18} color={COLORS.PRIMARY} />
                        <Text style={styles.slotActionText}>Chạm để xem điểm danh và hoạt động</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
                  )}
                </>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          selectedStudentId ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.PRIMARY]}
              tintColor={COLORS.PRIMARY}
            />
          ) : undefined
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Lớp học đã đặt</Text>
          <Text style={styles.headerSubtitle}>
            Xem lịch học và hoạt động của con tại trung tâm
          </Text>
        </View>

        {studentsLoading && !students.length ? (
          <View style={[styles.stateCard, styles.surfaceCard, styles.sectionSpacing]}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            <Text style={styles.stateText}>Đang tải danh sách con...</Text>
          </View>
        ) : null}

        {studentsError ? (
          <View style={[styles.stateCard, styles.surfaceCard, styles.sectionSpacing]}>
            <MaterialIcons name="error-outline" size={42} color={COLORS.ERROR} />
            <Text style={[styles.stateText, { color: COLORS.ERROR }]}>{studentsError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refetchStudents}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!studentsLoading && students.length === 0 ? (
          <View style={[styles.stateCard, styles.surfaceCard, styles.sectionSpacing]}>
            <MaterialIcons name="child-care" size={42} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.stateText}>
              Chưa có thông tin con trong tài khoản. Vui lòng thêm con tại mục Hồ Sơ để xem các lớp học đã đặt.
            </Text>
          </View>
        ) : (
          <>
            {renderStudentSelector()}
            {renderSelectedStudentInfo()}
          </>
        )}

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
              <Text style={styles.weekRangeText}>{weekRange.displayText}</Text>
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

        {!studentsLoading && students.length > 0 ? (
          <>
            {renderSlotList()}
          </>
        ) : null}
      </ScrollView>

      {/* Modal hiển thị chi tiết slot */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết lớp học</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {loadingDetails ? (
                <View style={styles.modalLoadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                  <Text style={styles.modalLoadingText}>Đang tải thông tin...</Text>
                </View>
              ) : (
                <>
                  {selectedSlot && (
                    <>
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>Thông tin lớp học</Text>
                        <View style={styles.detailRow}>
                          <MaterialIcons name="calendar-today" size={18} color={COLORS.PRIMARY} />
                          <Text style={styles.detailText}>
                            {formatDateDisplay(new Date(selectedSlot.date))}
                          </Text>
                        </View>
                        {selectedSlot.timeframe && (
                          <View style={styles.detailRow}>
                            <MaterialIcons name="access-time" size={18} color={COLORS.PRIMARY} />
                            <Text style={styles.detailText}>
                              {formatTimeRange(selectedSlot.timeframe)}
                            </Text>
                          </View>
                        )}
                        {selectedSlot.room?.roomName && (
                          <View style={styles.detailRow}>
                            <MaterialIcons name="meeting-room" size={18} color={COLORS.PRIMARY} />
                            <Text style={styles.detailText}>Phòng: {selectedSlot.room.roomName}</Text>
                          </View>
                        )}
                        {selectedSlot.branchSlot?.branchName && (
                          <View style={styles.detailRow}>
                            <MaterialIcons name="location-on" size={18} color={COLORS.PRIMARY} />
                            <Text style={styles.detailText}>
                              {selectedSlot.branchSlot.branchName}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Điểm danh */}
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>Điểm danh</Text>
                        {attendance.length === 0 ? (
                          <Text style={styles.emptyText}>Chưa có thông tin điểm danh</Text>
                        ) : (
                          attendance.map((record, index) => (
                            <View key={index} style={styles.attendanceCard}>
                              <View style={styles.attendanceRow}>
                                <MaterialIcons
                                  name={
                                    record.status === 'PRESENT'
                                      ? 'check-circle'
                                      : record.status === 'ABSENT'
                                      ? 'cancel'
                                      : record.status === 'LATE'
                                      ? 'schedule'
                                      : 'info'
                                  }
                                  size={20}
                                  color={
                                    record.status === 'PRESENT'
                                      ? COLORS.PRIMARY
                                      : record.status === 'ABSENT'
                                      ? COLORS.ERROR
                                      : COLORS.ACCENT
                                  }
                                />
                                <Text style={styles.attendanceStatus}>
                                  {record.status === 'PRESENT'
                                    ? 'Có mặt'
                                    : record.status === 'ABSENT'
                                    ? 'Vắng mặt'
                                    : record.status === 'LATE'
                                    ? 'Đi muộn'
                                    : record.status || 'Chưa cập nhật'}
                                </Text>
                              </View>
                              {record.checkInTime && (
                                <Text style={styles.attendanceTime}>
                                  Giờ vào: {formatDateTime(record.checkInTime).time}
                                </Text>
                              )}
                              {record.checkOutTime && (
                                <Text style={styles.attendanceTime}>
                                  Giờ ra: {formatDateTime(record.checkOutTime).time}
                                </Text>
                              )}
                            </View>
                          ))
                        )}
                      </View>

                      {/* Hoạt động */}
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>
                          Hoạt động ({activities.length})
                        </Text>
                        {activities.length === 0 ? (
                          <Text style={styles.emptyText}>Chưa có hoạt động nào</Text>
                        ) : (
                          activities.map((activity) => {
                            const timeInfo = formatDateTime(activity.createdTime);
                            return (
                              <View key={activity.id} style={styles.activityCard}>
                                <View style={styles.activityHeader}>
                                  <MaterialIcons
                                    name="event-note"
                                    size={20}
                                    color={COLORS.PRIMARY}
                                  />
                                  <Text style={styles.activityTypeName}>
                                    {activity.activityType?.name || 'Hoạt động'}
                                  </Text>
                                </View>
                                {activity.note && (
                                  <Text style={styles.activityNote}>{activity.note}</Text>
                                )}
                                {activity.imageUrl && (
                                  <TouchableOpacity
                                    onPress={() => setSelectedImage(activity.imageUrl)}
                                    style={styles.activityImageContainer}
                                  >
                                    <Image
                                      source={{ uri: activity.imageUrl }}
                                      style={styles.activityImage}
                                      resizeMode="cover"
                                    />
                                  </TouchableOpacity>
                                )}
                                <View style={styles.activityMeta}>
                                  <Text style={styles.activityMetaText}>
                                    {activity.staffName || 'Nhân viên'} • {timeInfo.date} {timeInfo.time}
                                  </Text>
                                </View>
                              </View>
                            );
                          })
                        )}
                      </View>

                      {/* Mua dịch vụ */}
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>Mua dịch vụ bổ sung</Text>
                        <TouchableOpacity
                          style={styles.purchaseServiceButton}
                          onPress={() => selectedSlot && handlePurchaseService(selectedSlot)}
                        >
                          <MaterialIcons name="shopping-cart" size={24} color={COLORS.SURFACE} />
                          <Text style={styles.purchaseServiceButtonText}>Mua dịch vụ bổ sung</Text>
                          <MaterialIcons name="arrow-forward" size={24} color={COLORS.SURFACE} />
                        </TouchableOpacity>
                        <Text style={styles.purchaseServiceHint}>
                          Bấm để xem và mua các dịch vụ bổ sung cho lớp học này
                        </Text>
                      </View>
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>


      {/* Image Modal */}
      <Modal
        visible={selectedImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.imageModalContainer}>
          <TouchableOpacity
            style={styles.imageModalClose}
            onPress={() => setSelectedImage(null)}
          >
            <MaterialIcons name="close" size={28} color={COLORS.SURFACE} />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  sectionTitle: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  studentChipList: {
    flexDirection: 'row',
    paddingRight: SPACING.SM,
  },
  studentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 20,
    paddingVertical: SPACING.XS,
    paddingHorizontal: SPACING.MD,
    backgroundColor: COLORS.SURFACE,
    marginRight: SPACING.SM,
  },
  studentChipActive: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.SUCCESS_BG,
  },
  studentChipText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.XS,
  },
  studentInfoCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.MD,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  studentInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.SUCCESS_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentName: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  studentMeta: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  studentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentMetaText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    marginLeft: SPACING.SM,
  },
  withBottomSpacing: {
    marginBottom: SPACING.SM,
  },
  withTopSpacing: {
    marginTop: SPACING.SM,
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
    paddingVertical: SPACING.XS,
  },
  dayHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  },
  dayChevron: {
    marginLeft: SPACING.XS,
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
    backgroundColor: COLORS.SUCCESS_BG,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
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
    backgroundColor: COLORS.SUCCESS_BG,
  },
  statusTagText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    marginLeft: SPACING.XS,
    color: COLORS.PRIMARY,
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
  slotActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.SM,
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  slotActionText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    marginLeft: SPACING.SM,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
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
  },
  modalCloseButton: {
    padding: SPACING.XS,
  },
  modalBody: {
    padding: SPACING.MD,
  },
  modalLoadingContainer: {
    padding: SPACING.LG,
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  detailSection: {
    marginBottom: SPACING.LG,
  },
  detailSectionTitle: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  detailText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
  },
  emptyText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    fontStyle: 'italic',
  },
  attendanceCard: {
    backgroundColor: COLORS.INFO_BG,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendanceStatus: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
  },
  attendanceTime: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS,
    marginLeft: SPACING.MD + 20,
  },
  activityCard: {
    backgroundColor: COLORS.INFO_BG,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  activityTypeName: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
  },
  activityNote: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
    lineHeight: 20,
  },
  activityImageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: SPACING.SM,
  },
  activityImage: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.BORDER,
  },
  activityMeta: {
    marginTop: SPACING.XS,
  },
  activityMetaText: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
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
  purchaseServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    padding: SPACING.MD,
    marginTop: SPACING.SM,
  },
  purchaseServiceButtonText: {
    flex: 1,
    marginLeft: SPACING.SM,
    fontSize: FONTS.SIZES.MD,
    fontWeight: '700',
    color: COLORS.SURFACE,
  },
  purchaseServiceHint: {
    marginTop: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default BookedClassesScreen;

