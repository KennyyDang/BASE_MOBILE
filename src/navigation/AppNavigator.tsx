import React, { useRef, useEffect } from 'react';
import { NavigationContainer, LinkingOptions, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { MaterialIcons } from '@expo/vector-icons';
import { Provider as PaperProvider } from 'react-native-paper';
import { DefaultTheme } from 'react-native-paper';
import { Linking, TouchableOpacity, Alert } from 'react-native';

import { RootStackParamList, MainTabParamList, StaffTabParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../constants';
import { authHandler } from '../utils/authHandler';


// Custom theme for React Native Paper
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.PRIMARY,
    secondary: COLORS.SECONDARY,
    accent: COLORS.ACCENT,
    background: COLORS.BACKGROUND,
    surface: COLORS.SURFACE,
    error: COLORS.ERROR,
    text: COLORS.TEXT_PRIMARY,
    onSurface: COLORS.TEXT_SECONDARY,
    disabled: COLORS.TEXT_SECONDARY,
    placeholder: COLORS.TEXT_SECONDARY,
    backdrop: 'rgba(0, 0, 0, 0.5)',
  },
};

// Import screens
import LoginScreen from '../screens/auth/LoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ManagerHomeScreen from '../screens/manager/ManagerHomeScreen';
import ManagerRegisterParentScreen from '../screens/manager/ManagerRegisterParentScreen';
import ManagerProfileScreen from '../screens/manager/ManagerProfileScreen';
import StaffScheduleScreen from '../screens/staff/StaffScheduleScreen';
import ActivityTypesScreen from '../screens/staff/ActivityTypesScreen';
import StaffDashboardScreen from '../screens/staff/StaffDashboardScreen';
import StaffProfileScreen from '../screens/staff/StaffProfileScreen';
import CreateActivityScreen from '../screens/staff/CreateActivityScreen';
import EditActivityScreen from '../screens/staff/EditActivityScreen';
import AttendanceScreen from '../screens/staff/AttendanceScreen';
import StudentManagementScreen from '../screens/staff/StudentManagementScreen';
import DashboardScreen from '../screens/main/DashboardScreen';
import ScheduleScreen from '../screens/main/ScheduleScreen';
import WalletScreen from '../screens/main/WalletScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import SchoolsScreen from '../screens/main/SchoolsScreen';
import TopUpScreen from '../screens/main/TopUpScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import NotificationScreen from '../screens/main/NotificationScreen';
import StudentPackagesScreen from '../screens/main/StudentPackagesScreen';
import StudentClassesScreen from '../screens/main/StudentClassesScreen';
import StudentActivityScreen from '../screens/main/StudentActivityScreen';
import StaffStudentActivityScreen from '../screens/staff/StaffStudentActivityScreen';
import ActivityDetailScreen from '../screens/main/ActivityDetailScreen';
import TransactionHistoryScreen from '../screens/main/TransactionHistoryScreen';
import TransactionDetailScreen from '../screens/main/TransactionDetailScreen';
import MySubscriptionsScreen from '../screens/main/MySubscriptionsScreen';
import BookedClassesScreen from '../screens/main/BookedClassesScreen';
import OrderHistoryScreen from '../screens/main/OrderHistoryScreen';
import OrderDetailScreen from '../screens/main/OrderDetailScreen';
import PurchaseServiceScreen from '../screens/main/PurchaseServiceScreen';
import RegisterChildScreen from '../screens/main/RegisterChildScreen';
import ClassDetailScreen from '../screens/main/ClassDetailScreen';
import SelectSlotScreen from '../screens/main/SelectSlotScreen';
import StudentGuardiansScreen from '../screens/staff/StudentGuardiansScreen';
import NotificationWatcher from '../components/NotificationWatcher';
import BadgeIcon from '../components/BadgeIcon';
import { useUnreadNotificationCount } from '../hooks/useUnreadNotificationCount';
import { useNavigation } from '@react-navigation/native';

const Stack = createStackNavigator<RootStackParamList>();
const StaffStack = createStackNavigator<any>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const StaffTab = createBottomTabNavigator<StaffTabParamList>();

// Component for notification header button with badge
const NotificationHeaderButton = () => {
  const navigation = useNavigation<any>();
  const { unreadCount } = useUnreadNotificationCount();

  return (
    <BadgeIcon
      iconName="notifications"
      badgeCount={unreadCount}
      onPress={() => navigation.navigate('Notifications')}
      size={24}
      color={COLORS.SURFACE}
    />
  );
};

// Component for logout header button
const LogoutHeaderButton = () => {
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Xác nhận đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <TouchableOpacity
      onPress={handleLogout}
      style={{
        marginRight: 16,
        padding: 8,
      }}
      activeOpacity={0.7}
    >
      <MaterialIcons name="logout" size={24} color={COLORS.SURFACE} />
    </TouchableOpacity>
  );
};

