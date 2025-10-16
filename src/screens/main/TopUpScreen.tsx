import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { usePayOSPayment } from '../../hooks/usePayOSPayment';
import { PayOSPaymentRequest } from '../../services/payOSService';

// Inline constants
const COLORS = {
  PRIMARY: '#2E7D32',
  PRIMARY_LIGHT: '#4CAF50',
  SECONDARY: '#FF6F00',
  BACKGROUND: '#F5F5F5',
  SURFACE: '#FFFFFF',
  TEXT_PRIMARY: '#212121',
  TEXT_SECONDARY: '#757575',
  BORDER: '#E0E0E0',
  SUCCESS: '#4CAF50',
  WARNING: '#FF9800',
  ERROR: '#F44336',
  ACCENT: '#2196F3',
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

// Predefined amounts
const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000];

const TopUpScreen: React.FC = () => {
  const { user } = useAuth();
  const { 
    loading, 
    error, 
    paymentUrl, 
    qrCode, 
    currentPayment, 
    createPayment, 
    checkPaymentStatus, 
    cancelPayment, 
    clearPayment 
  } = usePayOSPayment();

  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedWallet, setSelectedWallet] = useState<'MAIN' | 'ALLOWANCE'>('MAIN');
  const [modalVisible, setModalVisible] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'checking'>('idle');

  // Mock wallet balances
  const [walletBalances, setWalletBalances] = useState({
    MAIN: 250000,
    ALLOWANCE: 50000,
  });

  useEffect(() => {
    if (currentPayment) {
      setModalVisible(true);
      setPaymentStatus('pending');
    }
  }, [currentPayment]);

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
      const paymentData: PayOSPaymentRequest = {
        amount: selectedAmount,
        description: `Nạp tiền vào ví ${selectedWallet === 'MAIN' ? 'chính' : 'tiêu vặt'}`,
        walletType: selectedWallet,
        returnUrl: 'baseapp://payment/success',
        cancelUrl: 'baseapp://payment/cancel',
      };

      await createPayment(paymentData);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể tạo giao dịch thanh toán');
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
    if (currentPayment?.paymentId) {
      try {
        setPaymentStatus('checking');
        const status = await checkPaymentStatus(currentPayment.paymentId);
        
        if (status.status === 'PAID') {
          Alert.alert(
            'Thành công',
            'Giao dịch đã được thanh toán thành công!',
            [
              {
                text: 'OK',
                onPress: () => {
                  setModalVisible(false);
                  clearPayment();
                  setSelectedAmount(0);
                  setCustomAmount('');
                  // Update wallet balance (mock)
                  setWalletBalances(prev => ({
                    ...prev,
                    [selectedWallet]: prev[selectedWallet] + selectedAmount,
                  }));
                },
              },
            ]
          );
        } else if (status.status === 'CANCELLED' || status.status === 'EXPIRED') {
          Alert.alert('Thông báo', 'Giao dịch đã bị hủy hoặc hết hạn');
          setModalVisible(false);
          clearPayment();
        } else {
          Alert.alert('Thông báo', 'Giao dịch chưa được thanh toán');
        }
      } catch (err: any) {
        Alert.alert('Lỗi', err.message || 'Không thể kiểm tra trạng thái thanh toán');
      } finally {
        setPaymentStatus('pending');
      }
    }
  };

  const handleCancelPayment = async () => {
    if (currentPayment?.paymentId) {
      Alert.alert(
        'Hủy giao dịch',
        'Bạn có chắc chắn muốn hủy giao dịch này?',
        [
          { text: 'Không', style: 'cancel' },
          {
            text: 'Có',
            style: 'destructive',
            onPress: async () => {
              try {
                await cancelPayment(currentPayment.paymentId);
                setModalVisible(false);
                clearPayment();
              } catch (err: any) {
                Alert.alert('Lỗi', err.message || 'Không thể hủy giao dịch');
              }
            },
          },
        ]
      );
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => {}} />
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
          
          <View style={styles.walletOptions}>
            <TouchableOpacity
              style={[
                styles.walletOption,
                selectedWallet === 'MAIN' && styles.walletOptionSelected,
              ]}
              onPress={() => setSelectedWallet('MAIN')}
            >
              <MaterialIcons 
                name="account-balance-wallet" 
                size={24} 
                color={selectedWallet === 'MAIN' ? COLORS.SURFACE : COLORS.PRIMARY} 
              />
              <Text style={[
                styles.walletOptionText,
                selectedWallet === 'MAIN' && styles.walletOptionTextSelected,
              ]}>
                Ví chính
              </Text>
              <Text style={[
                styles.walletBalance,
                selectedWallet === 'MAIN' && styles.walletBalanceSelected,
              ]}>
                {formatCurrency(walletBalances.MAIN)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.walletOption,
                selectedWallet === 'ALLOWANCE' && styles.walletOptionSelected,
              ]}
              onPress={() => setSelectedWallet('ALLOWANCE')}
            >
              <MaterialIcons 
                name="child-care" 
                size={24} 
                color={selectedWallet === 'ALLOWANCE' ? COLORS.SURFACE : COLORS.SECONDARY} 
              />
              <Text style={[
                styles.walletOptionText,
                selectedWallet === 'ALLOWANCE' && styles.walletOptionTextSelected,
              ]}>
                Ví tiêu vặt
              </Text>
              <Text style={[
                styles.walletBalance,
                selectedWallet === 'ALLOWANCE' && styles.walletBalanceSelected,
              ]}>
                {formatCurrency(walletBalances.ALLOWANCE)}
              </Text>
            </TouchableOpacity>
          </View>
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
                      onPress: (text) => {
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
          disabled={selectedAmount <= 0 || loading}
        >
          <MaterialIcons name="payment" size={24} color={COLORS.SURFACE} />
          <Text style={styles.topUpButtonText}>
            {loading ? 'Đang tạo giao dịch...' : 'Nạp tiền'}
          </Text>
        </TouchableOpacity>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error" size={20} color={COLORS.ERROR} />
            <Text style={styles.errorText}>{error}</Text>
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
    backgroundColor: COLORS.PRIMARY,
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
});

export default TopUpScreen;
