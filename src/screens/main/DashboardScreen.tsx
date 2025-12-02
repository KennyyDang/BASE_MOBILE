import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useCurrentUserWallet, useStudentWallets } from '../../hooks/useWalletApi';
import { useMyChildren } from '../../hooks/useChildrenApi';
import studentSlotService from '../../services/studentSlotService';
import branchSlotService from '../../services/branchSlotService';
import walletService from '../../services/walletService';
import transactionService from '../../services/transactionService';
import { StudentSlotResponse, BranchSlotRoomResponse, TransactionResponse } from '../../types/api';
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
  },
};

type DashboardNavigationProp = StackNavigationProp<RootStackParamList>;

const DashboardScreen: React.FC = () => {
  const { logout } = useAuth();
  const navigation = useNavigation<DashboardNavigationProp>();
  const { data: walletData, loading: walletLoading } = useCurrentUserWallet();
  const { data: studentWallets, loading: studentWalletsLoading } = useStudentWallets();
  const { students } = useMyChildren();
  
  const [upcomingSlots, setUpcomingSlots] = useState<StudentSlotResponse[]>([]);
  const [allUpcomingSlots, setAllUpcomingSlots] = useState<StudentSlotResponse[]>([]); // Store all slots for counting
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<StudentSlotResponse | null>(null);
  const [slotDetailModalVisible, setSlotDetailModalVisible] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<TransactionResponse[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatTime = (time?: string | null) => {
    if (!time) return '--:--';
    const parts = time.split(':');
    if (parts.length < 2) return time;
    const hours = parts[0]?.padStart(2, '0') ?? '--';
    const minutes = parts[1]?.padStart(2, '0') ?? '00';
    return `${hours}:${minutes}`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleString('vi-VN'),
    };
  };

  const fetchUpcomingSlots = useCallback(async () => {
    if (students.length === 0) {
      setUpcomingSlots([]);
      return;
    }

    setSlotsLoading(true);
    try {
      const now = new Date();
      const allUpcomingSlots: StudentSlotResponse[] = [];

      // Fetch slots for all students
      for (const student of students) {
        try {
          const response = await studentSlotService.getStudentSlots({
            studentId: student.id,
            pageIndex: 1,
            pageSize: 100, // Increase to get more slots for accurate counting
            upcomingOnly: true,
            // Bỏ filter status để lấy tất cả các slot đã đặt (Booked, Confirmed, Active, etc.)
          });

          const studentSlots = response.items || [];
          
          // Filter out cancelled slots
          const activeSlots = studentSlots.filter((slot) => {
            const status = (slot.status || '').toLowerCase();
            return status !== 'cancelled';
          });
          
          // Enrich with branch slot and room info
          for (const slot of activeSlots) {
            // Parse date và so sánh chính xác hơn (bỏ thời gian, chỉ so sánh ngày)
            const slotDate = new Date(slot.date);
            slotDate.setHours(0, 0, 0, 0);
            const today = new Date(now);
            today.setHours(0, 0, 0, 0);
            
            // Chỉ lấy các slot từ hôm nay trở đi (bao gồm cả hôm nay)
            if (slotDate >= today) {
              try {
                // Fetch branch slot details
                const branchSlot = await branchSlotService.getBranchSlotById(slot.branchSlotId, student.id);
                
                // Fetch room details
                let room: BranchSlotRoomResponse | null = null;
                if (slot.roomId) {
                  try {
                    const roomsResponse = await branchSlotService.getRoomsBySlot(slot.branchSlotId, 1, 10);
                    room = roomsResponse.items.find(r => r.id === slot.roomId) || null;
                  } catch (err) {
                    // Room fetch failed, continue without room info
                  }
                }

                // Map branchSlot to match StudentSlotResponse structure
                const mappedBranchSlot = branchSlot && branchSlot.branch?.branchName
                  ? {
                      id: branchSlot.id,
                      branchName: branchSlot.branch.branchName,
                    }
                  : undefined;

                // Map room to match StudentSlotResponse structure
                const mappedRoom = room
                  ? {
                      id: room.id,
                      roomName: room.roomName,
                    }
                  : undefined;

                allUpcomingSlots.push({
                  ...slot,
                  branchSlot: mappedBranchSlot,
                  room: mappedRoom,
                });
              } catch (err) {
                // If enrichment fails, still add the slot without extra info
                allUpcomingSlots.push({
                  ...slot,
                  branchSlot: undefined,
                  room: undefined,
                });
              }
            }
          }
        } catch (err) {
          // Continue with other students if one fails
        }
      }

      // Sort by date
      const sorted = allUpcomingSlots.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      // Store all slots for counting
      setAllUpcomingSlots(sorted);
      // Display only top 5 for the list
      setUpcomingSlots(sorted.slice(0, 5));
    } catch (error: any) {
      // Error handled silently, slots will remain empty
    } finally {
      setSlotsLoading(false);
    }
  }, [students]);

  useEffect(() => {
    fetchUpcomingSlots();
  }, [fetchUpcomingSlots]);

  const fetchRecentTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      const response = await transactionService.getMyTransactions({
        pageIndex: 1,
        pageSize: 5,
      });
      setRecentTransactions(response.items || []);
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
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const transactionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Format time: HH:mm
    const timeStr = date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });

    // Same day
    if (transactionDate.getTime() === today.getTime()) {
      if (diffMins < 1) return `Vừa xong, ${timeStr}`;
      if (diffMins < 60) return `Hôm nay, ${timeStr}`;
      return `Hôm nay, ${timeStr}`;
    }

    // Yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (transactionDate.getTime() === yesterday.getTime()) {
      return `Hôm qua, ${timeStr}`;
    }

    // Within 7 days
    if (diffDays < 7) {
      const dayName = date.toLocaleDateString('vi-VN', { weekday: 'long' });
      return `${dayName}, ${timeStr}`;
    }

    // Older than 7 days
    const dateStr = date.toLocaleDateString('vi-VN', { 
      day: 'numeric', 
      month: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
    return `${dateStr}, ${timeStr}`;
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'Deposit': return 'add-circle';
      case 'TransferIn': return 'arrow-downward';
      case 'TransferOut': return 'arrow-upward';
      case 'PackagePayment': return 'shopping-bag';
      case 'Refund': return 'undo';
      case 'OrderPayment': return 'receipt';
      case 'Tuition': return 'school';
      case 'Canteen': return 'restaurant';
      case 'Game': return 'videogame-asset';
      case 'ServicePurchase': return 'room-service';
      default: return 'account-balance-wallet';
    }
  };

  const getTransactionIconBackground = (type: string, amount: number) => {
    // Positive amount (income) = light green, negative (expense) = light red
    if (amount > 0) return COLORS.SUCCESS_BG || '#E8F5E9';
    if (amount < 0) return COLORS.ERROR_BG || '#FFEBEE';
    return COLORS.PRIMARY_LIGHT || '#E0F2F1';
  };

  const getTransactionIconColor = (type: string, amount: number) => {
    // Positive amount (income) = green, negative (expense) = red
    if (amount > 0) return COLORS.SUCCESS;
    if (amount < 0) return COLORS.ERROR;
    return COLORS.PRIMARY;
  };

  const getTransactionDescription = (transaction: TransactionResponse) => {
    if (transaction.description) return transaction.description;
    switch (transaction.type) {
      case 'Deposit': return 'Nạp tiền vào ví';
      case 'TransferIn': return 'Nhận tiền chuyển khoản';
      case 'TransferOut': return 'Chuyển tiền đi';
      case 'PackagePayment': return 'Thanh toán mua gói';
      case 'Refund': return 'Hoàn tiền hủy gói';
      case 'OrderPayment': return 'Thanh toán đơn hàng';
      case 'Tuition': return 'Thanh toán học phí';
      case 'Canteen': return 'Mua đồ ăn buffet';
      case 'Game': return 'Chơi game';
      case 'ServicePurchase': return 'Mua dịch vụ';
      default: return 'Giao dịch';
    }
  };

  const handleViewSlotDetail = (slot: StudentSlotResponse) => {
    setSelectedSlot(slot);
    setSlotDetailModalVisible(true);
  };

  const getClassTimeRange = (slot: StudentSlotResponse) => {
    if (slot.timeframe?.startTime && slot.timeframe?.endTime) {
      return `${formatTime(slot.timeframe.startTime)} - ${formatTime(slot.timeframe.endTime)}`;
    }
    // Fallback to booking date time if no timeframe
    return formatDateTime(slot.date).time;
  };

  const getClassName = (slot: StudentSlotResponse) => {
    return slot.timeframe?.name || 'Lớp học';
  };

  const getRoomName = (slot: StudentSlotResponse) => {
    return slot.room?.roomName || 'Chưa có thông tin phòng';
  };
  
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'schedule':
        navigation.navigate('Schedule');
        break;
      case 'wallet':
        navigation.navigate('Main', { screen: 'Wallet' });
        break;
      case 'transactionHistory':
        navigation.navigate('TransactionHistory');
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
      case 'subscriptions':
        navigation.navigate('MySubscriptions');
        break;
      case 'bookedClasses':
        navigation.navigate('Main', { screen: 'BookedClasses' });
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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchUpcomingSlots(),
      fetchRecentTransactions(),
    ]);
    setRefreshing(false);
  }, [fetchUpcomingSlots, fetchRecentTransactions]);

  const handleLogout = () => {
    logout();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
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
          <TouchableOpacity 
            style={[styles.statCard, styles.statCardClickable]}
            onPress={() => handleQuickAction('schedule')}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: COLORS.PRIMARY_LIGHT }]}>
              <MaterialIcons name="schedule" size={24} color={COLORS.PRIMARY} />
            </View>
            {slotsLoading ? (
              <ActivityIndicator size="small" color={COLORS.TEXT_PRIMARY} style={{ marginTop: SPACING.SM }} />
            ) : (
              <Text style={styles.statNumber}>
                {allUpcomingSlots.filter(slot => {
                  const slotDate = new Date(slot.date);
                  const today = new Date();
                  // Compare only date part (ignore time)
                  return slotDate.getFullYear() === today.getFullYear() &&
                         slotDate.getMonth() === today.getMonth() &&
                         slotDate.getDate() === today.getDate();
                }).length}
              </Text>
            )}
            <Text style={styles.statLabel}>Lớp học hôm nay</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statCard, styles.statCardClickable]}
            onPress={() => handleQuickAction('wallet')}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: COLORS.SUCCESS_BG }]}>
              <MaterialIcons name="account-balance-wallet" size={24} color={COLORS.SECONDARY} />
            </View>
            {walletLoading ? (
              <ActivityIndicator size="small" color={COLORS.TEXT_PRIMARY} style={{ marginTop: SPACING.SM }} />
            ) : (
              <Text style={styles.statNumber}>
                {walletData ? (walletData.balance / 1000).toFixed(0) + 'k' : '0'}
              </Text>
            )}
            <Text style={styles.statLabel}>Ví phụ huynh</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statCard, styles.statCardClickable]}
            onPress={() => handleQuickAction('wallet')}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: COLORS.WARNING_BG }]}>
              <MaterialIcons name="child-care" size={24} color={COLORS.WARNING} />
            </View>
            {studentWalletsLoading ? (
              <ActivityIndicator size="small" color={COLORS.TEXT_PRIMARY} style={{ marginTop: SPACING.SM }} />
            ) : (
              <Text style={styles.statNumber}>
                {studentWallets && studentWallets.length > 0 
                  ? (studentWallets.reduce((total, wallet) => total + wallet.balance, 0) / 1000).toFixed(0) + 'k'
                  : '0'}
              </Text>
            )}
            <Text style={styles.statLabel}>
              {students.length > 0 ? `${students.length} con` : 'Chưa có con'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
          
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => handleQuickAction('schedule')}
            >
              <MaterialIcons name="event-available" size={32} color={COLORS.PRIMARY} />
              <Text style={styles.quickActionText}>Đặt Lịch Học</Text>
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
              onPress={() => handleQuickAction('notifications')}
            >
              <MaterialIcons name="notifications" size={32} color={COLORS.ERROR} />
              <Text style={styles.quickActionText}>Thông báo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => handleQuickAction('subscriptions')}
            >
              <MaterialIcons name="card-membership" size={32} color={COLORS.ACCENT} />
              <Text style={styles.quickActionText}>Gói đăng ký</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => handleQuickAction('bookedClasses')}
            >
              <MaterialIcons name="event-available" size={32} color={COLORS.SUCCESS} />
              <Text style={styles.quickActionText}>Lớp đã đặt</Text>
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lớp học sắp tới</Text>
            <TouchableOpacity onPress={() => handleQuickAction('schedule')}>
              <Text style={styles.seeAllText}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          
          {slotsLoading ? (
            <View style={styles.classCard}>
              <ActivityIndicator size="small" color={COLORS.PRIMARY} />
              <Text style={styles.loadingText}>Đang tải lịch học...</Text>
            </View>
          ) : upcomingSlots.length === 0 ? (
            <View style={styles.classCard}>
              <MaterialIcons name="event-busy" size={32} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.emptyText}>Chưa có lớp học sắp tới</Text>
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => handleQuickAction('schedule')}
              >
                <Text style={styles.emptyButtonText}>Đặt lịch học ngay</Text>
              </TouchableOpacity>
            </View>
          ) : (
            upcomingSlots.map((slot) => {
              const slotDate = new Date(slot.date);
              const isToday = slotDate.toDateString() === new Date().toDateString();
              const isTomorrow = slotDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
              
              return (
                <TouchableOpacity
                  key={slot.id}
                  style={styles.classCard}
                  onPress={() => handleViewSlotDetail(slot)}
                  activeOpacity={0.85}
                >
                  <View style={styles.classInfo}>
                    <Text style={styles.className}>{getClassName(slot)}</Text>
                    <Text style={styles.classTime}>
                      {getClassTimeRange(slot)}
                      {isToday ? ' • Hôm nay' : isTomorrow ? ' • Ngày mai' : ` • ${formatDateTime(slot.date).date.split(',')[0]}`}
                    </Text>
                    <Text style={styles.classRoom}>{getRoomName(slot)}</Text>
                    {slot.branchSlot?.branchName && (
                      <Text style={styles.classBranch}>{slot.branchSlot.branchName}</Text>
                    )}
                  </View>
                  <View style={styles.classStatus}>
                    <Text style={styles.classStatusText}>Đã đặt</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Recent Transactions */}
        <View style={styles.recentTransactionsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
            <TouchableOpacity onPress={() => handleQuickAction('transactionHistory')}>
              <Text style={styles.seeAllText}>Xem tất cả</Text>
            </TouchableOpacity>
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
              <TouchableOpacity
                key={transaction.id}
                style={styles.transactionCard}
                onPress={() => {
                  navigation.navigate('TransactionDetail', {
                    transactionId: transaction.id,
                    transaction: transaction,
                  });
                }}
                activeOpacity={0.85}
              >
                <View style={[
                  styles.transactionIconContainer,
                  { backgroundColor: getTransactionIconBackground(transaction.type, transaction.amount) }
                ]}>
                  <MaterialIcons 
                    name={getTransactionIcon(transaction.type) as any} 
                    size={20} 
                    color={getTransactionIconColor(transaction.type, transaction.amount)} 
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDescription} numberOfLines={1}>
                    {getTransactionDescription(transaction)}
                  </Text>
                  <Text style={styles.transactionTime}>
                    {formatTransactionTime(transaction.timestamp)}
                  </Text>
                </View>
                <Text style={[
                  styles.transactionAmount,
                  { color: getTransactionIconColor(transaction.type, transaction.amount) }
                ]}>
                  {transaction.amount > 0 ? '+' : ''}
                  {Math.abs(transaction.amount).toLocaleString('vi-VN')} VNĐ
                </Text>
              </TouchableOpacity>
            ))
          ) : null}
        </View>
      </ScrollView>

      {/* Slot Detail Modal */}
      <Modal
        visible={slotDetailModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSlotDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết lịch học</Text>
              <TouchableOpacity onPress={() => setSlotDetailModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>
            
            {selectedSlot && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.slotDetailSection}>
                  <View style={styles.slotDetailRow}>
                    <MaterialIcons name="event" size={20} color={COLORS.PRIMARY} />
                    <View style={styles.slotDetailContent}>
                      <Text style={styles.slotDetailLabel}>Ngày học</Text>
                      <Text style={styles.slotDetailValue}>
                        {formatDateTime(selectedSlot.date).date}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.slotDetailRow}>
                    <MaterialIcons name="access-time" size={20} color={COLORS.SECONDARY} />
                    <View style={styles.slotDetailContent}>
                      <Text style={styles.slotDetailLabel}>Giờ học</Text>
                      <Text style={styles.slotDetailValue}>
                        {getClassTimeRange(selectedSlot)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.slotDetailRow}>
                    <MaterialIcons name="meeting-room" size={20} color={COLORS.ACCENT} />
                    <View style={styles.slotDetailContent}>
                      <Text style={styles.slotDetailLabel}>Phòng học</Text>
                      <Text style={styles.slotDetailValue}>
                        {getRoomName(selectedSlot)}
                      </Text>
                    </View>
                  </View>

                  {selectedSlot.branchSlot?.branchName && (
                    <View style={styles.slotDetailRow}>
                      <MaterialIcons name="location-on" size={20} color={COLORS.SECONDARY} />
                      <View style={styles.slotDetailContent}>
                        <Text style={styles.slotDetailLabel}>Chi nhánh</Text>
                        <Text style={styles.slotDetailValue}>
                          {selectedSlot.branchSlot.branchName}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.slotDetailRow}>
                    <MaterialIcons name="check-circle" size={20} color={COLORS.SUCCESS} />
                    <View style={styles.slotDetailContent}>
                      <Text style={styles.slotDetailLabel}>Trạng thái</Text>
                      <Text style={styles.slotDetailValue}>
                        {selectedSlot.status === 'Booked' ? 'Đã đặt' : selectedSlot.status}
                      </Text>
                    </View>
                  </View>

                  {selectedSlot.parentNote && (
                    <View style={styles.slotDetailRow}>
                      <MaterialIcons name="note" size={20} color={COLORS.ACCENT} />
                      <View style={styles.slotDetailContent}>
                        <Text style={styles.slotDetailLabel}>Ghi chú của phụ huynh</Text>
                        <Text style={styles.slotDetailValue}>{selectedSlot.parentNote}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonFull]}
                onPress={() => setSlotDetailModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Đóng</Text>
              </TouchableOpacity>
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
  statCardClickable: {
    // Add visual feedback for clickable cards
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.SM,
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
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.MD,
  },
  transactionInfo: {
    flex: 1,
    marginRight: SPACING.SM,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  seeAllText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.SM,
  },
  emptyText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.SM,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: SPACING.MD,
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: COLORS.SURFACE,
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
  },
  classBranch: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS,
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
    maxHeight: '80%',
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
    marginBottom: SPACING.MD,
    maxHeight: 400,
  },
  slotDetailSection: {
    marginBottom: SPACING.MD,
  },
  slotDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.MD,
    paddingBottom: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  slotDetailContent: {
    flex: 1,
    marginLeft: SPACING.MD,
  },
  slotDetailLabel: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  slotDetailValue: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.MD,
  },
  modalButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.LG,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonFull: {
    flex: 1,
  },
  modalButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
});

export default DashboardScreen;
