// School Service
import axiosInstance from '../config/axios.config';
import { PaginatedResponse } from '../types/api';

export interface SchoolResponse {
  id: string;
  name: string;
  address: string;
  phoneNumber: string;
  email: string;
  isDeleted: boolean;
}

class SchoolService {
  /**
   * Get paginated list of schools with optional filtering by name
   * Endpoint: GET /api/School/paged
   * 
   * @param params Query parameters
   * @param params.schoolName Optional school name filter
   * @param params.pageIndex Page number (default = 1)
   * @param params.pageSize Page size (default = 10)
   * @param params.includeDeleted Include deleted schools (default = false)
   * @returns Paginated response with school items
   */
  async getSchoolsPaged(params: {
    schoolName?: string;
    pageIndex?: number;
    pageSize?: number;
    includeDeleted?: boolean;
  }): Promise<PaginatedResponse<SchoolResponse>> {
    try {
      const queryParams: any = {
        pageIndex: params.pageIndex || 1,
        pageSize: params.pageSize || 10,
        IncludeDeleted: params.includeDeleted || false,
      };

      if (params.schoolName) {
        queryParams.SchoolName = params.schoolName;
      }

      const response = await axiosInstance.get<PaginatedResponse<SchoolResponse>>(
        '/api/School/paged',
        {
          params: queryParams,
        }
      );
      
      return response.data;
    } catch (error: any) {
      // Better error handling - extract detailed error message
      const errorMessage = 
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.response?.data?.title ||
        error?.message ||
        'Failed to fetch schools';
      
      // Create error object with message
      const errorObj: any = new Error(errorMessage);
      errorObj.response = error?.response;
      errorObj.data = error?.response?.data;
      throw errorObj;
    }
  }
}

export const schoolService = new SchoolService();
export default schoolService;

