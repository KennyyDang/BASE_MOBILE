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
  // Primary Color Palette - Teal/Mint Green (Main Brand Color) - Đồng bộ với web
  PRIMARY: '#5cbdb9', // Teal/Mint Green - Main brand color
  PRIMARY_DARK: '#4a9a96', // Darker teal for important elements
  PRIMARY_LIGHT: '#7dd3cf', // Light teal for accents and highlights
  PRIMARY_50: '#ebf6f5', // Very light teal background
  PRIMARY_100: '#d4edea', // Light teal background
  
  // Secondary Color Palette - Pink (Accent Only) - Đồng bộ với web
  SECONDARY: '#f5a8b8', // Pink - Secondary actions and buttons
  SECONDARY_DARK: '#e88a9f', // Darker pink
  SECONDARY_LIGHT: '#fbc4d0', // Light pink
  SECONDARY_50: '#fbe3e8', // Very light pink background
  
  // Accent Color - Teal Green (same as primary)
  ACCENT: '#f5a8b8', // Pink for top-up button (đồng bộ với web - secondary color)
  
  // Background Colors - Đồng bộ với web
  BACKGROUND: '#ebf6f5', // Light teal background (--bg-tertiary)
  BACKGROUND_SECONDARY: '#fafafa', // Light gray background (--bg-secondary)
  SURFACE: '#FFFFFF', // White surface (--bg-primary)
  
  // Semantic Colors
  ERROR: '#ef4444', // Red for errors
  ERROR_LIGHT: '#f87171',
  ERROR_DARK: '#dc2626',
  WARNING: '#f59e0b', // Orange for warnings
  WARNING_LIGHT: '#fbbf24',
  WARNING_DARK: '#d97706',
  SUCCESS: '#5cbdb9', // Teal for success (same as primary)
  SUCCESS_LIGHT: '#7dd3cf',
  SUCCESS_DARK: '#4a9a96',
  INFO: '#5cbdb9', // Teal for info (same as primary)
  INFO_LIGHT: '#7dd3cf',
  INFO_DARK: '#4a9a96',
  
  // Background colors for semantic states
  SUCCESS_BG: '#d4edea', // Light teal background for success states
  INFO_BG: '#d4edea', // Light teal background for info states
  WARNING_BG: '#fff3e0', // Light orange background for warning states
  ERROR_BG: '#ffebee', // Light red background for error states
  
  // Text Colors - Đồng bộ với web
  TEXT_PRIMARY: '#2d2d2d', // Dark gray for primary text
  TEXT_SECONDARY: '#616161', // Medium gray for secondary text
  TEXT_TERTIARY: '#9e9e9e', // Light gray for tertiary text
  TEXT_INVERSE: '#ffffff', // White text on dark backgrounds
  
  // Border Colors - Đồng bộ với web
  BORDER: '#ebf6f5', // Light teal border (--border-light)
  BORDER_MEDIUM: '#e0e0e0', // Medium gray border
  BORDER_DARK: '#c0c0c0', // Dark gray border
  
  // Shadow
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

export const DOCUMENT_TYPES = [
  { id: 'BirthCertificate', name: 'Giấy khai sinh' },
  { id: 'IDCard', name: 'Chứng minh thư' },
  { id: 'Passport', name: 'Hộ chiếu' },
  { id: 'SchoolCertificate', name: 'Bằng cấp trường học' },
  { id: 'VaccinationRecord', name: 'Sổ tiêm chủng' },
];

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
  STUDENT_DELETE: '/api/Student/:id',
  
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
  
  // Schools
  SCHOOL_PAGED: '/api/School/paged',
  
  // Student Levels
  STUDENT_LEVEL_PAGED: '/api/StudentLevel/paged',
  
  // Register Child
  STUDENT_REGISTER_CHILD: '/api/Student/register-child',

  // Student Document
  STUDENT_ADD_DOCUMENT: '/api/Student/:studentId/document',

  // Branch Transfer
  BRANCH_TRANSFER_REQUEST: '/Student/branch-transfer/request',
  BRANCH_TRANSFER_REQUESTS: '/Student/branch-transfer/requests',
};
