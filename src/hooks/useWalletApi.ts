// Wallet Hook
import { useState, useEffect } from 'react';
import { walletService } from '../services';
import { Wallet, Transaction, TopUpForm } from '../types';
import { useApi, usePaginatedApi } from './useApi';

export function useWalletBalance() {
  return useApi(() => walletService.getWalletBalance(), { immediate: true });
}

export function useTransactionHistory(page: number = 1, limit: number = 20) {
  return usePaginatedApi(
    (page, limit) => walletService.getTransactionHistory(page, limit),
    page,
    limit
  );
}

export function useWalletStats() {
  return useApi(() => walletService.getWalletStats(), { immediate: true });
}

export function useTopUpWallet() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const topUp = async (topUpData: TopUpForm) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const response = await walletService.topUpWallet(topUpData);
      
      if (response.success) {
        setSuccess(true);
        return { success: true, data: response.data };
      } else {
        setError(response.message || 'Top-up failed');
        return { success: false, error: response.message };
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setError(null);
    setSuccess(false);
  };

  return {
    topUp,
    loading,
    error,
    success,
    reset,
  };
}
