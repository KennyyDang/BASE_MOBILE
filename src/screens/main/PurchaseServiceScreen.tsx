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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import serviceService from '../../services/serviceService';
import studentSlotService from '../../services/studentSlotService';
import orderService from '../../services/orderService';
import { AddOnService, StudentSlotResponse, WalletType } from '../../types/api';
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

type PurchaseServiceNavigationProp = StackNavigationProp<RootStackParamList, 'PurchaseService'>;
type PurchaseServiceRouteProp = RouteProp<RootStackParamList, 'PurchaseService'>;

const PurchaseServiceScreen: React.FC = () => {
  const navigation = useNavigation<PurchaseServiceNavigationProp>();
  const route = useRoute<PurchaseServiceRouteProp>();
  const { studentSlotId, studentId } = route.params;

  const [addOns, setAddOns] = useState<AddOnService[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<StudentSlotResponse | null>(null);
  const [loadingSlot, setLoadingSlot] = useState(false);

  // Purchase modal states
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<AddOnService | null>(null);
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

  // Fetch slot details
  const fetchSlotDetails = useCallback(async () => {
    if (!studentSlotId || !studentId) {
      return;
    }

    try {
      setLoadingSlot(true);
      const response = await studentSlotService.getStudentSlots({
        studentId,
        pageIndex: 1,
        pageSize: 100,
        status: 'Booked',
      });
      const slot = response.items.find(s => s.id === studentSlotId);
      if (slot) {
        setSelectedSlot(slot);
      }
    } catch (err: any) {
      // Don't spam console with 401 authentication errors
      const statusCode = err?.response?.status || err?.response?.statusCode;
      if (statusCode !== 401) {
        console.warn('Failed to fetch slot details:', err);
      }
    } finally {
      setLoadingSlot(false);
    }
  }, [studentSlotId, studentId]);

  // Fetch add-ons
  const fetchAddOns = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError(null);
      const data = await serviceService.getStudentAddOns(studentId);
      const activeAddOns = data.filter(addOn => addOn.isActive);
      setAddOns(activeAddOns);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Không thể tải danh sách dịch vụ';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (studentId) {
      setLoading(true);
      fetchAddOns();
      fetchSlotDetails();
    }
  }, [studentId, fetchAddOns, fetchSlotDetails]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAddOns();
  }, [fetchAddOns]);

  const handlePurchase = (addOn: AddOnService) => {
    if (!selectedSlot) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin slot học');
      return;
    }
    setSelectedService(addOn);
    setQuantity('1');
    setPurchaseModalVisible(true);
  };

  const handleClosePurchaseModal = () => {
    setPurchaseModalVisible(false);
    setSelectedService(null);
    setQuantity('1');
  };

  const calculateTotal = () => {
    if (!selectedService) return 0;
    const qty = parseInt(quantity, 10) || 0;
    return selectedService.effectivePrice * qty;
  };

  const handleCreateOrder = async () => {
    if (!selectedService || !selectedSlot) {
      Alert.alert('Lỗi', 'Vui lòng chọn dịch vụ');
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
              navigation.goBack();
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
          <Text style={styles.headerTitle}>Mua dịch vụ bổ sung</Text>
          <Text style={styles.headerSubtitle}>
            Chọn dịch vụ cho lớp học đã đặt
          </Text>
        </View>

        {/* Slot Info */}
        {loadingSlot ? (
          <View style={styles.slotInfoCard}>
            <ActivityIndicator size="small" color={COLORS.PRIMARY} />
            <Text style={styles.loadingTextSmall}>Đang tải thông tin lớp học...</Text>
          </View>
        ) : selectedSlot ? (
          <View style={styles.slotInfoCard}>
            <View style={styles.slotInfoHeader}>
              <MaterialIcons name="event-available" size={24} color={COLORS.PRIMARY} />
              <Text style={styles.slotInfoTitle}>Lớp học đã chọn</Text>
            </View>
            <Text style={styles.slotInfoText}>{formatDate(selectedSlot.date)}</Text>
            {selectedSlot.timeframe && (
              <Text style={styles.slotInfoText}>
                {selectedSlot.timeframe.name}: {formatTime(selectedSlot.timeframe.startTime)} - {formatTime(selectedSlot.timeframe.endTime)}
              </Text>
            )}
            {selectedSlot.room?.roomName && (
              <Text style={styles.slotInfoText}>Phòng: {selectedSlot.room.roomName}</Text>
            )}
            {selectedSlot.branchSlot?.branchName && (
              <Text style={styles.slotInfoText}>Chi nhánh: {selectedSlot.branchSlot.branchName}</Text>
            )}
          </View>
        ) : null}

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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mua dịch vụ</Text>
              <TouchableOpacity onPress={handleClosePurchaseModal}>
                <MaterialIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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

              {selectedSlot && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Lớp học</Text>
                  <View style={styles.selectedSlotInfo}>
                    <MaterialIcons name="check-circle" size={20} color={COLORS.PRIMARY} />
                    <Text style={styles.selectedSlotInfoText}>
                      {formatDate(selectedSlot.date)}
                      {selectedSlot.timeframe && ` • ${formatTime(selectedSlot.timeframe.startTime)} - ${formatTime(selectedSlot.timeframe.endTime)}`}
                    </Text>
                  </View>
                </View>
              )}

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

              <View style={styles.totalPreview}>
                <Text style={styles.totalLabel}>Tổng tiền:</Text>
                <Text style={styles.totalValue}>{formatCurrency(calculateTotal())}</Text>
              </View>
            </ScrollView>

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
                  creatingOrder && styles.modalButtonDisabled,
                ]}
                onPress={handleCreateOrder}
                disabled={creatingOrder}
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thanh toán đơn hàng</Text>
              <TouchableOpacity onPress={handleClosePaymentModal}>
                <MaterialIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Chọn ví thanh toán *</Text>
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

                  <TouchableOpacity
                    style={[
                      styles.walletTypeCard,
                      walletType === 'Student' && styles.walletTypeCardSelected,
                    ]}
                    onPress={() => setWalletType('Student')}
                  >
                    <View style={styles.walletTypeHeader}>
                      <MaterialIcons
                        name={walletType === 'Student' ? 'radio-button-checked' : 'radio-button-unchecked'}
                        size={20}
                        color={walletType === 'Student' ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY}
                      />
                      <Text style={[
                        styles.walletTypeName,
                        walletType === 'Student' && styles.walletTypeNameSelected,
                      ]}>
                        Ví học sinh
                      </Text>
                    </View>
                    <Text style={styles.walletTypeDescription}>
                      Học sinh tự mua trong slot
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

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
  loadingTextSmall: {
    marginLeft: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
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
  slotInfoCard: {
    backgroundColor: COLORS.SUCCESS_BG,
    borderRadius: 16,
    padding: SPACING.MD,
    marginBottom: SPACING.LG,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY_LIGHT,
  },
  slotInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  slotInfoTitle: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '700',
    color: COLORS.PRIMARY,
    marginLeft: SPACING.SM,
  },
  slotInfoText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.XS,
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
  selectedSlotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SUCCESS_BG,
    borderRadius: 12,
    padding: SPACING.SM,
  },
  selectedSlotInfoText: {
    marginLeft: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.SURFACE,
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
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  totalValue: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.SECONDARY,
  },
  modalFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    padding: SPACING.MD,
    gap: SPACING.SM,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.MD,
    borderRadius: 12,
    gap: SPACING.XS,
  },
  modalButtonCancel: {
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
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
});

export default PurchaseServiceScreen;

