import axiosInstance from '../config/axios.config';
import { BookStudentSlotRequest, BookStudentSlotResponse, StudentSlotResponse, PaginatedResponse } from '../types/api';

class StudentSlotService {
  /**
   * Book a slot for a student
   * Endpoint: POST /api/StudentSlot/book
   * @param payload Booking request with studentId, branchSlotId, packageSubscriptionId, roomId, date, and optional parentNote
   * @returns Booking response with success status and message
   */
  async bookSlot(payload: BookStudentSlotRequest): Promise<BookStudentSlotResponse> {
    try {
      const response = await axiosInstance.post<BookStudentSlotResponse>('/api/StudentSlot/book', payload);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to book slot';
    }
  }

  /**
   * Get paginated student slots with optional filters
   * Endpoint: GET /api/StudentSlot/paged
   * @param params Query parameters for filtering and pagination
   * @returns Paginated response with student slot items
   */
  async getStudentSlots(params: {
    pageIndex?: number;
    pageSize?: number;
    studentId?: string;
    branchSlotId?: string;
    packageSubscriptionId?: string;
    date?: string;
    status?: string;
    upcomingOnly?: boolean;
  }): Promise<PaginatedResponse<StudentSlotResponse>> {
    try {
      const response = await axiosInstance.get<PaginatedResponse<StudentSlotResponse>>(
        '/api/StudentSlot/paged',
        { params }
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch student slots';
    }
  }

  /**
   * Get student slot by ID
   * Endpoint: GET /api/StudentSlot/paged (searches through pages)
   * @param slotId Student slot ID
   * @param studentId Optional student ID to filter slots
   * @returns Student slot details or null if not found
   */
  async getStudentSlotById(slotId: string, studentId?: string): Promise<StudentSlotResponse | null> {
    try {
      let pageIndex = 1;
      let hasMore = true;
      const pageSize = 50; // Fetch more items per page
      
      while (hasMore) {
        const params: any = {
          pageIndex,
          pageSize,
        };
        
        // If studentId is provided, filter by it to reduce search space
        if (studentId) {
          params.studentId = studentId;
        }
        
        const response = await axiosInstance.get<PaginatedResponse<StudentSlotResponse>>(
          '/api/StudentSlot/paged',
          { params }
        );
        
        // Find the slot with matching ID
        const slot = response.data.items?.find(item => item.id === slotId);
        if (slot) {
          return slot;
        }
        
        // Check if there are more pages
        hasMore = response.data.hasNextPage || false;
        pageIndex++;
        
        // Safety limit: don't search more than 10 pages
        if (pageIndex > 10) {
          break;
        }
      }
      
      return null;
    } catch (error: any) {
      // Return null on error instead of throwing
      return null;
    }
  }

  /**
   * Get staff slots (slots assigned to current staff)
   * Endpoint: GET /api/StudentSlot/staff-slots
   * @param params Query parameters: pageIndex, pageSize, branchSlotId, date, upcomingOnly
   * @returns Paginated response with student slot items assigned to staff
   */
  async getStaffSlots(params?: {
    pageIndex?: number;
    pageSize?: number;
    branchSlotId?: string;
    date?: string;
    upcomingOnly?: boolean;
  }): Promise<PaginatedResponse<StudentSlotResponse>> {
    try {
      const response = await axiosInstance.get<PaginatedResponse<StudentSlotResponse>>(
        '/api/StudentSlot/staff-slots',
        { params }
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch staff slots';
    }
  }

  /**
   * Cancel a booked slot for a student
   * Endpoint: DELETE /api/StudentSlot/cancel
   * @param slotId The student slot ID to cancel
   * @param studentId The student ID
   * @returns Success response
   */
  async cancelSlot(slotId: string, studentId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await axiosInstance.delete('/api/StudentSlot/cancel', {
        params: {
          slotId,
          studentId,
        },
      });
      return response.data || { success: true };
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to cancel slot';
    }
  }
}

export const studentSlotService = new StudentSlotService();
export default studentSlotService;

