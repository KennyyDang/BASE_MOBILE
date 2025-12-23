import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS } from '../../constants';
import { RootStackParamList } from '../../types';
import { BranchSlotResponse } from '../../types/api';
import branchSlotService from '../../services/branchSlotService';
import studentSlotService from '../../services/studentSlotService';
import packageService from '../../services/packageService';
import { StudentPackageSubscription, StudentResponse } from '../../types/api';
import { useMyChildren } from '../../hooks/useChildrenApi';

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

// Interface for grouped slot data used in bulk booking
interface GroupedSlot {
  id: string;
  branchName: string;
  timeframeName: string;
  startTime: string;
  endTime: string;
  slotTypeName: string;
  weekDaysAvailable: WeekdayKey[];
  branchId?: string;
  timeframeId?: string;
}

// Interface for enriched student data with subscriptions and branch info
interface EnrichedStudent {
  id: string;
  name: string;
  age: number;
  dateOfBirth: string;
  image: string;
  note: string;
  status: boolean;
  userId: string;
  userName: string;
  branchId: string;
  subscriptions: StudentPackageSubscription[];
}

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

const formatTime = (time?: string | null) => {
  if (!time) return '--:--';
  const parts = time.split(':');
  if (parts.length < 2) return time;
  return `${(parts[0] || '').padStart(2, '0')}:${(parts[1] || '').padStart(2, '0')}`;
};

type BulkBookRouteProp = RouteProp<RootStackParamList, 'BulkBook'>;
type BulkBookNavProp = NativeStackNavigationProp<RootStackParamList, 'BulkBook'>;

// Step definitions
const STEPS = [
  { id: 'selectChild', title: 'Chọn con', icon: 'child-care' },
  { id: 'dateRange', title: 'Chọn khoảng thời gian', icon: 'calendar-today' },
  { id: 'weekdays', title: 'Chọn ngày trong tuần', icon: 'date-range' },
  { id: 'slotSelection', title: 'Chọn khung giờ', icon: 'schedule' },
  { id: 'confirm', title: 'Xác nhận', icon: 'check-circle' },
];

