import axiosInstance from '../config/axios.config';
import type { BranchTransferRequest } from '../types/api';

// Pagination response interface
export interface BranchTransferPaginationResponse {
  items: BranchTransferRequest[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const buildQueryString = (params: Record<string, any> = {}) => {
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    queryParams.append(key, value.toString());
  });

  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
};

export interface CreateTransferRequestData {
  studentId: string;
  targetBranchId: string;
  changeSchool: boolean;
  targetSchoolId?: string;
  changeLevel: boolean;
  targetStudentLevelId?: string;
  documentFile?: any; // File object for mobile
  requestReason?: string;
}

// Parent endpoints
const createTransferRequest = async (requestData: CreateTransferRequestData): Promise<any> => {
  try {
    const formData = new FormData();

    // Required fields
    formData.append('StudentId', requestData.studentId);
    formData.append('TargetBranchId', requestData.targetBranchId);

    // Boolean fields - always include
    formData.append('ChangeSchool', requestData.changeSchool.toString());
    formData.append('ChangeLevel', requestData.changeLevel.toString());

    // Optional fields - only include if changing and have values
    if (requestData.changeSchool && requestData.targetSchoolId) {
      formData.append('TargetSchoolId', requestData.targetSchoolId);
    }

    if (requestData.changeLevel && requestData.targetStudentLevelId) {
      formData.append('TargetStudentLevelId', requestData.targetStudentLevelId);
    }

    // Document file - only if provided
    if (requestData.documentFile) {
      formData.append('DocumentFile', requestData.documentFile);
    }

    // Request reason - only if provided and not empty
    if (requestData.requestReason && requestData.requestReason.trim()) {
      formData.append('RequestReason', requestData.requestReason);
    }

    const response = await axiosInstance.post('/Student/branch-transfer/request', formData, {
      timeout: 60000 // 60 seconds for file upload
    });

    // API returns data directly
    return response.data;
  } catch (error) {
    throw error;
  }
};

const getMyTransferRequests = async (params: Record<string, any> = {}): Promise<BranchTransferPaginationResponse> => {
  try {
    const queryString = buildQueryString(params);
    const response = await axiosInstance.get(`/Student/branch-transfer/requests${queryString}`);

    // API returns data wrapped in pagination format with items array
    const data = response.data as any;

    // If API returns direct array, convert to pagination format
    if (Array.isArray(data)) {
      return {
        items: data,
        totalCount: data.length,
        pageIndex: 1,
        pageSize: data.length,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };
    }

    // If API returns pagination format
    if (data?.items && Array.isArray(data.items)) {
      const pageIndex = data.pageIndex || data.currentPage || 1;
      const pageSize = data.pageSize || data.items.length;
      const totalCount = data.totalCount || data.total || data.items.length;
      const totalPages = data.totalPages || Math.ceil(totalCount / pageSize);

      return {
        items: data.items,
        totalCount,
        pageIndex,
        pageSize,
        totalPages,
        hasNextPage: pageIndex < totalPages,
        hasPreviousPage: pageIndex > 1,
      };
    }

    // Fallback
    return {
      items: [],
      totalCount: 0,
      pageIndex: 1,
      pageSize: 20,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    };
  } catch (error) {
    throw error;
  }
};

const getMyTransferRequestById = async (requestId: string): Promise<BranchTransferRequest> => {
  try {
    const response = await axiosInstance.get(`/Student/branch-transfer/requests/${requestId}`);

    // API returns data directly (not wrapped in ApiResponse format)
    return response.data as any;
  } catch (error) {
    throw error;
  }
};

const cancelTransferRequest = async (requestId: string): Promise<any> => {
  try {
    const response = await axiosInstance.delete(`/Student/branch-transfer/requests/${requestId}`);

    // API returns data directly
    return response.data;
  } catch (error) {
    throw error;
  }
};



const branchTransferService = {
  // Parent methods
  createTransferRequest,
  getMyTransferRequests,
  getMyTransferRequestById,
  cancelTransferRequest,
};

export default branchTransferService;