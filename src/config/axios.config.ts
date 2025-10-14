import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@env';

// Storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@base_access_token',
  USER: '@base_user',
} as const;

// Prefer env; fallback to local dev IP. Do NOT append /api here; endpoints should include their full path.
const DEV_BASE_URL = 'http://192.168.2.7:5160';

// Create axios instance with base configuration
const axiosInstance: AxiosInstance = axios.create({
  baseURL: (API_BASE_URL && API_BASE_URL.trim()) || DEV_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach Bearer token
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

// Response interceptor - handle 401 globally
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    if (error.response) {
      const { status } = error.response;
      if (status === 401) {
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.ACCESS_TOKEN,
          STORAGE_KEYS.USER,
        ]);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;

