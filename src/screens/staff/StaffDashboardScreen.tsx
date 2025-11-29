import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import studentSlotService from '../../services/studentSlotService';
import { StudentSlotResponse } from '../../types/api';
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

type StaffDashboardNavigationProp = StackNavigationProp<RootStackParamList>;

const StaffDashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<StaffDashboardNavigationProp>();
  
  const [todaySlots, setTodaySlots] = useState<StudentSlotResponse[]>([]);
  const [upcomingSlots, setUpcomingSlots] = useState<StudentSlotResponse[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleString('vi-VN'),
    };
  };

  const formatTime = (time?: string | null) => {
    if (!time) return '--:--';
    const parts = time.split(':');
    if (parts.length < 2) return time;
    const hours = parts[0]?.padStart(2, '0') ?? '--';
    const minutes = parts[1]?.padStart(2, '0') ?? '00';
    return `${hours}:${minutes}`;
  };

  const fetchStaffSlots = useCallback(async () => {
    setSlotsLoading(true);
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Fetch staff slots
      const response = await studentSlotService.getStaffSlots({
        pageIndex: 1,
        pageSize: 100,
        upcomingOnly: true,
      });

      const allSlots = response.items || [];
      
      // Filter today's slots
      const todaySlotsList = allSlots.filter((slot) => {
        const slotDate = new Date(slot.date);
        slotDate.setHours(0, 0, 0, 0);
        return slotDate.getTime() === today.getTime();
      });

      // Filter upcoming slots (from tomorrow onwards)
      const upcomingSlotsList = allSlots.filter((slot) => {
        const slotDate = new Date(slot.date);
        slotDate.setHours(0, 0, 0, 0);
        return slotDate.getTime() > today.getTime();
      }).slice(0, 5); // Only show top 5

      setTodaySlots(todaySlotsList);
      setUpcomingSlots(upcomingSlotsList);
    } catch (error: any) {
      // Error handled silently
      setTodaySlots([]);
      setUpcomingSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaffSlots();
  }, [fetchStaffSlots]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStaffSlots();
    setRefreshing(false);
  }, [fetchStaffSlots]);

  const handleQuickAction = (action: string) => {
    // Navigation trong cùng StaffTabNavigator
    const navigationAny = navigation as any;
    switch (action) {
      case 'activityTypes':
        if (navigationAny.navigate) {
          navigationAny.navigate('ActivityTypes');
        }
        break;
      case 'activities':
        if (navigationAny.navigate) {
          navigationAny.navigate('Activities');
        }
        break;
      case 'schedule':
        if (navigationAny.navigate) {
          navigationAny.navigate('StaffSchedule');
        }
        break;
      default:
        break;
    }
  };

  const getClassName = (slot: StudentSlotResponse) => {
    return slot.timeframe?.name || 'Lớp học';
  };

  const getClassTimeRange = (slot: StudentSlotResponse) => {
    if (slot.timeframe?.startTime && slot.timeframe?.endTime) {
      return `${formatTime(slot.timeframe.startTime)} - ${formatTime(slot.timeframe.endTime)}`;
    }
    return formatDateTime(slot.date).time;
  };

  const getRoomName = (slot: StudentSlotResponse) => {
    return slot.room?.roomName || 'Chưa có thông tin phòng';
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
              {user?.email && (
                <Text style={styles.userEmail}>{user.email}</Text>
              )}
            </View>
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
              <Text style={styles.statNumber}>{todaySlots.length}</Text>
            )}
            <Text style={styles.statLabel}>Lớp học hôm nay</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statCard, styles.statCardClickable]}
            onPress={() => handleQuickAction('activities')}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: COLORS.SUCCESS_BG }]}>
              <MaterialIcons name="event-note" size={24} color={COLORS.SUCCESS} />
            </View>
            {slotsLoading ? (
              <ActivityIndicator size="small" color={COLORS.TEXT_PRIMARY} style={{ marginTop: SPACING.SM }} />
            ) : (
              <Text style={styles.statNumber}>{upcomingSlots.length}</Text>
            )}
            <Text style={styles.statLabel}>Lớp sắp tới</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statCard, styles.statCardClickable]}
            onPress={() => handleQuickAction('activityTypes')}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: COLORS.WARNING_BG }]}>
              <MaterialIcons name="category" size={24} color={COLORS.WARNING} />
            </View>
            <Text style={styles.statNumber}>-</Text>
            <Text style={styles.statLabel}>Loại hoạt động</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
          
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => handleQuickAction('activityTypes')}
            >
              <MaterialIcons name="category" size={32} color={COLORS.PRIMARY} />
              <Text style={styles.quickActionText}>Loại hoạt động</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => handleQuickAction('activities')}
            >
              <MaterialIcons name="event-note" size={32} color={COLORS.SECONDARY} />
              <Text style={styles.quickActionText}>Hoạt động</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => handleQuickAction('schedule')}
            >
              <MaterialIcons name="schedule" size={32} color={COLORS.ACCENT} />
              <Text style={styles.quickActionText}>Lịch làm việc</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Classes */}
        <View style={styles.todayClassesContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lớp học hôm nay</Text>
            <TouchableOpacity onPress={() => handleQuickAction('schedule')}>
              <Text style={styles.seeAllText}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          
          {slotsLoading ? (
            <View style={styles.classCard}>
              <ActivityIndicator size="small" color={COLORS.PRIMARY} />
              <Text style={styles.loadingText}>Đang tải lịch học...</Text>
            </View>
          ) : todaySlots.length === 0 ? (
            <View style={styles.classCard}>
              <MaterialIcons name="event-busy" size={32} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.emptyText}>Chưa có lớp học nào hôm nay</Text>
            </View>
          ) : (
            todaySlots.map((slot) => {
              const slotDate = new Date(slot.date);
              const isToday = slotDate.toDateString() === new Date().toDateString();
              
              return (
                <TouchableOpacity
                  key={slot.id}
                  style={styles.classCard}
                  activeOpacity={0.85}
                >
                  <View style={styles.classInfo}>
                    <Text style={styles.className}>{getClassName(slot)}</Text>
                    <Text style={styles.classTime}>
                      {getClassTimeRange(slot)}
                      {isToday ? ' • Hôm nay' : ` • ${formatDateTime(slot.date).date.split(',')[0]}`}
                    </Text>
                    <Text style={styles.classRoom}>{getRoomName(slot)}</Text>
                    {slot.branchSlot?.branchName && (
                      <Text style={styles.classBranch}>{slot.branchSlot.branchName}</Text>
                    )}
                    {slot.studentName && (
                      <Text style={styles.studentName}>Học sinh: {slot.studentName}</Text>
                    )}
                  </View>
                  <View style={styles.classStatus}>
                    <Text style={styles.classStatusText}>
                      {slot.status === 'Booked' ? 'Đã đặt' : slot.status || 'Chưa xác định'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
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
            </View>
          ) : (
            upcomingSlots.map((slot) => {
              const slotDate = new Date(slot.date);
              const isTomorrow = slotDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
              
              return (
                <TouchableOpacity
                  key={slot.id}
                  style={styles.classCard}
                  activeOpacity={0.85}
                >
                  <View style={styles.classInfo}>
                    <Text style={styles.className}>{getClassName(slot)}</Text>
                    <Text style={styles.classTime}>
                      {getClassTimeRange(slot)}
                      {isTomorrow ? ' • Ngày mai' : ` • ${formatDateTime(slot.date).date.split(',')[0]}`}
                    </Text>
                    <Text style={styles.classRoom}>{getRoomName(slot)}</Text>
                    {slot.branchSlot?.branchName && (
                      <Text style={styles.classBranch}>{slot.branchSlot.branchName}</Text>
                    )}
                    {slot.studentName && (
                      <Text style={styles.studentName}>Học sinh: {slot.studentName}</Text>
                    )}
                  </View>
                  <View style={styles.classStatus}>
                    <Text style={styles.classStatusText}>
                      {slot.status === 'Booked' ? 'Đã đặt' : slot.status || 'Chưa xác định'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
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
  userEmail: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS,
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
  todayClassesContainer: {
    marginBottom: SPACING.LG,
  },
  upcomingClassesContainer: {
    marginBottom: SPACING.LG,
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
  classBranch: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS,
  },
  studentName: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    marginTop: SPACING.XS,
    fontWeight: '600',
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
});

export default StaffDashboardScreen;

