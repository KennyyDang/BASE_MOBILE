import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useCurrentUserWallet, useStudentWallets } from '../../hooks/useWalletApi';

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

const DashboardScreen: React.FC = () => {
  const { logout } = useAuth();
  const navigation = useNavigation<any>();
  const { data: walletData, loading: walletLoading } = useCurrentUserWallet();
  const { data: studentWallets, loading: studentWalletsLoading } = useStudentWallets();
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };
  
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'schedule':
        navigation.navigate('Main', { screen: 'Schedule' });
        break;
      case 'wallet':
        navigation.navigate('Main', { screen: 'Wallet' });
        break;
      case 'children':
        navigation.navigate('Main', { screen: 'Children' });
        break;
      case 'notifications':
        navigation.navigate('Notifications');
        break;
      case 'profile':
        navigation.navigate('Main', { screen: 'Profile' });
        break;
      case 'help':
        Alert.alert(
          'Hỗ trợ',
          'Liên hệ hỗ trợ:\n\n📧 Email: support@brighway.edu.vn\n📞 Hotline: 1900-xxxx\n\nHoặc đến trực tiếp trung tâm để được hỗ trợ.',
          [{ text: 'Đóng', style: 'default' }]
        );
        break;
      default:
        break;
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeHeader}>
            <View style={styles.welcomeText}>
              <Text style={styles.welcomeTitle}>Xin chào!</Text>
              <Text style={styles.welcomeSubtitle}>
                Chào mừng bạn đến với BASE - Hệ thống quản lý trung tâm đào tạo Brighway
              </Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <MaterialIcons name="logout" size={24} color={COLORS.ERROR} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialIcons name="schedule" size={24} color={COLORS.PRIMARY} />
            <Text style={styles.statNumber}>3</Text>
            <Text style={styles.statLabel}>Lớp học hôm nay</Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialIcons 
              name={walletData?.type?.toLowerCase() === 'main' ? "account-balance-wallet" : "child-care"} 
              size={24} 
              color={walletData?.type?.toLowerCase() === 'main' ? COLORS.SECONDARY : COLORS.ACCENT} 
            />
            {walletLoading ? (
              <ActivityIndicator size="small" color={COLORS.TEXT_PRIMARY} style={{ marginTop: SPACING.SM }} />
            ) : (
              <Text style={styles.statNumber}>
                {walletData ? walletData.balance.toLocaleString('vi-VN') : '0'}
              </Text>
            )}
            <Text style={styles.statLabel}>
              {walletData?.type?.toLowerCase() === 'main' 
                ? 'VNĐ trong ví chính'
                : walletData?.type?.toLowerCase() === 'allowance'
                ? 'VNĐ ví tiêu vặt'
                : 'VNĐ'}
            </Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialIcons name="child-care" size={24} color={COLORS.SECONDARY} />
            {studentWalletsLoading ? (
              <ActivityIndicator size="small" color={COLORS.TEXT_PRIMARY} style={{ marginTop: SPACING.SM }} />
            ) : (
              <Text style={styles.statNumber}>
                {studentWallets && studentWallets.length > 0 
                  ? studentWallets.reduce((total, wallet) => total + wallet.balance, 0).toLocaleString('vi-VN')
                  : '0'}
              </Text>
            )}
            <Text style={styles.statLabel}>
              {studentWallets && studentWallets.length > 0 
                ? 'VNĐ ví của con'
                : 'Chưa có ví con'}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
          
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => handleQuickAction('schedule')}
            >
              <MaterialIcons name="schedule" size={32} color={COLORS.PRIMARY} />
              <Text style={styles.quickActionText}>Xem lịch học</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => handleQuickAction('wallet')}
            >
              <MaterialIcons name="account-balance-wallet" size={32} color={COLORS.SECONDARY} />
              <Text style={styles.quickActionText}>Ví tiền</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => handleQuickAction('profile')}
            >
              <MaterialIcons name="person" size={32} color={COLORS.ACCENT} />
              <Text style={styles.quickActionText}>Hồ sơ cá nhân</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => handleQuickAction('children')}
            >
              <MaterialIcons name="child-care" size={32} color={COLORS.WARNING} />
              <Text style={styles.quickActionText}>Quản lý con</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => handleQuickAction('notifications')}
            >
              <MaterialIcons name="notifications" size={32} color={COLORS.ERROR} />
              <Text style={styles.quickActionText}>Thông báo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => handleQuickAction('help')}
            >
              <MaterialIcons name="help" size={32} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.quickActionText}>Hỗ trợ</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Upcoming Classes */}
        <View style={styles.upcomingClassesContainer}>
          <Text style={styles.sectionTitle}>Lớp học sắp tới</Text>
          
          <TouchableOpacity 
            style={styles.classCard}
            onPress={() => handleQuickAction('schedule')}
          >
            <View style={styles.classInfo}>
              <Text style={styles.className}>Toán học - Lớp 5</Text>
              <Text style={styles.classTime}>14:00 - 15:30</Text>
              <Text style={styles.classRoom}>Phòng A101</Text>
            </View>
            <View style={styles.classStatus}>
              <Text style={styles.classStatusText}>Sắp bắt đầu</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.classCard}
            onPress={() => handleQuickAction('schedule')}
          >
            <View style={styles.classInfo}>
              <Text style={styles.className}>Tiếng Anh - Giao tiếp</Text>
              <Text style={styles.classTime}>16:00 - 17:00</Text>
              <Text style={styles.classRoom}>Phòng B202</Text>
            </View>
            <View style={styles.classStatus}>
              <Text style={styles.classStatusText}>Đã đăng ký</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions */}
        <View style={styles.recentTransactionsContainer}>
          <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
          
          <TouchableOpacity 
            style={styles.transactionCard}
            onPress={() => handleQuickAction('wallet')}
          >
            <MaterialIcons name="add-circle" size={24} color={COLORS.SUCCESS} />
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionDescription}>Nạp tiền vào ví chính</Text>
              <Text style={styles.transactionTime}>2 giờ trước</Text>
            </View>
            <Text style={styles.transactionAmount}>+500,000 VNĐ</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.transactionCard}
            onPress={() => handleQuickAction('wallet')}
          >
            <MaterialIcons name="remove-circle" size={24} color={COLORS.SECONDARY} />
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionDescription}>Mua đồ ăn vặt</Text>
              <Text style={styles.transactionTime}>1 ngày trước</Text>
            </View>
            <Text style={styles.transactionAmount}>-25,000 VNĐ</Text>
          </TouchableOpacity>
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
  welcomeSection: {
    marginBottom: SPACING.LG,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeText: {
    flex: 1,
    marginRight: SPACING.MD,
  },
  logoutButton: {
    padding: SPACING.SM,
    borderRadius: 8,
    backgroundColor: COLORS.SURFACE,
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  welcomeTitle: {
    fontSize: FONTS.SIZES.XXL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  welcomeSubtitle: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.LG,
  },
  statCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: SPACING.XS,
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.SM,
  },
  statLabel: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.XS,
  },
  quickActionsContainer: {
    marginBottom: SPACING.LG,
  },
  sectionTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
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
    width: '31%',
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
  upcomingClassesContainer: {
    marginBottom: SPACING.LG,
  },
  classCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  classTime: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  classRoom: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  classStatus: {
    backgroundColor: COLORS.PRIMARY_LIGHT,
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 16,
  },
  classStatusText: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.SURFACE,
    fontWeight: 'bold',
  },
  recentTransactionsContainer: {
    marginBottom: SPACING.LG,
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
  transactionInfo: {
    flex: 1,
    marginLeft: SPACING.MD,
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
});

export default DashboardScreen;
