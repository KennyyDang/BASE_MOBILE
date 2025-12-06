import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StaffTabParamList } from '../../types';

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

const PAGE_SIZE = 100;

type WeekdayKey = 0 | 1 | 2 | 3 | 4 | 5 | 6;

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
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const dayName = days[date.getDay()];
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${dayName}, ${day}/${month}/${year}`;
};

const formatDateShort = (date: Date): string => {
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const dayName = days[date.getDay()];
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${dayName}, ${day}/${month}`;
};

interface SlotStudent {
  id: string;
  studentId: string;
  studentName: string;
  parentName?: string;
  status: string;
  parentNote?: string;
}

type StaffScheduleRouteProp = RouteProp<StaffTabParamList, 'StaffSchedule'>;

const StaffScheduleScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<StaffScheduleRouteProp>();
  const { user } = useAuth();
  
  // Lấy initialDate từ params nếu có
  const initialDateParam = route.params?.initialDate;
  const getInitialDate = (): Date => {
    if (initialDateParam) {
      const date = new Date(initialDateParam);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    return new Date();
  };
  
  // Cập nhật selectedDate khi initialDateParam thay đổi
  useEffect(() => {
    if (initialDateParam) {
      const date = new Date(initialDateParam);
      if (!isNaN(date.getTime())) {
        date.setHours(0, 0, 0, 0);
        setSelectedDate(date);
      }
    }
  }, [initialDateParam]);

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
  const [selectedDate, setSelectedDate] = useState<Date>(getInitialDate());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateScrollViewRef = useRef<ScrollView>(null); // Ref để scroll date selector
  
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
          upcomingOnly: false,
        });
        const rawItems = response?.items ?? [];
        
        // Map response từ API sang format StudentSlotResponse
        // API trả về structure khác: có branch (không phải branchSlot), roomId/roomName trực tiếp, studentSlots array
        const mappedItems: StudentSlotResponse[] = rawItems.map((item: any) => {
          // Lấy student đầu tiên từ studentSlots array (nếu có)
          const firstStudentSlot = item.studentSlots?.[0];
          
          return {
            id: item.id, // branchSlotId
            branchSlotId: item.id,
            branchSlot: item.branch ? {
              id: item.branch.id,
              branchName: item.branch.branchName,
            } : null,
            packageSubscriptionId: '', // Không có trong response
            date: item.date,
            status: item.status,
            parentNote: firstStudentSlot?.parentNote || null,
            roomId: item.roomId || '',
            room: item.roomName ? {
              id: item.roomId || '',
              roomName: item.roomName,
            } : null,
            studentId: firstStudentSlot?.student?.id || '',
            studentName: firstStudentSlot?.student?.name || '',
            parentId: firstStudentSlot?.parent?.id || '',
            parentName: firstStudentSlot?.parent?.name || '',
            timeframe: item.timeframe ? {
              id: item.timeframe.id,
              name: item.timeframe.name,
              startTime: item.timeframe.startTime,
              endTime: item.timeframe.endTime,
            } : null,
            // Lưu thêm thông tin gốc để dùng sau
            _rawData: item,
          } as StudentSlotResponse & { _rawData?: any };
        });
        
        // Deduplicate: Mỗi branchSlot (id + roomId + date) chỉ nên xuất hiện 1 lần
        // Vì 1 slot = 1 branchSlotId + 1 roomId + 1 date
        const uniqueSlots = new Map<string, StudentSlotResponse>();
        mappedItems.forEach((slot) => {
          // Key là branchSlotId + roomId + date để đảm bảo mỗi slot (branchSlot + room + date) chỉ có 1 instance
          const dateStr = slot.date ? new Date(slot.date).toISOString().split('T')[0] : '';
          const uniqueKey = `${slot.branchSlotId}_${slot.roomId}_${dateStr}`;
          if (!uniqueSlots.has(uniqueKey)) {
            uniqueSlots.set(uniqueKey, slot);
          } else {
            // Nếu đã có slot với key này, kiểm tra xem slot mới có nhiều studentSlots hơn không
            const existingSlot = uniqueSlots.get(uniqueKey)!;
            const existingCount = (existingSlot as any)?._rawData?.studentSlots?.length || 0;
            const newCount = (slot as any)?._rawData?.studentSlots?.length || 0;
            // Giữ slot có nhiều studentSlots hơn (đầy đủ thông tin hơn)
            if (newCount > existingCount) {
              uniqueSlots.set(uniqueKey, slot);
            }
          }
        });
        
        setSlots(Array.from(uniqueSlots.values()));
      } catch (error: any) {
        const message =
          error?.message ||
          error?.response?.data?.message ||
          'Không thể tải lịch làm việc. Vui lòng thử lại.';
        setError(message);
        setSlots([]);
      } finally {
        if (!silent) {
          setLoading(false);
        }
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

  // Group slots by weekday for badge count
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

    slots.forEach((slot) => {
      if (!slot.date) return;
      const slotDate = new Date(slot.date);
      slotDate.setHours(0, 0, 0, 0);
      const dayOfWeek = slotDate.getDay() as WeekdayKey;
      groups[dayOfWeek].push(slot);
    });

    return groups;
  }, [slots]);

  // Get slots for selected date
  const getSlotsForSelectedDate = useMemo(() => {
    if (!selectedDate || !slots.length) return [];
    const selectedDay = selectedDate.getDay();
    const normalizedDay = selectedDay === 0 ? 0 : selectedDay;
    let daySlots = groupedSlots[normalizedDay as WeekdayKey] || [];
    
    // Filter by exact date match
    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    daySlots = daySlots.filter((slot) => {
      if (!slot.date) return false;
      const slotDateStr = new Date(slot.date).toISOString().split('T')[0];
      return slotDateStr === selectedDateStr;
    });
    
    // Sort by time
    daySlots.sort((a, b) => {
      const timeA = a.timeframe?.startTime || '';
      const timeB = b.timeframe?.startTime || '';
      return timeA.localeCompare(timeB);
    });
    
    return daySlots;
  }, [selectedDate, groupedSlots, slots]);

  // Check if date has slots
  const dateHasSlots = useCallback((date: Date): boolean => {
    const day = date.getDay();
    const normalizedDay = day === 0 ? 0 : day;
    const daySlots = groupedSlots[normalizedDay as WeekdayKey] || [];
    const dateStr = date.toISOString().split('T')[0];
    return daySlots.some((slot) => {
      if (!slot.date) return false;
      const slotDateStr = new Date(slot.date).toISOString().split('T')[0];
      return slotDateStr === dateStr;
    });
  }, [groupedSlots]);

  // Handle date selection from horizontal selector
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  // Handle date picker change
  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      
      // Scroll to selected date after a short delay to ensure dates are rendered
      setTimeout(() => {
        const dateIndex = getAvailableDates.findIndex(
          (d) => d.toDateString() === date.toDateString()
        );
        if (dateIndex >= 0 && dateScrollViewRef.current) {
          const scrollPosition = dateIndex * 70;
          dateScrollViewRef.current.scrollTo({
            x: Math.max(0, scrollPosition - 100),
            animated: true,
          });
        }
      }, 200);
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

  const handleSlotPress = (slot: StudentSlotResponse & { _rawData?: any }) => {
    if (!slot) {
      return;
    }

    try {
      navigation.navigate('StudentManagement', {
        branchSlotId: slot.branchSlotId,
        date: slot.date,
        roomId: slot.roomId,
        slotTimeframe: slot.timeframe?.name,
        branchName: slot.branchSlot?.branchName,
        roomName: slot.room?.roomName,
      });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Không thể mở trang quản lý học sinh. Vui lòng thử lại.';
      Alert.alert('Lỗi', message);
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

  // Get branch name from slots
  const getBranchName = useMemo(() => {
    if (!slots.length) return 'Chưa có thông tin';
    const firstSlot = slots[0];
    return firstSlot.branchSlot?.branchName || 'Chưa có thông tin';
  }, [slots]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.PRIMARY]} tintColor={COLORS.PRIMARY} />
        }
      >
        {/* Header */}
        <View style={styles.resultsHeader}>
          <View style={styles.resultsHeaderTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color={COLORS.SURFACE} />
            </TouchableOpacity>
            <View style={styles.resultsHeaderInfo}>
              <View style={styles.resultsHeaderInfoContent}>
                <MaterialIcons name="person" size={20} color={COLORS.SURFACE} />
                <Text style={styles.resultsHeaderTitle} numberOfLines={1}>
                  {user?.email || 'Nhân viên'} • {getBranchName}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={COLORS.SURFACE} />
            </TouchableOpacity>
          </View>
          
          {/* Date Selector */}
          <View style={styles.resultsDateSelector}>
            <TouchableOpacity
              style={styles.resultsDateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.resultsDateText}>{formatDateDisplay(selectedDate)}</Text>
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
                            {groupedSlots[date.getDay() === 0 ? 0 : date.getDay() as WeekdayKey]?.filter((slot) => {
                              if (!slot.date) return false;
                              const slotDateStr = new Date(slot.date).toISOString().split('T')[0];
                              const dateStr = date.toISOString().split('T')[0];
                              return slotDateStr === dateStr;
                            }).length || 0}
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
          
          {loading ? (
            <View style={styles.resultsLoadingContainer}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
              <Text style={styles.resultsLoadingText}>Đang tải...</Text>
            </View>
          ) : getSlotsForSelectedDate.length === 0 ? (
            <View style={styles.resultsEmptyContainer}>
              <MaterialIcons name="event-busy" size={48} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.resultsEmptyText}>Không có ca làm việc nào vào ngày này</Text>
            </View>
          ) : (
            <View style={styles.resultsSlotsList}>
              {getSlotsForSelectedDate.map((slot) => {
                const rawData = (slot as any)?._rawData;
                // Get room info from slot
                const roomName = slot.room?.roomName || rawData?.roomName;
                const slotTypeName = rawData?.slotType?.name;
                const studentSlotsCount = rawData?.studentSlots?.length || 0;
                const hasStudents = studentSlotsCount > 0;
                
                return (
                  <TouchableOpacity
                    key={slot.id}
                    style={styles.resultsSlotCard}
                    activeOpacity={0.9}
                    onPress={() => handleSlotPress(slot)}
                  >
                    {/* Time Section */}
                    <View style={styles.resultsSlotTimeSection}>
                      <View style={styles.resultsSlotTimeLeft}>
                        <Text style={styles.resultsSlotTime}>{formatTime(slot.timeframe?.startTime)}</Text>
                        <Text style={styles.resultsSlotLocation}>{slot.branchSlot?.branchName || 'Chưa có'}</Text>
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
                        <Text style={styles.resultsSlotLocation}>
                          {slotTypeName || 'Chưa có học sinh'}
                        </Text>
                      </View>
                    </View>

                    {/* Info Section */}
                    <View style={styles.resultsSlotInfoSection}>
                      <View style={styles.resultsSlotInfoRow}>
                        <MaterialIcons name="location-on" size={16} color={COLORS.TEXT_SECONDARY} />
                        <Text style={styles.resultsSlotInfoText}>{slot.branchSlot?.branchName || 'Chưa có'}</Text>
                      </View>
                      {slotTypeName && (
                        <View style={styles.resultsSlotInfoRow}>
                          <MaterialIcons name="category" size={16} color={COLORS.TEXT_SECONDARY} />
                          <Text style={styles.resultsSlotInfoText}>{slotTypeName}</Text>
                        </View>
                      )}
                      {slot.timeframe?.name && (
                        <View style={styles.resultsSlotInfoRow}>
                          <MaterialIcons name="access-time" size={16} color={COLORS.TEXT_SECONDARY} />
                          <Text style={styles.resultsSlotInfoText}>{slot.timeframe.name}</Text>
                        </View>
                      )}
                      {roomName && (
                        <View style={styles.resultsSlotInfoRow}>
                          <MaterialIcons name="meeting-room" size={16} color={COLORS.TEXT_SECONDARY} />
                          <Text style={styles.resultsSlotInfoText}>{roomName}</Text>
                        </View>
                      )}
                    </View>

                    {/* Action Section */}
                    <View style={styles.resultsSlotActionSection}>
                      <View style={styles.resultsSlotAvailability}>
                        <MaterialIcons name="event-available" size={16} color={COLORS.SUCCESS} />
                        <Text style={styles.resultsSlotAvailabilityText}>
                          {hasStudents ? `${studentSlotsCount} học sinh` : 'Chưa có học sinh'}
                        </Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={24} color={COLORS.PRIMARY} />
                    </View>
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

      {/* Slot Detail Modal - Thông tin slot và số lượng học sinh */}
      <Modal
        visible={slotDetailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thông tin slot</Text>
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

            {/* Student Count */}
            {loadingStudents ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                <Text style={styles.modalLoadingText}>Đang tải thông tin...</Text>
              </View>
            ) : (
              <View style={styles.modalStudentCountContainer}>
                <View style={styles.modalStudentCountIcon}>
                  <MaterialIcons name="people" size={32} color={COLORS.PRIMARY} />
                </View>
                <Text style={styles.modalStudentCountText}>
                  {slotStudents.length > 0 
                    ? `${slotStudents.length} học sinh` 
                    : 'Chưa có học sinh nào trong slot này'}
                </Text>
              </View>
            )}

            {/* Manage Students Button */}
            <TouchableOpacity
              style={[
                styles.manageStudentsButton,
                loadingStudents && styles.manageStudentsButtonDisabled
              ]}
              onPress={() => {
                if (!loadingStudents && selectedSlot) {
                  handleCloseModal();
                  navigation.navigate('StudentManagement', {
                    branchSlotId: selectedSlot.branchSlotId,
                    date: selectedSlot.date,
                    roomId: selectedSlot.roomId,
                    slotTimeframe: selectedSlot.timeframe?.name,
                    branchName: selectedSlot.branchSlot?.branchName,
                    roomName: selectedSlot.room?.roomName,
                  });
                }
              }}
              activeOpacity={0.7}
              disabled={loadingStudents}
            >
              <MaterialIcons name="manage-accounts" size={20} color={COLORS.SURFACE} />
              <Text style={styles.manageStudentsButtonText}>Quản lý học sinh</Text>
            </TouchableOpacity>
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
    flexGrow: 1,
  },
  resultsHeader: {
    backgroundColor: COLORS.PRIMARY,
    paddingTop: Platform.OS === 'ios' ? 0 : SPACING.MD,
    paddingBottom: SPACING.MD,
  },
  resultsHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  backButton: {
    padding: SPACING.XS,
  },
  resultsHeaderInfo: {
    flex: 1,
    marginHorizontal: SPACING.SM,
  },
  resultsHeaderInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsHeaderTitle: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
    marginLeft: SPACING.XS,
  },
  closeButton: {
    padding: SPACING.XS,
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
    fontWeight: '700',
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
  resultsLoadingContainer: {
    alignItems: 'center',
    padding: SPACING.XL,
  },
  resultsLoadingText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  resultsEmptyContainer: {
    alignItems: 'center',
    padding: SPACING.XL,
  },
  resultsEmptyText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
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
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  },
  modalTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  attendanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SUCCESS,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 12,
    gap: SPACING.XS,
  },
  attendanceButtonText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.SURFACE,
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
  modalStudentCountContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.XL,
    paddingHorizontal: SPACING.MD,
  },
  modalStudentCountIcon: {
    marginBottom: SPACING.MD,
  },
  modalStudentCountText: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  manageStudentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    marginHorizontal: SPACING.MD,
    marginBottom: SPACING.MD,
    borderRadius: 12,
    gap: SPACING.SM,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  manageStudentsButtonDisabled: {
    opacity: 0.5,
  },
  manageStudentsButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
});

export default StaffScheduleScreen;
