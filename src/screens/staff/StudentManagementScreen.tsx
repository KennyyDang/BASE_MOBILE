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
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { COLORS, SPACING, FONTS } from '../../constants';
import studentSlotService from '../../services/studentSlotService';
import activityService from '../../services/activityService';
import { useAuth } from '../../contexts/AuthContext';
import { ActivityResponse } from '../../types/api';
import { StaffActivityResponse } from '../../services/activityService';

type StudentManagementRouteParams = {
  branchSlotId: string;
  date: string;
  roomId?: string;
  slotTimeframeStartTime?: string;
  slotTimeframeEndTime?: string;
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
  studentImage?: string;
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

const formatTimeRange = (timeframe: { startTime?: string; endTime?: string } | null | undefined) => {
  if (!timeframe) {
    return 'Chưa có khung giờ';
  }
  return `${formatTime(timeframe.startTime)} - ${formatTime(timeframe.endTime)}`;
};

const formatDateDisplay = (dateString: string | null | undefined): string => {
  if (!dateString) {
    return 'Chưa có ngày';
  }
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Ngày không hợp lệ';
    }
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    console.warn('Error formatting date:', dateString, e);
    return 'Ngày không hợp lệ';
  }
};

const StudentManagementScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: StudentManagementRouteParams }, 'params'>>();
  const { user } = useAuth();
  const { branchSlotId, date, roomId, slotTimeframeStartTime, slotTimeframeEndTime, branchName, roomName } = route.params || {};

  const [students, setStudents] = useState<SlotStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [slotInfo, setSlotInfo] = useState<any>(null);
  const [slotServices, setSlotServices] = useState<any[]>([]);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [studentActivities, setStudentActivities] = useState<Record<string, StaffActivityResponse[]>>({});
  const [loadingActivities, setLoadingActivities] = useState<Set<string>>(new Set());

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
        pageIndex: 1,
        pageSize: 1000, // Lấy nhiều để đảm bảo có đủ data
      });

      // Kiểm tra response hợp lệ
      if (!response || !response.items || !Array.isArray(response.items)) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // API trả về structure khác: mỗi item là branchSlot với studentSlots array
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
        setSlotInfo(null);
        setSlotServices([]);
        return;
      }

      // Lấy thông tin slot từ route params vì StudentSlotResponse không có thông tin slot
      setSlotInfo({
        timeframe: slotTimeframeStartTime && slotTimeframeEndTime ? { startTime: slotTimeframeStartTime, endTime: slotTimeframeEndTime } : null,
        slotType: null,
        branch: branchName || null,
      });
      setSlotServices([]);

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
        const studentId = studentSlot?.student?.id || studentSlot?.studentId;
        if (studentId && !uniqueStudentSlotsMap.has(studentId)) {
          uniqueStudentSlotsMap.set(studentId, studentSlot);
        }
      });

      // Map từ studentSlots array sang SlotStudent format
      const studentsList: SlotStudent[] = Array.from(uniqueStudentSlotsMap.values())
        .filter((studentSlot: any) => {
          // Chỉ lấy những studentSlot có student hợp lệ
          const studentId = studentSlot?.student?.id || studentSlot?.studentId;
          return studentId;
        })
        .map((studentSlot: any) => {
          const studentId = studentSlot?.student?.id || studentSlot?.studentId || '';
          const studentName = studentSlot?.student?.name || studentSlot?.studentName || 'Chưa có tên';
          const parentName = studentSlot?.parent?.name || studentSlot?.parentName || '';
          
          return {
            id: studentSlot.id || studentSlot.studentSlotId || `${studentId}-${Date.now()}`, // ID của StudentSlot
            studentId: studentId,
            studentName: studentName,
            parentName: parentName,
            status: studentSlot.status || 'Booked',
            parentNote: studentSlot.parentNote || undefined,
            studentImage: studentSlot?.student?.image || undefined,
          };
        })
        .filter((student: SlotStudent) => {
          // Lọc bỏ những student không có id hoặc studentId
          return student.id && student.studentId;
        });

      setStudents(studentsList);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Không thể tải danh sách học sinh.';
      Alert.alert('Lỗi', message);
      setStudents([]);
      setSlotInfo(null);
      setSlotServices([]);
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

  const handleCreateActivity = (student: SlotStudent) => {
    navigation.navigate('CreateActivity', {
      studentSlotId: student.id,
      studentId: student.studentId,
      studentName: student.studentName,
      slotDate: date ? formatDateDisplay(date) : undefined,
      slotTimeframeStartTime: slotTimeframeStartTime,
      slotTimeframeEndTime: slotTimeframeEndTime,
    });
  };

  const handleAttendance = () => {
    navigation.navigate('Attendance', {
      branchSlotId,
      date,
      roomId,
      slotTimeframeStartTime: slotTimeframeStartTime,
      slotTimeframeEndTime: slotTimeframeEndTime,
      branchName,
      roomName,
    });
  };

  const handleImagePress = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageModalVisible(true);
  };

  const handleCloseImageModal = () => {
    setImageModalVisible(false);
    setSelectedImage(null);
  };

  const handleToggleStudentExpanded = async (student: SlotStudent) => {
    const isExpanded = expandedStudents.has(student.id);
    
    if (isExpanded) {
      // Đóng
      setExpandedStudents((prev) => {
        const newSet = new Set(prev);
        newSet.delete(student.id);
        return newSet;
      });
    } else {
      // Mở và fetch activities nếu chưa có
      setExpandedStudents((prev) => new Set(prev).add(student.id));
      
      if (!studentActivities[student.id] && !loadingActivities.has(student.id)) {
        await fetchStudentActivities(student);
      }
    }
  };

  const fetchStudentActivities = async (student: SlotStudent) => {
    setLoadingActivities((prev) => new Set(prev).add(student.id));
    
    try {
      const response = await activityService.getPagedActivities({
        StudentSlotId: student.id,
        pageIndex: 1,
        pageSize: 10,
      });
      
      setStudentActivities((prev) => ({
        ...prev,
        [student.id]: response.items || [],
      }));
    } catch (error: any) {
      console.warn('Failed to fetch activities:', error);
      setStudentActivities((prev) => ({
        ...prev,
        [student.id]: [],
      }));
    } finally {
      setLoadingActivities((prev) => {
        const newSet = new Set(prev);
        newSet.delete(student.id);
        return newSet;
      });
    }
  };

  const handleViewActivityDetail = (activity: StaffActivityResponse) => {
    navigation.navigate('ActivityDetail', {
      activityId: activity.id,
    });
  };

  const handleViewStudentActivities = (student: SlotStudent) => {
    try {
      navigation.navigate('StaffStudentActivities', {
        studentId: student.studentId,
        studentName: student.studentName,
        studentSlotId: student.id, // student.id là studentSlotId (ID của StudentSlot)
        date: date, // Truyền date để filter activities theo ngày
      });
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể mở trang hoạt động của học sinh. Vui lòng thử lại.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.SURFACE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý học sinh</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Slot Info Card */}
      {slotInfo && (
        <View style={styles.slotInfoCard}>
          <View style={styles.slotInfoHeader}>
            <MaterialIcons name="schedule" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.slotInfoTime}>
              {slotInfo.timeframe ? formatTimeRange(slotInfo.timeframe) : 'Chưa có khung giờ'}
              {date ? ` - ${formatDateDisplay(date)}` : ''}
            </Text>
          </View>
          {roomName && (
            <View style={styles.slotInfoRow}>
              <MaterialIcons name="meeting-room" size={16} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.slotInfoRoom}>Phòng: {roomName}</Text>
            </View>
          )}
          {branchName && (
            <View style={styles.slotInfoRow}>
              <MaterialIcons name="business" size={16} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.slotInfoBranch}>{branchName}</Text>
            </View>
          )}
          {slotInfo.slotType?.name && (
            <View style={styles.slotInfoRow}>
              <MaterialIcons name="category" size={16} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.slotInfoActivity}>{slotInfo.slotType.name}</Text>
            </View>
          )}
          {slotServices.length > 0 && (
            <View>
              <View style={styles.servicesHeader}>
                <MaterialIcons name="shopping-cart" size={16} color={COLORS.PRIMARY} />
                <Text style={styles.servicesTitle}>Dịch vụ trong khóa học ({slotServices.length})</Text>
              </View>
              <View style={styles.servicesList}>
                {slotServices.map((service, index) => (
                  <View key={`${service.serviceId}_${index}`} style={styles.serviceItem}>
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName}>{service.serviceName}</Text>
                      <View style={styles.serviceDetails}>
                        <Text style={styles.serviceQuantity}>Số lượng: {service.quantity}</Text>
                        <Text style={styles.servicePrice}>
                          {(service.unitPrice || 0).toLocaleString('vi-VN')} đ/cái
                        </Text>
                      </View>
                    </View>
                    <View style={styles.serviceTotalPrice}>
                      <Text style={styles.totalPrice}>
                        {(service.totalPrice || 0).toLocaleString('vi-VN')} đ
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
          {students.length > 0 && (
            <View style={styles.slotInfoRow}>
              <MaterialIcons name="people" size={16} color={COLORS.PRIMARY} />
              <Text style={styles.slotInfoStudentCount}>
                {students.length} {students.length === 1 ? 'học sinh' : 'học sinh'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={styles.attendanceButton}
          onPress={handleAttendance}
          activeOpacity={0.8}
          disabled={students.length === 0}
        >
          <MaterialIcons 
            name="check-circle" 
            size={24} 
            color={students.length === 0 ? COLORS.TEXT_SECONDARY : COLORS.SURFACE} 
          />
          <Text style={[
            styles.attendanceButtonText,
            students.length === 0 && styles.attendanceButtonTextDisabled
          ]}>
            Điểm danh
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
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

      {/* Students List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Đang tải danh sách học sinh...</Text>
        </View>
      ) : students.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="person-off" size={48} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.emptyText}>Chưa có học sinh nào trong slot này</Text>
        </View>
      ) : filteredStudents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="search-off" size={48} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.emptyText}>
            Không tìm thấy học sinh nào phù hợp với "{searchQuery}"
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.studentsList}
          renderItem={({ item: student }) => {
            const isExpanded = expandedStudents.has(student.id);
            const activities = studentActivities[student.id] || [];
            const isLoadingActivities = loadingActivities.has(student.id);
            
            return (
              <View style={styles.studentCard}>
                <TouchableOpacity 
                  style={styles.studentHeader}
                  onPress={() => handleViewStudentActivities(student)}
                  activeOpacity={0.7}
                >
                  {student.studentImage ? (
                    <TouchableOpacity
                      onPress={() => handleImagePress(student.studentImage!)}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={{ uri: student.studentImage }}
                        style={styles.studentAvatar}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.studentIcon}>
                      <MaterialIcons name="person" size={24} color={COLORS.PRIMARY} />
                    </View>
                  )}
                  <View style={styles.studentContent}>
                    <Text style={styles.studentName}>{student.studentName}</Text>
                    {student.parentName && (
                      <Text style={styles.studentParent}>
                        Phụ huynh: {student.parentName}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
                <View style={styles.studentActions}>
                  <TouchableOpacity
                    style={styles.viewActivitiesButton}
                    onPress={() => handleViewStudentActivities(student)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons 
                      name="visibility" 
                      size={18} 
                      color={COLORS.SURFACE} 
                    />
                    <Text style={styles.viewActivitiesButtonText}>
                      Xem hoạt động
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.viewGuardiansButton}
                    onPress={() => {
                      navigation.navigate('StudentGuardians', {
                        studentId: student.studentId,
                        studentName: student.studentName,
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons 
                      name="family-restroom" 
                      size={18} 
                      color={COLORS.SURFACE} 
                    />
                    <Text style={styles.viewGuardiansButtonText}>
                      Người giám hộ
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addActivityButton}
                    onPress={() => handleCreateActivity(student)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="add" size={18} color={COLORS.SURFACE} />
                    <Text style={styles.addActivityButtonText}>Thêm</Text>
                  </TouchableOpacity>
                </View>
                {student.parentNote && (
                  <View style={styles.studentNote}>
                    <MaterialIcons name="note" size={16} color={COLORS.TEXT_SECONDARY} />
                    <Text style={styles.studentNoteText}>{student.parentNote}</Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Image View Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseImageModal}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.imageModalCloseButton}
            onPress={handleCloseImageModal}
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={28} color={COLORS.SURFACE} />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.imageModalImage}
              resizeMode="contain"
            />
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: SPACING.XS,
  },
  headerTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.SURFACE,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  slotInfoCard: {
    backgroundColor: COLORS.SURFACE,
    padding: SPACING.MD,
    margin: SPACING.MD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  slotInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
    gap: SPACING.SM,
  },
  slotInfoTime: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  slotInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS,
    gap: SPACING.SM,
  },
  slotInfoRoom: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  slotInfoBranch: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  slotInfoActivity: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
    flex: 1,
  },
  slotInfoStudentCount: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
    flex: 1,
  },
  servicesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
    marginTop: SPACING.MD,
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  servicesTitle: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  servicesList: {
    marginTop: SPACING.SM,
    gap: SPACING.SM,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.BACKGROUND,
    padding: SPACING.MD,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.PRIMARY,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  serviceDetails: {
    flexDirection: 'row',
    gap: SPACING.MD,
  },
  serviceQuantity: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
  servicePrice: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
  serviceTotalPrice: {
    alignItems: 'flex-end',
  },
  totalPrice: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '700',
    color: COLORS.PRIMARY,
  },
  actionButtonsContainer: {
    paddingHorizontal: SPACING.MD,
    paddingBottom: SPACING.MD,
  },
  attendanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.LG,
    paddingHorizontal: SPACING.XL,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    gap: SPACING.SM,
  },
  attendanceButtonText: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '700',
    color: COLORS.SURFACE,
  },
  attendanceButtonTextDisabled: {
    color: COLORS.TEXT_SECONDARY,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    marginHorizontal: SPACING.MD,
    marginBottom: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    paddingVertical: SPACING.SM,
    marginLeft: SPACING.SM,
  },
  clearSearchButton: {
    padding: SPACING.XS,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.XL,
  },
  loadingText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.MD,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.XL,
    paddingHorizontal: SPACING.XL,
  },
  emptyText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.MD,
    textAlign: 'center',
    lineHeight: 24,
  },
  studentsList: {
    padding: SPACING.MD,
  },
  studentCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.MD,
  },
  studentIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.PRIMARY + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY + '30',
  },
  studentAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: SPACING.MD,
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY + '30',
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
  studentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
    marginTop: SPACING.SM,
  },
  viewActivitiesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SECONDARY,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderRadius: 8,
    gap: SPACING.XS,
    flex: 1,
  },
  viewActivitiesButtonText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.SURFACE,
    fontWeight: '600',
  },
  viewGuardiansButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.INFO,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderRadius: 8,
    gap: SPACING.XS,
    flex: 1,
  },
  viewGuardiansButtonText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.SURFACE,
    fontWeight: '600',
  },
  addActivityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderRadius: 8,
    gap: SPACING.XS,
  },
  addActivityButtonText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.SURFACE,
    fontWeight: '600',
  },
  activitiesContainer: {
    marginTop: SPACING.MD,
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  activitiesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.MD,
    gap: SPACING.SM,
  },
  activitiesLoadingText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  activitiesEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.MD,
    gap: SPACING.SM,
  },
  activitiesEmptyText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  activityItem: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 8,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  activityItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
    gap: SPACING.SM,
  },
  activityItemType: {
    flex: 1,
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  newActivityBadge: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
    borderRadius: 8,
  },
  newActivityBadgeText: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.SURFACE,
    fontWeight: '600',
  },
  activityItemNote: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.SM,
    lineHeight: 18,
  },
  activityItemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
  },
  activityItemStaff: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
  activityItemTime: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
  studentNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.MD,
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  studentNoteText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.SM,
    flex: 1,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: SPACING.XL,
    right: SPACING.MD,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: SPACING.SM,
  },
  imageModalImage: {
    width: Dimensions.get('window').width - SPACING.XL * 2,
    height: Dimensions.get('window').height - SPACING.XL * 2,
  },
});

export default StudentManagementScreen;

