// BASE Mobile App Constants
// Brighway After-School Management System

export const APP_CONFIG = {
  NAME: 'BASE',
  FULL_NAME: 'Brighway After-School Management System',
  VERSION: '1.0.0',
  API_BASE_URL: 'https://api.brighway.edu.vn', // Will be configured based on environment
  APP_STORE_URL: '',
  PLAY_STORE_URL: '',
};

export const COLORS = {
  PRIMARY: '#2E7D32', // Green for education theme
  PRIMARY_DARK: '#1B5E20',
  PRIMARY_LIGHT: '#4CAF50',
  SECONDARY: '#FF6F00', // Orange for highlights
  ACCENT: '#2196F3', // Blue for actions
  BACKGROUND: '#F5F5F5',
  SURFACE: '#FFFFFF',
  ERROR: '#F44336',
  WARNING: '#FF9800',
  SUCCESS: '#4CAF50',
  INFO: '#2196F3',
  TEXT_PRIMARY: '#212121',
  TEXT_SECONDARY: '#757575',
  BORDER: '#E0E0E0',
  SHADOW: '#000000',
};

export const FONTS = {
  REGULAR: 'System',
  MEDIUM: 'System',
  BOLD: 'System',
  SIZES: {
    XS: 12,
    SM: 14,
    MD: 16,
    LG: 18,
    XL: 20,
    XXL: 24,
    XXXL: 32,
  },
};

export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
};

export const SCREEN_NAMES = {
  // Auth Screens
  LOGIN: 'Login',
  REGISTER: 'Register',
  FORGOT_PASSWORD: 'ForgotPassword',
  
  // Main App Screens
  DASHBOARD: 'Dashboard',
  SCHEDULE: 'Schedule',
  WALLET: 'Wallet',
  PROFILE: 'Profile',
  
  // Wallet Screens
  MAIN_WALLET: 'MainWallet',
  ALLOWANCE_WALLET: 'AllowanceWallet',
  TRANSACTION_HISTORY: 'TransactionHistory',
  TOP_UP: 'TopUp',
  
  // Schedule Screens
  WEEKLY_SCHEDULE: 'WeeklySchedule',
  CLASS_DETAILS: 'ClassDetails',
  REGISTER_CLASS: 'RegisterClass',
  
  // Profile Screens
  PARENT_PROFILE: 'ParentProfile',
  CHILD_PROFILE: 'ChildProfile',
  ADD_CHILD: 'AddChild',
  EDIT_CHILD: 'EditChild',
  
  // Settings Screens
  SETTINGS: 'Settings',
  NOTIFICATIONS: 'Notifications',
  HELP: 'Help',
  ABOUT: 'About',
} as const;

export const MEMBERSHIP_TYPES = {
  EVEN_DAY: 'EVEN_DAY',
  ODD_DAY: 'ODD_DAY',
  FULL_WEEK: 'FULL_WEEK',
};

export const WALLET_TYPES = {
  MAIN: 'MAIN',
  ALLOWANCE: 'ALLOWANCE',
};

export const TRANSACTION_TYPES = {
  TOP_UP: 'TOP_UP',
  PAYMENT: 'PAYMENT',
  REFUND: 'REFUND',
  ALLOWANCE_SPENDING: 'ALLOWANCE_SPENDING',
  MEMBERSHIP_PURCHASE: 'MEMBERSHIP_PURCHASE',
};

export const NOTIFICATION_TYPES = {
  CLASS_REMINDER: 'CLASS_REMINDER',
  PAYMENT_CONFIRMATION: 'PAYMENT_CONFIRMATION',
  ATTENDANCE_RECORD: 'ATTENDANCE_RECORD',
  CENTER_ANNOUNCEMENT: 'CENTER_ANNOUNCEMENT',
  WALLET_LOW_BALANCE: 'WALLET_LOW_BALANCE',
};

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  MOBILE_LOGIN: '/api/Auth/mobile-login',
  REGISTER: '/auth/register',
  REFRESH_TOKEN: '/auth/refresh',
  LOGOUT: '/auth/logout',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  
  // User Management
  PROFILE: '/users/profile',
  UPDATE_PROFILE: '/users/profile',
  CURRENT_USER: '/api/User/current-user',
  
  // Children Management
  CHILDREN: '/children',
  ADD_CHILD: '/children',
  UPDATE_CHILD: '/children/:id',
  DELETE_CHILD: '/children/:id',
  STUDENT_PAGED_CURRENT_USER: '/api/Student/paged/current-user',
  STUDENT_MY_CHILDREN: '/api/Student/my-children',
  
  // Wallet
  WALLET_BALANCE: '/wallet/balance',
  WALLET_TRANSACTIONS: '/wallet/transactions',
  TOP_UP_WALLET: '/wallet/top-up',
  DEPOSIT_CREATE: '/api/Deposit/create',
  DEPOSIT_WEBHOOK: '/api/Deposit/webhook/payos',
  
  // Schedule
  SCHEDULE: '/schedule',
  WEEKLY_SCHEDULE: '/schedule/weekly',
  REGISTER_CLASS: '/schedule/register',
  CANCEL_CLASS: '/schedule/cancel/:id',
  
  // Courses
  COURSES: '/courses',
  COURSE_DETAILS: '/courses/:id',
  AVAILABLE_COURSES: '/courses/available',
  
  // Packages
  STUDENT_SUITABLE_PACKAGES: '/api/Package/student/:studentId/suitable-packages',
  PACKAGE_BUY_FOR_CHILD: '/api/PackageSubscription/buy-for-child',

  // NFC Integration
  NFC_CHECK_IN: '/nfc/check-in',
  NFC_CHECK_OUT: '/nfc/check-out',
  NFC_PAYMENT: '/nfc/payment',
  
  // Notifications
  NOTIFICATIONS: '/api/Notification',
  MARK_NOTIFICATION_READ: '/api/Notification/:id/mark-read',
  REGISTER_PUSH_TOKEN: '/api/Notification/register-token',
};
