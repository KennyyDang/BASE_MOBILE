import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
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
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useMyChildren } from '../../hooks/useChildrenApi';
import studentSlotService from '../../services/studentSlotService';
import packageService from '../../services/packageService';
import {
  StudentResponse,
  StudentSlotResponse,
  StudentPackageSubscription,
} from '../../types/api';
import { COLORS } from '../../constants';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import { CompositeNavigationProp } from '@react-navigation/native';
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



type BookedClassesNavigationProp = BottomTabNavigationProp<MainTabParamList, 'BookedClasses'>;
type RootNavigationProp = StackNavigationProp<RootStackParamList>;
type BookedClassesRouteProp = RouteProp<MainTabParamList, 'BookedClasses'>;

const BookedClassesScreen: React.FC = () => {
  const tabNavigation = useNavigation<BookedClassesNavigationProp>();
  const route = useRoute<BookedClassesRouteProp>();
  
  // Get root navigator from parent - use useMemo to get it once
  const rootNavigation = useMemo(() => {
    let currentNavigator: any = tabNavigation;
    while (currentNavigator?.getParent) {
      const parent = currentNavigator.getParent();
      if (!parent) {
        break;
      }
      currentNavigator = parent;
    }
    return currentNavigator ?? tabNavigation;
  }, [tabNavigation]);
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<WeekdayKey>>(new Set()); // Mặc định đóng tất cả
  const studentFlatListRef = useRef<FlatList<StudentResponse>>(null);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [studentSubscriptions, setStudentSubscriptions] = useState<Record<string, StudentPackageSubscription[]>>({});
  const [subscriptionsLoading, setSubscriptionsLoading] = useState<Record<string, boolean>>({});

  // Xử lý studentId từ route params
  useEffect(() => {
    const studentIdFromParams = route.params?.studentId;
    if (studentIdFromParams && students.length > 0) {
      // Kiểm tra xem studentId có tồn tại trong danh sách học sinh không
      const studentExists = students.some(s => s.id === studentIdFromParams);
      if (studentExists) {
        setSelectedStudentId(studentIdFromParams);
      }
    }
  }, [route.params?.studentId, students]);

  // Tính toán weekOffset từ initialDate nếu có
  useEffect(() => {
    const initialDate = route.params?.initialDate;
    if (initialDate) {
      try {
        const targetDate = new Date(initialDate);
        const now = new Date();
        const currentDay = now.getDay();
        
        // Tính thứ 2 của tuần hiện tại
        const currentMonday = new Date(now);
        const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
        currentMonday.setDate(currentMonday.getDate() - daysFromMonday);
        currentMonday.setHours(0, 0, 0, 0);
        
        // Tính thứ 2 của tuần chứa targetDate
        const targetDay = targetDate.getDay();
        const targetMonday = new Date(targetDate);
        const targetDaysFromMonday = targetDay === 0 ? 6 : targetDay - 1;
        targetMonday.setDate(targetMonday.getDate() - targetDaysFromMonday);
        targetMonday.setHours(0, 0, 0, 0);
        
        // Tính số tuần chênh lệch
        const diffMs = targetMonday.getTime() - currentMonday.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const weekOffset = Math.floor(diffDays / 7);
        
        setWeekOffset(weekOffset);
        
        // Expand ngày có slot
        const weekday = targetDay as WeekdayKey;
        setExpandedDays(new Set([weekday]));
      } catch (err) {
        // Nếu parse date lỗi, giữ nguyên weekOffset mặc định
      }
    }
  }, [route.params?.initialDate]);

  // Chọn học sinh đầu tiên nếu chưa có studentId từ params và chưa chọn
  useEffect(() => {
    if (students.length && !selectedStudentId && !route.params?.studentId) {
      setSelectedStudentId(students[0].id);
      setCurrentStudentIndex(0);
    }
  }, [students, selectedStudentId, route.params?.studentId]);

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
          // Không filter theo status ở API để lấy tất cả các slot (trừ Cancelled sẽ filter ở client)
        });
        // Filter bỏ các slot có status "Cancelled"
        const filteredSlots = (response.items || []).filter(
          (slot) => slot.status && slot.status.toLowerCase() !== 'cancelled'
        );
        setBookedSlots(filteredSlots);
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

  // Đồng bộ selectedStudentId theo index khi swipe
  useEffect(() => {
    if (students.length > 0 && currentStudentIndex >= 0 && currentStudentIndex < students.length) {
      const student = students[currentStudentIndex];
      if (student.id !== selectedStudentId) {
        setSelectedStudentId(student.id);
      }
    }
  }, [currentStudentIndex, students]);

  // Fetch subscriptions khi selectedStudentId thay đổi
  useEffect(() => {
    if (selectedStudentId) {
      // Chỉ fetch nếu chưa có data và chưa đang load
      const hasData = studentSubscriptions[selectedStudentId] !== undefined;
      const isLoading = subscriptionsLoading[selectedStudentId];
      if (!hasData && !isLoading) {
        fetchStudentSubscriptions(selectedStudentId);
      }
    }
  }, [selectedStudentId, studentSubscriptions, subscriptionsLoading, fetchStudentSubscriptions]);

  // Sync currentStudentIndex khi selectedStudentId thay đổi từ bên ngoài (ví dụ route params)
  useEffect(() => {
    if (selectedStudentId && students.length > 0) {
      const index = students.findIndex(s => s.id === selectedStudentId);
      if (index >= 0 && index !== currentStudentIndex) {
        setCurrentStudentIndex(index);
        const itemWidth = Dimensions.get('window').width - SPACING.MD * 2;
        studentFlatListRef.current?.scrollToOffset({
          offset: itemWidth * index,
          animated: true,
        });
      }
    }
  }, [selectedStudentId, students]);

  // Scroll to current student when students list changes
  useEffect(() => {
    if (students.length > 0 && currentStudentIndex >= 0 && currentStudentIndex < students.length) {
      const itemWidth = Dimensions.get('window').width - SPACING.MD * 2;
      studentFlatListRef.current?.scrollToOffset({
        offset: itemWidth * currentStudentIndex,
        animated: false,
      });
    }
  }, [students.length]);

  // Fetch subscriptions for student
  const fetchStudentSubscriptions = useCallback(async (studentId: string) => {
    setSubscriptionsLoading(prev => {
      if (prev[studentId]) return prev; // Đang load rồi thì skip
      return { ...prev, [studentId]: true };
    });
    
    try {
      const data = await packageService.getStudentSubscriptions(studentId);
      const activeData = data.filter((sub) => {
        if (!sub.status) return false;
        const status = sub.status.trim().toUpperCase();
        return status === 'ACTIVE';
      });
      setStudentSubscriptions(prev => ({ ...prev, [studentId]: activeData }));
    } catch (err: any) {
      console.warn('Failed to fetch subscriptions:', err);
      setStudentSubscriptions(prev => ({ ...prev, [studentId]: [] }));
    } finally {
      setSubscriptionsLoading(prev => ({ ...prev, [studentId]: false }));
    }
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      fetchBookedSlots(selectedStudentId);
      if (!studentSubscriptions[selectedStudentId]) {
        fetchStudentSubscriptions(selectedStudentId);
      }
    } else {
      setBookedSlots([]);
    }
  }, [selectedStudentId, fetchBookedSlots, fetchStudentSubscriptions]);

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

  const getWeekDate = useCallback((weekOffset: number, targetWeekday: number): Date => {
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
  }, []);

  const getWeekRange = useCallback((): { startDate: Date; endDate: Date; displayText: string } => {
    const monday = getWeekDate(weekOffset, 1);
    const sunday = getWeekDate(weekOffset, 0);
    return {
      startDate: monday,
      endDate: sunday,
      displayText: `${formatDateDisplay(monday)} - ${formatDateDisplay(sunday)}`,
    };
  }, [weekOffset, getWeekDate]);

  const weekRange = useMemo(() => getWeekRange(), [getWeekRange]);

  // Group slots by weekday within the current week (restore old logic)
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

    // Sort slots in each day by startTime (earlier times first)
    Object.keys(groups).forEach((dayKey) => {
      const day = Number(dayKey) as WeekdayKey;
      groups[day].sort((a, b) => {
        const timeA = a.timeframe?.startTime || '';
        const timeB = b.timeframe?.startTime || '';
        
        // If no timeframe, put at the end
        if (!timeA && !timeB) return 0;
        if (!timeA) return 1;
        if (!timeB) return -1;
        
        // Compare time strings (HH:MM:SS format)
        return timeA.localeCompare(timeB);
      });
    });

    return groups;
  }, [bookedSlots, weekRange]);

  const handleSlotPress = useCallback((slot: StudentSlotResponse) => {
    // Navigate to ClassDetailScreen instead of opening modal
    try {
      if (rootNavigation && typeof rootNavigation.push === 'function') {
        rootNavigation.push('ClassDetail', {
          slotId: slot.id,
          studentId: slot.studentId,
        });
      } else if (rootNavigation && typeof rootNavigation.navigate === 'function') {
        rootNavigation.navigate('ClassDetail', {
          slotId: slot.id,
          studentId: slot.studentId,
        });
      } else {
        Alert.alert('Lỗi', 'Không thể chuyển trang. Navigator không khả dụng.');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', `Không thể chuyển trang: ${error?.message || 'Unknown error'}`);
    }
  }, [rootNavigation]);

  const handlePurchaseService = useCallback((slot: StudentSlotResponse) => {
    // Navigate to PurchaseService screen with slot info
    rootNavigation.navigate('PurchaseService', {
      studentSlotId: slot.id,
      studentId: slot.studentId,
    });
  }, [rootNavigation]);

  // Swipe đổi học sinh
  const handleStudentSwipe = useCallback(
    (event: any) => {
      const itemWidth = Dimensions.get('window').width - SPACING.MD * 2;
      const index = Math.round(event.nativeEvent.contentOffset.x / itemWidth);
      if (index >= 0 && index < students.length && index !== currentStudentIndex) {
        setCurrentStudentIndex(index);
      }
    },
    [students.length, currentStudentIndex]
  );

  const renderStudentCard = useCallback(
    ({ item: student }: { item: StudentResponse }) => {
      const screenWidth = Dimensions.get('window').width;
      const subscriptions = studentSubscriptions[student.id] || [];
      const isLoading = subscriptionsLoading[student.id];
      
      // Tính tổng số slot đã dùng và tổng số slot
      let totalUsed = 0;
      let totalSlots = 0;
      let packageNames: string[] = [];
      
      if (subscriptions.length > 0) {
        subscriptions.forEach((sub) => {
          const used = sub.usedSlot || 0;
          const total = sub.totalSlotsSnapshot ?? sub.totalSlots ?? sub.remainingSlots;
          let totalDisplay: number = 0;
          
          if (typeof total === 'number') {
            totalDisplay = total;
          } else {
            // Thử parse từ packageName nếu có
            const nameMatch = sub.packageName?.match(/(\d+)/);
            if (nameMatch) {
              totalDisplay = parseInt(nameMatch[1], 10);
            }
          }
          
          totalUsed += used;
          totalSlots += totalDisplay;
          if (sub.packageName) {
            packageNames.push(sub.packageName);
          }
        });
      }
      
      return (
        <View style={{ width: screenWidth - SPACING.MD * 2 }}>
          <View style={[styles.studentInfoCard, styles.sectionSpacing]}>
            {/* Header với avatar và tên */}
            <View style={styles.studentInfoHeader}>
              <View style={styles.studentAvatar}>
                <MaterialIcons name="emoji-emotions" size={26} color={COLORS.PRIMARY} />
              </View>
              <View style={{ flex: 1, marginLeft: SPACING.SM }}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentMeta}>
                  {student.studentLevelName || 'Chưa có cấp độ phù hợp'}
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.studentDivider} />

            {/* Thông tin chi nhánh và trường */}
            <View style={styles.studentInfoSection}>
              <View style={styles.studentMetaRow}>
                <View style={styles.studentIconContainer}>
                  <MaterialIcons name="location-on" size={18} color={COLORS.SECONDARY} />
                </View>
                <Text style={styles.studentMetaText}>
                  {student.branchName || 'Chưa gắn chi nhánh'}
                </Text>
              </View>
              <View style={[styles.studentMetaRow, { marginTop: SPACING.XS }]}>
                <View style={styles.studentIconContainer}>
                  <MaterialIcons name="school" size={18} color={COLORS.PRIMARY} />
                </View>
                <Text style={styles.studentMetaText} numberOfLines={2}>
                  {student.schoolName || 'Chưa cập nhật trường học'}
                </Text>
              </View>
            </View>
            
            {/* Thông tin gói và slot - Section riêng */}
            <View style={styles.studentPackageSection}>
              <View style={styles.studentMetaRow}>
                <View style={styles.studentIconContainer}>
                  <MaterialIcons name="card-membership" size={18} color={COLORS.PRIMARY} />
                </View>
                {isLoading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <ActivityIndicator size="small" color={COLORS.PRIMARY} style={{ marginLeft: SPACING.SM }} />
                    <Text style={[styles.studentMetaText, { marginLeft: SPACING.SM }]}>Đang tải...</Text>
                  </View>
                ) : subscriptions.length > 0 ? (
                  <View style={{ flex: 1 }}>
                    <Text style={styles.studentPackageName} numberOfLines={2}>
                      {packageNames.length > 0 ? packageNames.join(', ') : 'Có gói đang hoạt động'}
                    </Text>
                    {totalSlots > 0 && (
                      <View style={styles.studentSlotInfo}>
                        <Text style={styles.studentSlotText}>
                          Đã dùng: <Text style={styles.studentSlotNumber}>{totalUsed}</Text> / <Text style={styles.studentSlotNumber}>{totalSlots}</Text> slot
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={[styles.studentMetaText, { color: COLORS.TEXT_SECONDARY }]}>
                    Chưa có gói đăng ký
                  </Text>
                )}
              </View>
            </View>

            {/* Nút Đặt lịch học */}
            <TouchableOpacity
              style={styles.bookClassButton}
              onPress={() => {
                try {
                  rootNavigation.navigate('SelectSlot', {
                    studentId: student.id,
                  });
                } catch (error: any) {
                  Alert.alert('Lỗi', 'Không thể mở trang đặt lịch học. Vui lòng thử lại.');
                }
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="event-available" size={20} color={COLORS.SURFACE} />
              <Text style={styles.bookClassButtonText}>Đặt lịch học</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [studentSubscriptions, subscriptionsLoading, rootNavigation]
  );

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
            Chưa có lớp học nào đã đặt trong tuần này. Vui lòng đặt lịch tại mục Đặt Lịch Học.
          </Text>
          {selectedStudentId && (
            <TouchableOpacity
              style={styles.selectSlotButton}
              onPress={() => {
                try {
                  rootNavigation.navigate('SelectSlot', {
                    studentId: selectedStudentId,
                  });
                } catch (error: any) {
                  Alert.alert('Lỗi', 'Không thể mở trang chọn slot. Vui lòng thử lại.');
                }
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="event-available" size={20} color={COLORS.SURFACE} />
              <Text style={styles.selectSlotButtonText}>Chọn slot</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // Filter to only show weekdays that have slots
    const weekdaysWithSlots = WEEKDAY_ORDER.filter((day) => {
      return groupedSlots[day] && groupedSlots[day].length > 0;
    });

    if (weekdaysWithSlots.length === 0) {
      return (
        <View style={[styles.stateCard, styles.surfaceCard, styles.sectionSpacing]}>
          <MaterialIcons name="event-busy" size={40} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.stateText}>
            Chưa có lớp học nào đã đặt trong tuần này. Vui lòng đặt lịch tại mục Đặt Lịch Học.
          </Text>
          {selectedStudentId && (
            <TouchableOpacity
              style={styles.selectSlotButton}
              onPress={() => {
                try {
                  rootNavigation.navigate('SelectSlot', {
                    studentId: selectedStudentId,
                  });
                } catch (error: any) {
                  Alert.alert('Lỗi', 'Không thể mở trang chọn slot. Vui lòng thử lại.');
                }
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="event-available" size={20} color={COLORS.SURFACE} />
              <Text style={styles.selectSlotButtonText}>Chọn slot</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles.slotListContainer}>
        {weekdaysWithSlots.map((day) => {
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
                            {slot.status && slot.status.toLowerCase() !== 'cancelled' && (
                              <View
                                style={[
                                  styles.statusTag,
                                  {
                                    backgroundColor:
                                      slot.status.toLowerCase() === 'completed'
                                        ? COLORS.SUCCESS_BG
                                        : slot.status.toLowerCase() === 'noshow'
                                        ? COLORS.WARNING_BG || '#FFF3E0'
                                        : slot.status.toLowerCase() === 'rescheduled'
                                        ? COLORS.INFO_BG || '#E3F2FD'
                                        : COLORS.SUCCESS_BG,
                                  },
                                ]}
                              >
                                <MaterialIcons
                                  name="check-circle"
                                  size={18}
                                  color={
                                    slot.status.toLowerCase() === 'completed'
                                      ? COLORS.SUCCESS
                                      : slot.status.toLowerCase() === 'noshow'
                                      ? COLORS.WARNING || '#FF9800'
                                      : slot.status.toLowerCase() === 'rescheduled'
                                      ? COLORS.INFO || '#2196F3'
                                      : COLORS.PRIMARY
                                  }
                                />
                                <Text
                                  style={[
                                    styles.statusTagText,
                                    {
                                      color:
                                        slot.status.toLowerCase() === 'completed'
                                          ? COLORS.SUCCESS
                                          : slot.status.toLowerCase() === 'noshow'
                                          ? COLORS.WARNING || '#FF9800'
                                          : slot.status.toLowerCase() === 'rescheduled'
                                          ? COLORS.INFO || '#2196F3'
                                          : COLORS.PRIMARY,
                                    },
                                  ]}
                                >
                                  {slot.status.toLowerCase() === 'completed'
                                    ? 'Đã điểm danh'
                                    : slot.status.toLowerCase() === 'noshow'
                                    ? 'Vắng mặt'
                                    : slot.status.toLowerCase() === 'rescheduled'
                                    ? 'Đổi lịch'
                                    : 'Đã đặt'}
                                </Text>
                              </View>
                            )}
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
        {/* Swipeable student cards giống Đặt Lịch Học */}
        {students.length > 0 && (
          <View style={styles.studentSwipeContainer}>
            <FlatList
              ref={studentFlatListRef}
              data={students}
              renderItem={renderStudentCard}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleStudentSwipe}
              snapToInterval={Dimensions.get('window').width - SPACING.MD * 2}
              decelerationRate="fast"
              getItemLayout={(data, index) => ({
                length: Dimensions.get('window').width - SPACING.MD * 2,
                offset: (Dimensions.get('window').width - SPACING.MD * 2) * index,
                index,
              })}
            />
            {students.length > 1 && (
              <View style={styles.paginationContainer}>
                {students.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      index === currentStudentIndex && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

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
        ) : null}

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
    borderRadius: 12,
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
    marginBottom: SPACING.SM,
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.SUCCESS_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentName: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  studentMeta: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 18,
  },
  studentDivider: {
    height: 1,
    backgroundColor: COLORS.BORDER,
    marginBottom: SPACING.SM,
  },
  studentInfoSection: {
    marginBottom: SPACING.SM,
  },
  studentPackageSection: {
    backgroundColor: COLORS.PRIMARY_LIGHT + '20',
    borderRadius: 10,
    padding: SPACING.SM,
    marginTop: 0,
  },
  studentMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  studentIconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.SM,
    marginTop: 1,
  },
  studentMetaText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    lineHeight: 20,
  },
  studentPackageName: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
    lineHeight: 20,
  },
  studentSlotInfo: {
    marginTop: SPACING.XS,
  },
  bookClassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    borderRadius: 12,
    marginTop: SPACING.MD,
    gap: SPACING.SM,
  },
  bookClassButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  studentSlotText: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 18,
  },
  studentSlotNumber: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.PRIMARY,
    fontWeight: '700',
  },
  studentSwipeContainer: {
    marginBottom: SPACING.MD,
  },
  withBottomSpacing: {
    marginBottom: SPACING.SM,
  },
  withTopSpacing: {
    marginTop: SPACING.SM,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.SM,
    gap: SPACING.XS,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.TEXT_SECONDARY + '40',
  },
  paginationDotActive: {
    backgroundColor: COLORS.PRIMARY,
    width: 24,
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
    marginTop: SPACING.MD,
  },
  daySection: {
    marginTop: SPACING.MD,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.XS,
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
    borderRadius: 12,
    paddingVertical: SPACING.MD,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginBottom: SPACING.XS,
  },
  emptySlotText: {
    marginTop: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  slotCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.XS,
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
  selectSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderRadius: 12,
    marginTop: SPACING.MD,
    gap: SPACING.SM,
  },
  selectSlotButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
});

export default BookedClassesScreen;

