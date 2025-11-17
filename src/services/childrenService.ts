// Children Management Service
import axiosInstance from '../config/axios.config';
import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../constants';
import { PaginatedResponse, StudentResponse, ApiResponse } from '../types/api';
import { Child, ChildForm } from '../types';

class ChildrenService {
  // Get all children
  async getChildren(): Promise<ApiResponse<Child[]>> {
    return await apiClient.get<Child[]>(API_ENDPOINTS.CHILDREN);
  }

  // Add new child
  async addChild(childData: ChildForm): Promise<ApiResponse<Child>> {
    return await apiClient.post<Child>(API_ENDPOINTS.ADD_CHILD, childData);
  }

  // Update child information
  async updateChild(childId: string, childData: Partial<ChildForm>): Promise<ApiResponse<Child>> {
    return await apiClient.put<Child>(
      API_ENDPOINTS.UPDATE_CHILD.replace(':id', childId),
      childData
    );
  }

  // Delete child
  async deleteChild(childId: string): Promise<ApiResponse<void>> {
    return await apiClient.delete(API_ENDPOINTS.DELETE_CHILD.replace(':id', childId));
  }

  // Get child details
  async getChildDetails(childId: string): Promise<ApiResponse<Child>> {
    return await apiClient.get<Child>(`${API_ENDPOINTS.CHILDREN}/${childId}`);
  }

  // Update child NFC card
  async updateChildNFCCard(childId: string, nfcCardId: string): Promise<ApiResponse<Child>> {
    return await apiClient.patch<Child>(`${API_ENDPOINTS.CHILDREN}/${childId}/nfc`, {
      nfcCardId,
    });
  }

  // Get child attendance history
  async getChildAttendanceHistory(
    childId: string,
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = `${API_ENDPOINTS.CHILDREN}/${childId}/attendance${queryString ? `?${queryString}` : ''}`;
    
    const response = await axiosInstance.get(url);
    return response.data;
  }

  // Get current user's students (simple array, no pagination)
  /**
   * Get list of students for current user (simple array response)
   * Endpoint: GET /api/Student/my-children
   * @returns Array of student responses
   */
  async getMyChildren(): Promise<StudentResponse[]> {
    try {
      const response = await axiosInstance.get<StudentResponse[]>(
        API_ENDPOINTS.STUDENT_MY_CHILDREN
      );
      return response.data || [];
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch students';
    }
  }

  // Get current user's students (paginated)
  /**
   * Get paginated list of students for current user
   * Endpoint: GET /api/Student/paged/current-user?pageIndex={pageIndex}&pageSize={pageSize}
   * @param pageIndex Page number (1-based)
   * @param pageSize Number of items per page
   * @returns Paginated response with student items
   */
  async getCurrentUserStudents(
    pageIndex: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedResponse<StudentResponse>> {
    try {
      const response = await axiosInstance.get<PaginatedResponse<StudentResponse>>(
        API_ENDPOINTS.STUDENT_PAGED_CURRENT_USER,
        {
          params: {
            pageIndex,
            pageSize,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch students';
    }
  }

  /**
   * Update child information by parent
   * Endpoint: PUT /api/Student/{id}/parent-update
   * Allows a parent to update their own child's basic information (name, date of birth, note)
   * @param studentId Student ID (UUID)
   * @param updateData Object containing name, dateOfBirth, and note
   * @returns Updated student response
   */
  async updateChildByParent(
    studentId: string,
    updateData: {
      name?: string;
      dateOfBirth?: string;
      note?: string;
    }
  ): Promise<StudentResponse> {
    try {
      const response = await axiosInstance.put<StudentResponse>(
        `/api/Student/${studentId}/parent-update`,
        updateData
      );
      // API returns StudentResponse directly in response.data
      return response.data;
    } catch (error: any) {
      // Better error handling - extract detailed error message
      const errorMessage = 
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.response?.data?.title ||
        error?.message ||
        'Failed to update child information';
      
      // Create error object with message
      const errorObj: any = new Error(errorMessage);
      errorObj.response = error?.response;
      errorObj.data = error?.response?.data;
      throw errorObj;
    }
  }
}

export const childrenService = new ChildrenService();
export default childrenService;
