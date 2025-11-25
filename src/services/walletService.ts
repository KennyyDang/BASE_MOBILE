// Wallet Service
import { apiClient } from './apiClient';
import axiosInstance from '../config/axios.config';
import { API_ENDPOINTS } from '../constants';
import { Wallet, Transaction, TopUpForm, ApiResponse, PaginatedResponse } from '../types';
import { CurrentUserWalletResponse, StudentWalletResponse, TransferSmartRequest, TransferSmartResponse, DepositResponse } from '../types/api';

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

  /**
   * Get paginated deposits for current user
   * Endpoint: GET /api/Deposit/me
   * @param pageIndex Page number (1-based)
   * @param pageSize Number of items per page
   * @returns Array of deposit transactions
   */
  async getDeposits(
    pageIndex: number = 1,
    pageSize: number = 20
  ): Promise<DepositResponse[]> {
    try {
      const response = await axiosInstance.get<DepositResponse[]>('/api/Deposit/me', {
        params: {
          pageIndex,
          pageSize,
        },
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch deposits';
    }
  }

  /**
   * Get deposit detail by ID
   * Endpoint: GET /api/Deposit/{id}
   * @param depositId Deposit ID (UUID)
   * @returns Deposit detail with checkoutUrl if pending
   */
  async getDepositById(depositId: string): Promise<DepositResponse> {
    try {
      const response = await axiosInstance.get<DepositResponse>(`/api/Deposit/${depositId}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch deposit detail';
    }
  }

  /**
   * Cancel a pending deposit
   * Endpoint: POST /api/Deposit/{id}/cancel
   * @param depositId Deposit ID (UUID)
   * @returns Success response
   */
  async cancelDeposit(depositId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await axiosInstance.post(`/api/Deposit/${depositId}/cancel`);
      return {
        success: true,
        message: response.data?.message || 'Đã hủy giao dịch thành công',
      };
    } catch (error: any) {
      let errorMessage = 'Không thể hủy giao dịch. Vui lòng thử lại.';
      
      if (error.response) {
        const errorData = error.response.data;
        
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.detail) {
          errorMessage = errorData.detail;
        } else if (errorData?.title) {
          errorMessage = errorData.title;
        }
        
        if (error.response.status === 400) {
          errorMessage = errorMessage || 'Không thể hủy giao dịch này.';
        } else if (error.response.status === 404) {
          errorMessage = 'Không tìm thấy giao dịch.';
        } else if (error.response.status === 401) {
          errorMessage = 'Bạn không có quyền hủy giao dịch này.';
        } else if (error.response.status >= 500) {
          errorMessage = 'Lỗi server. Vui lòng thử lại sau.';
        }
      } else if (error.request) {
        errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }
}

export const walletService = new WalletService();
export default walletService;
