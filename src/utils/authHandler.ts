/**
 * Global auth handler for handling logout from axios interceptors
 * This allows axios interceptors to trigger logout when token is invalid
 */

import { NavigationContainerRef } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/axios.config';

type LogoutHandler = () => Promise<void>;
type NavigationRef = NavigationContainerRef<any> | null;

let logoutHandler: LogoutHandler | null = null;
let navigationRef: NavigationRef = null;
let isHandlingUnauthorized = false; // Flag to prevent multiple simultaneous calls

export const authHandler = {
  /**
   * Register logout handler from AuthContext
   */
  setLogoutHandler: (handler: LogoutHandler) => {
    logoutHandler = handler;
  },

  /**
   * Register navigation ref from AppNavigator
   */
  setNavigationRef: (ref: NavigationRef) => {
    navigationRef = ref;
  },

  /**
   * Check if currently handling unauthorized logout
   */
  isHandling: (): boolean => {
    return isHandlingUnauthorized;
  },

  /**
   * Trigger logout and redirect to login
   * Called by axios interceptor when token is invalid
   */
  handleUnauthorized: async (message?: string) => {
    // Prevent multiple simultaneous calls
    if (isHandlingUnauthorized) {
      return;
    }
    
    isHandlingUnauthorized = true;
    
    try {
      // Clear tokens first
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
      ]);

      // Call logout handler if registered
      if (logoutHandler) {
        await logoutHandler();
      }

      // Navigate to login screen
      if (navigationRef?.isReady()) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    } catch (error) {
      // Only log error once, silently handle subsequent errors
      if (__DEV__) {
        console.error('[AuthHandler] Error handling unauthorized:', error);
      }
    } finally {
      // Reset flag after a delay to allow navigation to complete
      setTimeout(() => {
        isHandlingUnauthorized = false;
      }, 2000);
    }
  },
};

