import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  Linking,
  RefreshControl,
  ActivityIndicator,
  AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { usePayOSPayment } from '../../hooks/usePayOSPayment';
import { useCurrentUserWallet } from '../../hooks/useWalletApi';
import payOSService from '../../services/payOSService';
import { DepositCreateResponse } from '../../types/api';
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

// Predefined amounts
const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000];

const TopUpScreen: React.FC = () => {
  const {
    loading: paymentLoading,
    error: paymentError,
    paymentUrl,
    qrCode,
    currentPayment,
    checkPaymentStatus,
    cancelPayment,
    clearPayment,
  } = usePayOSPayment();

  const {
    data: walletData,
    loading: walletLoading,
    error: walletError,
    refetch: refetchWallet,
  } = useCurrentUserWallet();

  const normalizedWalletType = React.useMemo<'MAIN' | 'ALLOWANCE'>(() => {
    const type = walletData?.type?.toUpperCase();
    if (type === 'ALLOWANCE') {
      return 'ALLOWANCE';
    }
    return 'MAIN';
  }, [walletData]);

  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedWallet, setSelectedWallet] = useState<'MAIN' | 'ALLOWANCE'>('MAIN');
  const [modalVisible, setModalVisible] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'checking'>('idle');
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [lastDepositInfo, setLastDepositInfo] = useState<DepositCreateResponse | null>(null);
  const appState = useRef(AppState.currentState);
  const hasPendingDeposit = lastDepositInfo !== null;

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Confirm payment by calling webhook
  const handleConfirmPayment = React.useCallback(async () => {
    if (!lastDepositInfo) {
      Alert.alert('Thông báo', 'Không tìm thấy giao dịch nào để kiểm tra. Vui lòng nạp lại.');
      setPaymentInProgress(false);
      setPaymentStatus('idle');
      setLastDepositInfo(null);
      return;
    }

    try {
      setPaymentStatus('checking');

      const result = await payOSService.confirmDeposit();

      const normalizedStatus = typeof result?.status === 'string' ? result.status.toUpperCase() : '';
      const normalizedPaymentStatus =
        typeof result?.paymentStatus === 'string' ? result.paymentStatus.toUpperCase() : '';
      const isSuccess =
        normalizedStatus === 'PAID' ||
        normalizedStatus === 'COMPLETED' ||
        normalizedPaymentStatus === 'PAID' ||
        normalizedPaymentStatus === 'COMPLETED' ||
        result?.success === true;

      if (isSuccess) {
        await refetchWallet();
        setPaymentInProgress(false);
        setLastDepositInfo(null);
        Alert.alert('Thành công', result?.message || 'Thanh toán đã được cập nhật vào ví!', [{ text: 'OK' }]);
        return;
      }

      if (normalizedStatus === 'CANCELLED') {
        setPaymentInProgress(false);
        setLastDepositInfo(null);
        Alert.alert('Đã hủy', result?.message || 'Giao dịch đã bị hủy. Vui lòng thử lại nếu cần.');
        return;
      }

      if (normalizedStatus === 'PENDING' || normalizedPaymentStatus === 'PENDING') {
        setPaymentInProgress(false);
        Alert.alert('Thông báo', result?.message || 'Giao dịch chưa hoàn tất, vui lòng kiểm tra lại sau.');
      } else if (result?.message) {
        setPaymentInProgress(false);
        Alert.alert('Thông báo', result.message);
      } else {
        setPaymentInProgress(false);
        Alert.alert('Thông báo', 'Giao dịch chưa hoàn tất, vui lòng kiểm tra lại sau.');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Không thể xác nhận thanh toán';
      setPaymentInProgress(false);
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setPaymentStatus('idle');
    }
  }, [lastDepositInfo, refetchWallet]);

  // Initialize selected wallet based on API data
  useEffect(() => {
    setSelectedWallet(normalizedWalletType);
  }, [normalizedWalletType]);

  // Handle deep link from PayOS return URL (simplified - parse manually)
  useEffect(() => {
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl?.includes('baseapp://payment/cancel')) {
        setPaymentInProgress(false);
        setPaymentStatus('idle');
        Alert.alert('Hủy thanh toán', 'Bạn đã hủy giao dịch thanh toán');
      } else if (initialUrl?.includes('baseapp://payment/success')) {
        setTimeout(() => handleConfirmPayment(), 500);
      }
    };

    handleInitialURL();

    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('baseapp://payment/cancel')) {
        setPaymentInProgress(false);
        setPaymentStatus('idle');
        Alert.alert('Hủy thanh toán', 'Bạn đã hủy giao dịch thanh toán');
      } else if (url.includes('baseapp://payment/success')) {
        setTimeout(() => handleConfirmPayment(), 500);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [handleConfirmPayment]);

  // Handle app state changes (when user returns from browser)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        paymentInProgress
      ) {
        const timer = setTimeout(() => {
          handleConfirmPayment();
        }, 1500);

        return () => clearTimeout(timer);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [paymentInProgress, handleConfirmPayment]);

  // Check for pending deposit when screen is focused - Auto confirm after returning from payment
  useFocusEffect(
    React.useCallback(() => {
      if (paymentInProgress) {
        const timer = setTimeout(() => {
          handleConfirmPayment();
        }, 1000);
        return () => clearTimeout(timer);
      }
      return undefined;
    }, [paymentInProgress, handleConfirmPayment])
  );

  useEffect(() => {
    if (currentPayment) {
      setModalVisible(true);
      setPaymentStatus('pending');
      setPaymentInProgress(true);
    }
  }, [currentPayment]);

  // Determine wallet type for API
  const getWalletTypeForAPI = (type: string): 'MAIN' | 'ALLOWANCE' => {
    if (type === 'ALLOWANCE') return 'ALLOWANCE';
    return 'MAIN';
  };

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmount = (amount: string) => {
    setCustomAmount(amount);
    const numAmount = parseInt(amount) || 0;
    setSelectedAmount(numAmount);
  };

  const handleTopUp = async () => {
    if (selectedAmount <= 0) {
      Alert.alert('Lỗi', 'Vui lòng chọn số tiền nạp');
      return;
    }

    if (selectedAmount < 10000) {
      Alert.alert('Lỗi', 'Số tiền nạp tối thiểu là 10,000 VNĐ');
      return;
    }

    if (selectedAmount > 5000000) {
      Alert.alert('Lỗi', 'Số tiền nạp tối đa là 5,000,000 VNĐ');
      return;
    }

    try {
      setPaymentStatus('pending');

      const depositResponse: DepositCreateResponse = await payOSService.createDeposit({
        amount: selectedAmount,
      });

      if (depositResponse.checkoutUrl) {
        setPaymentInProgress(true);
        setLastDepositInfo(depositResponse);
        setPaymentStatus('pending');

        // Lưu checkoutUrl vào AsyncStorage để có thể lấy lại sau
        try {
          if (depositResponse.depositId) {
            await AsyncStorage.setItem(
              `deposit_${depositResponse.depositId}`,
              depositResponse.checkoutUrl
            );
          }
          // Cũng lưu với orderCode để dễ tìm
          if (depositResponse.orderCode) {
            await AsyncStorage.setItem(
              `deposit_order_${depositResponse.orderCode}`,
              depositResponse.checkoutUrl
            );
          }
        } catch (storageErr) {
          // Không block nếu lưu storage thất bại
          console.warn('Failed to save checkoutUrl to storage:', storageErr);
        }

        try {
          const supported = await Linking.canOpenURL(depositResponse.checkoutUrl);
          if (supported) {
            await Linking.openURL(depositResponse.checkoutUrl);
          } else {
            Alert.alert('Lỗi', 'Không thể mở trình duyệt thanh toán');
          }
        } catch (linkErr) {
          Alert.alert('Lỗi', 'Không thể mở liên kết thanh toán');
        }
      } else {
        Alert.alert('Lỗi', 'Không nhận được liên kết thanh toán từ server');
      }
    } catch (err: any) {
      setPaymentStatus('idle');
      const errorMessage = err.response?.data?.message || err.message || 'Không thể tạo giao dịch thanh toán';
      Alert.alert('Lỗi', errorMessage);
    }
  };

  const handleOpenPayment = async () => {
    if (paymentUrl) {
      try {
        const supported = await Linking.canOpenURL(paymentUrl);
        if (supported) {
          await Linking.openURL(paymentUrl);
        } else {
          Alert.alert('Lỗi', 'Không thể mở trình duyệt');
        }
      } catch (err) {
        Alert.alert('Lỗi', 'Không thể mở liên kết thanh toán');
      }
    }
  };

  const handleCheckPayment = async () => {
    await handleConfirmPayment();
  };

  const handleCancelPayment = () => {
    setModalVisible(false);
    setPaymentInProgress(false);
    setPaymentStatus('idle');
    clearPayment();
    setLastDepositInfo(null);
  };


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={walletLoading} onRefresh={refetchWallet} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Nạp tiền</Text>
          <Text style={styles.headerSubtitle}>
            Nạp tiền vào ví của bạn qua PayOS
          </Text>
        </View>

        {/* Wallet Selection */}
        <View style={styles.walletSection}>
          <Text style={styles.sectionTitle}>Chọn ví nạp tiền</Text>

          {walletLoading && !walletData ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
              <Text style={styles.loadingText}>Đang tải thông tin ví...</Text>
            </View>
          ) : walletData ? (
            <View style={styles.walletOptions}>
              <TouchableOpacity
                style={[
                  styles.walletOption,
                  selectedWallet === normalizedWalletType && styles.walletOptionSelected,
                  { width: '100%', marginHorizontal: 0 },
                ]}
                onPress={() => setSelectedWallet(normalizedWalletType)}
              >
                <MaterialIcons
                  name={normalizedWalletType === 'MAIN' ? 'account-balance-wallet' : 'child-care'}
                  size={24}
                  color={
                    selectedWallet === normalizedWalletType
                      ? COLORS.SURFACE
                      : normalizedWalletType === 'MAIN'
                      ? COLORS.PRIMARY
                      : COLORS.SECONDARY
                  }
                />
                <Text
                  style={[
                    styles.walletOptionText,
                    selectedWallet === normalizedWalletType && styles.walletOptionTextSelected,
                  ]}
                >
                  {normalizedWalletType === 'MAIN' ? 'Ví chính' : 'Ví tiêu vặt'}
                </Text>
                {walletLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      selectedWallet === normalizedWalletType ? COLORS.SURFACE : COLORS.PRIMARY
                    }
                    style={{ marginTop: SPACING.XS }}
                  />
                ) : (
                  <Text
                    style={[
                      styles.walletBalance,
                      selectedWallet === normalizedWalletType && styles.walletBalanceSelected,
                    ]}
                  >
                    {formatCurrency(walletData.balance)}
                  </Text>
                )}
                {walletData.studentName && normalizedWalletType === 'ALLOWANCE' && (
                  <Text
                    style={[
                      styles.walletStudentName,
                      selectedWallet === normalizedWalletType && styles.walletStudentNameSelected,
                    ]}
                  >
                    {walletData.studentName}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : walletError ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error" size={20} color={COLORS.ERROR} />
              <Text style={styles.errorText}>{walletError}</Text>
              <TouchableOpacity onPress={refetchWallet} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Amount Selection */}
        <View style={styles.amountSection}>
          <Text style={styles.sectionTitle}>Chọn số tiền</Text>

          {/* Quick Amounts */}
          <View style={styles.quickAmounts}>
            {QUICK_AMOUNTS.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.amountButton,
                  selectedAmount === amount && styles.amountButtonSelected,
                ]}
                onPress={() => handleAmountSelect(amount)}
              >
                <Text style={[
                  styles.amountButtonText,
                  selectedAmount === amount && styles.amountButtonTextSelected,
                ]}>
                  {formatCurrency(amount)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Amount */}
          <View style={styles.customAmountContainer}>
            <Text style={styles.customAmountLabel}>Hoặc nhập số tiền khác:</Text>
            <View style={styles.customAmountInput}>
              <Text style={styles.currencySymbol}>VNĐ</Text>
              <Text style={styles.customAmountText}>
                {customAmount ? formatCurrency(parseInt(customAmount) || 0) : '0 VNĐ'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.customAmountButton}
              onPress={() => {
                Alert.prompt(
                  'Nhập số tiền',
                  'Nhập số tiền bạn muốn nạp (VNĐ)',
                  [
                    { text: 'Hủy', style: 'cancel' },
                    {
                      text: 'OK',
                      onPress: (text: string | undefined) => {
                        if (text) {
                          handleCustomAmount(text);
                        }
                      },
                    },
                  ],
                  'plain-text',
                  customAmount
                );
              }}
            >
              <Text style={styles.customAmountButtonText}>Nhập số tiền</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Info */}
        {selectedAmount > 0 && (
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentInfoTitle}>Thông tin giao dịch</Text>
            <View style={styles.paymentInfoRow}>
              <Text style={styles.paymentInfoLabel}>Số tiền:</Text>
              <Text style={styles.paymentInfoValue}>{formatCurrency(selectedAmount)}</Text>
            </View>
            <View style={styles.paymentInfoRow}>
              <Text style={styles.paymentInfoLabel}>Ví đích:</Text>
              <Text style={styles.paymentInfoValue}>
                {selectedWallet === 'MAIN' ? 'Ví chính' : 'Ví tiêu vặt'}
              </Text>
            </View>
            <View style={styles.paymentInfoRow}>
              <Text style={styles.paymentInfoLabel}>Phương thức:</Text>
              <Text style={styles.paymentInfoValue}>PayOS</Text>
            </View>
          </View>
        )}

        {/* Top Up Button */}
        <TouchableOpacity
          style={[
            styles.topUpButton,
            selectedAmount <= 0 && styles.topUpButtonDisabled,
          ]}
          onPress={handleTopUp}
          disabled={selectedAmount <= 0 || paymentLoading || !walletData}
        >
          <MaterialIcons name="payment" size={24} color={COLORS.SURFACE} />
          <Text style={styles.topUpButtonText}>
            {paymentLoading ? 'Đang tạo giao dịch...' : 'Nạp tiền'}
          </Text>
        </TouchableOpacity>

        {hasPendingDeposit && (
          <TouchableOpacity
            style={[styles.topUpButton, styles.confirmButton]}
            onPress={handleConfirmPayment}
            disabled={paymentStatus === 'checking'}
          >
            <MaterialIcons name="check-circle" size={24} color={COLORS.SURFACE} />
            <Text style={styles.topUpButtonText}>
              {paymentStatus === 'checking' ? 'Đang kiểm tra...' : 'Kiểm tra cập nhật số dư'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Error Messages */}
        {paymentError && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error" size={20} color={COLORS.ERROR} />
            <Text style={styles.errorText}>{paymentError}</Text>
          </View>
        )}
        {walletError && !paymentError && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error" size={20} color={COLORS.ERROR} />
            <Text style={styles.errorText}>Lỗi tải thông tin ví: {walletError}</Text>
          </View>
        )}
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thanh toán PayOS</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.qrCodeContainer}>
                {qrCode ? (
                  <Text style={styles.qrCodeText}>QR Code: {qrCode}</Text>
                ) : (
                  <MaterialIcons name="qr-code" size={120} color={COLORS.TEXT_SECONDARY} />
                )}
              </View>

              <Text style={styles.modalDescription}>
                Quét mã QR hoặc click vào liên kết bên dưới để thanh toán
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleOpenPayment}
                >
                  <MaterialIcons name="open-in-browser" size={20} color={COLORS.SURFACE} />
                  <Text style={styles.modalButtonText}>Mở trình duyệt</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.checkButton]}
                  onPress={handleCheckPayment}
                  disabled={paymentStatus === 'checking'}
                >
                  <MaterialIcons name="refresh" size={20} color={COLORS.PRIMARY} />
                  <Text style={[styles.modalButtonText, { color: COLORS.PRIMARY }]}>
                    {paymentStatus === 'checking' ? 'Đang kiểm tra...' : 'Kiểm tra thanh toán'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleCancelPayment}
                >
                  <MaterialIcons name="cancel" size={20} color={COLORS.ERROR} />
                  <Text style={[styles.modalButtonText, { color: COLORS.ERROR }]}>Hủy giao dịch</Text>
                </TouchableOpacity>
              </View>
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
  scrollContent: {
    padding: SPACING.MD,
  },
  header: {
    marginBottom: SPACING.LG,
  },
  headerTitle: {
    fontSize: FONTS.SIZES.XXL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  headerSubtitle: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  walletSection: {
    marginBottom: SPACING.LG,
  },
  sectionTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  walletOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  walletOption: {
    flex: 1,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    alignItems: 'center',
    marginHorizontal: SPACING.XS,
    borderWidth: 2,
    borderColor: COLORS.BORDER,
  },
  walletOptionSelected: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  walletOptionText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.SM,
  },
  walletOptionTextSelected: {
    color: COLORS.SURFACE,
  },
  walletBalance: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS,
  },
  walletBalanceSelected: {
    color: COLORS.SURFACE,
  },
  amountSection: {
    marginBottom: SPACING.LG,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.MD,
  },
  amountButton: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    alignItems: 'center',
    width: '48%',
    marginBottom: SPACING.SM,
    borderWidth: 2,
    borderColor: COLORS.BORDER,
  },
  amountButtonSelected: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  amountButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  amountButtonTextSelected: {
    color: COLORS.SURFACE,
  },
  customAmountContainer: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
  },
  customAmountLabel: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  customAmountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 8,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  currencySymbol: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginRight: SPACING.SM,
  },
  customAmountText: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  customAmountButton: {
    backgroundColor: COLORS.ACCENT,
    borderRadius: 8,
    padding: SPACING.SM,
    alignItems: 'center',
  },
  customAmountButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  paymentInfo: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.LG,
  },
  paymentInfoTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  paymentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.SM,
  },
  paymentInfoLabel: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  paymentInfoValue: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  topUpButton: {
    backgroundColor: COLORS.ACCENT,
    borderRadius: 12,
    padding: SPACING.MD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topUpButtonDisabled: {
    backgroundColor: COLORS.TEXT_SECONDARY,
  },
  topUpButtonText: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.SURFACE,
    marginLeft: SPACING.SM,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: SPACING.MD,
    borderRadius: 8,
    marginTop: SPACING.MD,
  },
  errorText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.ERROR,
    marginLeft: SPACING.SM,
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: SPACING.XL,
  },
  loadingText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.MD,
  },
  walletStudentName: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS,
    fontStyle: 'italic',
  },
  walletStudentNameSelected: {
    color: COLORS.SURFACE,
  },
  retryButton: {
    marginTop: SPACING.SM,
    padding: SPACING.SM,
    backgroundColor: COLORS.ERROR,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.SURFACE,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.LG,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  modalTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  modalBody: {
    alignItems: 'center',
  },
  qrCodeContainer: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    padding: SPACING.LG,
    marginBottom: SPACING.MD,
    alignItems: 'center',
  },
  qrCodeText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.LG,
  },
  modalActions: {
    width: '100%',
  },
  modalButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
    padding: SPACING.MD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.SM,
  },
  checkButton: {
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  cancelButton: {
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.ERROR,
  },
  modalButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
    marginLeft: SPACING.SM,
  },
  confirmButton: {
    backgroundColor: COLORS.SUCCESS,
    borderRadius: 12,
    padding: SPACING.MD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: SPACING.MD,
  },
});

export default TopUpScreen;
