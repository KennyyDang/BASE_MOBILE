import { useState, useEffect, useCallback, useRef } from 'react';
import notificationService from '../services/notificationService';

export const useUnreadNotificationCount = (
  autoRefresh: boolean = true,
  enabled: boolean = true
) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!enabled) {
      return; // Skip network call when disabled
    }
    try {
      setLoading(true);
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      // Silently fail, keep previous count
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // Fetch on mount
  useEffect(() => {
    if (!enabled) {
      return; // Do not set up polling when disabled
    }

    fetchUnreadCount();

    // Auto refresh every 30 seconds if autoRefresh is enabled
    if (autoRefresh && enabled) {
      intervalRef.current = setInterval(() => {
        fetchUnreadCount();
      }, 30000); // 30 seconds

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [fetchUnreadCount, autoRefresh, enabled]);

  return {
    unreadCount,
    loading,
    refresh: fetchUnreadCount,
  };
};

