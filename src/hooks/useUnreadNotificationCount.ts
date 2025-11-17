import { useState, useEffect, useCallback, useRef } from 'react';
import notificationService from '../services/notificationService';

export const useUnreadNotificationCount = (autoRefresh: boolean = true) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      setLoading(true);
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      // Silently fail, keep previous count
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchUnreadCount();

    // Auto refresh every 30 seconds if autoRefresh is enabled
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchUnreadCount();
      }, 30000); // 30 seconds

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [fetchUnreadCount, autoRefresh]);

  return {
    unreadCount,
    loading,
    refresh: fetchUnreadCount,
  };
};

