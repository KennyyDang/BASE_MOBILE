import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

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

const ScheduleScreen: React.FC = () => {
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
  const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = tuần hiện tại, -1 = tuần trước, 1 = tuần sau
  const [bookedSlots, setBookedSlots] = useState<StudentSlotResponse[]>([]);
  const [bookedSlotsLoading, setBookedSlotsLoading] = useState(false);

  useEffect(() => {
    if (students.length && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  const selectedStudent: StudentResponse | null = useMemo(() => {
    return students.find((student) => student.id === selectedStudentId) ?? null;
  }, [selectedStudentId, students]);

  const computeRemainingSlots = useCallback((subscription: StudentPackageSubscription) => {
    const total = subscription.totalSlotsSnapshot ?? subscription.totalSlots ?? subscription.remainingSlots;
    if (typeof total === 'number') {
      return Math.max(total - (subscription.usedSlot || 0), 0);
    }
    // Try to parse from packageName if it contains a number (e.g., "15 slot")
    const nameMatch = subscription.packageName?.match(/(\d+)/);
    if (nameMatch) {
      const totalFromName = parseInt(nameMatch[1], 10);
      if (!isNaN(totalFromName)) {
        return Math.max(totalFromName - (subscription.usedSlot || 0), 0);
      }
    }
    return undefined;
  }, []);

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

        const currentValid = activeData.find((sub) => sub.id === selectedSubscriptionId);
        if (currentValid) {
          setSelectedSubscriptionId(currentValid.id);
        } else {
          const defaultSubscription =
            activeData.find((sub) => sub.status === 'Active' && (computeRemainingSlots(sub) ?? 1) > 0) ||
            activeData.find((sub) => sub.status === 'Active') ||
            activeData[0];
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
    [selectedSubscriptionId, computeRemainingSlots]
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

      if (append) {
        setLoadingMore(true);
      } else {
        setSlotsError(null);
        if (!silent) {
          setSlotsLoading(true);
        }
      }

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
        if (append) {
          setLoadingMore(false);
        } else {
          setSlotsLoading(false);
          setSlotsRefreshing(false);
        }
      }
    },
    [selectedStudentId]
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
      let shouldFetch = false;
      setSlotRoomsState((prev) => {
        const existing = prev[slotId] ? { ...prev[slotId] } : createDefaultSlotRoomsState();
        const nextExpanded = !existing.expanded;
        if (nextExpanded && !existing.rooms.length && !existing.loading) {
          shouldFetch = true;
        }
        return {
          ...prev,
          [slotId]: {
            ...existing,
            expanded: nextExpanded,
          },
        };
      });

      if (shouldFetch) {
        fetchSlotRooms(slotId);
      }
    },
    [fetchSlotRooms]
  );

  const handleRetryRooms = useCallback(
    (slotId: string) => {
      fetchSlotRooms(slotId);
    },
    [fetchSlotRooms]
  );

  const handleLoadMoreRooms = useCallback(
    (slotId: string) => {
      const entry = slotRoomsState[slotId];
      if (!entry || entry.loading || !entry.pagination?.hasNextPage) {
        return;
      }
      const nextPage = (entry.pagination.pageIndex ?? 1) + 1;
      fetchSlotRooms(slotId, { page: nextPage, append: true });
    },
    [slotRoomsState, fetchSlotRooms]
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
      if (!entry) {
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
      const selectedRoom = entry.rooms.find((room) => room.id === entry.selectedRoomId);

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
              const payload = {
                studentId: selectedStudentId,
                branchSlotId: slot.id,
                packageSubscriptionId,
                roomId: entry.selectedRoomId,
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
                const message =
                  error?.response?.data?.message ||
                  error?.response?.data?.error ||
                  error?.message ||
                  'Không thể đặt slot cho con. Vui lòng thử lại sau.';
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

  // Fetch danh sách slot đã đặt
  const fetchBookedSlots = useCallback(
    async (studentId: string) => {
      setBookedSlotsLoading(true);
      try {
        const response = await studentSlotService.getStudentSlots({
          studentId,
          pageIndex: 1,
          pageSize: 100, // Fetch nhiều để có đủ dữ liệu
        });
        setBookedSlots(response.items || []);
      } catch (error: any) {
        // Không hiển thị lỗi, chỉ log để debug
        console.warn('Failed to fetch booked slots:', error?.message || error);
        setBookedSlots([]);
      } finally {
        setBookedSlotsLoading(false);
      }
    },
    []
  );

  // Kiểm tra xem slot đã được đặt chưa
  const isSlotBooked = useCallback(
    (slot: BranchSlotResponse): StudentSlotResponse | null => {
      const slotDate = computeSlotDateISO(slot, weekOffset);
      const slotDateObj = new Date(slotDate);
      slotDateObj.setHours(0, 0, 0, 0);

      return (
        bookedSlots.find((booked) => {
          if (booked.branchSlotId !== slot.id) {
            return false;
          }
          const bookedDate = new Date(booked.date);
          bookedDate.setHours(0, 0, 0, 0);
          return bookedDate.getTime() === slotDateObj.getTime();
        }) || null
      );
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
  }, [selectedStudentId, fetchSlots, fetchBookedSlots]);

  // Refresh booked slots khi weekOffset thay đổi
  useEffect(() => {
    if (selectedStudentId) {
      fetchBookedSlots(selectedStudentId);
    }
  }, [weekOffset, selectedStudentId, fetchBookedSlots]);

  const handleRefreshSlots = useCallback(() => {
    if (!selectedStudentId) {
      return;
    }
    setSlotsRefreshing(true);
    fetchSlots({ page: 1, silent: true });
    fetchBookedSlots(selectedStudentId);
  }, [selectedStudentId, fetchSlots, fetchBookedSlots]);

  const handleRetrySlots = useCallback(() => {
    if (!selectedStudentId) {
      return;
    }
    fetchSlots({ page: 1 });
  }, [selectedStudentId, fetchSlots]);

  const handleLoadMore = useCallback(() => {
    if (!pagination?.hasNextPage || loadingMore) {
      return;
    }
    const nextPage = (pagination.pageIndex ?? 1) + 1;
    fetchSlots({ page: nextPage, append: true });
  }, [fetchSlots, pagination, loadingMore]);

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
                      const total = subscription.totalSlotsSnapshot ?? subscription.totalSlots ?? subscription.remainingSlots;
                      let totalDisplay = '?';
                      if (typeof total === 'number') {
                        totalDisplay = total.toString();
                      } else {
                        // Try to parse from packageName
                        const nameMatch = subscription.packageName?.match(/(\d+)/);
                        if (nameMatch) {
                          totalDisplay = nameMatch[1];
                        }
                      }
                      return `${subscription.usedSlot || 0} / ${totalDisplay} buổi đã dùng`;
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
                  <Text style={styles.emptySlotText}>Chưa có slot nào trong ngày</Text>
              </View>
              ) : (
                daySlots.map((slot) => {
                  const statusStyle = getStatusBadgeStyle(slot.status);
                  const staffCount = slot.staff?.length ?? 0;
                  const roomState = slotRoomsState[slot.id];
                  const roomsCount = roomState?.rooms?.length ?? 0;
                  const isExpanded = roomState?.expanded ?? false;
                  const bookedSlot = isSlotBooked(slot);
                  const isBooked = !!bookedSlot;
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
                  const canBook =
                    !isBooked &&
                    Boolean(packageSubscriptionId && roomState?.selectedRoomId && roomsCount > 0) &&
                    isSubscriptionActive &&
                    hasRemaining;
                  const subscriptionWarning = !packageSubscriptionId
                    ? 'Chưa tìm thấy gói áp dụng. Vui lòng chọn gói phù hợp trước khi đặt slot.'
                    : !isSubscriptionActive
                    ? 'Gói này đã hết hiệu lực. Vui lòng chọn gói khác.'
                    : !hasRemaining
                    ? 'Gói hiện không còn buổi khả dụng. Vui lòng gia hạn hoặc chọn gói khác.'
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
                        <View style={styles.bookedSlotInfo}>
                          <MaterialIcons name="event-available" size={20} color={COLORS.PRIMARY} />
                          <Text style={styles.bookedSlotText}>
                            Đã đặt lịch cho ngày {formatDateDisplay(getWeekDate(weekOffset, normalizeWeekDate(slot.weekDate)))}
                            {bookedSlot?.room?.roomName && ` • Phòng: ${bookedSlot.room.roomName}`}
                            {bookedSlot?.status && ` • Trạng thái: ${bookedSlot.status}`}
                          </Text>
                        </View>
                      ) : (
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
                              {roomState?.loading && roomsCount === 0 ? (
                                <View style={styles.roomsStateRow}>
                                  <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                                  <Text style={styles.roomsStateText}>Đang tải danh sách phòng...</Text>
                                </View>
                              ) : null}

                              {roomState?.error ? (
                                <View style={styles.roomsStateColumn}>
                                  <View style={styles.roomsStateRow}>
                                    <MaterialIcons name="error-outline" size={20} color={COLORS.ERROR} />
                                    <Text style={[styles.roomsStateText, { color: COLORS.ERROR }]}>
                                      {roomState.error}
                                    </Text>
                                  </View>
                                  <TouchableOpacity 
                                    style={styles.roomsRetryButton}
                                    onPress={() => handleRetryRooms(slot.id)}
                                  >
                                    <Text style={styles.roomsRetryButtonText}>Thử lại</Text>
                                  </TouchableOpacity>
                                </View>
                              ) : null}

                              {!roomState?.loading && !roomState?.error && roomsCount === 0 ? (
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
                              ) : null}

                              {roomState?.rooms.map((room) => (
                                <TouchableOpacity
                                  key={room.id}
                                  style={[
                                    styles.roomCard,
                                    roomState.selectedRoomId === room.id && styles.roomCardSelected,
                                  ]}
                                  onPress={() => handleSelectRoom(slot.id, room.id)}
                                  activeOpacity={0.85}
                                >
                                  <View style={styles.roomCardHeader}>
                                    <Text style={styles.roomTitle}>{room.roomName}</Text>
                                    {roomState.selectedRoomId === room.id ? (
                                      <MaterialIcons name="check-circle" size={20} color={COLORS.PRIMARY} />
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
                                      <Text style={styles.roomMetaText}>{room.facilityName}</Text>
                                    </View>
                                  ) : null}
                                  {typeof room.capacity === 'number' ? (
                                    <View style={styles.roomMetaRow}>
                                      <MaterialIcons name="event-seat" size={18} color={COLORS.PRIMARY} />
                                      <Text style={styles.roomMetaText}>
                                        Sức chứa tối đa: {room.capacity}
                                      </Text>
                                    </View>
                                  ) : null}
                                </TouchableOpacity>
                              ))}

                              {roomState?.pagination?.hasNextPage ? (
                                <TouchableOpacity
                                  style={styles.roomLoadMoreButton}
                                  onPress={() => handleLoadMoreRooms(slot.id)}
                                  disabled={roomState.loading}
                                  activeOpacity={0.85}
                                >
                                  {roomState.loading ? (
                                    <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                                  ) : (
                                    <>
                                      <MaterialIcons name="expand-more" size={20} color={COLORS.PRIMARY} />
                                      <Text style={styles.roomLoadMoreText}>Xem thêm phòng</Text>
                                    </>
                                  )}
                                </TouchableOpacity>
                              ) : null}

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
                      )}
            </View>
                  );
                })
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Khung giờ trống phù hợp</Text>
          <Text style={styles.headerSubtitle}>
            Theo dõi và lựa chọn khung giờ tại trung tâm phù hợp với nhịp sinh hoạt của con
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
              Chưa có thông tin con trong tài khoản. Vui lòng thêm con tại mục Quản lý con để xem các
              khung giờ phù hợp.
            </Text>
          </View>
        ) : (
          <>
            {renderStudentSelector()}
            {renderSelectedStudentInfo()}
            {renderSubscriptionSection()}
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

        {!studentsLoading && students.length > 0 ? (
          <>
            {renderSlotList()}
          </>
        ) : null}
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
});

export default ScheduleScreen;
