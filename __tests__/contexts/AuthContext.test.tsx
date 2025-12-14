/**
 * Tests for AuthContext
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';
import authService from '../../src/services/auth.service';

jest.mock('../../src/services/auth.service');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../src/services/notificationService');
jest.mock('../../src/services/pushNotificationService');
jest.mock('../../src/utils/authHandler', () => ({
  authHandler: {
    setLogoutHandler: jest.fn(),
  },
}));

// Component to test useAuth hook
const TestComponent = ({ onAuthStateChange }: { onAuthStateChange?: (state: any) => void }) => {
  const auth = useAuth();
  
  React.useEffect(() => {
    onAuthStateChange?.(auth);
  }, [auth, onAuthStateChange]);

  return null;
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  describe('AuthProvider initialization', () => {
    it('should initialize with no authenticated user', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      let authState: any;
      render(
        <AuthProvider>
          <TestComponent
            onAuthStateChange={(state) => {
              authState = state;
            }}
          />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authState).toBeDefined();
        expect(authState.isAuthenticated).toBe(false);
        expect(authState.user).toBeNull();
        expect(authState.loading).toBe(false);
      });
    });

    it('should restore user from AsyncStorage on mount', async () => {
      const mockUser = {
        id: '1',
        email: 'parent@example.com',
        role: 'PARENT',
        name: 'Parent User',
      };

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key.includes('USER')) return Promise.resolve(JSON.stringify(mockUser));
        if (key.includes('TOKEN')) return Promise.resolve('mock-token');
        return Promise.resolve(null);
      });

      let authState: any;
      render(
        <AuthProvider>
          <TestComponent
            onAuthStateChange={(state) => {
              authState = state;
            }}
          />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authState.isAuthenticated).toBe(true);
        expect(authState.user?.email).toBe('parent@example.com');
      });
    });

    it('should clear invalid data from AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('invalid-json')
        .mockResolvedValueOnce(null);

      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(null);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(AsyncStorage.multiRemove).toHaveBeenCalled();
      });
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: '1',
        email: 'parent@example.com',
        role: 'PARENT',
        name: 'Parent User',
      };

      (authService.login as jest.Mock).mockResolvedValueOnce({
        token: 'mock-token',
        user: mockUser,
      });

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(null);

      let authState: any;
      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent
            onAuthStateChange={(state) => {
              authState = state;
            }}
          />
        </AuthProvider>
      );

      await act(async () => {
        await authState.login({
          email: 'parent@example.com',
          password: 'password123',
        });
      });

      await waitFor(() => {
        expect(authState.isAuthenticated).toBe(true);
        expect(authState.user?.email).toBe('parent@example.com');
      });
    });

    it('should throw error on login failure', async () => {
      const mockError = new Error('Invalid credentials');

      (authService.login as jest.Mock).mockRejectedValueOnce(mockError);

      let authState: any;
      render(
        <AuthProvider>
          <TestComponent
            onAuthStateChange={(state) => {
              authState = state;
            }}
          />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authState).toBeDefined();
      });

      await expect(
        act(async () => {
          await authState.login({
            email: 'wrong@example.com',
            password: 'wrongpassword',
          });
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should set loading state during login', async () => {
      const mockUser = {
        id: '1',
        email: 'parent@example.com',
        role: 'PARENT',
        name: 'Parent User',
      };

      (authService.login as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                token: 'mock-token',
                user: mockUser,
              });
            }, 100);
          })
      );

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(null);

      let authState: any;
      let loadingStatesDuring: boolean[] = [];

      render(
        <AuthProvider>
          <TestComponent
            onAuthStateChange={(state) => {
              if (state.loading) loadingStatesDuring.push(state.loading);
              authState = state;
            }}
          />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authState).toBeDefined();
      });

      act(() => {
        authState.login({
          email: 'parent@example.com',
          password: 'password123',
        });
      });

      await waitFor(() => {
        expect(authState.loading).toBe(false);
      });
    });

    it('should handle different user roles', async () => {
      const roles = ['PARENT', 'STAFF', 'MANAGER'];

      for (const role of roles) {
        const mockUser = {
          id: '1',
          email: 'user@example.com',
          role,
          name: 'Test User',
        };

        (authService.login as jest.Mock).mockResolvedValueOnce({
          token: 'mock-token',
          user: mockUser,
        });

        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(null);

        let authState: any;
        const { unmount } = render(
          <AuthProvider>
            <TestComponent
              onAuthStateChange={(state) => {
                authState = state;
              }}
            />
          </AuthProvider>
        );

        await act(async () => {
          await authState.login({
            email: 'user@example.com',
            password: 'password123',
          });
        });

        await waitFor(() => {
          expect(authState.user?.role).toBe(role);
        });

        unmount();
      }
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'parent@example.com',
        role: 'PARENT',
        name: 'Parent User',
      };

      (authService.login as jest.Mock).mockResolvedValueOnce({
        token: 'mock-token',
        user: mockUser,
      });

      (authService.logout as jest.Mock).mockResolvedValueOnce(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(null);

      let authState: any;
      render(
        <AuthProvider>
          <TestComponent
            onAuthStateChange={(state) => {
              authState = state;
            }}
          />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authState).toBeDefined();
      });

      // Login first
      await act(async () => {
        await authState.login({
          email: 'parent@example.com',
          password: 'password123',
        });
      });

      // Then logout
      await act(async () => {
        await authState.logout();
      });

      await waitFor(() => {
        expect(authState.isAuthenticated).toBe(false);
        expect(authState.user).toBeNull();
      });
    });

    it('should clear state even if logout API fails', async () => {
      const mockUser = {
        id: '1',
        email: 'parent@example.com',
        role: 'PARENT',
        name: 'Parent User',
      };

      (authService.login as jest.Mock).mockResolvedValueOnce({
        token: 'mock-token',
        user: mockUser,
      });

      (authService.logout as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(null);

      let authState: any;
      render(
        <AuthProvider>
          <TestComponent
            onAuthStateChange={(state) => {
              authState = state;
            }}
          />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authState).toBeDefined();
      });

      await act(async () => {
        await authState.login({
          email: 'parent@example.com',
          password: 'password123',
        });
      });

      // Logout should clear state even on error
      await act(async () => {
        try {
          await authState.logout();
        } catch {
          // Expected error
        }
      });

      await waitFor(() => {
        expect(authState.isAuthenticated).toBe(false);
        expect(authState.user).toBeNull();
      });
    });
  });

  describe('updateUser', () => {
    it('should update user data', async () => {
      const mockUser = {
        id: '1',
        email: 'parent@example.com',
        role: 'PARENT',
        name: 'Parent User',
      };

      (authService.login as jest.Mock).mockResolvedValueOnce({
        token: 'mock-token',
        user: mockUser,
      });

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(null);

      let authState: any;
      render(
        <AuthProvider>
          <TestComponent
            onAuthStateChange={(state) => {
              authState = state;
            }}
          />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authState).toBeDefined();
      });

      await act(async () => {
        await authState.login({
          email: 'parent@example.com',
          password: 'password123',
        });
      });

      const updatedName = 'Updated Parent Name';

      await act(async () => {
        await authState.updateUser({ name: updatedName });
      });

      await waitFor(() => {
        expect(authState.user?.name).toBe(updatedName);
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          expect.any(String),
          expect.stringContaining(updatedName)
        );
      });
    });

    it('should handle update errors', async () => {
      const mockUser = {
        id: '1',
        email: 'parent@example.com',
        role: 'PARENT',
        name: 'Parent User',
      };

      (authService.login as jest.Mock).mockResolvedValueOnce({
        token: 'mock-token',
        user: mockUser,
      });

      (AsyncStorage.setItem as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('Storage Error'));

      let authState: any;
      render(
        <AuthProvider>
          <TestComponent
            onAuthStateChange={(state) => {
              authState = state;
            }}
          />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authState).toBeDefined();
      });

      await act(async () => {
        await authState.login({
          email: 'parent@example.com',
          password: 'password123',
        });
      });

      await expect(
        act(async () => {
          await authState.updateUser({ name: 'New Name' });
        })
      ).rejects.toThrow('Storage Error');
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Create a component that uses useAuth outside provider
      const TestHookComponent = () => {
        useAuth();
        return null;
      };

      // Suppress console error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        render(<TestHookComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });
});
