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
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import transactionService from '../../services/transactionService';
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

const TransactionHistoryScreen: React.FC = () => {
  type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TransactionHistory'>;
  const navigation = useNavigation<NavigationProp>();

  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<TransactionType | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  const fetchTransactions = useCallback(async (page: number = 1, reset: boolean = false) => {
    if (!reset && page === 1) {
      setLoading(true);
    } else if (page > 1) {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const response = await transactionService.getMyTransactions({
        pageIndex: page,
        pageSize: 20,
        type: selectedType || undefined,
      });

      if (reset || page === 1) {
        setTransactions(response.items || []);
      } else {
        setTransactions((prev) => [...prev, ...(response.items || [])]);
      }

      setHasMore(response.hasNextPage || false);
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
  }, [selectedType]);

  useEffect(() => {
    fetchTransactions(1, true);
  }, [selectedType]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setPageIndex(1);
    setHasMore(true);
    fetchTransactions(1, true);
  }, [fetchTransactions]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      fetchTransactions(pageIndex + 1, false);
    }
  }, [loadingMore, hasMore, loading, pageIndex, fetchTransactions]);

  const formatTransactionTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' }),
      time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleString('vi-VN'),
    };
  };

  const getWalletTypeLabel = (walletType: string) => {
    if (walletType === 'Parent') return 'Ví phụ huynh';
    if (walletType === 'Student') return 'Ví học sinh';
    return walletType;
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

  const handleTransactionPress = (transaction: TransactionResponse) => {
    navigation.navigate('TransactionDetail', { 
      transactionId: transaction.id,
      transaction: transaction, // Pass transaction object to avoid API call
    });
  };

  const handleFilterChange = (type: TransactionType | null) => {
    setSelectedType(type);
    setShowFilter(false);
  };

  const renderTransactionItem = ({ item }: { item: TransactionResponse }) => {
      const timeInfo = formatTransactionTime(item.timestamp);
    const isPositive = item.amount >= 0;
    const amountColor = getAmountColor(item.amount);

    return (
      <TouchableOpacity
        style={styles.transactionCard}
        onPress={() => handleTransactionPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.transactionHeader}>
          <View style={[styles.transactionIconContainer, { backgroundColor: amountColor + '20' }]}>
            <MaterialIcons
              name={getTransactionIcon(item.type) as any}
              size={24}
              color={amountColor}
            />
          </View>
          <View style={styles.transactionMainInfo}>
            <Text style={styles.transactionDescription}>
              {getTransactionLabel(item.type)}
            </Text>
            {item.description && (
              <Text style={styles.transactionSubDescription} numberOfLines={1}>
                {item.description}
              </Text>
            )}
            <View style={styles.transactionMeta}>
              <Text style={styles.transactionDate}>{timeInfo.date}</Text>
              <Text style={styles.transactionTime}>{timeInfo.time}</Text>
            </View>
            {item.packageStudentName && (
              <Text style={styles.transactionStudent}>
                Học sinh: {item.packageStudentName}
              </Text>
            )}
            {item.orderStudentName && (
              <Text style={styles.transactionStudent}>
                Học sinh: {item.orderStudentName}
              </Text>
            )}
            {item.walletType && (
              <Text style={styles.transactionWallet}>
                {getWalletTypeLabel(item.walletType)}
              </Text>
            )}
          </View>
          <View style={styles.transactionAmountContainer}>
            <Text style={[styles.transactionAmount, { color: amountColor }]}>
              {isPositive ? '+' : ''}
              {item.amount.toLocaleString('vi-VN')} VNĐ
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterButton = () => {
    return (
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowFilter(!showFilter)}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name={showFilter ? 'filter-list' : 'filter-list'}
          size={20}
          color={selectedType ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY}
        />
        <Text style={[styles.filterButtonText, selectedType && styles.filterButtonTextActive]}>
          {selectedType ? TRANSACTION_TYPE_LABELS[selectedType] : 'Tất cả'}
        </Text>
        {selectedType && (
          <TouchableOpacity
            style={styles.clearFilterButton}
            onPress={() => handleFilterChange(null)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="close" size={16} color={COLORS.PRIMARY} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderFilterModal = () => {
    if (!showFilter) return null;

    return (
      <View style={styles.filterModal}>
        <ScrollView style={styles.filterList} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterItem,
              !selectedType && styles.filterItemActive,
            ]}
            onPress={() => handleFilterChange(null)}
          >
            <Text style={[
              styles.filterItemText,
              !selectedType && styles.filterItemTextActive,
            ]}>
              Tất cả giao dịch
            </Text>
            {!selectedType && (
              <MaterialIcons name="check" size={20} color={COLORS.PRIMARY} />
            )}
          </TouchableOpacity>
          {(Object.keys(TRANSACTION_TYPE_LABELS) as TransactionType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterItem,
                selectedType === type && styles.filterItemActive,
              ]}
              onPress={() => handleFilterChange(type)}
            >
              <MaterialIcons
                name={TRANSACTION_TYPE_ICONS[type] as any}
                size={20}
                color={selectedType === type ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY}
                style={styles.filterItemIcon}
              />
              <Text style={[
                styles.filterItemText,
                selectedType === type && styles.filterItemTextActive,
              ]}>
                {TRANSACTION_TYPE_LABELS[type]}
              </Text>
              {selectedType === type && (
                <MaterialIcons name="check" size={20} color={COLORS.PRIMARY} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch sử giao dịch</Text>
        <Text style={styles.headerSubtitle}>
          Xem tất cả các giao dịch của bạn
        </Text>
      </View>

      <View style={styles.filterContainer}>
        {renderFilterButton()}
        {renderFilterModal()}
      </View>

      {loading && transactions.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Đang tải giao dịch...</Text>
        </View>
      ) : error && transactions.length === 0 ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={COLORS.ERROR} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchTransactions(1, true)}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="receipt-long" size={64} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.emptyTitle}>Chưa có giao dịch nào</Text>
          <Text style={styles.emptySubtitle}>
            {selectedType
              ? `Chưa có giao dịch loại "${TRANSACTION_TYPE_LABELS[selectedType]}"`
              : 'Các giao dịch của bạn sẽ hiển thị ở đây'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                <Text style={styles.loadingMoreText}>Đang tải thêm...</Text>
              </View>
            ) : !hasMore && transactions.length > 0 ? (
              <View style={styles.endContainer}>
                <Text style={styles.endText}>Đã hiển thị tất cả giao dịch</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    padding: SPACING.MD,
    paddingBottom: SPACING.SM,
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
  filterContainer: {
    paddingHorizontal: SPACING.MD,
    paddingBottom: SPACING.SM,
    position: 'relative',
    zIndex: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  filterButtonText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.SM,
    flex: 1,
  },
  filterButtonTextActive: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  clearFilterButton: {
    marginLeft: SPACING.SM,
    padding: SPACING.XS,
  },
  filterModal: {
    position: 'absolute',
    top: '100%',
    left: SPACING.MD,
    right: SPACING.MD,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    marginTop: SPACING.XS,
    maxHeight: 400,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  filterList: {
    maxHeight: 400,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  filterItemActive: {
    backgroundColor: COLORS.PRIMARY_50,
  },
  filterItemIcon: {
    marginRight: SPACING.SM,
  },
  filterItemText: {
    flex: 1,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
  },
  filterItemTextActive: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  listContent: {
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
    flex: 1,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
  transactionSubDescription: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.XS,
  },
  transactionDate: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginRight: SPACING.SM,
  },
  transactionTime: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  transactionStudent: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS,
  },
  transactionWallet: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS / 2,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
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
