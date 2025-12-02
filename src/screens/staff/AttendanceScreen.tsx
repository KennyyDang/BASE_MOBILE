import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  FlatList,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { COLORS, SPACING, FONTS } from '../../constants';
import studentSlotService from '../../services/studentSlotService';
import activityService from '../../services/activityService';
import { StudentSlotResponse } from '../../types/api';
import { useAuth } from '../../contexts/AuthContext';

type AttendanceRouteParams = {
  branchSlotId: string;
  date: string;
  roomId?: string;
  slotTimeframe?: string;
  branchName?: string;
  roomName?: string;
};

interface SlotStudent {
  id: string;
  studentId: string;
  studentName: string;
  parentName?: string;
  status: string;
  parentNote?: string;
  isCheckedIn: boolean;
}

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

const formatDateDisplay = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const AttendanceScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: AttendanceRouteParams }, 'params'>>();
  const { user } = useAuth();
  const { branchSlotId, date, roomId, slotTimeframe, branchName, roomName } = route.params || {};

  const [students, setStudents] = useState<SlotStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<string | null>(null); // ID của học sinh đang check-in
  const [bulkCheckingIn, setBulkCheckingIn] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Kiểm tra quyền truy cập - chỉ dành cho staff
  useEffect(() => {
    const userRole = (user?.role || '').toUpperCase();
    const isManager = userRole.includes('MANAGER') || userRole === 'ADMIN';
    if (isManager) {
      Alert.alert(
        'Không có quyền truy cập',
        'Chức năng này chỉ dành cho nhân viên.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  }, [user, navigation]);

  const fetchStudents = useCallback(async () => {
    if (!branchSlotId || !date) {
      Alert.alert('Lỗi', 'Thiếu thông tin slot.');
      return;
    }

    try {
      setLoading(true);
      
      // Format date để đảm bảo đúng format (YYYY-MM-DD)
      let formattedDate = date;
      if (date && date.includes('T')) {
        // Nếu date là ISO string, lấy phần date
        const dateObj = new Date(date);
        formattedDate = dateObj.toISOString().split('T')[0];
      }

      // Gọi API không có filter, rồi filter ở client để đảm bảo lấy đúng
      // Vì API có thể không filter đúng ở server
      const response = await studentSlotService.getStaffSlots({
        pageSize: 1000, // Lấy nhiều để đảm bảo có đủ data
      });

      // Kiểm tra response hợp lệ
      if (!response || !response.items || !Array.isArray(response.items)) {
        console.warn('Invalid API response:', response);
        setStudents([]);
        setLoading(false);
        return;
      }

      // Response mới có structure khác: mỗi item là branchSlot với studentSlots array
      // Filter để chỉ lấy slots có cùng branchSlotId và date
      let matchingSlots = response.items.filter((item: any) => {
        if (!item || !item.id) {
          return false;
        }
        
        // So sánh branchSlotId
        const slotIdMatch = item.id === branchSlotId;
        
        // So sánh date (chỉ so sánh phần date, không so sánh time)
        let dateMatch = true;
        if (item.date && formattedDate) {
          try {
            const itemDate = new Date(item.date);
            if (isNaN(itemDate.getTime())) {
              // Invalid date, skip this item
              return false;
            }
            const itemDateStr = itemDate.toISOString().split('T')[0];
            dateMatch = itemDateStr === formattedDate;
          } catch (e) {
            console.warn('Error parsing date:', item.date, e);
            return false;
          }
        }
        
        return slotIdMatch && dateMatch;
      });

      // Nếu có roomId, filter thêm theo roomId
      if (roomId) {
        matchingSlots = matchingSlots.filter((item: any) => item.roomId === roomId);
      }

      if (!matchingSlots || matchingSlots.length === 0) {
        setStudents([]);
        return;
      }

      // Lấy tất cả studentSlots từ tất cả các slots phù hợp và merge lại
      const allStudentSlots: any[] = [];
      matchingSlots.forEach((slot: any) => {
        if (slot.studentSlots && Array.isArray(slot.studentSlots)) {
          allStudentSlots.push(...slot.studentSlots);
        }
      });

      // Deduplicate dựa trên studentId để tránh hiển thị duplicate học sinh
      // Nếu cùng một học sinh có nhiều studentSlotId, chỉ lấy một cái (ưu tiên cái đầu tiên)
      const uniqueStudentSlotsMap = new Map<string, any>();
      allStudentSlots.forEach((studentSlot: any) => {
        const studentId = studentSlot.student?.id;
        if (studentId && !uniqueStudentSlotsMap.has(studentId)) {
          uniqueStudentSlotsMap.set(studentId, studentSlot);
        }
      });

      // Map từ studentSlots array sang SlotStudent format
      // TODO: Cần kiểm tra trạng thái check-in thực tế từ API
      // Hiện tại giả định tất cả đều chưa check-in
      const studentsList: SlotStudent[] = Array.from(uniqueStudentSlotsMap.values())
        .filter((studentSlot: any) => {
          // Chỉ lấy những studentSlot có student hợp lệ
          return studentSlot && studentSlot.student && studentSlot.student.id;
        })
        .map((studentSlot: any) => ({
          id: studentSlot.studentSlotId || studentSlot.id || '',
          studentId: studentSlot.student?.id || '',
          studentName: studentSlot.student?.name || 'Chưa có tên',
          parentName: studentSlot.parent?.name || '',
          status: studentSlot.status || 'Booked',
          parentNote: studentSlot.parentNote || undefined,
          isCheckedIn: false, // TODO: Lấy từ API thực tế
        }))
        .filter((student: SlotStudent) => {
          // Lọc bỏ những student không có id hoặc studentId
          return student.id && student.studentId;
        });

      setStudents(studentsList);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Không thể tải danh sách học sinh.';
      Alert.alert('Lỗi', message);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [branchSlotId, date, roomId]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) {
      return students;
    }
    const query = searchQuery.toLowerCase().trim();
    return students.filter(
      (student) =>
        student.studentName.toLowerCase().includes(query) ||
        student.parentName?.toLowerCase().includes(query) ||
        student.studentId.toLowerCase().includes(query)
    );
  }, [students, searchQuery]);

  const handleToggleSelect = (studentId: string) => {
    setSelectedStudents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map((s) => s.studentId)));
    }
  };

  const handleCheckInSingle = async (studentId: string) => {
    try {
      setCheckingIn(studentId);
      await activityService.checkInStudent(studentId);
      Alert.alert('Thành công', 'Đã điểm danh học sinh thành công!');
      // Refresh danh sách
      await fetchStudents();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Không thể điểm danh học sinh. Vui lòng thử lại.';
      Alert.alert('Lỗi', message);
    } finally {
      setCheckingIn(null);
    }
  };

  const handleBulkCheckIn = async () => {
    if (selectedStudents.size === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất một học sinh để điểm danh.');
      return;
    }

    Alert.alert(
      'Xác nhận',
      `Bạn có chắc chắn muốn điểm danh cho ${selectedStudents.size} học sinh đã chọn?`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              setBulkCheckingIn(true);
              const studentIds = Array.from(selectedStudents);
              let successCount = 0;
              let failCount = 0;

              // Điểm danh từng học sinh
              for (const studentId of studentIds) {
                try {
                  await activityService.checkInStudent(studentId);
                  successCount++;
                } catch (error) {
                  failCount++;
                }
              }

              if (failCount === 0) {
                Alert.alert('Thành công', `Đã điểm danh thành công cho ${successCount} học sinh!`);
              } else {
                Alert.alert(
                  'Hoàn tất',
                  `Đã điểm danh thành công: ${successCount} học sinh.\nThất bại: ${failCount} học sinh.`
                );
              }

              // Refresh danh sách và reset selection
              setSelectedStudents(new Set());
              await fetchStudents();
            } catch (error: any) {
              Alert.alert('Lỗi', 'Có lỗi xảy ra khi điểm danh hàng loạt.');
            } finally {
              setBulkCheckingIn(false);
            }
          },
        },
      ]
    );
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Điểm danh</Text>
      </View>

      {/* Slot Info */}
      <View style={styles.slotInfoCard}>
        <View style={styles.slotInfoRow}>
          <MaterialIcons name="access-time" size={18} color={COLORS.PRIMARY} />
          <Text style={styles.slotInfoText}>
            {slotTimeframe || 'Chưa có thông tin'} - {date ? formatDateDisplay(date) : ''}
          </Text>
        </View>
        {roomName && (
          <View style={styles.slotInfoRow}>
            <MaterialIcons name="meeting-room" size={18} color={COLORS.PRIMARY} />
            <Text style={styles.slotInfoText}>Phòng: {roomName}</Text>
          </View>
        )}
        {branchName && (
          <View style={styles.slotInfoRow}>
            <MaterialIcons name="location-on" size={18} color={COLORS.SECONDARY} />
            <Text style={styles.slotInfoText}>{branchName}</Text>
          </View>
        )}
      </View>

      {/* Bulk Actions */}
      {filteredStudents.length > 0 && (
        <View style={styles.bulkActionsCard}>
          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={handleSelectAll}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={selectedStudents.size === filteredStudents.length ? 'check-box' : 'check-box-outline-blank'}
              size={20}
              color={COLORS.PRIMARY}
            />
            <Text style={styles.selectAllText}>
              {selectedStudents.size === filteredStudents.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </Text>
          </TouchableOpacity>

          {selectedStudents.size > 0 && (
            <TouchableOpacity
              style={[
                styles.bulkCheckInButton,
                bulkCheckingIn && styles.bulkCheckInButtonDisabled,
              ]}
              onPress={handleBulkCheckIn}
              disabled={bulkCheckingIn}
              activeOpacity={0.7}
            >
              {bulkCheckingIn ? (
                <ActivityIndicator size="small" color={COLORS.SURFACE} />
              ) : (
                <MaterialIcons name="check-circle" size={20} color={COLORS.SURFACE} />
              )}
              <Text style={styles.bulkCheckInText}>
                Điểm danh ({selectedStudents.size})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Search Bar */}
      {students.length > 0 && (
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
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Đang tải danh sách học sinh...</Text>
        </View>
      ) : filteredStudents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="person-off" size={48} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.emptyText}>
            {searchQuery ? 'Không tìm thấy học sinh nào phù hợp' : 'Chưa có học sinh nào trong slot này'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.id}
          renderItem={({ item: student }) => {
            const isSelected = selectedStudents.has(student.studentId);
            const isCheckingInThis = checkingIn === student.studentId;

            return (
              <TouchableOpacity
                style={[
                  styles.studentCard,
                  isSelected && styles.studentCardSelected,
                ]}
                onPress={() => handleToggleSelect(student.studentId)}
                activeOpacity={0.7}
              >
                <View style={styles.studentHeader}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => handleToggleSelect(student.studentId)}
                  >
                    <MaterialIcons
                      name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                      size={24}
                      color={isSelected ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY}
                    />
                  </TouchableOpacity>

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

                <View style={styles.studentActions}>
                  {student.isCheckedIn ? (
                    <View style={styles.checkedInBadge}>
                      <MaterialIcons name="check-circle" size={16} color={COLORS.SUCCESS} />
                      <Text style={styles.checkedInText}>Đã điểm danh</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.checkInButton,
                        isCheckingInThis && styles.checkInButtonDisabled,
                      ]}
                      onPress={() => handleCheckInSingle(student.studentId)}
                      disabled={isCheckingInThis || bulkCheckingIn}
                      activeOpacity={0.7}
                    >
                      {isCheckingInThis ? (
                        <ActivityIndicator size="small" color={COLORS.SURFACE} />
                      ) : (
                        <>
                          <MaterialIcons name="check-circle" size={16} color={COLORS.SURFACE} />
                          <Text style={styles.checkInButtonText}>Điểm danh</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.studentsList}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            filteredStudents.length > 0 ? (
              <Text style={styles.studentsCount}>
                Tìm thấy {filteredStudents.length} / {students.length} học sinh
              </Text>
            ) : null
          }
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  slotInfoCard: {
    backgroundColor: COLORS.INFO_BG,
    padding: SPACING.MD,
    margin: SPACING.MD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  slotInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.XS,
    gap: SPACING.SM,
  },
  slotInfoText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  bulkActionsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.SURFACE,
    padding: SPACING.MD,
    marginHorizontal: SPACING.MD,
    marginBottom: SPACING.SM,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  },
  selectAllText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  bulkCheckInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SUCCESS,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 12,
    gap: SPACING.XS,
  },
  bulkCheckInButtonDisabled: {
    opacity: 0.6,
  },
  bulkCheckInText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.SURFACE,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    marginHorizontal: SPACING.MD,
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.XL,
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.XL,
  },
  emptyText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  studentsList: {
    padding: SPACING.MD,
    gap: SPACING.SM,
  },
  studentsCount: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.SM,
  },
  studentCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  studentCardSelected: {
    borderColor: COLORS.PRIMARY,
    borderWidth: 2,
    backgroundColor: COLORS.INFO_BG,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    marginRight: SPACING.SM,
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
  studentActions: {
    marginTop: SPACING.SM,
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: SPACING.XS,
  },
  checkInButtonDisabled: {
    opacity: 0.6,
  },
  checkInButtonText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.SURFACE,
    fontWeight: '600',
  },
  checkedInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SUCCESS_BG,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: SPACING.XS,
  },
  checkedInText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.SUCCESS,
    fontWeight: '600',
  },
});

export default AttendanceScreen;

