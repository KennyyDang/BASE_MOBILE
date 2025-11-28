import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import authService from '../services/auth.service';
import notificationService from '../services/notificationService';
import pushNotificationService from '../services/pushNotificationService';
import { STORAGE_KEYS } from '../config/axios.config';
import { LoginRequest, UserInfo, MobileLoginRequest } from '../types/api';
import { authHandler } from '../utils/authHandler';

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserInfo | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<UserInfo>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user from AsyncStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        
        if (userStr && token) {
          const userData = JSON.parse(userStr);
          setUser(userData);
          setIsAuthenticated(true);
        }
      } catch (error) {
        // Clear invalid data
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.USER,
          STORAGE_KEYS.ACCESS_TOKEN,
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      setLoading(true);

      let pushToken:
        | { token: string; platform: 'ios' | 'android' | 'web' }
        | null = null;
      let firebaseToken: string | undefined;

      try {
        pushToken = await pushNotificationService.registerForPushNotifications();
        firebaseToken = pushToken?.token;
      } catch {
        // Ignore push token errors, proceed with login
      }

      // Get device name - use available properties or fallback to Platform.OS
      let deviceName: string = Platform.OS;
      try {
        // Try to get device name from Device properties
        if (Device.deviceName) {
          deviceName = Device.deviceName;
        } else if (Device.modelName) {
          deviceName = Device.modelName;
        } else if (Device.brand && Device.modelName) {
          deviceName = `${Device.brand} ${Device.modelName}`;
        } else if (Device.brand) {
          deviceName = Device.brand;
        }
      } catch {
        // Fallback to Platform.OS if any error occurs
        deviceName = Platform.OS;
      }

      const payload: MobileLoginRequest = {
        ...credentials,
        firebaseToken,
        deviceName,
      };

      if (__DEV__) {
        console.log('Mobile login payload:', payload);
      }

      const response = await authService.login(payload);

      setUser(response.user);
      setIsAuthenticated(true);

      if (pushToken) {
        try {
          await notificationService.registerPushToken(pushToken.token, pushToken.platform);
        } catch {
          // Ignore registration errors to avoid interrupting login flow
        }
      }
    } catch (error: any) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    try {
      // Clear AsyncStorage first
      await authService.logout();
      
      // Clear state
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      // Force logout state even if AsyncStorage fails
      setUser(null);
      setIsAuthenticated(false);
      
      throw error;
    }
  }, []);

  // Register logout handler for axios interceptor
  useEffect(() => {
    authHandler.setLogoutHandler(logout);
    return () => {
      authHandler.setLogoutHandler(null as any);
    };
  }, [logout]);

  const updateUser = async (userData: Partial<UserInfo>) => {
    try {
      if (user) {
        const updatedUser = { ...user, ...userData };
        setUser(updatedUser);
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      }
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      loading,
      login, 
      logout, 
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
