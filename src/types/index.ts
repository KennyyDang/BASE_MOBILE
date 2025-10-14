// BASE Mobile App Type Definitions
// Brighway After-School Management System

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Parent extends User {
  role: 'PARENT';
  children: Child[];
  wallets: Wallet[];
}

export interface Child {
  id: string;
  parentId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  avatar?: string;
  grade: string;
  school: string;
  emergencyContact: string;
  medicalInfo?: string;
  nfcCardId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  type: WalletType;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string;
  status: TransactionStatus;
  reference?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  subject: string;
  grade: string;
  duration: number; // in minutes
  maxStudents: number;
  price: number;
  currency: string;
  teacherId: string;
  teacher?: Teacher;
  schedule: Schedule[];
  prerequisites?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  id: string;
  courseId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  room: string;
  isActive: boolean;
}

export interface ClassSession {
  id: string;
  courseId: string;
  scheduleId: string;
  date: string; // YYYY-MM-DD format
  startTime: string;
  endTime: string;
  room: string;
  teacherId: string;
  teacher?: Teacher;
  enrolledStudents: string[];
  attendance: AttendanceRecord[];
  status: ClassStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  classSessionId: string;
  childId: string;
  child?: Child;
  checkInTime?: string;
  checkOutTime?: string;
  checkInMethod: CheckInMethod;
  checkOutMethod?: CheckInMethod;
  status: AttendanceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar?: string;
  subjects: string[];
  bio?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  name: string;
  type: MembershipType;
  description: string;
  price: number;
  currency: string;
  validityDays: number;
  benefits: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserMembership {
  id: string;
  userId: string;
  membershipId: string;
  membership?: Membership;
  childId: string;
  child?: Child;
  purchaseDate: string;
  expiryDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NFCCard {
  id: string;
  cardId: string; // Physical NFC card ID
  childId: string;
  child?: Child;
  isActive: boolean;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NFCEvent {
  id: string;
  cardId: string;
  eventType: NFCEventType;
  location: string;
  amount?: number;
  description: string;
  timestamp: string;
  processed: boolean;
  createdAt: string;
}

// Enums
export type UserRole = 'PARENT' | 'TEACHER' | 'ADMIN';
export type WalletType = 'MAIN' | 'ALLOWANCE';
export type TransactionType = 'TOP_UP' | 'PAYMENT' | 'REFUND' | 'ALLOWANCE_SPENDING' | 'MEMBERSHIP_PURCHASE';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type MembershipType = 'EVEN_DAY' | 'ODD_DAY' | 'FULL_WEEK';
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type ClassStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
export type CheckInMethod = 'NFC' | 'MANUAL' | 'QR_CODE';
export type NotificationType = 'CLASS_REMINDER' | 'PAYMENT_CONFIRMATION' | 'ATTENDANCE_RECORD' | 'CENTER_ANNOUNCEMENT' | 'WALLET_LOW_BALANCE';
export type NFCEventType = 'CHECK_IN' | 'CHECK_OUT' | 'PAYMENT' | 'CARD_TAP';

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Navigation Types
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Schedule: undefined;
  Wallet: undefined;
  Profile: undefined;
};

export type WalletStackParamList = {
  WalletHome: undefined;
  MainWallet: undefined;
  AllowanceWallet: undefined;
  TransactionHistory: undefined;
  TopUp: undefined;
};

export type ScheduleStackParamList = {
  ScheduleHome: undefined;
  WeeklySchedule: undefined;
  ClassDetails: { classId: string };
  RegisterClass: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  ParentProfile: undefined;
  ChildProfile: { childId: string };
  AddChild: undefined;
  EditChild: { childId: string };
  Settings: undefined;
};

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface ChildForm {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  grade: string;
  school: string;
  emergencyContact: string;
  medicalInfo?: string;
}

export interface TopUpForm {
  amount: number;
  paymentMethod: string;
  walletType: WalletType;
}

// State Types
export interface AuthState {
  isAuthenticated: boolean;
  user: Parent | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}

export interface WalletState {
  mainWallet: Wallet | null;
  allowanceWallet: Wallet | null;
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
}

export interface ScheduleState {
  weeklySchedule: ClassSession[];
  upcomingClasses: ClassSession[];
  loading: boolean;
  error: string | null;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}
