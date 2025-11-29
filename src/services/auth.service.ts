import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import axiosInstance, { STORAGE_KEYS } from '../config/axios.config';
import { 
  LoginResponse, 
  UserInfo, 
  DecodedJWT,
  JWT_CLAIMS,
  MobileLoginRequest 
} from '../types/api';


const authService = {
  /**
   * Login user via mobile endpoint
   * @param credentials - { email, password, firebaseToken, deviceName }
   * @returns Response with token and decoded user data
   */
  login: async (credentials: MobileLoginRequest): Promise<{ token: string; user: UserInfo }> => {
    try {
      const payload: MobileLoginRequest = {
        email: credentials.email,
        password: credentials.password,
        firebaseToken: credentials.firebaseToken ?? '',
        deviceName: credentials.deviceName ?? '',
      };
      const response = await axiosInstance.post<LoginResponse>('/api/Auth/mobile-login', payload);
      
      // Check if response has the expected structure
      if (!response.data) {
        throw new Error('Server không trả về dữ liệu. Vui lòng thử lại.');
      }
      
      if (!response.data.access_token) {
        throw new Error('Không nhận được token từ server. Vui lòng kiểm tra lại.');
      }
      
      const token = response.data.access_token;
      const refreshToken = response.data.refresh_token;
      
      // Validate token before processing
      if (!token || typeof token !== 'string') {
        throw new Error('Token không hợp lệ: Token không tồn tại hoặc không đúng định dạng.');
      }
      
      // Trim whitespace and validate JWT format (should have 3 parts separated by dots)
      const trimmedToken = token.trim();
      const tokenParts = trimmedToken.split('.');
      
      if (tokenParts.length !== 3) {
        if (__DEV__) {
          console.error('[Auth] Invalid JWT format. Token parts:', tokenParts.length);
        }
        throw new Error('Token không hợp lệ: Định dạng token không đúng.');
      }
      
      // Save tokens to AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, trimmedToken);
      if (refreshToken) {
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken.trim());
      }
      
      // Decode JWT to extract user info
      let decoded: any;
      try {
        decoded = jwtDecode<DecodedJWT & Record<string, any>>(trimmedToken);
        
        if (__DEV__) {
          console.log('[Auth] Token decoded successfully. User ID:', decoded[JWT_CLAIMS.USER_ID] || decoded['sub']);
        }
      } catch (decodeError: any) {
        // Clear tokens if JWT is invalid
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.ACCESS_TOKEN,
          STORAGE_KEYS.REFRESH_TOKEN,
        ]);
        
        if (__DEV__) {
          console.error('[Auth] JWT decode error:', decodeError?.message || decodeError);
          console.error('[Auth] Token preview (first 50 chars):', trimmedToken.substring(0, 50));
        }
        
        throw new Error('Token không hợp lệ. Vui lòng thử lại.');
      }

      // Try to read role from multiple common claim keys
      const rawRole = (
        decoded[JWT_CLAIMS.ROLE] ||
        decoded['role'] ||
        decoded['roles'] ||
        decoded['Role'] ||
        decoded['Roles'] ||
        null
      );

      const normalizeRole = (val: any): string | null => {
        if (!val) return null;
        if (Array.isArray(val)) {
          const first = val[0];
          return typeof first === 'string' ? first.toUpperCase().trim() : String(first).toUpperCase().trim();
        }
        return typeof val === 'string' ? val.toUpperCase().trim() : String(val).toUpperCase().trim();
      };

      const normalizedRole = normalizeRole(rawRole);

      // Extract user info from JWT claims
      // Backend API requires "sub" claim = userId (Guid) according to Swagger docs
      const userId = decoded[JWT_CLAIMS.USER_ID] || decoded['sub'] || decoded['userId'] || '';
      
      if (!userId) {
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.ACCESS_TOKEN,
          STORAGE_KEYS.REFRESH_TOKEN,
        ]);
        throw new Error('Token không chứa thông tin người dùng. Vui lòng thử lại.');
      }
      
      const userInfo: UserInfo = {
        id: userId,
        email: decoded[JWT_CLAIMS.EMAIL] || decoded['email'] || '',
        role: normalizedRole || 'USER',
      };

      // Allow 3 roles: USER (Parent), STAFF, MANAGER
      const roleStr = (userInfo.role || '').toUpperCase();
      const isAllowed =
        roleStr === 'USER' ||
        roleStr === 'PARENT' ||
        roleStr.includes('PARENT') ||
        roleStr === 'STAFF' ||
        roleStr.includes('STAFF') ||
        roleStr === 'MANAGER' ||
        roleStr.includes('MANAGER') ||
        roleStr === 'ADMIN';
      if (!isAllowed) {
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.ACCESS_TOKEN,
          STORAGE_KEYS.REFRESH_TOKEN,
        ]);
        throw new Error('Tài khoản không được phép đăng nhập ứng dụng này.');
      }
      
      // Save user info to AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userInfo));
      
      return { token, user: userInfo };
    } catch (error: any) {
      // Extract error message from different possible structures
      let errorMessage = 'Đăng nhập thất bại. Vui lòng thử lại.';
      
      if (error.response) {
        // Server responded with error status
        const errorData = error.response.data;
        const status = error.response.status;
        
        // Log để debug (chỉ trong dev mode)
        if (__DEV__) {
          console.log('[Auth Service Error] Status:', status);
          console.log('[Auth Service Error] Data:', JSON.stringify(errorData, null, 2));
        }
        
        // Xử lý validation errors (400 Bad Request) - Format từ ASP.NET Core
        if (status === 400) {
          // ASP.NET Core trả về format: { title: "...", errors: { "Field": ["error1", "error2"] } }
          if (errorData.errors && typeof errorData.errors === 'object' && !Array.isArray(errorData.errors)) {
            // Parse validation errors từ object { "Email": ["error"], "Password": ["error"] }
            const validationMessages: string[] = [];
            
            Object.entries(errorData.errors).forEach(([field, errors]: [string, any]) => {
              if (Array.isArray(errors)) {
                errors.forEach((err: string) => {
                  // Translate field names
                  let fieldName = field;
                  if (field.toLowerCase() === 'email') fieldName = 'Email';
                  else if (field.toLowerCase() === 'password') fieldName = 'Mật khẩu';
                  
                  // Translate common error messages
                  let errMsg = err;
                  if (err.toLowerCase().includes('required')) errMsg = 'là bắt buộc';
                  else if (err.toLowerCase().includes('invalid')) errMsg = 'không hợp lệ';
                  else if (err.toLowerCase().includes('format')) errMsg = 'không đúng định dạng';
                  
                  validationMessages.push(`${fieldName}: ${errMsg}`);
                });
              } else if (typeof errors === 'string') {
                let fieldName = field;
                if (field.toLowerCase() === 'email') fieldName = 'Email';
                else if (field.toLowerCase() === 'password') fieldName = 'Mật khẩu';
                validationMessages.push(`${fieldName}: ${errors}`);
              }
            });
            
            if (validationMessages.length > 0) {
              errorMessage = validationMessages.join('\n');
            } else if (errorData.title && !errorData.title.includes('One or more validation errors occurred')) {
              errorMessage = errorData.title;
            } else if (errorData.message) {
              errorMessage = errorData.message;
            } else {
              errorMessage = 'Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại email và mật khẩu.';
            }
          } 
          // Xử lý lỗi dạng array
          else if (Array.isArray(errorData?.errors)) {
            const errors = errorData.errors.map((e: any) => {
              if (typeof e === 'string') return e;
              return Object.values(e).join(', ');
            }).join('\n');
            errorMessage = errors || 'Thông tin đăng nhập không hợp lệ.';
          }
          // Fallback
          else if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          } else if (errorData?.title && !errorData.title.includes('One or more validation errors occurred')) {
            errorMessage = errorData.title;
          } else {
            errorMessage = 'Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại email và mật khẩu.';
          }
        }
        // Xử lý lỗi 401 Unauthorized
        else if (status === 401) {
          errorMessage = 'Email hoặc mật khẩu không đúng.';
        }
        // Xử lý lỗi 500+
        else if (status >= 500) {
          errorMessage = 'Lỗi server. Vui lòng thử lại sau.';
        }
        // Xử lý các lỗi khác
        else {
          if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          } else if (errorData?.error) {
            errorMessage = errorData.error;
          } else if (errorData?.title) {
            errorMessage = errorData.title;
          }
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra:\n- Kết nối mạng\n- Backend đang chạy\n- Địa chỉ IP đúng';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  },

  /**
   * Refresh access token using refresh token
   * @returns New access token
   */
  refreshToken: async (): Promise<string> => {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken || !refreshToken.trim()) {
        throw new Error('Không có refresh token. Vui lòng đăng nhập lại.');
      }

      const response = await axiosInstance.post('/api/Auth/refresh', {
        refreshToken: refreshToken.trim()
      });

      if (!response.data?.access_token) {
        throw new Error('Không nhận được token mới từ server.');
      }
      
      const newToken = response.data.access_token.trim();
      
      // Validate new token format
      if (newToken.split('.').length !== 3) {
        throw new Error('Token mới không đúng định dạng.');
      }
      
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newToken);
      
      // Update refresh token if provided
      if (response.data.refresh_token) {
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.refresh_token.trim());
      }
      
      return newToken;
    } catch (error: any) {
      // If refresh fails, clear all tokens
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
      ]);
      
      if (__DEV__) {
        console.error('[Auth] Refresh token error:', error?.message || error);
      }
      
      throw error;
    }
  },

  /**
   * Logout user
   * Clear AsyncStorage
   */
  logout: async (): Promise<void> => {
    try {
      // Clear all auth data from AsyncStorage
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
      ]);
    } catch (error) {
      // Try to force clear even if error
      try {
        await AsyncStorage.clear();
      } catch (clearError) {
        // Ignore clear error
      }
      throw error;
    }
  },

  /**
   * Get current user from AsyncStorage
   * @returns Current user object or null
   */
  getCurrentUser: async (): Promise<UserInfo | null> => {
    try {
      const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get access token from AsyncStorage
   * @returns Access token or null
   */
  getAccessToken: async (): Promise<string | null> => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token) {
        return null;
      }
      
      // Trim and validate token format
      const trimmedToken = token.trim();
      if (trimmedToken.split('.').length !== 3) {
        // Invalid token format, clear it
        await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        return null;
      }
      
      return trimmedToken;
    } catch (error) {
      if (__DEV__) {
        console.error('[Auth] Error getting access token:', error);
      }
      return null;
    }
  },

  /**
   * Check if user is authenticated
   * @returns True if user has valid token
   */
  isAuthenticated: async (): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      return !!token;
    } catch (error) {
      return false;
    }
  },

  /**
   * Send reset code to email
   * @param email - User email address
   * @returns Success message
   */
  sendResetCode: async (email: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await axiosInstance.post('/api/Auth/send-reset-code', {
        email: email.trim(),
      });

      return {
        success: true,
        message: response.data?.message || 'Mã đặt lại mật khẩu đã được gửi đến email của bạn.',
      };
    } catch (error: any) {
      let errorMessage = 'Không thể gửi mã đặt lại mật khẩu. Vui lòng thử lại.';
      
      if (error.response) {
        const errorData = error.response.data;
        
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        } else if (errorData?.title) {
          errorMessage = errorData.title;
        }
        
        if (error.response.status === 404) {
          errorMessage = 'Email không tồn tại trong hệ thống.';
        } else if (error.response.status === 400) {
          errorMessage = errorMessage || 'Email không hợp lệ.';
        } else if (error.response.status >= 500) {
          errorMessage = 'Lỗi server. Vui lòng thử lại sau.';
        }
      } else if (error.request) {
        errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  },

  /**
   * Reset password using code
   * @param email - User email address
   * @param code - 5-character reset code
   * @param newPassword - New password
   * @returns Success message
   */
  resetPasswordWithCode: async (
    email: string,
    code: string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await axiosInstance.post('/api/Auth/reset-password-with-code', {
        email: email.trim(),
        code: code.trim(),
        newPassword: newPassword.trim(),
      });

      return {
        success: true,
        message: response.data?.message || 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.',
      };
    } catch (error: any) {
      let errorMessage = 'Không thể đặt lại mật khẩu. Vui lòng thử lại.';
      
      if (error.response) {
        const errorData = error.response.data;
        
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.detail) {
          errorMessage = errorData.detail;
        } else if (errorData?.title) {
          errorMessage = errorData.title;
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        }
        
        if (error.response.status === 400) {
          errorMessage = errorMessage || 'Mã đặt lại không đúng hoặc đã hết hạn. Vui lòng thử lại.';
        } else if (error.response.status === 404) {
          errorMessage = 'Email không tồn tại trong hệ thống.';
        } else if (error.response.status >= 500) {
          errorMessage = 'Lỗi server. Vui lòng thử lại sau.';
        }
      } else if (error.request) {
        errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  },
};

export default authService;

