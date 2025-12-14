/**
 * @jest-environment node
 */

import authService from '../../src/services/auth.service';
import axiosInstance from '../../src/config/axios.config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

jest.mock('../../src/config/axios.config');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('jwt-decode');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockToken = 'mock-jwt-token';
      const mockUser = {
        id: '1',
        email: 'parent@example.com',
        role: 'PARENT',
        name: 'Parent User',
      };

      const mockResponse = {
        data: {
          token: mockToken,
          user: mockUser,
        },
      };

      (axiosInstance.post as jest.Mock).mockResolvedValueOnce(mockResponse);
      (jwtDecode as jest.Mock).mockReturnValueOnce(mockUser);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(null);

      const credentials = {
        email: 'parent@example.com',
        password: 'password123',
        firebaseToken: 'firebase-token',
        deviceName: 'iPhone',
      };

      const result = await authService.login(credentials);

      expect(result.token).toBe(mockToken);
      expect(result.user.email).toBe('parent@example.com');
      expect(axiosInstance.post).toHaveBeenCalledWith('/api/Auth/mobile-login', expect.any(Object));
    });

    it('should throw error with invalid credentials', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            message: 'Invalid email or password',
          },
        },
      };

      (axiosInstance.post as jest.Mock).mockRejectedValueOnce(mockError);

      const credentials = {
        email: 'wrong@example.com',
        password: 'wrongpassword',
        firebaseToken: '',
        deviceName: 'iPhone',
      };

      await expect(authService.login(credentials)).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      const mockError = new Error('Network Error');

      (axiosInstance.post as jest.Mock).mockRejectedValueOnce(mockError);

      const credentials = {
        email: 'parent@example.com',
        password: 'password123',
        firebaseToken: '',
        deviceName: 'iPhone',
      };

      await expect(authService.login(credentials)).rejects.toThrow('Network Error');
    });

    it('should save token and user to AsyncStorage on successful login', async () => {
      const mockToken = 'mock-jwt-token';
      const mockUser = {
        id: '1',
        email: 'parent@example.com',
        role: 'PARENT',
        name: 'Parent User',
      };

      const mockResponse = {
        data: {
          token: mockToken,
          user: mockUser,
        },
      };

      (axiosInstance.post as jest.Mock).mockResolvedValueOnce(mockResponse);
      (jwtDecode as jest.Mock).mockReturnValueOnce(mockUser);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(null);

      const credentials = {
        email: 'parent@example.com',
        password: 'password123',
        firebaseToken: '',
        deviceName: 'iPhone',
      };

      await authService.login(credentials);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(mockToken)
      );
    });

    it('should support different roles (PARENT, STAFF, MANAGER)', async () => {
      const roles = ['PARENT', 'STAFF', 'MANAGER'];

      for (const role of roles) {
        const mockToken = 'mock-jwt-token';
        const mockUser = {
          id: '1',
          email: 'user@example.com',
          role,
          name: 'Test User',
        };

        const mockResponse = {
          data: {
            token: mockToken,
            user: mockUser,
          },
        };

        (axiosInstance.post as jest.Mock).mockResolvedValueOnce(mockResponse);
        (jwtDecode as jest.Mock).mockReturnValueOnce(mockUser);
        (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(null);

        const credentials = {
          email: 'user@example.com',
          password: 'password123',
          firebaseToken: '',
          deviceName: 'iPhone',
        };

        const result = await authService.login(credentials);
        expect(result.user.role).toBe(role);
      }
    });
  });

  describe('logout', () => {
    it('should clear AsyncStorage on logout', async () => {
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValueOnce(null);

      await authService.logout();

      expect(AsyncStorage.multiRemove).toHaveBeenCalled();
    });

    it('should handle logout errors gracefully', async () => {
      const mockError = new Error('Storage Error');
      (AsyncStorage.multiRemove as jest.Mock).mockRejectedValueOnce(mockError);

      await expect(authService.logout()).rejects.toThrow('Storage Error');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const newToken = 'new-token';

      const mockResponse = {
        data: newToken,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('old-token');
      (axiosInstance.post as jest.Mock).mockResolvedValueOnce(mockResponse);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await authService.refreshToken();

      expect(result).toBe(newToken);
      expect(axiosInstance.post).toHaveBeenCalledWith('/auth/refresh', expect.any(Object));
    });

    it('should handle refresh token failure', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            message: 'Refresh token expired',
          },
        },
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('expired-token');
      (axiosInstance.post as jest.Mock).mockRejectedValueOnce(mockError);

      await expect(authService.refreshToken()).rejects.toThrow();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true for valid token', async () => {
      const validToken = 'valid-token';
      const mockDecodedToken = {
        exp: Math.floor(Date.now() / 1000) + 3600, // expires in 1 hour
        email: 'user@example.com',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(validToken);
      (jwtDecode as jest.Mock).mockReturnValueOnce(mockDecodedToken);

      const isValid = await authService.isAuthenticated();

      expect(isValid).toBe(true);
    });

    it('should return false for expired token', async () => {
      const expiredToken = 'expired-token';
      const mockDecodedToken = {
        exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
        email: 'user@example.com',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(expiredToken);
      (jwtDecode as jest.Mock).mockReturnValueOnce(mockDecodedToken);

      const isValid = await authService.isAuthenticated();

      expect(isValid).toBe(false);
    });

    it('should return false if no token exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const isValid = await authService.isAuthenticated();

      expect(isValid).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user from AsyncStorage', async () => {
      const mockUser = {
        id: '1',
        email: 'parent@example.com',
        role: 'PARENT',
        name: 'Parent User',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockUser));

      const user = await authService.getCurrentUser();

      expect(user).toEqual(mockUser);
    });

    it('should return null if no user stored', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const user = await authService.getCurrentUser();

      expect(user).toBeNull();
    });
  });
});
