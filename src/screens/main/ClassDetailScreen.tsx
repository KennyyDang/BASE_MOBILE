import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Card, Surface, Divider } from 'react-native-paper';

import studentSlotService from '../../services/studentSlotService';
import activityService from '../../services/activityService';
import branchSlotService from '../../services/branchSlotService';
import { StudentSlotResponse, ActivityResponse, BranchSlotRoomResponse } from '../../types/api';
import { RootStackParamList } from '../../types';
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

type ClassDetailRouteProp = RouteProp<RootStackParamList, 'ClassDetail'>;
type ClassDetailNavigationProp = StackNavigationProp<RootStackParamList>;

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

const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'Chưa có';
  try {
    let date = new Date(dateString);
    
    // Kiểm tra xem date có hợp lệ không
    if (isNaN(date.getTime())) {
      // Nếu không parse được, thử parse lại bằng cách loại bỏ timezone
      const cleanedDateString = dateString.split('T')[0]; // Lấy phần date trước 'T'
      const fallbackDate = new Date(cleanedDateString);
      if (isNaN(fallbackDate.getTime())) {
        // Nếu vẫn không được, thử format đơn giản hơn
        const parts = cleanedDateString.split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateString.split('T')[0] || dateString; // Trả về phần date trước 'T'
      }
      date = fallbackDate;
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    // Thêm thứ trong tuần
    const weekdays = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    const weekday = weekdays[date.getDay()];
    
    return `${weekday}, ${day}/${month}/${year}`;
  } catch {
    // Nếu có lỗi, thử format đơn giản hơn
    try {
      const cleanedDateString = dateString.split('T')[0]; // Lấy phần date trước 'T'
      const parts = cleanedDateString.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return cleanedDateString;
    } catch {
      // Nếu vẫn lỗi, trả về nguyên bản nhưng loại bỏ phần time nếu có
      return dateString.split('T')[0] || dateString;
    }
  }
};

const formatTimeRange = (timeframe: StudentSlotResponse['timeframe']) => {
  if (!timeframe) {
    return 'Chưa có khung giờ';
  }
  return `${formatTime(timeframe.startTime)} - ${formatTime(timeframe.endTime)}`;
};

const getStatusLabel = (status: string) => {
  const normalized = (status || '').toLowerCase();
  switch (normalized) {
    case 'booked':
      return 'Đã Đặt';
    case 'completed':
      return 'Đã điểm danh';
    case 'cancelled':
      return 'Đã huỷ lớp';
    case 'noshow':
      return 'Vắng mặt';
    case 'rescheduled':
      return 'Đổi lịch';
    default:
      return status || 'Chưa xác định';
  }
};

const getStatusColor = (status: string) => {
  const normalized = (status || '').toLowerCase();
  switch (normalized) {
    case 'booked':
      return COLORS.PRIMARY;
    case 'completed':
      return COLORS.SUCCESS;
    case 'cancelled':
      return COLORS.ERROR;
    case 'noshow':
      return COLORS.WARNING || '#FF9800';
    case 'rescheduled':
      return COLORS.INFO || '#2196F3';
    default:
      return COLORS.TEXT_SECONDARY;
  }
};

