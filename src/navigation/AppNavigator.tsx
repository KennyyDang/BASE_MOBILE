import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { MaterialIcons } from '@expo/vector-icons';

import { SCREEN_NAMES, COLORS } from '../constants';
import { RootStackParamList, MainTabParamList } from '../types';
import { useAuth } from '../context/AuthContext';

// Import screens (will be created later)
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DashboardScreen from '../screens/main/DashboardScreen';
import ScheduleScreen from '../screens/main/ScheduleScreen';
import WalletScreen from '../screens/main/WalletScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

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
            case SCREEN_NAMES.DASHBOARD:
              iconName = 'dashboard';
              break;
            case SCREEN_NAMES.SCHEDULE:
              iconName = 'schedule';
              break;
            case SCREEN_NAMES.WALLET:
              iconName = 'account-balance-wallet';
              break;
            case SCREEN_NAMES.PROFILE:
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
        headerStyle: {
          backgroundColor: COLORS.PRIMARY,
        },
        headerTintColor: COLORS.SURFACE,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name={SCREEN_NAMES.DASHBOARD} 
        component={DashboardScreen}
        options={{
          title: 'Trang chủ',
          headerTitle: 'BASE - Trang chủ',
        }}
      />
      <Tab.Screen 
        name={SCREEN_NAMES.SCHEDULE} 
        component={ScheduleScreen}
        options={{
          title: 'Lịch học',
          headerTitle: 'Lịch học',
        }}
      />
      <Tab.Screen 
        name={SCREEN_NAMES.WALLET} 
        component={WalletScreen}
        options={{
          title: 'Ví tiền',
          headerTitle: 'Ví tiền',
        }}
      />
      <Tab.Screen 
        name={SCREEN_NAMES.PROFILE} 
        component={ProfileScreen}
        options={{
          title: 'Hồ sơ',
          headerTitle: 'Hồ sơ cá nhân',
        }}
      />
    </Tab.Navigator>
  );
};

// Root Navigator
const AppNavigator = () => {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.PRIMARY,
          },
          headerTintColor: COLORS.SURFACE,
          headerTitleStyle: {
            fontWeight: 'bold',
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
              name="Register" 
              component={RegisterScreen}
              options={{
                title: 'Đăng ký',
              }}
            />
          </>
        ) : (
          // Main App Stack
          <Stack.Screen 
            name="Main" 
            component={MainTabNavigator}
            options={{
              headerShown: false,
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
