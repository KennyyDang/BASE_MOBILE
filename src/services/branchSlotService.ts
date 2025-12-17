import axiosInstance from '../config/axios.config';
import { PaginatedResponse, BranchSlotResponse, BranchSlotRoomResponse } from '../types/api';

/**
 * Extract date string in YYYY-MM-DD format from Date object or string
 * Similar to web's extractDateString function
 */
const extractDateString = (date: Date | string | null | undefined): string | null => {
  if (!date) return null;
  
  try {
    let dateObj: Date;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      // Try to parse string
      dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        // If already in YYYY-MM-DD format, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return date;
        }
        return null;
      }
    } else {
      return null;
    }
    
    // Format as YYYY-MM-DD (local time, not UTC)
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
};

class BranchSlotService {
  /**
   * Get paginated branch slots available for a specific student
   * Endpoint: GET /api/BranchSlot/available-for-student/{studentId}
   * @param studentId Student ID (UUID)
   * @param pageIndex Page number (1-based)
   * @param pageSize Number of items per page
   * @param dateOrFilters Optional date filter (Date object or YYYY-MM-DD string) OR filters object
   * @returns Paginated response with available branch slots (includes rooms with staff)
   */
  async getAvailableSlotsForStudent(
    studentId: string,
    pageIndex: number = 1,
    pageSize: number = 20,
    dateOrFilters?:
      | Date
      | string
      | null
      | {
          date?: Date | string | null;
          startDate?: Date | string | null;
          endDate?: Date | string | null;
          timeframeId?: string | null;
          slotTypeId?: string | null;
          weekDate?: number | null;
        }
  ): Promise<PaginatedResponse<BranchSlotResponse>> {
    try {
      const params: any = {
        pageIndex: pageIndex.toString(),
        pageSize: pageSize.toString(),
      };

      const filters =
        typeof dateOrFilters === 'object' && dateOrFilters !== null && !(dateOrFilters instanceof Date)
          ? dateOrFilters
          : null;
      const date = filters ? filters.date : (dateOrFilters as Date | string | null | undefined);

      // Existing priority param (date)
      if (date) {
        const dateStr = extractDateString(date);
        if (dateStr) params.date = dateStr;
      }

      // New range params (optional)
      if (filters?.startDate) {
        const startStr = extractDateString(filters.startDate);
        if (startStr) params.startDate = startStr;
      }
      if (filters?.endDate) {
        const endStr = extractDateString(filters.endDate);
        if (endStr) params.endDate = endStr;
      }

      // Other optional filters (existing/unchanged)
      if (filters?.timeframeId) params.timeframeId = filters.timeframeId;
      if (filters?.slotTypeId) params.slotTypeId = filters.slotTypeId;
      if (typeof filters?.weekDate === 'number') params.weekDate = String(filters.weekDate);
      
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
   * Get all available slots for a student (loads all pages)
   * Similar to web's getAllAvailableSlotsForStudent
   * @param studentId Student ID (UUID)
   * @param params Optional parameters including date and pageSize
   * @returns Array of all available branch slots
   */
  async getAllAvailableSlotsForStudent(
    studentId: string,
    params: {
      date?: Date | string | null;
      pageSize?: number;
    } = {}
  ): Promise<BranchSlotResponse[]> {
    const { date, pageSize = 100 } = params;
    const allItems: BranchSlotResponse[] = [];
    let pageIndex = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.getAvailableSlotsForStudent(
          studentId,
          pageIndex,
          pageSize,
          date
        );
        
        if (response.items && Array.isArray(response.items)) {
          allItems.push(...response.items);
        }
        
        hasMore = response.hasNextPage || false;
        pageIndex++;
        
        // Safety limit to prevent infinite loops
        if (pageIndex > 100) {
          break;
        }
      } catch (error) {
        // If error on first page, throw it
        if (pageIndex === 1) {
          throw error;
        }
        // Otherwise, stop loading more pages
        break;
      }
    }

    return allItems;
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

