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
}

export const studentSlotService = new StudentSlotService();
export default studentSlotService;

