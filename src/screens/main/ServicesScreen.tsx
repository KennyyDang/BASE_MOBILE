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
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../../types';
import serviceService from '../../services/serviceService';
import studentSlotService from '../../services/studentSlotService';
import orderService from '../../services/orderService';
import { AddOnService, StudentSlotResponse, WalletType, StudentResponse } from '../../types/api';
import { COLORS } from '../../constants';
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

// Screen có thể được mở từ Stack, nhưng vẫn dùng navigation any để không phụ thuộc Tab param.
type ServicesNavigationProp = BottomTabNavigationProp<any, any>;

const ServicesScreen: React.FC = () => {
  const navigation = useNavigation<ServicesNavigationProp>();
  const route = useRoute<any>();
  const { students, loading: studentsLoading } = useMyChildren();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [addOns, setAddOns] = useState<AddOnService[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Purchase modal states
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<AddOnService | null>(null);
  const [studentSlots, setStudentSlots] = useState<StudentSlotResponse[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<StudentSlotResponse | null>(null);
  const [quantity, setQuantity] = useState<string>('1');
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Payment modal states
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [orderTotalAmount, setOrderTotalAmount] = useState<number>(0);
  const [walletType, setWalletType] = useState<WalletType>('Parent');
  const [paying, setPaying] = useState(false);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
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

  const formatTime = useCallback((timeString: string) => {
    return timeString.substring(0, 5); // HH:mm
  }, []);

  const fetchAddOns = useCallback(async () => {
    if (!selectedStudentId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError(null);
      const data = await serviceService.getStudentAddOns(selectedStudentId);
      // Only show active add-ons
      const activeAddOns = data.filter(addOn => addOn.isActive);
      setAddOns(activeAddOns);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Không thể tải danh sách dịch vụ';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStudentId]);

  const fetchStudentSlots = useCallback(async () => {
    if (!selectedStudentId) {
      setStudentSlots([]);
      return;
    }
    try {
      setLoadingSlots(true);
      const response = await studentSlotService.getStudentSlots({
        pageIndex: 1,
        pageSize: 100,
        studentId: selectedStudentId, // Lọc theo học sinh đã chọn
        status: 'Booked',
        upcomingOnly: true,
      });
      // Filter only booked slots (API đã filter nhưng để chắc chắn)
      const bookedSlots = response.items.filter(slot => slot.status === 'Booked');
      setStudentSlots(bookedSlots);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Không thể tải danh sách slot';
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedStudentId]);

  // Auto-select first student when students are loaded
  useEffect(() => {
    if (students.length > 0) {
      // Nếu chưa chọn học sinh nào hoặc học sinh đã chọn không còn trong danh sách
      if (!selectedStudentId || !students.find(s => s.id === selectedStudentId)) {
        const routeStudentId = route?.params?.studentId as string | undefined;
        if (routeStudentId && students.find(s => s.id === routeStudentId)) {
          setSelectedStudentId(routeStudentId);
        } else {
          setSelectedStudentId(students[0].id);
        }
      }
    }
  }, [students, selectedStudentId, route?.params?.studentId]);

  const hideStudentSelector = !!route?.params?.hideStudentSelector;

  useEffect(() => {
    if (selectedStudentId) {
      setLoading(true);
      fetchAddOns();
    }
  }, [fetchAddOns, selectedStudentId]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAddOns();
  }, [fetchAddOns]);

  const handlePurchase = (addOn: AddOnService) => {
    setSelectedService(addOn);
    setSelectedSlot(null);
    setQuantity('1');
    setPurchaseModalVisible(true);
    fetchStudentSlots();
  };

  const handleClosePurchaseModal = () => {
    setPurchaseModalVisible(false);
    setSelectedService(null);
    setSelectedSlot(null);
    setQuantity('1');
    setStudentSlots([]);
  };

  const handleCreateOrder = async () => {
    if (!selectedService || !selectedSlot) {
      Alert.alert('Lỗi', 'Vui lòng chọn slot học');
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Lỗi', 'Số lượng phải lớn hơn 0');
      return;
    }

    try {
      setCreatingOrder(true);
      const order = await orderService.createOrder({
        studentSlotId: selectedSlot.id,
        items: [
          {
            serviceId: selectedService.serviceId,
            quantity: qty,
          },
        ],
      });

      // Save order info and show payment modal
      setCreatedOrderId(order.id);
      setOrderTotalAmount(order.totalAmount);
      handleClosePurchaseModal();
      setPaymentModalVisible(true);
    } catch (err: any) {
      const errorMessage = err?.message || 'Không thể tạo đơn hàng';
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setCreatingOrder(false);
    }
  };

  const calculateTotal = () => {
    if (!selectedService) return 0;
    const qty = parseInt(quantity, 10) || 0;
    return selectedService.effectivePrice * qty;
  };

  const handleClosePaymentModal = () => {
    setPaymentModalVisible(false);
    setCreatedOrderId(null);
    setOrderTotalAmount(0);
    setWalletType('Parent');
    fetchAddOns(); // Refresh list
  };

  const handlePayOrder = async () => {
    if (!createdOrderId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin đơn hàng');
      return;
    }

    try {
      setPaying(true);
      const paymentResult = await orderService.payOrderByWallet({
        orderId: createdOrderId,
        walletType: walletType,
      });

      Alert.alert(
        'Thanh toán thành công',
        `Đã thanh toán: ${formatCurrency(paymentResult.paidAmount)}\nSố dư còn lại: ${formatCurrency(paymentResult.remainingBalance)}\n${paymentResult.message || ''}`,
        [
          {
            text: 'OK',
            onPress: () => {
              handleClosePaymentModal();
            },
          },
        ]
      );
    } catch (err: any) {
      const errorMessage = err?.message || 'Không thể thanh toán đơn hàng';
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setPaying(false);
    }
  };

  if (loading && addOns.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Đang tải danh sách dịch vụ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && addOns.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={48} color={COLORS.ERROR} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchAddOns}
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
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Dịch vụ bổ sung</Text>
          <Text style={styles.headerSubtitle}>
            Bánh kẹo, đồ ăn và các dịch vụ khác
          </Text>
        </View>

        {/* Student Selector (ẩn khi đi từ flow book lịch) */}
        {!hideStudentSelector && students.length > 0 && (
          <View style={styles.studentSelectorContainer}>
            <Text style={styles.studentSelectorLabel}>
              Chọn học sinh ({students.length}):
            </Text>
            <View style={styles.studentSelectorWrapper}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={true}
                style={styles.studentSelectorScroll}
                contentContainerStyle={styles.studentSelectorContent}
                nestedScrollEnabled={true}
                bounces={false}
              >
                {students.map((student) => (
                  <TouchableOpacity
                    key={student.id}
                    style={[
                      styles.studentSelectorButton,
                      selectedStudentId === student.id && styles.studentSelectorButtonActive,
                    ]}
                    onPress={() => setSelectedStudentId(student.id)}
                  >
                    <Text
                      style={[
                        styles.studentSelectorText,
                        selectedStudentId === student.id && styles.studentSelectorTextActive,
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {student.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Add-ons List */}
        {addOns.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="restaurant" size={64} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.emptyText}>Chưa có dịch vụ nào</Text>
            <Text style={styles.emptySubtext}>
              Các dịch vụ bổ sung sẽ được hiển thị tại đây
            </Text>
          </View>
        ) : (
          <View style={styles.addOnsList}>
            {addOns.map((addOn) => (
              <View key={addOn.serviceId} style={styles.addOnCard}>
                <View style={styles.addOnHeader}>
                  <View style={styles.addOnIconContainer}>
                    {addOn.image ? (
                      <Image 
                        source={{ uri: addOn.image }} 
                        style={styles.addOnImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <MaterialIcons name="restaurant" size={32} color={COLORS.PRIMARY} />
                    )}
                  </View>
                  <View style={styles.addOnInfo}>
                    <Text style={styles.addOnName}>{addOn.name}</Text>
                    <Text style={styles.addOnType}>{addOn.serviceType}</Text>
                  </View>
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Giá</Text>
                    <Text style={styles.priceValue}>
                      {formatCurrency(addOn.effectivePrice)}
                    </Text>
                  </View>
                </View>

                <View style={styles.addOnFooter}>
                  <View style={styles.statusBadge}>
                    <View style={[styles.statusDot, { backgroundColor: addOn.isActive ? COLORS.SUCCESS : COLORS.TEXT_SECONDARY }]} />
                    <Text style={styles.statusText}>
                      {addOn.isActive ? 'Đang bán' : 'Tạm ngưng'}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.purchaseButton, !addOn.isActive && styles.purchaseButtonDisabled]}
                    onPress={() => handlePurchase(addOn)}
                    disabled={!addOn.isActive}
                  >
                    <MaterialIcons name="shopping-cart" size={20} color={COLORS.SURFACE} />
                    <Text style={styles.purchaseButtonText}>Mua ngay</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Purchase Modal */}
      <Modal
        visible={purchaseModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClosePurchaseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mua dịch vụ</Text>
              <TouchableOpacity onPress={handleClosePurchaseModal}>
                <MaterialIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Service Info */}
              {selectedService && (
                <View style={styles.serviceInfoCard}>
                  <View style={styles.serviceInfoHeader}>
                    <MaterialIcons name="restaurant" size={24} color={COLORS.PRIMARY} />
                    <Text style={styles.serviceInfoName}>{selectedService.name}</Text>
                  </View>
                  <Text style={styles.serviceInfoPrice}>
                    {formatCurrency(selectedService.effectivePrice)} / đơn vị
                  </Text>
                </View>
              )}

              {/* Select Student Slot */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Chọn slot học *</Text>
                {loadingSlots ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                    <Text style={styles.loadingTextSmall}>Đang tải danh sách slot...</Text>
                  </View>
                ) : studentSlots.length === 0 ? (
                  <View style={styles.emptySlotsContainer}>
                    <MaterialIcons name="event-busy" size={32} color={COLORS.TEXT_SECONDARY} />
                    <Text style={styles.emptySlotsText}>Không có slot nào đã đặt</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.slotsList} nestedScrollEnabled>
                    {studentSlots.map((slot) => (
                      <TouchableOpacity
                        key={slot.id}
                        style={[
                          styles.slotCard,
                          selectedSlot?.id === slot.id && styles.slotCardSelected,
                        ]}
                        onPress={() => setSelectedSlot(slot)}
                      >
                        <View style={styles.slotCardContent}>
                          <View style={styles.slotCardHeader}>
                            <MaterialIcons
                              name={selectedSlot?.id === slot.id ? 'radio-button-checked' : 'radio-button-unchecked'}
                              size={20}
                              color={selectedSlot?.id === slot.id ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY}
                            />
                            <Text style={styles.slotStudentName}>{slot.studentName}</Text>
                          </View>
                          <Text style={styles.slotDate}>{formatDate(slot.date)}</Text>
                          {slot.timeframe && (
                            <Text style={styles.slotTime}>
                              {slot.timeframe.name}: {formatTime(slot.timeframe.startTime)} - {formatTime(slot.timeframe.endTime)}
                            </Text>
                          )}
                          {slot.room && (
                            <Text style={styles.slotRoom}>Phòng: {slot.room.roomName}</Text>
                          )}
                          {slot.branchSlot?.branchName && (
                            <Text style={styles.slotBranch}>Chi nhánh: {slot.branchSlot.branchName}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Quantity Input */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Số lượng *</Text>
                <TextInput
                  style={styles.quantityInput}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  placeholder="Nhập số lượng"
                  placeholderTextColor={COLORS.TEXT_SECONDARY}
                />
              </View>

              {/* Total Preview */}
              <View style={styles.totalPreview}>
                <Text style={styles.totalLabel}>Tổng tiền:</Text>
                <Text style={styles.totalValue}>{formatCurrency(calculateTotal())}</Text>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={handleClosePurchaseModal}
                disabled={creatingOrder}
              >
                <Text style={styles.modalButtonCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonConfirm,
                  (!selectedSlot || creatingOrder) && styles.modalButtonDisabled,
                ]}
                onPress={handleCreateOrder}
                disabled={!selectedSlot || creatingOrder}
              >
                {creatingOrder ? (
                  <ActivityIndicator size="small" color={COLORS.SURFACE} />
                ) : (
                  <>
                    <MaterialIcons name="check" size={20} color={COLORS.SURFACE} />
                    <Text style={styles.modalButtonText}>Tạo đơn</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Payment Modal */}
      <Modal
        visible={paymentModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClosePaymentModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thanh toán đơn hàng</Text>
              <TouchableOpacity onPress={handleClosePaymentModal}>
                <MaterialIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Order Info */}
              <View style={styles.orderInfoCard}>
                <View style={styles.orderInfoHeader}>
                  <MaterialIcons name="receipt" size={24} color={COLORS.PRIMARY} />
                  <Text style={styles.orderInfoTitle}>Thông tin đơn hàng</Text>
                </View>
                <View style={styles.orderInfoRow}>
                  <Text style={styles.orderInfoLabel}>Mã đơn:</Text>
                  <Text style={styles.orderInfoValue}>{createdOrderId?.substring(0, 8)}...</Text>
                </View>
                <View style={styles.orderInfoRow}>
                  <Text style={styles.orderInfoLabel}>Tổng tiền:</Text>
                  <Text style={styles.orderInfoAmount}>{formatCurrency(orderTotalAmount)}</Text>
                </View>
              </View>

              {/* Select Wallet Type */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Chọn ví thanh toán *</Text>
                <Text style={styles.sectionSubtitle}>
                  Chọn ví để trừ tiền thanh toán đơn hàng
                </Text>
                
                <View style={styles.walletTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.walletTypeCard,
                      walletType === 'Parent' && styles.walletTypeCardSelected,
                    ]}
                    onPress={() => setWalletType('Parent')}
                  >
                    <View style={styles.walletTypeHeader}>
                      <MaterialIcons
                        name={walletType === 'Parent' ? 'radio-button-checked' : 'radio-button-unchecked'}
                        size={20}
                        color={walletType === 'Parent' ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY}
                      />
                      <Text style={[
                        styles.walletTypeName,
                        walletType === 'Parent' && styles.walletTypeNameSelected,
                      ]}>
                        Ví phụ huynh
                      </Text>
                    </View>
                    <Text style={styles.walletTypeDescription}>
                      Phụ huynh mua cho con
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Payment Summary */}
              <View style={styles.paymentSummary}>
                <View style={styles.paymentSummaryRow}>
                  <Text style={styles.paymentSummaryLabel}>Số tiền thanh toán:</Text>
                  <Text style={styles.paymentSummaryValue}>{formatCurrency(orderTotalAmount)}</Text>
                </View>
                <View style={styles.paymentSummaryDivider} />
                <View style={styles.paymentSummaryRow}>
                  <Text style={styles.paymentSummaryLabel}>Ví thanh toán:</Text>
                  <Text style={styles.paymentSummaryValue}>
                    {walletType === 'Parent' ? 'Ví phụ huynh' : 'Ví học sinh'}
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={handleClosePaymentModal}
                disabled={paying}
              >
                <Text style={styles.modalButtonCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonConfirm,
                  paying && styles.modalButtonDisabled,
                ]}
                onPress={handlePayOrder}
                disabled={paying}
              >
                {paying ? (
                  <ActivityIndicator size="small" color={COLORS.SURFACE} />
                ) : (
                  <>
                    <MaterialIcons name="payment" size={20} color={COLORS.SURFACE} />
                    <Text style={styles.modalButtonText}>Thanh toán</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  addOnsList: {
    gap: SPACING.MD,
  },
  addOnCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.MD,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addOnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  addOnIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.PRIMARY_LIGHT + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
    overflow: 'hidden',
  },
  addOnImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  studentSelectorContainer: {
    marginBottom: SPACING.LG,
  },
  studentSelectorLabel: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  studentSelectorWrapper: {
    height: 50,
    width: '100%',
  },
  studentSelectorScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  studentSelectorContent: {
    paddingRight: SPACING.MD,
    paddingLeft: SPACING.XS,
    alignItems: 'center',
    flexDirection: 'row',
  },
  studentSelectorButton: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 20,
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginRight: SPACING.SM,
  },
  studentSelectorButtonActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  studentSelectorText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  studentSelectorTextActive: {
    color: COLORS.SURFACE,
    fontWeight: '600',
  },
  addOnInfo: {
    flex: 1,
  },
  addOnName: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  addOnType: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  priceValue: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.SECONDARY,
  },
  addOnFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.XS,
  },
  statusText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderRadius: 8,
    gap: SPACING.XS,
  },
  purchaseButtonDisabled: {
    backgroundColor: COLORS.TEXT_SECONDARY,
    opacity: 0.5,
  },
  purchaseButtonText: {
    color: COLORS.SURFACE,
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
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
  // Payment Modal Styles
  orderInfoCard: {
    backgroundColor: COLORS.PRIMARY_LIGHT + '10',
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
  },
  orderInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  orderInfoTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  orderInfoLabel: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  orderInfoValue: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  orderInfoAmount: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.SECONDARY,
  },
  sectionSubtitle: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.MD,
  },
  walletTypeContainer: {
    gap: SPACING.SM,
  },
  walletTypeCard: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    padding: SPACING.MD,
    borderWidth: 2,
    borderColor: COLORS.BORDER,
  },
  walletTypeCardSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY_LIGHT + '10',
  },
  walletTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS,
  },
  walletTypeName: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
  },
  walletTypeNameSelected: {
    color: COLORS.PRIMARY,
  },
  walletTypeDescription: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.XL,
  },
  paymentSummary: {
    backgroundColor: COLORS.PRIMARY_LIGHT + '10',
    borderRadius: 12,
    padding: SPACING.MD,
    marginTop: SPACING.MD,
  },
  paymentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  paymentSummaryLabel: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  paymentSummaryValue: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  paymentSummaryDivider: {
    height: 1,
    backgroundColor: COLORS.BORDER,
    marginVertical: SPACING.SM,
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
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.MD,
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
  serviceInfoCard: {
    backgroundColor: COLORS.PRIMARY_LIGHT + '10',
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
  },
  serviceInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  serviceInfoName: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
  },
  serviceInfoPrice: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.SECONDARY,
    fontWeight: '600',
  },
  section: {
    marginBottom: SPACING.LG,
  },
  sectionTitle: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.MD,
    justifyContent: 'center',
  },
  loadingTextSmall: {
    marginLeft: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  emptySlotsContainer: {
    alignItems: 'center',
    padding: SPACING.LG,
  },
  emptySlotsText: {
    marginTop: SPACING.SM,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  selectedSlotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SUCCESS_BG,
    borderRadius: 12,
    padding: SPACING.SM,
    marginBottom: SPACING.SM,
  },
  selectedSlotInfoText: {
    marginLeft: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  slotsList: {
    maxHeight: 200,
  },
  slotCard: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    borderWidth: 2,
    borderColor: COLORS.BORDER,
  },
  slotCardSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY_LIGHT + '10',
  },
  slotCardContent: {
    flex: 1,
  },
  slotCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  slotStudentName: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
  },
  slotDate: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  slotTime: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  slotRoom: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  slotBranch: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  quantityInput: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 8,
    padding: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  totalPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY_LIGHT + '10',
    borderRadius: 12,
    padding: SPACING.MD,
    marginTop: SPACING.MD,
  },
  totalLabel: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  totalValue: {
    fontSize: FONTS.SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.SECONDARY,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    gap: SPACING.SM,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.MD,
    borderRadius: 8,
    gap: SPACING.XS,
  },
  modalButtonCancel: {
    backgroundColor: COLORS.BACKGROUND,
  },
  modalButtonCancelText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  modalButtonConfirm: {
    backgroundColor: COLORS.PRIMARY,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
});

export default ServicesScreen;