const ClassDetailScreen: React.FC = () => {
  const navigation = useNavigation<ClassDetailNavigationProp>();
  const route = useRoute<ClassDetailRouteProp>();
  const { slotId, studentId } = route.params;

  const [slot, setSlot] = useState<StudentSlotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<ActivityResponse[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [attendance, setAttendance] = useState<any | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [roomDetails, setRoomDetails] = useState<BranchSlotRoomResponse | null>(null);
  const [roomLoading, setRoomLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Group services by serviceId để gộp các services giống nhau
  const groupedServicesArray = useMemo(() => {
    if (!slot?.services || !Array.isArray(slot.services) || slot.services.length === 0) {
      return [];
    }

    const groupedServices = new Map<string, {
      serviceId: string;
      serviceName: string;
      totalQuantity: number;
      unitPrice: number;
      totalPrice: number;
    }>();

    slot.services.forEach((service, serviceIndex) => {
      if (!service) return;
      
      const serviceId = service.serviceId || `service-${serviceIndex}`;
      const quantity = service.quantity || 1;
      const unitPrice = service.unitPrice || 0;
      const totalPrice = service.totalPrice || (unitPrice * quantity);

      const groupKey = serviceId;
      
      if (groupedServices.has(groupKey)) {
        const existing = groupedServices.get(groupKey)!;
        existing.totalQuantity += quantity;
        existing.totalPrice += totalPrice;
      } else {
        groupedServices.set(groupKey, {
          serviceId: serviceId,
          serviceName: service.serviceName || 'Dịch vụ',
          totalQuantity: quantity,
          unitPrice: unitPrice,
          totalPrice: totalPrice,
        });
      }
    });

    return Array.from(groupedServices.values());
  }, [slot?.services]);

  const fetchSlotDetails = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const slotData = await studentSlotService.getStudentSlotById(slotId, studentId);
      if (slotData) {
        setSlot(slotData);
      } else {
        setError('Không tìm thấy thông tin lớp học');
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể tải thông tin lớp học. Vui lòng thử lại.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slotId, studentId]);

  // Fetch room details (facility, staff...) based on branchSlotId + roomId
  const fetchRoomDetails = useCallback(async () => {
    if (!slot?.branchSlotId || !slot?.roomId) {
      setRoomDetails(null);
      return;
    }

    setRoomLoading(true);
    try {
      const response = await branchSlotService.getRoomsBySlot(slot.branchSlotId, 1, 20);
      // studentSlot.roomId thường là roomId (not branchSlotRoom.id)
      const foundRoom =
        response.items.find(
          (r) => r.roomId === slot.roomId || r.id === slot.roomId
        ) || null;
      setRoomDetails(foundRoom);
    } catch {
      setRoomDetails(null);
    } finally {
      setRoomLoading(false);
    }
  }, [slot]);

  const fetchActivities = useCallback(async () => {
    if (!slotId || !studentId) return;
    setActivitiesLoading(true);
    try {
      const response = await activityService.getMyChildrenActivities({
        studentId,
        studentSlotId: slotId,
        pageIndex: 1,
        pageSize: 50,
      });
      setActivities(response.items || []);
    } catch (err: any) {
      // Bỏ qua lỗi 401 (Unauthorized) khi đã logout - không log warning
      const statusCode = err?.response?.status || err?.response?.statusCode;
      if (statusCode === 401) {
        setActivities([]);
        return;
      }
      // Chỉ log warning cho các lỗi khác
      console.warn('Failed to fetch activities:', err);
      setActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  }, [slotId, studentId]);

  const fetchAttendance = useCallback(async () => {
    if (!slotId) return;
    setAttendanceLoading(true);
    try {
      // TODO: Implement attendance service when available
      // const data = await attendanceService.getAttendanceBySlotId(slotId);
      // setAttendance(data);
      setAttendance(null);
    } catch (err: any) {
      console.warn('Failed to fetch attendance:', err);
      setAttendance(null);
    } finally {
      setAttendanceLoading(false);
    }
  }, [slotId]);

  useEffect(() => {
    fetchSlotDetails();
  }, [fetchSlotDetails]);

  useEffect(() => {
    if (slot) {
      fetchActivities();
      fetchAttendance();
      fetchRoomDetails();
    }
  }, [slot, fetchActivities, fetchAttendance, fetchRoomDetails]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSlotDetails(true);
    fetchActivities();
    fetchAttendance();
  }, [fetchSlotDetails, fetchActivities, fetchAttendance]);

  const handlePurchaseServices = () => {
    if (!slot) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin lớp học để mua dịch vụ bổ sung');
      return;
    }

    // Không cho mua dịch vụ nếu slot đã qua ngày học
    if (slot.date) {
      try {
        const slotDate = new Date(slot.date);
        const today = new Date();

        // So sánh theo ngày (bỏ phần giờ phút giây)
        slotDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        if (slotDate < today) {
          Alert.alert(
            'Không thể mua dịch vụ',
            'Slot này đã qua rồi, vui lòng mua ở slot khác.'
          );
          return;
        }
      } catch {
        // Nếu parse ngày lỗi thì bỏ qua việc chặn theo ngày, để tránh làm hỏng flow hiện tại
      }
    }

    try {
      navigation.navigate('PurchaseService', {
        studentSlotId: slot.id,
        studentId: slot.studentId,
      });
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể chuyển sang trang mua dịch vụ bổ sung');
    }
  };

  const handleCancelSlot = () => {
    if (!slot || !slot.studentId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin lớp học để hủy');
      return;
    }

    // Kiểm tra trạng thái slot
    const status = (slot.status || '').toLowerCase();
    if (status === 'cancelled') {
      Alert.alert('Thông báo', 'Lớp học này đã được hủy rồi.');
      return;
    }

    if (status === 'completed') {
      Alert.alert('Thông báo', 'Lớp học này đã hoàn thành, không thể hủy.');
      return;
    }

    // Kiểm tra ngày học - không cho hủy nếu đã qua ngày học
    if (slot.date) {
      try {
        const slotDate = new Date(slot.date);
        const today = new Date();

        // So sánh theo ngày (bỏ phần giờ phút giây)
        slotDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        if (slotDate < today) {
          Alert.alert(
            'Không thể hủy',
            'Lớp học này đã qua rồi, không thể hủy.'
          );
          return;
        }
      } catch {
        // Nếu parse ngày lỗi thì bỏ qua việc chặn theo ngày
      }
    }

    Alert.alert(
      'Xác nhận hủy lịch học',
      'Bạn có chắc chắn muốn hủy lịch học này?',
      [
        {
          text: 'Không',
          style: 'cancel',
        },
        {
          text: 'Có, hủy lịch',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await studentSlotService.cancelSlot(slot.id, slot.studentId);
              Alert.alert(
                'Thành công',
                'Đã hủy lịch học thành công.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Refresh slot details và quay lại màn hình trước
                      fetchSlotDetails();
                      navigation.goBack();
                    },
                  },
                ]
              );
            } catch (error: any) {
              const message =
                error?.response?.data?.message ||
                error?.message ||
                'Không thể hủy lịch học. Vui lòng thử lại.';
              Alert.alert('Lỗi', message);
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  if (loading && !slot) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Đang tải thông tin lớp học...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !slot) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={COLORS.ERROR} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchSlotDetails()}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.PRIMARY]}
            tintColor={COLORS.PRIMARY}
          />
        }
      >
        {/* Class Information Card */}
        <Card style={styles.card} mode="elevated" elevation={1}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="info-outline" size={22} color={COLORS.PRIMARY} />
              <Text style={styles.cardTitle}>Thông tin lớp học</Text>
            </View>

            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <MaterialIcons name="calendar-today" size={18} color={COLORS.PRIMARY} />
                </View>
                <Text style={styles.infoLabel}>Ngày học</Text>
                <Text style={styles.infoValue}>{formatDate(slot?.date)}</Text>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <MaterialIcons name="access-time" size={18} color={COLORS.PRIMARY} />
                </View>
                <Text style={styles.infoLabel}>Giờ học</Text>
                <Text style={styles.infoValue}>{formatTimeRange(slot?.timeframe)}</Text>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <MaterialIcons name="meeting-room" size={18} color={COLORS.PRIMARY} />
                </View>
                <Text style={styles.infoLabel}>Phòng</Text>
                <Text style={styles.infoValue}>
                  {slot?.room?.roomName || roomDetails?.roomName || 'Chưa có'}
                </Text>
              </View>

              {/* Facility (Cơ sở) */}
              {roomDetails?.facilityName && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <MaterialIcons name="business" size={18} color={COLORS.PRIMARY} />
                  </View>
                  <Text style={styles.infoLabel}>Cơ sở</Text>
                  <Text style={styles.infoValue}>{roomDetails.facilityName}</Text>
                </View>
              )}

              {/* Staff (Nhân viên quản lý ca) */}
              {(() => {
                // Ưu tiên: slot.staffs > slot.room.staff > roomDetails.staff
                let staffInfo = null;
                
                if (slot?.staffs && slot.staffs.length > 0) {
                  staffInfo = slot.staffs[0];
                } else if (slot?.room?.staff) {
                  staffInfo = slot.room.staff;
                } else if (roomDetails?.staff) {
                  staffInfo = roomDetails.staff;
                }

                if (staffInfo) {
                  const staffName = 
                    staffInfo.staffName || 
                    staffInfo.fullName || 
                    'Chưa có';
                  
                  const staffRole = 
                    staffInfo.staffRole || 
                    staffInfo.role || 
                    '';
                  
                  const isValidRole = staffRole && 
                    staffRole.trim() !== '' && 
                    staffRole.toLowerCase() !== 'string' &&
                    staffRole !== 'null' &&
                    staffRole !== 'undefined';

                  return (
                    <View style={styles.infoRow}>
                      <View style={styles.infoIconContainer}>
                        <MaterialIcons name="person" size={18} color={COLORS.PRIMARY} />
                      </View>
                      <Text style={styles.infoLabel}>Nhân viên quản lý ca</Text>
                      <Text style={styles.infoValue}>
                        {staffName}
                        {isValidRole ? ` (${staffRole})` : ''}
                      </Text>
                    </View>
                  );
                }
                return null;
              })()}

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <MaterialIcons name="location-on" size={18} color={COLORS.PRIMARY} />
                </View>
                <Text style={styles.infoLabel}>Chi nhánh</Text>
                <Text style={styles.infoValue}>{slot?.branchSlot?.branchName || 'Chưa có'}</Text>
              </View>

              {/* Slot Type */}
              {slot?.branchSlot?.slotType?.name && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <MaterialIcons name="category" size={18} color={COLORS.PRIMARY} />
                  </View>
                  <Text style={styles.infoLabel}>Loại hoạt động</Text>
                  <Text style={styles.infoValue} numberOfLines={2}>
                    {slot.branchSlot.slotType.name}
                  </Text>
                </View>
              )}

              {/* Status - Chỉ hiển thị nếu không phải Cancelled */}
              {slot?.status && slot.status.toLowerCase() !== 'cancelled' && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <MaterialIcons name="info" size={18} color={COLORS.PRIMARY} />
                  </View>
                  <Text style={styles.infoLabel}>Trạng thái</Text>
                  <View style={styles.statusContainer}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: getStatusColor(slot.status) + '20',
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="circle"
                        size={10}
                        color={getStatusColor(slot.status)}
                        style={styles.statusIcon}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(slot.status) },
                        ]}
                      >
                        {getStatusLabel(slot.status)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Parent Note - Ghi chú của phụ huynh */}
            {slot?.parentNote && (
              <View style={styles.parentNoteSection}>
                <View style={styles.parentNoteHeader}>
                  <MaterialIcons name="family-restroom" size={18} color={COLORS.SECONDARY} />
                  <Text style={styles.parentNoteLabel}>Ghi chú của phụ huynh</Text>
                </View>
                <View style={styles.parentNoteBox}>
                  <Text style={styles.parentNoteText}>{slot.parentNote}</Text>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Services Add-On Section - Dịch vụ đã mua */}
        {groupedServicesArray.length > 0 && (
          <Card style={styles.card} mode="elevated" elevation={1}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="shopping-cart" size={22} color={COLORS.PRIMARY} />
                <Text style={styles.cardTitle}>Dịch vụ bổ sung đã mua</Text>
              </View>
              <View style={styles.servicesList}>
                {groupedServicesArray.map((service, index) => {
                  // Validate service data trước khi render
                  if (!service || service.totalQuantity <= 0) {
                    return null;
                  }

                  // Dùng index làm key vì sau khi group, mỗi service trong array là unique
                  // Kết hợp với slotId để đảm bảo unique hoàn toàn
                  const uniqueKey = `service-${slot?.id || 'slot'}-${index}`;

                  return (
                    <View key={uniqueKey} style={styles.serviceItem}>
                      <View style={styles.serviceInfo}>
                        <Text style={styles.serviceName} numberOfLines={2}>
                          {service.serviceName || 'Dịch vụ'}
                        </Text>
                        <Text style={styles.serviceQuantity}>
                          Số lượng: {service.totalQuantity}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Activities Card */}
        <Card style={styles.card} mode="elevated" elevation={1}>
          <Card.Content style={styles.cardContent} pointerEvents="box-none">
            <View style={styles.cardHeader}>
              <MaterialIcons name="event-note" size={22} color={COLORS.PRIMARY} />
              <Text style={styles.cardTitle}>Hoạt động ({activities.length})</Text>
            </View>
            {activitiesLoading ? (
              <View style={styles.stateContainer}>
                <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                <Text style={styles.stateText}>Đang tải...</Text>
              </View>
            ) : activities.length > 0 ? (
              <View style={styles.activitiesContainer} pointerEvents="box-none">
                {activities.map((activity) => {
                  const handlePress = () => {
                    const targetStudentId = slot?.studentId || studentId;
                    const targetStudentName = slot?.studentName || 'Học sinh';
                    
                    if (targetStudentId && slotId) {
                      try {
                        navigation.navigate('StudentActivities', {
                          studentId: targetStudentId,
                          studentName: targetStudentName,
                          studentSlotId: slotId,
                          slotDate: slot?.date || '',
                          slotTimeframe: slot?.timeframe?.name || formatTimeRange(slot?.timeframe),
                        });
                      } catch (error) {
                        Alert.alert('Lỗi', 'Không thể chuyển trang. Vui lòng thử lại.');
                      }
                    } else {
                      Alert.alert('Lỗi', 'Không thể tải thông tin học sinh');
                    }
                  };
                  
                  return (
                    <Pressable
                      key={activity.id}
                      style={({ pressed }) => [
                        styles.activityItem,
                        pressed && styles.activityItemPressed,
                      ]}
                      onPress={handlePress}
                    >
                      <MaterialIcons name="event-note" size={18} color={COLORS.PRIMARY} />
                      <View style={styles.activityContent} pointerEvents="none">
                        <Text style={styles.activityText}>
                          {activity.activityType?.name || 'Hoạt động'}
                        </Text>
                        {activity.note && (
                          <Text style={styles.activityNote} numberOfLines={1}>
                            {activity.note}
                          </Text>
                        )}
                      </View>
                      <MaterialIcons name="chevron-right" size={20} color={COLORS.TEXT_SECONDARY} />
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.emptyText}>Chưa có hoạt động nào</Text>
            )}
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          {/* Cancel Slot Button - Chỉ hiển thị nếu slot chưa bị hủy và chưa hoàn thành */}
          {slot && slot.status && slot.status.toLowerCase() !== 'cancelled' && slot.status.toLowerCase() !== 'completed' && (
            <TouchableOpacity
              style={[styles.cancelButton, cancelling && styles.cancelButtonDisabled]}
              onPress={handleCancelSlot}
              activeOpacity={0.8}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color={COLORS.SURFACE} />
              ) : (
                <MaterialIcons name="cancel" size={20} color={COLORS.SURFACE} />
              )}
              <Text style={styles.cancelButtonText}>
                {cancelling ? 'Đang hủy...' : 'Hủy lịch học'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Purchase Services Button */}
          <TouchableOpacity
            style={styles.purchaseButton}
            onPress={handlePurchaseServices}
            activeOpacity={0.8}
          >
            <MaterialIcons name="shopping-cart" size={20} color={COLORS.SURFACE} />
            <Text style={styles.purchaseButtonText}>Mua dịch vụ bổ sung</Text>
            <MaterialIcons name="arrow-forward" size={20} color={COLORS.SURFACE} />
          </TouchableOpacity>
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.XL,
  },
  errorText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.ERROR,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SPACING.LG,
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.SURFACE,
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
  },
  card: {
    marginBottom: SPACING.MD,
    borderRadius: 16,
  },
  cardHeader: {
    marginBottom: SPACING.MD,
  },
  cardTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.PRIMARY_50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  infoLabel: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    flex: 1,
  },
  infoValue: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    flex: 2,
    textAlign: 'right',
  },
  divider: {
    marginVertical: SPACING.SM,
  },
  stateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
  },
  stateText: {
    marginLeft: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  emptyText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    fontStyle: 'italic',
    paddingVertical: SPACING.SM,
  },
  attendanceContainer: {
    gap: SPACING.SM,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.XS,
  },
  attendanceText: {
    marginLeft: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
  },
  activitiesContainer: {
    gap: SPACING.SM,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.SM,
    borderRadius: 8,
    backgroundColor: COLORS.BACKGROUND,
    marginBottom: SPACING.XS,
    minHeight: 48,
  },
  activityItemPressed: {
    backgroundColor: COLORS.PRIMARY_50,
    opacity: 0.8,
  },
  activityContent: {
    flex: 1,
    marginLeft: SPACING.SM,
  },
  activityText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS / 2,
  },
  activityNote: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    borderRadius: 10,
    gap: SPACING.SM,
    minHeight: 48,
  },
  purchaseButtonText: {
    flex: 1,
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
    textAlign: 'center',
  },
  statusContainer: {
    flex: 2,
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 12,
    gap: SPACING.XS,
  },
  statusIcon: {
    marginRight: 0,
  },
  statusText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.ERROR,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    borderRadius: 10,
    gap: SPACING.SM,
    minHeight: 48,
  },
  cancelButtonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  parentNoteSection: {
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
    color: COLORS.SECONDARY,
  },
  parentNoteBox: {
    backgroundColor: COLORS.INFO_BG,
    padding: SPACING.MD,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.SECONDARY,
  },
  parentNoteText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 20,
  },
  servicesList: {
    gap: SPACING.SM,
  },
  serviceItem: {
    padding: SPACING.MD,
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.PRIMARY,
  },
  serviceInfo: {
    gap: SPACING.SM,
  },
  serviceName: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 20,
  },
  servicePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
    flexWrap: 'wrap',
  },
  serviceQuantity: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  servicePrice: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  serviceTotal: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '700',
  },
  actionButtonsContainer: {
    gap: SPACING.SM,
    marginTop: SPACING.XS,
  },
});

export default ClassDetailScreen;

