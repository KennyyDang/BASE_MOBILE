/**
 * Tests for Custom Hooks (useApi, useChildrenApi, etc.)
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useApi } from '../../src/hooks/useApi';
import { useMyChildren } from '../../src/hooks/useChildrenApi';
import childrenService from '../../src/services/childrenService';
import { mockDataGenerator, asyncTestUtils } from '../utils/testUtils';

jest.mock('../../src/services/childrenService');
jest.mock('../../src/services/auth.service');

describe('Custom Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useApi', () => {
    it('should fetch data successfully', async () => {
      const mockData = [mockDataGenerator.mockActivity()];

      const apiCall = jest.fn().mockResolvedValueOnce({ success: true, data: mockData });

      const { result } = renderHook(() => useApi(apiCall, { immediate: true }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
    });

    it('should handle errors correctly', async () => {
      const apiCall = jest.fn().mockResolvedValueOnce({ success: false, message: 'API Error' });

      const { result } = renderHook(() => useApi(apiCall, { immediate: true }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('API Error');
      expect(result.current.data).toBeNull();
    });

    it('should retry on demand', async () => {
      const mockData = [mockDataGenerator.mockActivity()];
      const apiCall = jest
        .fn()
        .mockResolvedValueOnce({ success: false, message: 'First attempt failed' })
        .mockResolvedValueOnce({ success: true, data: mockData });

      const { result } = renderHook(() => useApi(apiCall, { immediate: true }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('First attempt failed');

      // Retry by calling execute again
      act(() => {
        result.current.execute();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
    });

    it('should refetch data', async () => {
      const mockData1 = [mockDataGenerator.mockActivity()];
      const mockData2 = [mockDataGenerator.mockActivity({ name: 'Updated' })];

      const apiCall = jest
        .fn()
        .mockResolvedValueOnce({ success: true, data: mockData1 })
        .mockResolvedValueOnce({ success: true, data: mockData2 });

      const { result } = renderHook(() => useApi(apiCall, { immediate: true }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData1);

      // Refetch by calling execute again
      act(() => {
        result.current.execute();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData2);
      });
    });
  });

  describe('useChildrenApi', () => {
    it('should fetch children successfully', async () => {
      const mockChildren = [
        mockDataGenerator.mockChild(),
        mockDataGenerator.mockChild({ id: 'child-2', name: 'Jane Doe' }),
      ];

      (childrenService.getMyChildren as jest.Mock).mockResolvedValueOnce(
        mockChildren
      );

      const { result } = renderHook(() => useMyChildren());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.students).toEqual(mockChildren);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch error', async () => {
      const mockError = new Error('Failed to fetch children');

      (childrenService.getMyChildren as jest.Mock).mockRejectedValueOnce(
        mockError
      );

      const { result } = renderHook(() => useMyChildren());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.students).toEqual([]);
    });

    // Skipping add/delete/update scenarios because hook only exposes students/loading/error/refetch
  });

  describe('useMyChildren', () => {
    it('should return children with correct structure', async () => {
      const mockChildren = [mockDataGenerator.mockChild()];

      (childrenService.getMyChildren as jest.Mock).mockResolvedValueOnce(
        mockChildren
      );

      const { result } = renderHook(() => useMyChildren());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.students).toEqual(mockChildren);
      expect(Array.isArray(result.current.students)).toBe(true);
    });

    it('should handle empty children list', async () => {
      (childrenService.getMyChildren as jest.Mock).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useMyChildren());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.students).toEqual([]);
    });

    it('should expose loading state', async () => {
      const mockChildren = [mockDataGenerator.mockChild()];

      (childrenService.getMyChildren as jest.Mock).mockImplementationOnce(
        () => asyncTestUtils.createDelayedPromise(mockChildren, 100)
      );

      const { result } = renderHook(() => useMyChildren());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should expose error state', async () => {
      const mockError = new Error('Fetch failed');

      (childrenService.getMyChildren as jest.Mock).mockRejectedValueOnce(
        mockError
      );

      const { result } = renderHook(() => useMyChildren());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should refetch data on demand', async () => {
      const mockChildren1 = [mockDataGenerator.mockChild()];
      const mockChildren2 = [
        mockDataGenerator.mockChild(),
        mockDataGenerator.mockChild({ id: 'child-2' }),
      ];

      (childrenService.getMyChildren as jest.Mock)
        .mockResolvedValueOnce(mockChildren1)
        .mockResolvedValueOnce(mockChildren2);

      const { result } = renderHook(() => useMyChildren());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.students.length).toBe(1);

      act(() => {
        result.current.refetch?.();
      });

      await waitFor(() => {
        expect(result.current.students.length).toBe(2);
      });
    });
  });

  describe('Hook error recovery', () => {
    it('should recover from error on retry', async () => {
      const mockData = [mockDataGenerator.mockChild()];

      (childrenService.getMyChildren as jest.Mock)
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce(mockData);

      const { result } = renderHook(() => useMyChildren());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();

      // Retry by calling refetch
      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeFalsy();
        expect(result.current.students).toEqual(mockData);
      });
    });
  });

  describe('Hook performance', () => {
    it('should not call API multiple times on rapid re-renders', async () => {
      const mockChildren = [mockDataGenerator.mockChild()];

      (childrenService.getMyChildren as jest.Mock).mockResolvedValueOnce(
        mockChildren
      );

      const { rerender } = renderHook(() => useMyChildren());

      // Re-render multiple times (no args needed, hook state persists)
      rerender({});
      rerender({});
      rerender({});

      await waitFor(() => {
        expect(childrenService.getMyChildren).toHaveBeenCalledTimes(1);
      });
    });
  });
});


