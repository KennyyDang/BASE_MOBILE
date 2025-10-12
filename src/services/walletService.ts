// Wallet Service
import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../constants';
import { Wallet, Transaction, TopUpForm, ApiResponse, PaginatedResponse } from '../types';

class WalletService {
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
}

export const walletService = new WalletService();
export default walletService;
