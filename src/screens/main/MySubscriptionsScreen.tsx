import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import packageService from '../../services/packageService';
import { useMyChildren } from '../../hooks/useChildrenApi';
import { RootStackParamList } from '../../types';
import { StudentPackageSubscription } from '../../types/api';
import { COLORS } from '../../constants';

type MySubscriptionsNavigationProp = StackNavigationProp<RootStackParamList>;

const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
};

const MySubscriptionsScreen: React.FC = () => {
  const navigation = useNavigation<MySubscriptionsNavigationProp>();
  const { students, loading: studentsLoading } = useMyChildren();

  const [subscriptions, setSubscriptions] = useState<StudentPackageSubscription[]>([]);
  const [allSubscriptions, setAllSubscriptions] = useState<StudentPackageSubscription[]>([]); // Store all subscriptions including refunded
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [packagePrices, setPackagePrices] = useState<Record<string, number>>({});

  const formatCurrency = useCallback((value: number | null | undefined) => {
    if (value === null || value === undefined) {
      return 'Chưa có thông tin';
    }
    // Hiển thị giá ngay cả khi là 0 (gói miễn phí)
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }, []);

  const fetchAllSubscriptions = useCallback(async () => {
    try {
      setError(null);
      const allSubsList: StudentPackageSubscription[] = [];
      const pricesMap: Record<string, number> = {};

      for (const student of students) {
        try {
          const studentSubs = await packageService.getStudentSubscriptions(student.id);
          allSubsList.push(...studentSubs);
          
          // Fetch package prices for subscriptions that don't have priceFinal
          for (const sub of studentSubs) {
            if ((sub.priceFinal === null || sub.priceFinal === undefined || sub.priceFinal === 0) && sub.packageId) {
              try {
                // Try to get price from suitable packages
                const suitablePackages = await packageService.getSuitablePackages(student.id);
                const matchingPackage = suitablePackages.find(pkg => pkg.id === sub.packageId);
                if (matchingPackage && matchingPackage.price) {
                  pricesMap[sub.id] = matchingPackage.price;
                }
              } catch (err) {
                // Ignore errors when fetching package price
              }
            }
          }
        } catch (err) {
          // Continue with other students if one fails
        }
      }

      // Store all subscriptions (including refunded/cancelled) for upgrade detection
      setAllSubscriptions(allSubsList);

      // Filter out refunded and cancelled subscriptions for display
      const activeSubscriptions = allSubsList.filter(
        (sub) => {
          const status = sub.status?.toUpperCase();
          return status !== 'REFUNDED' && status !== 'CANCELLED';
        }
      );

      // Sort by startDate descending (newest first)
      activeSubscriptions.sort((a, b) => 
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );

      setSubscriptions(activeSubscriptions);
      setPackagePrices(pricesMap);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách gói đăng ký');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [students]);

  useEffect(() => {
    if (students.length > 0) {
      setLoading(true);
      fetchAllSubscriptions();
    } else if (!studentsLoading) {
      setLoading(false);
      setSubscriptions([]);
    }
  }, [students, studentsLoading, fetchAllSubscriptions]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllSubscriptions();
  }, [fetchAllSubscriptions]);

  // Check if subscription was upgraded to a newer package (this is the old package that was upgraded)
  const wasUpgradedToNewerPackage = useCallback((subscription: StudentPackageSubscription): boolean => {
    // Find all subscriptions of the same student (including refunded/cancelled)
    const sameStudentSubs = allSubscriptions.filter(
      (sub) => sub.studentId === subscription.studentId && sub.id !== subscription.id
    );
    
    if (sameStudentSubs.length === 0) {
      return false; // No other subscriptions, not upgraded
    }
    
    // Sort by startDate to find newer subscriptions
    const sortedSubs = [...sameStudentSubs, subscription].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
    
    const currentIndex = sortedSubs.findIndex((sub) => sub.id === subscription.id);
    if (currentIndex === sortedSubs.length - 1) {
      return false; // This is the newest subscription, not an old one
    }
    
    // Check if there's a newer subscription created shortly after this one
    // (within 1 hour to account for upgrade timing)
    for (let i = currentIndex + 1; i < sortedSubs.length; i++) {
      const newerSub = sortedSubs[i];
      const timeDiff = new Date(newerSub.startDate).getTime() - new Date(subscription.startDate).getTime();
      const isRecentUpgrade = timeDiff > 0 && timeDiff < 3600000; // 1 hour in milliseconds
      
      // If this subscription was unused and there's a newer one created shortly after, it was upgraded
      if (subscription.usedSlot === 0 && isRecentUpgrade) {
        return true;
      }
    }
    
    return false;
  }, [allSubscriptions]);

  const canRefund = useCallback((subscription: StudentPackageSubscription): boolean => {
    // Bỏ hết ràng buộc FE, để BE quyết định logic refund
    // Chỉ kiểm tra cơ bản: có subscription ID không
    return !!subscription.id;
  }, []);

  // Calculate total slots from subscription
  const getTotalSlots = useCallback((subscription: StudentPackageSubscription): number | null => {
    // Ưu tiên 1: totalSlotsSnapshot hoặc totalSlots từ subscription
    if (typeof subscription.totalSlotsSnapshot === 'number') {
      return subscription.totalSlotsSnapshot;
    }
    if (typeof subscription.totalSlots === 'number') {
      return subscription.totalSlots;
    }
    // Ưu tiên 2: Tính từ usedSlot + remainingSlots
    if (typeof subscription.remainingSlots === 'number') {
      return (subscription.usedSlot || 0) + subscription.remainingSlots;
    }
    // Ưu tiên 3: Parse từ packageName
    const nameMatch = subscription.packageName?.match(/(\d+)/);
    if (nameMatch) {
      const totalFromName = parseInt(nameMatch[1], 10);
      if (!isNaN(totalFromName)) {
        return totalFromName;
      }
    }
    return null;
  }, []);

  // Check if subscription can be renewed - removed FE validation, let BE handle it
  const canRenew = useCallback((subscription: StudentPackageSubscription): boolean => {
    // Chỉ kiểm tra status là ACTIVE, không kiểm tra % slot đã dùng (để BE quyết định)
    const status = subscription.status?.toUpperCase();
    return status === 'ACTIVE';
  }, []);

  const handleRenew = useCallback((subscription: StudentPackageSubscription) => {
    // Bỏ check canRenew để cho phép gọi API, BE sẽ validate và trả lỗi nếu không được phép gia hạn
    
    Alert.alert(
      'Xác nhận gia hạn',
      `Bạn có chắc chắn muốn gia hạn gói "${subscription.packageName}" cho ${subscription.studentName}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          style: 'default',
          onPress: async () => {
            try {
              setRenewingId(subscription.id);
              await packageService.renewSubscription(subscription.studentId);
              
              Alert.alert(
                'Thành công',
                'Đã gia hạn gói đăng ký thành công.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Refresh list
                      fetchAllSubscriptions();
                    },
                  },
                ]
              );
            } catch (err: any) {
              const message =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.message ||
                'Không thể gia hạn. Vui lòng thử lại.';
              
              Alert.alert('Lỗi', message);
            } finally {
              setRenewingId(null);
            }
          },
        },
      ]
    );
  }, [canRenew, fetchAllSubscriptions]);

  const handleRefund = useCallback((subscription: StudentPackageSubscription) => {
    // Bỏ check canRefund ở đây, để BE validate và trả lỗi phù hợp

    Alert.alert(
      'Xác nhận hoàn tiền',
      `Bạn có chắc chắn muốn hoàn tiền cho gói "${subscription.packageName}" của ${subscription.studentName}?\n\nGiá trị: ${formatCurrency(subscription.priceFinal)}`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          style: 'destructive',
          onPress: async () => {
            try {
              setRefundingId(subscription.id);
              await packageService.refundSubscription(subscription.id);
              
              Alert.alert(
                'Thành công',
                'Đã hoàn tiền gói đăng ký thành công.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Refresh list
                      fetchAllSubscriptions();
                    },
                  },
                ]
              );
            } catch (err: any) {
              const message =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.message ||
                'Không thể hoàn tiền. Vui lòng thử lại.';
              
              Alert.alert('Lỗi', message);
            } finally {
              setRefundingId(null);
            }
          },
        },
      ]
    );
  }, [canRefund, formatCurrency, fetchAllSubscriptions]);

  const getStatusColor = useCallback((status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return COLORS.SUCCESS;
      case 'PENDING':
        return COLORS.WARNING;
      case 'EXPIRED':
      case 'CANCELLED':
        return COLORS.TEXT_SECONDARY;
      default:
        return COLORS.TEXT_SECONDARY;
    }
  }, []);

  const getStatusText = useCallback((status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'Đang hoạt động';
      case 'PENDING':
        return 'Chờ xử lý';
      case 'EXPIRED':
        return 'Hết hạn';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return status;
    }
  }, []);

  if (loading && subscriptions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Đang tải danh sách gói đăng ký...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && subscriptions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={48} color={COLORS.ERROR} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchAllSubscriptions}
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
        {subscriptions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="card-membership" size={64} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.emptyText}>Chưa có gói đăng ký nào</Text>
          </View>
        ) : (
          subscriptions.map((subscription) => {
            const canRefundThis = canRefund(subscription);
            const canRenewThis = canRenew(subscription);
            const isRefunding = refundingId === subscription.id;
            const isRenewing = renewingId === subscription.id;

            return (
              <View key={subscription.id} style={styles.subscriptionCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.packageName}>{subscription.packageName}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(subscription.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(subscription.status) }]}>
                        {getStatusText(subscription.status)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="child-care" size={18} color={COLORS.PRIMARY} />
                    <Text style={styles.infoLabel}>Học sinh: </Text>
                    <Text style={styles.infoValue}>{subscription.studentName}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <MaterialIcons name="calendar-today" size={18} color={COLORS.PRIMARY} />
                    <Text style={styles.infoLabel}>Bắt đầu: </Text>
                    <Text style={styles.infoValue}>{formatDate(subscription.startDate)}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <MaterialIcons name="event" size={18} color={COLORS.PRIMARY} />
                    <Text style={styles.infoLabel}>Kết thúc: </Text>
                    <Text style={styles.infoValue}>{formatDate(subscription.endDate)}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <MaterialIcons name="event-available" size={18} color={COLORS.PRIMARY} />
                    <Text style={styles.infoLabel}>Đã dùng: </Text>
                    <Text style={[styles.infoValue, subscription.usedSlot > 0 && { color: COLORS.WARNING }]}>
                      {(() => {
                        const total = subscription.totalSlotsSnapshot ?? subscription.totalSlots;
                        let totalDisplay: number | string = '?';
                        if (typeof total === 'number') {
                          totalDisplay = total;
                        } else {
                          // Try to parse from packageName (e.g., "Khóa học 30 slot" or "15 slot")
                          const nameMatch = subscription.packageName?.match(/(\d+)/);
                          if (nameMatch) {
                            totalDisplay = parseInt(nameMatch[1], 10);
                          }
                        }
                        const used = subscription.usedSlot || 0;
                        return `${used}${typeof totalDisplay === 'number' ? ` / ${totalDisplay}` : ''} slot`;
                      })()}
                    </Text>
                  </View>

                  {subscription.remainingSlots !== null && subscription.remainingSlots !== undefined && (
                    <View style={styles.infoRow}>
                      <MaterialIcons name="event-busy" size={18} color={COLORS.SUCCESS} />
                      <Text style={styles.infoLabel}>Còn lại: </Text>
                      <Text style={[styles.infoValue, { color: COLORS.SUCCESS }]}>
                        {subscription.remainingSlots} slot
                      </Text>
                    </View>
                  )}

                  <View style={styles.infoRow}>
                    <MaterialIcons name="attach-money" size={18} color={COLORS.SECONDARY} />
                    <Text style={styles.infoLabel}>Giá trị: </Text>
                    <Text style={[styles.infoValue, { fontWeight: '600', color: COLORS.SECONDARY }]}>
                      {formatCurrency(subscription.priceFinal ?? packagePrices[subscription.id])}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionButtonsContainer}>
                  {canRenewThis && (
                    <TouchableOpacity
                      style={[styles.renewButton, isRenewing && styles.renewButtonDisabled]}
                      onPress={() => handleRenew(subscription)}
                      disabled={isRenewing || isRefunding}
                    >
                      {isRenewing ? (
                        <>
                          <ActivityIndicator size="small" color={COLORS.SURFACE} />
                          <Text style={styles.renewButtonText}>Đang xử lý...</Text>
                        </>
                      ) : (
                        <>
                          <MaterialIcons name="autorenew" size={20} color={COLORS.SURFACE} />
                          <Text style={styles.renewButtonText}>Gia hạn</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {canRefundThis && (
                    <TouchableOpacity
                      style={[styles.refundButton, isRefunding && styles.refundButtonDisabled]}
                      onPress={() => handleRefund(subscription)}
                      disabled={isRefunding || isRenewing}
                    >
                      {isRefunding ? (
                        <>
                          <ActivityIndicator size="small" color={COLORS.SURFACE} />
                          <Text style={styles.refundButtonText}>Đang xử lý...</Text>
                        </>
                      ) : (
                        <>
                          <MaterialIcons name="money-off" size={20} color={COLORS.SURFACE} />
                          <Text style={styles.refundButtonText}>Hoàn tiền</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {!canRefundThis && !canRenewThis && (
                    <View style={styles.cannotRefundNote}>
                      <MaterialIcons name="info-outline" size={16} color={COLORS.TEXT_SECONDARY} />
                      <Text style={styles.cannotRefundText}>
                        {subscription.usedSlot === 0 
                          ? 'Không thể hoàn tiền vì gói đã được nâng cấp'
                          : 'Không thể hoàn tiền vì đã sử dụng slot'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
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
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  errorText: {
    marginTop: SPACING.MD,
    fontSize: 16,
    color: COLORS.ERROR,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SPACING.LG,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.SURFACE,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.XL * 2,
  },
  emptyText: {
    marginTop: SPACING.MD,
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  subscriptionCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.MD,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  packageName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.SM,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    marginTop: SPACING.SM,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.XS,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  actionButtonsContainer: {
    marginTop: SPACING.MD,
    gap: SPACING.SM,
  },
  renewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderRadius: 8,
    gap: SPACING.XS,
  },
  renewButtonDisabled: {
    opacity: 0.6,
  },
  renewButtonText: {
    color: COLORS.SURFACE,
    fontSize: 16,
    fontWeight: '600',
  },
  refundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.ERROR,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderRadius: 8,
    gap: SPACING.XS,
  },
  refundButtonDisabled: {
    opacity: 0.6,
  },
  refundButtonText: {
    color: COLORS.SURFACE,
    fontSize: 16,
    fontWeight: '600',
  },
  cannotRefundNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderRadius: 8,
    marginTop: SPACING.MD,
    gap: SPACING.XS,
  },
  cannotRefundText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    fontStyle: 'italic',
  },
});

export default MySubscriptionsScreen;

