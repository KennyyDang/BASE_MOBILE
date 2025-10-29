// Wallet Hook
import { useState, useEffect } from 'react';
import { walletService } from '../services';
import { Wallet, Transaction, TopUpForm } from '../types';
import { CurrentUserWalletResponse, StudentWalletResponse } from '../types/api';
import { useApi, usePaginatedApi } from './useApi';
import { useCurrentUserStudents } from './useChildrenApi';

/**
 * Hook to fetch current user wallet
 * Uses GET /api/Wallet/curent-user endpoint
 */
export function useCurrentUserWallet() {
  const [data, setData] = useState<CurrentUserWalletResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      setError(null);
      const wallet = await walletService.getCurrentUserWallet();
      setData(wallet);
      return wallet;
    } catch (err: any) {
      const errorMessage = err.message || 'Không thể lấy thông tin ví';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchWallet,
  };
}

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

/**
 * Hook to fetch all student wallets for current user
 * Fetches students list, then fetches wallet for each student
 */
export function useStudentWallets() {
  const [studentWallets, setStudentWallets] = useState<StudentWalletResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get students list
  const { students, loading: studentsLoading, refetch: refetchStudents } = useCurrentUserStudents(1, 100);

  const fetchStudentWallets = async () => {
    if (!students || students.length === 0) {
      setStudentWallets([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Fetch wallet for each student
      const walletPromises = students.map(student => 
        walletService.getStudentWallet(student.id).catch(err => {
          // If wallet doesn't exist for a student, return null
          return null;
        })
      );

      const wallets = await Promise.all(walletPromises);
      
      // Filter out null values (students without wallets)
      const validWallets = wallets.filter(wallet => wallet !== null) as StudentWalletResponse[];
      setStudentWallets(validWallets);
    } catch (err: any) {
      const errorMessage = err.message || 'Không thể lấy danh sách ví của con';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!studentsLoading) {
      if (students.length > 0) {
        fetchStudentWallets();
      } else {
        setStudentWallets([]);
      }
    }
  }, [students, studentsLoading]);

  const refetch = async () => {
    await refetchStudents();
    await fetchStudentWallets();
  };

  return {
    data: studentWallets,
    loading: loading || studentsLoading,
    error,
    refetch,
    studentCount: students.length,
  };
}
