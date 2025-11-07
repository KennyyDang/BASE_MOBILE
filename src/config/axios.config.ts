import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, NODE_ENV } from '@env';

// Storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@base_access_token',
  REFRESH_TOKEN: '@base_refresh_token',
  USER: '@base_user',
} as const;


const getBaseURL = () => {
  if (API_BASE_URL) {
    return API_BASE_URL;
  }
  // Fallback to old hardcoded values
  return __DEV__ ? 'http://172.20.10.2:5160' : 'http://172.20.10.2:5160';
};

// Create axios instance with base configuration
const axiosInstance: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (token && config.headers) {
        (config.headers as any).Authorization = `Bearer ${token}`;
      }
      return config;
    } catch {
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
        if (refreshToken) {
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
            
            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axiosInstance(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed, clear all tokens and redirect to login
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

