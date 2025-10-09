import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import axiosInstance, { STORAGE_KEYS } from '../config/axios.config';
import { 
  LoginRequest, 
  LoginResponse, 
  UserInfo, 
  DecodedJWT,
  JWT_CLAIMS 
} from '../types/api';

/**
 * Authentication Service
 * Handles all authentication-related API calls
 */
const authService = {
  /**
   * Login user
   * @param credentials - { email, password }
   * @returns Response with token and decoded user data
   */
  login: async (credentials: LoginRequest): Promise<{ token: string; user: UserInfo }> => {
    try {
      const response = await axiosInstance.post<LoginResponse>('/Auth/login', credentials);
      
      if (response.data.token) {
        const token = response.data.token;
        
        // Save token to AsyncStorage
        await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
        
        // Decode JWT to extract user info
        const decoded = jwtDecode<DecodedJWT>(token);
        
        // Extract user info from JWT claims
        const userInfo: UserInfo = {
          id: decoded[JWT_CLAIMS.USER_ID],
          email: decoded[JWT_CLAIMS.EMAIL],
          role: decoded[JWT_CLAIMS.ROLE] || 'User',
        };
        
        // Save user info to AsyncStorage
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userInfo));
        
        return { token, user: userInfo };
      }
      
      throw new Error('No token received from server');
    } catch (error: any) {
      throw error.response?.data || error.message || 'Login failed';
    }
  },

  /**
   * Logout user
   * Clear AsyncStorage
   */
  logout: async (): Promise<void> => {
    try {
      // Clear all auth data from AsyncStorage
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.USER,
      ]);
    } catch (error) {
      // Try to force clear even if error
      try {
        await AsyncStorage.clear();
      } catch (clearError) {
        // Ignore clear error
      }
      throw error;
    }
  },

  /**
   * Get current user from AsyncStorage
   * @returns Current user object or null
   */
  getCurrentUser: async (): Promise<UserInfo | null> => {
    try {
      const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get access token from AsyncStorage
   * @returns Access token or null
   */
  getAccessToken: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      return null;
    }
  },

  /**
   * Check if user is authenticated
   * @returns True if user has valid token
   */
  isAuthenticated: async (): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      return !!token;
    } catch (error) {
      return false;
    }
  },
};

export default authService;

