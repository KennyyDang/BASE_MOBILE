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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCurrentUserWallet, useStudentWallets } from '../../hooks/useWalletApi';
import { useMyChildren } from '../../hooks/useChildrenApi';
import { walletService } from '../../services/walletService';
import { TransferSmartRequest, DepositResponse } from '../../types/api';
import { RootStackParamList } from '../../types';
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
    XXXL: 32,
  },
};

const WALLET_TYPES = {
  MAIN: 'MAIN',
  ALLOWANCE: 'ALLOWANCE',
};

const WalletScreen: React.FC = () => {
  type WalletNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Wallet'>;

  const navigation = useNavigation<WalletNavigationProp>();
  const { data: walletData, loading, error, refetch } = useCurrentUserWallet();
  const { data: studentWallets, loading: studentWalletsLoading, error: studentWalletsError, refetch: refetchStudentWallets } = useStudentWallets();
  const { students } = useMyChildren();
  const [recentTransactions, setRecentTransactions] = useState<DepositResponse[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [topUpModalVisible, setTopUpModalVisible] = useState(false);
  const [selectedStudentWallet, setSelectedStudentWallet] = useState<any>(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);

  const navigateToTopUp = React.useCallback(() => {
    let currentNavigator: any = navigation;

    while (currentNavigator?.getParent) {
      const parent = currentNavigator.getParent();
      if (!parent) {
        break;
      }
      currentNavigator = parent;
    }

    const targetNavigator = currentNavigator ?? navigation;
    targetNavigator.navigate('TopUp');
  }, [navigation]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Get wallet type display text
  const getWalletTypeText = (type: string) => {
    if (type?.toLowerCase() === 'main') return 'Ví chính';
    if (type?.toLowerCase() === 'allowance') return 'Ví tiêu vặt';
    return type || 'Ví';
  };

  // Get student name from students list if not available in wallet
  const getStudentName = (studentWallet: any) => {
    // First try to get from wallet data
    if (studentWallet?.studentName) {
      return studentWallet.studentName;
    }
    // If not available, find from students list by studentId
    if (studentWallet?.studentId && students.length > 0) {
      const student = students.find(s => s.id === studentWallet.studentId);
      if (student?.name) {
        return student.name;
      }
    }
    return 'Chưa có tên';
  };

  const handleWalletPress = (walletType: string) => {
    const normalizedType = walletType?.toLowerCase();
    if (normalizedType === 'main' || normalizedType === WALLET_TYPES.MAIN.toLowerCase()) {
      handleParentWalletPress();
    }
  };

  const handleTopUp = () => {
    navigateToTopUp();
  };

  const handleTopUpStudent = (studentWallet: any) => {
    setSelectedStudentWallet(studentWallet);
    setTopUpAmount('');
    setTopUpModalVisible(true);
  };

  const handleConfirmTopUp = async () => {
    if (!selectedStudentWallet) return;

    if (!topUpAmount || !topUpAmount.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền');
      return;
    }

    const amount = parseInt(topUpAmount.replace(/[^\d]/g, ''));
    
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ');
      return;
    }

    if (amount < 10000) {
      Alert.alert('Lỗi', 'Số tiền nạp tối thiểu là 10,000 VNĐ');
      return;
    }

    if (walletData && walletData.balance < amount) {
      Alert.alert('Lỗi', 'Số dư ví chính không đủ để chuyển');
      return;
    }

    setTopUpLoading(true);
    try {
      // Call transfer-smart API
      const transferData: TransferSmartRequest = {
        toStudentId: selectedStudentWallet.studentId,
        amount: amount,
        note: `Nạp tiền cho ${selectedStudentWallet.studentName || 'con'}`,
      };

      await walletService.transferSmartToStudent(transferData);
      
      // Refresh wallets
      refetch();
      refetchStudentWallets();

      setTopUpModalVisible(false);
      setTopUpAmount('');
      setSelectedStudentWallet(null);

      Alert.alert(
        'Thành công',
        `Đã nạp ${formatCurrency(amount)} vào ví của ${selectedStudentWallet.studentName || 'con'} thành công!`,
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Không thể nạp tiền cho con';
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleTransactionHistory = () => {
    navigation.navigate('TransactionHistory');
  };

  const handleParentWalletPress = () => {
    navigation.navigate('TransactionHistory', {
      walletType: 'Parent',
    });
  };

  const handleStudentWalletPress = (studentWallet: any) => {
    navigation.navigate('TransactionHistory', {
      walletId: studentWallet.id,
      walletType: 'Student',
      studentName: getStudentName(studentWallet),
    });
  };

  const fetchRecentTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      const deposits = await walletService.getDeposits(1, 5);
      // Ensure deposits is always an array
      if (Array.isArray(deposits)) {
        setRecentTransactions(deposits);
      } else if (deposits && typeof deposits === 'object' && 'items' in deposits) {
        // Handle paginated response
        setRecentTransactions(Array.isArray((deposits as any).items) ? (deposits as any).items : []);
      } else {
        setRecentTransactions([]);
      }
    } catch (error: any) {
      // Error handled silently, ensure array is set
      setRecentTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentTransactions();
  }, [fetchRecentTransactions]);

  const formatTransactionTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) {
      const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      return `Hôm nay, ${timeStr}`;
    }
    if (diffDays === 1) {
      const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      return `Hôm qua, ${timeStr}`;
    }
    if (diffDays < 7) {
      const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      return `${diffDays} ngày trước, ${timeStr}`;
    }
    return date.toLocaleString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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

  // Show error alert
  React.useEffect(() => {
    if (error) {
      Alert.alert('Lỗi', error, [
        { text: 'Thử lại', onPress: () => refetch() },
        { text: 'Đóng', style: 'cancel' },
      ]);
    }
  }, [error]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading || studentWalletsLoading} onRefresh={() => {
            refetch();
            refetchStudentWallets();
          }} />
        }
      >
        {/* Wallet Overview */}
        <View style={styles.walletOverview}>
          <Text style={styles.sectionTitle}>Tổng quan ví tiền</Text>
          
          <View style={styles.totalBalanceCard}>
            <Text style={styles.totalBalanceLabel}>Tổng số dư</Text>
            {loading && !walletData ? (
              <ActivityIndicator size="large" color={COLORS.SURFACE} style={{ marginTop: SPACING.MD }} />
            ) : (
              <Text style={styles.totalBalanceAmount}>
                {walletData ? formatCurrency(walletData.balance) : '0 VNĐ'}
              </Text>
            )}
          </View>
        </View>

        {/* Main Wallet */}
        <View style={styles.walletSection}>
            <TouchableOpacity 
            style={styles.walletCard}
            onPress={handleParentWalletPress}
            activeOpacity={0.7}
          >
            <View style={styles.walletHeader}>
              <View style={[
                styles.walletIcon,
                walletData?.type?.toLowerCase() === 'allowance' && { backgroundColor: COLORS.SECONDARY }
              ]}>
                <MaterialIcons 
                  name={walletData?.type?.toLowerCase() === 'allowance' ? "child-care" : "account-balance-wallet"} 
                  size={32} 
                  color={COLORS.SURFACE} 
                />
              </View>
              <View style={styles.walletInfo}>
                <Text style={styles.walletTitle}>
                  {walletData ? getWalletTypeText(walletData.type) : 'Ví chính'}
                </Text>
                <Text style={styles.walletDescription}>
                  {walletData?.type?.toLowerCase() === 'main' 
                    ? 'Thanh toán học phí và phí thành viên'
                    : walletData?.type?.toLowerCase() === 'allowance'
                    ? 'Chi tiêu hàng ngày cho trẻ'
                    : 'Thanh toán học phí và phí thành viên'}
                </Text>
                {walletData?.studentName && (
                  <Text style={styles.studentNameText}>
                    Học sinh: {walletData.studentName}
                  </Text>
                )}
              </View>
              <MaterialIcons name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
            </View>
            
            <View style={styles.walletBalance}>
              <Text style={styles.walletBalanceLabel}>Số dư hiện tại</Text>
              {loading && !walletData ? (
                <ActivityIndicator size="small" color={COLORS.PRIMARY} />
              ) : walletData ? (
                <Text style={styles.walletBalanceAmount}>
                  {formatCurrency(walletData.balance)}
                </Text>
              ) : (
                <Text style={styles.walletBalanceAmount}>0 VNĐ</Text>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.topUpButton}
              onPress={handleTopUp}
            >
              <MaterialIcons name="add" size={20} color={COLORS.SURFACE} />
              <Text style={styles.topUpButtonText}>Nạp tiền</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* Allowance Info (only for Allowance wallet) */}
        {walletData?.type?.toLowerCase() === 'allowance' && (
          <View style={styles.walletSection}>
            <View style={styles.allowanceInfo}>
              <Text style={styles.allowanceInfoText}>
                Tự động nạp 100,000 VNĐ vào đầu mỗi tháng
              </Text>
              <Text style={styles.allowanceNextText}>
                Lần nạp tiếp theo: 1/10/2024
              </Text>
            </View>
          </View>
        )}

        {/* Student Wallets Section */}
        {studentWallets && studentWallets.length > 0 && (
          <View style={styles.walletSection}>
            <Text style={styles.sectionTitle}>Ví của con</Text>
            
            {studentWalletsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                <Text style={styles.loadingText}>Đang tải ví của con...</Text>
              </View>
            ) : (
              studentWallets.map((studentWallet) => (
                <TouchableOpacity
                  key={studentWallet.id}
                  style={styles.studentWalletCard}
                  onPress={() => handleStudentWalletPress(studentWallet)}
                  activeOpacity={0.7}
                >
                  <View style={styles.walletHeader}>
                    <View style={[styles.walletIcon, { backgroundColor: COLORS.SECONDARY }]}>
                      <MaterialIcons 
                        name="sentiment-satisfied" 
                        size={32} 
                        color={COLORS.SURFACE} 
                      />
                    </View>
                    <View style={styles.walletInfo}>
                      <Text style={styles.walletTitle}>
                        {getStudentName(studentWallet)}
                      </Text>
                      <Text style={styles.walletDescription}>
                        Ví tiêu vặt của con
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
                  </View>
                  
                  <View style={styles.walletBalance}>
                    <Text style={styles.walletBalanceLabel}>Số dư hiện tại</Text>
                    <Text style={styles.walletBalanceAmount}>
                      {formatCurrency(studentWallet.balance)}
                    </Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.topUpButton}
                    onPress={() => handleTopUpStudent(studentWallet)}
                  >
                    <MaterialIcons name="add" size={20} color={COLORS.SURFACE} />
                    <Text style={styles.topUpButtonText}>Nạp tiền</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
            
            {studentWalletsError && (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error" size={20} color={COLORS.ERROR} />
                <Text style={styles.errorText}>{studentWalletsError}</Text>
                <TouchableOpacity onPress={refetchStudentWallets} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
          
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={handleTransactionHistory}
            >
              <MaterialIcons name="history" size={24} color={COLORS.PRIMARY} />
              <Text style={styles.quickActionText}>Lịch sử giao dịch</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={navigateToTopUp}
            >
              <MaterialIcons name="account-balance" size={24} color={COLORS.SECONDARY} />
              <Text style={styles.quickActionText}>Nạp ví</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => {
                // TODO: Navigate to payment methods
              }}
            >
              <MaterialIcons name="payment" size={24} color={COLORS.ACCENT} />
              <Text style={styles.quickActionText}>Phương thức thanh toán</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => {
                // TODO: Navigate to wallet settings
              }}
            >
              <MaterialIcons name="settings" size={24} color={COLORS.WARNING} />
              <Text style={styles.quickActionText}>Cài đặt ví</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.recentTransactionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lịch sử nạp tiền</Text>
          </View>
          
          {transactionsLoading ? (
            <View style={styles.transactionCard}>
              <ActivityIndicator size="small" color={COLORS.PRIMARY} />
              <Text style={styles.loadingText}>Đang tải giao dịch...</Text>
            </View>
          ) : !recentTransactions || recentTransactions.length === 0 ? (
            <View style={styles.transactionCard}>
              <MaterialIcons name="receipt-long" size={32} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
            </View>
          ) : Array.isArray(recentTransactions) ? (
            recentTransactions
              .filter((transaction, index, self) => 
                index === self.findIndex((t) => t.id === transaction.id)
              )
              .map((transaction) => (
              <View
                key={transaction.id}
                style={styles.transactionCard}
              >
                <View style={styles.transactionIcon}>
                  <MaterialIcons 
                    name={getTransactionIcon(transaction.status)} 
                    size={24} 
                    color={getTransactionIconColor(transaction.status)} 
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDescription}>
                    {transaction.status === 'Completed' 
                      ? 'Nạp tiền vào ví' 
                      : transaction.status === 'Pending'
                      ? 'Đang xử lý nạp tiền'
                      : 'Giao dịch thất bại'}
                  </Text>
                  <Text style={styles.transactionTime}>
                    {formatTransactionTime(transaction.timestamp)}
                  </Text>
                </View>
                <Text style={[
                  styles.transactionAmount,
                  transaction.status === 'Completed' && { color: COLORS.SUCCESS }
                ]}>
                  {transaction.status === 'Completed' ? '+' : ''}
                  {transaction.amount.toLocaleString('vi-VN')} VNĐ
                </Text>
              </View>
            ))
          ) : null}
        </View>

        {/* Wallet Tips */}
        <View style={styles.tipsSection}>
          <View style={styles.tipsCard}>
            <MaterialIcons name="lightbulb-outline" size={24} color={COLORS.WARNING} />
            <View style={styles.tipsContent}>
              <Text style={styles.tipsTitle}>Mẹo sử dụng ví</Text>
              <Text style={styles.tipsText}>
                • Ví tiêu vặt tự động nạp 100,000 VNĐ mỗi tháng{'\n'}
                • Bạn có thể giới hạn chi tiêu theo danh mục{'\n'}
                • Nhận thông báo khi số dư thấp
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Top Up Modal for Student Wallet */}
      <Modal
        visible={topUpModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (!topUpLoading) {
            setTopUpModalVisible(false);
            setTopUpAmount('');
            setSelectedStudentWallet(null);
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Nạp tiền cho {selectedStudentWallet?.studentName || 'con'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (!topUpLoading) {
                    setTopUpModalVisible(false);
                    setTopUpAmount('');
                    setSelectedStudentWallet(null);
                  }
                }}
                disabled={topUpLoading}
              >
                <MaterialIcons name="close" size={24} color={COLORS.TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>
                Số dư ví chính: {formatCurrency(walletData?.balance || 0)}
              </Text>
              
              <Text style={styles.modalLabel}>Nhập số tiền muốn nạp (VNĐ)</Text>
              <TextInput
                style={styles.modalInput}
                value={topUpAmount}
                onChangeText={(text) => {
                  // Only allow numbers
                  const numericText = text.replace(/[^\d]/g, '');
                  setTopUpAmount(numericText);
                }}
                placeholder="Nhập số tiền (tối thiểu 10,000 VNĐ)"
                placeholderTextColor={COLORS.TEXT_SECONDARY}
                keyboardType="numeric"
                editable={!topUpLoading}
              />
              
              {topUpAmount && !isNaN(parseInt(topUpAmount)) && (
                <Text style={styles.modalPreview}>
                  Số tiền: {formatCurrency(parseInt(topUpAmount))}
                </Text>
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  if (!topUpLoading) {
                    setTopUpModalVisible(false);
                    setTopUpAmount('');
                    setSelectedStudentWallet(null);
                  }
                }}
                disabled={topUpLoading}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonCancelText]}>Hủy</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, topUpLoading && styles.modalButtonDisabled]}
                onPress={handleConfirmTopUp}
                disabled={topUpLoading}
              >
                {topUpLoading ? (
                  <ActivityIndicator size="small" color={COLORS.SURFACE} />
                ) : (
                  <Text style={styles.modalButtonText}>Nạp tiền</Text>
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
  scrollContent: {
    padding: SPACING.MD,
  },
  walletOverview: {
    marginBottom: SPACING.LG,
  },
  sectionTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  totalBalanceCard: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 16,
    padding: SPACING.LG,
    alignItems: 'center',
  },
  totalBalanceLabel: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.SURFACE,
    marginBottom: SPACING.SM,
  },
  totalBalanceAmount: {
    fontSize: FONTS.SIZES.XXXL,
    fontWeight: 'bold',
    color: COLORS.SURFACE,
  },
  walletSection: {
    marginBottom: SPACING.LG,
  },
  walletCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.LG,
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  walletIcon: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    padding: SPACING.MD,
    marginRight: SPACING.MD,
  },
  walletInfo: {
    flex: 1,
  },
  walletTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  walletDescription: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  walletBalance: {
    marginBottom: SPACING.MD,
  },
  walletBalanceLabel: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  walletBalanceAmount: {
    fontSize: FONTS.SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  topUpButton: {
    backgroundColor: COLORS.ACCENT,
    borderRadius: 8,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topUpButtonText: {
    color: COLORS.SURFACE,
    fontSize: FONTS.SIZES.MD,
    fontWeight: 'bold',
    marginLeft: SPACING.SM,
  },
  allowanceInfo: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 8,
    padding: SPACING.MD,
  },
  allowanceInfoText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  allowanceNextText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  quickActionsSection: {
    marginBottom: SPACING.LG,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    alignItems: 'center',
    width: '48%',
    marginBottom: SPACING.MD,
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.SM,
    textAlign: 'center',
  },
  recentTransactionsSection: {
    marginBottom: SPACING.LG,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  viewAllText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  transactionCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionIcon: {
    marginRight: SPACING.MD,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  transactionTime: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  transactionAmount: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  tipsSection: {
    marginBottom: SPACING.LG,
  },
  tipsCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipsContent: {
    flex: 1,
    marginLeft: SPACING.MD,
  },
  tipsTitle: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  tipsText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
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
  studentNameText: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.PRIMARY,
    marginTop: SPACING.XS,
    fontWeight: '500',
  },
  studentWalletCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.LG,
    marginBottom: SPACING.MD,
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  retryButton: {
    marginLeft: SPACING.SM,
    padding: SPACING.SM,
    backgroundColor: COLORS.ERROR,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.SURFACE,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.MD,
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
    marginBottom: SPACING.LG,
  },
  modalTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  modalBody: {
    marginBottom: SPACING.LG,
  },
  modalLabel: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.SURFACE,
    marginBottom: SPACING.SM,
  },
  modalPreview: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.PRIMARY,
    fontWeight: '600',
    marginTop: SPACING.XS,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.MD,
  },
  modalButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.LG,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginLeft: SPACING.SM,
  },
  modalButtonCancel: {
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginLeft: 0,
  },
  modalButtonCancelText: {
    color: COLORS.TEXT_PRIMARY,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
});

export default WalletScreen;
