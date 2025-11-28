import axiosInstance from '../config/axios.config';
import { AddOnService } from '../types/api';

class ServiceService {
  /**
   * Get all add-ons for current user's branch
   * Endpoint: GET /api/Service/me/add-ons
   * @returns Array of add-on services
   */
  async getMyAddOns(): Promise<AddOnService[]> {
    try {
      const response = await axiosInstance.get<AddOnService[]>('/api/Service/me/add-ons');
      const data = response.data;
      if (Array.isArray(data)) {
        return data;
      }
      if (Array.isArray((data as any)?.items)) {
        return (data as any).items;
      }
      return [];
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch add-ons';
    }
  }

  /**
   * Get all add-ons for a specific student by branch
   * Endpoint: GET /api/Service/student/{studentId}/add-ons
   * @param studentId - Student UUID
   * @returns Array of add-on services
   */
  async getStudentAddOns(studentId: string): Promise<AddOnService[]> {
    try {
      const response = await axiosInstance.get<AddOnService[]>(`/api/Service/student/${studentId}/add-ons`);
      const data = response.data;
      if (Array.isArray(data)) {
        return data;
      }
      if (Array.isArray((data as any)?.items)) {
        return (data as any).items;
      }
      return [];
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch student add-ons';
    }
  }
}

export const serviceService = new ServiceService();
export default serviceService;

