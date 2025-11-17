import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import orderService from '../../services/orderService';
import studentSlotService from '../../services/studentSlotService';
import { OrderHistory, OrderHistoryItem, StudentSlotResponse } from '../../types/api';

// Inline constants
const COLORS = {
  PRIMARY: '#1976D2',
  PRIMARY_DARK: '#1565C0',
  PRIMARY_LIGHT: '#42A5F5',
  SECONDARY: '#2196F3',
  ACCENT: '#64B5F6',
  BACKGROUND: '#F5F7FA',
  SURFACE: '#FFFFFF',
  TEXT_PRIMARY: '#1A1A1A',
  TEXT_SECONDARY: '#6B7280',
  BORDER: '#E5E7EB',
  SUCCESS: '#4CAF50',
  WARNING: '#FF9800',
  ERROR: '#F44336',
  SHADOW: '#000000',
};

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

const OrderHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const [orders, setOrders] = useState<OrderHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderHistory | null>(null);
  const [selectedSlotInfo, setSelectedSlotInfo] = useState<StudentSlotResponse | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

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

  const fetchOrders = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true);
        setError(null);
      }

      const response = await orderService.getMyOrders({
        pageIndex: page,
        pageSize: 20,
      });

      if (append) {
        setOrders(prev => [...prev, ...response.items]);
      } else {
        setOrders(response.items);
      }

      setHasMore(response.hasNextPage || false);
      setPageIndex(page);
    } catch (err: any) {
      const errorMessage = err?.message || 'Không thể tải lịch sử đơn hàng';
      setError(errorMessage);
      if (!append) {
        setOrders([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(1, false);
  }, [fetchOrders]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setPageIndex(1);
    setHasMore(true);
    fetchOrders(1, false);
  }, [fetchOrders]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore && !refreshing) {
      fetchOrders(pageIndex + 1, true);
    }
  }, [loading, hasMore, pageIndex, fetchOrders, refreshing]);

  const handleViewDetail = async (order: OrderHistory) => {
    setDetailModalVisible(true);
    setLoadingDetail(true);
    setSelectedOrder(order); // Show basic info first
    setSelectedSlotInfo(null); // Reset slot info
    
    try {
      // Fetch full order details from API
      const orderDetail = await orderService.getOrderById(order.id);
      setSelectedOrder(orderDetail);
      
      // If order has studentSlotId, fetch slot details
      if (orderDetail.studentSlotId) {
        try {
          // Use studentId from order to help filter slots
          const slotInfo = await studentSlotService.getStudentSlotById(
            orderDetail.studentSlotId,
            orderDetail.studentId || undefined
          );
          
          if (slotInfo) {
            setSelectedSlotInfo(slotInfo);
          }
        } catch (slotErr) {
          // Slot fetch failed, continue without slot info
        }
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Không thể tải chi tiết đơn hàng';
      Alert.alert('Lỗi', errorMessage);
      // Keep showing the basic order info if detail fetch fails
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseDetail = () => {
    setDetailModalVisible(false);
    setSelectedOrder(null);
    setSelectedSlotInfo(null);
  };

  const formatTime = useCallback((timeString: string | null | undefined) => {
    if (!timeString) return '--:--';
    // Handle both "HH:mm:ss" and "HH:mm" formats
    const parts = timeString.split(':');
    if (parts.length < 2) return timeString;
    const hours = parts[0]?.padStart(2, '0') ?? '--';
    const minutes = parts[1]?.padStart(2, '0') ?? '00';
    return `${hours}:${minutes}`;
  }, []);

  if (loading && orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Đang tải lịch sử đơn hàng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={48} color={COLORS.ERROR} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchOrders(1, false)}
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.PRIMARY]}
            tintColor={COLORS.PRIMARY}
          />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Lịch sử đơn hàng</Text>
          <Text style={styles.headerSubtitle}>
            Xem tất cả đơn hàng dịch vụ đã mua
          </Text>
        </View>

        {/* Orders List */}
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="receipt-long" size={64} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.emptyText}>Chưa có đơn hàng nào</Text>
            <Text style={styles.emptySubtext}>
              Các đơn hàng dịch vụ sẽ được hiển thị tại đây
            </Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {orders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => handleViewDetail(order)}
                activeOpacity={0.85}
              >
                <View style={styles.orderHeader}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderId}>Mã đơn: {order.id.substring(0, 8)}...</Text>
                    <Text style={styles.orderDate}>{formatDateTime(order.createdDate)}</Text>
                    {order.studentName && (
                      <Text style={styles.orderStudent}>Học sinh: {order.studentName}</Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                      {getStatusText(order.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderItems}>
                  <Text style={styles.orderItemsLabel}>
                    {order.totalItems} {order.totalItems === 1 ? 'mặt hàng' : 'mặt hàng'}
                  </Text>
                  {order.items.slice(0, 2).map((item, index) => (
                    <View key={index} style={styles.orderItemRow}>
                      <MaterialIcons name="restaurant" size={16} color={COLORS.TEXT_SECONDARY} />
                      <Text style={styles.orderItemName} numberOfLines={1}>
                        {item.serviceName} x{item.quantity}
                      </Text>
                    </View>
                  ))}
                  {order.items.length > 2 && (
                    <Text style={styles.orderMoreItems}>
                      +{order.items.length - 2} mặt hàng khác
                    </Text>
                  )}
                </View>

                <View style={styles.orderFooter}>
                  <Text style={styles.orderTotalLabel}>Tổng tiền:</Text>
                  <Text style={styles.orderTotalAmount}>
                    {formatCurrency(order.totalAmount)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {hasMore && (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                <Text style={styles.loadMoreText}>Đang tải thêm...</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Order Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseDetail}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết đơn hàng</Text>
              <TouchableOpacity onPress={handleCloseDetail}>
                <MaterialIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            {loadingDetail ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                <Text style={styles.modalLoadingText}>Đang tải chi tiết đơn hàng...</Text>
              </View>
            ) : selectedOrder ? (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Order Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Thông tin đơn hàng</Text>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="receipt" size={20} color={COLORS.PRIMARY} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Mã đơn</Text>
                      <Text style={styles.detailValue}>{selectedOrder.id}</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="calendar-today" size={20} color={COLORS.PRIMARY} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Ngày tạo</Text>
                      <Text style={styles.detailValue}>{formatDateTime(selectedOrder.createdDate)}</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="check-circle" size={20} color={getStatusColor(selectedOrder.status)} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Trạng thái</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(selectedOrder.status) }]}>
                          {getStatusText(selectedOrder.status)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Student Info */}
                {(selectedOrder.studentName || selectedOrder.studentEmail) && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Thông tin học sinh</Text>
                    {selectedOrder.studentName && (
                      <View style={styles.detailRow}>
                        <MaterialIcons name="person" size={20} color={COLORS.PRIMARY} />
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Tên học sinh</Text>
                          <Text style={styles.detailValue}>{selectedOrder.studentName}</Text>
                        </View>
                      </View>
                    )}
                    {selectedOrder.studentEmail && (
                      <View style={styles.detailRow}>
                        <MaterialIcons name="email" size={20} color={COLORS.PRIMARY} />
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Email</Text>
                          <Text style={styles.detailValue}>{selectedOrder.studentEmail}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Student Slot Info - Always show this section */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Thông tin slot học</Text>
                  
                  {/* Use slot info from API if available, otherwise fallback to order data */}
                  {selectedSlotInfo ? (
                    <>
                      {/* Date from slot */}
                      <View style={styles.detailRow}>
                        <MaterialIcons name="event" size={20} color={COLORS.PRIMARY} />
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Ngày học</Text>
                          <Text style={styles.detailValue}>
                            {selectedSlotInfo.date ? formatDate(selectedSlotInfo.date) : 'Chưa có thông tin'}
                          </Text>
                        </View>
                      </View>
                      
                      {/* Time from timeframe */}
                      <View style={styles.detailRow}>
                        <MaterialIcons name="schedule" size={20} color={COLORS.PRIMARY} />
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Thời gian học</Text>
                          <Text style={styles.detailValue}>
                            {selectedSlotInfo.timeframe?.startTime && selectedSlotInfo.timeframe?.endTime
                              ? `${formatTime(selectedSlotInfo.timeframe.startTime)} - ${formatTime(selectedSlotInfo.timeframe.endTime)}`
                              : selectedSlotInfo.timeframe?.startTime
                              ? `Bắt đầu: ${formatTime(selectedSlotInfo.timeframe.startTime)}`
                              : selectedSlotInfo.timeframe?.endTime
                              ? `Kết thúc: ${formatTime(selectedSlotInfo.timeframe.endTime)}`
                              : 'Chưa có thông tin'}
                          </Text>
                        </View>
                      </View>
                      
                      {/* Room name */}
                      {selectedSlotInfo.room?.roomName && (
                        <View style={styles.detailRow}>
                          <MaterialIcons name="meeting-room" size={20} color={COLORS.PRIMARY} />
                          <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Phòng học</Text>
                            <Text style={styles.detailValue}>{selectedSlotInfo.room.roomName}</Text>
                          </View>
                        </View>
                      )}
                      
                      {/* Branch name */}
                      {selectedSlotInfo.branchSlot?.branchName && (
                        <View style={styles.detailRow}>
                          <MaterialIcons name="location-on" size={20} color={COLORS.PRIMARY} />
                          <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Chi nhánh</Text>
                            <Text style={styles.detailValue}>{selectedSlotInfo.branchSlot.branchName}</Text>
                          </View>
                        </View>
                      )}
                      
                      {/* Timeframe name */}
                      {selectedSlotInfo.timeframe?.name && (
                        <View style={styles.detailRow}>
                          <MaterialIcons name="info" size={20} color={COLORS.PRIMARY} />
                          <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Ca học</Text>
                            <Text style={styles.detailValue}>{selectedSlotInfo.timeframe.name}</Text>
                          </View>
                        </View>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Fallback to order data if slot info not available */}
                      {selectedOrder.slotInfo && (
                        <View style={styles.detailRow}>
                          <MaterialIcons name="info" size={20} color={COLORS.PRIMARY} />
                          <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Thông tin slot</Text>
                            <Text style={styles.detailValue}>{selectedOrder.slotInfo}</Text>
                          </View>
                        </View>
                      )}
                      
                      <View style={styles.detailRow}>
                        <MaterialIcons name="schedule" size={20} color={COLORS.PRIMARY} />
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Thời gian học</Text>
                          <Text style={styles.detailValue}>
                            {selectedOrder.slotStartTime && selectedOrder.slotEndTime
                              ? `${formatTime(selectedOrder.slotStartTime)} - ${formatTime(selectedOrder.slotEndTime)}`
                              : selectedOrder.slotStartTime
                              ? `Bắt đầu: ${formatTime(selectedOrder.slotStartTime)}`
                              : selectedOrder.slotEndTime
                              ? `Kết thúc: ${formatTime(selectedOrder.slotEndTime)}`
                              : 'Chưa có thông tin'}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.detailRow}>
                        <MaterialIcons name="event" size={20} color={COLORS.PRIMARY} />
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Ngày học</Text>
                          <Text style={styles.detailValue}>
                            {selectedOrder.slotStartTime 
                              ? formatDate(selectedOrder.slotStartTime)
                              : selectedOrder.slotEndTime
                              ? formatDate(selectedOrder.slotEndTime)
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
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item, index) => (
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
                {selectedOrder.transactions && selectedOrder.transactions.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Giao dịch thanh toán</Text>
                    {selectedOrder.transactions.map((transaction, index) => (
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
                          <Text style={[
                            styles.transactionAmount,
                            { color: transaction.amount < 0 ? COLORS.ERROR : COLORS.SUCCESS }
                          ]}>
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
                  <Text style={styles.detailTotalAmount}>
                    {formatCurrency(selectedOrder.totalAmount)}
                  </Text>
                </View>
              </ScrollView>
            ) : null}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonFull]}
                onPress={handleCloseDetail}
              >
                <Text style={styles.modalButtonText}>Đóng</Text>
              </TouchableOpacity>
            </View>
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
  headerSection: {
    marginBottom: SPACING.LG,
  },
  headerTitle: {
    fontSize: FONTS.SIZES.XXL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  headerSubtitle: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  ordersList: {
    gap: SPACING.MD,
  },
  orderCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.MD,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.MD,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  orderDate: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  orderStudent: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  statusBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 12,
  },
  statusText: {
    fontSize: FONTS.SIZES.XS,
    fontWeight: '600',
  },
  orderItems: {
    marginBottom: SPACING.MD,
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  orderItemsLabel: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS,
  },
  orderItemName: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.XS,
    flex: 1,
  },
  orderMoreItems: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    marginTop: SPACING.XS,
    fontStyle: 'italic',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  orderTotalLabel: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  orderTotalAmount: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.SECONDARY,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.XL * 2,
  },
  emptyText: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.MD,
    marginBottom: SPACING.XS,
  },
  emptySubtext: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  loadMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.MD,
    gap: SPACING.SM,
  },
  loadMoreText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  // Modal Styles
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
    paddingBottom: SPACING.MD,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  modalTitle: {
    fontSize: FONTS.SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  modalBody: {
    padding: SPACING.MD,
    maxHeight: 500,
  },
  detailSection: {
    marginBottom: SPACING.LG,
  },
  modalLoadingContainer: {
    padding: SPACING.XL,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  modalLoadingText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.MD,
    paddingBottom: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  detailContent: {
    flex: 1,
    marginLeft: SPACING.MD,
  },
  detailLabel: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  detailValue: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  detailSectionTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  detailItemCard: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
  },
  detailItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
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
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  detailItemLabel: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  detailItemValue: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  detailItemTotal: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.SECONDARY,
    fontWeight: 'bold',
  },
  detailTotalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY_LIGHT + '10',
    borderRadius: 12,
    padding: SPACING.MD,
    marginTop: SPACING.MD,
  },
  emptyItemsContainer: {
    padding: SPACING.MD,
    alignItems: 'center',
  },
  emptyItemsText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    fontStyle: 'italic',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  transactionInfo: {
    flex: 1,
    marginLeft: SPACING.MD,
  },
  transactionLabel: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  transactionAmount: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
  },
  detailTotalLabel: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  detailTotalAmount: {
    fontSize: FONTS.SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.SECONDARY,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  modalButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonFull: {
    flex: 1,
  },
  modalButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
});

export default OrderHistoryScreen;

