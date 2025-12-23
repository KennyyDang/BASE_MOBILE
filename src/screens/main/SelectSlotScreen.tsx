import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  Dimensions,
  Modal,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useMyChildren } from '../../hooks/useChildrenApi';
import branchSlotService from '../../services/branchSlotService';
import studentSlotService from '../../services/studentSlotService';
import {
  BranchSlotResponse,
  BranchSlotRoomResponse,
  StudentPackageSubscription,
  StudentResponse,
  StudentSlotResponse,
} from '../../types/api';
import packageService from '../../services/packageService';
import { COLORS } from '../../constants';
import { RootStackParamList } from '../../types';

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
const ROOM_PAGE_SIZE = 10;
type WeekdayKey = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const WEEKDAY_ORDER: WeekdayKey[] = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABELS: Record<WeekdayKey, { title: string; subtitle: string }> = {
  0: { title: 'Chủ nhật', subtitle: 'CN' },
  1: { title: 'Thứ 2', subtitle: 'T2' },
  2: { title: 'Thứ 3', subtitle: 'T3' },
  3: { title: 'Thứ 4', subtitle: 'T4' },
  4: { title: 'Thứ 5', subtitle: 'T5' },
  5: { title: 'Thứ 6', subtitle: 'T6' },
  6: { title: 'Thứ 7', subtitle: 'T7' },
};

interface SlotsPagination {
  pageIndex: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hasNextPage: boolean;
}

interface SlotRoomsStateEntry {
  rooms: BranchSlotRoomResponse[];
  pagination: SlotsPagination | null;
  loading: boolean;
  error: string | null;
  expanded: boolean;
  selectedRoomId: string | null;
  parentNote: string;
  bookingLoading: boolean;
}

const createDefaultSlotRoomsState = (): SlotRoomsStateEntry => ({
  rooms: [],
  pagination: null,
  loading: false,
  error: null,
  expanded: false,
  selectedRoomId: null,
  parentNote: '',
  bookingLoading: false,
});

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