// Staff Tab Navigator for staff and managers
const StaffTabNavigator = () => {
  return (
    <StaffTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'StaffDashboard':
              iconName = 'dashboard';
              break;
            case 'ActivityTypes':
              iconName = 'category';
              break;
            case 'StaffSchedule':
              iconName = 'schedule';
              break;
            case 'StaffProfile':
              iconName = 'person';
              break;
            default:
              iconName = 'help-outline';
          }

          return <MaterialIcons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.PRIMARY,
        tabBarInactiveTintColor: COLORS.TEXT_SECONDARY,
        tabBarStyle: {
          backgroundColor: COLORS.SURFACE,
          borderTopColor: COLORS.BORDER,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: COLORS.PRIMARY,
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        headerTintColor: COLORS.SURFACE,
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerTitleAlign: 'center',
        headerRight: () => <LogoutHeaderButton />,
      })}
    >
      <StaffTab.Screen
        name="StaffDashboard"
        component={StaffDashboardScreen}
        options={{
          title: 'Trang chủ',
          headerTitle: 'Trang chủ',
        }}
      />
      <StaffTab.Screen
        name="ActivityTypes"
        component={ActivityTypesScreen}
        options={{
          title: 'Loại Hoạt Động',
          headerTitle: 'Loại Hoạt Động',
        }}
      />
      <StaffTab.Screen
        name="StaffSchedule"
        component={StaffScheduleScreen}
        options={{
          title: 'Lịch Làm Việc',
          headerTitle: 'Lịch Làm Việc',
        }}
      />
      <StaffTab.Screen
        name="StaffProfile"
        component={StaffProfileScreen}
        options={{
          title: 'Hồ Sơ',
          headerTitle: 'Hồ Sơ Cá Nhân',
        }}
      />
    </StaffTab.Navigator>
  );
};

// Main Tab Navigator for authenticated users
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = 'dashboard';
              break;
            case 'Schedule':
              iconName = 'schedule';
              break;
            case 'BookedClasses':
              iconName = 'event-available';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'help-outline';
          }

          return <MaterialIcons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.PRIMARY,
        tabBarInactiveTintColor: COLORS.TEXT_SECONDARY,
        tabBarStyle: {
          backgroundColor: COLORS.SURFACE,
          borderTopColor: COLORS.BORDER,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: COLORS.PRIMARY,
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        headerTintColor: COLORS.SURFACE,
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerTitleAlign: 'center',
        headerRight: () => <NotificationHeaderButton />,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          title: 'Trang Chủ',
          headerTitle: 'BASE - Trang Chủ',
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          title: 'Đặt Lịch Học',
          headerTitle: 'Đặt Lịch Học',
        }}
      />
      <Tab.Screen 
        name="BookedClasses" 
        component={BookedClassesScreen}
        options={{
          title: 'Phòng đã đặt',
          headerTitle: 'Phòng đã đặt',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Hồ Sơ',
          headerTitle: 'Hồ Sơ Cá Nhân',
        }}
      />
    </Tab.Navigator>
  );
};

// Linking configuration for deep links (simplified - using React Native Linking)
const linking: LinkingOptions<any> = {
  prefixes: ['baseapp://', 'https://baseapp.com'],
  config: {
    screens: {
      Main: {
        screens: {
          Dashboard: 'dashboard',
          Schedule: 'schedule-tab',
          Profile: 'profile',
        },
      },
      Schedule: 'schedule',
      ClassDetail: 'class/:slotId',
      TopUp: 'topup',
      Login: 'login',
      PaymentSuccess: 'payment/success',
      PaymentCancel: 'payment/cancel',
    },
  },
  async getInitialURL() {
    // Check if app was opened from a deep link
    const url = await Linking.getInitialURL();
    if (url != null) {
      return url;
    }
  },
  subscribe(listener) {
    // Listen to incoming links from deep linking
    const onReceiveURL = ({ url }: { url: string }) => {
      listener(url);
    };

    // Listen to URL events using React Native Linking
    const subscription = Linking.addEventListener('url', onReceiveURL);

    return () => {
      subscription.remove();
    };
  },
};

