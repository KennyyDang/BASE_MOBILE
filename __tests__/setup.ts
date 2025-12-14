/**
 * Jest Setup File
 * Configure test environment, mocks, and global utilities
 */

import '@testing-library/jest-native/extend-expect';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
  multiSet: jest.fn(),
  getAllKeys: jest.fn(),
  clear: jest.fn(),
}));

// Mock Expo modules
jest.mock('expo-device', () => ({
  modelName: 'MockDevice',
  brand: 'MockBrand',
  deviceName: 'Mock Device Name',
}));

jest.mock('expo-notifications', () => {
  const createSubscription = () => ({ remove: jest.fn() });

  return {
    addNotificationReceivedListener: jest.fn(() => createSubscription()),
    addNotificationResponseReceivedListener: jest.fn(() => createSubscription()),
    removeNotificationSubscription: jest.fn(),
    getLastNotificationResponseAsync: jest.fn(),
    setNotificationHandler: jest.fn(),
    getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'mock-token' }),
    setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
    scheduleNotificationAsync: jest.fn().mockResolvedValue('mock-notification-id'),
    cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
    dismissAllNotificationsAsync: jest.fn().mockResolvedValue(undefined),
    setBadgeCountAsync: jest.fn().mockResolvedValue(undefined),
    getBadgeCountAsync: jest.fn().mockResolvedValue(0),
    cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
    getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
    AndroidImportance: {
      MAX: 'max',
      HIGH: 'high',
    },
  };
});

jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));

// Mock react-native modules
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');
jest.mock('react-native/Libraries/Components/Keyboard/Keyboard', () => ({
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  removeListener: jest.fn(),
  dismiss: jest.fn(),
  isVisible: jest.fn(() => false),
}));

// Mock react-navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

// Mock console methods in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};

// Suppress warnings in tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});
