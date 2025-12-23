// Staff Management Service
import axiosInstance from '../config/axios.config';
import { Platform } from 'react-native';
import { CurrentUserResponse } from './parentProfileService';

class StaffService {
  /**
   * Update staff profile (for staff users)
   * Endpoint: PUT /api/Staff/my-profile (primary) or /api/User/my-profile (fallback)
   * @param name - Staff name
   * @param phoneNumber - Staff phone number
   * @param avatarFileUri - Optional avatar image file URI
   * @returns Updated staff profile information
   */
  async updateMyProfile(
    name: string,
    phoneNumber: string,
    avatarFileUri?: string
  ): Promise<CurrentUserResponse> {
    try {
      const formData = new FormData();

      // Append text fields as strings - xử lý null/undefined để tránh gửi "null" string
      formData.append('Name', name ? String(name) : '');
      formData.append('PhoneNumber', phoneNumber ? String(phoneNumber) : '');

      // Add avatar file if provided
      if (avatarFileUri) {
        // Extract file extension from URI
        let uri = avatarFileUri;
        // Fix URI for Android - remove 'file://' prefix if exists
        if (Platform.OS === 'android' && uri.startsWith('file://')) {
          uri = uri.replace('file://', '');
        }
        const fileExtension = uri.split('.').pop() || 'jpg';
        const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
        const fileName = `staff_avatar_${Date.now()}.${fileExtension}`;

        // @ts-ignore - FormData type issue with React Native
        formData.append('AvatarFile', {
          uri: Platform.OS === 'android' ? uri : avatarFileUri,
          type: mimeType,
          name: fileName,
        } as any);
      }

      // Try staff endpoint first, fallback to user endpoint if 404
      let response;
      try {
        // Try staff-specific endpoint first
        response = await axiosInstance.put<CurrentUserResponse>(
          '/api/Staff/my-profile',
          formData,
          {
            timeout: 60000, // 60 seconds timeout for file upload
          }
        );
      } catch (staffError: any) {
        // If staff endpoint returns 404, try user endpoint as fallback
        if (staffError?.response?.status === 404) {
          console.log('Staff endpoint not found, trying user endpoint as fallback');
          response = await axiosInstance.put<CurrentUserResponse>(
            '/api/User/my-profile',
            formData,
            {
              timeout: 60000, // 60 seconds timeout for file upload
            }
          );
        } else {
          // Re-throw if it's not a 404 error
          throw staffError;
        }
      }

      return response.data;
    } catch (error: any) {
      const errorData = error?.response?.data;
      let errorMessage = 'Không thể cập nhật hồ sơ nhân viên';

      if (errorData) {
        // Handle API error response structure
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      // Create error object with message
      const errorObj: any = new Error(errorMessage);
      errorObj.response = error?.response;
      errorObj.data = error?.response?.data;
      throw errorObj;
    }
  }

  /**
   * Get staff profile information
   * Endpoint: GET /api/Staff/my-profile (primary) or /api/User/my-profile (fallback)
   * @returns Staff profile information
   */
  async getMyProfile(): Promise<CurrentUserResponse> {
    try {
      // Try staff endpoint first, fallback to user endpoint if 404
      let response;
      try {
        response = await axiosInstance.get<CurrentUserResponse>(
          '/api/Staff/my-profile'
        );
      } catch (staffError: any) {
        // If staff endpoint returns 404, try user endpoint as fallback
        if (staffError?.response?.status === 404) {
          console.log('Staff endpoint not found, trying user endpoint as fallback');
          response = await axiosInstance.get<CurrentUserResponse>(
            '/api/User/my-profile'
          );
        } else {
          // Re-throw if it's not a 404 error
          throw staffError;
        }
      }

      return response.data;
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.response?.data?.title ||
        error?.message ||
        'Không thể tải thông tin hồ sơ nhân viên';

      const errorObj: any = new Error(errorMessage);
      errorObj.response = error?.response;
      errorObj.data = error?.response?.data;
      throw errorObj;
    }
  }
}

export const staffService = new StaffService();
export default staffService;
