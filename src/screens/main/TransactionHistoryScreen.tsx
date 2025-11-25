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
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import walletService from '../../services/walletService';
import { DepositResponse } from '../../types/api';
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

const TransactionHistoryScreen: React.FC = () => {
  type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TransactionHistory'>;
  const navigation = useNavigation<NavigationProp>();

  const [transactions, setTransactions] = useState<DepositResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<DepositResponse | null>(null);
  const [loadingCheckoutUrl, setLoadingCheckoutUrl] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchTransactions = useCallback(async (page: number = 1, silent: boolean = false) => {
    if (!silent) {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
    }
    setError(null);

    try {
      const deposits = await walletService.getDeposits(page, 20);
      
      // Ensure deposits is always an array
      let depositsArray: DepositResponse[] = [];
      if (Array.isArray(deposits)) {
        depositsArray = deposits;
      } else if (deposits && typeof deposits === 'object' && 'items' in deposits) {
        // Handle paginated response
        depositsArray = Array.isArray((deposits as any).items) ? (deposits as any).items : [];
      }
      
      if (page === 1) {
        // Remove duplicates by id
        const uniqueDeposits = depositsArray.filter((deposit, index, self) =>
          index === self.findIndex((d) => d.id === deposit.id)
        );
        setTransactions(uniqueDeposits);
      } else {
        setTransactions((prev) => {
          // Combine and remove duplicates
          const combined = [...prev, ...depositsArray];
          return combined.filter((deposit, index, self) =>
            index === self.findIndex((d) => d.id === deposit.id)
          );
        });
      }

      setHasMore(depositsArray.length === 20);
      setPageIndex(page);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Không thể tải giao dịch. Vui lòng thử lại.';
      setError(message);
      if (page === 1) {
        Alert.alert('Lỗi', message);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions(1);
  }, [fetchTransactions]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setPageIndex(1);
    setHasMore(true);
    fetchTransactions(1, true);
  }, [fetchTransactions]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      fetchTransactions(pageIndex + 1, true);
    }
  }, [loadingMore, hasMore, loading, pageIndex, fetchTransactions]);

  const formatTransactionTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleString('vi-VN'),
    };
  };

  const getTransactionIcon = (status: string) => {
    if (status === 'Completed') return 'check-circle';
    if (status === 'Pending') return 'schedule';
    if (status === 'Failed') return 'error';
    return 'account-balance-wallet';
  };

  const getTransactionIconColor = (status: string) => {
    if (status === 'Completed') return COLORS.SUCCESS;
    if (status === 'Pending') return COLORS.WARNING;
    if (status === 'Failed') return COLORS.ERROR;
    return COLORS.PRIMARY;
  };

  const getStatusText = (status: string) => {
    if (status === 'Completed') return 'Hoàn thành';
    if (status === 'Pending') return 'Đang xử lý';
    if (status === 'Failed') return 'Thất bại';
    return status;
  };

  const getStatusColor = (status: string) => {
    if (status === 'Completed') return COLORS.SUCCESS;
    if (status === 'Pending') return COLORS.WARNING;
    if (status === 'Failed') return COLORS.ERROR;
    return COLORS.TEXT_SECONDARY;
  };

  const handleTransactionPress = async (transaction: DepositResponse) => {
    // Chỉ xử lý khi status là Pending
    if (transaction.status !== 'Pending') {
      return;
    }

    setSelectedTransaction(transaction);
    setPaymentModalVisible(true);
    setLoadingCheckoutUrl(true);
    setCheckoutUrl(null);

    try {
      // Bước 1: Kiểm tra xem transaction đã có checkoutUrl chưa
      if (transaction.checkoutUrl) {
        setCheckoutUrl(transaction.checkoutUrl);
        setLoadingCheckoutUrl(false);
        return;
      }

      // Bước 2: Thử lấy từ AsyncStorage bằng orderCode (nếu có)
      let savedCheckoutUrl: string | null = null;
      if (transaction.payOSOrderCode) {
        try {
          savedCheckoutUrl = await AsyncStorage.getItem(`deposit_order_${transaction.payOSOrderCode}`);
        } catch (storageErr) {
          console.warn('Failed to get checkoutUrl from storage:', storageErr);
        }
      }

      // Bước 3: Nếu không có trong storage, thử lấy bằng depositId
      if (!savedCheckoutUrl && transaction.id) {
        try {
          savedCheckoutUrl = await AsyncStorage.getItem(`deposit_${transaction.id}`);
        } catch (storageErr) {
          console.warn('Failed to get checkoutUrl from storage by id:', storageErr);
        }
      }

      // Bước 4: Nếu có trong storage, dùng luôn
      if (savedCheckoutUrl) {
        setCheckoutUrl(savedCheckoutUrl);
        // Cập nhật transaction trong list
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === transaction.id ? { ...t, checkoutUrl: savedCheckoutUrl } : t
          )
        );
        setLoadingCheckoutUrl(false);
        return;
      }

      // Bước 5: Nếu không có trong storage, thử fetch từ API
      try {
        const depositDetail = await walletService.getDepositById(transaction.id);
        if (depositDetail.checkoutUrl) {
          setCheckoutUrl(depositDetail.checkoutUrl);
          // Lưu vào storage để lần sau không cần fetch
          try {
            if (transaction.id) {
              await AsyncStorage.setItem(`deposit_${transaction.id}`, depositDetail.checkoutUrl);
            }
            if (transaction.payOSOrderCode) {
              await AsyncStorage.setItem(`deposit_order_${transaction.payOSOrderCode}`, depositDetail.checkoutUrl);
            }
          } catch (storageErr) {
            console.warn('Failed to save checkoutUrl to storage:', storageErr);
          }
          // Cập nhật transaction trong list
          setTransactions((prev) =>
            prev.map((t) =>
              t.id === transaction.id ? { ...t, checkoutUrl: depositDetail.checkoutUrl } : t
            )
          );
          setLoadingCheckoutUrl(false);
        } else {
          Alert.alert('Lỗi', 'Không thể lấy link thanh toán. Vui lòng thử lại sau.');
          setLoadingCheckoutUrl(false);
        }
      } catch (apiErr: any) {
        // Nếu API cũng không có, hiển thị lỗi
        const errorMessage = apiErr?.response?.data?.message || apiErr?.message || 'Không thể tải thông tin thanh toán';
        Alert.alert('Lỗi', errorMessage);
        setLoadingCheckoutUrl(false);
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Không thể tải thông tin thanh toán';
      Alert.alert('Lỗi', errorMessage);
      setLoadingCheckoutUrl(false);
    }
  };

  const handleOpenPaymentLink = async () => {
    if (!checkoutUrl) {
      Alert.alert('Lỗi', 'Không có link thanh toán');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(checkoutUrl);
      if (supported) {
        await Linking.openURL(checkoutUrl);
      } else {
        Alert.alert('Lỗi', 'Không thể mở trình duyệt thanh toán');
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể mở liên kết thanh toán');
    }
  };

  const handleCloseModal = () => {
    setPaymentModalVisible(false);
    setSelectedTransaction(null);
    setCheckoutUrl(null);
    setLoadingCheckoutUrl(false);
    setCancelling(false);
  };

  const handleCancelDeposit = async () => {
    if (!selectedTransaction) {
      return;
    }

    Alert.alert(
      'Xác nhận hủy',
      `Bạn có chắc chắn muốn hủy giao dịch nạp tiền ${selectedTransaction.amount.toLocaleString('vi-VN')} VNĐ?`,
      [
        {
          text: 'Không',
          style: 'cancel',
        },
        {
          text: 'Có, hủy giao dịch',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              // Gọi API cancel deposit
              await walletService.cancelDeposit(selectedTransaction.id);
              
              // Xóa checkoutUrl khỏi storage nếu có
              try {
                if (selectedTransaction.id) {
                  await AsyncStorage.removeItem(`deposit_${selectedTransaction.id}`);
                }
                if (selectedTransaction.payOSOrderCode) {
                  await AsyncStorage.removeItem(`deposit_order_${selectedTransaction.payOSOrderCode}`);
                }
              } catch (storageErr) {
                console.warn('Failed to remove checkoutUrl from storage:', storageErr);
              }

              // Refresh danh sách transactions
              await fetchTransactions(1, true);

              Alert.alert(
                'Thành công',
                'Đã hủy giao dịch thành công.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      handleCloseModal();
                    },
                  },
                ]
              );
            } catch (err: any) {
              const errorMessage = err?.message || 'Không thể hủy giao dịch. Vui lòng thử lại.';
              Alert.alert('Lỗi', errorMessage);
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Lịch sử giao dịch</Text>
          <Text style={styles.headerSubtitle}>
            Xem tất cả các giao dịch nạp tiền của bạn
          </Text>
        </View>

        {/* Transactions List */}
        {loading && transactions.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            <Text style={styles.loadingText}>Đang tải giao dịch...</Text>
          </View>
        ) : error && transactions.length === 0 ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color={COLORS.ERROR} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchTransactions(1)}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="receipt-long" size={64} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.emptyTitle}>Chưa có giao dịch nào</Text>
            <Text style={styles.emptySubtitle}>
              Các giao dịch nạp tiền của bạn sẽ hiển thị ở đây
            </Text>
          </View>
        ) : (
          <>
            {transactions
              .filter((transaction, index, self) => 
                index === self.findIndex((t) => t.id === transaction.id)
              )
              .map((transaction) => {
              const timeInfo = formatTransactionTime(transaction.timestamp);
              const isPending = transaction.status === 'Pending';
              return (
                <TouchableOpacity
                  key={transaction.id}
                  style={[
                    styles.transactionCard,
                    isPending && styles.transactionCardPending,
                  ]}
                  onPress={() => handleTransactionPress(transaction)}
                  activeOpacity={isPending ? 0.7 : 1}
                  disabled={!isPending}
                >
                  <View style={styles.transactionHeader}>
                    <View style={styles.transactionIconContainer}>
                      <MaterialIcons
                        name={getTransactionIcon(transaction.status)}
                        size={24}
                        color={getTransactionIconColor(transaction.status)}
                      />
                    </View>
                    <View style={styles.transactionMainInfo}>
                      <Text style={styles.transactionDescription}>
                        {transaction.status === 'Completed'
                          ? 'Nạp tiền vào ví'
                          : transaction.status === 'Pending'
                          ? 'Đang xử lý nạp tiền'
                          : 'Giao dịch thất bại'}
                      </Text>
                      <Text style={styles.transactionDate}>{timeInfo.date}</Text>
                      <Text style={styles.transactionTime}>{timeInfo.time}</Text>
                    </View>
                    <View style={styles.transactionAmountContainer}>
                      <Text
                        style={[
                          styles.transactionAmount,
                          transaction.status === 'Completed' && { color: COLORS.SUCCESS },
                        ]}
                      >
                        {transaction.status === 'Completed' ? '+' : ''}
                        {transaction.amount.toLocaleString('vi-VN')} VNĐ
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(transaction.status) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(transaction.status) },
                          ]}
                        >
                          {getStatusText(transaction.status)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {transaction.payOSOrderCode && (
                    <View style={styles.transactionDetails}>
                      <Text style={styles.transactionDetailText}>
                        Mã đơn hàng: {transaction.payOSOrderCode}
                      </Text>
                    </View>
                  )}
                  {isPending && (
                    <View style={styles.pendingHint}>
                      <MaterialIcons name="info-outline" size={16} color={COLORS.WARNING} />
                      <Text style={styles.pendingHintText}>
                        Chạm để tiếp tục thanh toán
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {loadingMore && (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                <Text style={styles.loadingMoreText}>Đang tải thêm...</Text>
              </View>
            )}

            {!hasMore && transactions.length > 0 && (
              <View style={styles.endContainer}>
                <Text style={styles.endText}>Đã hiển thị tất cả giao dịch</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={paymentModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tiếp tục thanh toán</Text>
              <TouchableOpacity onPress={handleCloseModal} style={styles.modalCloseButton}>
                <MaterialIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            {selectedTransaction && (
              <View style={styles.modalBody}>
                <View style={styles.transactionInfoBox}>
                  <Text style={styles.transactionInfoLabel}>Số tiền:</Text>
                  <Text style={styles.transactionInfoValue}>
                    {selectedTransaction.amount.toLocaleString('vi-VN')} VNĐ
                  </Text>
                </View>
                {selectedTransaction.payOSOrderCode && (
                  <View style={styles.transactionInfoBox}>
                    <Text style={styles.transactionInfoLabel}>Mã đơn hàng:</Text>
                    <Text style={styles.transactionInfoValue}>
                      {selectedTransaction.payOSOrderCode}
                    </Text>
                  </View>
                )}

                {loadingCheckoutUrl ? (
                  <View style={styles.loadingCheckoutContainer}>
                    <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                    <Text style={styles.loadingCheckoutText}>Đang tải link thanh toán...</Text>
                  </View>
                ) : checkoutUrl ? (
                  <>
                    <View style={styles.checkoutUrlBox}>
                      <MaterialIcons name="payment" size={24} color={COLORS.PRIMARY} />
                      <Text style={styles.checkoutUrlLabel}>Link thanh toán:</Text>
                      <Text style={styles.checkoutUrlText} numberOfLines={2}>
                        {checkoutUrl}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.openPaymentButton}
                      onPress={handleOpenPaymentLink}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="open-in-new" size={20} color={COLORS.SURFACE} />
                      <Text style={styles.openPaymentButtonText}>Mở link thanh toán</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleCancelDeposit}
                      activeOpacity={0.8}
                      disabled={cancelling}
                    >
                      {cancelling ? (
                        <ActivityIndicator size="small" color={COLORS.ERROR} />
                      ) : (
                        <MaterialIcons name="cancel" size={20} color={COLORS.ERROR} />
                      )}
                      <Text style={styles.cancelButtonText}>
                        {cancelling ? 'Đang hủy...' : 'Hủy giao dịch'}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.infoBox}>
                      <MaterialIcons name="info-outline" size={20} color={COLORS.INFO} />
                      <Text style={styles.infoText}>
                        Nhấn vào nút trên để mở link thanh toán trong trình duyệt và hoàn tất giao dịch.
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.errorCheckoutContainer}>
                    <MaterialIcons name="error-outline" size={48} color={COLORS.ERROR} />
                    <Text style={styles.errorCheckoutText}>
                      Không thể lấy link thanh toán. Vui lòng thử lại sau.
                    </Text>
                  </View>
                )}
              </View>
            )}
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
    marginBottom: SPACING.XS,
  },
  headerSubtitle: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.XL,
  },
  loadingText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.MD,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.XL,
  },
  errorText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.ERROR,
    textAlign: 'center',
    marginTop: SPACING.MD,
    marginBottom: SPACING.LG,
  },
  retryButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.SURFACE,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.XL,
  },
  emptyTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  emptySubtitle: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  transactionCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  transactionIconContainer: {
    marginRight: SPACING.MD,
  },
  transactionMainInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  transactionDate: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  transactionTime: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
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
  transactionDetails: {
    marginTop: SPACING.MD,
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  transactionDetailText: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.MD,
  },
  loadingMoreText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.SM,
  },
  endContainer: {
    alignItems: 'center',
    padding: SPACING.MD,
  },
  endText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  transactionCardPending: {
    borderWidth: 1,
    borderColor: COLORS.WARNING + '40',
  },
  pendingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.SM,
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  pendingHintText: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.WARNING,
    marginLeft: SPACING.XS,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.LG,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.LG,
    paddingBottom: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  modalTitle: {
    fontSize: FONTS.SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  modalCloseButton: {
    padding: SPACING.XS,
  },
  modalBody: {
    paddingTop: SPACING.MD,
  },
  transactionInfoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  transactionInfoLabel: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  transactionInfoValue: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  loadingCheckoutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.XL,
  },
  loadingCheckoutText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.MD,
  },
  checkoutUrlBox: {
    backgroundColor: COLORS.PRIMARY_50,
    padding: SPACING.MD,
    borderRadius: 12,
    marginTop: SPACING.MD,
    marginBottom: SPACING.LG,
  },
  checkoutUrlLabel: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.SM,
    marginBottom: SPACING.XS,
  },
  checkoutUrlText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  openPaymentButton: {
    backgroundColor: COLORS.PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    borderRadius: 8,
    marginBottom: SPACING.MD,
  },
  openPaymentButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
    marginLeft: SPACING.SM,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.INFO_BG,
    padding: SPACING.MD,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    marginLeft: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 20,
  },
  errorCheckoutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.XL,
  },
  errorCheckoutText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.ERROR,
    textAlign: 'center',
    marginTop: SPACING.MD,
  },
  cancelButton: {
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.ERROR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    borderRadius: 8,
    marginBottom: SPACING.MD,
  },
  cancelButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.ERROR,
    marginLeft: SPACING.SM,
  },
});

export default TransactionHistoryScreen;

