/**
 * API Types
 * Type definitions for API requests and responses
 */

// JWT Claim Types - Standard identifiers for user information
export const JWT_CLAIMS = {
  USER_ID: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
  EMAIL: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
  ROLE: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
} as const;

// Login
export interface LoginRequest {
  email: string;
  password: string;
}

export interface MobileLoginRequest extends LoginRequest {
  firebaseToken?: string;
  deviceName?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
}

export interface DecodedJWT {
  [JWT_CLAIMS.USER_ID]: string;
  [JWT_CLAIMS.EMAIL]: string;
  [JWT_CLAIMS.ROLE]: string;
  exp?: number;
  iat?: number;
  nbf?: number;
}

export interface UserInfo {
  id: string;
  email: string;
  role: string;
}

// API Error Response
export interface ApiError {
  message: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
}

// Generic API Response wrapper
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  success: boolean;
}

// Wallet API Response
export interface CurrentUserWalletResponse {
  id: string;
  type: string; // "Main" | "Allowance"
  balance: number;
  userId: string;
  userEmail: string;
  studentId: string;
  studentName: string | null;
  createdTime: string;
}

// Paginated Response
export interface PaginatedResponse<T> {
  items: T[];
  pageIndex: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface BranchSlotBranchResponse {
  id: string;
  branchName: string;
}

export interface BranchSlotTimeframeResponse {
  id: string;
  name: string;
  description?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

export interface BranchSlotTypeResponse {
  id: string;
  name: string;
  description?: string | null;
}

export interface BranchSlotStaffResponse {
  id?: string;
  fullName?: string | null;
  role?: string | null;
  phoneNumber?: string | null;
  [key: string]: any;
}

export interface BranchSlotResponse {
  id: string;
  branchId: string;
  branch?: BranchSlotBranchResponse | null;
  timeframeId: string;
  timeframe?: BranchSlotTimeframeResponse | null;
  slotTypeId: string;
  slotType?: BranchSlotTypeResponse | null;
  weekDate: number;
  status: string;
  staff: BranchSlotStaffResponse[];
  packageSubscriptionId?: string | null;
  studentPackageSubscriptionId?: string | null;
  packageSubscription?: {
    id: string;
    name?: string | null;
    remainingSlots?: number | null;
  } | null;
  packageName?: string | null;
  packageSubscriptionName?: string | null;
  packageRemainingSlots?: number | null;
}

export interface BranchSlotRoomResponse {
  id: string;
  roomName: string;
  facilityId?: string | null;
  facilityName?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  capacity?: number | null;
}

export interface StudentPackageSubscription {
  id: string;
  packageId: string;
  packageName: string;
  studentId: string;
  studentName: string;
  startDate: string;
  endDate: string;
  usedSlot: number;
  status: string;
  priceFinal?: number | null;
  durationMonthsSnapshot?: number | null;
  totalSlotsSnapshot?: number | null;
  snapshotBenefitsJson?: string | null;
}

export interface BookStudentSlotRequest {
  studentId: string;
  branchSlotId: string;
  packageSubscriptionId: string;
  roomId: string;
  date: string;
  parentNote?: string;
}

export interface BookStudentSlotResponse {
  success: boolean;
  message?: string;
  data?: any;
}

// Student API Response
export interface StudentResponse {
  id: string;
  name: string;
  age: number;
  dateOfBirth: string;
  image: string;
  note: string;
  status: boolean;
  userId: string;
  userName: string;
  branchId: string;
  branchName: string | null;
  schoolId: string;
  schoolName: string;
  studentLevelId: string;
  studentLevelName: string;
  createdTime: string;
}

// Student Wallet Response
export interface StudentWalletResponse {
  id: string;
  type: string;
  balance: number;
  userId: string;
  userEmail: string | null;
  studentId: string;
  studentName: string | null;
  createdTime: string;
}

// Deposit API Response
export interface DepositCreateRequest {
  amount: number;
}

export interface DepositCreateResponse {
  depositId: string;
  checkoutUrl: string;
  qrCodeUrl: string;
  status: string;
  orderCode: number;
  amount: number;
}

// Packages
export interface PackageBenefit {
  id: string;
  name: string;
  description?: string | null;
}

export interface PackageBranchInfo {
  id: string;
  branchName: string;
}

export interface PackageStudentLevelInfo {
  id: string;
  name: string;
}

export interface StudentPackageResponse {
  id: string;
  name: string;
  desc: string;
  durationInMonths: number;
  totalSlots: number;
  price: number;
  isActive: boolean;
  createdTime?: string;
  packageTemplateId?: string;
  packageTemplateName?: string | null;
  benefits: PackageBenefit[];
  branch?: PackageBranchInfo | null;
  branchId?: string | null;
  studentLevel?: PackageStudentLevelInfo | null;
  studentLevelId?: string | null;
}

export interface RegisterPackageRequest {
  packageId: string;
  studentId: string;
  startDate?: string;
}

export interface RegisterPackageResponse {
  success: boolean;
  message?: string;
  walletBalance?: number;
}

// Transfer Smart API
export interface TransferSmartRequest {
  toStudentId: string;
  amount: number;
  note?: string;
}

export interface TransferSmartResponse {
  success: boolean;
  message: string;
}

