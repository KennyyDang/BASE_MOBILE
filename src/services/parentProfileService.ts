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
  profilePictureUrl: string | null;
  isActive: boolean;
  createdAt: string;
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
};

export default parentProfileService;