const BulkBookScreen: React.FC = () => {
  const navigation = useNavigation<BulkBookNavProp>();
  const route = useRoute<BulkBookRouteProp>();
  const { studentId: initialStudentId, branchSlotId, packageSubscriptionId: initialPackageSubscriptionId, roomId: initialRoomId } = route.params || {};

  // Get children data
  const { students, loading: studentsLoading } = useMyChildren();

  // Enriched students data with subscriptions and branch info
  const [enrichedStudents, setEnrichedStudents] = useState<EnrichedStudent[]>([]);
  const [enrichedStudentsLoading, setEnrichedStudentsLoading] = useState(false);

  // Step management
  const [currentStep, setCurrentStep] = useState(initialStudentId ? 1 : 0);
  const [formData, setFormData] = useState({
    studentId: initialStudentId || '',
    studentName: '',
    startDate: '',
    endDate: '',
    weekDates: [] as WeekdayKey[],
    slotId: '',
    roomId: initialRoomId || '',
    parentNote: '',
    subscriptionId: '',
    subscriptionName: '',
  });

  // UI states
  const [startDatePicker, setStartDatePicker] = useState(new Date());
  const [endDatePicker, setEndDatePicker] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Data states
  const [slots, setSlots] = useState<GroupedSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [subscriptions, setSubscriptions] = useState<StudentPackageSubscription[]>([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Validation states
  const [stepErrors, setStepErrors] = useState<Record<number, string>>({});

  // Enrich students with subscriptions and branch info
  const enrichStudentsData = useCallback(async (students: StudentResponse[]): Promise<EnrichedStudent[]> => {
    if (students.length === 0) return [];

    const enriched: EnrichedStudent[] = [];

    for (const student of students) {
      try {
        // Fetch subscriptions for this student
        const subscriptions = await packageService.getStudentSubscriptions(student.id);
        const activeSubscriptions = subscriptions.filter((sub) => {
          if (!sub.status) return false;
          const status = sub.status.trim().toUpperCase();
          return status === 'ACTIVE';
        });

        enriched.push({
          ...student,
          subscriptions: activeSubscriptions,
        });
      } catch (err) {
        console.warn(`Failed to enrich data for student ${student.id}:`, err);
        // Still add student with empty data
        enriched.push({
          ...student,
          subscriptions: [],
        });
      }
    }

    return enriched;
  }, []);

  // Load enriched students data
  const loadEnrichedStudents = useCallback(async () => {
    if (students.length === 0) return;

    setEnrichedStudentsLoading(true);
    try {
      const enriched = await enrichStudentsData(students);
      setEnrichedStudents(enriched);
    } catch (err) {
      console.warn('Failed to load enriched students data:', err);
      setEnrichedStudents([]);
    } finally {
      setEnrichedStudentsLoading(false);
    }
  }, [students, enrichStudentsData]);

  // Load subscriptions
  const loadSubscriptions = useCallback(async () => {
    if (!formData.studentId) return;
    setSubscriptionsLoading(true);
    try {
      const data = await packageService.getStudentSubscriptions(formData.studentId);
      const activeData = data.filter((sub) => {
        if (!sub.status) return false;
        const status = sub.status.trim().toUpperCase();
        return status === 'ACTIVE';
      });
      setSubscriptions(activeData);
    } catch (err) {
      console.warn('Failed to load subscriptions:', err);
      setSubscriptions([]);
    } finally {
      setSubscriptionsLoading(false);
    }
  }, [formData.studentId]);

  // Auto-select package
  const autoSelectPackage = useCallback(() => {
    if (subscriptions.length === 0) return;

    const selectedSlot = slots.find(s => s.id === formData.slotId);
    if (!selectedSlot) return;

    const activeSubscriptions = subscriptions;
    const firstActiveSubscription = activeSubscriptions[0];

    if (firstActiveSubscription) {
      // For now, skip package validation - will be handled by backend
      const allowedPackageIds: string[] = [];
      const subscriptionPackageId = firstActiveSubscription.packageId;

      if (allowedPackageIds.length === 0 || allowedPackageIds.includes(subscriptionPackageId)) {
        setFormData(prev => ({
          ...prev,
          subscriptionId: firstActiveSubscription.id,
          subscriptionName: firstActiveSubscription.packageName || 'Gói không tên'
        }));
      }
    }
  }, [subscriptions, slots, formData.slotId]);

  // Step validation
  const validateCurrentStep = useCallback(() => {
    setStepErrors(prev => ({ ...prev, [currentStep]: '' }));

    switch (currentStep) {
      case 0: // Select child
        if (!formData.studentId) {
          setStepErrors(prev => ({ ...prev, [currentStep]: 'Vui lòng chọn con' }));
          return false;
        }
        return true;

      case 1: // Date range
        if (!formData.startDate || !formData.endDate) {
          setStepErrors(prev => ({ ...prev, [currentStep]: 'Vui lòng chọn ngày bắt đầu và kết thúc' }));
          return false;
        }
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        if (start > end) {
          setStepErrors(prev => ({ ...prev, [currentStep]: 'Ngày bắt đầu phải trước ngày kết thúc' }));
          return false;
        }
        return true;

      case 2: // Weekdays
        if (formData.weekDates.length === 0) {
          setStepErrors(prev => ({ ...prev, [currentStep]: 'Vui lòng chọn ít nhất một ngày trong tuần' }));
          return false;
        }
        return true;

      case 3: // Slot selection
        if (!formData.slotId) {
          setStepErrors(prev => ({ ...prev, [currentStep]: 'Vui lòng chọn khung giờ' }));
          return false;
        }
        return true;

      default:
        return true;
    }
  }, [currentStep, formData]);

  // Step navigation
  const handleNext = useCallback(() => {
    if (validateCurrentStep()) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
    }
  }, [currentStep, validateCurrentStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Update form data
  const updateFormData = useCallback((updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  // Toggle weekday
  const toggleWeekDate = useCallback((weekday: WeekdayKey) => {
    updateFormData({
      weekDates: formData.weekDates.includes(weekday)
        ? formData.weekDates.filter(d => d !== weekday)
        : [...formData.weekDates, weekday]
    });
  }, [formData.weekDates, updateFormData]);

  // Auto-select student from route params
  useEffect(() => {
    if (initialStudentId && students.length > 0) {
      const selectedStudent = students.find(s => s.id === initialStudentId);
      if (selectedStudent) {
        setFormData(prev => ({
          ...prev,
          studentId: selectedStudent.id,
          studentName: selectedStudent.name || 'Chưa có tên'
        }));
      }
    }
  }, [initialStudentId, students]);

  // Load enriched students data when students change
  useEffect(() => {
    if (students.length > 0 && !studentsLoading) {
      loadEnrichedStudents();
    }
  }, [students, studentsLoading, loadEnrichedStudents]);

  // Load initial data
  useEffect(() => {
    if (formData.studentId) {
      loadSubscriptions();
    }
  }, [formData.studentId, loadSubscriptions]);

  // Update date pickers when form data changes
  useEffect(() => {
    if (formData.startDate) {
      setStartDatePicker(new Date(formData.startDate));
    }
    if (formData.endDate) {
      setEndDatePicker(new Date(formData.endDate));
    }
  }, [formData.startDate, formData.endDate]);

  // Load slots when moving to slot selection step
  const loadSlotsForSelection = useCallback(async () => {
    if (!formData.studentId || !formData.startDate || !formData.endDate || formData.weekDates.length === 0) {
      return;
    }

    setSlotsLoading(true);
    try {

      // For bulk booking, load all slots in range (paginate)
      const items: BranchSlotResponse[] = [];
      let pageIndex = 1;
      const pageSize = 200;
      // The filtering by weekDates will be done client-side
      while (true) {
        const resp = await branchSlotService.getAvailableSlotsForStudent(
          formData.studentId,
          pageIndex,
          pageSize,
          { startDate: formData.startDate, endDate: formData.endDate }
        );
        if (Array.isArray(resp.items)) items.push(...resp.items);
        if (!resp.hasNextPage || pageIndex > 50) break;
        pageIndex += 1;
      }

      

      // Group slots by timeframe and branch
      const slotMap = new Map();
      items
        .filter((slot: BranchSlotResponse) => slot.status?.toLowerCase() === 'available' && formData.weekDates.includes(slot.weekDate as WeekdayKey))
        .forEach((slot: BranchSlotResponse) => {
          const key = `${slot.branch?.id || 'unknown'}_${slot.timeframe?.id || 'unknown'}`;
          if (!slotMap.has(key)) {
            slotMap.set(key, {
              id: slot.id,
              branchName: slot.branch?.branchName || 'Chi nhánh không tên',
              timeframeName: slot.timeframe?.name || 'Khung giờ không tên',
              startTime: slot.timeframe?.startTime || '--:--',
              endTime: slot.timeframe?.endTime || '--:--',
              slotTypeName: slot.slotType?.name || '',
              weekDaysAvailable: [slot.weekDate as WeekdayKey],
              branchId: slot.branch?.id,
              timeframeId: slot.timeframe?.id
            });
          } else {
            const existing = slotMap.get(key);
            if (!existing.weekDaysAvailable.includes(slot.weekDate as WeekdayKey)) {
              existing.weekDaysAvailable.push(slot.weekDate as WeekdayKey);
            }
          }
        });

      const uniqueSlots = Array.from(slotMap.values()).sort((a, b) => {
        const timeA = a.startTime.split(':').map(Number);
        const timeB = b.startTime.split(':').map(Number);
        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
      });

      setSlots(uniqueSlots);

      // Auto-select slot if branchSlotId provided
      if (branchSlotId && uniqueSlots.length > 0) {
        const targetSlot = uniqueSlots.find(s => s.id === branchSlotId);
        if (targetSlot) {
          updateFormData({ slotId: targetSlot.id });
        }
      }
    } catch (e: any) {
      console.warn('Failed to load slots:', e);
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [formData.studentId, formData.startDate, formData.endDate, formData.weekDates, branchSlotId, updateFormData]);

  // Load slots when step 4 is reached
  useEffect(() => {
    if (currentStep === 3) {
      loadSlotsForSelection();
    }
  }, [currentStep, loadSlotsForSelection]);

  // Auto-select package when slot is selected
  useEffect(() => {
    if (formData.slotId && subscriptions.length > 0) {
      autoSelectPackage();
    }
  }, [formData.slotId, subscriptions, autoSelectPackage]);

  const submitBooking = useCallback(async () => {
    if (!formData.studentId || !formData.subscriptionId) {
      Alert.alert('Thiếu thông tin', 'Không tìm thấy thông tin gói học. Vui lòng thử lại.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        studentId: formData.studentId,
        packageSubscriptionId: formData.subscriptionId,
        branchSlotId: formData.slotId,
        roomId: formData.roomId || null,
        startDate: formData.startDate,
        endDate: formData.endDate,
        weekDates: formData.weekDates,
        parentNote: formData.parentNote || ''
      };

      const result = await studentSlotService.bulkBookSlots(payload as any);
      const bookedCount = Array.isArray(result) ? result.length : 1;

      Alert.alert(
        'Thành công',
        `Đã đặt thành công ${bookedCount} lịch.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể đặt lịch hàng loạt.');
    } finally {
      setSubmitting(false);
    }
  }, [formData, navigation]);

  // Calculate available weekdays for current date range
  const availableWeekdays = useMemo(() => {
    if (!formData.startDate || !formData.endDate) return new Set<WeekdayKey>();

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const available = new Set<WeekdayKey>();

    const cursor = new Date(start);
    while (cursor <= end) {
      available.add(cursor.getDay() as WeekdayKey);
      cursor.setDate(cursor.getDate() + 1);
    }

    return available;
  }, [formData.startDate, formData.endDate]);

  // Estimate number of slots
  const estimatedSlots = useMemo(() => {
    if (!formData.startDate || !formData.endDate || formData.weekDates.length === 0) return 0;

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    let count = 0;

    const cursor = new Date(start);
    while (cursor <= end) {
      if (formData.weekDates.includes(cursor.getDay() as WeekdayKey)) {
        count++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return count;
  }, [formData.startDate, formData.endDate, formData.weekDates]);

  // Calculate total days in date range (for summary display)
  const totalDaysInRange = useMemo(() => {
    if (!formData.startDate || !formData.endDate) return 0;

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    
    // Set to midnight để tính chính xác số ngày (bao gồm cả ngày kết thúc)
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 để bao gồm ngày bắt đầu
    
    return Math.max(0, diffDays);
  }, [formData.startDate, formData.endDate]);

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: // Select Child Step
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <MaterialIcons name="child-care" size={24} color={COLORS.PRIMARY} />
              <Text style={styles.stepTitle}>Bước 1/5: Chọn con</Text>
            </View>

            {enrichedStudentsLoading || studentsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                <Text style={styles.loadingText}>Đang tải thông tin con...</Text>
              </View>
            ) : enrichedStudents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="child-care" size={48} color={COLORS.TEXT_SECONDARY} />
                <Text style={styles.emptyText}>Bạn chưa có thông tin con nào</Text>
                <Text style={styles.emptySubtext}>Vui lòng liên hệ quản lý để cập nhật thông tin</Text>
              </View>
            ) : (
              <View style={styles.childrenContainer}>
                {enrichedStudents.map((student) => {
                  const isSelected = student.id === formData.studentId;

                  return (
                    <TouchableOpacity
                      key={student.id}
                      style={[
                        styles.childCard,
                        isSelected && styles.childCardSelected,
                      ]}
                      onPress={() => updateFormData({
                        studentId: student.id,
                        studentName: student.name || 'Chưa có tên'
                      })}
                    >
                      <View style={styles.childCardContent}>
                        <View style={styles.childCardHeader}>
                          <View style={styles.childAvatar}>
                            {student.image ? (
                              <Image
                                source={{ uri: student.image }}
                                style={styles.childImage}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.childImagePlaceholder}>
                                <MaterialIcons
                                  name="person"
                                  size={24}
                                  color={COLORS.PRIMARY}
                                />
                              </View>
                            )}
                          </View>
                          <View style={styles.childInfo}>
                            <Text style={[styles.childName, isSelected && styles.childNameSelected]}>
                              {student.name || 'Chưa có tên'}
                            </Text>
                          </View>
                          {isSelected && (
                            <MaterialIcons name="check-circle" size={24} color={COLORS.PRIMARY} />
                          )}
                        </View>

                        <View style={styles.childDetailsContainer}>
                          {student.subscriptions.length > 0 ? (
                            student.subscriptions.map((subscription, index) => (
                              <View key={subscription.id || index} style={styles.childDetailRow}>
                                <MaterialIcons name="card-membership" size={16} color={isSelected ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY} />
                                <Text style={[styles.childDetailText, isSelected && styles.childDetailTextSelected]}>
                                  {subscription.packageName || 'Gói học không tên'}
                                </Text>
                              </View>
                            ))
                          ) : (
                            <View style={styles.childDetailRow}>
                              <MaterialIcons name="info" size={16} color={isSelected ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY} />
                              <Text style={[styles.childDetailText, isSelected && styles.childDetailTextSelected]}>
                                Chưa có gói học active
                              </Text>
                            </View>
                          )}

                          {/* Branch info removed for cleaner UI */}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {stepErrors[0] && (
              <Text style={styles.errorText}>{stepErrors[0]}</Text>
            )}
          </View>
        );

      case 1: // Date Range Step
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <MaterialIcons name="calendar-today" size={24} color={COLORS.PRIMARY} />
              <Text style={styles.stepTitle}>Bước 2/5: Chọn khoảng thời gian</Text>
            </View>

            <View style={styles.dateRangeContainer}>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowStartPicker(true)}
              >
                <MaterialIcons name="event" size={20} color={COLORS.PRIMARY} />
                <Text style={styles.dateInputText}>
                  Từ: {formData.startDate ? formatDateDisplay(new Date(formData.startDate)) : 'Chọn ngày'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowEndPicker(true)}
              >
                <MaterialIcons name="event" size={20} color={COLORS.PRIMARY} />
                <Text style={styles.dateInputText}>
                  Đến: {formData.endDate ? formatDateDisplay(new Date(formData.endDate)) : 'Chọn ngày'}
                </Text>
              </TouchableOpacity>
            </View>

            {formData.startDate && formData.endDate && (
              <View style={styles.dateSummary}>
                <Text style={styles.dateSummaryText}>
                  Khoảng thời gian: {formatDateDisplay(new Date(formData.startDate))} → {formatDateDisplay(new Date(formData.endDate))}
                </Text>
                <Text style={styles.dateSummarySubtext}>
                  Tổng cộng: {totalDaysInRange} ngày
                </Text>
              </View>
            )}

            {stepErrors[0] && (
              <Text style={styles.errorText}>{stepErrors[0]}</Text>
            )}
          </View>
        );

      case 1: // Date Range Step
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <MaterialIcons name="calendar-today" size={24} color={COLORS.PRIMARY} />
              <Text style={styles.stepTitle}>Bước 2/5: Chọn khoảng thời gian</Text>
            </View>

            <Text style={styles.weekdaysDescription}>
              Chọn những ngày trong tuần mà bạn muốn đặt lịch. Chỉ có thể chọn những ngày có trong khoảng thời gian đã chọn.
            </Text>

            <View style={styles.weekdaysContainer}>
              {WEEKDAY_ORDER.map((weekday) => {
                const isAvailable = availableWeekdays.has(weekday);
                const isSelected = formData.weekDates.includes(weekday);

                return (
                  <TouchableOpacity
                    key={weekday}
                    style={[
                      styles.weekdayChip,
                      isSelected && styles.weekdayChipSelected,
                      !isAvailable && styles.weekdayChipDisabled,
                    ]}
                    onPress={() => isAvailable && toggleWeekDate(weekday)}
                    disabled={!isAvailable}
                  >
                    <Text style={[
                      styles.weekdayChipText,
                      isSelected && styles.weekdayChipTextSelected,
                      !isAvailable && styles.weekdayChipTextDisabled,
                    ]}>
                      {WEEKDAY_LABELS[weekday].subtitle}
                    </Text>
                    <Text style={[
                      styles.weekdayChipSubtext,
                      isSelected && styles.weekdayChipTextSelected,
                      !isAvailable && styles.weekdayChipTextDisabled,
                    ]}>
                      {WEEKDAY_LABELS[weekday].title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {formData.weekDates.length > 0 && (
              <View style={styles.selectionSummary}>
                <Text style={styles.selectionSummaryText}>
                  ✓ Đã chọn {formData.weekDates.length} ngày: {formData.weekDates.map(d => WEEKDAY_LABELS[d].title).join(', ')}
                </Text>
              </View>
            )}

            {stepErrors[1] && (
              <Text style={styles.errorText}>{stepErrors[1]}</Text>
            )}
          </View>
        );

      case 2: // Weekdays Step
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <MaterialIcons name="date-range" size={24} color={COLORS.PRIMARY} />
              <Text style={styles.stepTitle}>Bước 3/5: Chọn ngày trong tuần</Text>
            </View>

            <Text style={styles.weekdaysDescription}>
              Chọn những ngày trong tuần mà bạn muốn đặt lịch. Chỉ có thể chọn những ngày có trong khoảng thời gian đã chọn.
            </Text>

            <View style={styles.weekdaysContainer}>
              {WEEKDAY_ORDER.map((weekday) => {
                const isAvailable = availableWeekdays.has(weekday);
                const isSelected = formData.weekDates.includes(weekday);

                return (
                  <TouchableOpacity
                    key={weekday}
                    style={[
                      styles.weekdayChip,
                      isSelected && styles.weekdayChipSelected,
                      !isAvailable && styles.weekdayChipDisabled,
                    ]}
                    onPress={() => isAvailable && toggleWeekDate(weekday)}
                    disabled={!isAvailable}
                  >
                    <Text style={[
                      styles.weekdayChipText,
                      isSelected && styles.weekdayChipTextSelected,
                      !isAvailable && styles.weekdayChipTextDisabled,
                    ]}>
                      {WEEKDAY_LABELS[weekday].subtitle}
                    </Text>
                    <Text style={[
                      styles.weekdayChipSubtext,
                      isSelected && styles.weekdayChipTextSelected,
                      !isAvailable && styles.weekdayChipTextDisabled,
                    ]}>
                      {WEEKDAY_LABELS[weekday].title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {formData.weekDates.length > 0 && (
              <View style={styles.selectionSummary}>
                <Text style={styles.selectionSummaryText}>
                  ✓ Đã chọn {formData.weekDates.length} ngày: {formData.weekDates.map(d => WEEKDAY_LABELS[d].title).join(', ')}
                </Text>
              </View>
            )}

            {stepErrors[2] && (
              <Text style={styles.errorText}>{stepErrors[2]}</Text>
            )}
          </View>
        );

      case 3: // Slot Selection Step
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <MaterialIcons name="schedule" size={24} color={COLORS.PRIMARY} />
              <Text style={styles.stepTitle}>Bước 4/5: Chọn khung giờ</Text>
            </View>

            {slotsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                <Text style={styles.loadingText}>Đang tải danh sách slot...</Text>
              </View>
            ) : slots.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="schedule" size={48} color={COLORS.TEXT_SECONDARY} />
                <Text style={styles.emptyText}>Không tìm thấy slot nào phù hợp cho khoảng thời gian này</Text>
              </View>
            ) : (
              <View style={styles.slotsContainer}>
                {slots.map((slot) => {
                  const isSelected = slot.id === formData.slotId;

                  return (
                    <TouchableOpacity
                      key={slot.id}
                      style={[
                        styles.slotCard,
                        isSelected && styles.slotCardSelected,
                      ]}
                      onPress={() => updateFormData({ slotId: slot.id })}
                    >
                      <View style={styles.slotCardHeader}>
                        <View style={styles.slotCardIcon}>
                          <MaterialIcons name="schedule" size={20} color={isSelected ? COLORS.SURFACE : COLORS.PRIMARY} />
                        </View>
                        <View style={styles.slotCardInfo}>
                          <Text style={[styles.slotCardTitle, isSelected && styles.slotCardTitleSelected]}>
                            {slot.timeframeName}
                          </Text>
                          <Text style={[styles.slotCardTime, isSelected && styles.slotCardTitleSelected]}>
                            {slot.startTime} - {slot.endTime}
                          </Text>
                        </View>
                        {isSelected && (
                          <MaterialIcons name="check-circle" size={24} color={COLORS.SURFACE} />
                        )}
                      </View>

                      <View style={styles.slotCardDetails}>
                        <Text style={[styles.slotCardBranch, isSelected && styles.slotCardDetailSelected]}>
                          {slot.branchName}
                        </Text>
                        {slot.slotTypeName && (
                          <Text style={[styles.slotCardType, isSelected && styles.slotCardDetailSelected]}>
                            {slot.slotTypeName}
                          </Text>
                        )}
                        <Text style={[styles.slotCardDays, isSelected && styles.slotCardDetailSelected]}>
                          📅 {slot.weekDaysAvailable.length} ngày: {slot.weekDaysAvailable.map((d: WeekdayKey) => WEEKDAY_LABELS[d]?.title).join(', ')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {stepErrors[3] && (
              <Text style={styles.errorText}>{stepErrors[3]}</Text>
            )}
          </View>
        );

      case 4: // Confirm Step
        const selectedSlot = slots.find(s => s.id === formData.slotId);

        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <MaterialIcons name="check-circle" size={24} color={COLORS.PRIMARY} />
              <Text style={styles.stepTitle}>Bước 5/5: Xác nhận đặt lịch</Text>
            </View>

            <View style={styles.confirmSummary}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryCardTitle}>Học sinh</Text>
                <Text style={styles.summaryCardValue}>
                  {formData.studentName || 'Chưa chọn'}
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryCardTitle}>Khoảng thời gian</Text>
                <Text style={styles.summaryCardValue}>
                  {formData.startDate ? formatDateDisplay(new Date(formData.startDate)) : '--'} → {formData.endDate ? formatDateDisplay(new Date(formData.endDate)) : '--'}
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryCardTitle}>Ngày trong tuần</Text>
                <Text style={styles.summaryCardValue}>
                  {formData.weekDates.map(d => WEEKDAY_LABELS[d].title).join(', ')}
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryCardTitle}>Khung giờ</Text>
                <Text style={styles.summaryCardValue}>
                  {selectedSlot ? `${selectedSlot.startTime} - ${selectedSlot.endTime}` : 'Chưa chọn'}
                </Text>
                {selectedSlot && (
                  <Text style={styles.summaryCardSubtext}>
                    {selectedSlot.branchName}
                  </Text>
                )}
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryCardTitle}>Số slot ước tính</Text>
                <Text style={styles.summaryCardValueHighlight}>
                  {estimatedSlots} slots
                </Text>
              </View>
            </View>

            <View style={styles.noteContainer}>
              <Text style={styles.noteLabel}>Ghi chú (tuỳ chọn)</Text>
              <TextInput
                style={styles.noteInput}
                value={formData.parentNote}
                onChangeText={(text) => updateFormData({ parentNote: text })}
                placeholder="Nhập ghi chú cho tất cả slots..."
                placeholderTextColor={COLORS.TEXT_SECONDARY}
                multiline
                maxLength={1000}
                textAlignVertical="top"
              />
              <Text style={styles.noteCounter}>
                {formData.parentNote.length}/1000
              </Text>
            </View>

            <View style={styles.confirmWarning}>
              <MaterialIcons name="warning" size={20} color={COLORS.WARNING || '#FF9800'} />
              <Text style={styles.confirmWarningText}>
                ⚠️ Sau khi xác nhận, hệ thống sẽ tạo {estimatedSlots} slots. Bạn có thể hủy từng slot riêng lẻ sau đó nếu cần.
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.SURFACE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đặt lịch hàng loạt</Text>
        <View style={styles.headerBtn} />
      </View>

      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        {STEPS.map((step, index) => (
          <View key={step.id} style={styles.stepIndicatorItem}>
            <View style={[
              styles.stepIndicatorCircle,
              index <= currentStep && styles.stepIndicatorCircleActive,
            ]}>
              {index < currentStep ? (
                <MaterialIcons name="check" size={16} color={COLORS.SURFACE} />
              ) : (
                <Text style={[
                  styles.stepIndicatorText,
                  index <= currentStep && styles.stepIndicatorTextActive,
                ]}>
                  {index + 1}
                </Text>
              )}
            </View>
            <Text style={[
              styles.stepIndicatorLabel,
              index <= currentStep && styles.stepIndicatorLabelActive,
            ]}>
              {step.title}
            </Text>
          </View>
        ))}
      </View>

      {/* Main Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {renderCurrentStep()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {currentStep > 0 && (
          <TouchableOpacity
            style={styles.navButton}
            onPress={handlePrev}
          >
            <MaterialIcons name="chevron-left" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.navButtonText}>Quay lại</Text>
          </TouchableOpacity>
        )}

        <View style={styles.navSpacer} />

        {currentStep < STEPS.length - 1 ? (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonPrimary]}
            onPress={handleNext}
          >
            <Text style={styles.navButtonTextPrimary}>Tiếp tục</Text>
            <MaterialIcons name="chevron-right" size={20} color={COLORS.SURFACE} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonPrimary, styles.navButtonLarge]}
            onPress={submitBooking}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={COLORS.SURFACE} />
            ) : (
              <>
                <MaterialIcons name="check-circle" size={20} color={COLORS.SURFACE} />
                <Text style={styles.navButtonTextPrimary}>Đặt lịch</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Date Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={startDatePicker || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => {
            if (d) {
              setStartDatePicker(d);
              updateFormData({ startDate: formatDateYMD(d) });
            }
            setShowStartPicker(false);
          }}
          minimumDate={new Date()}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDatePicker || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => {
            if (d) {
              setEndDatePicker(d);
              updateFormData({ endDate: formatDateYMD(d) });
            }
            setShowEndPicker(false);
          }}
          minimumDate={startDatePicker || new Date()}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BACKGROUND },
  header: {
    height: 56,
    backgroundColor: COLORS.PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: COLORS.SURFACE, fontSize: 16, fontWeight: '700' },

  // Step indicator
  stepIndicator: {
    backgroundColor: COLORS.SURFACE,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepIndicatorItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepIndicatorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.XS,
  },
  stepIndicatorCircleActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  stepIndicatorText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: FONTS.SIZES.SM,
    fontWeight: '700',
  },
  stepIndicatorTextActive: {
    color: COLORS.SURFACE,
  },
  stepIndicatorLabel: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  stepIndicatorLabelActive: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },

  // Content
  content: { flex: 1 },
  contentContainer: { padding: SPACING.LG, paddingBottom: SPACING.XL * 2 },

  // Step content
  stepContent: { flex: 1 },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.LG,
    gap: SPACING.SM,
  },
  stepTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },

  // Date range step
  dateRangeContainer: {
    gap: SPACING.MD,
    marginBottom: SPACING.LG,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    padding: SPACING.MD,
    gap: SPACING.SM,
  },
  dateInputText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  dateSummary: {
    backgroundColor: COLORS.INFO_BG,
    padding: SPACING.MD,
    borderRadius: 8,
    marginBottom: SPACING.MD,
  },
  dateSummaryText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  dateSummarySubtext: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },

  // Weekdays step
  weekdaysDescription: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.LG,
    lineHeight: 20,
  },
  weekdaysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.SM,
    marginBottom: SPACING.LG,
  },
  weekdayChip: {
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.SM,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.SURFACE,
    alignItems: 'center',
    minWidth: 70,
  },
  weekdayChipSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY_LIGHT + '20',
  },
  weekdayChipDisabled: {
    opacity: 0.5,
    backgroundColor: COLORS.BORDER + '20',
  },
  weekdayChipText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '700',
    color: COLORS.TEXT_SECONDARY,
  },
  weekdayChipTextSelected: {
    color: COLORS.PRIMARY,
  },
  weekdayChipTextDisabled: {
    color: COLORS.TEXT_SECONDARY,
  },
  weekdayChipSubtext: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS / 2,
  },
  selectionSummary: {
    backgroundColor: COLORS.SUCCESS_BG,
    padding: SPACING.MD,
    borderRadius: 8,
  },
  selectionSummaryText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.SUCCESS,
    fontWeight: '600',
  },

  // Children selection step
  childrenContainer: {
    gap: SPACING.MD,
  },
  childCard: {
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    padding: SPACING.MD,
  },
  childCardSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '15',
    borderWidth: 2,
  },
  childCardContent: {
    gap: SPACING.MD,
  },
  childCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.PRIMARY_50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.MD,
  },
  childImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  childImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.PRIMARY_50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  childNameSelected: {
    color: COLORS.PRIMARY,
  },
  childDetailsContainer: {
    gap: SPACING.SM,
    marginLeft: 48 + SPACING.MD, // Offset for avatar
    paddingTop: SPACING.XS,
  },
  childDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
  },
  childDetailText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    flex: 1,
  },
  childDetailTextSelected: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },

  // Slot selection step
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
  },
  emptyText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  slotsContainer: {
    gap: SPACING.MD,
  },
  slotCard: {
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    padding: SPACING.MD,
  },
  slotCardSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY_LIGHT + '10',
  },
  slotCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  slotCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.PRIMARY_50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.SM,
  },
  slotCardInfo: {
    flex: 1,
  },
  slotCardTitle: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  slotCardTitleSelected: {
    color: COLORS.PRIMARY,
  },
  slotCardTime: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS / 2,
  },
  slotCardDetails: {
    gap: SPACING.XS,
  },
  slotCardBranch: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  slotCardType: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  slotCardDays: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  slotCardDetailSelected: {
    color: COLORS.PRIMARY,
  },

  // Confirm step
  confirmSummary: {
    gap: SPACING.MD,
    marginBottom: SPACING.LG,
  },
  summaryCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  summaryCardTitle: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  summaryCardValue: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  summaryCardValueHighlight: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '700',
    color: COLORS.WARNING || '#FF9800',
  },
  summaryCardSubtext: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS / 2,
  },
  noteContainer: {
    marginBottom: SPACING.LG,
  },
  noteLabel: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  noteInput: {
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    padding: SPACING.MD,
    minHeight: 80,
    maxHeight: 120,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    textAlignVertical: 'top',
  },
  noteCounter: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'right',
    marginTop: SPACING.XS,
  },
  confirmWarning: {
    flexDirection: 'row',
    backgroundColor: COLORS.WARNING_BG || '#FFF3E0',
    padding: SPACING.MD,
    borderRadius: 8,
    gap: SPACING.SM,
  },
  confirmWarningText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.WARNING || '#F57C00',
    flex: 1,
    lineHeight: 18,
  },

  // Navigation
  navigationContainer: {
    flexDirection: 'row',
    padding: SPACING.MD,
    gap: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    backgroundColor: COLORS.SURFACE,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
    flex: 1,
    justifyContent: 'center',
  },
  navButtonPrimary: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  navButtonLarge: {
    flex: 2,
  },
  navButtonText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  navButtonTextPrimary: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  navSpacer: {
    flex: 1,
  },

  // Common
  errorText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.ERROR,
    marginTop: SPACING.SM,
  },
});

export default BulkBookScreen;


