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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import walletService from '../../services/walletService';
import { DepositResponse } from '../../types/api';

// Inline constants
const COLORS = {
  PRIMARY: '#2E7D32',
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
              return (
                <View key={transaction.id} style={styles.transactionCard}>
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
                </View>
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
});

export default TransactionHistoryScreen;

