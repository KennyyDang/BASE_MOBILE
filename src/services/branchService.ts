// Branch Service
import axiosInstance from '../config/axios.config';
import { PaginatedResponse } from '../types/api';

export interface StudentLevelInBranch {
  id: string;
  name: string;
  description?: string;
  createdTime: string;
}

export interface SchoolInBranch {
  id: string;
  name: string;
  address: string;
  phoneNumber: string;
  email: string;
  isDeleted: boolean;
}

export interface BranchResponse {
  id: string;
  branchName: string;
  address: string;
  phone: string;
  districtId: string;
  districtName: string;
  provinceName: string;
  status: string;
  studentLevels: StudentLevelInBranch[];
  schools: SchoolInBranch[];
}

// Legacy interface for paginated response (if needed)
export interface BranchResponseLegacy {
  id: string;
  name: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  isDeleted?: boolean;
}

class BranchService {
  /**
   * Get all branches with their student levels and schools
   * Endpoint: GET /api/Branch
   * 
   * @returns Array of branch objects with studentLevels and schools included
   */
  async getBranches(): Promise<BranchResponse[]> {
    try {
      const response = await axiosInstance.get<BranchResponse[]>('/api/Branch');
      return response.data;
    } catch (error: any) {
      // Better error handling - extract detailed error message
      const errorMessage = 
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.response?.data?.title ||
        error?.message ||
        'Failed to fetch branches';
      
      // Create error object with message
      const errorObj: any = new Error(errorMessage);
      errorObj.response = error?.response;
      errorObj.data = error?.response?.data;
      throw errorObj;
    }
  }

  /**
   * Get paginated list of branches (legacy method, if needed)
   * Endpoint: GET /api/Branch/paged
   * 
   * @param params Query parameters
   * @param params.branchName Optional branch name filter
   * @param params.pageIndex Page number (default = 1)
   * @param params.pageSize Page size (default = 10)
   * @param params.includeDeleted Include deleted branches (default = false)
   * @returns Paginated response with branch items
   */
  async getBranchesPaged(params: {
    branchName?: string;
    pageIndex?: number;
    pageSize?: number;
    includeDeleted?: boolean;
  }): Promise<PaginatedResponse<BranchResponseLegacy>> {
    try {
      const queryParams: any = {
        pageIndex: params.pageIndex || 1,
        pageSize: params.pageSize || 10,
        IncludeDeleted: params.includeDeleted || false,
      };

      if (params.branchName) {
        queryParams.BranchName = params.branchName;
      }

      const response = await axiosInstance.get<PaginatedResponse<BranchResponseLegacy>>(
        '/api/Branch/paged',
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
        'Failed to fetch branches';
      
      // Create error object with message
      const errorObj: any = new Error(errorMessage);
      errorObj.response = error?.response;
      errorObj.data = error?.response?.data;
      throw errorObj;
    }
  }
}

export const branchService = new BranchService();
export default branchService;

