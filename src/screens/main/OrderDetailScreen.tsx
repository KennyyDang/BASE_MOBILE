import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import orderService from '../../services/orderService';
import studentSlotService from '../../services/studentSlotService';
import { OrderHistory, StudentSlotResponse } from '../../types/api';
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

type OrderDetailScreenRouteProp = RouteProp<RootStackParamList, 'OrderDetail'>;
type OrderDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OrderDetail'>;

const OrderDetailScreen: React.FC = () => {
  const navigation = useNavigation<OrderDetailScreenNavigationProp>();
  const route = useRoute<OrderDetailScreenRouteProp>();
  const { orderId, order: initialOrder } = route.params;

  const [order, setOrder] = useState<OrderHistory | null>(initialOrder || null);
  const [slotInfo, setSlotInfo] = useState<StudentSlotResponse | null>(null);
  const [loading, setLoading] = useState(!initialOrder);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  const formatDateTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const formatTime = useCallback((timeString: string | null | undefined) => {
    if (!timeString) return '--:--';
    const parts = timeString.split(':');
    if (parts.length < 2) return timeString;
    const hours = parts[0]?.padStart(2, '0') ?? '--';
    const minutes = parts[1]?.padStart(2, '0') ?? '00';
    return `${hours}:${minutes}`;
  }, []);

  const getStatusColor = useCallback((status: string) => {
    const upperStatus = status.toUpperCase();
    if (upperStatus === 'COMPLETED' || upperStatus === 'PAID') return COLORS.SUCCESS;
    if (upperStatus === 'PENDING') return COLORS.WARNING;
    if (upperStatus === 'FAILED' || upperStatus === 'CANCELLED') return COLORS.ERROR;
    return COLORS.TEXT_SECONDARY;
  }, []);

  const getStatusText = useCallback((status: string) => {
    const upperStatus = status.toUpperCase();
    if (upperStatus === 'COMPLETED' || upperStatus === 'PAID') return 'Đã thanh toán';
    if (upperStatus === 'PENDING') return 'Chờ thanh toán';
    if (upperStatus === 'FAILED') return 'Thất bại';
    if (upperStatus === 'CANCELLED') return 'Đã hủy';
    return status;
  }, []);

  const fetchOrderDetail = useCallback(async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      setError(null);

      const orderDetail = await orderService.getOrderById(orderId);
      setOrder(orderDetail);

      // If order has studentSlotId, fetch slot details
      if (orderDetail.studentSlotId) {
        try {
          const slotInfo = await studentSlotService.getStudentSlotById(
            orderDetail.studentSlotId,
            orderDetail.studentId || undefined
          );

          if (slotInfo) {
            setSlotInfo(slotInfo);
          }
        } catch (slotErr) {
          // Slot fetch failed, continue without slot info
        }
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Không thể tải chi tiết đơn hàng';
      setError(errorMessage);
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!initialOrder && orderId) {
      fetchOrderDetail();
    } else if (initialOrder) {
      // If slot info is needed, fetch it
      if (initialOrder.studentSlotId) {
        studentSlotService
          .getStudentSlotById(initialOrder.studentSlotId, initialOrder.studentId || undefined)
          .then(setSlotInfo)
          .catch(() => {
            // Ignore slot fetch errors
          });
      }
    }
  }, [orderId, initialOrder, fetchOrderDetail]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Đang tải chi tiết đơn hàng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={48} color={COLORS.ERROR} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOrderDetail}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerContainer}>
          <MaterialIcons name="receipt-long" size={64} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.emptyText}>Không tìm thấy đơn hàng</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Order Info */}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Thông tin đơn hàng</Text>
          <View style={styles.detailRow}>
            <MaterialIcons name="receipt" size={20} color={COLORS.PRIMARY} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Mã đơn</Text>
              <Text style={styles.detailValue}>{order.id}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="calendar-today" size={20} color={COLORS.PRIMARY} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Ngày tạo</Text>
              <Text style={styles.detailValue}>{formatDateTime(order.createdDate)}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="check-circle" size={20} color={getStatusColor(order.status)} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Trạng thái</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                  {getStatusText(order.status)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Student Info */}
        {(order.studentName || order.studentEmail) && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Thông tin học sinh</Text>
            {order.studentName && (
              <View style={styles.detailRow}>
                <MaterialIcons name="person" size={20} color={COLORS.PRIMARY} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Tên học sinh</Text>
                  <Text style={styles.detailValue}>{order.studentName}</Text>
                </View>
              </View>
            )}
            {order.studentEmail && (
              <View style={styles.detailRow}>
                <MaterialIcons name="email" size={20} color={COLORS.PRIMARY} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{order.studentEmail}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Student Slot Info */}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Thông tin slot học</Text>

          {slotInfo ? (
            <>
              <View style={styles.detailRow}>
                <MaterialIcons name="event" size={20} color={COLORS.PRIMARY} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Ngày học</Text>
                  <Text style={styles.detailValue}>
                    {slotInfo.date ? formatDate(slotInfo.date) : 'Chưa có thông tin'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <MaterialIcons name="schedule" size={20} color={COLORS.PRIMARY} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Thời gian học</Text>
                  <Text style={styles.detailValue}>
                    {slotInfo.timeframe?.startTime && slotInfo.timeframe?.endTime
                      ? `${formatTime(slotInfo.timeframe.startTime)} - ${formatTime(slotInfo.timeframe.endTime)}`
                      : slotInfo.timeframe?.startTime
                      ? `Bắt đầu: ${formatTime(slotInfo.timeframe.startTime)}`
                      : slotInfo.timeframe?.endTime
                      ? `Kết thúc: ${formatTime(slotInfo.timeframe.endTime)}`
                      : 'Chưa có thông tin'}
                  </Text>
                </View>
              </View>

              {slotInfo.room?.roomName && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="meeting-room" size={20} color={COLORS.PRIMARY} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Phòng học</Text>
                    <Text style={styles.detailValue}>{slotInfo.room.roomName}</Text>
                  </View>
                </View>
              )}

              {slotInfo.branchSlot?.branchName && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="location-on" size={20} color={COLORS.PRIMARY} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Chi nhánh</Text>
                    <Text style={styles.detailValue}>{slotInfo.branchSlot.branchName}</Text>
                  </View>
                </View>
              )}

              {slotInfo.timeframe?.name && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="info" size={20} color={COLORS.PRIMARY} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Ca học</Text>
                    <Text style={styles.detailValue}>{slotInfo.timeframe.name}</Text>
                  </View>
                </View>
              )}
            </>
          ) : (
            <>
              {order.slotInfo && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="info" size={20} color={COLORS.PRIMARY} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Thông tin slot</Text>
                    <Text style={styles.detailValue}>{order.slotInfo}</Text>
                  </View>
                </View>
              )}

              <View style={styles.detailRow}>
                <MaterialIcons name="schedule" size={20} color={COLORS.PRIMARY} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Thời gian học</Text>
                  <Text style={styles.detailValue}>
                    {order.slotStartTime && order.slotEndTime
                      ? `${formatTime(order.slotStartTime)} - ${formatTime(order.slotEndTime)}`
                      : order.slotStartTime
                      ? `Bắt đầu: ${formatTime(order.slotStartTime)}`
                      : order.slotEndTime
                      ? `Kết thúc: ${formatTime(order.slotEndTime)}`
                      : 'Chưa có thông tin'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <MaterialIcons name="event" size={20} color={COLORS.PRIMARY} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Ngày học</Text>
                  <Text style={styles.detailValue}>
                    {order.slotStartTime
                      ? formatDate(order.slotStartTime)
                      : order.slotEndTime
                      ? formatDate(order.slotEndTime)
                      : 'Chưa có thông tin'}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Order Items */}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Danh sách mặt hàng</Text>
          {order.items && order.items.length > 0 ? (
            order.items.map((item, index) => (
              <View key={index} style={styles.detailItemCard}>
                <View style={styles.detailItemHeader}>
                  <MaterialIcons name="restaurant" size={24} color={COLORS.PRIMARY} />
                  <View style={styles.detailItemInfo}>
                    <Text style={styles.detailItemName}>{item.serviceName}</Text>
                    <Text style={styles.detailItemType}>{item.serviceType}</Text>
                  </View>
                </View>
                <View style={styles.detailItemRow}>
                  <Text style={styles.detailItemLabel}>Số lượng:</Text>
                  <Text style={styles.detailItemValue}>{item.quantity}</Text>
                </View>
                <View style={styles.detailItemRow}>
                  <Text style={styles.detailItemLabel}>Đơn giá:</Text>
                  <Text style={styles.detailItemValue}>{formatCurrency(item.unitPrice)}</Text>
                </View>
                <View style={styles.detailItemRow}>
                  <Text style={styles.detailItemLabel}>Thành tiền:</Text>
                  <Text style={[styles.detailItemValue, styles.detailItemTotal]}>
                    {formatCurrency(item.lineTotal)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyItemsContainer}>
              <Text style={styles.emptyItemsText}>Chưa có mặt hàng nào</Text>
            </View>
          )}
        </View>

        {/* Transactions */}
        {order.transactions && order.transactions.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Giao dịch thanh toán</Text>
            {order.transactions.map((transaction, index) => (
              <View key={index} style={styles.transactionCard}>
                <MaterialIcons
                  name={transaction.amount < 0 ? 'payment' : 'add-circle'}
                  size={20}
                  color={transaction.amount < 0 ? COLORS.ERROR : COLORS.SUCCESS}
                />
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionLabel}>
                    {transaction.amount < 0 ? 'Đã thanh toán' : 'Hoàn tiền'}
                  </Text>
                  <Text
                    style={[
                      styles.transactionAmount,
                      { color: transaction.amount < 0 ? COLORS.ERROR : COLORS.SUCCESS },
                    ]}
                  >
                    {formatCurrency(Math.abs(transaction.amount))}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Order Total */}
        <View style={styles.detailTotalSection}>
          <Text style={styles.detailTotalLabel}>Tổng cộng:</Text>
          <Text style={styles.detailTotalAmount}>{formatCurrency(order.totalAmount)}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    elevation: 2,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.MD,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  errorText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.ERROR,
    textAlign: 'center',
    marginBottom: SPACING.LG,
  },
  retryButton: {
    marginTop: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.SURFACE,
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
  },
  emptyText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  detailSection: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailSectionTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.MD,
  },
  detailContent: {
    flex: 1,
    marginLeft: SPACING.SM,
  },
  detailLabel: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  detailValue: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: FONTS.SIZES.XS,
    fontWeight: '600',
  },
  detailItemCard: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  detailItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  detailItemInfo: {
    flex: 1,
    marginLeft: SPACING.SM,
  },
  detailItemName: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  detailItemType: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  detailItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.XS,
  },
  detailItemLabel: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  detailItemValue: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  detailItemTotal: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  emptyItemsContainer: {
    padding: SPACING.LG,
    alignItems: 'center',
  },
  emptyItemsText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  transactionInfo: {
    flex: 1,
    marginLeft: SPACING.SM,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLabel: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  transactionAmount: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: 'bold',
  },
  detailTotalSection: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 16,
    padding: SPACING.LG,
    marginTop: SPACING.MD,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailTotalLabel: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.SURFACE,
  },
  detailTotalAmount: {
    fontSize: FONTS.SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.SURFACE,
  },
});

export default OrderDetailScreen;

