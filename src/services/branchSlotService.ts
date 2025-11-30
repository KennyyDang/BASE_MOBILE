import axiosInstance from '../config/axios.config';
import { PaginatedResponse, BranchSlotResponse, BranchSlotRoomResponse } from '../types/api';

class BranchSlotService {
  /**
   * Get paginated branch slots available for a specific student
   * Endpoint: GET /api/BranchSlot/available-for-student/{studentId}
   * @param studentId Student ID (UUID)
   * @param pageIndex Page number (1-based)
   * @param pageSize Number of items per page
   * @param date Optional date filter (ISO string)
   * @returns Paginated response with available branch slots (includes rooms with staff)
   */
  async getAvailableSlotsForStudent(
    studentId: string,
    pageIndex: number = 1,
    pageSize: number = 20,
    date?: string
  ): Promise<PaginatedResponse<BranchSlotResponse>> {
    try {
      const params: any = {
        pageIndex,
        pageSize,
      };
      
      if (date) {
        params.date = date;
      }
      
      const response = await axiosInstance.get<PaginatedResponse<BranchSlotResponse>>(
        `/api/BranchSlot/available-for-student/${studentId}`,
        {
          params,
        }
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch available slots';
    }
  }

  /**
   * Get paginated rooms by branch slot ID
   * Endpoint: GET /api/BranchSlot/{branchSlotId}/rooms
   * @param branchSlotId Branch slot ID (UUID)
   * @param pageIndex Page number (1-based)
   * @param pageSize Number of items per page
   * @returns Paginated response with available rooms
   */
  async getRoomsBySlot(
    branchSlotId: string,
    pageIndex: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedResponse<BranchSlotRoomResponse>> {
    try {
      const response = await axiosInstance.get<PaginatedResponse<BranchSlotRoomResponse>>(
        `/api/BranchSlot/${branchSlotId}/rooms`,
        {
          params: {
            pageIndex,
            pageSize,
          },
        }
      );
      
      // Validate response structure
      if (!response || !response.data) {
        throw new Error('Invalid response from server');
      }
      
      // Ensure items is always an array
      const data = response.data;
      if (!Array.isArray(data.items)) {
        return {
          ...data,
          items: [],
        };
      }
      
      return data;
    } catch (error: any) {
      
      // Extract error message
      const errorMessage = 
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Failed to fetch rooms';
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Get branch slot details by ID
   * This method fetches slot details from available slots endpoint and finds the matching slot
   * @param branchSlotId Branch slot ID (UUID)
   * @param studentId Student ID (UUID) - optional, helps to get slot from available slots
   * @returns Branch slot response with full details
   */
  async getBranchSlotById(
    branchSlotId: string,
    studentId?: string
  ): Promise<BranchSlotResponse | null> {
    try {
      // Try to get from available slots if studentId is provided
      if (studentId) {
        let pageIndex = 1;
        let hasMore = true;
        
        while (hasMore) {
          const response = await this.getAvailableSlotsForStudent(studentId, pageIndex, 50);
          const found = response.items.find(slot => slot.id === branchSlotId);
          if (found) {
            return found;
          }
          hasMore = response.hasNextPage;
          pageIndex++;
        }
      }
      return null;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch branch slot details';
    }
  }
}

export const branchSlotService = new BranchSlotService();
export default branchSlotService;

