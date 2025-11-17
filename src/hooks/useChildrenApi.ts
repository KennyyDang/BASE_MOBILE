import { useState, useEffect, useCallback, useMemo } from 'react';
import { childrenService } from '../services/childrenService';
import { PaginatedResponse, StudentResponse } from '../types/api';

/**
 * Hook for fetching current user's students (simple array, no pagination)
 * Uses GET /api/Student/my-children
 */
export function useMyChildren() {
  const [students, setStudents] = useState<StudentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await childrenService.getMyChildren();
      setStudents(response);
      return response;
    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.message || 'Không thể lấy danh sách học sinh';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Memoize students array to prevent unnecessary re-renders
  const memoizedStudents = useMemo(() => students, [students]);

  return {
    students: memoizedStudents,
    loading,
    error,
    refetch: fetchStudents,
  };
}

/**
 * Hook for fetching current user's students (paginated)
 * Uses GET /api/Student/paged/current-user
 */
export function useCurrentUserStudents(
  pageIndex: number = 1,
  pageSize: number = 10
) {
  const [data, setData] = useState<PaginatedResponse<StudentResponse> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await childrenService.getCurrentUserStudents(pageIndex, pageSize);
      setData(response);
      return response;
    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.message || 'Không thể lấy danh sách học sinh';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Memoize students array to prevent unnecessary re-renders
  const students = useMemo(() => data?.items || [], [data?.items]);

  return {
    data,
    students,
    loading,
    error,
    refetch: fetchStudents,
    pagination: data ? {
      pageIndex: data.pageIndex,
      totalPages: data.totalPages,
      totalCount: data.totalCount,
      pageSize: data.pageSize,
      hasPreviousPage: data.hasPreviousPage,
      hasNextPage: data.hasNextPage,
    } : null,
  };
}

