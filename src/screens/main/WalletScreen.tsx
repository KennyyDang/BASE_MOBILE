import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, WALLET_TYPES } from '../../constants';

const WalletScreen: React.FC = () => {
  const handleWalletPress = (walletType: string) => {
    console.log('Navigate to wallet details:', walletType);
    // TODO: Navigate to specific wallet screen
  };

  const handleTopUp = (walletType: string) => {
    console.log('Navigate to top up:', walletType);
    // TODO: Navigate to top up screen
  };

  const handleTransactionHistory = () => {
    console.log('Navigate to transaction history');
    // TODO: Navigate to transaction history screen
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Wallet Overview */}
        <View style={styles.walletOverview}>
          <Text style={styles.sectionTitle}>Tổng quan ví tiền</Text>
          
          <View style={styles.totalBalanceCard}>
            <Text style={styles.totalBalanceLabel}>Tổng số dư</Text>
            <Text style={styles.totalBalanceAmount}>300,000 VNĐ</Text>
          </View>
        </View>

        {/* Main Wallet */}
        <View style={styles.walletSection}>
          <TouchableOpacity 
            style={styles.walletCard}
            onPress={() => handleWalletPress(WALLET_TYPES.MAIN)}
          >
            <View style={styles.walletHeader}>
              <View style={styles.walletIcon}>
                <MaterialIcons name="account-balance-wallet" size={32} color={COLORS.SURFACE} />
              </View>
              <View style={styles.walletInfo}>
                <Text style={styles.walletTitle}>Ví chính</Text>
                <Text style={styles.walletDescription}>Thanh toán học phí và phí thành viên</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
            </View>
            
            <View style={styles.walletBalance}>
              <Text style={styles.walletBalanceLabel}>Số dư hiện tại</Text>
              <Text style={styles.walletBalanceAmount}>250,000 VNĐ</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.topUpButton}
              onPress={() => handleTopUp(WALLET_TYPES.MAIN)}
            >
              <MaterialIcons name="add" size={20} color={COLORS.SURFACE} />
              <Text style={styles.topUpButtonText}>Nạp tiền</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* Allowance Wallet */}
        <View style={styles.walletSection}>
          <TouchableOpacity 
            style={styles.walletCard}
            onPress={() => handleWalletPress(WALLET_TYPES.ALLOWANCE)}
          >
            <View style={styles.walletHeader}>
              <View style={[styles.walletIcon, { backgroundColor: COLORS.SECONDARY }]}>
                <MaterialIcons name="child-care" size={32} color={COLORS.SURFACE} />
              </View>
              <View style={styles.walletInfo}>
                <Text style={styles.walletTitle}>Ví tiêu vặt</Text>
                <Text style={styles.walletDescription}>Chi tiêu hàng ngày cho trẻ</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
            </View>
            
            <View style={styles.walletBalance}>
              <Text style={styles.walletBalanceLabel}>Số dư hiện tại</Text>
              <Text style={styles.walletBalanceAmount}>50,000 VNĐ</Text>
            </View>
            
            <View style={styles.allowanceInfo}>
              <Text style={styles.allowanceInfoText}>
                Tự động nạp 100,000 VNĐ vào đầu mỗi tháng
              </Text>
              <Text style={styles.allowanceNextText}>
                Lần nạp tiếp theo: 1/10/2024
              </Text>
            </View>
          </TouchableOpacity>
        </View>

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
              onPress={() => handleTopUp(WALLET_TYPES.MAIN)}
            >
              <MaterialIcons name="account-balance" size={24} color={COLORS.SECONDARY} />
              <Text style={styles.quickActionText}>Nạp ví chính</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => console.log('Payment methods')}
            >
              <MaterialIcons name="payment" size={24} color={COLORS.ACCENT} />
              <Text style={styles.quickActionText}>Phương thức thanh toán</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => console.log('Wallet settings')}
            >
              <MaterialIcons name="settings" size={24} color={COLORS.WARNING} />
              <Text style={styles.quickActionText}>Cài đặt ví</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.recentTransactionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
            <TouchableOpacity onPress={handleTransactionHistory}>
              <Text style={styles.viewAllText}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.transactionCard}>
            <View style={styles.transactionIcon}>
              <MaterialIcons name="add-circle" size={24} color={COLORS.SUCCESS} />
            </View>
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionDescription}>Nạp tiền vào ví chính</Text>
              <Text style={styles.transactionTime}>Hôm nay, 14:30</Text>
            </View>
            <Text style={styles.transactionAmount}>+500,000 VNĐ</Text>
          </View>
          
          <View style={styles.transactionCard}>
            <View style={styles.transactionIcon}>
              <MaterialIcons name="remove-circle" size={24} color={COLORS.SECONDARY} />
            </View>
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionDescription}>Mua đồ ăn vặt</Text>
              <Text style={styles.transactionTime}>Hôm qua, 16:45</Text>
            </View>
            <Text style={styles.transactionAmount}>-25,000 VNĐ</Text>
          </View>
          
          <View style={styles.transactionCard}>
            <View style={styles.transactionIcon}>
              <MaterialIcons name="remove-circle" size={24} color={COLORS.SECONDARY} />
            </View>
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionDescription}>Mua đồ chơi</Text>
              <Text style={styles.transactionTime}>2 ngày trước, 15:20</Text>
            </View>
            <Text style={styles.transactionAmount}>-45,000 VNĐ</Text>
          </View>
          
          <View style={styles.transactionCard}>
            <View style={styles.transactionIcon}>
              <MaterialIcons name="account-balance-wallet" size={24} color={COLORS.PRIMARY} />
            </View>
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionDescription}>Thanh toán học phí tháng 9</Text>
              <Text style={styles.transactionTime}>3 ngày trước, 10:00</Text>
            </View>
            <Text style={styles.transactionAmount}>-2,500,000 VNĐ</Text>
          </View>
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
    backgroundColor: COLORS.PRIMARY,
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
});

export default WalletScreen;
