// Authentication Service
import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../constants';
import { LoginForm, RegisterForm, Parent, ApiResponse } from '../types';

export interface LoginResponse {
  user: Parent;
  token: string;
  refreshToken: string;
}

export interface RegisterResponse {
  user: Parent;
  token: string;
  refreshToken: string;
}

class AuthService {
  // Login user
  async login(credentials: LoginForm): Promise<ApiResponse<LoginResponse>> {
    return await apiClient.post<LoginResponse>(API_ENDPOINTS.LOGIN, credentials);
  }

  // Register new user
  async register(userData: RegisterForm): Promise<ApiResponse<RegisterResponse>> {
    return await apiClient.post<RegisterResponse>(API_ENDPOINTS.REGISTER, userData);
  }

  // Refresh token
  async refreshToken(refreshToken: string): Promise<ApiResponse<{ token: string; refreshToken: string }>> {
    return await apiClient.post(API_ENDPOINTS.REFRESH_TOKEN, { refreshToken });
  }

  // Logout user
  async logout(): Promise<ApiResponse<void>> {
    return await apiClient.post(API_ENDPOINTS.LOGOUT);
  }

  // Get user profile
  async getProfile(): Promise<ApiResponse<Parent>> {
    return await apiClient.get<Parent>(API_ENDPOINTS.PROFILE);
  }

  // Update user profile
  async updateProfile(userData: Partial<Parent>): Promise<ApiResponse<Parent>> {
    return await apiClient.put<Parent>(API_ENDPOINTS.UPDATE_PROFILE, userData);
  }

  // Forgot password
  async forgotPassword(email: string): Promise<ApiResponse<void>> {
    return await apiClient.post(API_ENDPOINTS.FORGOT_PASSWORD, { email });
  }

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<void>> {
    return await apiClient.post(API_ENDPOINTS.RESET_PASSWORD, { token, newPassword });
  }
}

export const authService = new AuthService();
export default authService;
