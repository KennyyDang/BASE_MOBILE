import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import transactionService from '../../services/transactionService';
import walletService from '../../services/walletService';
import { TransactionResponse, TransactionType } from '../../types/api';
import { COLORS, SPACING, FONTS } from '../../constants';

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  OrderPayment: 'Thanh toán đơn hàng',
  Deposit: 'Nạp tiền vào ví',
  TransferIn: 'Nhận tiền chuyển khoản',
  TransferOut: 'Chuyển tiền đi',
  PackagePayment: 'Thanh toán mua gói',
  Refund: 'Hoàn tiền hủy gói',
  Tuition: 'Thanh toán học phí',
  Canteen: 'Mua đồ ăn buffet',
  Game: 'Chơi game',
  ServicePurchase: 'Mua dịch vụ',
};

const TRANSACTION_TYPE_ICONS: Record<TransactionType, string> = {
  OrderPayment: 'shopping-cart',
  Deposit: 'account-balance-wallet',
  TransferIn: 'arrow-downward',
  TransferOut: 'arrow-upward',
  PackagePayment: 'card-giftcard',
  Refund: 'undo',
  Tuition: 'school',
  Canteen: 'restaurant',
  Game: 'sports-esports',
  ServicePurchase: 'room-service',
};

type TransactionDetailRouteProp = RouteProp<RootStackParamList, 'TransactionDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TransactionDetail'>;

