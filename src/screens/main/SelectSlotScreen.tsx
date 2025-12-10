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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
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
  const { studentId, initialDate } = route.params || {};

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
  
  // Multiple booking states
  const [selectedSlotsForMultiple, setSelectedSlotsForMultiple] = useState<Record<string, {
    slot: BranchSlotResponse;
    roomId: string;
    date: string;
    parentNote?: string;
  }>>({});
  const [bookingMultiple, setBookingMultiple] = useState(false);

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

  const fetchSlots = useCallback(
    async ({ page = 1, append = false, silent = false }: { page?: number; append?: boolean; silent?: boolean } = {}) => {
      if (!selectedStudentId) {
        return;
      }

      if (!append && !silent) {
        setSlotsLoading(true);
      }
      setSlotsError(null);

      try {
        const response = await branchSlotService.getAvailableSlotsForStudent(
          selectedStudentId,
          page,
          PAGE_SIZE
        );
        const items = response?.items ?? [];

        setSlots((prev) => (append ? [...prev, ...items] : items));
        setPagination({
          pageIndex: response.pageIndex,
          totalPages: response.totalPages,
          totalCount: response.totalCount,
          pageSize: response.pageSize,
          hasNextPage: response.hasNextPage,
        });
      } catch (error: any) {
        const message =
          error?.message ||
          error?.response?.data?.message ||
          'Không thể tải danh sách slot phù hợp. Vui lòng thử lại.';
        setSlotsError(message);

        if (!append) {
          setSlots([]);
          setPagination(null);
        }
      } finally {
        if (!append) {
          setSlotsLoading(false);
          setSlotsRefreshing(false);
        }
      }
    },
    [selectedStudentId]
  );

  useEffect(() => {
    if (selectedStudentId) {
      fetchSlots({ page: 1 });
    }
  }, [selectedStudentId, fetchSlots]);

  useEffect(() => {
    if (slots.length > 0) {
      setSlotRoomsState((prev) => {
        const updated: Record<string, SlotRoomsStateEntry> = {};
        slots.forEach((slot) => {
          const existing = prev[slot.id];
          const roomsFromSlot = slot.rooms || [];
          updated[slot.id] = {
            ...(existing || createDefaultSlotRoomsState()),
            rooms: roomsFromSlot.length > 0 ? roomsFromSlot : (existing?.rooms || []),
            selectedRoomId: existing?.selectedRoomId || roomsFromSlot[0]?.roomId || roomsFromSlot[0]?.id || null,
          };
        });
        return updated;
      });
    }
  }, [slots]);

  const fetchBookedSlots = useCallback(
    async (studentId: string) => {
      setBookedSlotsLoading(true);
      try {
        const response = await studentSlotService.getStudentSlots({
          studentId,
          pageIndex: 1,
          pageSize: 100,
          upcomingOnly: false,
        });
        const allSlots = response.items || [];
        const activeSlots = allSlots.filter((slot) => {
          const status = (slot.status || '').toLowerCase();
          return status !== 'cancelled';
        });
        setBookedSlots(activeSlots);
      } catch (error: any) {
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

  // Group slots by weekday
  const groupedSlots = useMemo(() => {
    const grouped: Record<WeekdayKey, BranchSlotResponse[]> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };

    slots.forEach((slot) => {
      const day = normalizeWeekDate(slot.weekDate);
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(slot);
    });

    return grouped;
  }, [slots]);

  // Get slots for selected date
  const getSlotsForSelectedDate = useMemo(() => {
    if (!selectedDate || !slots.length) return [];
    const selectedDay = selectedDate.getDay();
    const normalizedDay = selectedDay === 0 ? 0 : selectedDay;
    let daySlots = groupedSlots[normalizedDay as WeekdayKey] || [];
    
    if (selectedTimeframe) {
      daySlots = daySlots.filter((slot) => {
        if (!slot.timeframe) return false;
        const slotKey = slot.timeframe.id || `${slot.timeframe.startTime}-${slot.timeframe.endTime}`;
        return slotKey === selectedTimeframe;
      });
    }
    
    return daySlots;
  }, [selectedDate, groupedSlots, selectedTimeframe]);

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

  // Check if date has slots
  const dateHasSlots = useCallback((date: Date) => {
    const day = date.getDay();
    const normalizedDay = day === 0 ? 0 : day;
    const daySlots = groupedSlots[normalizedDay as WeekdayKey] || [];
    return daySlots.length > 0;
  }, [groupedSlots]);

  // Handle date change
  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      const now = new Date();
      const currentMonday = new Date(now);
      const daysFromMonday = now.getDay() === 0 ? 6 : now.getDay() - 1;
      currentMonday.setDate(currentMonday.getDate() - daysFromMonday);
      currentMonday.setHours(0, 0, 0, 0);
      
      const selectedMonday = new Date(date);
      const selectedDaysFromMonday = date.getDay() === 0 ? 6 : date.getDay() - 1;
      selectedMonday.setDate(selectedMonday.getDate() - selectedDaysFromMonday);
      selectedMonday.setHours(0, 0, 0, 0);
      
      const diffMs = selectedMonday.getTime() - currentMonday.getTime();
      const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
      setWeekOffset(diffWeeks);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    const now = new Date();
    const currentMonday = new Date(now);
    const daysFromMonday = now.getDay() === 0 ? 6 : now.getDay() - 1;
    currentMonday.setDate(currentMonday.getDate() - daysFromMonday);
    currentMonday.setHours(0, 0, 0, 0);
    
    const selectedMonday = new Date(date);
    const selectedDaysFromMonday = date.getDay() === 0 ? 6 : date.getDay() - 1;
    selectedMonday.setDate(selectedMonday.getDate() - selectedDaysFromMonday);
    selectedMonday.setHours(0, 0, 0, 0);
    
    const diffMs = selectedMonday.getTime() - currentMonday.getTime();
    const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
    setWeekOffset(diffWeeks);
  };

  // Check if slot is booked
  const isSlotBooked = useCallback(
    (slot: BranchSlotResponse, checkDate?: Date): StudentSlotResponse | null => {
      if (!selectedStudentId || !slot.id) return null;
      
      // Sử dụng checkDate nếu có (thường là selectedDate), nếu không thì tính từ weekOffset
      const slotDate = checkDate || getWeekDate(weekOffset, normalizeWeekDate(slot.weekDate));
      // Normalize ngày về UTC để so sánh chính xác
      const slotDateNormalized = new Date(slotDate);
      slotDateNormalized.setHours(0, 0, 0, 0);
      const slotDateStr = slotDateNormalized.toISOString().split('T')[0];
      
      return (
        bookedSlots.find((booked) => {
          if (booked.branchSlotId !== slot.id) return false;
          if (!booked.date) return false;
          
          // Normalize booked date về UTC để so sánh
          const bookedDateObj = new Date(booked.date);
          bookedDateObj.setHours(0, 0, 0, 0);
          const bookedDateStr = bookedDateObj.toISOString().split('T')[0];
          
          return bookedDateStr === slotDateStr;
        }) || null
      );
    },
    [bookedSlots, selectedStudentId, weekOffset]
  );

  const getCancelledSlot = useCallback(
    (slot: BranchSlotResponse, checkDate?: Date): StudentSlotResponse | null => {
      if (!selectedStudentId || !slot.id) return null;
      // Sử dụng checkDate nếu có (thường là selectedDate), nếu không thì tính từ weekOffset
      const slotDate = checkDate || getWeekDate(weekOffset, normalizeWeekDate(slot.weekDate));
      // Normalize ngày về UTC để so sánh chính xác
      const slotDateNormalized = new Date(slotDate);
      slotDateNormalized.setHours(0, 0, 0, 0);
      const slotDateStr = slotDateNormalized.toISOString().split('T')[0];
      
      return (
        bookedSlots.find((booked) => {
          if (booked.branchSlotId !== slot.id) return false;
          if (!booked.date) return false;
          
          // Normalize booked date về UTC để so sánh
          const bookedDateObj = new Date(booked.date);
          bookedDateObj.setHours(0, 0, 0, 0);
          const bookedDateStr = bookedDateObj.toISOString().split('T')[0];
          const status = (booked.status || '').toLowerCase();
          
          return bookedDateStr === slotDateStr && status === 'cancelled';
        }) || null
      );
    },
    [bookedSlots, selectedStudentId, weekOffset]
  );

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

  // Toggle slot selection for multiple booking
  const handleToggleSlotSelection = useCallback((slot: BranchSlotResponse, checkDate?: Date) => {
    const slotDate = checkDate || getWeekDate(weekOffset, normalizeWeekDate(slot.weekDate));
    const bookedSlot = isSlotBooked(slot, slotDate);
    const cancelledSlot = getCancelledSlot(slot, slotDate);
    
    // Không cho chọn slot đã đặt
    if (bookedSlot && !cancelledSlot) {
      Alert.alert('Thông báo', 'Slot này đã được đặt rồi.');
      return;
    }

    const entry = slotRoomsState[slot.id];
    const roomsFromSlot = slot.rooms || [];
    
    if (!entry || roomsFromSlot.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng mở danh sách phòng và chọn phòng trước khi chọn slot.');
      return;
    }

    if (!entry.selectedRoomId) {
      Alert.alert('Thông báo', 'Vui lòng chọn phòng trước khi chọn slot.');
      return;
    }

    const slotKey = `${slot.id}_${computeSlotDateISO(slot, weekOffset)}`;
    
    setSelectedSlotsForMultiple((prev) => {
      if (prev[slotKey]) {
        // Bỏ chọn
        const newState = { ...prev };
        delete newState[slotKey];
        return newState;
      } else {
        // Chọn
        return {
          ...prev,
          [slotKey]: {
            slot,
            roomId: entry.selectedRoomId!,
            date: computeSlotDateISO(slot, weekOffset),
            parentNote: entry.parentNote?.trim() || undefined,
          },
        };
      }
    });
  }, [slotRoomsState, weekOffset, isSlotBooked, getCancelledSlot]);

  // Select/Deselect all available slots
  const handleSelectAllSlots = useCallback(() => {
    const availableSlots: Record<string, {
      slot: BranchSlotResponse;
      roomId: string;
      date: string;
      parentNote?: string;
    }> = {};

    // Lấy tất cả slot có thể chọn được
    getSlotsForSelectedDate.forEach((slot) => {
      const slotDate = selectedDate || getWeekDate(weekOffset, normalizeWeekDate(slot.weekDate));
      const bookedSlot = isSlotBooked(slot, slotDate);
      const cancelledSlot = getCancelledSlot(slot, slotDate);
      
      // Chỉ chọn slot chưa đặt hoặc đã hủy
      if (bookedSlot && !cancelledSlot) {
        return;
      }

      const entry = slotRoomsState[slot.id];
      const roomsFromSlot = slot.rooms || [];
      
      // Chỉ chọn slot đã chọn phòng
      if (!entry || roomsFromSlot.length === 0 || !entry.selectedRoomId) {
        return;
      }

      const slotKey = `${slot.id}_${computeSlotDateISO(slot, weekOffset)}`;
      
      // Kiểm tra package subscription
      const packageSubscriptionId = resolvePackageSubscriptionId(slot);
      if (!packageSubscriptionId) {
        return;
      }

      availableSlots[slotKey] = {
        slot,
        roomId: entry.selectedRoomId,
        date: computeSlotDateISO(slot, weekOffset),
        parentNote: entry.parentNote?.trim() || undefined,
      };
    });

    if (Object.keys(availableSlots).length === 0) {
      Alert.alert('Thông báo', 'Không có slot nào có thể chọn. Vui lòng chọn phòng cho các slot trước.');
      return;
    }

    setSelectedSlotsForMultiple((prev) => {
      // Kiểm tra xem tất cả slot có thể chọn đã được chọn chưa
      const allSelected = Object.keys(availableSlots).every(key => prev[key]);
      
      if (allSelected) {
        // Bỏ chọn tất cả slot hiện tại
        const newState = { ...prev };
        Object.keys(availableSlots).forEach(key => {
          delete newState[key];
        });
        return newState;
      } else {
        // Chọn tất cả slot có thể chọn
        return {
          ...prev,
          ...availableSlots,
        };
      }
    });
  }, [getSlotsForSelectedDate, selectedDate, weekOffset, slotRoomsState, isSlotBooked, getCancelledSlot, resolvePackageSubscriptionId]);

  // Book multiple slots
  const handleBookMultipleSlots = useCallback(async () => {
    if (!selectedStudentId) {
      Alert.alert('Thông báo', 'Vui lòng chọn con trước khi đặt lịch.');
      return;
    }

    const selectedSlotsArray = Object.values(selectedSlotsForMultiple);
    if (selectedSlotsArray.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất một slot để đặt lịch.');
      return;
    }

    // Validate tất cả slots có packageSubscriptionId
    const slotsWithPackage = selectedSlotsArray.map((item) => {
      const packageSubscriptionId = resolvePackageSubscriptionId(item.slot);
      if (!packageSubscriptionId) {
        return null;
      }
      return {
        ...item,
        packageSubscriptionId,
      };
    });

    const invalidSlots = slotsWithPackage.filter(s => s === null);
    if (invalidSlots.length > 0) {
      Alert.alert(
        'Thiếu thông tin gói học',
        'Một số slot không có gói đã đăng ký phù hợp. Vui lòng kiểm tra lại gói của con hoặc liên hệ trung tâm.'
      );
      return;
    }

    // Kiểm tra tất cả slots có cùng packageSubscriptionId
    const packageIds = new Set(slotsWithPackage.map(s => s!.packageSubscriptionId));
    if (packageIds.size > 1) {
      Alert.alert(
        'Thông báo',
        'Tất cả các slot phải sử dụng cùng một gói học. Vui lòng chọn lại các slot phù hợp.'
      );
      return;
    }

    const packageSubscriptionId = slotsWithPackage[0]!.packageSubscriptionId;
    const slotsForRequest = slotsWithPackage.map((item) => ({
      branchSlotId: item!.slot.id,
      roomId: item!.roomId,
      date: item!.date,
      parentNote: item!.parentNote,
    }));

    const slotDatesDisplay = selectedSlotsArray
      .map((item) => {
        const slotDate = new Date(item.date);
        return `${WEEKDAY_LABELS[normalizeWeekDate(item.slot.weekDate)].title} - ${formatDateDisplay(slotDate)}`;
      })
      .join('\n');

    Alert.alert(
      'Xác nhận đặt nhiều lịch',
      `Bạn có chắc muốn đặt ${selectedSlotsArray.length} lịch cho con?\n\n${slotDatesDisplay}`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Đặt lịch',
          onPress: async () => {
            setBookingMultiple(true);
            try {
              const payload = {
                studentId: selectedStudentId,
                packageSubscriptionId,
                slots: slotsForRequest,
              };

              const response = await studentSlotService.bookMultipleSlots(payload);
              
              // Xử lý kết quả
              if (response.failedSlots && response.failedSlots.length > 0) {
                const failedCount = response.failedSlots.length;
                const successCount = selectedSlotsArray.length - failedCount;
                const failedMessages = response.failedSlots
                  .map((f) => `- ${formatDateDisplay(new Date(f.date))}: ${f.error}`)
                  .join('\n');
                
                Alert.alert(
                  'Đặt lịch một phần',
                  `Đã đặt thành công ${successCount} lịch.\n\nCó ${failedCount} lịch không đặt được:\n${failedMessages}`,
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Thành công', response?.message || `Đã đặt thành công ${selectedSlotsArray.length} lịch cho con.`);
              }

              // Clear selected slots
              setSelectedSlotsForMultiple({});
              
              // Refresh data
              await Promise.all([
                fetchSubscriptions(selectedStudentId),
                fetchSlots({ page: 1, silent: true }),
                fetchBookedSlots(selectedStudentId),
              ]);
            } catch (error: any) {
              let message =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                'Không thể đặt nhiều slot cho con. Vui lòng thử lại sau.';
              
              Alert.alert('Lỗi', message);
            } finally {
              setBookingMultiple(false);
            }
          },
        },
      ]
    );
  }, [selectedStudentId, selectedSlotsForMultiple, resolvePackageSubscriptionId, fetchSubscriptions, fetchSlots, fetchBookedSlots, weekOffset]);

  const handleBookSlot = useCallback(
    async (slot: BranchSlotResponse) => {
      if (!selectedStudentId) {
        Alert.alert('Thông báo', 'Vui lòng chọn con trước khi đặt lịch.');
        return;
      }

      // Kiểm tra slot đã được đặt chưa - sử dụng selectedDate để đảm bảo khớp với ngày đang xem
      const slotDate = getWeekDate(weekOffset, normalizeWeekDate(slot.weekDate));
      const bookedSlot = isSlotBooked(slot, slotDate);
      const cancelledSlot = getCancelledSlot(slot, slotDate);
      
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

      const slotDateDisplay = formatDateDisplay(slotDate);
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
                fetchSubscriptions(selectedStudentId);
                fetchSlots({ page: 1, silent: true });
                fetchBookedSlots(selectedStudentId);
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
    [selectedStudentId, slotRoomsState, resolvePackageSubscriptionId, fetchSubscriptions, fetchSlots, fetchBookedSlots, weekOffset, isSlotBooked, getCancelledSlot]
  );

  // Get branch name
  const getBranchName = useMemo(() => {
    if (!slots.length) return 'Chưa có thông tin';
    const firstSlot = slots[0];
    return firstSlot.branch?.branchName || 'Chưa có thông tin';
  }, [slots]);

  // Get school name
  const getSchoolName = useMemo(() => {
    if (!selectedStudent) return 'Chưa có thông tin';
    return selectedStudent.schoolName || 'Chưa có thông tin';
  }, [selectedStudent]);

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
      await Promise.all([
        fetchSlots({ page: 1, silent: true }),
        fetchSubscriptions(selectedStudentId),
        fetchBookedSlots(selectedStudentId),
      ]);
    }
    setSlotsRefreshing(false);
  }, [selectedStudentId, fetchSlots, fetchSubscriptions, fetchBookedSlots]);

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
            {selectedStudent?.name || 'Chọn con'} • {getBranchName}
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

        {/* Day Selector */}
        <View style={styles.daySelectorSection}>
          <ScrollView
            ref={dateScrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayScrollContainer}
            style={styles.dayScrollView}
            nestedScrollEnabled={true}
            scrollEnabled={true}
            bounces={false}
          >
            {getAvailableDates.map((date, index) => {
              const isSelected = date.toDateString() === selectedDate.toDateString();
              const hasSlots = dateHasSlots(date);
              const dayName = WEEKDAY_LABELS[date.getDay() === 0 ? 0 : date.getDay() as WeekdayKey]?.subtitle || '';
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayItem,
                    isSelected && styles.dayItemActive,
                    !hasSlots && styles.dayItemNoSlots,
                  ]}
                  onPress={() => handleDateSelect(date)}
                >
                  <Text style={[styles.dayItemDay, isSelected && styles.dayItemDayActive]}>
                    {dayName}
                  </Text>
                  <Text style={[styles.dayItemDate, isSelected && styles.dayItemDateActive]}>
                    {formatDateDisplay(date).split('/')[0]}/{formatDateDisplay(date).split('/')[1]}
                  </Text>
                  {hasSlots && (
                    <View style={styles.dayItemBadge}>
                      <Text style={styles.dayItemBadgeText}>
                        {groupedSlots[date.getDay() === 0 ? 0 : date.getDay() as WeekdayKey]?.length || 0}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="calendar-today" size={20} color={COLORS.SURFACE} />
          </TouchableOpacity>
        </View>

        {/* Slots List */}
        <View style={styles.slotsContainer}>
          <View style={styles.slotsHeader}>
            <Text style={styles.slotsTitle}>Chọn slot</Text>
            {getSlotsForSelectedDate.length > 0 && (() => {
              // Tính số slot có thể chọn được
              const selectableSlots = getSlotsForSelectedDate.filter((slot) => {
                const entry = slotRoomsState[slot.id];
                const slotDate = selectedDate || getWeekDate(weekOffset, normalizeWeekDate(slot.weekDate));
                const bookedSlot = isSlotBooked(slot, slotDate);
                const cancelledSlot = getCancelledSlot(slot, slotDate);
                return entry?.selectedRoomId && (!bookedSlot || cancelledSlot) && resolvePackageSubscriptionId(slot);
              });
              
              // Tính số slot đã chọn trong số các slot có thể chọn
              const selectedCount = selectableSlots.filter((slot) => {
                const slotKey = `${slot.id}_${computeSlotDateISO(slot, weekOffset)}`;
                return selectedSlotsForMultiple[slotKey];
              }).length;
              
              const allSelected = selectedCount === selectableSlots.length && selectableSlots.length > 0;
              
              return selectableSlots.length > 0 ? (
                <TouchableOpacity
                  style={styles.selectAllButton}
                  onPress={handleSelectAllSlots}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name={allSelected ? 'check-box' : 'check-box-outline-blank'}
                    size={20}
                    color={COLORS.PRIMARY}
                  />
                  <Text style={styles.selectAllButtonText}>
                    {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </Text>
                </TouchableOpacity>
              ) : null;
            })()}
          </View>
          
          {slotsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
              <Text style={styles.loadingText}>Đang tải...</Text>
            </View>
          ) : getSlotsForSelectedDate.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="event-busy" size={48} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.emptyText}>Không có slot nào vào ngày này</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.emptyButtonText}>Quay lại tìm kiếm</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.slotsList}>
              {getSlotsForSelectedDate.map((slot) => {
                // Sử dụng selectedDate để kiểm tra slot đã đặt, đảm bảo khớp với ngày đang xem
                const bookedSlot = isSlotBooked(slot, selectedDate);
                const cancelledSlot = getCancelledSlot(slot);
                const slotDate = selectedDate || getWeekDate(weekOffset, normalizeWeekDate(slot.weekDate));
                const slotDateDisplay = formatDateDisplay(slotDate);
                const roomState = slotRoomsState[slot.id];
                const roomsFromSlot = slot.rooms || [];
                const isExpanded = roomState?.expanded ?? false;
                const selectedRoomId = roomState?.selectedRoomId;
                
                const slotKey = `${slot.id}_${computeSlotDateISO(slot, weekOffset)}`;
                const isSelectedForMultiple = !!selectedSlotsForMultiple[slotKey];
                const canSelectForMultiple = (!bookedSlot || cancelledSlot) && roomState?.selectedRoomId;
                
                return (
                  <View key={slot.id} style={styles.slotCard}>
                    {/* Booked Notice */}
                    {bookedSlot && !cancelledSlot && (
                      <View style={styles.slotBookedNotice}>
                        <MaterialIcons name="info" size={18} color={COLORS.SUCCESS} />
                        <Text style={styles.slotBookedNoticeText}>Bạn đã đặt ca này rồi</Text>
                      </View>
                    )}
                    
                    {/* Multiple Selection Checkbox */}
                    {canSelectForMultiple && (
                      <TouchableOpacity
                        style={[
                          styles.slotCheckboxContainer,
                          isSelectedForMultiple && styles.slotCheckboxContainerSelected
                        ]}
                        onPress={() => handleToggleSlotSelection(slot, selectedDate)}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons
                          name={isSelectedForMultiple ? 'check-box' : 'check-box-outline-blank'}
                          size={24}
                          color={isSelectedForMultiple ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY}
                        />
                        <Text style={[
                          styles.slotCheckboxText,
                          isSelectedForMultiple && styles.slotCheckboxTextSelected
                        ]}>
                          {isSelectedForMultiple ? 'Đã chọn để đặt nhiều' : 'Chọn để đặt nhiều'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    
                    {/* Time Section */}
                    <View style={styles.slotTimeSection}>
                      <View style={styles.slotTimeLeft}>
                        <Text style={styles.slotTime}>{formatTime(slot.timeframe?.startTime)}</Text>
                        <Text style={styles.slotLocation}>{slot.branch?.branchName || 'Chưa có'}</Text>
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
                      <View style={styles.slotInfoRow}>
                        <MaterialIcons name="location-on" size={16} color={COLORS.TEXT_SECONDARY} />
                        <Text style={styles.slotInfoText}>{slot.branch?.branchName || 'Chưa có'}</Text>
                      </View>
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
                    {bookedSlot && !cancelledSlot ? (
                      <TouchableOpacity
                        style={styles.slotActionSection}
                        onPress={() => {
                          // Navigate to ClassDetail khi slot đã đặt
                          if (bookedSlot && selectedStudentId) {
                            navigation.navigate('ClassDetail', {
                              slotId: bookedSlot.id,
                              studentId: selectedStudentId,
                            });
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.slotBookedBadge}>
                          <MaterialIcons name="check-circle" size={16} color={COLORS.SUCCESS} />
                          <Text style={styles.slotBookedText}>Đã đặt</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={20} color={COLORS.TEXT_SECONDARY} />
                      </TouchableOpacity>
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
                                            {staffRole ? ` (${staffRole})` : ''}
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

      {/* Floating Action Button for Multiple Booking */}
      {Object.keys(selectedSlotsForMultiple).length > 0 && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={[styles.fabButton, bookingMultiple && styles.fabButtonDisabled]}
            onPress={handleBookMultipleSlots}
            disabled={bookingMultiple}
            activeOpacity={0.8}
          >
            {bookingMultiple ? (
              <ActivityIndicator size="small" color={COLORS.SURFACE} />
            ) : (
              <>
                <MaterialIcons name="check-circle" size={24} color={COLORS.SURFACE} />
                <Text style={styles.fabButtonText}>
                  Đặt {Object.keys(selectedSlotsForMultiple).length} lịch
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

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
                      fetchSlots({ page: 1 });
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
                        {student.branchName && (
                          <Text style={styles.studentPickerItemBranch}>
                            {student.branchName}
                          </Text>
                        )}
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
});

export default SelectSlotScreen;

