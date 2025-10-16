import { useState, useEffect } from 'react';
import payOSService, { PayOSPaymentRequest, PayOSPaymentResponse, PaymentHistoryItem } from '../services/payOSService';

/**
 * Hook for managing PayOS payments
 */
export const usePayOSPayment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [currentPayment, setCurrentPayment] = useState<PayOSPaymentResponse | null>(null);

  /**
   * Create payment
   */
  const createPayment = async (paymentData: PayOSPaymentRequest) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await payOSService.createPayment(paymentData);
      
      setCurrentPayment(response);
      setPaymentUrl(response.paymentUrl);
      setQrCode(response.qrCode);
      
      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to create payment');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check payment status
   */
  const checkPaymentStatus = async (paymentId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await payOSService.getPaymentStatus(paymentId);
      setCurrentPayment(response);
      
      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to check payment status');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancel payment
   */
  const cancelPayment = async (paymentId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await payOSService.cancelPayment(paymentId);
      
      // Clear current payment
      setCurrentPayment(null);
      setPaymentUrl(null);
      setQrCode(null);
      
      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to cancel payment');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear payment data
   */
  const clearPayment = () => {
    setCurrentPayment(null);
    setPaymentUrl(null);
    setQrCode(null);
    setError(null);
  };

  return {
    loading,
    error,
    paymentUrl,
    qrCode,
    currentPayment,
    createPayment,
    checkPaymentStatus,
    cancelPayment,
    clearPayment,
  };
};

/**
 * Hook for payment history
 */
export const usePaymentHistory = () => {
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  /**
   * Fetch payment history
   */
  const fetchHistory = async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await payOSService.getPaymentHistory(pageNum, 10);
      
      if (refresh) {
        setHistory(response.items);
      } else {
        setHistory(prev => [...prev, ...response.items]);
      }
      
      setHasMore(response.items.length === 10);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payment history');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load more history
   */
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchHistory(page + 1);
    }
  };

  /**
   * Refresh history
   */
  const refresh = () => {
    fetchHistory(1, true);
  };

  // Auto-fetch on mount
  useEffect(() => {
    fetchHistory(1, true);
  }, []);

  return {
    history,
    loading,
    error,
    hasMore,
    fetchHistory,
    loadMore,
    refresh,
  };
};