const TransactionDetailScreen: React.FC = () => {
  const route = useRoute<TransactionDetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { transactionId, transaction: passedTransaction } = route.params;

  const [transaction, setTransaction] = useState<TransactionResponse | null>(passedTransaction || null);
  const [loading, setLoading] = useState(!passedTransaction);
  const [error, setError] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);

  useEffect(() => {
    if (passedTransaction) {
      // Nếu đã có transaction từ params, chỉ cần fetch wallet info
      fetchWalletInfo(passedTransaction);
    } else {
      // Nếu không có, fetch transaction detail từ API
      fetchTransactionDetail();
    }
  }, [transactionId, passedTransaction]);

  const fetchWalletInfo = async (tx: TransactionResponse) => {
    if (tx.walletId) {
      try {
        const wallet = await walletService.getWalletById(tx.walletId);
        if (wallet.studentName) {
          setWalletName(`Ví học sinh: ${wallet.studentName}`);
        } else if (wallet.userEmail) {
          setWalletName(`Ví phụ huynh: ${wallet.userEmail}`);
        } else {
          setWalletName(tx.walletType === 'Parent' ? 'Ví phụ huynh' : 'Ví học sinh');
        }
      } catch (walletErr) {
        // Nếu không lấy được wallet info, dùng walletType
        setWalletName(tx.walletType === 'Parent' ? 'Ví phụ huynh' : 'Ví học sinh');
      }
    }
  };

  const fetchTransactionDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Thử gọi API để lấy transaction detail
      try {
        const data = await transactionService.getTransactionById(transactionId);
        setTransaction(data);
        await fetchWalletInfo(data);
      } catch (apiErr: any) {
        // Nếu API không tồn tại hoặc lỗi, thử tìm trong list transactions
        // Hoặc hiển thị lỗi
        const message = apiErr?.response?.data?.message || apiErr?.message || 'Không thể tải chi tiết giao dịch.';
        
        // Nếu là 404, có thể API endpoint không tồn tại
        if (apiErr?.response?.status === 404) {
          throw new Error('API endpoint không tồn tại. Vui lòng quay lại danh sách giao dịch.');
        }
        
        throw new Error(message);
      }
    } catch (err: any) {
      const message = err?.message || 'Không thể tải chi tiết giao dịch.';
      setError(message);
      Alert.alert('Lỗi', message, [
        {
          text: 'Quay lại',
          onPress: () => navigation.goBack(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('vi-VN', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
      }),
      full: date.toLocaleString('vi-VN'),
    };
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTransactionIcon = (type: TransactionType) => {
    return TRANSACTION_TYPE_ICONS[type] || 'receipt';
  };

  const getTransactionLabel = (type: TransactionType) => {
    return TRANSACTION_TYPE_LABELS[type] || type;
  };

  const getAmountColor = (amount: number) => {
    return amount >= 0 ? COLORS.SUCCESS : COLORS.ERROR;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Đang tải chi tiết giao dịch...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !transaction) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={COLORS.ERROR} />
          <Text style={styles.errorText}>{error || 'Không tìm thấy giao dịch'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const timeInfo = formatDateTime(transaction.timestamp);
  const isPositive = transaction.amount >= 0;
  const amountColor = getAmountColor(transaction.amount);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={[styles.iconContainer, { backgroundColor: amountColor + '20' }]}>
            <MaterialIcons
              name={getTransactionIcon(transaction.type) as any}
              size={48}
              color={amountColor}
            />
          </View>
          <Text style={styles.transactionTypeLabel}>
            {getTransactionLabel(transaction.type)}
          </Text>
          <Text style={[styles.amount, { color: amountColor }]}>
            {isPositive ? '+' : ''}
            {transaction.amount.toLocaleString('vi-VN')} VNĐ
          </Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {isPositive ? 'Nhận tiền' : 'Chi tiêu'}
            </Text>
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Thông tin giao dịch</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mã giao dịch</Text>
            <Text style={styles.detailValue}>{transaction.id}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Thời gian</Text>
            <View style={styles.detailValueContainer}>
              <Text style={styles.detailValue}>{timeInfo.date}</Text>
              <Text style={styles.detailValueSmall}>{timeInfo.time}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Loại ví</Text>
            <Text style={styles.detailValue}>
              {walletName || (transaction.walletType === 'Parent' ? 'Ví phụ huynh' : 'Ví học sinh')}
            </Text>
          </View>

          {transaction.description && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mô tả</Text>
              <Text style={styles.detailValue}>{transaction.description}</Text>
            </View>
          )}

          {transaction.note && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ghi chú</Text>
              <Text style={styles.detailValue}>{transaction.note}</Text>
            </View>
          )}

          {/* Package Information */}
          {transaction.packageName && (
            <>
              <View style={styles.sectionDivider} />
              <Text style={styles.sectionTitle}>Thông tin gói dịch vụ</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tên gói</Text>
                <Text style={styles.detailValue}>{transaction.packageName}</Text>
              </View>

              {transaction.packageStudentName && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Học sinh</Text>
                  <Text style={styles.detailValue}>{transaction.packageStudentName}</Text>
                </View>
              )}

              {transaction.packagePrice && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Giá gói</Text>
                  <Text style={styles.detailValue}>
                    {transaction.packagePrice.toLocaleString('vi-VN')} VNĐ
                  </Text>
                </View>
              )}

              {transaction.packageStartDate && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ngày bắt đầu</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(transaction.packageStartDate)}
                  </Text>
                </View>
              )}

              {transaction.packageEndDate && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ngày kết thúc</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(transaction.packageEndDate)}
                  </Text>
                </View>
              )}

              {transaction.packageTotalSlot !== null && transaction.packageTotalSlot !== undefined && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tổng số slot</Text>
                  <Text style={styles.detailValue}>{transaction.packageTotalSlot}</Text>
                </View>
              )}

              {transaction.packageUsedSlot !== null && transaction.packageUsedSlot !== undefined && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Đã sử dụng</Text>
                  <Text style={styles.detailValue}>
                    {transaction.packageUsedSlot} / {transaction.packageTotalSlot || 0}
                  </Text>
                </View>
              )}

              {transaction.refundReason && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Lý do hoàn tiền</Text>
                  <Text style={styles.detailValue}>{transaction.refundReason}</Text>
                </View>
              )}

              {transaction.refundPercentage !== null && transaction.refundPercentage !== undefined && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tỷ lệ hoàn tiền</Text>
                  <Text style={styles.detailValue}>{transaction.refundPercentage}%</Text>
                </View>
              )}

              {transaction.refundedAt && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ngày hoàn tiền</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(transaction.refundedAt)}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Order Information */}
          {transaction.orderId && (
            <>
              <View style={styles.sectionDivider} />
              <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Mã đơn hàng</Text>
                <Text style={styles.detailValue}>{transaction.orderId}</Text>
              </View>

              {transaction.orderReference && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Mã tham chiếu</Text>
                  <Text style={styles.detailValue}>{transaction.orderReference}</Text>
                </View>
              )}

              {transaction.orderStatus && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Trạng thái</Text>
                  <Text style={styles.detailValue}>{transaction.orderStatus}</Text>
                </View>
              )}

              {transaction.orderStudentName && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Học sinh</Text>
                  <Text style={styles.detailValue}>{transaction.orderStudentName}</Text>
                </View>
              )}

              {transaction.orderServiceNames && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Dịch vụ</Text>
                  <Text style={styles.detailValue}>{transaction.orderServiceNames}</Text>
                </View>
              )}

              {transaction.orderCreatedDate && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ngày tạo đơn</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(transaction.orderCreatedDate)}
                  </Text>
                </View>
              )}
            </>
          )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.MD,
  },
  loadingContainer: {
    flex: 1,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.XL,
  },
  errorText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.ERROR,
    textAlign: 'center',
    marginTop: SPACING.MD,
  },
  headerCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.LG,
    alignItems: 'center',
    marginBottom: SPACING.MD,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.MD,
  },
  transactionTypeLabel: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
    textAlign: 'center',
  },
  amount: {
    fontSize: FONTS.SIZES.XXXL,
    fontWeight: 'bold',
    marginBottom: SPACING.SM,
  },
  statusBadge: {
    backgroundColor: COLORS.PRIMARY_50,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS,
    borderRadius: 16,
  },
  statusText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  detailsCard: {
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
  sectionTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  detailLabel: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    flex: 1,
  },
  detailValue: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  detailValueContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  detailValueSmall: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS / 2,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.BORDER,
    marginVertical: SPACING.MD,
  },
});

export default TransactionDetailScreen;

