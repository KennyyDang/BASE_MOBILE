import axiosInstance from '../config/axios.config';
import { TransactionResponse, TransactionListParams, TransactionListResponse } from '../types/api';

/**
 * Transaction Service
 * Handles transaction history API calls
 */
class TransactionService {
  /**
   * Get transaction history for current user
   * Endpoint: GET /api/Transaction/me
   * Returns all transactions of Parent wallet and Student wallets with FULL INFO
   * 
   * @param params Query parameters for filtering and pagination
   * @returns Paginated list of transactions
   */
  async getMyTransactions(params?: TransactionListParams): Promise<TransactionListResponse> {
    try {
      const queryParams: Record<string, any> = {};
      
      if (params?.pageIndex) {
        queryParams.pageIndex = params.pageIndex;
      }
      if (params?.pageSize) {
        queryParams.pageSize = params.pageSize;
      }
      if (params?.type) {
        queryParams.type = params.type;
      }
      if (params?.fromDate) {
        queryParams.fromDate = params.fromDate;
      }
      if (params?.toDate) {
        queryParams.toDate = params.toDate;
      }

      const response = await axiosInstance.get<TransactionListResponse>('/api/Transaction/me', {
        params: queryParams,
      });
      
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch transactions';
    }
  }

  /**
   * Get transaction by ID
   * Endpoint: GET /api/Transaction/{id}
   * @param transactionId Transaction ID
   * @returns Transaction detail
   */
  async getTransactionById(transactionId: string): Promise<TransactionResponse> {
    try {
      const response = await axiosInstance.get<TransactionResponse>(`/api/Transaction/${transactionId}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch transaction detail';
    }
  }
}

export const transactionService = new TransactionService();
export default transactionService;

