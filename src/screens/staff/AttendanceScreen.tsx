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
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
  parentPhone?: string;
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
  const [capturingImage, setCapturingImage] = useState<string | null>(null); // ID của học sinh đang chụp ảnh

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
          parentName: studentSlot.parent?.name || studentSlot.parentName || '',
          parentPhone: studentSlot.parent?.phoneNumber || studentSlot.parent?.phone || studentSlot.parentPhone || undefined,
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
      // Yêu cầu quyền truy cập camera
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập',
          'Cần quyền truy cập camera để chụp ảnh điểm danh.'
        );
        return;
      }

      // Mở camera để chụp ảnh
      setCapturingImage(studentId);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setCapturingImage(null);
        return; // Người dùng hủy chụp ảnh
      }

      const imageUri = result.assets[0].uri;
      setCapturingImage(null);
      setCheckingIn(studentId);

      // Gọi API checkin với ảnh
      await activityService.checkInStudentWithImage(studentId, imageUri);
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
      setCapturingImage(null);
    }
  };

  const handleBulkCheckIn = async () => {
    if (selectedStudents.size === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất một học sinh để điểm danh.');
      return;
    }

    // Yêu cầu quyền truy cập camera
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Quyền truy cập',
        'Cần quyền truy cập camera để chụp ảnh điểm danh.'
      );
      return;
    }

    Alert.alert(
      'Xác nhận',
      `Bạn có chắc chắn muốn điểm danh cho ${selectedStudents.size} học sinh đã chọn?\n\nLưu ý: Bạn sẽ cần chụp ảnh cho từng học sinh.`,
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

              // Điểm danh từng học sinh với ảnh
              for (const studentId of studentIds) {
                try {
                  // Mở camera để chụp ảnh cho từng học sinh
                  const result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.8,
                  });

                  if (result.canceled || !result.assets || result.assets.length === 0) {
                    failCount++;
                    continue; // Bỏ qua học sinh này nếu hủy chụp ảnh
                  }

                  const imageUri = result.assets[0].uri;
                  await activityService.checkInStudentWithImage(studentId, imageUri);
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
            const isCapturingImage = capturingImage === student.studentId;

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
                      size={22}
                      color={isSelected ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY}
                    />
                  </TouchableOpacity>

                  <View style={styles.studentIcon}>
                    <MaterialIcons name="person" size={20} color={COLORS.PRIMARY} />
                  </View>

                  <View style={styles.studentContent}>
                    <Text style={styles.studentName}>{student.studentName}</Text>
                    {student.parentName && (
                      <View style={styles.parentInfoRow}>
                        <MaterialIcons name="person-outline" size={14} color={COLORS.TEXT_SECONDARY} />
                        <Text style={styles.studentParent}>
                          {student.parentName}
                        </Text>
                      </View>
                    )}
                    {student.parentPhone && (
                      <View style={styles.parentPhoneRow}>
                        <MaterialIcons name="phone" size={14} color={COLORS.PRIMARY} />
                        <Text style={styles.studentParentPhone}>{student.parentPhone}</Text>
                      </View>
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
                      size={14}
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
                  <View style={styles.actionsLeft}>
                    {student.parentPhone && (
                      <TouchableOpacity
                        style={styles.callButton}
                        onPress={() => {
                          const phoneNumber = student.parentPhone?.replace(/[^0-9+]/g, '');
                          if (phoneNumber) {
                            Linking.openURL(`tel:${phoneNumber}`).catch((err) => {
                              Alert.alert('Lỗi', 'Không thể mở ứng dụng gọi điện. Vui lòng thử lại.');
                            });
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="phone" size={18} color={COLORS.SURFACE} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.actionsRight}>
                    {student.isCheckedIn ? (
                      <View style={styles.checkedInBadge}>
                        <MaterialIcons name="check-circle" size={16} color={COLORS.SUCCESS} />
                        <Text style={styles.checkedInText}>Đã điểm danh</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.checkInButton,
                          (isCheckingInThis || isCapturingImage) && styles.checkInButtonDisabled,
                        ]}
                        onPress={() => handleCheckInSingle(student.studentId)}
                        disabled={isCheckingInThis || isCapturingImage || bulkCheckingIn}
                        activeOpacity={0.7}
                      >
                        {isCheckingInThis || isCapturingImage ? (
                          <ActivityIndicator size="small" color={COLORS.SURFACE} />
                        ) : (
                          <>
                            <MaterialIcons name="check-circle" size={18} color={COLORS.SURFACE} />
                            <Text style={styles.checkInButtonText}>
                              {isCapturingImage ? 'Đang chụp ảnh...' : 'Điểm danh'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
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
    borderRadius: 16,
    padding: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginBottom: SPACING.SM,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  studentCardSelected: {
    borderColor: COLORS.PRIMARY,
    borderWidth: 2,
    backgroundColor: COLORS.PRIMARY_50,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.SM,
  },
  checkbox: {
    padding: SPACING.XS,
    marginTop: 2,
  },
  studentIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.PRIMARY + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  studentContent: {
    flex: 1,
    marginTop: 2,
  },
  studentName: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  parentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.XS,
    gap: SPACING.XS,
  },
  studentParent: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  parentPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.XS,
    gap: SPACING.XS,
    paddingVertical: SPACING.XS / 2,
  },
  studentParentPhone: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  studentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 12,
    gap: SPACING.XS,
    marginTop: 2,
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
    marginTop: SPACING.MD,
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER + '40',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callButton: {
    backgroundColor: COLORS.SUCCESS,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.SUCCESS,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    borderRadius: 12,
    gap: SPACING.XS,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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

