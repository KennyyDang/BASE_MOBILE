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

const parentProfileService = {
  /**
   * Get all parents belonging to the current user's family
   * @returns Array of parent profiles
   */
  getMyParents: async (): Promise<ParentProfile[]> => {
    try {
      const response = await axiosInstance.get<ParentProfile[]>('/api/ParentProfile/my-parents');
      return response.data;
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
