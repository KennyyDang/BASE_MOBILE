/**
 * Storage Utilities
 * Helpers for AsyncStorage operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/axios.config';

const storageUtils = {
  /**
   * Clear all app-related data from AsyncStorage
   */
  clearAll: async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.USER,
      ]);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get all stored keys (for debugging)
   */
  getAllKeys: async (): Promise<string[]> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return Array.from(keys);
    } catch (error) {
      return [];
    }
  },

  /**
   * Check if user is authenticated
   */
  hasToken: async (): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      return !!token;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get user data
   */
  getUser: async (): Promise<any> => {
    try {
      const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get access token
   */
  getToken: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      return null;
    }
  },

  /**
   * Clear EVERYTHING from AsyncStorage (use with caution!)
   */
  clearAllStorage: async (): Promise<void> => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      throw error;
    }
  },
};

export default storageUtils;
