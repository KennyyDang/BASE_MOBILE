import { Platform } from 'react-native';
import axiosInstance from '../config/axios.config';

/**
 * Parent Profile Service
 * Handles parent profile related API calls
 */

export interface ParentProfile {
  id: string;
  parentName: string;
  email: string;
  address: string;
  phone: string;
  relationshipToStudent: string;
  note: string;
  familyId: string;
}

/**
 * Current User Response from /api/User/current-user
 */
export interface CurrentUserResponse {
  id: string;
  email: string;
  name: string;
  roleName: string;
  branchId: string | null;
  branchName: string | null;
  phoneNumber: string | null;
  profilePictureUrl: string | null;
  isActive: boolean;
  createdAt: string;
  identityCardPublicId: string | null;
}

/**
 * Family Profile Response from /api/FamilyProfile
 */
export interface FamilyProfileResponse {
  id: string;
  name: string;
  phone: string;
  avatar: string | null;
  studentRela: string; // Relationship to student (e.g., "Bố", "Mẹ")
  userId: string;
  students: any[]; // Array of student objects
}

const parentProfileService = {
  /**
   * Get current user information
   * Endpoint: GET /api/User/current-user
   * @returns Current user information
   */
  getCurrentUser: async (): Promise<CurrentUserResponse> => {
    try {
      const response = await axiosInstance.get<CurrentUserResponse>('/api/User/current-user');
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch current user';
    }
  },

  /**
   * Get all parents belonging to the current user's family
   * Endpoint: GET /api/User/current-user
   * @returns Array of parent profiles
   */
  getMyParents: async (): Promise<ParentProfile[]> => {
    try {
      const response = await axiosInstance.get<CurrentUserResponse>('/api/User/current-user');
      
      const currentUser = response.data;
      const parentProfile: ParentProfile = {
        id: currentUser.id,
        parentName: currentUser.name,
        email: currentUser.email,
        address: '',
        phone: '',
        relationshipToStudent: '',
        note: '',
        familyId: '',
      };
      
      return [parentProfile];
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch parent profiles';
    }
  },

  /**
   * Get parent profile by ID
   * @param parentId - Parent ID
   * @returns Parent profile
   */
  getParentById: async (parentId: string): Promise<ParentProfile> => {
    try {
      const response = await axiosInstance.get<ParentProfile>(`/api/ParentProfile/${parentId}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch parent profile';
    }
  },

  /**
   * Update parent profile
   * @param parentId - Parent ID
   * @param updateData - Data to update
   * @returns Updated parent profile
   */
  updateParentProfile: async (parentId: string, updateData: Partial<ParentProfile>): Promise<ParentProfile> => {
    try {
      const response = await axiosInstance.put<ParentProfile>(`/api/ParentProfile/${parentId}`, updateData);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to update parent profile';
    }
  },

  /**
   * Update my profile (Name + PhoneNumber + AvatarFile)
   * Endpoint: PUT /api/User/my-profile
   * Body: multipart/form-data
   * @param name - User name
   * @param phoneNumber - User phone number
   * @param avatarFileUri - Optional avatar image file URI
   * @returns Updated current user information
   */
  updateMyProfile: async (
    name: string,
    phoneNumber: string,
    avatarFileUri?: string
  ): Promise<CurrentUserResponse> => {
    try {
      const formData = new FormData();
      
      // Append text fields as strings
      formData.append('Name', String(name));
      formData.append('PhoneNumber', String(phoneNumber));
      
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
        const fileName = `profile_avatar_${Date.now()}.${fileExtension}`;
        
        // @ts-ignore - FormData type issue with React Native
        formData.append('AvatarFile', {
          uri: Platform.OS === 'android' ? uri : avatarFileUri,
          type: mimeType,
          name: fileName,
        } as any);
      }

      // Don't set Content-Type header manually - axios will set it with boundary automatically
      const response = await axiosInstance.put<CurrentUserResponse>(
        '/api/User/my-profile',
        formData,
        {
          timeout: 60000, // 60 seconds timeout for file upload
        }
      );
      
      return response.data;
    } catch (error: any) {
      const errorData = error?.response?.data;
      let errorMessage = 'Không thể cập nhật profile';
      
      // Handle network errors
      if (!error?.response) {
        errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại.';
      } else if (errorData) {
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
      
      throw new Error(errorMessage);
    }
  },

  /**
   * Upload profile picture
   * Endpoint: POST /api/User/upload-profile-picture
   * @param fileUri - Local file URI from image picker
   * @param fileName - File name (optional)
   * @param mimeType - MIME type (e.g., 'image/jpeg', 'image/png')
   * @returns Updated current user with new profilePictureUrl
   */
  uploadProfilePicture: async (
    fileUri: string,
    fileName?: string,
    mimeType: string = 'image/jpeg'
  ): Promise<CurrentUserResponse> => {
    try {
      // Create FormData for multipart/form-data
      const formData = new FormData();
      
      // Extract filename from URI if not provided
      const fileExtension = mimeType.split('/')[1] || 'jpg';
      const defaultFileName = fileName || `profile_${Date.now()}.${fileExtension}`;
      
      // Append file to FormData
      // @ts-ignore - FormData type issue with React Native
      formData.append('file', {
        uri: fileUri,
        type: mimeType,
        name: defaultFileName,
      } as any);

      const response = await axiosInstance.post<CurrentUserResponse>(
        '/api/User/upload-profile-picture',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      return response.data;
    } catch (error: any) {
      // Extract detailed error message
      const errorData = error?.response?.data;
      let errorMessage = 'Không thể upload ảnh profile';
      
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
      
      throw new Error(errorMessage);
    }
  },

  /**
   * Get all family profiles of the current user
   * Endpoint: GET /api/FamilyProfile
   * @returns Array of family profiles
   */
  getFamilyProfiles: async (): Promise<FamilyProfileResponse[]> => {
    try {
      const response = await axiosInstance.get<FamilyProfileResponse[]>('/api/FamilyProfile');
      return response.data || [];
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch family profiles';
    }
  },

  /**
   * Create new family profile for current user
   * Endpoint: POST /api/FamilyProfile
   * @param name - Family member name
   * @param phone - Phone number
   * @param studentRela - Relationship to student (e.g., "Bố", "Mẹ", "Anh", "Chị")
   * @param avatarFileUri - Optional avatar image file URI
   * @returns Created family profile
   */
  createFamilyProfile: async (
    name: string,
    phone: string,
    studentRela: string,
    avatarFileUri?: string
  ): Promise<FamilyProfileResponse> => {
    try {
      const formData = new FormData();
      
      // Append text fields as strings
      formData.append('Name', String(name));
      formData.append('Phone', String(phone));
      formData.append('StudentRela', String(studentRela));
      
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
        const fileName = `family_avatar_${Date.now()}.${fileExtension}`;
        
        // @ts-ignore - FormData type issue with React Native
        formData.append('AvatarFile', {
          uri: Platform.OS === 'android' ? uri : avatarFileUri,
          type: mimeType,
          name: fileName,
        } as any);
      }

      // Axios interceptor will automatically handle FormData Content-Type with boundary
      // Similar to registerChild service which works correctly
      const response = await axiosInstance.post<FamilyProfileResponse>(
        '/api/FamilyProfile',
        formData,
        {
          timeout: 60000, // 60 seconds timeout for file upload
        }
      );
      
      return response.data;
    } catch (error: any) {
      const errorData = error?.response?.data;
      let errorMessage = 'Không thể tạo family profile';
      
      // Handle network errors
      if (!error?.response) {
        errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại.';
      } else if (errorData) {
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
      
      throw new Error(errorMessage);
    }
  },

  /**
   * Get family profile by ID
   * Endpoint: GET /api/FamilyProfile/{id}
   * @param id - Family profile ID
   * @returns Family profile details
   */
  getFamilyProfileById: async (id: string): Promise<FamilyProfileResponse> => {
    try {
      const response = await axiosInstance.get<FamilyProfileResponse>(`/api/FamilyProfile/${id}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch family profile';
    }
  },

  /**
   * Update family profile (only owner can edit)
   * Endpoint: PUT /api/FamilyProfile/{id}
   * @param id - Family profile ID
   * @param name - Family member name
   * @param phone - Phone number
   * @param studentRela - Relationship to student
   * @param avatarFileUri - Optional avatar image file URI
   * @returns Updated family profile
   */
  updateFamilyProfile: async (
    id: string,
    name: string,
    phone: string,
    studentRela: string,
    avatarFileUri?: string
  ): Promise<FamilyProfileResponse> => {
    try {
      const formData = new FormData();
      
      formData.append('Name', name);
      formData.append('Phone', phone);
      formData.append('StudentRela', studentRela);
      
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
        const fileName = `family_avatar_${Date.now()}.${fileExtension}`;
        
        // @ts-ignore - FormData type issue with React Native
        formData.append('AvatarFile', {
          uri: Platform.OS === 'android' ? uri : avatarFileUri,
          type: mimeType,
          name: fileName,
        } as any);
      }

      // Don't set Content-Type header manually - axios will set it with boundary automatically
      // The interceptor will handle removing default Content-Type for FormData
      const response = await axiosInstance.put<FamilyProfileResponse>(
        `/api/FamilyProfile/${id}`,
        formData
      );
      
      return response.data;
    } catch (error: any) {
      const errorData = error?.response?.data;
      let errorMessage = 'Không thể cập nhật family profile';
      
      // Handle network errors
      if (!error?.response) {
        errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại.';
      } else if (errorData) {
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
      
      throw new Error(errorMessage);
    }
  },

  /**
   * Delete family profile (soft delete)
   * Endpoint: DELETE /api/FamilyProfile/{id}
   * @param id - Family profile ID
   * @returns void
   */
  deleteFamilyProfile: async (id: string): Promise<void> => {
    try {
      await axiosInstance.delete(`/api/FamilyProfile/${id}`);
    } catch (error: any) {
      const errorData = error?.response?.data;
      let errorMessage = 'Không thể xóa family profile';
      
      if (errorData) {
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
      
      throw new Error(errorMessage);
    }
  },
};

export default parentProfileService;
