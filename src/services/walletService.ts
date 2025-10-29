// Wallet Service
import { apiClient } from './apiClient';
import axiosInstance from '../config/axios.config';
import { API_ENDPOINTS } from '../constants';
import { Wallet, Transaction, TopUpForm, ApiResponse, PaginatedResponse } from '../types';
import { CurrentUserWalletResponse, StudentWalletResponse, TransferSmartRequest, TransferSmartResponse } from '../types/api';

class WalletService {
  /**
   * Get current user wallet
   * Endpoint: GET /api/Wallet/curent-user
   * Returns wallet information for the currently authenticated user
   */
  async getCurrentUserWallet(): Promise<CurrentUserWalletResponse> {
    try {
      const response = await axiosInstance.get<CurrentUserWalletResponse>('/api/Wallet/curent-user');
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch wallet';
    }
  }

  // Get wallet balance
  async getWalletBalance(): Promise<ApiResponse<Wallet[]>> {
    return await apiClient.get<Wallet[]>(API_ENDPOINTS.WALLET_BALANCE);
  }

  // Get transaction history
  async getTransactionHistory(
    page: number = 1,
    limit: number = 20,
    walletType?: string
  ): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (walletType) {
      params.append('walletType', walletType);
    }

    return await apiClient.get<PaginatedResponse<Transaction>>(
      `${API_ENDPOINTS.WALLET_TRANSACTIONS}?${params.toString()}`
    );
  }

  // Top up wallet
  async topUpWallet(topUpData: TopUpForm): Promise<ApiResponse<Transaction>> {
    return await apiClient.post<Transaction>(API_ENDPOINTS.TOP_UP_WALLET, topUpData);
  }

  // Get transaction by ID
  async getTransactionById(transactionId: string): Promise<ApiResponse<Transaction>> {
    return await apiClient.get<Transaction>(`${API_ENDPOINTS.WALLET_TRANSACTIONS}/${transactionId}`);
  }

  // Get wallet statistics
  async getWalletStats(): Promise<ApiResponse<{
    totalBalance: number;
    mainWalletBalance: number;
    allowanceWalletBalance: number;
    monthlySpending: number;
    transactionCount: number;
  }>> {
    return await apiClient.get(`${API_ENDPOINTS.WALLET_BALANCE}/stats`);
  }

  /**
   * Get student wallet by studentId
   * Endpoint: GET /api/Wallet/student/{studentId}
   * Returns wallet information for a specific student
   */
  async getStudentWallet(studentId: string): Promise<StudentWalletResponse> {
    try {
      const response = await axiosInstance.get<StudentWalletResponse>(`/api/Wallet/student/${studentId}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch student wallet';
    }
  }

  /**
   * Transfer money smart to student wallet
   * Endpoint: POST /api/Wallet/transfer-smart
   * Transfer money from current user wallet to student wallet
   */
  async transferSmartToStudent(transferData: TransferSmartRequest): Promise<TransferSmartResponse> {
    try {
      const response = await axiosInstance.post<TransferSmartResponse>('/api/Wallet/transfer-smart', transferData);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to transfer money to student';
    }
  }
}

export const walletService = new WalletService();
export default walletService;
