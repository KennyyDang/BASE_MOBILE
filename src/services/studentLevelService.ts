// Student Level Service
import axiosInstance from '../config/axios.config';
import { PaginatedResponse } from '../types/api';

export interface StudentLevelResponse {
  id: string;
  name: string;
  description: string;
  createdTime: string;
}

class StudentLevelService {
  /**
   * Get paginated list of student levels with optional keyword filter
   * Endpoint: GET /api/StudentLevel/paged
   * 
   * @param params Query parameters
   * @param params.keyword Optional keyword to filter by
   * @param params.branchId Optional branch ID to filter by
   * @param params.pageIndex Page number (default = 1)
   * @param params.pageSize Page size (default = 10)
   * @returns Paginated response with student level items
   */
  async getStudentLevelsPaged(params: {
    keyword?: string;
    branchId?: string;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<StudentLevelResponse>> {
    try {
      const queryParams: any = {
        pageIndex: params.pageIndex || 1,
        pageSize: params.pageSize || 100, // Get more items for dropdown
      };

      if (params.keyword) {
        queryParams.Keyword = params.keyword;
      }

      if (params.branchId) {
        queryParams.BranchId = params.branchId;
      }

      const response = await axiosInstance.get<PaginatedResponse<StudentLevelResponse>>(
        '/api/StudentLevel/paged',
        {
          params: queryParams,
        }
      );
      
      return response.data;
    } catch (error: any) {
      const errorMessage = 
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.response?.data?.title ||
        error?.message ||
        'Failed to fetch student levels';
      
      const errorObj: any = new Error(errorMessage);
      errorObj.response = error?.response;
      errorObj.data = error?.response?.data;
      throw errorObj;
    }
  }
}

export const studentLevelService = new StudentLevelService();
export default studentLevelService;

