import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { API_BASE_URL, NODE_ENV} from '@env';

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
  return 'http://192.168.2.7:5160';
};

// Create axios instance with base configuration
const axiosInstance: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Export function to get current base URL (for debugging/verification)
export const getCurrentBaseURL = () => getBaseURL();

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
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
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor - handle 401 globally and auto-refresh token
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token
        const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (refreshToken && refreshToken.trim()) {
          const response = await axiosInstance.post('/api/Auth/refresh', {
            refreshToken: refreshToken.trim()
          });
          
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
        }
      } catch (refreshError) {
        // Refresh failed, clear all tokens and redirect to login
        if (__DEV__) {
          console.error('[Axios] Token refresh failed:', refreshError);
        }
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.ACCESS_TOKEN,
          STORAGE_KEYS.REFRESH_TOKEN,
          STORAGE_KEYS.USER,
        ]);
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;

