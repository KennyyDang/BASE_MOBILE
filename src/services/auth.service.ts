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
      // Endpoint from Swagger: POST /api/Auth/login
      const response = await axiosInstance.post<LoginResponse>('/api/Auth/login', credentials);
      
      if (response.data.access_token) {
        const token = response.data.access_token;
        const refreshToken = response.data.refresh_token;
        
        // Save tokens to AsyncStorage
        await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
        if (refreshToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        }
        
        // Decode JWT to extract user info
        const decoded = jwtDecode<DecodedJWT & Record<string, any>>(token);

        // Try to read role from multiple common claim keys
        const rawRole = (
          decoded[JWT_CLAIMS.ROLE] ||
          decoded['role'] ||
          decoded['roles'] ||
          decoded['Role'] ||
          decoded['Roles'] ||
          null
        );

        const normalizeRole = (val: any): string | null => {
          if (!val) return null;
          if (Array.isArray(val)) {
            const first = val[0];
            return typeof first === 'string' ? first.toUpperCase().trim() : String(first).toUpperCase().trim();
          }
          return typeof val === 'string' ? val.toUpperCase().trim() : String(val).toUpperCase().trim();
        };

        const normalizedRole = normalizeRole(rawRole);

        // Extract user info from JWT claims
        const userInfo: UserInfo = {
          id: decoded[JWT_CLAIMS.USER_ID] || decoded['sub'] || decoded['userId'] || '',
          email: decoded[JWT_CLAIMS.EMAIL] || decoded['email'] || '',
          role: normalizedRole || 'USER',
        };

        // Only allow parents to sign in
        // Note: In this system, parents have role "User"
        const roleStr = (userInfo.role || '').toUpperCase();
        const isParent = roleStr === 'USER' || roleStr === 'PARENT' || roleStr.includes('PARENT');
        if (!isParent) {
          await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
          throw new Error('Chỉ phụ huynh mới được phép đăng nhập vào ứng dụng này.');
        }
        
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
   * Refresh access token using refresh token
   * @returns New access token
   */
  refreshToken: async (): Promise<string> => {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axiosInstance.post('/api/Auth/refresh', {
        refreshToken: refreshToken
      });

      if (response.data.access_token) {
        const newToken = response.data.access_token;
        await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newToken);
        
        // Update refresh token if provided
        if (response.data.refresh_token) {
          await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.refresh_token);
        }
        
        return newToken;
      }
      
      throw new Error('No token received from refresh endpoint');
    } catch (error: any) {
      // If refresh fails, clear all tokens
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
      ]);
      throw error;
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
        STORAGE_KEYS.REFRESH_TOKEN,
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

