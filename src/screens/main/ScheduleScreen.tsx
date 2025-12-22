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
  FlatList,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Card, Surface, Chip } from 'react-native-paper';

import { useMyChildren } from '../../hooks/useChildrenApi';
import branchSlotService from '../../services/branchSlotService';
import studentSlotService from '../../services/studentSlotService';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import {
  BranchSlotResponse,
  BranchSlotRoomResponse,
  StudentPackageSubscription,
  StudentResponse,
  StudentSlotResponse,
} from '../../types/api';
import packageService from '../../services/packageService';
import { COLORS } from '../../constants';

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
// Hiển thị tất cả các ngày trong tuần (Thứ 2 - Chủ nhật)
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

interface SlotsPagination {
  pageIndex: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hasNextPage: boolean;
}

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

const getStatusBadgeStyle = (status: string) => {
  const normalized = (status || '').toLowerCase();
  switch (normalized) {
    case 'available':
      return {
        label: 'Còn slot',
        icon: 'check-circle',
        backgroundColor: COLORS.SUCCESS_BG,
        textColor: COLORS.PRIMARY,
      };
    case 'full':
    case 'unavailable':
      return {
        label: 'Đã kín',
        icon: 'block',
        backgroundColor: '#FFEBEE',
        textColor: COLORS.ERROR,
      };
    default:
      return {
        label: status || 'Đang cập nhật',
        icon: 'help-outline',
        backgroundColor: COLORS.INFO_BG,
        textColor: COLORS.ACCENT,
      };
  }
};

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

// Tính toán ngày cho mỗi thứ trong tuần (có thể là tuần trước, tuần hiện tại, hoặc tuần sau)
// weekOffset: 0 = tuần hiện tại, -1 = tuần trước, 1 = tuần sau, ...
const getWeekDate = (weekOffset: number, targetWeekday: WeekdayKey): Date => {
  const now = new Date();
  const currentDay = now.getDay(); // 0=Chủ nhật, 1=Thứ 2, ..., 6=Thứ 7
  
  // Lấy ngày đầu tuần hiện tại (Thứ 2 - Monday)
  const currentMonday = new Date(now);
  const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // Chủ nhật = 6 ngày từ thứ 2
  currentMonday.setDate(currentMonday.getDate() - daysFromMonday);
  currentMonday.setHours(0, 0, 0, 0);
  
  // Tính ngày đầu tuần của tuần được chọn
  const targetMonday = new Date(currentMonday);
  targetMonday.setDate(targetMonday.getDate() + (weekOffset * 7));
  
  // Tính ngày cho thứ mục tiêu trong tuần được chọn
  const targetDate = new Date(targetMonday);
  if (targetWeekday === 0) {
    // Chủ nhật = ngày thứ 7 trong tuần (6 ngày sau thứ 2)
    targetDate.setDate(targetMonday.getDate() + 6);
  } else {
    // Các thứ khác: thứ 2 = 1, thứ 3 = 2, ..., thứ 7 = 6
    targetDate.setDate(targetMonday.getDate() + (targetWeekday - 1));
  }
  
  return targetDate;
};

// Format ngày hiển thị: dd/MM/yyyy
const formatDateDisplay = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Tính toán ngày ISO cho slot (theo tuần offset)
const computeSlotDateISO = (slot: BranchSlotResponse, weekOffset: number): string => {
  const targetDay = normalizeWeekDate(slot.weekDate);
  const slotDate = getWeekDate(weekOffset, targetDay);

  // Thêm giờ từ timeframe nếu có
  if (slot.timeframe?.startTime) {
    const [hours = '0', minutes = '0', seconds = '0'] = slot.timeframe.startTime.split(':');
    slotDate.setHours(Number(hours), Number(minutes), Number(seconds || 0), 0);
  }

  return slotDate.toISOString();
};

type ScheduleScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ScheduleScreen: React.FC = () => {
  const navigation = useNavigation<ScheduleScreenNavigationProp>();
  const {
    students,
    loading: studentsLoading,
    error: studentsError,
    refetch: refetchStudents,
  } = useMyChildren();

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [slots, setSlots] = useState<BranchSlotResponse[]>([]);
  const [pagination, setPagination] = useState<SlotsPagination | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsRefreshing, setSlotsRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slotRoomsState, setSlotRoomsState] = useState<Record<string, SlotRoomsStateEntry>>({});
  const [subscriptions, setSubscriptions] = useState<StudentPackageSubscription[]>([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [subscriptionsError, setSubscriptionsError] = useState<string | null>(null);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);
  const [packageTotalSlots, setPackageTotalSlots] = useState<Record<string, number>>({}); // Map packageId -> totalSlots
  const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = tuần hiện tại, -1 = tuần trước, 1 = tuần sau
  const [bookedSlots, setBookedSlots] = useState<StudentSlotResponse[]>([]);
  const [bookedSlotsLoading, setBookedSlotsLoading] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<WeekdayKey>>(new Set()); // Mặc định đóng tất cả
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // Ngày được chọn từ calendar
  const [showDatePicker, setShowDatePicker] = useState(false); // Hiển thị date picker
  const [selectedTimeframe, setSelectedTimeframe] = useState<string | null>(null); // Khung giờ được chọn
  const [showTimeframePicker, setShowTimeframePicker] = useState(false); // Hiển thị timeframe picker
  const [recentSearches, setRecentSearches] = useState<Array<{ studentId: string; studentName: string; date: string }>>([]); // Lịch sử tìm kiếm
  const scrollViewRef = useRef<ScrollView>(null); // Ref để scroll đến slots section
  const dateScrollViewRef = useRef<ScrollView>(null); // Ref để scroll date selector
  const studentFlatListRef = useRef<FlatList>(null); // Ref cho FlatList swipe students
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0); // Index của con hiện tại trong FlatList
  const [slotsSectionY, setSlotsSectionY] = useState(0); // Vị trí Y của slots section
  const [showResults, setShowResults] = useState(false); // Hiển thị trang kết quả sau khi tìm kiếm
  const [availableDates, setAvailableDates] = useState<Date[]>([]); // Danh sách các ngày có slot
  const [showStudentPicker, setShowStudentPicker] = useState(false); // Hiển thị dropdown chọn con

  useEffect(() => {
    if (students.length && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
      setCurrentStudentIndex(0);
    }
  }, [students, selectedStudentId]);

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

  // Sync selectedStudentId với currentStudentIndex khi swipe
  useEffect(() => {
    if (students.length > 0 && currentStudentIndex >= 0 && currentStudentIndex < students.length) {
      const student = students[currentStudentIndex];
      if (student.id !== selectedStudentId) {
        setSelectedStudentId(student.id);
      }
    }
  }, [currentStudentIndex, students]);

  // Sync currentStudentIndex khi selectedStudentId thay đổi từ bên ngoài (ví dụ recent searches)
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

  // Reset timeframe when student changes
  useEffect(() => {
    setSelectedTimeframe(null);
  }, [selectedStudentId]);

  // Reset timeframe when slots change significantly (new fetch)
  useEffect(() => {
    // Only reset if the selected timeframe is no longer available
    if (selectedTimeframe && availableTimeframes.length > 0) {
      const timeframeExists = availableTimeframes.some((tf) => {
        const key = tf.id || `${tf.startTime}-${tf.endTime}`;
        return key === selectedTimeframe;
      });
      if (!timeframeExists) {
        setSelectedTimeframe(null);
      }
    }
  }, [slots]);

  // Reset slot rooms state when slots change - rooms are already in response
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
            // Auto-select first room if not selected
            selectedRoomId: existing?.selectedRoomId || roomsFromSlot[0]?.roomId || roomsFromSlot[0]?.id || null,
          };
        });
        return updated;
      });
    }
  }, [slots]);

  const selectedStudent: StudentResponse | null = useMemo(() => {
    return students.find((student) => student.id === selectedStudentId) ?? null;
  }, [selectedStudentId, students]);

  const computeTotalSlots = useCallback((subscription: StudentPackageSubscription): number | null => {
    // Ưu tiên 1: totalSlotsSnapshot hoặc totalSlots từ subscription
    if (typeof subscription.totalSlotsSnapshot === 'number') {
      return subscription.totalSlotsSnapshot;
    }
    if (typeof subscription.totalSlots === 'number') {
      return subscription.totalSlots;
    }
    // Ưu tiên 2: Lấy từ packageTotalSlots map (đã fetch từ package gốc)
    if (subscription.packageId && packageTotalSlots[subscription.packageId]) {
      return packageTotalSlots[subscription.packageId];
    }
    // Ưu tiên 3: Tính từ usedSlot + remainingSlots
    if (typeof subscription.remainingSlots === 'number') {
      return (subscription.usedSlot || 0) + subscription.remainingSlots;
    }
    // Ưu tiên 4: Parse từ packageName
    const nameMatch = subscription.packageName?.match(/(\d+)/);
    if (nameMatch) {
      const totalFromName = parseInt(nameMatch[1], 10);
      if (!isNaN(totalFromName)) {
        return totalFromName;
      }
    }
    return null;
  }, [packageTotalSlots]);

  const computeRemainingSlots = useCallback((subscription: StudentPackageSubscription) => {
    const total = computeTotalSlots(subscription);
    if (total !== null) {
      return Math.max(total - (subscription.usedSlot || 0), 0);
    }
    return undefined;
  }, [computeTotalSlots]);

  const selectedSubscription = useMemo(() => {
    if (!selectedSubscriptionId) {
      return null;
    }
    return subscriptions.find((sub) => sub.id === selectedSubscriptionId) ?? null;
  }, [selectedSubscriptionId, subscriptions]);

  const fetchSubscriptions = useCallback(
    async (studentId: string) => {
      setSubscriptionsLoading(true);
      setSubscriptionsError(null);
      try {
        const data = await packageService.getStudentSubscriptions(studentId);
        // Filter out cancelled and refunded subscriptions - only show Active packages
        const activeData = data.filter((sub) => {
          if (!sub.status) return false;
          const status = sub.status.trim().toUpperCase();
          // Only show packages with Active status (case-insensitive)
          return status === 'ACTIVE';
        });
        setSubscriptions(activeData);

        // Fetch package details để lấy totalSlots cho các subscription không có totalSlotsSnapshot
        const totalSlotsMap: Record<string, number> = {};
        try {
          const suitablePackages = await packageService.getSuitablePackages(studentId);
          suitablePackages.forEach((pkg) => {
            if (pkg.totalSlots && typeof pkg.totalSlots === 'number') {
              totalSlotsMap[pkg.id] = pkg.totalSlots;
            }
          });
          // Chỉ update nếu có thay đổi để tránh re-render không cần thiết
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
          // Ignore error khi fetch package details
        }

        const currentValid = activeData.find((sub) => sub.id === selectedSubscriptionId);
        if (currentValid) {
          // Giữ nguyên subscription đã chọn nếu vẫn còn trong danh sách
          // Không cần set lại để tránh re-render
        } else {
          // Tính toán remaining slots trực tiếp ở đây thay vì dùng callback
          const findDefaultSubscription = () => {
            // Tìm subscription có remaining slots > 0
            for (const sub of activeData) {
              if (sub.status === 'Active') {
                const total = sub.totalSlotsSnapshot ?? sub.totalSlots ?? 
                             (totalSlotsMap[sub.packageId] ?? null) ??
                             (typeof sub.remainingSlots === 'number' ? (sub.usedSlot || 0) + sub.remainingSlots : null);
                if (total !== null) {
                  const remaining = Math.max(total - (sub.usedSlot || 0), 0);
                  if (remaining > 0) {
                    return sub;
                  }
                }
              }
            }
            // Nếu không có, tìm bất kỳ subscription Active nào
            return activeData.find((sub) => sub.status === 'Active') || activeData[0];
          };
          
          const defaultSubscription = findDefaultSubscription();
          setSelectedSubscriptionId(defaultSubscription ? defaultSubscription.id : null);
        }
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          'Không thể tải gói đã đăng ký của học sinh. Vui lòng thử lại.';
        setSubscriptionsError(message);
        setSubscriptions([]);
        setSelectedSubscriptionId(null);
      } finally {
        setSubscriptionsLoading(false);
      }
    },
    [selectedSubscriptionId] // Loại bỏ computeRemainingSlots khỏi dependencies
  );

  useEffect(() => {
    if (!selectedStudentId) {
      setSubscriptions([]);
      setSelectedSubscriptionId(null);
      setSubscriptionsError(null);
      setSubscriptionsLoading(false);
      return;
    }
    fetchSubscriptions(selectedStudentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId]); // Chỉ phụ thuộc vào selectedStudentId để tránh infinite loop

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

      if (append) {
        setLoadingMore(true);
      } else {
        setSlotsError(null);
        if (!silent) {
          setSlotsLoading(true);
        }
      }

      try {
        // Don't pass date parameter - API returns all slots for all days in the week
        // The weekDate field in each slot indicates which day of the week it belongs to
        const response = await branchSlotService.getAvailableSlotsForStudent(
          selectedStudentId,
          page,
          PAGE_SIZE
          // date parameter removed - API returns all slots for all weekdays
        );
        const items = response?.items ?? [];

        // Rooms are already included in response, no need to fetch separately
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
        if (append) {
          setLoadingMore(false);
        } else {
          setSlotsLoading(false);
          setSlotsRefreshing(false);
        }
      }
    },
    [selectedStudentId]
    // weekOffset removed from dependencies - we don't filter by date anymore
  );


  const fetchSlotRooms = useCallback(
    async (slotId: string, { page = 1, append = false }: { page?: number; append?: boolean } = {}) => {
      setSlotRoomsState((prev) => {
        const existing = prev[slotId] ? { ...prev[slotId] } : createDefaultSlotRoomsState();
        if (!prev[slotId]) {
          existing.expanded = true;
        }
        return {
          ...prev,
          [slotId]: {
            ...existing,
            loading: true,
            error: null,
          },
        };
      });

      try {
        const response = await branchSlotService.getRoomsBySlot(slotId, page, ROOM_PAGE_SIZE);
        
        // Validate response
        if (!response) {
          throw new Error('Invalid response from server');
        }
        
        const items = Array.isArray(response.items) ? response.items : [];

        setSlotRoomsState((prev) => {
          const existing = prev[slotId] ? { ...prev[slotId] } : createDefaultSlotRoomsState();
          const mergedRooms = append ? [...existing.rooms, ...items] : items;
          const nextSelectedRoomId =
            existing.selectedRoomId && mergedRooms.some((room) => room.id === existing.selectedRoomId)
              ? existing.selectedRoomId
              : mergedRooms[0]?.id ?? null;

          return {
            ...prev,
            [slotId]: {
              ...existing,
              rooms: mergedRooms,
              pagination: {
                pageIndex: response.pageIndex ?? page,
                totalPages: response.totalPages ?? 0,
                totalCount: response.totalCount ?? 0,
                pageSize: response.pageSize ?? ROOM_PAGE_SIZE,
                hasNextPage: response.hasNextPage ?? false,
              },
              loading: false,
              error: null,
              selectedRoomId: nextSelectedRoomId,
            },
          };
        });
      } catch (error: any) {
        const message =
          typeof error === 'string' ? error :
          error?.message ||
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.response?.data?.title ||
          'Không thể tải danh sách phòng. Vui lòng thử lại.';

        setSlotRoomsState((prev) => {
          const existing = prev[slotId] ? { ...prev[slotId] } : createDefaultSlotRoomsState();
          return {
            ...prev,
            [slotId]: {
              ...existing,
              loading: false,
              error: message,
              rooms: append ? existing.rooms : [],
            },
          };
        });
      }
    },
    []
  );

  const handleToggleRooms = useCallback(
    (slotId: string) => {
      // Rooms are already in slot.rooms from API response, just toggle expanded state
      setSlotRoomsState((prev) => {
        const existing = prev[slotId] ? { ...prev[slotId] } : createDefaultSlotRoomsState();
        const slot = slots.find(s => s.id === slotId);
        const roomsFromSlot = slot?.rooms || [];
        
        // Initialize rooms from slot if not already set
        const rooms = existing.rooms.length > 0 ? existing.rooms : roomsFromSlot;
        
        // Auto-select first room if none selected
        const firstRoomId = rooms[0]?.roomId || rooms[0]?.id || null;
        const selectedRoomId = existing.selectedRoomId || firstRoomId;
        
        return {
          ...prev,
          [slotId]: {
            ...existing,
            expanded: !existing.expanded,
            rooms: rooms,
            selectedRoomId: selectedRoomId,
          },
        };
      });
    },
    [slots]
  );

  const handleRetryRooms = useCallback(
    (slotId: string) => {
      // Rooms are already in response, just reload slots
      fetchSlots({ page: 1, append: false, silent: false });
    },
    [fetchSlots]
  );

  const handleLoadMoreRooms = useCallback(
    (slotId: string) => {
      // Rooms are already included in response, no pagination needed
      // This function is kept for compatibility but does nothing
    },
    []
  );

  const handleSelectRoom = useCallback((slotId: string, roomId: string) => {
    setSlotRoomsState((prev) => {
      const existing = prev[slotId] ? { ...prev[slotId] } : createDefaultSlotRoomsState();
      return {
        ...prev,
        [slotId]: {
          ...existing,
          selectedRoomId: roomId,
        },
      };
    });
  }, []);

  const handleChangeParentNote = useCallback((slotId: string, note: string) => {
    setSlotRoomsState((prev) => {
      const existing = prev[slotId] ? { ...prev[slotId] } : createDefaultSlotRoomsState();
      return {
        ...prev,
        [slotId]: {
          ...existing,
          parentNote: note,
        },
      };
    });
  }, []);

  const handleBookSlot = useCallback(
    async (slot: BranchSlotResponse) => {
      if (!selectedStudentId) {
        Alert.alert('Thông báo', 'Vui lòng chọn con trước khi đặt lịch.');
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

      // Tính ngày cụ thể cho slot theo tuần đang xem
      const slotDate = getWeekDate(weekOffset, normalizeWeekDate(slot.weekDate));
      const slotDateDisplay = formatDateDisplay(slotDate);
      const selectedRoom = roomsFromSlot.find((room) => (room.roomId || room.id) === entry.selectedRoomId);

      // Xác nhận với người dùng
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
                roomId: entry.selectedRoomId, // Đã check null ở trên
                date: computeSlotDateISO(slot, weekOffset), // Date theo tuần đang xem
                parentNote: entry.parentNote?.trim() || undefined,
              };

              setSlotRoomsState((prev) => {
                const existing = prev[slot.id] ? { ...prev[slot.id] } : createDefaultSlotRoomsState();
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
                  const existing = prev[slot.id] ? { ...prev[slot.id] } : createDefaultSlotRoomsState();
                  return {
                    ...prev,
                    [slot.id]: {
                      ...existing,
                      bookingLoading: false,
                      parentNote: '',
                    },
                  };
                });
                // Refresh slots, subscriptions, and booked slots after successful booking
                fetchSubscriptions(selectedStudentId);
                fetchSlots({ page: 1, silent: true });
                fetchBookedSlots(selectedStudentId);
              } catch (error: any) {
                let message =
                  error?.response?.data?.message ||
                  error?.response?.data?.error ||
                  error?.message ||
                  'Không thể đặt slot cho con. Vui lòng thử lại sau.';
                
                // Nếu lỗi là "đã đặt rồi" và slot đã cancelled, thử refresh và thông báo
                const cancelledSlot = getCancelledSlot(slot);
                if ((message.includes('đã đặt') || message.includes('already booked') || message.includes('đã đặt ca này')) && cancelledSlot) {
                  // Refresh booked slots để đảm bảo cancelled slot đã được filter
                  fetchBookedSlots(selectedStudentId);
                  message = 'Vui lòng đợi vài giây rồi thử lại. Hệ thống đang cập nhật thông tin sau khi hủy lịch.';
                }
                
                Alert.alert('Lỗi', message);
                setSlotRoomsState((prev) => {
                  const existing = prev[slot.id] ? { ...prev[slot.id] } : createDefaultSlotRoomsState();
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
    [selectedStudentId, slotRoomsState, resolvePackageSubscriptionId, fetchSubscriptions, fetchSlots, weekOffset]
  );

  // Điều hướng tuần
  const handlePreviousWeek = useCallback(() => {
    setWeekOffset((prev) => prev - 1);
  }, []);

  const handleNextWeek = useCallback(() => {
    setWeekOffset((prev) => prev + 1);
  }, []);

  const handleGoToCurrentWeek = useCallback(() => {
    setWeekOffset(0);
  }, []);

  // Tính phạm vi tuần đang xem
  const getWeekRange = useCallback((): { startDate: Date; endDate: Date; displayText: string } => {
    const monday = getWeekDate(weekOffset, 1);
    const sunday = getWeekDate(weekOffset, 0);
    return {
      startDate: monday,
      endDate: sunday,
      displayText: `${formatDateDisplay(monday)} - ${formatDateDisplay(sunday)}`,
    };
  }, [weekOffset]);

  // Fetch danh sách slot đã đặt (filter out cancelled slots)
  const fetchBookedSlots = useCallback(
    async (studentId: string) => {
      setBookedSlotsLoading(true);
      try {
        const response = await studentSlotService.getStudentSlots({
          studentId,
          pageIndex: 1,
          pageSize: 100, // Fetch nhiều để có đủ dữ liệu
        });
        // Filter out cancelled slots - chỉ giữ lại các slot active
        const activeSlots = (response.items || []).filter(
          (slot) => !slot.status || slot.status.toLowerCase() !== 'cancelled'
        );
        setBookedSlots(activeSlots);
      } catch (error: any) {
        // Don't spam console with 401 authentication errors
        const statusCode = error?.response?.status || error?.response?.statusCode;
        if (statusCode !== 401) {
          console.warn('Failed to fetch booked slots:', error?.message || error);
        }
        setBookedSlots([]);
      } finally {
        setBookedSlotsLoading(false);
      }
    },
    []
  );

  // Kiểm tra xem slot đã được đặt chưa (chỉ tính các status active, không tính Cancelled)
  const isSlotBooked = useCallback(
    (slot: BranchSlotResponse): StudentSlotResponse | null => {
      const slotDate = computeSlotDateISO(slot, weekOffset);
      const slotDateObj = new Date(slotDate);
      slotDateObj.setHours(0, 0, 0, 0);

      const booked = bookedSlots.find((booked) => {
        if (booked.branchSlotId !== slot.id) {
          return false;
        }
        const bookedDate = new Date(booked.date);
        bookedDate.setHours(0, 0, 0, 0);
        return bookedDate.getTime() === slotDateObj.getTime();
      });

      // Chỉ coi là "booked" nếu status không phải Cancelled
      if (booked && booked.status && booked.status.toLowerCase() !== 'cancelled') {
        return booked;
      }
      
      return null;
    },
    [bookedSlots, weekOffset]
  );

  // Kiểm tra xem slot có bị cancelled không (để hiển thị thông tin cancelled)
  const getCancelledSlot = useCallback(
    (slot: BranchSlotResponse): StudentSlotResponse | null => {
      const slotDate = computeSlotDateISO(slot, weekOffset);
      const slotDateObj = new Date(slotDate);
      slotDateObj.setHours(0, 0, 0, 0);

      const booked = bookedSlots.find((booked) => {
        if (booked.branchSlotId !== slot.id) {
          return false;
        }
        const bookedDate = new Date(booked.date);
        bookedDate.setHours(0, 0, 0, 0);
        return bookedDate.getTime() === slotDateObj.getTime();
      });

      // Trả về nếu status là Cancelled
      if (booked && booked.status && booked.status.toLowerCase() === 'cancelled') {
        return booked;
      }
      
      return null;
    },
    [bookedSlots, weekOffset]
  );

  useEffect(() => {
    setSlotRoomsState({});
    if (selectedStudentId) {
      fetchSlots({ page: 1 });
      fetchBookedSlots(selectedStudentId);
    } else {
      setSlots([]);
      setPagination(null);
      setBookedSlots([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId]); // Chỉ phụ thuộc vào selectedStudentId để tránh infinite loop

  // Refresh booked slots khi weekOffset thay đổi
  useEffect(() => {
    if (selectedStudentId) {
      fetchBookedSlots(selectedStudentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset, selectedStudentId]); // Loại bỏ fetchBookedSlots khỏi dependencies

  const handleRefreshSlots = useCallback(() => {
    if (!selectedStudentId) {
      return;
    }
    setSlotsRefreshing(true);
    fetchSlots({ page: 1, silent: true });
    fetchBookedSlots(selectedStudentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId]); // Loại bỏ fetchSlots và fetchBookedSlots khỏi dependencies

  const handleRetrySlots = useCallback(() => {
    if (!selectedStudentId) {
      return;
    }
    fetchSlots({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId]); // Loại bỏ fetchSlots khỏi dependencies

  const handleLoadMore = useCallback(() => {
    if (!pagination?.hasNextPage || loadingMore) {
      return;
    }
    const nextPage = (pagination.pageIndex ?? 1) + 1;
    fetchSlots({ page: nextPage, append: true });
  }, [fetchSlots, pagination, loadingMore]);

  // Kiểm tra xem có thể cancel slot không (phải còn > 1 giờ trước khi slot bắt đầu)
  const canCancelSlot = useCallback((slot: BranchSlotResponse, bookedSlot: StudentSlotResponse | null): boolean => {
    if (!bookedSlot) return false;
    
    // Lấy thời gian bắt đầu của slot từ bookedSlot.date hoặc tính từ slot
    let slotDateTime: Date;
    
    // Ưu tiên dùng date từ bookedSlot vì nó chính xác hơn
    if (bookedSlot.date) {
      slotDateTime = new Date(bookedSlot.date);
    } else {
      // Fallback: tính từ slot với weekOffset
      const slotDate = computeSlotDateISO(slot, weekOffset);
      slotDateTime = new Date(slotDate);
    }
    
    // Nếu slot có timeframe với startTime, cập nhật giờ phút
    if (slot.timeframe?.startTime) {
      const [hours = '0', minutes = '0'] = slot.timeframe.startTime.split(':');
      slotDateTime.setHours(Number(hours), Number(minutes), 0, 0);
    }
    
    const now = new Date();
    
    // Tính thời gian còn lại (milliseconds)
    const timeRemaining = slotDateTime.getTime() - now.getTime();
    // Phải còn hơn 1 giờ (3600000 milliseconds = 60 phút * 60 giây * 1000)
    return timeRemaining > 3600000;
  }, [weekOffset]);

  // Xử lý cancel slot
  const handleCancelSlot = useCallback(
    async (slot: BranchSlotResponse, bookedSlot: StudentSlotResponse) => {
      if (!selectedStudentId) {
        Alert.alert('Thông báo', 'Vui lòng chọn con trước khi hủy lịch.');
        return;
      }

      // Kiểm tra lại xem có thể cancel không
      if (!canCancelSlot(slot, bookedSlot)) {
        Alert.alert(
          'Không thể hủy',
          'Chỉ có thể hủy lịch học trước 1 giờ. Vui lòng liên hệ trung tâm nếu cần hỗ trợ.'
        );
        return;
      }

      Alert.alert(
        'Xác nhận hủy lịch',
        `Bạn có chắc chắn muốn hủy lịch học này không?`,
        [
          {
            text: 'Không',
            style: 'cancel',
          },
          {
            text: 'Có, hủy lịch',
            style: 'destructive',
            onPress: async () => {
              try {
                await studentSlotService.cancelSlot(bookedSlot.id, selectedStudentId);
                Alert.alert('Thành công', 'Đã hủy lịch học thành công. Bạn có thể đặt lại nếu còn chỗ trống.');
                // Refresh lại danh sách slots và booked slots sau khi hủy
                // Thêm delay nhỏ để backend có thời gian update
                setTimeout(() => {
                  fetchSlots({ page: 1, silent: true });
                  fetchBookedSlots(selectedStudentId);
                  fetchSubscriptions(selectedStudentId);
                }, 500);
              } catch (error: any) {
                const message =
                  error?.response?.data?.message ||
                  error?.message ||
                  'Không thể hủy lịch học. Vui lòng thử lại sau.';
                Alert.alert('Lỗi', message);
              }
            },
          },
        ]
      );
    },
    [selectedStudentId, canCancelSlot, fetchSlots, fetchBookedSlots]
  );

  const groupedSlots = useMemo(() => {
    const groups: Record<WeekdayKey, BranchSlotResponse[]> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };

    // Lọc slots theo weekDate
    slots.forEach((slot) => {
      const day = normalizeWeekDate(slot.weekDate);
      // Thêm vào groups nếu là thứ trong WEEKDAY_ORDER (Thứ 2 - Chủ nhật)
      if (WEEKDAY_ORDER.includes(day)) {
        groups[day].push(slot);
      }
    });

    return groups;
  }, [slots]);

  // Handle swipe to change student
  const handleStudentSwipe = useCallback((event: any) => {
    const { contentOffset, layoutMeasurement } = event.nativeEvent;
    const itemWidth = Dimensions.get('window').width - SPACING.MD * 2;
    const index = Math.round(contentOffset.x / itemWidth);
    if (index >= 0 && index < students.length && index !== currentStudentIndex) {
      setCurrentStudentIndex(index);
    }
  }, [students.length, currentStudentIndex]);

  const renderStudentCard = useCallback(({ item: student, index }: { item: StudentResponse; index: number }) => {
    const screenWidth = Dimensions.get('window').width;
    const isSelected = student.id === selectedStudentId;
    const studentSubscriptions = isSelected ? subscriptions : [];
    const isLoading = isSelected ? subscriptionsLoading : false;
    
    // Tính tổng số slot đã dùng và tổng số slot
    let totalUsed = 0;
    let totalSlots = 0;
    let packageNames: string[] = [];
    
    if (studentSubscriptions.length > 0) {
      studentSubscriptions.forEach((sub) => {
        const used = sub.usedSlot || 0;
        const total = computeTotalSlots(sub);
        const totalDisplay = total !== null ? total : 0;
        
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
              ) : studentSubscriptions.length > 0 ? (
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
        </View>
      </View>
    );
  }, [selectedStudentId, subscriptions, subscriptionsLoading, computeTotalSlots]);

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

  const renderSubscriptionSection = () => {
    if (!selectedStudentId) {
      return null;
    }

    return (
      <View style={[styles.sectionCard, styles.sectionSpacing]}>
        <View style={styles.subscriptionHeader}>
          <MaterialIcons name='card-membership' size={20} color={COLORS.PRIMARY} />
          <Text style={styles.subscriptionTitle}>Gói áp dụng</Text>
          <TouchableOpacity onPress={() => fetchSubscriptions(selectedStudentId)} style={styles.subscriptionRefresh}>
            <MaterialIcons name='refresh' size={20} color={COLORS.PRIMARY} />
          </TouchableOpacity>
        </View>
        {subscriptionsLoading ? (
          <View style={styles.subscriptionStateRow}>
            <ActivityIndicator size='small' color={COLORS.PRIMARY} />
            <Text style={styles.subscriptionStateText}>Đang tải gói đã đăng ký...</Text>
          </View>
        ) : subscriptionsError ? (
          <View>
            <View style={styles.subscriptionStateRow}>
              <MaterialIcons name='error-outline' size={18} color={COLORS.ERROR} />
              <Text style={[styles.subscriptionStateText, { color: COLORS.ERROR }]}>{subscriptionsError}</Text>
            </View>
            <TouchableOpacity
              style={styles.subscriptionRetryButton}
              onPress={() => fetchSubscriptions(selectedStudentId)}
            >
              <Text style={styles.subscriptionRetryText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : subscriptions.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subscriptionChipList}>
            {subscriptions.map((subscription) => {
              const remaining = computeRemainingSlots(subscription);
              const active = subscription.id === selectedSubscriptionId;
              const isValid = subscription.status === 'Active' && (remaining === undefined || remaining > 0);

              return (
                <TouchableOpacity
                  key={subscription.id}
                  style={[
                    styles.subscriptionChip,
                    active && styles.subscriptionChipActive,
                    !isValid && styles.subscriptionChipInactive,
                  ]}
                  onPress={() => setSelectedSubscriptionId(subscription.id)}
                  activeOpacity={0.9}
                >
                  <View style={styles.subscriptionChipHeader}>
                    <Text style={[styles.subscriptionChipText, active && styles.subscriptionChipTextActive]}>
                      {subscription.packageName || 'Gói không tên'}
                    </Text>
                    <View
                      style={[
                        styles.subscriptionStatusBadge,
                        subscription.status === 'Active'
                          ? styles.subscriptionStatusActive
                          : styles.subscriptionStatusInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.subscriptionStatusText,
                          subscription.status === 'Active' ? { color: COLORS.SURFACE } : { color: COLORS.TEXT_PRIMARY },
                        ]}
                      >
                        {subscription.status === 'Active' ? 'Đang hiệu lực' : subscription.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.subscriptionChipMeta}>
                    {(() => {
                      const used = subscription.usedSlot || 0;
                      const total = computeTotalSlots(subscription);
                      const totalDisplay = total !== null ? total.toString() : '?';
                      return `${used} / ${totalDisplay} buổi đã dùng`;
                    })()}
                    {remaining !== undefined ? ` • Còn ${remaining} buổi` : ''}
                    {' • HSD '}
                    {new Date(subscription.endDate).toLocaleDateString('vi-VN')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={styles.subscriptionStateText}>
            Chưa có gói nào được đăng ký cho học sinh. Vui lòng đăng ký gói trước khi đặt slot.
          </Text>
        )}
      </View>
    );
  };

  const renderSlotList = () => {
    if (slotsLoading && slots.length === 0) {
      return (
        <View style={[styles.stateCard, styles.surfaceCard, styles.sectionSpacing]}>
          <ActivityIndicator color={COLORS.PRIMARY} size="large" />
          <Text style={styles.stateText}>Đang tải khung giờ phù hợp...</Text>
        </View>
      );
    }

    if (slotsError) {
      return (
        <View style={[styles.stateCard, styles.surfaceCard, styles.sectionSpacing]}>
          <MaterialIcons name="error-outline" size={42} color={COLORS.ERROR} />
          <Text style={[styles.stateText, { color: COLORS.ERROR }]}>{slotsError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetrySlots}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!slotsLoading && slots.length === 0) {
      return (
        <View style={[styles.stateCard, styles.surfaceCard, styles.sectionSpacing]}>
          <MaterialIcons name="event-busy" size={40} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.stateText}>
            Trung tâm chưa có slot trống phù hợp với hồ sơ của con. Phụ huynh vui lòng theo dõi lại sau
            hoặc liên hệ tư vấn viên.
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
                  <Text style={styles.emptySlotText}>Chưa có slot nào trong ngày</Text>
              </View>
              ) : (
                daySlots.map((slot) => {
                  const statusStyle = getStatusBadgeStyle(slot.status);
                  const staffCount = slot.staff?.length ?? 0;
                  const roomState = slotRoomsState[slot.id];
                  const roomsFromSlot = slot.rooms || [];
                  const roomsCount = roomsFromSlot.length;
                  const isExpanded = roomState?.expanded ?? false;
                  const bookedSlot = isSlotBooked(slot);
                  const cancelledSlot = getCancelledSlot(slot);
                  const isBooked = !!bookedSlot;
                  const isCancelled = !!cancelledSlot;
                  const packageSubscriptionId = resolvePackageSubscriptionId(slot);
                  const packageName =
                    slot.packageSubscription?.name ||
                    slot.packageName ||
                    slot.packageSubscriptionName ||
                    (slot as any)?.studentPackageName ||
                    (slot as any)?.packageName ||
                    undefined;
                  const remainingSlots =
                    slot.packageSubscription?.remainingSlots ??
                    slot.packageRemainingSlots ??
                    (slot as any)?.remainingSlots ??
                    null;
                  const effectiveSubscription =
                    subscriptions.find((sub) => sub.id === packageSubscriptionId) ||
                    (packageSubscriptionId ? null : selectedSubscription);
                  const computedRemaining =
                    typeof remainingSlots === 'number'
                      ? remainingSlots
                      : effectiveSubscription
                      ? computeRemainingSlots(effectiveSubscription)
                      : undefined;
                  const displayPackageName = packageName || effectiveSubscription?.packageName;
                  const isSubscriptionActive =
                    effectiveSubscription?.status === 'Active' ||
                    (!effectiveSubscription && Boolean(packageSubscriptionId));
                  const hasRemaining = computedRemaining === undefined || computedRemaining > 0;
                  
                  // Get selected room and check available capacity
                  const selectedRoomId = roomState?.selectedRoomId;
                  const selectedRoom = roomsFromSlot.find(
                    (room) => (room.roomId || room.id) === selectedRoomId
                  );
                  const selectedRoomAvailableCapacity = selectedRoom?.availableCapacity ?? selectedRoom?.capacity ?? 0;
                  const isRoomFull = selectedRoomAvailableCapacity <= 0;
                  
                  const canBook =
                    !isBooked &&
                    Boolean(packageSubscriptionId && selectedRoomId && roomsCount > 0) &&
                    isSubscriptionActive &&
                    hasRemaining &&
                    !isRoomFull; // Cannot book if room is full
                  
                  // Get rooms from slot or from state (fallback)
                  const displayRooms = roomsFromSlot.length > 0 ? roomsFromSlot : (roomState?.rooms || []);
                  const subscriptionWarning = !packageSubscriptionId
                    ? 'Chưa tìm thấy gói áp dụng. Vui lòng chọn gói phù hợp trước khi đặt slot.'
                    : !isSubscriptionActive
                    ? 'Gói này đã hết hiệu lực. Vui lòng chọn gói khác.'
                    : !hasRemaining
                    ? 'Gói hiện không còn buổi khả dụng. Vui lòng gia hạn hoặc chọn gói khác.'
                    : isRoomFull && selectedRoomId
                    ? 'Phòng này đã đầy. Vui lòng chọn phòng khác.'
                    : null;

                  return (
                    <View key={slot.id} style={styles.slotCard}>
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
                              backgroundColor: isBooked
                                ? COLORS.SUCCESS_BG
                                : statusStyle.backgroundColor,
                            },
                          ]}
                        >
                          <MaterialIcons
                            name={
                              isBooked
                                ? 'check-circle'
                                : (statusStyle.icon as any)
                            }
                            size={18}
                            color={isBooked ? COLORS.PRIMARY : statusStyle.textColor}
                          />
                          <Text
                            style={[
                              styles.statusTagText,
                              { color: isBooked ? COLORS.PRIMARY : statusStyle.textColor },
                            ]}
                          >
                            {isBooked ? 'Đã đặt' : statusStyle.label}
                          </Text>
                        </View>
                        {/* Show "Đã full" status if all rooms are full */}
                        {!isBooked && roomsFromSlot.length > 0 && roomsFromSlot.every(room => (room.availableCapacity ?? room.capacity ?? 0) <= 0) && (
                          <View style={[styles.statusTag, { backgroundColor: COLORS.ERROR_BG, marginTop: SPACING.XS }]}>
                            <MaterialIcons name="block" size={18} color={COLORS.ERROR} />
                            <Text style={[styles.statusTagText, { color: COLORS.ERROR }]}>
                              Tất cả phòng đã đầy
                            </Text>
                          </View>
                        )}
          </View>

                      <View style={styles.slotMetaRow}>
                        <MaterialIcons name="location-on" size={18} color={COLORS.SECONDARY} />
                        <Text style={styles.slotMetaText}>
                          {slot.branch?.branchName || 'Chưa có thông tin chi nhánh'}
                        </Text>
              </View>

                      <View style={styles.slotMetaRow}>
                        <MaterialIcons name="category" size={18} color={COLORS.PRIMARY} />
                        <Text style={styles.slotMetaText}>
                          {slot.slotType?.name || 'Loại slot chưa xác định'}
                        </Text>
              </View>

                      <View style={styles.slotMetaRow}>
                        <MaterialIcons name="card-membership" size={18} color={COLORS.ACCENT} />
                        <Text style={styles.slotMetaText}>
                          {displayPackageName
                            ? `Gói áp dụng: ${displayPackageName}${
                                computedRemaining !== undefined ? ` • Còn ${computedRemaining} buổi` : ''
                              }`
                            : 'Chưa nhận diện được gói áp dụng'}
                        </Text>
                      </View>

                      {slot.slotType?.description ? (
                        <Text style={styles.slotDescription}>{slot.slotType.description}</Text>
                      ) : null}

                      {slot.timeframe?.description ? (
                        <View style={styles.slotMetaRow}>
                          <MaterialIcons name="notes" size={18} color={COLORS.TEXT_SECONDARY} />
                          <Text style={styles.slotMetaText}>
                            {slot.timeframe.description}
                          </Text>
                        </View>
                      ) : null}

                      {staffCount > 0 ? (
                        <View style={styles.staffSection}>
                          <View style={styles.staffHeader}>
                            <MaterialIcons name="groups" size={18} color={COLORS.SECONDARY} />
                            <Text style={styles.staffHeaderText}>
                              Nhân viên phụ trách ({staffCount})
                            </Text>
                          </View>
                          {slot.staff?.map((staff, index) => {
                            const staffName = staff.staffName || staff.fullName || 'Chưa có tên';
                            const staffRole = staff.staffRole || staff.role || 'Chưa có vai trò';
                            const roomName = staff.roomName || null;
                            
                            return (
                              <View key={staff.staffId || staff.id || index} style={styles.staffItem}>
                                <View style={styles.staffItemContent}>
                                  <MaterialIcons name="person" size={16} color={COLORS.PRIMARY} />
                                  <View style={styles.staffItemInfo}>
                                    <Text style={styles.staffItemName}>{staffName}</Text>
                                    <Text style={styles.staffItemRole}>{staffRole}</Text>
                                    {roomName && (
                                      <View style={styles.staffItemRoom}>
                                        <MaterialIcons name="meeting-room" size={14} color={COLORS.TEXT_SECONDARY} />
                                        <Text style={styles.staffItemRoomText}>{roomName}</Text>
                                      </View>
                                    )}
                                  </View>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      ) : null}

                      {isBooked ? (
                        <View>
                          <View style={styles.bookedSlotInfo}>
                            <MaterialIcons name="event-available" size={20} color={COLORS.PRIMARY} />
                            <Text style={styles.bookedSlotText}>
                              Đã đặt lịch cho ngày {formatDateDisplay(getWeekDate(weekOffset, normalizeWeekDate(slot.weekDate)))}
                              {bookedSlot?.room?.roomName && ` • Phòng: ${bookedSlot.room.roomName}`}
                              {bookedSlot?.status && ` • Trạng thái: ${bookedSlot.status}`}
                            </Text>
                          </View>
                          {canCancelSlot(slot, bookedSlot) && (
                            <TouchableOpacity
                              style={styles.cancelButton}
                              onPress={() => handleCancelSlot(slot, bookedSlot)}
                              activeOpacity={0.85}
                            >
                              <MaterialIcons name="cancel" size={18} color={COLORS.ERROR} />
                              <Text style={styles.cancelButtonText}>Hủy lịch học</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : null}
                      
                      {isCancelled ? (
                        <View>
                          <View style={[styles.bookedSlotInfo, { backgroundColor: COLORS.WARNING_BG }]}>
                            <MaterialIcons name="cancel" size={20} color={COLORS.WARNING} />
                            <Text style={[styles.bookedSlotText, { color: COLORS.WARNING }]}>
                              Đã hủy lịch cho ngày {formatDateDisplay(getWeekDate(weekOffset, normalizeWeekDate(slot.weekDate)))}
                              {cancelledSlot?.room?.roomName && ` • Phòng: ${cancelledSlot.room.roomName}`}
                            </Text>
                          </View>
                          <Text style={styles.cancelledInfoText}>
                            Bạn có thể đặt lại lịch này nếu còn chỗ trống.
                          </Text>
                        </View>
                      ) : null}
                      
                      {!isBooked ? (
                        <>
                          <TouchableOpacity 
                            style={styles.roomsToggleButton}
                            onPress={() => handleToggleRooms(slot.id)}
                            activeOpacity={0.85}
                          >
                            <MaterialIcons
                              name={isExpanded ? 'expand-less' : 'meeting-room'}
                              size={20}
                              color={COLORS.PRIMARY}
                            />
                            <Text style={styles.roomsToggleText}>
                              {isExpanded ? 'Thu gọn danh sách phòng' : 'Xem phòng khả dụng'}
                            </Text>
                            {roomsCount > 0 ? (
                              <View style={styles.roomsCountBadge}>
                                <Text style={styles.roomsCountText}>{roomsCount}</Text>
                              </View>
                            ) : null}
                          </TouchableOpacity>

                          {isExpanded ? (
                            <View style={styles.roomsContainer}>
                              {roomsCount === 0 ? (
                                <View style={styles.roomsStateRow}>
                                  <MaterialIcons
                                    name="meeting-room"
                                    size={20}
                                    color={COLORS.TEXT_SECONDARY}
                                  />
                                  <Text style={styles.roomsStateText}>
                                    Chưa có phòng phù hợp cho khung giờ này. Vui lòng liên hệ trung tâm.
                                  </Text>
                                </View>
                              ) : (
                                <>
                                  {displayRooms.map((room) => {
                                    const roomId = room.roomId || room.id;
                                    if (!roomId) return null; // Skip if no roomId
                                    
                                    const isSelected = roomState?.selectedRoomId === roomId;
                                    const availableCapacity = room.availableCapacity ?? room.capacity ?? 0;
                                    const capacity = room.capacity ?? 0;
                                    const isRoomFull = availableCapacity <= 0;
                                    
                                    return (
                                      <TouchableOpacity
                                        key={roomId}
                                        style={[
                                          styles.roomCard,
                                          isSelected && styles.roomCardSelected,
                                          isRoomFull && styles.roomCardFull,
                                        ]}
                                        onPress={() => {
                                          if (!isRoomFull && roomId) {
                                            handleSelectRoom(slot.id, roomId);
                                          }
                                        }}
                                        disabled={isRoomFull}
                                        activeOpacity={isRoomFull ? 1 : 0.85}
                                      >
                                        <View style={styles.roomCardHeader}>
                                          <Text style={[styles.roomTitle, isRoomFull && { color: COLORS.TEXT_SECONDARY }]}>
                                            {room.roomName}
                                          </Text>
                                          {isSelected && !isRoomFull ? (
                                            <MaterialIcons name="check-circle" size={20} color={COLORS.PRIMARY} />
                                          ) : isRoomFull ? (
                                            <View style={[styles.fullBadge, { backgroundColor: COLORS.ERROR }]}>
                                              <Text style={styles.fullBadgeText}>Đã full</Text>
                                            </View>
                                          ) : null}
                                        </View>
                                        {room.branchName || slot.branch?.branchName ? (
                                          <View style={styles.roomMetaRow}>
                                            <MaterialIcons name="domain" size={18} color={COLORS.SECONDARY} />
                                            <Text style={styles.roomMetaText}>
                                              {room.branchName || slot.branch?.branchName || 'Chi nhánh đang cập nhật'}
                                            </Text>
                                          </View>
                                        ) : null}
                                        {room.facilityName ? (
                                          <View style={styles.roomMetaRow}>
                                            <MaterialIcons name="business" size={18} color={COLORS.ACCENT} />
                                            <Text style={styles.roomMetaText}>
                                              Cơ sở: {room.facilityName}
                                            </Text>
                                          </View>
                                        ) : null}
                                        {room.staff ? (
                                          <View style={styles.roomMetaRow}>
                                            <MaterialIcons name="person" size={18} color={COLORS.SECONDARY} />
                                            <Text style={styles.roomMetaText}>
                                              Nhân viên: {room.staff.staffName || room.staff.fullName || 'Chưa có'}
                                              {room.staff.staffRole || room.staff.role ? ` (${room.staff.staffRole || room.staff.role})` : ''}
                                            </Text>
                                          </View>
                                        ) : null}
                                        <View style={styles.roomMetaRow}>
                                          <MaterialIcons 
                                            name="event-seat" 
                                            size={18} 
                                            color={isRoomFull ? COLORS.ERROR : COLORS.PRIMARY} 
                                          />
                                          <Text style={[styles.roomMetaText, isRoomFull && { color: COLORS.ERROR }]}>
                                            Sức chứa: {availableCapacity} / {capacity}
                                            {isRoomFull && ' (Đã đầy)'}
                                          </Text>
                                        </View>
                                        {room.staff ? (
                                          <View style={styles.roomMetaRow}>
                                            <MaterialIcons name="person" size={18} color={COLORS.SECONDARY} />
                                            <Text style={styles.roomMetaText}>
                                              Nhân viên: {room.staff.staffName || 'Chưa có'}
                                              {room.staff.staffRole ? ` (${room.staff.staffRole})` : ''}
                                            </Text>
                                          </View>
                                        ) : null}
                                      </TouchableOpacity>
                                    );
                                  })}
                                </>
                              )}

                              {roomsCount > 0 ? (
                                <>
                                  <TextInput
                                    style={styles.noteInput}
                                    placeholder="Ghi chú cho trung tâm (không bắt buộc)"
                                    placeholderTextColor={COLORS.TEXT_SECONDARY}
                                    multiline
                                    value={roomState?.parentNote ?? ''}
                                    onChangeText={(text) => handleChangeParentNote(slot.id, text)}
                                  />
                                  {subscriptionWarning ? (
                                    <Text style={styles.packageWarning}>{subscriptionWarning}</Text>
                                  ) : null}
                                  <TouchableOpacity
                                    style={[
                                      styles.bookButton,
                                      (!canBook || roomState?.bookingLoading) && styles.bookButtonDisabled,
                                    ]}
                                    onPress={() => handleBookSlot(slot)}
                                    disabled={!canBook || roomState?.bookingLoading}
                                    activeOpacity={0.85}
                                  >
                                    {roomState?.bookingLoading ? (
                                      <ActivityIndicator size="small" color={COLORS.SURFACE} />
                                    ) : (
                                      <>
                                        <MaterialIcons name="event-available" size={20} color={COLORS.SURFACE} />
                                        <Text style={styles.bookButtonText}>Đặt lịch cho con</Text>
                                      </>
                                    )}
                                  </TouchableOpacity>
                                </>
                              ) : null}
                            </View>
                          ) : null}
                        </>
                      ) : null}
            </View>
                  );
                })
                  )}
                </>
              )}
          </View>
          );
        })}

        {pagination?.hasNextPage ? (
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
                <Text style={styles.loadMoreText}>Xem thêm khung giờ</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
        </View>
    );
  };

  // Format date for display
  const formatDateForDisplay = (date: Date): string => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayName = days[date.getDay()];
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${dayName}, ${day}/${month}/${year}`;
  };

  // Get unique timeframes from slots
  const availableTimeframes = useMemo(() => {
    const timeframeMap = new Map<string, { id: string; name: string; startTime: string; endTime: string }>();
    slots.forEach((slot) => {
      if (slot.timeframe) {
        const key = slot.timeframe.id || `${slot.timeframe.startTime}-${slot.timeframe.endTime}`;
        if (!timeframeMap.has(key)) {
          timeframeMap.set(key, {
            id: slot.timeframe.id || key,
            name: slot.timeframe.name || formatTimeRange(slot.timeframe),
            startTime: slot.timeframe.startTime || '',
            endTime: slot.timeframe.endTime || '',
          });
        }
      }
    });
    return Array.from(timeframeMap.values()).sort((a, b) => {
      // Sort by start time
      if (a.startTime < b.startTime) return -1;
      if (a.startTime > b.startTime) return 1;
      return 0;
    });
  }, [slots]);

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

  // Update available dates when slots change
  useEffect(() => {
    if (slots.length > 0) {
      // Slots are already grouped by weekday, no need to update dates
    }
  }, [slots]);

  // Get slots for selected date and timeframe
  const getSlotsForSelectedDate = useMemo(() => {
    if (!selectedDate || !slots.length) return [];
    const selectedDay = selectedDate.getDay();
    const normalizedDay = selectedDay === 0 ? 0 : selectedDay; // 0 = CN, 1-6 = T2-T7
    let daySlots = groupedSlots[normalizedDay as WeekdayKey] || [];
    
    // Filter by selected timeframe if any
    if (selectedTimeframe) {
      daySlots = daySlots.filter((slot) => {
        if (!slot.timeframe) return false;
        const slotKey = slot.timeframe.id || `${slot.timeframe.startTime}-${slot.timeframe.endTime}`;
        return slotKey === selectedTimeframe;
      });
    }
    
    return daySlots;
  }, [selectedDate, groupedSlots, selectedTimeframe]);

  // Get branch name from slots
  const getBranchName = useMemo(() => {
    if (!slots.length) return 'Chưa có thông tin';
    const firstSlot = slots[0];
    return firstSlot.branch?.branchName || 'Chưa có thông tin';
  }, [slots]);

  // Get school name from selected student
  const getSchoolName = useMemo(() => {
    if (!selectedStudent) return 'Chưa có thông tin';
    return selectedStudent.schoolName || 'Chưa có thông tin';
  }, [selectedStudent]);

  // Get package name from selected subscription
  const getPackageName = useMemo(() => {
    if (!selectedSubscription) return 'Chưa chọn gói';
    return selectedSubscription.packageName || 'Chưa chọn gói';
  }, [selectedSubscription]);

  // Handle date change
  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      // Update weekOffset based on selected date
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

  // Scroll to selected date in date selector when selectedDate changes
  useEffect(() => {
    if (dateScrollViewRef.current && selectedDate && getAvailableDates.length > 0) {
      const dateIndex = getAvailableDates.findIndex(
        (date) => date.toDateString() === selectedDate.toDateString()
      );
      if (dateIndex >= 0) {
        // Calculate approximate scroll position (each date item is about 70px wide)
        const scrollPosition = dateIndex * 70;
        setTimeout(() => {
          dateScrollViewRef.current?.scrollTo({
            x: Math.max(0, scrollPosition - 100), // Offset to show some context
            animated: true,
          });
        }, 300);
      }
    }
  }, [selectedDate, getAvailableDates]);

  // Handle search
  const handleSearch = () => {
    if (!selectedStudentId) {
      Alert.alert('Thông báo', 'Vui lòng chọn con trước khi tìm kiếm.');
      return;
    }
    // Navigate to SelectSlotScreen
    navigation.navigate('SelectSlot', {
      studentId: selectedStudentId,
      initialDate: selectedDate.toISOString(),
    });
  };

  // Handle back from results
  const handleBackToForm = () => {
    setShowResults(false);
  };

  // Auto fetch slots when showing results
  useEffect(() => {
    if (showResults && selectedStudentId && slots.length === 0 && !slotsLoading) {
      fetchSlots({ page: 1 });
      fetchBookedSlots(selectedStudentId);
    }
  }, [showResults, selectedStudentId]);

  // Format date for date selector (short format)
  const formatDateShort = (date: Date): string => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayName = days[date.getDay()];
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${dayName}, ${day}/${month}`;
  };

  // Check if date has slots
  const dateHasSlots = useCallback((date: Date): boolean => {
    const day = date.getDay();
    const normalizedDay = day === 0 ? 0 : day;
    const daySlots = groupedSlots[normalizedDay as WeekdayKey] || [];
    return daySlots.length > 0;
  }, [groupedSlots]);

  // Handle date selection from horizontal selector
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    // Update weekOffset
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

  // Results Page View
  if (showResults) {
    return (
      <SafeAreaView style={styles.resultsContainer}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.resultsContent}
          refreshControl={
            selectedStudentId ? (
              <RefreshControl
                refreshing={slotsRefreshing}
                onRefresh={handleRefreshSlots}
                colors={[COLORS.PRIMARY]}
                tintColor={COLORS.PRIMARY}
              />
            ) : undefined
          }
        >
          {/* Results Header */}
          <View style={styles.resultsHeader}>
            <View style={styles.resultsHeaderTop}>
              <TouchableOpacity onPress={handleBackToForm} style={styles.backButton}>
                <MaterialIcons name="arrow-back" size={24} color={COLORS.SURFACE} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.resultsHeaderInfo}
                onPress={() => setShowStudentPicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.resultsHeaderInfoContent}>
                  <MaterialIcons name="child-care" size={20} color={COLORS.SURFACE} />
                  <Text style={styles.resultsHeaderTitle} numberOfLines={1}>
                    {selectedStudent?.name || 'Chọn con'} • {getBranchName}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={20} color={COLORS.SURFACE} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleBackToForm} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color={COLORS.SURFACE} />
              </TouchableOpacity>
            </View>
            
            {/* Date Selector */}
            <View style={styles.resultsDateSelector}>
              <TouchableOpacity
                style={styles.resultsDateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.resultsDateText}>{formatDateForDisplay(selectedDate)}</Text>
                <MaterialIcons name="arrow-drop-down" size={20} color={COLORS.SURFACE} />
              </TouchableOpacity>
              
              {/* Horizontal Date Scroll with Fixed Calendar Button */}
              <View style={styles.dateScrollWrapper}>
                <ScrollView
                  ref={dateScrollViewRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dateScrollContainer}
                  style={styles.dateScrollView}
                  nestedScrollEnabled={true}
                  scrollEnabled={true}
                  bounces={false}
                >
                  {getAvailableDates.map((date, index) => {
                    const isSelected = date.toDateString() === selectedDate.toDateString();
                    const hasSlots = dateHasSlots(date);
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.dateItem,
                          isSelected && styles.dateItemActive,
                          !hasSlots && styles.dateItemNoSlots,
                        ]}
                        onPress={() => handleDateSelect(date)}
                      >
                        <Text style={[styles.dateItemDay, isSelected && styles.dateItemDayActive]}>
                          {formatDateShort(date).split(',')[0]}
                        </Text>
                        <Text style={[styles.dateItemDate, isSelected && styles.dateItemDateActive]}>
                          {formatDateShort(date).split(',')[1].trim()}
                        </Text>
                        {hasSlots && (
                          <View style={styles.dateItemBadge}>
                            <Text style={styles.dateItemBadgeText}>
                              {groupedSlots[date.getDay() === 0 ? 0 : date.getDay() as WeekdayKey]?.length || 0}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                
                {/* Fixed Calendar Button */}
                <TouchableOpacity
                  style={styles.calendarButtonFixed}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="calendar-today" size={20} color={COLORS.SURFACE} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Slots List */}
          <View style={styles.resultsSlotsContainer}>
            <Text style={styles.resultsSlotsTitle}>Chọn slot</Text>
            
            {slotsLoading ? (
              <View style={styles.resultsLoadingContainer}>
                <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                <Text style={styles.resultsLoadingText}>Đang tải...</Text>
              </View>
            ) : getSlotsForSelectedDate.length === 0 ? (
              <View style={styles.resultsEmptyContainer}>
                <MaterialIcons name="event-busy" size={48} color={COLORS.TEXT_SECONDARY} />
                <Text style={styles.resultsEmptyText}>Không có slot nào vào ngày này</Text>
                <TouchableOpacity
                  style={styles.resultsEmptyButton}
                  onPress={() => setShowResults(false)}
                >
                  <Text style={styles.resultsEmptyButtonText}>Quay lại tìm kiếm</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.resultsSlotsList}>
                {getSlotsForSelectedDate.map((slot) => {
                  const bookedSlot = isSlotBooked(slot);
                  const cancelledSlot = getCancelledSlot(slot);
                  const slotDate = getWeekDate(weekOffset, normalizeWeekDate(slot.weekDate));
                  const slotDateDisplay = formatDateDisplay(slotDate);
                  const roomState = slotRoomsState[slot.id];
                  const roomsFromSlot = slot.rooms || [];
                  const isExpanded = roomState?.expanded ?? false;
                  const selectedRoomId = roomState?.selectedRoomId;
                  
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      style={styles.resultsSlotCard}
                      activeOpacity={0.9}
                      onPress={() => handleToggleRooms(slot.id)}
                    >
                      {/* Time Section */}
                      <View style={styles.resultsSlotTimeSection}>
                        <View style={styles.resultsSlotTimeLeft}>
                          <Text style={styles.resultsSlotTime}>{formatTime(slot.timeframe?.startTime)}</Text>
                          <Text style={styles.resultsSlotLocation}>{slot.branch?.branchName || 'Chưa có'}</Text>
                        </View>
                        
                        <View style={styles.resultsSlotDuration}>
                          <View style={styles.resultsSlotDurationLine} />
                          <Text style={styles.resultsSlotDurationText}>
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
                          <View style={styles.resultsSlotDurationLine} />
                        </View>
                        
                        <View style={styles.resultsSlotTimeRight}>
                          <Text style={styles.resultsSlotTime}>{formatTime(slot.timeframe?.endTime)}</Text>
                          <Text style={styles.resultsSlotLocation}>{getSchoolName}</Text>
                        </View>
                      </View>

                      {/* Info Section */}
                      <View style={styles.resultsSlotInfoSection}>
                        <View style={styles.resultsSlotInfoRow}>
                          <MaterialIcons name="location-on" size={16} color={COLORS.TEXT_SECONDARY} />
                          <Text style={styles.resultsSlotInfoText}>{slot.branch?.branchName || 'Chưa có'}</Text>
                        </View>
                        <View style={styles.resultsSlotInfoRow}>
                          <MaterialIcons name="school" size={16} color={COLORS.TEXT_SECONDARY} />
                          <Text style={styles.resultsSlotInfoText}>{getSchoolName}</Text>
                        </View>
                        <View style={styles.resultsSlotInfoRow}>
                          <MaterialIcons name="card-membership" size={16} color={COLORS.TEXT_SECONDARY} />
                          <Text style={styles.resultsSlotInfoText}>{getPackageName}</Text>
                        </View>
                        {/* Facility Info - hiển thị từ room đầu tiên hoặc slot */}
                        {(() => {
                          const firstRoom = roomsFromSlot[0];
                          const facilityName = firstRoom?.facilityName;
                          if (facilityName) {
                            return (
                              <View style={styles.resultsSlotInfoRow}>
                                <MaterialIcons name="business" size={16} color={COLORS.TEXT_SECONDARY} />
                                <Text style={styles.resultsSlotInfoText}>{facilityName}</Text>
                              </View>
                            );
                          }
                          return null;
                        })()}
                        {/* Staff Info - chỉ hiển thị nếu có nhân viên */}
                        {slot.staff && slot.staff.length > 0 && (
                          <View style={styles.resultsSlotInfoRow}>
                            <MaterialIcons name="person" size={16} color={COLORS.TEXT_SECONDARY} />
                            <Text style={styles.resultsSlotInfoText}>
                              {slot.staff.map((staff, index) => {
                                const staffName = staff.staffName || staff.fullName || 'Chưa có tên';
                                const staffRole = staff.staffRole || staff.role;
                                const roomName = staff.roomName;
                                let displayText = staffRole 
                                  ? `${staffName} (${staffRole})`
                                  : staffName;
                                if (roomName) {
                                  displayText += ` - ${roomName}`;
                                }
                                return displayText;
                              }).join(', ')}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Status and Action */}
                      {bookedSlot && !cancelledSlot ? (
                        <View style={styles.resultsSlotActionSection}>
                          <View style={styles.resultsSlotBookedBadge}>
                            <MaterialIcons name="check-circle" size={16} color={COLORS.SUCCESS} />
                            <Text style={styles.resultsSlotBookedText}>Đã đặt</Text>
                          </View>
                          {canCancelSlot(slot, bookedSlot) && (
                            <TouchableOpacity
                              style={styles.resultsSlotCancelButton}
                              onPress={() => handleCancelSlot(slot, bookedSlot)}
                            >
                              <MaterialIcons name="cancel" size={16} color={COLORS.ERROR} />
                              <Text style={styles.resultsSlotCancelButtonText}>Hủy</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : (
                        <>
                          <View style={styles.resultsSlotActionSection}>
                            <View style={styles.resultsSlotAvailability}>
                              <MaterialIcons name="event-available" size={16} color={COLORS.SUCCESS} />
                              <Text style={styles.resultsSlotAvailabilityText}>
                                {slot.rooms && slot.rooms.length > 0
                                  ? `${slot.rooms.length} phòng`
                                  : 'Chưa có phòng'}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={styles.resultsSlotExpandButton}
                              onPress={() => handleToggleRooms(slot.id)}
                            >
                              <MaterialIcons
                                name={isExpanded ? 'expand-less' : 'expand-more'}
                                size={24}
                                color={COLORS.PRIMARY}
                              />
                            </TouchableOpacity>
                          </View>

                          {/* Rooms Dropdown */}
                          {isExpanded && (
                            <View style={styles.resultsSlotRoomsContainer}>
                              {roomsFromSlot.length === 0 ? (
                                <View style={styles.resultsSlotRoomsEmpty}>
                                  <MaterialIcons name="meeting-room" size={24} color={COLORS.TEXT_SECONDARY} />
                                  <Text style={styles.resultsSlotRoomsEmptyText}>
                                    Chưa có phòng phù hợp cho khung giờ này
                                  </Text>
                                </View>
                              ) : (
                                <>
                                  <Text style={styles.resultsSlotRoomsTitle}>Chọn phòng:</Text>
                                  {roomsFromSlot.map((room) => {
                                    const roomId = room.roomId || room.id;
                                    if (!roomId) return null;
                                    
                                    const isSelected = selectedRoomId === roomId;
                                    const availableCapacity = room.availableCapacity ?? room.capacity ?? 0;
                                    const capacity = room.capacity ?? 0;
                                    const isRoomFull = availableCapacity <= 0;
                                    
                                    return (
                                      <TouchableOpacity
                                        key={roomId}
                                        style={[
                                          styles.resultsSlotRoomItem,
                                          isSelected && styles.resultsSlotRoomItemSelected,
                                          isRoomFull && styles.resultsSlotRoomItemFull,
                                        ]}
                                        onPress={() => {
                                          if (!isRoomFull && roomId) {
                                            handleSelectRoom(slot.id, roomId);
                                          }
                                        }}
                                        disabled={isRoomFull}
                                        activeOpacity={isRoomFull ? 1 : 0.7}
                                      >
                                        <View style={styles.resultsSlotRoomItemContent}>
                                          <View style={styles.resultsSlotRoomItemInfo}>
                                            <Text style={[styles.resultsSlotRoomItemName, isRoomFull && styles.resultsSlotRoomItemNameDisabled]}>
                                              {room.roomName}
                                            </Text>
                                            {room.facilityName && (
                                              <Text style={styles.resultsSlotRoomItemMeta}>
                                                Cơ sở: {room.facilityName}
                                              </Text>
                                            )}
                                            {room.staff && (
                                              <Text style={styles.resultsSlotRoomItemMeta}>
                                                Nhân viên: {room.staff.staffName || room.staff.fullName || 'Chưa có'}
                                                {room.staff.staffRole || room.staff.role ? ` (${room.staff.staffRole || room.staff.role})` : ''}
                                              </Text>
                                            )}
                                            <Text style={[styles.resultsSlotRoomItemCapacity, isRoomFull && styles.resultsSlotRoomItemCapacityDisabled]}>
                                              Sức chứa: {availableCapacity} / {capacity}
                                              {isRoomFull && ' (Đã đầy)'}
                                            </Text>
                                          </View>
                                          {isSelected && !isRoomFull ? (
                                            <MaterialIcons name="check-circle" size={20} color={COLORS.PRIMARY} />
                                          ) : isRoomFull ? (
                                            <MaterialIcons name="block" size={20} color={COLORS.ERROR} />
                                          ) : null}
                                        </View>
                                      </TouchableOpacity>
                                    );
                                  })}
                                  
                                  {/* Note Input */}
                                  <TextInput
                                    style={styles.resultsSlotNoteInput}
                                    placeholder="Ghi chú cho trung tâm (không bắt buộc)"
                                    placeholderTextColor={COLORS.TEXT_SECONDARY}
                                    multiline
                                    value={roomState?.parentNote ?? ''}
                                    onChangeText={(text) => handleChangeParentNote(slot.id, text)}
                                  />
                                  
                                  {/* Book Button - chỉ hiển thị khi đã chọn phòng */}
                                  {selectedRoomId ? (
                                    <TouchableOpacity
                                      style={[
                                        styles.resultsSlotBookButton,
                                        roomState?.bookingLoading && styles.resultsSlotBookButtonDisabled,
                                      ]}
                                      onPress={() => handleBookSlot(slot)}
                                      disabled={roomState?.bookingLoading}
                                    >
                                      {roomState?.bookingLoading ? (
                                        <ActivityIndicator size="small" color={COLORS.SURFACE} />
                                      ) : (
                                        <Text style={styles.resultsSlotBookButtonText}>Đặt lịch</Text>
                                      )}
                                    </TouchableOpacity>
                                  ) : (
                                    <View style={styles.resultsSlotBookButtonDisabled}>
                                      <Text style={styles.resultsSlotBookButtonTextDisabled}>
                                        Vui lòng chọn phòng trước
                                      </Text>
                                    </View>
                                  )}
                                </>
                              )}
                            </View>
                          )}
                        </>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
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
                        // Refresh slots for new student
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
      </SafeAreaView>
    );
  }

  // Form Page View
  return (
    <SafeAreaView style={styles.newContainer}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.newContent}
        refreshControl={
          selectedStudentId ? (
            <RefreshControl
              refreshing={slotsRefreshing}
              onRefresh={handleRefreshSlots}
              colors={[COLORS.PRIMARY]}
              tintColor={COLORS.PRIMARY}
            />
          ) : undefined
        }
      >
        {/* Loading State */}
        {studentsLoading && !students.length ? (
          <View style={styles.newLoadingContainer}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            <Text style={styles.newLoadingText}>Đang tải danh sách con...</Text>
          </View>
        ) : null}

        {/* Error State */}
        {studentsError ? (
          <View style={styles.newErrorContainer}>
            <MaterialIcons name="error-outline" size={42} color={COLORS.ERROR} />
            <Text style={styles.newErrorText}>{studentsError}</Text>
            <TouchableOpacity style={styles.newRetryButton} onPress={refetchStudents}>
              <Text style={styles.newRetryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Empty State */}
        {!studentsLoading && students.length === 0 ? (
          <View style={styles.newEmptyContainer}>
            <MaterialIcons name="child-care" size={42} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.newEmptyText}>
              Chưa có thông tin con trong tài khoản. Vui lòng thêm con tại mục Quản lý con để xem các
              khung giờ phù hợp.
            </Text>
          </View>
        ) : (
          <>
            {/* Swipeable Student Cards */}
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
                {/* Pagination Dots */}
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

            {/* Booking Form Card */}
            <Card style={styles.newFormCard} mode="elevated" elevation={4}>
              <Card.Content>

                {/* Information Fields */}
                <View style={styles.newInfoSection}>
                  <Surface style={styles.newInfoCard} elevation={1}>
                    <View style={styles.newInfoRow}>
                      <View style={styles.newInfoIconContainer}>
                        <MaterialIcons name="location-on" size={20} color={COLORS.PRIMARY} />
                      </View>
                      <View style={styles.newInfoContent}>
                        <Text style={styles.newInfoLabel}>Chi nhánh</Text>
                        <Text style={styles.newInfoValue} numberOfLines={2}>{getBranchName}</Text>
                      </View>
                    </View>
                  </Surface>
                  
                  <Surface style={styles.newInfoCard} elevation={1}>
                    <View style={styles.newInfoRow}>
                      <View style={styles.newInfoIconContainer}>
                        <MaterialIcons name="school" size={20} color={COLORS.PRIMARY} />
                      </View>
                      <View style={styles.newInfoContent}>
                        <Text style={styles.newInfoLabel}>Trường</Text>
                        <Text style={styles.newInfoValue} numberOfLines={2}>{getSchoolName}</Text>
                      </View>
                    </View>
                  </Surface>
                  
                </View>

                {/* Date Selection */}
                <View style={styles.newDateSection}>
                  <Text style={styles.newDateLabel}>Ngày học</Text>
                  <Surface style={styles.newDateButtonSurface} elevation={2}>
                    <TouchableOpacity
                      style={styles.newDateButton}
                      onPress={() => setShowDatePicker(true)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.newDateButtonIcon}>
                        <MaterialIcons name="calendar-today" size={22} color={COLORS.PRIMARY} />
                      </View>
                      <Text style={styles.newDateText}>{formatDateForDisplay(selectedDate)}</Text>
                      <MaterialIcons name="arrow-drop-down" size={20} color={COLORS.TEXT_SECONDARY} />
                    </TouchableOpacity>
                  </Surface>
                </View>

                {/* Timeframe Selection */}
                <View style={styles.newTimeframeSection}>
                  <Text style={styles.newTimeframeLabel}>Khung giờ</Text>
                  <Surface style={styles.newTimeframeButtonSurface} elevation={2}>
                    <TouchableOpacity
                      style={styles.newTimeframeButton}
                      onPress={() => setShowTimeframePicker(true)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.newTimeframeButtonIcon}>
                        <MaterialIcons name="access-time" size={22} color={COLORS.PRIMARY} />
                      </View>
                      <Text style={styles.newTimeframeText} numberOfLines={1}>
                        {selectedTimeframe 
                          ? availableTimeframes.find(tf => {
                              const key = tf.id || `${tf.startTime}-${tf.endTime}`;
                              return key === selectedTimeframe;
                            })?.name || 'Chọn khung giờ'
                          : 'Tất cả khung giờ'}
                      </Text>
                      <MaterialIcons name="arrow-drop-down" size={20} color={COLORS.TEXT_SECONDARY} />
                    </TouchableOpacity>
                  </Surface>
                </View>

                {/* Search Button */}
                <TouchableOpacity 
                  style={styles.newSearchButton} 
                  onPress={handleSearch}
                  activeOpacity={0.8}
                >
                  <View style={styles.newSearchButtonContent}>
                    <MaterialIcons name="search" size={22} color={COLORS.SURFACE} />
                    <Text style={styles.newSearchButtonText}>Tìm slot</Text>
                  </View>
                </TouchableOpacity>
              </Card.Content>
            </Card>

            {/* Slots List */}
            {selectedStudentId && (
              <View
                style={styles.newSlotsContainer}
                onLayout={(event) => {
                  const { y } = event.nativeEvent.layout;
                  setSlotsSectionY(y);
                }}
              >
                <Text style={styles.newSlotsTitle}>Khung giờ có sẵn</Text>
                {slotsLoading ? (
                  <View style={styles.newLoadingContainer}>
                    <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                    <Text style={styles.newLoadingText}>Đang tải...</Text>
                  </View>
                ) : getSlotsForSelectedDate.length === 0 ? (
                  <View style={styles.newEmptySlotsContainer}>
                    <MaterialIcons name="event-busy" size={32} color={COLORS.TEXT_SECONDARY} />
                    <Text style={styles.newEmptySlotsText}>Không có slot nào vào ngày này</Text>
                  </View>
                ) : (
                  <View style={styles.newSlotsList}>
                    {getSlotsForSelectedDate.map((slot) => {
                      const bookedSlot = isSlotBooked(slot);
                      const cancelledSlot = getCancelledSlot(slot);
                      return (
                        <View key={slot.id} style={styles.newSlotCard}>
                          <View style={styles.newSlotHeader}>
                            <MaterialIcons name="access-time" size={20} color={COLORS.PRIMARY} />
                            <Text style={styles.newSlotTime}>{formatTimeRange(slot.timeframe)}</Text>
                            {bookedSlot && !cancelledSlot && (
                              <View style={styles.newSlotBadge}>
                                <Text style={styles.newSlotBadgeText}>Đã đặt</Text>
                              </View>
                            )}
                          </View>
                          {slot.branch?.branchName && (
                            <Text style={styles.newSlotBranch}>{slot.branch.branchName}</Text>
                          )}
                          {!bookedSlot && !cancelledSlot && (
                            <TouchableOpacity
                              style={styles.newSlotBookButton}
                              onPress={() => handleBookSlot(slot)}
                              disabled={slotRoomsState[slot.id]?.bookingLoading}
                            >
                              {slotRoomsState[slot.id]?.bookingLoading ? (
                                <ActivityIndicator size="small" color={COLORS.SURFACE} />
                              ) : (
                                <Text style={styles.newSlotBookButtonText}>Đặt lịch</Text>
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <View style={styles.newRecentSearchesContainer}>
                <Text style={styles.newRecentSearchesTitle}>Tìm kiếm gần đây</Text>
                {recentSearches.map((search, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.newRecentSearchItem}
                    onPress={() => {
                      setSelectedStudentId(search.studentId);
                      // Parse date from search.date
                      const dateMatch = search.date.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                      if (dateMatch) {
                        const [, day, month, year] = dateMatch;
                        setSelectedDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
                      }
                    }}
                  >
                    <Text style={styles.newRecentSearchText}>
                      {search.studentName} • {search.date}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}

        {/* Timeframe Picker Modal */}
        <Modal
          visible={showTimeframePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowTimeframePicker(false)}
        >
          <View style={styles.newModalOverlay}>
            <View style={styles.newModalContent}>
              <View style={styles.newModalHeader}>
                <Text style={styles.newModalTitle}>Chọn khung giờ</Text>
                <TouchableOpacity onPress={() => setShowTimeframePicker(false)}>
                  <MaterialIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.newModalBody}>
                <TouchableOpacity
                  style={[
                    styles.newTimeframeOption,
                    !selectedTimeframe && styles.newTimeframeOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedTimeframe(null);
                    setShowTimeframePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.newTimeframeOptionText,
                      !selectedTimeframe && styles.newTimeframeOptionTextActive,
                    ]}
                  >
                    Tất cả khung giờ
                  </Text>
                  {!selectedTimeframe && (
                    <MaterialIcons name="check" size={20} color={COLORS.PRIMARY} />
                  )}
                </TouchableOpacity>
                {availableTimeframes.map((timeframe) => {
                  const key = timeframe.id || `${timeframe.startTime}-${timeframe.endTime}`;
                  const isSelected = selectedTimeframe === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.newTimeframeOption,
                        isSelected && styles.newTimeframeOptionActive,
                      ]}
                      onPress={() => {
                        setSelectedTimeframe(key);
                        setShowTimeframePicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.newTimeframeOptionText,
                          isSelected && styles.newTimeframeOptionTextActive,
                        ]}
                      >
                        {timeframe.name}
                      </Text>
                      {isSelected && (
                        <MaterialIcons name="check" size={20} color={COLORS.PRIMARY} />
                      )}
                    </TouchableOpacity>
                  );
                })}
                {availableTimeframes.length === 0 && (
                  <View style={styles.newEmptyTimeframesContainer}>
                    <Text style={styles.newEmptyTimeframesText}>
                      Chưa có khung giờ nào. Vui lòng tìm kiếm trước.
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
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
  studentSwipeContainer: {
    marginBottom: SPACING.MD,
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
  },
  slotDescription: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
    marginTop: SPACING.SM,
  },
  staffSection: {
    marginTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    paddingTop: SPACING.SM,
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  staffHeaderText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
    marginLeft: SPACING.XS,
  },
  staffItem: {
    marginBottom: SPACING.SM,
    paddingLeft: SPACING.MD,
  },
  staffItemContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  staffItemInfo: {
    flex: 1,
    marginLeft: SPACING.SM,
  },
  staffItemName: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  staffItemRole: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  staffItemRoom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  staffItemRoomText: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  roomsToggleButton: {
    marginTop: SPACING.SM,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
    borderRadius: 14,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS,
    backgroundColor: COLORS.SURFACE,
  },
  roomsToggleText: {
    flex: 1,
    marginLeft: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  roomsCountBadge: {
    marginLeft: SPACING.SM,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
  },
  roomsCountText: {
    color: COLORS.SURFACE,
    fontSize: FONTS.SIZES.XS,
    fontWeight: '700',
  },
  roomsContainer: {
    marginTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    paddingTop: SPACING.SM,
  },
  roomsStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  roomsStateColumn: {
    marginBottom: SPACING.SM,
  },
  roomsStateText: {
    flex: 1,
    marginLeft: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  roomsRetryButton: {
    alignSelf: 'flex-start',
    marginTop: SPACING.XS,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS,
  },
  roomsRetryButtonText: {
    color: COLORS.SURFACE,
    fontWeight: '600',
    fontSize: FONTS.SIZES.SM,
  },
  roomCard: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    backgroundColor: COLORS.SURFACE,
  },
  roomCardSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.SUCCESS_BG,
  },
  roomCardFull: {
    borderColor: COLORS.ERROR,
    backgroundColor: COLORS.ERROR_BG,
    opacity: 0.7,
  },
  fullBadge: {
    borderRadius: 12,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
  },
  fullBadgeText: {
    color: COLORS.SURFACE,
    fontSize: FONTS.SIZES.XS,
    fontWeight: '700',
  },
  roomCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.XS,
  },
  roomTitle: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  roomMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.XS,
  },
  roomMetaText: {
    marginLeft: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  roomLoadMoreButton: {
    marginTop: SPACING.XS,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
    borderRadius: 14,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS,
    backgroundColor: COLORS.SURFACE,
  },
  roomLoadMoreText: {
    marginLeft: SPACING.XS,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  bookingSection: {
    marginTop: SPACING.MD,
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  noteInput: {
    marginTop: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.SURFACE,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  packageWarning: {
    marginTop: SPACING.XS,
    fontSize: FONTS.SIZES.XS,
    color: COLORS.ERROR,
  },
  bookButton: {
    marginTop: SPACING.SM,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.PRIMARY,
  },
  bookButtonDisabled: {
    opacity: 0.5,
  },
  bookButtonText: {
    marginLeft: SPACING.SM,
    color: COLORS.SURFACE,
    fontSize: FONTS.SIZES.MD,
    fontWeight: '700',
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
  slotListContainer: {
    marginTop: SPACING.LG,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscriptionTitle: {
    flex: 1,
    marginLeft: SPACING.SM,
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  subscriptionRefresh: {
    padding: SPACING.XS,
  },
  subscriptionStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.SM,
  },
  subscriptionStateText: {
    marginLeft: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    flex: 1,
  },
  subscriptionRetryButton: {
    alignSelf: 'flex-start',
    marginTop: SPACING.XS,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  subscriptionRetryText: {
    color: COLORS.PRIMARY,
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
  },
  subscriptionChipList: {
    marginTop: SPACING.SM,
    paddingRight: SPACING.SM,
  },
  subscriptionChip: {
    width: 220,
    marginRight: SPACING.SM,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.SURFACE,
    padding: SPACING.MD,
  },
  subscriptionChipActive: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.SUCCESS_BG,
  },
  subscriptionChipInactive: {
    opacity: 0.6,
  },
  subscriptionChipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.XS,
  },
  subscriptionChipText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    marginRight: SPACING.SM,
  },
  subscriptionChipTextActive: {
    color: COLORS.PRIMARY,
  },
  subscriptionStatusBadge: {
    borderRadius: 10,
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
  },
  subscriptionStatusActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  subscriptionStatusInactive: {
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  subscriptionStatusText: {
    fontSize: FONTS.SIZES.XS,
    fontWeight: '600',
  },
  subscriptionChipMeta: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
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
  bookedSlotInfo: {
    marginTop: SPACING.SM,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SUCCESS_BG,
    borderRadius: 12,
    padding: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY_LIGHT,
  },
  bookedSlotText: {
    flex: 1,
    marginLeft: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
    lineHeight: 20,
  },
  cancelledInfoText: {
    marginTop: SPACING.XS,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    fontStyle: 'italic',
    paddingHorizontal: SPACING.SM,
  },
  cancelButton: {
    marginTop: SPACING.SM,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.ERROR_BG || '#FFEBEE',
    borderRadius: 12,
    padding: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.ERROR,
  },
  cancelButtonText: {
    marginLeft: SPACING.XS,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.ERROR,
    fontWeight: '600',
  },
  // New UI Styles
  newContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  newContent: {
    padding: SPACING.MD,
  },
  newHeader: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.LG,
    paddingHorizontal: SPACING.MD,
    marginBottom: SPACING.MD,
    borderRadius: 12,
  },
  newHeaderTitle: {
    fontSize: FONTS.SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.SURFACE,
  },
  newFormCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.LG,
    marginBottom: SPACING.LG,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  newTabsContainer: {
    marginBottom: SPACING.LG,
    width: '100%',
  },
  newTabsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.SM,
  },
  newTab: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    marginRight: SPACING.SM,
    borderRadius: 20,
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  newTabActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  newTabText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  newTabTextActive: {
    color: COLORS.SURFACE,
    fontWeight: '600',
  },
  newTabChip: {
    marginRight: 0,
    marginLeft: 0,
    marginBottom: SPACING.SM,
    height: 40,
  },
  newTabChipActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  newTabChipText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
  },
  newTabChipTextActive: {
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  newInfoSection: {
    marginBottom: SPACING.LG,
    gap: SPACING.SM,
  },
  newInfoCard: {
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    backgroundColor: COLORS.PRIMARY_50,
  },
  newInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newInfoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  newInfoContent: {
    flex: 1,
  },
  newInfoLabel: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  newInfoValue: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 20,
  },
  newDateSection: {
    marginBottom: SPACING.LG,
  },
  newDateLabel: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.SM,
  },
  newDateButtonSurface: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  newDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    backgroundColor: COLORS.SURFACE,
  },
  newDateButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.PRIMARY_50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.SM,
  },
  newDateText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    fontWeight: '500',
  },
  newSearchButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    paddingVertical: SPACING.MD,
    marginTop: SPACING.SM,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  newSearchButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newSearchButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '700',
    color: COLORS.SURFACE,
    marginLeft: SPACING.SM,
    letterSpacing: 0.5,
  },
  newSlotsContainer: {
    marginBottom: SPACING.LG,
  },
  newSlotsTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  newSlotsList: {
    gap: SPACING.MD,
  },
  newSlotCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  newSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  newSlotTime: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
    flex: 1,
  },
  newSlotBadge: {
    backgroundColor: COLORS.SUCCESS_BG,
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 12,
  },
  newSlotBadgeText: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  newSlotBranch: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.SM,
  },
  newSlotBookButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
    paddingVertical: SPACING.SM,
    alignItems: 'center',
    marginTop: SPACING.SM,
  },
  newSlotBookButtonText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  newLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.XL,
  },
  newLoadingText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.SM,
  },
  newErrorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.XL,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    marginBottom: SPACING.MD,
  },
  newErrorText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.ERROR,
    marginTop: SPACING.MD,
    textAlign: 'center',
  },
  newRetryButton: {
    marginTop: SPACING.MD,
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    borderRadius: 8,
  },
  newRetryButtonText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  newEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.XL,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    marginBottom: SPACING.MD,
  },
  newEmptyText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.MD,
    textAlign: 'center',
  },
  newEmptySlotsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.LG,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
  },
  newEmptySlotsText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.SM,
  },
  newRecentSearchesContainer: {
    marginTop: SPACING.LG,
  },
  newRecentSearchesTitle: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  newRecentSearchItem: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  newRecentSearchText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
  },
  newTimeframeSection: {
    marginBottom: SPACING.LG,
  },
  newTimeframeLabel: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.SM,
  },
  newTimeframeButtonSurface: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  newTimeframeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    backgroundColor: COLORS.SURFACE,
  },
  newTimeframeButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.PRIMARY_50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.SM,
  },
  newTimeframeText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    fontWeight: '500',
  },
  newModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  newModalContent: {
    backgroundColor: COLORS.SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  newModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.LG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  newModalTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  newModalBody: {
    maxHeight: 400,
  },
  newTimeframeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  newTimeframeOptionActive: {
    backgroundColor: COLORS.SUCCESS_BG,
  },
  newTimeframeOptionText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
  },
  newTimeframeOptionTextActive: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  newEmptyTimeframesContainer: {
    padding: SPACING.LG,
    alignItems: 'center',
  },
  newEmptyTimeframesText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  // Results Page Styles
  resultsContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  resultsContent: {
    paddingBottom: SPACING.XL,
  },
  resultsHeader: {
    backgroundColor: COLORS.PRIMARY,
    paddingTop: SPACING.MD,
    paddingBottom: SPACING.MD,
  },
  resultsHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    marginBottom: SPACING.MD,
  },
  backButton: {
    padding: SPACING.SM,
  },
  resultsHeaderInfo: {
    flex: 1,
    marginHorizontal: SPACING.MD,
  },
  resultsHeaderInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.XS,
  },
  resultsHeaderTitle: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
    textAlign: 'center',
    flex: 1,
  },
  closeButton: {
    padding: SPACING.SM,
  },
  resultsDateSelector: {
    paddingHorizontal: SPACING.MD,
  },
  resultsDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    marginBottom: SPACING.MD,
  },
  resultsDateText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.SURFACE,
    fontWeight: '600',
    marginRight: SPACING.XS,
  },
  dateScrollWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    height: 80, // Fixed height to ensure scroll works
  },
  dateScrollView: {
    flex: 1,
    marginRight: 60, // Space for fixed calendar button
  },
  dateScrollContainer: {
    paddingRight: SPACING.MD,
    alignItems: 'center',
  },
  dateItem: {
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    marginRight: SPACING.SM,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 60,
  },
  dateItemActive: {
    backgroundColor: COLORS.SURFACE,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.SURFACE,
  },
  dateItemNoSlots: {
    opacity: 0.5,
  },
  dateItemDay: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.SURFACE,
    fontWeight: '500',
  },
  dateItemDayActive: {
    color: COLORS.PRIMARY,
  },
  dateItemDate: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.SURFACE,
    marginTop: SPACING.XS,
  },
  dateItemDateActive: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  dateItemBadge: {
    marginTop: SPACING.XS,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 10,
    paddingHorizontal: SPACING.XS,
    paddingVertical: 2,
  },
  dateItemBadgeText: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.SURFACE,
    fontWeight: '600',
  },
  calendarButtonFixed: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 48,
    marginLeft: SPACING.SM,
    position: 'absolute',
    right: 0,
    zIndex: 10,
  },
  resultsSlotsContainer: {
    padding: SPACING.MD,
  },
  resultsSlotsTitle: {
    fontSize: FONTS.SIZES.XXL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.LG,
  },
  resultsSlotsList: {
    gap: SPACING.MD,
  },
  resultsSlotCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsSlotTimeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.MD,
    paddingBottom: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  resultsSlotTimeLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  resultsSlotTimeRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  resultsSlotTime: {
    fontSize: FONTS.SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  resultsSlotLocation: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  resultsSlotDuration: {
    alignItems: 'center',
    marginHorizontal: SPACING.MD,
  },
  resultsSlotDurationLine: {
    width: 40,
    height: 1,
    backgroundColor: COLORS.BORDER,
    marginVertical: SPACING.XS,
  },
  resultsSlotDurationText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  resultsSlotInfoSection: {
    marginBottom: SPACING.MD,
  },
  resultsSlotInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS,
  },
  resultsSlotInfoText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
    flex: 1,
  },
  resultsSlotActionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultsSlotAvailability: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  resultsSlotAvailabilityText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.SUCCESS,
    fontWeight: '600',
    marginLeft: SPACING.XS,
  },
  resultsSlotBookedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SUCCESS_BG,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 20,
  },
  resultsSlotBookedText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.SUCCESS,
    fontWeight: '600',
    marginLeft: SPACING.XS,
  },
  resultsSlotExpandButton: {
    padding: SPACING.SM,
  },
  resultsSlotRoomsContainer: {
    marginTop: SPACING.MD,
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  resultsSlotRoomsTitle: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  resultsSlotRoomsEmpty: {
    alignItems: 'center',
    padding: SPACING.LG,
  },
  resultsSlotRoomsEmptyText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.SM,
    textAlign: 'center',
  },
  resultsSlotRoomItem: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    backgroundColor: COLORS.SURFACE,
  },
  resultsSlotRoomItemSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.SUCCESS_BG,
  },
  resultsSlotRoomItemFull: {
    borderColor: COLORS.ERROR,
    backgroundColor: COLORS.ERROR_BG,
    opacity: 0.7,
  },
  resultsSlotRoomItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultsSlotRoomItemInfo: {
    flex: 1,
  },
  resultsSlotRoomItemName: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  resultsSlotRoomItemNameDisabled: {
    color: COLORS.TEXT_SECONDARY,
  },
  resultsSlotRoomItemMeta: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS,
  },
  resultsSlotRoomItemCapacity: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS,
  },
  resultsSlotRoomItemCapacityDisabled: {
    color: COLORS.ERROR,
  },
  resultsSlotNoteInput: {
    marginTop: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.SURFACE,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  resultsSlotBookButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.MD,
  },
  resultsSlotBookButtonDisabled: {
    backgroundColor: COLORS.BACKGROUND,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  resultsSlotBookButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  resultsSlotBookButtonTextDisabled: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  resultsSlotCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.ERROR_BG || '#FFEBEE',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.ERROR,
    marginLeft: SPACING.SM,
  },
  resultsSlotCancelButtonText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.ERROR,
    marginLeft: SPACING.XS,
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
    padding: SPACING.LG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  studentPickerTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
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
    backgroundColor: COLORS.PRIMARY_50,
  },
  studentPickerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentPickerItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.PRIMARY_50,
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
    marginBottom: SPACING.XS,
  },
  studentPickerItemNameActive: {
    color: COLORS.PRIMARY,
  },
  studentPickerItemBranch: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  resultsLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.XL,
  },
  resultsLoadingText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.MD,
  },
  resultsEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.XL,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
  },
  resultsEmptyText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.MD,
    textAlign: 'center',
  },
  resultsEmptyButton: {
    marginTop: SPACING.LG,
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderRadius: 8,
  },
  resultsEmptyButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
});

export default ScheduleScreen;
