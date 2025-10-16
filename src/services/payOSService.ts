import axiosInstance from '../config/axios.config';

/**
 * PayOS Service
 * Handles payment-related API calls using PayOS
 */

export interface PayOSPaymentRequest {
  amount: number;
  description: string;
  walletType: 'MAIN' | 'ALLOWANCE';
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PayOSPaymentResponse {
  paymentId: string;
  paymentUrl: string;
  qrCode: string;
  amount: number;
  description: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED';
  createdAt: string;
  expiresAt: string;
}

export interface PaymentHistoryItem {
  id: string;
  amount: number;
  description: string;
  walletType: string;
  status: string;
  paymentMethod: string;
  createdAt: string;
  completedAt?: string;
}

const payOSService = {
  /**
   * Create PayOS payment
   * @param paymentData - Payment request data
   * @returns PayOS payment response with payment URL
   */
  createPayment: async (paymentData: PayOSPaymentRequest): Promise<PayOSPaymentResponse> => {
    try {
      const response = await axiosInstance.post<PayOSPaymentResponse>('/api/Payment/payos/create', paymentData);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to create payment';
    }
  },

  /**
   * Get payment status
   * @param paymentId - Payment ID
   * @returns Payment status
   */
  getPaymentStatus: async (paymentId: string): Promise<PayOSPaymentResponse> => {
    try {
      const response = await axiosInstance.get<PayOSPaymentResponse>(`/api/Payment/payos/status/${paymentId}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to get payment status';
    }
  },

  /**
   * Cancel payment
   * @param paymentId - Payment ID
   * @returns Cancellation result
   */
  cancelPayment: async (paymentId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await axiosInstance.post(`/api/Payment/payos/cancel/${paymentId}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to cancel payment';
    }
  },

  /**
   * Get payment history
   * @param page - Page number
   * @param limit - Items per page
   * @returns Payment history
   */
  getPaymentHistory: async (page: number = 1, limit: number = 10): Promise<{
    items: PaymentHistoryItem[];
    total: number;
    page: number;
    limit: number;
  }> => {
    try {
      const response = await axiosInstance.get(`/api/Payment/history?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to get payment history';
    }
  },

  /**
   * Get wallet balance
   * @param walletType - Type of wallet
   * @returns Wallet balance
   */
  getWalletBalance: async (walletType: 'MAIN' | 'ALLOWANCE'): Promise<{
    balance: number;
    currency: string;
    walletType: string;
  }> => {
    try {
      const response = await axiosInstance.get(`/api/Wallet/${walletType.toLowerCase()}/balance`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to get wallet balance';
    }
  },
};

export default payOSService;
