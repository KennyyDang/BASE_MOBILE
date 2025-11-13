import React from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { MaterialIcons } from '@expo/vector-icons';
import { Provider as PaperProvider } from 'react-native-paper';
import { DefaultTheme } from 'react-native-paper';
import { Linking } from 'react-native';

import { RootStackParamList, MainTabParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';

// Inline constants
const COLORS = {
  PRIMARY: '#2E7D32',
  SECONDARY: '#FF6F00',
  ACCENT: '#2196F3',
  BACKGROUND: '#F5F5F5',
  SURFACE: '#FFFFFF',
  ERROR: '#F44336',
  TEXT_PRIMARY: '#212121',
  TEXT_SECONDARY: '#757575',
  BORDER: '#E0E0E0',
};


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
import DashboardScreen from '../screens/main/DashboardScreen';
import ScheduleScreen from '../screens/main/ScheduleScreen';
import WalletScreen from '../screens/main/WalletScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import ChildrenManagementScreen from '../screens/main/ChildrenManagementScreen';
import TopUpScreen from '../screens/main/TopUpScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import NotificationScreen from '../screens/main/NotificationScreen';
import StudentPackagesScreen from '../screens/main/StudentPackagesScreen';
import TransactionHistoryScreen from '../screens/main/TransactionHistoryScreen';
import NotificationWatcher from '../components/NotificationWatcher';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Main Tab Navigator for authenticated users
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = 'dashboard';
              break;
            case 'Schedule':
              iconName = 'schedule';
              break;
            case 'Wallet':
              iconName = 'account-balance-wallet';
              break;
            case 'Children':
              iconName = 'child-care';
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
          title: 'Lịch Học',
          headerTitle: 'Lịch Học',
        }}
      />
      <Tab.Screen 
        name="Wallet" 
        component={WalletScreen}
        options={{
          title: 'Ví Tiền',
          headerTitle: 'Ví Tiền',
        }}
      />
      <Tab.Screen 
        name="Children" 
        component={ChildrenManagementScreen}
        options={{
          title: 'Quản Lý Con',
          headerTitle: 'Quản Lý Con',
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
          Schedule: 'schedule',
          Wallet: 'wallet',
          Profile: 'profile',
        },
      },
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

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer linking={linking}>
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
          <Stack.Screen 
            name="Login"
            component={LoginScreen}
            options={{
              title: 'Đăng nhập',
              headerShown: false,
            }}
          />
        ) : (
          <>
            {/* Main App Stack */}
            <Stack.Screen 
              name="Main" 
              component={MainTabNavigator}
              options={{
                headerShown: false,
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
              name="TransactionHistory"
              component={TransactionHistoryScreen}
              options={{
                title: 'Lịch sử giao dịch',
                headerTitle: 'Lịch sử giao dịch',
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