// Root Navigator
const AppNavigator = () => {
  const { isAuthenticated, user } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  // Register navigation ref for auth handler
  useEffect(() => {
    // Update navigation ref when it becomes available
    const updateNavigationRef = () => {
      if (navigationRef.current) {
        authHandler.setNavigationRef(navigationRef.current);
      }
    };
    
    // Update immediately
    updateNavigationRef();
    
    // Also update after a short delay to ensure NavigationContainer is mounted
    const timer = setTimeout(updateNavigationRef, 100);
    
    return () => {
      clearTimeout(timer);
      authHandler.setNavigationRef(null);
    };
  }, []);
  
  // Also update ref when navigation container is ready
  const onNavigationReady = () => {
    if (navigationRef.current) {
      authHandler.setNavigationRef(navigationRef.current);
    }
  };

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer 
        ref={navigationRef} 
        linking={linking}
        onReady={onNavigationReady}
      >
        {isAuthenticated && <NotificationWatcher enabled />}
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: COLORS.PRIMARY,
              elevation: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            },
            headerTintColor: COLORS.SURFACE,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 18,
            },
            headerTitleAlign: 'center',
            cardStyle: {
              backgroundColor: COLORS.BACKGROUND,
            },
            // Smooth transitions
            cardStyleInterpolator: ({ current, layouts }) => {
              return {
                cardStyle: {
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width, 0],
                      }),
                    },
                  ],
                },
              };
            },
          }}
        >
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen 
              name="Login"
              component={LoginScreen}
              options={{
                title: 'Đăng nhập',
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{
                title: 'Quên mật khẩu',
                headerShown: false,
              }}
            />
          </>
        ) : (
          // Authenticated area
          <>
            {/* Route by role: STAFF -> StaffMain, MANAGER -> ManagerHome, USER/PARENT -> Main */}
            {(() => {
              const userRole = (user?.role || '').toUpperCase();
              const isManager = userRole.includes('MANAGER') || userRole === 'ADMIN';
              const isStaff = userRole.includes('STAFF') && !isManager;
              const isParent = userRole.includes('PARENT') || userRole.includes('USER');
              
              if (isManager) {
                // Manager chỉ có quyền tạo tài khoản qua CCCD
                return (
                  <>
                    <Stack.Screen
                      name="ManagerHome"
                      component={ManagerHomeScreen}
                      options={{ 
                        title: 'Quản lý',
                        headerStyle: {
                          backgroundColor: COLORS.PRIMARY,
                        },
                        headerTintColor: COLORS.SURFACE,
                        headerTitleStyle: { fontWeight: 'bold' },
                        headerTitleAlign: 'center',
                      }}
                    />
                    <Stack.Screen
                      name="ManagerRegisterParent"
                      component={ManagerRegisterParentScreen}
                      options={{ 
                        title: 'Đăng ký phụ huynh',
                        headerStyle: {
                          backgroundColor: COLORS.PRIMARY,
                        },
                        headerTintColor: COLORS.SURFACE,
                        headerTitleStyle: { fontWeight: 'bold' },
                        headerTitleAlign: 'center',
                      }}
                    />
                    <Stack.Screen
                      name="ManagerProfile"
                      component={ManagerProfileScreen}
                      options={{ 
                        title: 'Hồ sơ',
                        headerStyle: {
                          backgroundColor: COLORS.PRIMARY,
                        },
                        headerTintColor: COLORS.SURFACE,
                        headerTitleStyle: { fontWeight: 'bold' },
                        headerTitleAlign: 'center',
                      }}
                    />
                  </>
                );
              } else if (isStaff) {
                // Staff có quyền truy cập các chức năng làm việc
                return (
                  <>
                    <Stack.Screen
                      name="StaffMain"
                      options={{ headerShown: false }}
                    >
                      {() => <StaffTabNavigator />}
                    </Stack.Screen>
                  </>
                );
              } else if (isParent) {
                // Parent có quyền truy cập các chức năng phụ huynh
                return (
                  <Stack.Screen 
                    name="Main" 
                    component={MainTabNavigator}
                    options={{
                      headerShown: false,
                    }}
                  />
                );
              }
              return null;
            })()}
            <Stack.Screen 
              name="Schools" 
              component={SchoolsScreen}
              options={{
                title: 'Danh sách trường học',
                headerTitle: 'Danh sách trường học',
              }}
            />
            <Stack.Screen 
              name="Schedule" 
              component={ScheduleScreen}
              options={{
                title: 'Đặt Lịch Học',
                headerTitle: 'Đặt Lịch Học',
              }}
            />
            <Stack.Screen 
              name="TopUp" 
              component={TopUpScreen}
              options={{
                title: 'Nạp Tiền',
                headerTitle: 'Nạp tiền',
              }}
            />
            <Stack.Screen
              name="Wallet"
              component={WalletScreen}
              options={{
                title: 'Ví tiền',
                headerTitle: 'Ví tiền',
              }}
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{
                title: 'Cài Đặt',
                headerTitle: 'Cài Đặt',
              }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationScreen}
              options={{
                title: 'Thông Báo',
                headerTitle: 'Thông Báo',
              }}
            />
            <Stack.Screen
              name="StudentPackages"
              component={StudentPackagesScreen}
              options={{
                title: 'Gói học',
                headerTitle: 'Chọn gói phù hợp',
              }}
            />
            <Stack.Screen
              name="StudentClasses"
              component={StudentClassesScreen}
              options={{
                title: 'Lớp học',
                headerTitle: 'Lớp học đã đặt',
              }}
            />
            <Stack.Screen
              name="StudentActivities"
              component={StudentActivityScreen}
              options={{
                title: 'Hoạt động',
                headerTitle: 'Hoạt động của con',
              }}
            />
            <Stack.Screen
              name="StaffStudentActivities"
              component={StaffStudentActivityScreen}
              options={{
                title: 'Hoạt động',
                headerTitle: 'Hoạt động của học sinh',
              }}
            />
            <Stack.Screen
              name="ActivityDetail"
              component={ActivityDetailScreen}
              options={{
                title: 'Chi tiết hoạt động',
                headerTitle: 'Chi tiết hoạt động',
              }}
            />
            <Stack.Screen
              name="TransactionHistory"
              component={TransactionHistoryScreen}
              options={({ route }: any) => {
                const params = route.params || {};
                const { walletType, studentName } = params;
                return {
                  title: walletType === 'Parent' 
                    ? 'Lịch sử ví phụ huynh'
                    : walletType === 'Student' && studentName
                    ? `Lịch sử ví ${studentName}`
                    : walletType === 'Student'
                    ? 'Lịch sử ví học sinh'
                    : 'Lịch sử giao dịch',
                  headerTitle: walletType === 'Parent' 
                    ? 'Lịch sử ví phụ huynh'
                    : walletType === 'Student' && studentName
                    ? `Lịch sử ví ${studentName}`
                    : walletType === 'Student'
                    ? 'Lịch sử ví học sinh'
                    : 'Lịch sử giao dịch',
                };
              }}
            />
            <Stack.Screen
              name="TransactionDetail"
              component={TransactionDetailScreen}
              options={{
                title: 'Chi tiết giao dịch',
                headerTitle: 'Chi tiết giao dịch',
              }}
            />
            <Stack.Screen
              name="MySubscriptions"
              component={MySubscriptionsScreen}
              options={{
                title: 'Gói đăng ký',
                headerTitle: 'Gói đăng ký của tôi',
              }}
            />
            <Stack.Screen
              name="OrderHistory"
              component={OrderHistoryScreen}
              options={{
                title: 'Lịch sử đơn hàng',
                headerTitle: 'Lịch sử đơn hàng',
              }}
            />
            <Stack.Screen
              name="OrderDetail"
              component={OrderDetailScreen}
              options={{
                title: 'Chi tiết đơn hàng',
                headerTitle: 'Chi tiết đơn hàng',
                headerShown: false, // Use custom header in screen
              }}
            />
            <Stack.Screen
              name="CreateActivity"
              component={CreateActivityScreen}
              options={{
                title: 'Tạo hoạt động',
                headerTitle: 'Tạo hoạt động cho học sinh',
              }}
            />
            <Stack.Screen
              name="EditActivity"
              component={EditActivityScreen}
              options={{
                title: 'Chỉnh sửa hoạt động',
                headerTitle: 'Chỉnh sửa hoạt động',
              }}
            />
            <Stack.Screen
              name="Attendance"
              component={AttendanceScreen}
              options={{
                title: 'Điểm danh',
                headerTitle: 'Điểm danh học sinh',
              }}
            />
            <Stack.Screen
              name="StudentManagement"
              component={StudentManagementScreen}
              options={{
                title: 'Quản lý học sinh',
                headerTitle: 'Quản lý học sinh',
                headerShown: false, // Use custom header in screen
              }}
            />
            <Stack.Screen
              name="RegisterChild"
              component={RegisterChildScreen}
              options={{
                title: 'Đăng ký học sinh',
                headerTitle: 'Đăng ký học sinh',
              }}
            />
            <Stack.Screen
              name="PurchaseService"
              component={PurchaseServiceScreen}
              options={{
                title: 'Mua dịch vụ bổ sung',
                headerTitle: 'Mua dịch vụ bổ sung',
              }}
            />
            <Stack.Screen
              name="SelectSlot"
              component={SelectSlotScreen}
              options={{
                title: 'Chọn slot',
                headerTitle: 'Chọn slot',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="ClassDetail"
              component={ClassDetailScreen}
              options={{
                title: 'Chi tiết lớp học',
                headerTitle: 'Chi tiết lớp học',
              }}
            />
            <Stack.Screen
              name="StudentGuardians"
              component={StudentGuardiansScreen}
              options={{
                title: 'Người giám hộ',
                headerTitle: 'Người giám hộ',
                headerShown: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </PaperProvider>
  );
};

export default AppNavigator;
