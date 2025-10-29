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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { usePayOSPayment } from '../../hooks/usePayOSPayment';
import { PayOSPaymentRequest } from '../../services/payOSService';
import { useCurrentUserWallet } from '../../hooks/useWalletApi';
import payOSService from '../../services/payOSService';
import { DepositCreateResponse } from '../../types/api';

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
    loading: paymentLoading, 
    error: paymentError, 
    paymentUrl, 
    qrCode, 
    currentPayment, 
    createPayment, 
    checkPaymentStatus, 
    cancelPayment, 
    clearPayment 
  } = usePayOSPayment();
  
  // Get wallet data from API
  const { data: walletData, loading: walletLoading, error: walletError, refetch: refetchWallet } = useCurrentUserWallet();

  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedWallet, setSelectedWallet] = useState<string>('MAIN');
  const [modalVisible, setModalVisible] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'checking'>('idle');
  
  // Store deposit info to call webhook later
  const [pendingDeposit, setPendingDeposit] = useState<{ orderCode: number; amount: number } | null>(null);
  const [showManualConfirm, setShowManualConfirm] = useState(false);
  const [manualOrderCode, setManualOrderCode] = useState<string>('');
  const [manualAmount, setManualAmount] = useState<string>('');
  const appState = useRef(AppState.currentState);

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Confirm payment by calling webhook
  const handleConfirmPayment = React.useCallback(async () => {
    if (!pendingDeposit) return;

    try {
      setPaymentStatus('checking');
      
      // Call webhook to confirm deposit
      await payOSService.confirmDepositWebhook(
        pendingDeposit.orderCode,
        pendingDeposit.amount,
        true // success = true
      );

      // Success - clear pending and refresh wallet
      const amount = pendingDeposit.amount;
      setPendingDeposit(null);
      await refetchWallet();

      Alert.alert(
        'Thành công',
        `Đã cộng ${formatCurrency(amount)} vào ví thành công!`,
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Không thể xác nhận thanh toán';
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setPaymentStatus('idle');
    }
  }, [pendingDeposit, refetchWallet]);

  // Initialize selected wallet based on API data
  useEffect(() => {
    if (walletData?.type) {
      const walletType = walletData.type.toUpperCase();
      if (walletType === 'MAIN' || walletType === 'ALLOWANCE') {
        setSelectedWallet(walletType);
      }
    }
  }, [walletData]);

  // Handle deep link from PayOS return URL (simplified - parse manually)
  useEffect(() => {
    const parseURL = (url: string) => {
      try {
        // Parse baseapp://payment/success?orderCode=123&amount=50000
        const urlObj = new URL(url.replace('baseapp://', 'https://'));
        const orderCode = urlObj.searchParams.get('orderCode');
        const amount = urlObj.searchParams.get('amount');
        return { orderCode, amount };
      } catch {
        // Fallback: manual parsing
        const match = url.match(/orderCode=(\d+)&amount=(\d+)/);
        if (match) {
          return { orderCode: match[1], amount: match[2] };
        }
        return null;
      }
    };

    const handleDeepLink = async () => {
      // Check if app was opened with a deep link
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl && initialUrl.includes('baseapp://payment/success')) {
        const params = parseURL(initialUrl);
        if (params?.orderCode && params?.amount && !pendingDeposit) {
          // Set pending deposit from deep link params
          setPendingDeposit({
            orderCode: Number(params.orderCode),
            amount: Number(params.amount),
          });
          // Automatically confirm payment after a short delay
          setTimeout(() => handleConfirmPayment(), 500);
        }
      }
    };

    handleDeepLink();

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url && url.includes('baseapp://payment/success')) {
        const params = parseURL(url);
        if (params?.orderCode && params?.amount) {
          // Set pending deposit from deep link params
          setPendingDeposit({
            orderCode: Number(params.orderCode),
            amount: Number(params.amount),
          });
          // Automatically confirm payment after a short delay
          setTimeout(() => handleConfirmPayment(), 500);
        }
      } else if (url && url.includes('baseapp://payment/cancel')) {
        // User cancelled payment
        setPendingDeposit(null);
        Alert.alert('Hủy thanh toán', 'Bạn đã hủy giao dịch thanh toán');
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Handle app state changes (when user returns from browser)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        pendingDeposit
      ) {
        // App came to foreground with pending deposit - auto confirm after delay
        const timer = setTimeout(() => {
          handleConfirmPayment();
        }, 2000); // Wait 2 seconds after app becomes active

        return () => clearTimeout(timer);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [pendingDeposit, handleConfirmPayment]);

  // Check for pending deposit when screen is focused - Auto confirm after returning from payment
  useFocusEffect(
    React.useCallback(() => {
      if (pendingDeposit) {
        // Automatically call webhook when user returns to app
        // Give a small delay to ensure they came back from payment page
        const timer = setTimeout(() => {
          handleConfirmPayment();
        }, 1000); // Wait 1 second after focus before auto-confirming

        return () => clearTimeout(timer);
      } else if (!showManualConfirm) {
        // If no pending deposit but user might have returned from payment
        // Show option to manually enter order code and amount after 3 seconds
        const timer = setTimeout(() => {
          // Check if user might have just paid (optional - only if needed)
        }, 3000);
        return () => clearTimeout(timer);
      }
    }, [pendingDeposit, handleConfirmPayment, showManualConfirm])
  );

  // Handle manual confirmation with orderCode and amount
  const handleManualConfirm = async () => {
    const orderCode = parseInt(manualOrderCode);
    const amount = parseInt(manualAmount);

    if (!orderCode || !amount || orderCode <= 0 || amount <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập Order Code và Amount hợp lệ');
      return;
    }

    try {
      setPaymentStatus('checking');
      
      // Call webhook to confirm deposit
      await payOSService.confirmDepositWebhook(
        orderCode,
        amount,
        true // success = true
      );

      // Success - refresh wallet and clear form
      await refetchWallet();
      setManualOrderCode('');
      setManualAmount('');
      setShowManualConfirm(false);

      Alert.alert(
        'Thành công',
        `Đã cộng ${formatCurrency(amount)} vào ví thành công!`,
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Không thể xác nhận thanh toán';
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setPaymentStatus('idle');
    }
  };

  useEffect(() => {
    if (currentPayment) {
      setModalVisible(true);
      setPaymentStatus('pending');
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
      
      // Call Deposit/create API
      const depositResponse: DepositCreateResponse = await payOSService.createDeposit({
        amount: selectedAmount,
      });

      // Check if checkoutUrl exists
      if (depositResponse.checkoutUrl) {
        // Store deposit info for webhook call later
        setPendingDeposit({
          orderCode: depositResponse.orderCode,
          amount: depositResponse.amount,
        });

        // Show orderCode and amount for testing
        Alert.alert(
          'Thông tin giao dịch',
          `Order Code: ${depositResponse.orderCode}\n` +
          `Amount: ${formatCurrency(depositResponse.amount)}\n\n` +
          `Bạn có thể dùng thông tin này để test chức năng xác nhận thủ công.`,
          [
            {
              text: 'Copy thông tin',
              onPress: () => {
                // Pre-fill manual form for easy testing
                setManualOrderCode(depositResponse.orderCode.toString());
                setManualAmount(depositResponse.amount.toString());
                setShowManualConfirm(true);
              },
            },
            {
              text: 'Tiếp tục thanh toán',
              onPress: () => {
                // Automatically redirect to checkoutUrl
                try {
                  Linking.openURL(depositResponse.checkoutUrl);
                } catch (linkErr) {
                  Alert.alert('Lỗi', 'Không thể mở liên kết thanh toán');
                }
              },
              style: 'default',
            },
          ]
        );

        // Automatically redirect to checkoutUrl after a delay
        try {
          const supported = await Linking.canOpenURL(depositResponse.checkoutUrl);
          if (supported) {
            // Wait a bit to show alert first
            setTimeout(async () => {
              await Linking.openURL(depositResponse.checkoutUrl);
            }, 500);
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
                onPress: async () => {
                  setModalVisible(false);
                  clearPayment();
                  setSelectedAmount(0);
                  setCustomAmount('');
                  // Refresh wallet data from API
                  await refetchWallet();
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
                  selectedWallet === walletData.type.toUpperCase() && styles.walletOptionSelected,
                  { width: '100%', marginHorizontal: 0 }
                ]}
                onPress={() => setSelectedWallet(walletData.type.toUpperCase())}
              >
                <MaterialIcons 
                  name={walletData.type.toLowerCase() === 'main' ? "account-balance-wallet" : "child-care"} 
                  size={24} 
                  color={selectedWallet === walletData.type.toUpperCase() 
                    ? COLORS.SURFACE 
                    : (walletData.type.toLowerCase() === 'main' ? COLORS.PRIMARY : COLORS.SECONDARY)} 
                />
                <Text style={[
                  styles.walletOptionText,
                  selectedWallet === walletData.type.toUpperCase() && styles.walletOptionTextSelected,
                ]}>
                  {walletData.type.toLowerCase() === 'main' ? 'Ví chính' : 'Ví tiêu vặt'}
                </Text>
                {walletLoading ? (
                  <ActivityIndicator size="small" color={selectedWallet === walletData.type.toUpperCase() ? COLORS.SURFACE : COLORS.PRIMARY} style={{ marginTop: SPACING.XS }} />
                ) : (
                  <Text style={[
                    styles.walletBalance,
                    selectedWallet === walletData.type.toUpperCase() && styles.walletBalanceSelected,
                  ]}>
                    {formatCurrency(walletData.balance)}
                  </Text>
                )}
                {walletData.studentName && (
                  <Text style={[
                    styles.walletStudentName,
                    selectedWallet === walletData.type.toUpperCase() && styles.walletStudentNameSelected,
                  ]}>
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

        {/* Deposit Info Display - Show orderCode and amount after creating deposit */}
        {pendingDeposit && (
          <View style={styles.depositInfoContainer}>
            <Text style={styles.depositInfoTitle}>📋 Thông tin giao dịch (dùng để test)</Text>
            <View style={styles.depositInfoRow}>
              <Text style={styles.depositInfoLabel}>Order Code:</Text>
              <Text style={styles.depositInfoValue}>{pendingDeposit.orderCode}</Text>
            </View>
            <View style={styles.depositInfoRow}>
              <Text style={styles.depositInfoLabel}>Amount:</Text>
              <Text style={styles.depositInfoValue}>{formatCurrency(pendingDeposit.amount)}</Text>
            </View>
            <TouchableOpacity
              style={styles.copyInfoButton}
              onPress={() => {
                setManualOrderCode(pendingDeposit.orderCode.toString());
                setManualAmount(pendingDeposit.amount.toString());
                setShowManualConfirm(true);
              }}
            >
              <MaterialIcons name="content-copy" size={18} color={COLORS.SURFACE} />
              <Text style={styles.copyInfoButtonText}>Copy để test thủ công</Text>
            </TouchableOpacity>
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

        {/* Manual Confirmation Form - Fallback if deep link doesn't work */}
        {showManualConfirm && (
          <View style={styles.manualConfirmContainer}>
            <Text style={styles.manualConfirmTitle}>Xác nhận thanh toán thủ công</Text>
            <Text style={styles.manualConfirmSubtitle}>
              Nhập Order Code và Amount từ email/SMS thanh toán để cộng tiền vào ví
            </Text>
            
            <View style={styles.manualInputContainer}>
              <Text style={styles.manualInputLabel}>Order Code:</Text>
              <Text style={styles.customAmountText}>
                {manualOrderCode || 'Nhập Order Code'}
              </Text>
              <TouchableOpacity
                style={styles.customAmountButton}
                onPress={() => {
                  Alert.prompt(
                    'Nhập Order Code',
                    'Nhập Order Code từ thông báo thanh toán',
                    [
                      { text: 'Hủy', style: 'cancel' },
                      {
                        text: 'OK',
                        onPress: (text: string | undefined) => {
                          if (text) {
                            setManualOrderCode(text.trim());
                          }
                        },
                      },
                    ],
                    'plain-text',
                    manualOrderCode
                  );
                }}
              >
                <Text style={styles.customAmountButtonText}>Nhập Order Code</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.manualInputContainer}>
              <Text style={styles.manualInputLabel}>Amount (VNĐ):</Text>
              <Text style={styles.customAmountText}>
                {manualAmount ? formatCurrency(parseInt(manualAmount) || 0) : 'Nhập số tiền'}
              </Text>
              <TouchableOpacity
                style={styles.customAmountButton}
                onPress={() => {
                  Alert.prompt(
                    'Nhập Amount',
                    'Nhập số tiền đã thanh toán (VNĐ)',
                    [
                      { text: 'Hủy', style: 'cancel' },
                      {
                        text: 'OK',
                        onPress: (text: string | undefined) => {
                          if (text) {
                            setManualAmount(text.trim());
                          }
                        },
                      },
                    ],
                    'plain-text',
                    manualAmount
                  );
                }}
              >
                <Text style={styles.customAmountButtonText}>Nhập Amount</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.manualConfirmActions}>
              <TouchableOpacity
                style={[styles.manualConfirmButton, styles.cancelManualButton]}
                onPress={() => {
                  setShowManualConfirm(false);
                  setManualOrderCode('');
                  setManualAmount('');
                }}
              >
                <Text style={[styles.manualConfirmButtonText, { color: COLORS.TEXT_SECONDARY }]}>Hủy</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.manualConfirmButton, styles.confirmManualButton]}
                onPress={handleManualConfirm}
                disabled={!manualOrderCode || !manualAmount || paymentStatus === 'checking'}
              >
                {paymentStatus === 'checking' ? (
                  <ActivityIndicator size="small" color={COLORS.SURFACE} />
                ) : (
                  <Text style={[styles.manualConfirmButtonText, { color: COLORS.SURFACE }]}>
                    Xác nhận thanh toán
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Button to show manual confirmation if automatic doesn't work */}
        {!showManualConfirm && (
          <TouchableOpacity
            style={styles.manualConfirmToggleButton}
            onPress={() => setShowManualConfirm(true)}
          >
            <MaterialIcons name="help-outline" size={20} color={COLORS.ACCENT} />
            <Text style={styles.manualConfirmToggleText}>
              Thanh toán thành công nhưng chưa cộng tiền? Nhấn đây để xác nhận thủ công
            </Text>
          </TouchableOpacity>
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
  manualConfirmContainer: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    marginTop: SPACING.LG,
    borderWidth: 2,
    borderColor: COLORS.ACCENT,
  },
  manualConfirmTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  manualConfirmSubtitle: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.MD,
  },
  manualInputContainer: {
    marginBottom: SPACING.MD,
  },
  manualInputLabel: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  manualConfirmActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.MD,
  },
  manualConfirmButton: {
    flex: 1,
    borderRadius: 8,
    padding: SPACING.MD,
    alignItems: 'center',
    marginHorizontal: SPACING.XS,
  },
  cancelManualButton: {
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  confirmManualButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  manualConfirmButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
  },
  manualConfirmToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    padding: SPACING.MD,
    marginTop: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.ACCENT,
  },
  manualConfirmToggleText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.ACCENT,
    marginLeft: SPACING.SM,
    flex: 1,
  },
  depositInfoContainer: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: SPACING.MD,
    marginTop: SPACING.LG,
    borderWidth: 2,
    borderColor: COLORS.ACCENT,
  },
  depositInfoTitle: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  depositInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.SM,
  },
  depositInfoLabel: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '600',
  },
  depositInfoValue: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  copyInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.ACCENT,
    borderRadius: 8,
    padding: SPACING.SM,
    marginTop: SPACING.SM,
  },
  copyInfoButtonText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.SURFACE,
    marginLeft: SPACING.XS,
  },
});

export default TopUpScreen;
