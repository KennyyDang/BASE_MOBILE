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
};

export default parentProfileService;
