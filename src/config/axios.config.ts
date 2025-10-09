import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@env';

// Storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@base_access_token',
  USER: '@base_user',
} as const;

/**
 * Create axios instance with base configuration
 */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL || 'http://localhost:5000/api',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - Add token to requests
 */
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }return config;
    } catch (error) {return config;
    }
  },
  (error: AxiosError) => {return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle errors globally
 */
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {return response;
  },
  async (error: AxiosError) => {
    if (error.response) {
      const { status, data } = error.response;// Handle different error status codes
      switch (status) {
        case 401:
          // Unauthorized - clear token and user dataawait AsyncStorage.multiRemove([
            STORAGE_KEYS.ACCESS_TOKEN,
            STORAGE_KEYS.USER,
          ]);
          // Note: Navigation to login screen should be handled in the component/context
          break;
        
        case 403:
          // Forbiddenbreak;
        
        case 404:
          // Not foundbreak;
        
        case 500:
          // Server errorbreak;
        
        default:}
    } else if (error.request) {
      // Request was made but no response received} else {
      // Something else happened}
    
    return Promise.reject(error);
  }
);

export default axiosInstance;

