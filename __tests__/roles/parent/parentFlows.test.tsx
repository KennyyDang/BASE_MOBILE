/**
 * Parent role unit tests that exercise the most common mobile flows
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider, useAuth } from '../../../src/contexts/AuthContext';
import authService from '../../../src/services/auth.service';
import childrenService from '../../../src/services/childrenService';
import { useMyChildren } from '../../../src/hooks/useChildrenApi';
import { useCurrentUserWallet } from '../../../src/hooks/useWalletApi';
import { walletService } from '../../../src/services';
import { STORAGE_KEYS } from '../../../src/config/axios.config';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('../../../src/services/pushNotificationService', () => ({
  registerForPushNotifications: jest.fn().mockResolvedValue({ token: 'push-token', platform: 'ios' }),
}));

jest.mock('../../../src/services/notificationService', () => ({
  registerPushToken: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-device', () => ({
  deviceName: 'TestPhone',
  brand: 'TEST',
  modelName: 'Model X',
}));

describe('Parent Role - Auth, Children, and Wallet flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AuthContext parent flow', () => {
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    it('logs in parent accounts and exposes role aware state', async () => {
      const parentUser = {
        id: 'parent-1',
        email: 'parent@example.com',
        role: 'PARENT',
      };

      const loginSpy = jest.spyOn(authService, 'login').mockResolvedValue({
        token: 'mock-token',
        user: parentUser,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login({ email: parentUser.email, password: 'secret' } as any);
      });

      expect(loginSpy).toHaveBeenCalledWith(expect.objectContaining({ email: parentUser.email }));
      expect(result.current.user?.role).toBe('PARENT');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.loading).toBe(false);
    });

    it('logs out parent accounts and clears persisted state', async () => {
      jest.spyOn(authService, 'login').mockResolvedValue({
        token: 'mock-token',
        user: {
          id: 'parent-2',
          email: 'test@example.com',
          role: 'PARENT',
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login({ email: 'test@example.com', password: 'secret' } as any);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
      ]);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(AsyncStorage.multiRemove).toHaveBeenCalled();
    });
  });

  describe('Children management flow (useMyChildren)', () => {
    it('loads children for parent accounts', async () => {
      const mockChildren = [
        { id: 'child-1', name: 'Alice', grade: '2', parentId: 'parent-1' },
        { id: 'child-2', name: 'Bob', grade: '4', parentId: 'parent-1' },
      ];

      jest.spyOn(childrenService, 'getMyChildren').mockResolvedValueOnce(mockChildren as any);

      const { result } = renderHook(() => useMyChildren());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(childrenService.getMyChildren).toHaveBeenCalledTimes(1);
      expect(result.current.students).toEqual(mockChildren);
      expect(result.current.error).toBeNull();
    });

    it('surfaces API failures in error state', async () => {
      const mockChildren = [
        { id: 'child-1', name: 'Alice', grade: '2', parentId: 'parent-1' },
      ];
      const apiError = new Error('Failed to fetch students');

      const getChildrenSpy = jest
        .spyOn(childrenService, 'getMyChildren')
        .mockResolvedValueOnce(mockChildren as any)
        .mockRejectedValueOnce(apiError);

      const { result } = renderHook(() => useMyChildren());

      await waitFor(() => {
        expect(result.current.students).toEqual(mockChildren);
      });

      await expect(result.current.refetch()).rejects.toThrow('Failed to fetch students');

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch students');
      });

      expect(getChildrenSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Wallet overview flow', () => {
    it('fetches current parent wallet balances via hook', async () => {
      const mockWallet = {
        walletId: 'wallet-1',
        totalBalance: 500000,
        mainWalletBalance: 300000,
        allowanceWalletBalance: 200000,
      };

      jest.spyOn(walletService, 'getCurrentUserWallet').mockResolvedValueOnce(mockWallet as any);

      const { result } = renderHook(() => useCurrentUserWallet());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(walletService.getCurrentUserWallet).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual(mockWallet);
      expect(result.current.error).toBeNull();
    });

    it('propagates wallet API errors for parent accounts', async () => {
      const mockWallet = {
        walletId: 'wallet-2',
        totalBalance: 100000,
        mainWalletBalance: 80000,
        allowanceWalletBalance: 20000,
      };
      const error = new Error('Network down');

      const walletSpy = jest
        .spyOn(walletService, 'getCurrentUserWallet')
        .mockResolvedValueOnce(mockWallet as any)
        .mockRejectedValueOnce(error);

      const { result } = renderHook(() => useCurrentUserWallet());

      await waitFor(() => {
        expect(result.current.data).toEqual(mockWallet);
      });

      await expect(result.current.refetch()).rejects.toThrow('Network down');

      await waitFor(() => {
        expect(result.current.error).toBe('Network down');
      });

      expect(walletSpy).toHaveBeenCalledTimes(2);
    });
  });
});
