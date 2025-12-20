import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

const BulkBookScreen: React.FC = () => {
  const navigation = useNavigation<BulkBookNavProp>();
  const route = useRoute<BulkBookRouteProp>();
  const { studentId, branchSlotId, packageSubscriptionId: initialPackageSubscriptionId, roomId: initialRoomId } = route.params || {};

  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [endDate, setEndDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [weekDates, setWeekDates] = useState<Set<WeekdayKey>>(new Set([1]));
  const [note, setNote] = useState('');
  const [useSelectedRoom, setUseSelectedRoom] = useState(false);

  const [slots, setSlots] = useState<BranchSlotResponse[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(branchSlotId || null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedSlot = useMemo(() => slots.find((s) => s.id === selectedSlotId) || null, [slots, selectedSlotId]);

  const toggleWeekDate = useCallback((d: WeekdayKey) => {
    setWeekDates((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }, []);

  const loadSlots = useCallback(async () => {
    if (!studentId) return;
    setSlotsLoading(true);
    try {
      // Load slots cho ngày hiện tại để hiển thị danh sách
      const allItems = await branchSlotService.getAllAvailableSlotsForStudent(studentId, {
        date: new Date(), // Sử dụng ngày hiện tại thay vì startDate
        pageSize: 200,
      });
      setSlots(allItems);

      // Nếu có branchSlotId từ params, tìm và set làm selected
      if (branchSlotId) {
        const targetSlot = allItems.find((s) => s.id === branchSlotId);
        if (targetSlot) {
          setSelectedSlotId(targetSlot.id);
          const roomId = initialRoomId || targetSlot.rooms?.[0]?.roomId || targetSlot.rooms?.[0]?.id || null;
          setSelectedRoomId(roomId);
        }
      } else if (allItems.length > 0) {
        // Nếu không có branchSlotId, chọn slot đầu tiên
        const firstSlot = allItems[0];
        setSelectedSlotId(firstSlot.id);
        const roomId = initialRoomId || firstSlot.rooms?.[0]?.roomId || firstSlot.rooms?.[0]?.id || null;
        setSelectedRoomId(roomId);
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể tải danh sách slot.');
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [studentId, branchSlotId, initialRoomId]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const submit = useCallback(async () => {
    if (!studentId) {
      Alert.alert('Thông báo', 'Thiếu studentId.');
      return;
    }
    if (!selectedSlotId) {
      Alert.alert('Thông báo', 'Vui lòng chọn slot.');
      return;
    }
    if (startDate.getTime() > endDate.getTime()) {
      Alert.alert('Thông báo', 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.');
      return;
    }
    if (weekDates.size === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất một thứ.');
      return;
    }
    const trimmed = note.trim();
    if (trimmed.length > 1000) {
      Alert.alert('Thông báo', 'Ghi chú tối đa 1000 ký tự.');
      return;
    }

    // packageSubscriptionId: ưu tiên lấy từ params được truyền từ SelectSlotScreen
    const packageSubscriptionId = initialPackageSubscriptionId;

    if (!packageSubscriptionId) {
      Alert.alert('Thiếu thông tin gói học', 'Không tìm được thông tin gói học. Vui lòng quay lại màn chọn slot và thử lại.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        studentId,
        packageSubscriptionId,
        branchSlotId: selectedSlotId,
        roomId: useSelectedRoom ? (selectedRoomId || undefined) : undefined,
        startDate: formatDateYMD(startDate),
        endDate: formatDateYMD(endDate),
        weekDates: Array.from(weekDates.values()).sort((a, b) => a - b),
        parentNote: trimmed || undefined,
      };

      const result = await studentSlotService.bulkBookSlots(payload as any);

      const bookedCount = Array.isArray(result) ? result.length : 1;
      Alert.alert('Thành công', `Đã đặt thành công ${bookedCount} lịch.`);

      // Refresh dữ liệu trước khi quay lại
      try {
        // Reload slots để cập nhật trạng thái (phòng đã được đặt sẽ chuyển sang "đã đặt")
        await loadSlots();
      } catch (e) {
        // Bỏ qua lỗi, vẫn quay lại
        console.debug('Error reloading slots after booking:', e);
      }

      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể đặt lịch hàng loạt.');
    } finally {
      setSubmitting(false);
    }
  }, [studentId, selectedSlotId, startDate, endDate, weekDates, note, selectedSlot, useSelectedRoom, selectedRoomId, navigation, initialPackageSubscriptionId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.SURFACE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đặt lịch hàng loạt</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 24 }}>
        <Text style={styles.sectionTitle}>Chọn slot *</Text>
        {slotsLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.PRIMARY} />
            <Text style={styles.loadingText}>Đang tải slot...</Text>
          </View>
        ) : slots.length === 0 ? (
          <Text style={styles.helpText}>Không có slot nào để chọn.</Text>
        ) : (
          <View style={styles.slotList}>
            {slots.map((s) => {
              const active = s.id === selectedSlotId;
              const title = `${WEEKDAY_LABELS[(s.weekDate ?? 0) as WeekdayKey]?.title || '---'} • ${formatTime(s.timeframe?.startTime)} - ${formatTime(s.timeframe?.endTime)}`;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.slotItem, active && styles.slotItemActive]}
                  onPress={() => {
                    setSelectedSlotId(s.id);
                    const rid = s.rooms?.[0]?.roomId || s.rooms?.[0]?.id || null;
                    setSelectedRoomId(rid);
                  }}
                >
                  <Text style={[styles.slotItemText, active && styles.slotItemTextActive]}>{title}</Text>
                  <Text style={styles.slotItemSub}>{s.branch?.branchName || ''}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionTitle}>Phòng</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.modeBtn, !useSelectedRoom && styles.modeBtnActive]}
            onPress={() => setUseSelectedRoom(false)}
            disabled={submitting}
          >
            <Text style={[styles.modeText, !useSelectedRoom && styles.modeTextActive]}>Tự xếp phòng</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, useSelectedRoom && styles.modeBtnActive, !selectedRoomId && styles.modeBtnDisabled]}
            onPress={() => setUseSelectedRoom(true)}
            disabled={submitting || !selectedRoomId}
          >
            <Text style={[styles.modeText, useSelectedRoom && styles.modeTextActive]}>Dùng phòng đầu tiên</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.helpText}>
          Nếu BE đã sửa đúng spec, bạn có thể để “Tự xếp phòng” để hệ thống tự phân phòng theo từng ngày.
        </Text>

        <Text style={styles.sectionTitle}>Khoảng ngày *</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartPicker(true)} disabled={submitting}>
            <Text style={styles.dateBtnText}>Từ: {formatDateDisplay(startDate)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndPicker(true)} disabled={submitting}>
            <Text style={styles.dateBtnText}>Đến: {formatDateDisplay(endDate)}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Chọn thứ *</Text>
        <View style={styles.weekWrap}>
          {WEEKDAY_ORDER.map((d) => {
            const selected = weekDates.has(d);
            return (
              <TouchableOpacity
                key={d}
                style={[styles.chip, selected && styles.chipActive]}
                onPress={() => toggleWeekDate(d)}
                disabled={submitting}
              >
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>{WEEKDAY_LABELS[d].subtitle}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Ghi chú (tuỳ chọn)</Text>
        <TextInput
          style={styles.note}
          value={note}
          onChangeText={setNote}
          placeholder="Nhập ghi chú cho tất cả lịch..."
          placeholderTextColor={COLORS.TEXT_SECONDARY}
          multiline
          editable={!submitting}
          maxLength={1000}
        />

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={submit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color={COLORS.SURFACE} /> : <Text style={styles.submitText}>Đặt lịch</Text>}
        </TouchableOpacity>
      </ScrollView>

      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => {
            setShowStartPicker(false);
            if (d) {
              const nd = new Date(d);
              nd.setHours(0, 0, 0, 0);
              setStartDate(nd);
            }
          }}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => {
            setShowEndPicker(false);
            if (d) {
              const nd = new Date(d);
              nd.setHours(0, 0, 0, 0);
              setEndDate(nd);
            }
          }}
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
  content: { padding: 16 },
  sectionTitle: { marginTop: 14, marginBottom: 8, fontSize: 14, fontWeight: '700', color: COLORS.TEXT_PRIMARY },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  loadingText: { color: COLORS.TEXT_SECONDARY },
  helpText: { color: COLORS.TEXT_SECONDARY, fontSize: 12, lineHeight: 16 },
  slotList: { gap: 10 },
  slotItem: {
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    padding: 12,
  },
  slotItemActive: { borderColor: COLORS.PRIMARY, backgroundColor: COLORS.PRIMARY_LIGHT + '20' },
  slotItemText: { fontSize: 14, fontWeight: '700', color: COLORS.TEXT_PRIMARY },
  slotItemTextActive: { color: COLORS.PRIMARY },
  slotItemSub: { marginTop: 4, color: COLORS.TEXT_SECONDARY, fontSize: 12 },
  row: { flexDirection: 'row', gap: 10 },
  modeBtn: {
    flex: 1,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnActive: { borderColor: COLORS.PRIMARY, backgroundColor: COLORS.PRIMARY_LIGHT + '20' },
  modeBtnDisabled: { opacity: 0.5 },
  modeText: { color: COLORS.TEXT_SECONDARY, fontWeight: '700', fontSize: 12 },
  modeTextActive: { color: COLORS.PRIMARY },
  dateBtn: {
    flex: 1,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dateBtnText: { color: COLORS.TEXT_PRIMARY, fontWeight: '700', fontSize: 12 },
  weekWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.SURFACE,
  },
  chipActive: { borderColor: COLORS.PRIMARY, backgroundColor: COLORS.PRIMARY_LIGHT + '20' },
  chipText: { color: COLORS.TEXT_SECONDARY, fontWeight: '700', fontSize: 12 },
  chipTextActive: { color: COLORS.PRIMARY },
  note: {
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    padding: 12,
    minHeight: 90,
    textAlignVertical: 'top',
    color: COLORS.TEXT_PRIMARY,
  },
  submitBtn: {
    marginTop: 18,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: COLORS.SURFACE, fontWeight: '800' },
});

export default BulkBookScreen;