const formatTimeRange = (timeframe: BranchSlotResponse['timeframe']) => {
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

const formatDateYMD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameSlotSignature = (a: BranchSlotResponse, b: BranchSlotResponse): boolean => {
  const aTimeframeId = a.timeframe?.id || null;
  const bTimeframeId = b.timeframe?.id || null;
  const aSlotTypeId = a.slotType?.id || null;
  const bSlotTypeId = b.slotType?.id || null;
  const aBranchId = a.branch?.id || null;
  const bBranchId = b.branch?.id || null;

  return aTimeframeId === bTimeframeId && aSlotTypeId === bSlotTypeId && aBranchId === bBranchId;
};

const formatDateShort = (date: Date): string => {
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const day = date.getDay();
  const dayName = dayNames[day];
  const dayNum = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${dayName}, ${dayNum}/${month}`;
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

const computeSlotDateISO = (slot: BranchSlotResponse, weekOffset: number): string => {
  const targetDay = normalizeWeekDate(slot.weekDate);
  const slotDate = getWeekDate(weekOffset, targetDay);

  if (slot.timeframe?.startTime) {
    const [hours = '0', minutes = '0', seconds = '0'] = slot.timeframe.startTime.split(':');
    slotDate.setHours(Number(hours), Number(minutes), Number(seconds || 0), 0);
  }

  return slotDate.toISOString();
};

type SelectSlotScreenRouteProp = RouteProp<RootStackParamList, 'SelectSlot'>;
type SelectSlotScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SelectSlot'>;

const SelectSlotScreen: React.FC = () => {
  const navigation = useNavigation<SelectSlotScreenNavigationProp>();
  const route = useRoute<SelectSlotScreenRouteProp>();
  const { studentId, initialDate, refreshData } = route.params || {};

  const {
    students,
    loading: studentsLoading,
    error: studentsError,
    refetch: refetchStudents,
  } = useMyChildren();

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(studentId || null);
  const [slots, setSlots] = useState<BranchSlotResponse[]>([]);
  const [pagination, setPagination] = useState<SlotsPagination | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsRefreshing, setSlotsRefreshing] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slotRoomsState, setSlotRoomsState] = useState<Record<string, SlotRoomsStateEntry>>({});
  const [subscriptions, setSubscriptions] = useState<StudentPackageSubscription[]>([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);
  const [packageTotalSlots, setPackageTotalSlots] = useState<Record<string, number>>({});
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [bookedSlots, setBookedSlots] = useState<StudentSlotResponse[]>([]);
  const [bookedSlotsLoading, setBookedSlotsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate ? new Date(initialDate) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string | null>(null);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const dateScrollViewRef = useRef<ScrollView>(null);
  
  // State để lưu booked slots cho ngày được chọn
  const [bookedSlotsForSelectedDate, setBookedSlotsForSelectedDate] = useState<StudentSlotResponse[]>([]);
  const [bookedSlotsForDateLoading, setBookedSlotsForDateLoading] = useState(false);
  
  // Cache số lượng slot cho từng ngày (date string -> count)
  const [datesWithSlots, setDatesWithSlots] = useState<Map<string, number>>(new Map());
  const [checkedDates, setCheckedDates] = useState<Set<string>>(new Set());
  const [loadingSlotCounts, setLoadingSlotCounts] = useState(false);

  useEffect(() => {
    if (students.length && !selectedStudentId) {
      const student = studentId ? students.find(s => s.id === studentId) : students[0];
      setSelectedStudentId(student?.id || students[0].id);
    }
  }, [students, selectedStudentId, studentId]);

  const selectedStudent: StudentResponse | null = useMemo(() => {
    return students.find((student) => student.id === selectedStudentId) ?? null;
  }, [selectedStudentId, students]);

  const computeTotalSlots = useCallback((subscription: StudentPackageSubscription): number | null => {
    if (typeof subscription.totalSlotsSnapshot === 'number') {
      return subscription.totalSlotsSnapshot;
    }
    if (typeof subscription.totalSlots === 'number') {
      return subscription.totalSlots;
    }
    if (subscription.packageId && packageTotalSlots[subscription.packageId]) {
      return packageTotalSlots[subscription.packageId];
    }
    if (typeof subscription.remainingSlots === 'number') {
      return (subscription.usedSlot || 0) + subscription.remainingSlots;
    }
    const nameMatch = subscription.packageName?.match(/(\d+)/);
    if (nameMatch) {
      const totalFromName = parseInt(nameMatch[1], 10);
      if (!isNaN(totalFromName)) {
        return totalFromName;
      }
    }
    return null;
  }, [packageTotalSlots]);

  const selectedSubscription = useMemo(() => {
    if (!selectedSubscriptionId) {
      return null;
    }
    return subscriptions.find((sub) => sub.id === selectedSubscriptionId) ?? null;
  }, [selectedSubscriptionId, subscriptions]);

  const fetchSubscriptions = useCallback(
    async (studentId: string) => {
      setSubscriptionsLoading(true);
      try {
        const data = await packageService.getStudentSubscriptions(studentId);
        const activeData = data.filter((sub) => {
          if (!sub.status) return false;
          const status = sub.status.trim().toUpperCase();
          return status === 'ACTIVE';
        });
        setSubscriptions(activeData);

        const totalSlotsMap: Record<string, number> = {};
        try {
          const suitablePackages = await packageService.getSuitablePackages(studentId);
          suitablePackages.forEach((pkg) => {
            if (pkg.totalSlots && typeof pkg.totalSlots === 'number') {
              totalSlotsMap[pkg.id] = pkg.totalSlots;
            }
          });
          setPackageTotalSlots((prev) => {
            const hasChanges = Object.keys(totalSlotsMap).some(
              (key) => prev[key] !== totalSlotsMap[key]
            );
            if (hasChanges || Object.keys(totalSlotsMap).length > 0) {
              return { ...prev, ...totalSlotsMap };
            }
            return prev;
          });
        } catch (pkgErr) {
          // Ignore error
        }

        const defaultSubscription = activeData.find((sub) => sub.status === 'Active') || activeData[0];
        setSelectedSubscriptionId(defaultSubscription ? defaultSubscription.id : null);
      } catch (error: any) {
        setSubscriptions([]);
        setSelectedSubscriptionId(null);
      } finally {
        setSubscriptionsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!selectedStudentId) {
      setSubscriptions([]);
      setSelectedSubscriptionId(null);
      return;
    }
    fetchSubscriptions(selectedStudentId);
  }, [selectedStudentId, fetchSubscriptions]);

  const resolvePackageSubscriptionId = useCallback(
    (slot: BranchSlotResponse): string | null => {
      const possibleIds = [
        slot.packageSubscriptionId,
        slot.studentPackageSubscriptionId,
        slot.packageSubscription?.id,
        (slot as any)?.studentPackageSubscriptionId,
        (slot as any)?.packageSubscription?.id,
      ];

      const slotSpecificId =
        (possibleIds.find((id) => typeof id === 'string' && id.length > 0) as string | undefined) || null;

      if (slotSpecificId) {
        return slotSpecificId;
      }

      return selectedSubscriptionId;
    },
    [selectedSubscriptionId]
  );

  // Get week range for display
  const getWeekRange = useCallback((): { startDate: Date; endDate: Date; displayText: string } => {
    const monday = getWeekDate(weekOffset, 1);
    const sunday = getWeekDate(weekOffset, 0);
    return {
      startDate: monday,
      endDate: sunday,
      displayText: `${formatDateDisplay(monday)} - ${formatDateDisplay(sunday)}`,
    };
  }, [weekOffset]);

  const fetchSlotsForWeek = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!selectedStudentId || !selectedDate) {
        return;
      }

      if (!silent) {
        setSlotsLoading(true);
      }
      setSlotsError(null);

      try {
        // Load all slots for the current week
        const weekRange = getWeekRange();
        const startDate = weekRange.startDate;
        const endDate = weekRange.endDate;

        // Load slots from start to end of week
        const allItems = await branchSlotService.getAllAvailableSlotsForStudent(
          selectedStudentId,
          {
            startDate: startDate,
            endDate: endDate,
            pageSize: 500, // Tăng để load đủ slots trong tuần
          }
        );

        setSlots(allItems);
        setPagination({
          pageIndex: 1,
          totalPages: 1,
          totalCount: allItems.length,
          pageSize: allItems.length,
          hasNextPage: false,
        });

        // Update slot counts for all dates in the week
        const dateCounts = new Map<string, number>();
        allItems.forEach((slot) => {
          const slotDate = getWeekDate(weekOffset, normalizeWeekDate(slot.weekDate));
          const dateStr = formatDateToYYYYMMDD(slotDate);
          dateCounts.set(dateStr, (dateCounts.get(dateStr) || 0) + 1);
        });

        setDatesWithSlots((prev) => {
          const updated = new Map(prev);
          dateCounts.forEach((count, dateStr) => {
            updated.set(dateStr, count);
          });
          return updated;
        });

        const allDateStrings = Array.from(dateCounts.keys());
        setCheckedDates((prev) => {
          const updated = new Set(prev);
          allDateStrings.forEach(dateStr => updated.add(dateStr));
          return updated;
        });
      } catch (error: any) {
        const message =
          error?.message ||
          error?.response?.data?.message ||
          'Không thể tải danh sách slot trong tuần. Vui lòng thử lại.';
        setSlotsError(message);
        setSlots([]);
        setPagination(null);
      } finally {
        setSlotsLoading(false);
        setSlotsRefreshing(false);
      }
    },
    [selectedStudentId, selectedDate, weekOffset, getWeekRange]
  );

  // Fetch booked slots cho ngày được chọn
  const fetchBookedSlotsForSelectedDate = useCallback(
    async (studentId: string, date: Date) => {
      setBookedSlotsForDateLoading(true);
      try {
        // Format date to YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // Fetch booked slots cho ngày này với status "Booked"
        const response = await studentSlotService.getStudentSlots({
          studentId,
          pageIndex: 1,
          pageSize: 100,
          date: dateStr,
          status: 'Booked', // Lọc theo status Booked
        });
        
        const items = response.items || [];
        setBookedSlotsForSelectedDate(items);
      } catch (error: any) {
        console.error('Error fetching booked slots for date:', error);
        setBookedSlotsForSelectedDate([]);
      } finally {
        setBookedSlotsForDateLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedStudentId && selectedDate) {
      fetchSlotsForWeek();
      // Không cần fetch booked slots cho ngày cụ thể nữa vì đã dùng toàn bộ bookedSlots
    }
  }, [selectedStudentId, selectedDate, fetchSlotsForWeek]);

  // Format date to YYYY-MM-DD string
  const formatDateToYYYYMMDD = useCallback((date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Update slot count when slots change - tính cả available và booked slots
  useEffect(() => {
    if (selectedDate) {
      const dateStr = formatDateToYYYYMMDD(selectedDate);
      
      // Đếm available slots
      const availableCount = slots.length;
      
      // Đếm booked slots cho ngày này
      const bookedCount = bookedSlotsForSelectedDate.filter((booked) => {
        const status = (booked.status || '').toLowerCase();
        return status === 'booked';
      }).length;
      
      // Tổng số slots = available + booked
      const totalCount = availableCount + bookedCount;
      
      setDatesWithSlots((prev) => {
        const updated = new Map(prev);
        updated.set(dateStr, totalCount);
        return updated;
      });
    }
  }, [slots, bookedSlotsForSelectedDate, selectedDate, formatDateToYYYYMMDD]);

  useEffect(() => {
    if (slots.length > 0) {
      setSlotRoomsState((prev) => {
        const updated: Record<string, SlotRoomsStateEntry> = {};
        let hasChanges = false;
        
        slots.forEach((slot) => {
          const existing = prev[slot.id];
          const roomsFromSlot = slot.rooms || [];
          
          // Chỉ update nếu thực sự có thay đổi
          if (!existing) {
            updated[slot.id] = {
              rooms: roomsFromSlot.length > 0 ? roomsFromSlot : [],
              pagination: null,
              loading: false,
              error: null,
              expanded: false,
              selectedRoomId: roomsFromSlot[0]?.roomId || roomsFromSlot[0]?.id || null,
              parentNote: '',
              bookingLoading: false,
            };
            hasChanges = true;
          } else {
            updated[slot.id] = existing;
          }
        });
        
        return hasChanges ? updated : prev;
      });
    }
  }, [slots]);

  const fetchBookedSlots = useCallback(
    async (studentId: string) => {
      setBookedSlotsLoading(true);
      try {
        let allSlots: StudentSlotResponse[] = [];
        let pageIndex = 1;
        let hasNextPage = true;
        let totalPages = 1;

        // Loop load tất cả pages để lấy hết tất cả booked slots
        while (pageIndex <= totalPages && hasNextPage) {
          const response = await studentSlotService.getStudentSlots({
            studentId,
            pageIndex,
            pageSize: 500, // Tăng pageSize để load nhiều item hơn mỗi lần
            upcomingOnly: false,
          });
          
          const items = response.items || [];
          allSlots = [...allSlots, ...items];

          // Update pagination info từ response
          totalPages = response.totalPages || 1;
          hasNextPage = response.hasNextPage === true; // Chỉ true nếu explicitly là true
          pageIndex++;
        }

        // Keep all slots including cancelled ones for proper checking
        setBookedSlots(allSlots);
      } catch (error: any) {
        console.error('Error fetching booked slots:', error);
        setBookedSlots([]);
      } finally {
        setBookedSlotsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedStudentId) {
      fetchBookedSlots(selectedStudentId);
    }
  }, [selectedStudentId, fetchBookedSlots]);

  // Force refresh dữ liệu khi cần thiết (sau khi đặt lịch hàng loạt)
  // Loại bỏ - chỉ fetch booked slots thôi, không cần force refresh toàn bộ

  // Refresh booked slots mỗi khi quay lại SelectSlotScreen (ví dụ sau khi đặt lịch hàng loạt)
  // Detect khi quay lại từ BulkBookScreen để refresh data
  useFocusEffect(
    useCallback(() => {
      // Kiểm tra xem có quay lại từ BulkBookScreen không
      const routes = navigation.getState()?.routes;
      const previousRoute = routes?.[routes.length - 2]; // Route trước đó

      if (selectedStudentId && previousRoute?.name === 'BulkBook') {
        // Refresh all data sau khi đặt lịch hàng loạt thành công
        fetchBookedSlots(selectedStudentId);
        if (selectedDate) {
          fetchBookedSlotsForSelectedDate(selectedStudentId, selectedDate);
        }
        fetchSubscriptions(selectedStudentId);
        fetchSlotsForWeek({ silent: true });
      }

      return () => {
        // Optional cleanup
      };
    }, [selectedStudentId, selectedDate, navigation, fetchBookedSlots, fetchBookedSlotsForSelectedDate, fetchSubscriptions, fetchSlotsForWeek])
  );

  // Get available dates for date selector: tất cả các ngày trong tháng của selectedDate
  const getAvailableDates = useMemo(() => {
    const dates: Date[] = [];
    // Sử dụng selectedDate thay vì today để khi chọn tháng khác, thanh sẽ hiển thị tháng đó
    const baseDate = selectedDate || new Date();
    baseDate.setHours(0, 0, 0, 0);

    // Lấy tháng và năm của selectedDate
    const currentMonth = baseDate.getMonth();
    const currentYear = baseDate.getFullYear();
    
    // Tính số ngày trong tháng
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Generate tất cả các ngày trong tháng
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      date.setHours(0, 0, 0, 0);
      dates.push(date);
    }
    
    return dates;
  }, [selectedDate]);

  // Lấy only nearby dates (14 ngày kế tiếp) để optimize API calls
  const getNearbyDatesForPreload = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nearby: Date[] = [];
    
    // Chỉ preload 14 ngày tiếp theo thay vì cả tháng
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      nearby.push(d);
    }
    return nearby;
  }, []);

  // Load slot counts for dates in current month
  const loadSlotCountsForMonth = useCallback(async (dates: Date[]) => {
    if (!selectedStudentId || dates.length === 0) {
      return;
    }

    setLoadingSlotCounts(true);
    const newDatesWithSlots = new Map(datesWithSlots);
    const newCheckedDates = new Set(checkedDates);

    try {
      // Load in batches (7 days at a time) to optimize API calls
      const batchSize = 7;
      for (let i = 0; i < dates.length; i += batchSize) {
        const batch = dates.slice(i, i + batchSize);

        // Load all dates in the batch in parallel
        const results = await Promise.all(
          batch.map(async (date) => {
            try {
              const dateStr = formatDateToYYYYMMDD(date);
              
              // Skip if already checked
              if (newCheckedDates.has(dateStr)) {
                return {
                  dateStr,
                  slotCount: newDatesWithSlots.get(dateStr) || 0,
                };
              }

              // Load all slots for this date
              const allItems = await branchSlotService.getAllAvailableSlotsForStudent(
                selectedStudentId,
                {
                  date: date,
                  pageSize: 100,
                }
              );

              return {
                dateStr,
                // API đã filter theo date => dùng trực tiếp length
                slotCount: Array.isArray(allItems) ? allItems.length : 0,
              };
            } catch (err) {
              // Ignore errors for individual date checks (e.g., no active package)
              return {
                dateStr: formatDateToYYYYMMDD(date),
                slotCount: 0,
              };
            }
          })
        );

        // Update maps
        results.forEach((result) => {
          if (result) {
            newCheckedDates.add(result.dateStr);
            newDatesWithSlots.set(result.dateStr, result.slotCount);
          }
        });

        // Update state after each batch
        setDatesWithSlots(new Map(newDatesWithSlots));
        setCheckedDates(new Set(newCheckedDates));
      }
    } catch (error) {
      console.error('Error loading slot counts:', error);
    } finally {
      setLoadingSlotCounts(false);
    }
  }, [selectedStudentId, datesWithSlots, checkedDates, formatDateToYYYYMMDD]);

  // Load slot counts when component mounts (chỉ load nearby dates để tối ưu)
  useEffect(() => {
    if (selectedStudentId && getNearbyDatesForPreload.length > 0) {
      // Only load dates that haven't been checked yet
      const uncheckedDates = getNearbyDatesForPreload.filter((date) => {
        const dateStr = formatDateToYYYYMMDD(date);
        return !checkedDates.has(dateStr);
      });

      if (uncheckedDates.length > 0) {
        loadSlotCountsForMonth(uncheckedDates);
      }
    }
  }, [selectedStudentId, getNearbyDatesForPreload, checkedDates, loadSlotCountsForMonth, formatDateToYYYYMMDD]);

  // Check if date has slots
  const dateHasSlots = useCallback((date: Date) => {
    const dateStr = formatDateToYYYYMMDD(date);
    const count = datesWithSlots.get(dateStr);
    return count !== undefined && count > 0;
  }, [datesWithSlots, formatDateToYYYYMMDD]);

  // Get slot count for date
  const getSlotCountForDate = useCallback((date: Date): number => {
    const dateStr = formatDateToYYYYMMDD(date);
    return datesWithSlots.get(dateStr) || 0;
  }, [datesWithSlots, formatDateToYYYYMMDD]);

  // Handle date change
  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      // Normalize date về 00:00:00 để đảm bảo consistency
      const normalizedDate = new Date(date);
      normalizedDate.setHours(0, 0, 0, 0);
      setSelectedDate(normalizedDate);
      
      const now = new Date();
      const currentMonday = new Date(now);
      const daysFromMonday = now.getDay() === 0 ? 6 : now.getDay() - 1;
      currentMonday.setDate(currentMonday.getDate() - daysFromMonday);
      currentMonday.setHours(0, 0, 0, 0);
      
      const selectedMonday = new Date(normalizedDate);
      const selectedDaysFromMonday = normalizedDate.getDay() === 0 ? 6 : normalizedDate.getDay() - 1;
      selectedMonday.setDate(selectedMonday.getDate() - selectedDaysFromMonday);
      selectedMonday.setHours(0, 0, 0, 0);
      
      const diffMs = selectedMonday.getTime() - currentMonday.getTime();
      const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
      setWeekOffset(diffWeeks);
    }
  };

  const handleDateSelect = (date: Date) => {
    // Normalize date về 00:00:00 để đảm bảo consistency
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    setSelectedDate(normalizedDate);
    
    const now = new Date();
    const currentMonday = new Date(now);
    const daysFromMonday = now.getDay() === 0 ? 6 : now.getDay() - 1;
    currentMonday.setDate(currentMonday.getDate() - daysFromMonday);
    currentMonday.setHours(0, 0, 0, 0);
    
    const selectedMonday = new Date(normalizedDate);
    const selectedDaysFromMonday = normalizedDate.getDay() === 0 ? 6 : normalizedDate.getDay() - 1;
    selectedMonday.setDate(selectedMonday.getDate() - selectedDaysFromMonday);
    selectedMonday.setHours(0, 0, 0, 0);
    
    const diffMs = selectedMonday.getTime() - currentMonday.getTime();
    const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
    setWeekOffset(diffWeeks);
  };

  // Check if slot is booked - improved version
  const isSlotBooked = useCallback(
    (slot: BranchSlotResponse, checkDate?: Date): StudentSlotResponse | null => {
      // Kiểm tra nếu slot đã được đánh dấu là booked từ merge
      if ((slot as any).isBookedSlot && (slot as any).studentSlotId) {
        // Tìm StudentSlotResponse tương ứng từ bookedSlotsForSelectedDate
        const bookedSlot = bookedSlotsForSelectedDate.find(
          (b) => b.id === (slot as any).studentSlotId
        );
        if (bookedSlot) {
          return bookedSlot;
        }
      }

      if (!selectedStudentId || !slot.id || bookedSlots.length === 0) return null;

      const slotDate = checkDate || selectedDate;
      if (!slotDate) return null;

      const slotDateNormalized = new Date(slotDate);
      slotDateNormalized.setHours(0, 0, 0, 0);
      const slotDateStr = slotDateNormalized.toISOString().split('T')[0];

      // Find matching booked slot
      return bookedSlots.find((booked) => {
        if (!booked.branchSlotId || !booked.date) return false;

        const bookedDateObj = new Date(booked.date);
        bookedDateObj.setHours(0, 0, 0, 0);
        const bookedDateStr = bookedDateObj.toISOString().split('T')[0];

        const status = (booked.status || '').toLowerCase();

        // For booked slots, compare with originalBranchSlotId, for available slots compare with id
        const slotBranchSlotId = (slot as any).originalBranchSlotId || slot.id;

        return booked.branchSlotId === slotBranchSlotId &&
               bookedDateStr === slotDateStr &&
               (status === 'booked' || status === 'confirmed' || status === 'active');
      }) || null;
    },
    [selectedStudentId, bookedSlots, selectedDate, bookedSlotsForSelectedDate]
  );

  const getCancelledSlot = useCallback(
    (slot: BranchSlotResponse, checkDate?: Date): StudentSlotResponse | null => {
      if (!selectedStudentId || !slot.id || bookedSlots.length === 0) return null;

      const slotDate = checkDate || selectedDate;
      if (!slotDate) return null;

      const slotDateNormalized = new Date(slotDate);
      slotDateNormalized.setHours(0, 0, 0, 0);
      const slotDateStr = slotDateNormalized.toISOString().split('T')[0];

      // Find matching cancelled slot
      return bookedSlots.find((booked) => {
        if (!booked.branchSlotId || !booked.date) return false;

        const bookedDateObj = new Date(booked.date);
        bookedDateObj.setHours(0, 0, 0, 0);
        const bookedDateStr = bookedDateObj.toISOString().split('T')[0];

        const status = (booked.status || '').toLowerCase();

        // For booked slots, compare with originalBranchSlotId, for available slots compare with id
        const slotBranchSlotId = (slot as any).originalBranchSlotId || slot.id;

        return booked.branchSlotId === slotBranchSlotId &&
               bookedDateStr === slotDateStr &&
               status === 'cancelled';
      }) || null;
    },
    [selectedStudentId, bookedSlots, selectedDate]
  );

  // Get slots for the current week - chỉ hiển thị booked slots cho staff
  const getSlotsForCurrentWeek = useMemo(() => {
    if (!selectedDate) return [];

    // Chỉ lấy booked slots trong tuần (staff chỉ xem lịch làm việc của mình)
    const bookedSlotItems = bookedSlots
      .filter((booked) => {
        // Chỉ hiển thị slots có status "Booked", "Confirmed", "Active"
        const status = (booked.status || '').toLowerCase();
        return status === 'booked' || status === 'confirmed' || status === 'active';
      })
      .map((booked): BranchSlotResponse => {

        // Tạo BranchSlotResponse từ StudentSlotResponse
        return {
          id: `booked-${booked.id}`, // Unique ID for booked slots
          originalBranchSlotId: booked.branchSlotId || '', // Keep original for reference
          weekDate: new Date(booked.date || '').getDay(),
          timeframe: booked.timeframe,
          // Lấy slotType từ branchSlot nếu có
          slotType: booked.branchSlot?.slotType ? {
            id: booked.branchSlot.slotType.id,
            name: booked.branchSlot.slotType.name,
            description: booked.branchSlot.slotType.description || null,
          } : undefined,
          // Lấy branch từ branchSlot hoặc room nếu có
          branch: booked.branchSlot ? {
            id: booked.room?.branchId || '',
            branchName: booked.branchSlot.branchName || booked.room?.branchName || '',
          } as any : undefined,
          rooms: booked.room ? [{
            id: booked.roomId || '',
            roomId: booked.roomId || '',
            roomName: booked.room?.roomName || 'Phòng',
            currentBookings: 0,
            maxCapacity: 0,
          }] : [],
          // Đánh dấu đây là booked slot
          isBookedSlot: true,
          studentSlotId: booked.id,
        } as any;
      });

    // **Deduplication: loại bỏ slots trùng lặp dựa trên studentSlotId**
    const seenStudentSlotIds = new Set<string>();
    let allSlots = bookedSlotItems.filter((slot) => {
      const studentSlotId = (slot as any).studentSlotId;
      if (seenStudentSlotIds.has(studentSlotId)) {
        return false;
      }
      seenStudentSlotIds.add(studentSlotId);
      return true;
    });

    // Lọc theo timeframe nếu có
    if (selectedTimeframe) {
      allSlots = allSlots.filter((slot) => {
        if (!slot.timeframe) return false;
        const slotKey = slot.timeframe.id || `${slot.timeframe.startTime}-${slot.timeframe.endTime}`;
        return slotKey === selectedTimeframe;
      });
    }

    // Sort theo ngày trong tuần trước, rồi theo thời gian
    allSlots.sort((a, b) => {
      // Sắp xếp theo ngày trong tuần trước
      const aWeekDate = a.weekDate || 0;
      const bWeekDate = b.weekDate || 0;
      if (aWeekDate !== bWeekDate) {
        return aWeekDate - bWeekDate;
      }

      // Nếu cùng ngày thì sắp xếp theo thời gian
      const aTime = a.timeframe?.startTime || '';
      const bTime = b.timeframe?.startTime || '';
      return aTime.localeCompare(bTime);
    });

    return allSlots;
  }, [selectedDate, bookedSlots, selectedTimeframe]);

  const handleToggleRooms = useCallback((slotId: string) => {
    setSlotRoomsState((prev) => {
      const existing = prev[slotId] || createDefaultSlotRoomsState();
      return {
        ...prev,
        [slotId]: {
          ...existing,
          expanded: !existing.expanded,
        },
      };
    });
  }, []);

  // Bulk booking logic moved to `BulkBookScreen`

  const handleBookSlot = useCallback(
    async (slot: BranchSlotResponse) => {
      if (!selectedStudentId) {
        Alert.alert('Thông báo', 'Vui lòng chọn con trước khi đặt lịch.');
        return;
      }

      // Kiểm tra slot đã được đặt chưa - sử dụng selectedDate để đảm bảo khớp với ngày đang xem
      const bookedSlot = isSlotBooked(slot, selectedDate);
      const cancelledSlot = getCancelledSlot(slot, selectedDate);
      
      if (bookedSlot && !cancelledSlot) {
        Alert.alert('Thông báo', 'Bạn đã đặt ca này rồi. Vui lòng chọn ca khác.');
        return;
      }

      const entry = slotRoomsState[slot.id];
      const roomsFromSlot = slot.rooms || [];
      
      if (!entry || roomsFromSlot.length === 0) {
        Alert.alert('Thông báo', 'Vui lòng mở danh sách phòng trước khi đặt lịch.');
        return;
      }

      if (!entry.selectedRoomId) {
        Alert.alert('Thông báo', 'Vui lòng chọn phòng để đặt lịch.');
        return;
      }

      const packageSubscriptionId = resolvePackageSubscriptionId(slot);
      if (!packageSubscriptionId) {
        Alert.alert(
          'Thiếu thông tin gói học',
          'Không tìm được gói đã đăng ký phù hợp với slot này. Vui lòng kiểm tra lại gói của con hoặc liên hệ trung tâm.'
        );
        return;
      }

      const slotDateDisplay = formatDateDisplay(selectedDate);
      const selectedRoom = roomsFromSlot.find((room) => (room.roomId || room.id) === entry.selectedRoomId);

      Alert.alert(
        'Xác nhận đặt lịch',
        `Bạn có chắc muốn đặt lịch cho con vào:\n\n${WEEKDAY_LABELS[normalizeWeekDate(slot.weekDate)].title} - ${slotDateDisplay}\n${formatTimeRange(slot.timeframe)}\nPhòng: ${selectedRoom?.roomName || 'Đang cập nhật'}`,
        [
          {
            text: 'Hủy',
            style: 'cancel',
          },
          {
            text: 'Đặt lịch',
            onPress: async () => {
              if (!entry.selectedRoomId) {
                Alert.alert('Thông báo', 'Vui lòng chọn phòng để đặt lịch.');
                return;
              }
              
              const payload = {
                studentId: selectedStudentId,
                branchSlotId: slot.id,
                packageSubscriptionId,
                roomId: entry.selectedRoomId,
                date: computeSlotDateISO(slot, weekOffset),
                parentNote: entry.parentNote?.trim() || undefined,
              };

              setSlotRoomsState((prev) => {
                const existing = prev[slot.id] || createDefaultSlotRoomsState();
                return {
                  ...prev,
                  [slot.id]: {
                    ...existing,
                    bookingLoading: true,
                  },
                };
              });

              try {
                const response = await studentSlotService.bookSlot(payload);
                Alert.alert('Thành công', response?.message || 'Đặt slot cho con thành công.');
                setSlotRoomsState((prev) => {
                  const existing = prev[slot.id] || createDefaultSlotRoomsState();
                  return {
                    ...prev,
                    [slot.id]: {
                      ...existing,
                      bookingLoading: false,
                      parentNote: '',
                    },
                  };
                });

                // Làm mới dữ liệu sau khi đặt lịch - chỉ fetch booked slots, không cần fetch lại subscriptions
                fetchBookedSlots(selectedStudentId);
                // Fetch booked slots cho ngày hiện tại để cập nhật UI
                if (selectedDate) {
                  fetchBookedSlotsForSelectedDate(selectedStudentId, selectedDate);
                }
                // Không cần fetchSlots vì booked slots sẽ cập nhật UI đủ rồi
                // fetchSlots({ page: 1, silent: true });

                // Thử lấy ra studentSlotId từ response để chuyển sang màn mua dịch vụ bổ sung
                try {
                  let bookedStudentSlotId: string | null = null;
                  const data: any = response?.data;

                  if (typeof data === 'string') {
                    bookedStudentSlotId = data;
                  } else if (data && typeof data === 'object') {
                    bookedStudentSlotId =
                      data.studentSlotId ||
                      data.id ||
                      null;
                  }

                  // Nếu API không trả về rõ ràng, fallback: gọi danh sách slot và tìm theo branchSlot + date
                  if (!bookedStudentSlotId) {
                    const slotsResponse = await studentSlotService.getStudentSlots({
                      studentId: selectedStudentId,
                      pageIndex: 1,
                      pageSize: 50,
                      status: 'Booked',
                    });

                    const targetDateOnly = computeSlotDateISO(slot, weekOffset).split('T')[0];

                    const matched = slotsResponse.items.find((s) => {
                      if (!s) return false;
                      const dateOnly = (s.date || '').split('T')[0];
                      // For booked slots, compare with originalBranchSlotId, for available slots compare with id
                      const slotBranchSlotId = (slot as any).originalBranchSlotId || slot.id;
                      return s.branchSlotId === slotBranchSlotId && dateOnly === targetDateOnly;
                    });

                    if (matched) {
                      bookedStudentSlotId = matched.id;
                    }
                  }

                  // Nếu đã có studentSlotId thì hỏi phụ huynh có muốn mua đồ ăn không
                  if (bookedStudentSlotId && selectedStudentId) {
                    Alert.alert(
                      'Mua đồ ăn cho bé',
                      'Ba/Mẹ muốn mua đồ ăn cho bé ở slot này không?',
                      [
                        {
                          text: 'Không',
                          style: 'cancel',
                        },
                        {
                          text: 'Có',
                          onPress: () => {
                            try {
                              navigation.navigate('PurchaseService', {
                                studentSlotId: bookedStudentSlotId!,
                                studentId: selectedStudentId,
                              });
                            } catch (navErr: any) {
                              Alert.alert(
                                'Lỗi',
                                navErr?.message ||
                                  'Không thể chuyển sang trang mua dịch vụ bổ sung. Vui lòng vào mục "Dịch vụ bổ sung" để mua.'
                              );
                            }
                          },
                        },
                      ]
                    );
                  }
                } catch {
                  // Nếu có lỗi trong quá trình chuẩn bị điều hướng mua dịch vụ thì bỏ qua, không chặn flow đặt lịch
                }
              } catch (error: any) {
                let message =
                  error?.response?.data?.message ||
                  error?.response?.data?.error ||
                  error?.message ||
                  'Không thể đặt slot cho con. Vui lòng thử lại sau.';
                
                Alert.alert('Lỗi', message);
                setSlotRoomsState((prev) => {
                  const existing = prev[slot.id] || createDefaultSlotRoomsState();
                  return {
                    ...prev,
                    [slot.id]: {
                      ...existing,
                      bookingLoading: false,
                    },
                  };
                });
              }
            },
          },
        ]
      );
    },
    [selectedStudentId, slotRoomsState, resolvePackageSubscriptionId, fetchSubscriptions, fetchSlotsForWeek, fetchBookedSlots, weekOffset, isSlotBooked, getCancelledSlot]
  );

  // Removed branch and school chips for cleaner UI

  // Get package name
  const getPackageName = useMemo(() => {
    if (!selectedSubscription) return 'Chưa chọn gói';
    return selectedSubscription.packageName || 'Chưa chọn gói';
  }, [selectedSubscription]);

  // Scroll to selected date
  useEffect(() => {
    if (dateScrollViewRef.current && selectedDate && getAvailableDates.length > 0) {
      const index = getAvailableDates.findIndex(
        (date) => date.toDateString() === selectedDate.toDateString()
      );
      if (index >= 0) {
        setTimeout(() => {
          dateScrollViewRef.current?.scrollTo({
            x: index * 60,
            animated: true,
          });
        }, 100);
      }
    }
  }, [selectedDate, getAvailableDates]);

  const handleRefresh = useCallback(async () => {
    setSlotsRefreshing(true);
    if (selectedStudentId) {
      // Load booked slots trước để có data khi filter slots
      await fetchBookedSlots(selectedStudentId);
      // Load slots cho tuần và subscriptions
      await Promise.all([
        fetchSlotsForWeek({ silent: true }),
        fetchSubscriptions(selectedStudentId),
      ]);
    }
    setSlotsRefreshing(false);
  }, [selectedStudentId, fetchSlotsForWeek, fetchSubscriptions, fetchBookedSlots]);

  const handlePreviousWeek = useCallback(() => {
    setWeekOffset((prev) => prev - 1);
  }, []);

  const handleNextWeek = useCallback(() => {
    setWeekOffset((prev) => prev + 1);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.SURFACE} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerTitleContainer}
          onPress={() => setShowStudentPicker(true)}
          activeOpacity={0.7}
        >
          <MaterialIcons name="child-care" size={20} color={COLORS.SURFACE} />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {selectedStudent?.name || 'Chọn con'}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={20} color={COLORS.SURFACE} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="close" size={24} color={COLORS.SURFACE} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={slotsRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Date Picker Section */}
        <View style={styles.datePickerSection}>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.datePickerText}>
              {formatDateShort(selectedDate)}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color={COLORS.SURFACE} />
          </TouchableOpacity>
        </View>

        {/* Student Info Section */}
        {selectedStudent && (
          <View style={styles.selectedStudentInfoCard}>
            <View style={styles.selectedStudentHeaderRow}>
              <View style={styles.selectedStudentAvatarContainer}>
                {selectedStudent.image ? (
                  <Image
                    source={{ uri: selectedStudent.image }}
                    style={styles.selectedStudentAvatar}
                  />
                ) : (
                  <View style={styles.selectedStudentAvatarPlaceholder}>
                    <MaterialIcons name="person" size={24} color={COLORS.PRIMARY} />
                  </View>
                )}
              </View>
              <View style={styles.selectedStudentInfoContent}>
                <Text style={styles.selectedStudentName}>{selectedStudent.name}</Text>
              </View>
            </View>
            <View style={styles.selectedStudentMetaRow}>
              <MaterialIcons name="school" size={16} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.selectedStudentMeta}>{selectedStudent.schoolName}</Text>
            </View>
            <View style={styles.selectedStudentMetaRow}>
              <MaterialIcons name="location-on" size={16} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.selectedStudentMeta}>{selectedStudent.branchName}</Text>
            </View>
          </View>
        )}


        {/* Slots List */}
        <View style={styles.slotsContainer}>
          <View style={styles.slotsHeader}>
            <Text style={styles.slotsTitle}>Lịch làm việc trong tuần</Text>
            <Text style={styles.weekRangeText}>{getWeekRange().displayText}</Text>
          </View>

          {slotsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
              <Text style={styles.loadingText}>Đang tải...</Text>
            </View>
          ) : getSlotsForCurrentWeek.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="event-busy" size={48} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.emptyText}>Không có slot nào trong tuần này</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.emptyButtonText}>Quay lại tìm kiếm</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.slotsList}>
              {getSlotsForCurrentWeek.map((slot) => {
                // Tính ngày thực tế của slot để kiểm tra đã đặt chưa và hiển thị
                const slotDate = getWeekDate(weekOffset, normalizeWeekDate(slot.weekDate));
                const bookedSlot = isSlotBooked(slot, slotDate);
                const cancelledSlot = getCancelledSlot(slot, slotDate);
                const roomState = slotRoomsState[slot.id];
                const roomsFromSlot = slot.rooms || [];
                const isExpanded = roomState?.expanded ?? false;
                const selectedRoomId = roomState?.selectedRoomId;

                // Tính thông tin hiển thị ngày
                const slotDateDisplay = formatDateDisplay(slotDate);
                const slotWeekdayLabel = WEEKDAY_LABELS[normalizeWeekDate(slot.weekDate)]?.title || 'Chủ nhật';

                return (
                  <View key={slot.id} style={styles.slotCard}>
                    {/* Date Header */}
                    <View style={styles.slotDateHeader}>
                      <Text style={styles.slotDateText}>{slotWeekdayLabel}, {slotDateDisplay}</Text>
                      {slot.isBookedSlot && (
                        <View style={styles.slotBookedBadge}>
                          <MaterialIcons name="check-circle" size={16} color={COLORS.SUCCESS} />
                          <Text style={styles.slotBookedText}>Đã đặt</Text>
                        </View>
                      )}
                    </View>

                    {/* Time Section */}
                    <View style={styles.slotTimeSection}>
                      <View style={styles.slotTimeLeft}>
                        <Text style={styles.slotTime}>{formatTime(slot.timeframe?.startTime)}</Text>
                      </View>

                      <View style={styles.slotDuration}>
                        <View style={styles.slotDurationLine} />
                        <Text style={styles.slotDurationText}>
                          {(() => {
                            if (!slot.timeframe?.startTime || !slot.timeframe?.endTime) return '--';
                            try {
                              const startParts = slot.timeframe.startTime.split(':');
                              const endParts = slot.timeframe.endTime.split(':');
                              const startHours = parseInt(startParts[0] || '0', 10);
                              const startMins = parseInt(startParts[1] || '0', 10);
                              const endHours = parseInt(endParts[0] || '0', 10);
                              const endMins = parseInt(endParts[1] || '0', 10);

                              const startTotal = startHours * 60 + startMins;
                              const endTotal = endHours * 60 + endMins;
                              const diffMinutes = endTotal - startTotal;
                              const hours = Math.floor(diffMinutes / 60);

                              return `${hours}h`;
                            } catch {
                              return '--';
                            }
                          })()}
                        </Text>
                        <View style={styles.slotDurationLine} />
                      </View>

                      <View style={styles.slotTimeRight}>
                        <Text style={styles.slotTime}>{formatTime(slot.timeframe?.endTime)}</Text>
                      </View>
                    </View>

                    {/* Info Section */}
                    <View style={styles.slotInfoSection}>
                      {slot.slotType?.name && (
                        <View style={styles.slotInfoRow}>
                          <MaterialIcons name="category" size={16} color={COLORS.TEXT_SECONDARY} />
                          <Text style={styles.slotInfoText}>{slot.slotType.name}</Text>
                        </View>
                      )}
                      <View style={styles.slotInfoRow}>
                        <MaterialIcons name="card-membership" size={16} color={COLORS.TEXT_SECONDARY} />
                        <Text style={styles.slotInfoText}>{getPackageName}</Text>
                      </View>
                    </View>

                    {/* Status and Action */}
                    {(bookedSlot && !cancelledSlot) || slot.isBookedSlot ? (
                      <View style={styles.slotActionSection}>
                        <View style={styles.slotBookedBadge}>
                          <MaterialIcons name="check-circle" size={16} color={COLORS.SUCCESS} />
                          <Text style={styles.slotBookedText}>Đã đặt</Text>
                        </View>
                        {bookedSlot && selectedStudentId && (
                          <TouchableOpacity
                            onPress={() => {
                              navigation.navigate('ClassDetail', {
                                slotId: bookedSlot.id,
                                studentId: selectedStudentId,
                              });
                            }}
                            activeOpacity={0.7}
                          >
                            <MaterialIcons name="chevron-right" size={20} color={COLORS.TEXT_SECONDARY} />
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.slotExpandButton}
                          onPress={() => handleToggleRooms(slot.id)}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons
                            name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                            size={24}
                            color={COLORS.PRIMARY}
                          />
                          <Text style={styles.slotExpandText}>
                            {isExpanded ? 'Ẩn phòng' : 'Chọn phòng'}
                          </Text>
                        </TouchableOpacity>

                        {isExpanded && (() => {
                          // Loại bỏ duplicate rooms dựa trên roomId hoặc id
                          const seenIdentifiers = new Set<string>();
                          const uniqueRooms = roomsFromSlot.filter((room) => {
                            // Ưu tiên roomId, nếu không có thì dùng id
                            const roomIdentifier = room.roomId || room.id;
                            
                            // Nếu không có identifier, bỏ qua
                            if (!roomIdentifier) return false;
                            
                            // Chuyển thành string để so sánh chính xác
                            const identifierStr = String(roomIdentifier);
                            
                            // Nếu đã thấy identifier này rồi, bỏ qua
                            if (seenIdentifiers.has(identifierStr)) {
                              return false;
                            }
                            
                            // Đánh dấu đã thấy và giữ lại phòng này
                            seenIdentifiers.add(identifierStr);
                            return true;
                          });
                          
                          return (
                            <View style={styles.roomsContainer}>
                              {uniqueRooms.length === 0 ? (
                                <Text style={styles.noRoomsText}>Không có phòng nào</Text>
                              ) : (
                                uniqueRooms.map((room) => {
                                  const isSelected = (room.roomId || room.id) === selectedRoomId;
                                  const staffName = room.staff?.staffName || room.staff?.fullName || null;
                                  const staffRole = room.staff?.staffRole || room.staff?.role || null;
                                  const facilityName = room.facilityName || null;
                                  
                                  return (
                                    <TouchableOpacity
                                      key={room.roomId || room.id || `room-${Math.random()}`}
                                      style={[
                                        styles.roomItem,
                                        isSelected && styles.roomItemSelected,
                                      ]}
                                      onPress={() => {
                                        setSlotRoomsState((prev) => {
                                          const existing = prev[slot.id] || createDefaultSlotRoomsState();
                                          return {
                                            ...prev,
                                            [slot.id]: {
                                              ...existing,
                                              selectedRoomId: room.roomId || room.id || null,
                                            },
                                          };
                                        });
                                      }}
                                    >
                                    <MaterialIcons
                                      name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                                      size={20}
                                      color={isSelected ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY}
                                    />
                                    <View style={styles.roomItemContent}>
                                      <Text style={[
                                        styles.roomItemText,
                                        isSelected && styles.roomItemTextSelected,
                                      ]}>
                                        {room.roomName || 'Chưa có tên phòng'}
                                      </Text>
                                      {facilityName && (
                                        <View style={styles.roomItemMeta}>
                                          <MaterialIcons name="business" size={14} color={COLORS.TEXT_SECONDARY} />
                                          <Text style={styles.roomItemMetaText}>{facilityName}</Text>
                                        </View>
                                      )}
                                      {staffName && (
                                        <View style={styles.roomItemMeta}>
                                          <MaterialIcons name="person" size={14} color={COLORS.TEXT_SECONDARY} />
                                          <Text style={styles.roomItemMetaText}>
                                            {staffName}
                                          </Text>
                                        </View>
                                      )}
                                    </View>
                                  </TouchableOpacity>
                                );
                              })
                            )}
                            
                            {/* Parent Note Input */}
                            {selectedRoomId && (
                              <View style={styles.parentNoteContainer}>
                                <View style={styles.parentNoteHeader}>
                                  <MaterialIcons name="note" size={16} color={COLORS.PRIMARY} />
                                  <Text style={styles.parentNoteLabel}>Ghi chú cho con (tùy chọn)</Text>
                                </View>
                                <TextInput
                                  style={styles.parentNoteInput}
                                  placeholder="Nhập ghi chú cho con (ví dụ: Nhớ uống nước, mặc áo ấm...)"
                                  placeholderTextColor={COLORS.TEXT_SECONDARY}
                                  value={roomState?.parentNote || ''}
                                  onChangeText={(text) => {
                                    setSlotRoomsState((prev) => {
                                      const existing = prev[slot.id] || createDefaultSlotRoomsState();
                                      return {
                                        ...prev,
                                        [slot.id]: {
                                          ...existing,
                                          parentNote: text,
                                        },
                                      };
                                    });
                                  }}
                                  multiline
                                  numberOfLines={3}
                                  maxLength={500}
                                  textAlignVertical="top"
                                />
                                <Text style={styles.parentNoteCharCount}>
                                  {(roomState?.parentNote || '').length}/500
                                </Text>
                              </View>
                            )}
                            
                            {selectedRoomId && (
                              <TouchableOpacity
                                style={[
                                  styles.bookButton,
                                  roomState?.bookingLoading && styles.bookButtonDisabled,
                                ]}
                                onPress={() => handleBookSlot(slot)}
                                disabled={roomState?.bookingLoading}
                              >
                                {roomState?.bookingLoading ? (
                                  <ActivityIndicator size="small" color={COLORS.SURFACE} />
                                ) : (
                                  <>
                                    <MaterialIcons name="check-circle" size={20} color={COLORS.SURFACE} />
                                    <Text style={styles.bookButtonText}>Đặt lịch</Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            )}

                            {/* Bulk booking - có thể access qua deep link hoặc menu */}
                            {/* Để test: navigation.navigate('BulkBook', { studentId: selectedStudentId, branchSlotId: slot.id, packageSubscriptionId: selectedSubscriptionId, roomId: roomState?.selectedRoomId }) */}
                          </View>
                          );
                        })()}
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Student Picker Modal */}
      <Modal
        visible={showStudentPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStudentPicker(false)}
      >
        <TouchableOpacity
          style={styles.studentPickerOverlay}
          activeOpacity={1}
          onPress={() => setShowStudentPicker(false)}
        >
          <View style={styles.studentPickerContainer}>
            <View style={styles.studentPickerHeader}>
              <Text style={styles.studentPickerTitle}>Chọn con</Text>
              <TouchableOpacity onPress={() => setShowStudentPicker(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.studentPickerList}>
              {students.map((student) => {
                const isSelected = selectedStudentId === student.id;
                return (
                  <TouchableOpacity
                    key={student.id}
                    style={[
                      styles.studentPickerItem,
                      isSelected && styles.studentPickerItemActive,
                    ]}
                    onPress={() => {
                      setSelectedStudentId(student.id);
                      setShowStudentPicker(false);
                      fetchSlotsForWeek();
                      fetchBookedSlots(student.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.studentPickerItemContent}>
                      <View style={styles.studentPickerItemIcon}>
                        <MaterialIcons
                          name="child-care"
                          size={24}
                          color={isSelected ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY}
                        />
                      </View>
                      <View style={styles.studentPickerItemInfo}>
                        <Text
                          style={[
                            styles.studentPickerItemName,
                            isSelected && styles.studentPickerItemNameActive,
                          ]}
                        >
                          {student.name}
                        </Text>
                        <Text style={styles.studentPickerItemBranch}>
                          {student.branchName}
                        </Text>
                      </View>
                      {isSelected && (
                        <MaterialIcons name="check-circle" size={24} color={COLORS.PRIMARY} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    height: 56,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SPACING.SM,
    gap: SPACING.XS,
  },
  headerTitle: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.MD,
  },
  datePickerSection: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    marginBottom: SPACING.MD,
    padding: SPACING.MD,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePickerText: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  selectedStudentInfoCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    marginBottom: SPACING.MD,
    padding: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  selectedStudentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  selectedStudentAvatarContainer: {
    marginRight: SPACING.MD,
  },
  selectedStudentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  selectedStudentAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.PRIMARY_LIGHT + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedStudentInfoContent: {
    flex: 1,
  },
  selectedStudentNameRow: {
    marginBottom: SPACING.SM,
  },
  selectedStudentName: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  selectedStudentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
    gap: SPACING.SM,
  },
  selectedStudentMeta: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    flex: 1,
  },
  daySelectorSection: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    marginBottom: SPACING.MD,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayScrollContainer: {
    paddingRight: SPACING.MD,
  },
  dayScrollView: {
    flex: 1,
  },
  dayItem: {
    width: 60,
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.XS,
    borderRadius: 8,
    marginRight: SPACING.XS,
    backgroundColor: 'transparent',
  },
  dayItemActive: {
    backgroundColor: COLORS.SURFACE + '30',
    borderWidth: 1,
    borderColor: COLORS.SURFACE,
  },
  dayItemNoSlots: {
    opacity: 0.5,
  },
  dayItemDay: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.SURFACE,
    fontWeight: '600',
    marginBottom: SPACING.XS / 2,
  },
  dayItemDayActive: {
    color: COLORS.SURFACE,
    fontWeight: '700',
  },
  dayItemDate: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.SURFACE + 'CC',
  },
  dayItemDateActive: {
    color: COLORS.SURFACE,
    fontWeight: '600',
  },
  dayItemBadge: {
    marginTop: SPACING.XS / 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayItemBadgeText: {
    fontSize: FONTS.SIZES.XS,
    fontWeight: '700',
    color: COLORS.PRIMARY,
  },
  calendarButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE + '20',
    borderRadius: 8,
  },
  slotsContainer: {
    marginTop: SPACING.MD,
  },
  slotsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  slotsTitle: {
    fontSize: FONTS.SIZES.XL,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  weekRangeText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    backgroundColor: COLORS.PRIMARY_LIGHT + '20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
    gap: SPACING.XS,
  },
  selectAllButtonText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: SPACING.XL,
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: SPACING.XL,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
  },
  emptyText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.LG,
  },
  emptyButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  slotsList: {
    gap: SPACING.MD,
  },
  slotCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  slotBookedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SUCCESS_BG,
    padding: SPACING.SM,
    borderRadius: 8,
    marginBottom: SPACING.MD,
    gap: SPACING.XS,
  },
  slotBookedNoticeText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.SUCCESS,
    flex: 1,
  },
  slotDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
    paddingBottom: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  slotDateText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  slotTimeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  slotTimeLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  slotTime: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  slotLocation: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
  slotDuration: {
    alignItems: 'center',
    marginHorizontal: SPACING.SM,
  },
  slotDurationLine: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.BORDER,
  },
  slotDurationText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.PRIMARY,
    marginVertical: SPACING.XS,
  },
  slotTimeRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  slotInfoSection: {
    marginBottom: SPACING.MD,
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  slotInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  slotInfoText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.SM,
    flex: 1,
  },
  slotActionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  slotBookedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SUCCESS_BG,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 8,
    gap: SPACING.XS,
  },
  slotBookedText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.SUCCESS,
  },
  slotExpandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    marginTop: SPACING.MD,
  },
  slotExpandText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.PRIMARY,
    marginLeft: SPACING.XS,
  },
  roomsContainer: {
    marginTop: SPACING.MD,
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  noRoomsText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    padding: SPACING.MD,
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.MD,
    borderRadius: 8,
    marginBottom: SPACING.SM,
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  roomItemSelected: {
    backgroundColor: COLORS.PRIMARY_LIGHT + '20',
    borderColor: COLORS.PRIMARY,
  },
  roomItemContent: {
    flex: 1,
    marginLeft: SPACING.SM,
  },
  roomItemText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  roomItemTextSelected: {
    color: COLORS.PRIMARY,
  },
  roomItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.XS / 2,
    gap: SPACING.XS / 2,
  },
  roomItemMetaText: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    flex: 1,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.MD,
    borderRadius: 8,
    marginTop: SPACING.MD,
    gap: SPACING.XS,
  },
  bookButtonDisabled: {
    opacity: 0.6,
  },
  bookButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  parentNoteContainer: {
    marginTop: SPACING.MD,
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  parentNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
    gap: SPACING.XS,
  },
  parentNoteLabel: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  parentNoteInput: {
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    padding: SPACING.MD,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    minHeight: 80,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  parentNoteCharCount: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'right',
    marginTop: SPACING.XS,
  },
  studentPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  studentPickerContainer: {
    backgroundColor: COLORS.SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  studentPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  studentPickerTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  studentPickerList: {
    maxHeight: 400,
  },
  studentPickerItem: {
    padding: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  studentPickerItemActive: {
    backgroundColor: COLORS.PRIMARY_LIGHT + '20',
  },
  studentPickerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentPickerItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.PRIMARY_LIGHT + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  studentPickerItemInfo: {
    flex: 1,
  },
  studentPickerItemName: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  studentPickerItemNameActive: {
    color: COLORS.PRIMARY,
  },
  studentPickerItemBranch: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  bulkBookButton: {
    marginTop: SPACING.MD,
    flexDirection: 'row',
    gap: SPACING.SM,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.SM,
    borderRadius: 10,
  },
  bulkBookButtonDisabled: {
    opacity: 0.7,
  },
  bulkBookButtonText: {
    color: COLORS.SURFACE,
    fontSize: FONTS.SIZES.SM,
    fontWeight: '700',
  },
  slotCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.SM,
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 8,
    marginBottom: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    gap: SPACING.SM,
  },
  slotCheckboxContainerSelected: {
    backgroundColor: COLORS.PRIMARY_LIGHT + '20',
    borderColor: COLORS.PRIMARY,
  },
  slotCheckboxText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    flex: 1,
  },
  slotCheckboxTextSelected: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.MD,
    backgroundColor: 'transparent',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  fabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    borderRadius: 28,
    gap: SPACING.SM,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    minWidth: 160,
  },
  fabButtonDisabled: {
    opacity: 0.6,
  },
  fabButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '700',
    color: COLORS.SURFACE,
  },
  studentInfoSection: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  studentInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
    paddingBottom: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  studentInfoAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.PRIMARY_LIGHT + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  studentInfoContent: {
    flex: 1,
  },
  studentInfoName: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  studentInfoSchool: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  studentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
    gap: SPACING.SM,
  },
  studentInfoText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  studentInfoPackageCard: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 8,
    padding: SPACING.MD,
    marginTop: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  studentInfoPackageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
    gap: SPACING.SM,
  },
  studentInfoPackageName: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  studentInfoPackageSlots: {
    marginTop: SPACING.SM,
  },
  studentInfoSlotsText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  studentInfoSlotsValue: {
    fontWeight: '700',
    color: COLORS.PRIMARY,
  },
});

export default SelectSlotScreen;

