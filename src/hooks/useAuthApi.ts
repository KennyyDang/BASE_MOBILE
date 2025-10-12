// Authentication Hook
import { useState, useEffect } from 'react';
import { authService } from '../services';
import { LoginForm, RegisterForm, Parent } from '../types';
import { useAuth as useAuthContext } from '../context/AuthContext';

export function useAuthApi() {
  const { login: contextLogin, logout: contextLogout } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (credentials: LoginForm) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.login(credentials);
      
      if (response.success) {
        contextLogin(response.data.user);
        return { success: true, data: response.data };
      } else {
        setError(response.message || 'Login failed');
        return { success: false, error: response.message };
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterForm) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.register(userData);
      
      if (response.success) {
        contextLogin(response.data.user);
        return { success: true, data: response.data };
      } else {
        setError(response.message || 'Registration failed');
        return { success: false, error: response.message };
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    
    try {
      await authService.logout();
      contextLogout();
      return { success: true };
    } catch (err: any) {
      // Even if API call fails, logout locally
      contextLogout();
      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.forgotPassword(email);
      
      if (response.success) {
        return { success: true };
      } else {
        setError(response.message || 'Failed to send reset email');
        return { success: false, error: response.message };
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    login,
    register,
    logout,
    forgotPassword,
    loading,
    error,
    clearError: () => setError(null),
  };
}
