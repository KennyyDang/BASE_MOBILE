// Custom Hook for API calls
import { useState, useEffect, useCallback } from 'react';
import { ApiResponse } from '../services';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  success: boolean;
}

interface UseApiOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export function useApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  options: UseApiOptions = {}
) {
  const { immediate = false, onSuccess, onError } = options;
  
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
    success: false,
  });

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await apiCall();
      
      if (response.success) {
        setState({
          data: response.data,
          loading: false,
          error: null,
          success: true,
        });
        onSuccess?.(response.data);
      } else {
        setState({
          data: null,
          loading: false,
          error: response.message || 'API call failed',
          success: false,
        });
        onError?.(response.message || 'API call failed');
      }
    } catch (error: any) {
      setState({
        data: null,
        loading: false,
        error: error.message || 'Network error',
        success: false,
      });
      onError?.(error.message || 'Network error');
    }
  }, [apiCall, onSuccess, onError]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return {
    ...state,
    execute,
    reset: () => setState({
      data: null,
      loading: false,
      error: null,
      success: false,
    }),
  };
}

// Hook for paginated data
export function usePaginatedApi<T>(
  apiCall: (page: number, limit: number) => Promise<ApiResponse<{ items: T[]; total: number; page: number; limit: number; totalPages: number }>>,
  initialPage: number = 1,
  initialLimit: number = 20
) {
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [allData, setAllData] = useState<T[]>([]);
  
  const { data, loading, error, success, execute } = useApi(
    () => apiCall(page, limit),
    { immediate: true }
  );

  const loadMore = useCallback(() => {
    if (data && page < data.totalPages) {
      setPage(prev => prev + 1);
    }
  }, [data, page]);

  const refresh = useCallback(() => {
    setPage(1);
    setAllData([]);
  }, []);

  useEffect(() => {
    if (data) {
      if (page === 1) {
        setAllData(data.items);
      } else {
        setAllData(prev => [...prev, ...data.items]);
      }
    }
  }, [data, page]);

  return {
    data: allData,
    loading,
    error,
    success,
    hasMore: data ? page < data.totalPages : false,
    total: data?.total || 0,
    loadMore,
    refresh,
  };
}
