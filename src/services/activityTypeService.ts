import axiosInstance from '../config/axios.config';

export interface ActivityType {
  id: string;
  name: string;
  description: string;
}

export interface CreateActivityTypeRequest {
  name: string;
  description: string;
}

export interface UpdateActivityTypeRequest {
  name: string;
  description: string;
}

class ActivityTypeService {
  /**
   * Get all activity types
   * Endpoint: GET /api/ActivityType
   * @returns Array of activity types
   */
  async getAllActivityTypes(): Promise<ActivityType[]> {
    try {
      const response = await axiosInstance.get<ActivityType[]>('/api/ActivityType');
      return response.data || [];
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch activity types';
    }
  }

  /**
   * Create a new activity type
   * Endpoint: POST /api/ActivityType
   * @param payload Activity type data (name, description)
   * @returns Created activity type
   */
  async createActivityType(payload: CreateActivityTypeRequest): Promise<ActivityType> {
    try {
      const response = await axiosInstance.post<ActivityType>('/api/ActivityType', payload);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to create activity type';
    }
  }

  /**
   * Update an activity type
   * Endpoint: PUT /api/ActivityType/{id}
   * @param id Activity type ID (UUID)
   * @param payload Updated activity type data (name, description)
   * @returns Updated activity type
   */
  async updateActivityType(id: string, payload: UpdateActivityTypeRequest): Promise<ActivityType> {
    try {
      const response = await axiosInstance.put<ActivityType>(`/api/ActivityType/${id}`, payload);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to update activity type';
    }
  }

  /**
   * Delete an activity type
   * Endpoint: DELETE /api/ActivityType/{id}
   * @param id Activity type ID (UUID)
   * @returns void
   */
  async deleteActivityType(id: string): Promise<void> {
    try {
      await axiosInstance.delete(`/api/ActivityType/${id}`);
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to delete activity type';
    }
  }
}

export default new ActivityTypeService();

