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

export interface LoginResponse {
  token: string;
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

