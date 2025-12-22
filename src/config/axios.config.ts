import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { API_BASE_URL, NODE_ENV} from '@env';
import { authHandler } from '../utils/authHandler';

// Storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@base_access_token',
  REFRESH_TOKEN: '@base_refresh_token',
  USER: '@base_user',
} as const;

const sanitizeBaseUrl = (url?: string | null) => {
  if (!url) return url;
  const trimmed = url.trim();
  // Remove trailing slash to avoid double slashes on requests
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

const getBaseURL = () => {
  // Try to get from @env first (works in development)
  let envUrlRaw = API_BASE_URL || '';
  
  // Fallback to Constants.expoConfig.extra (works in production builds)
  if (!envUrlRaw) {
    const fromConstants = Constants.expoConfig?.extra?.apiBaseUrl;
    if (fromConstants) {
      envUrlRaw = fromConstants;
    }
  }
  
  // Also try Constants.manifest?.extra (for older Expo versions)
  if (!envUrlRaw) {
    const fromManifest = (Constants as any).manifest?.extra?.apiBaseUrl;
    if (fromManifest) {
      envUrlRaw = fromManifest;
    }
  }
  
  const envUrl = sanitizeBaseUrl(envUrlRaw);

  // If API_BASE_URL is provided and not localhost, use it
  if (envUrl && !/^(http:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(envUrl)) {
    return envUrl;
  }
  
  // Default fallback
  return 'https://basebrightway2.azurewebsites.net/api';
};

// Create axios instance with base configuration
const axiosInstance: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 60000, // 60 seconds (increased for file uploads)
  headers: {
    'Content-Type': 'application/json',
  },
  // Increase max body length for file uploads
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
});

// Export function to get current base URL (for debugging/verification)
export const getCurrentBaseURL = () => getBaseURL();

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Handle FormData: remove default Content-Type to let axios set it with boundary
      if (config.data instanceof FormData) {
        // In React Native, we must completely remove Content-Type
        // so the native layer can set multipart/form-data with boundary
        if (config.headers) {
          const headers = config.headers as any;
          
          // Remove Content-Type from all possible locations
          delete headers['Content-Type'];
          delete headers['content-type'];
          
          // Remove from common headers
          if (headers.common) {
            delete headers.common['Content-Type'];
            delete headers.common['content-type'];
          }
          
          // Remove from method-specific headers
          const method = (config.method || 'post').toLowerCase();
          if (headers[method]) {
            delete headers[method]['Content-Type'];
            delete headers[method]['content-type'];
          }
          
        // Ensure Content-Type is completely removed
        // React Native's FormData needs to set this automatically
        if (config.headers['Content-Type']) {
          delete config.headers['Content-Type'];
        }
      }
      }

      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (token && config.headers) {
        // Trim token to remove any whitespace
        const trimmedToken = token.trim();
        // Validate token format before using
        if (trimmedToken.split('.').length === 3) {
          (config.headers as any).Authorization = `Bearer ${trimmedToken}`;
        } else if (__DEV__) {
          console.warn('[Axios] Invalid token format detected, skipping Authorization header');
        }
      }
      return config;
    } catch (error) {
      if (__DEV__) {
        console.error('[Axios] Error getting token in request interceptor:', error);
      }
      return config;
    }
  },
  (error: AxiosError) => {
    if (__DEV__) {
      console.error('[Axios] Request interceptor error:', error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor - handle 401 globally and auto-refresh token
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    
    // If already handling logout, reject all 401 requests immediately to prevent log spam
    if (error.response?.status === 401 && authHandler.isHandling()) {
      return Promise.reject(error);
    }
    
    // Skip refresh token request if it fails (to avoid infinite loop)
    if (error.response?.status === 401 && (originalRequest as any)._isRefreshRequest) {
      // Refresh token request itself failed - trigger logout immediately
      if (!authHandler.isHandling()) {
        authHandler.handleUnauthorized(
          'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        ).catch(() => {
          // Silently ignore errors to prevent log spam
        });
      }
      return Promise.reject(error);
    }
    
    // Handle 401 errors - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Skip refresh if already handling logout
      if (authHandler.isHandling()) {
        return Promise.reject(error);
      }
      
      try {
        // Try to refresh token
        const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (refreshToken && refreshToken.trim()) {
          // Mark this request as refresh token request to avoid infinite loop
          const response = await axiosInstance.post('/api/Auth/refresh', {
            refreshToken: refreshToken.trim()
          }, {
            _isRefreshRequest: true // Custom flag to identify refresh requests
          } as any);
          
          if (response.data?.access_token) {
            const newToken = response.data.access_token.trim();
            
            // Validate new token format
            if (newToken.split('.').length === 3) {
              await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newToken);
              
              // Update refresh token if provided
              if (response.data.refresh_token) {
                await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.refresh_token.trim());
              }
              
              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return axiosInstance(originalRequest);
            } else if (__DEV__) {
              console.error('[Axios] Invalid token format received from refresh endpoint');
            }
          }
        } else {
          // No refresh token available - trigger logout immediately
          throw new Error('No refresh token available');
        }
      } catch (refreshError) {
        // Refresh failed - token was invalidated (likely logged in elsewhere)
        // Only handle logout once - authHandler will prevent multiple calls
        if (!authHandler.isHandling()) {
          // Use authHandler to properly logout and redirect
          // It will handle clearing tokens and navigation
          authHandler.handleUnauthorized(
            'Phiên đăng nhập đã hết hạn. Bạn đã đăng nhập ở thiết bị khác. Vui lòng đăng nhập lại.'
          ).catch(() => {
            // Silently ignore errors from handleUnauthorized to prevent log spam
          });
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;

