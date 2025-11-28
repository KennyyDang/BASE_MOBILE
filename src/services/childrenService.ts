// Children Management Service
import { Platform } from 'react-native';
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

  /**
   * Soft delete a student
   * Endpoint: DELETE /api/Student/{id}
   * 
   * Access Rules:
   * - Admin: có thể delete bất kỳ student nào
   * - Manager: chỉ delete student trong branch của mình
   * - User (Parent): chỉ delete con của chính mình
   * 
   * @param studentId Student ID (UUID) - required
   * @returns Success response (200 OK)
   * @throws Error if deletion fails or user doesn't have permission
   */
  async deleteStudent(studentId: string): Promise<void> {
    try {
      await axiosInstance.delete(`/api/Student/${studentId}`);
    } catch (error: any) {
      // Better error handling - extract detailed error message
      const errorMessage = 
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.response?.data?.title ||
        error?.message ||
        'Failed to delete student';
      
      // Create error object with message
      const errorObj: any = new Error(errorMessage);
      errorObj.response = error?.response;
      errorObj.data = error?.response?.data;
      errorObj.status = error?.response?.status;
      throw errorObj;
    }
  }

  /**
   * Upload student photo
   * Endpoint: POST /api/Student/{id}/upload-photo
   * Upload a student's photo
   * 
   * @param studentId Student ID (UUID) - required
   * @param fileUri Local file URI from image picker
   * @param fileName Optional file name, will be generated if not provided
   * @param mimeType MIME type of the image (default: 'image/jpeg')
   * @returns Updated student response with new photo URL
   * @throws Error if upload fails
   */
  async uploadStudentPhoto(
    studentId: string,
    fileUri: string,
    fileName?: string,
    mimeType: string = 'image/jpeg'
  ): Promise<StudentResponse> {
    try {
      // Create FormData for multipart/form-data
      const formData = new FormData();
      
      // Extract filename from URI if not provided
      const fileExtension = mimeType.split('/')[1] || 'jpg';
      const defaultFileName = fileName || `student_photo_${Date.now()}.${fileExtension}`;
      
      // Append file to FormData
      // @ts-ignore - FormData type issue with React Native
      formData.append('file', {
        uri: fileUri,
        type: mimeType,
        name: defaultFileName,
      } as any);

      const response = await axiosInstance.post<StudentResponse>(
        `/api/Student/${studentId}/upload-photo`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      return response.data;
    } catch (error: any) {
      // Better error handling - extract detailed error message
      const errorData = error?.response?.data;
      let errorMessage = 'Không thể upload ảnh học sinh';
      
      if (errorData) {
        // Handle API error response structure
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // Create error object with message
      const errorObj: any = new Error(errorMessage);
      errorObj.response = error?.response;
      errorObj.data = error?.response?.data;
      throw errorObj;
    }
  }

  /**
   * Register a new child for the current logged in parent
   * Endpoint: POST /api/Student/register-child
   * Content-Type: multipart/form-data
   * 
   * @param formData Object containing child registration data
   * @param formData.name Child name (required)
   * @param formData.dateOfBirth Date of birth (ISO datetime string)
   * @param formData.note Optional note
   * @param formData.image Optional image file URI
   * @param formData.branchId Branch ID (UUID)
   * @param formData.schoolId School ID (UUID, optional)
   * @param formData.studentLevelId Student level ID (UUID, optional)
   * @param formData.documentType Document type (optional)
   * @param formData.issuedBy Issued by (optional)
   * @param formData.issuedDate Issued date (ISO datetime string, optional)
   * @param formData.expirationDate Expiration date (ISO datetime string, optional)
   * @param formData.documentFile Document file URI (optional)
   * @returns Created student response
   * @throws Error if registration fails
   */
  async registerChild(formData: {
    name: string;
    dateOfBirth?: string;
    note?: string;
    image?: string;
    branchId: string;
    schoolId?: string;
    studentLevelId?: string;
    documentType?: string;
    issuedBy?: string;
    issuedDate?: string;
    expirationDate?: string;
    documentFile?: string;
  }): Promise<StudentResponse> {
    try {
      const multipartFormData = new FormData();

      // Required fields
      multipartFormData.append('Name', formData.name);

      if (formData.dateOfBirth) {
        multipartFormData.append('DateOfBirth', formData.dateOfBirth);
      }

      if (formData.note) {
        multipartFormData.append('Note', formData.note);
      }

      if (formData.image) {
        // Extract file extension from URI
        let uri = formData.image;
        // Fix URI for Android - remove 'file://' prefix if exists
        if (Platform.OS === 'android' && uri.startsWith('file://')) {
          uri = uri.replace('file://', '');
        }
        const fileExtension = uri.split('.').pop() || 'jpg';
        const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
        
        // @ts-ignore - FormData type issue with React Native
        multipartFormData.append('ImageFile', {
          uri: Platform.OS === 'android' ? uri : formData.image,
          type: mimeType,
          name: `child_image_${Date.now()}.${fileExtension}`,
        } as any);
      }

      multipartFormData.append('BranchId', formData.branchId);

      if (formData.schoolId) {
        multipartFormData.append('SchoolId', formData.schoolId);
      }

      if (formData.studentLevelId) {
        multipartFormData.append('StudentLevelId', formData.studentLevelId);
      }

      if (formData.documentType) {
        multipartFormData.append('DocumentType', formData.documentType);
      }

      if (formData.issuedBy) {
        multipartFormData.append('IssuedBy', formData.issuedBy);
      }

      if (formData.issuedDate) {
        multipartFormData.append('IssuedDate', formData.issuedDate);
      }

      if (formData.expirationDate) {
        multipartFormData.append('ExpirationDate', formData.expirationDate);
      }

      if (formData.documentFile) {
        // Extract file extension from URI
        let uri = formData.documentFile;
        // Fix URI for Android - remove 'file://' prefix if exists
        if (Platform.OS === 'android' && uri.startsWith('file://')) {
          uri = uri.replace('file://', '');
        }
        const fileExtension = uri.split('.').pop() || 'pdf';
        const mimeType = fileExtension === 'pdf' ? 'application/pdf' : 
                        fileExtension === 'jpg' || fileExtension === 'jpeg' ? 'image/jpeg' :
                        fileExtension === 'png' ? 'image/png' : 'application/octet-stream';
        
        // @ts-ignore - FormData type issue with React Native
        multipartFormData.append('DocumentFile', {
          uri: Platform.OS === 'android' ? uri : formData.documentFile,
          type: mimeType,
          name: `document_${Date.now()}.${fileExtension}`,
        } as any);
      }

      // Axios interceptor will automatically handle FormData Content-Type with boundary
      const response = await axiosInstance.post<StudentResponse>(
        '/api/Student/register-child',
        multipartFormData
      );
      
      return response.data;
    } catch (error: any) {
      const errorMessage = 
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.response?.data?.title ||
        error?.message ||
        'Failed to register child';
      
      const errorObj: any = new Error(errorMessage);
      errorObj.response = error?.response;
      errorObj.data = error?.response?.data;
      throw errorObj;
    }
  }
}

export const childrenService = new ChildrenService();
export default childrenService;
