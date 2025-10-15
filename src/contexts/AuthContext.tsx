import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/auth.service';
import { STORAGE_KEYS } from '../config/axios.config';
import { LoginRequest, UserInfo } from '../types/api';

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
      console.log('🔄 AuthContext: Starting login...');
      
      const response = await authService.login(credentials);
      console.log('✅ AuthContext: Login successful, user:', response.user);
      
      setUser(response.user);
      setIsAuthenticated(true);
      
      console.log('🎯 AuthContext: State updated - isAuthenticated:', true);
    } catch (error: any) {
      console.error('❌ AuthContext: Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
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
  };

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
