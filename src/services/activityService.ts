import { Platform } from 'react-native';
import axiosInstance from '../config/axios.config';
import { MyChildrenActivitiesResponse, ActivityResponse } from '../types/api';

export interface StaffActivityResponse {
  id: string;
  note: string;
  imageUrl?: string;
  createdDate: string;
  createdById: string;
  staffName: string;
  activityTypeId: string;
  activityType: {
    id: string;
    name: string;
    description: string;
  };
  studentSlotId: string;
  studentId?: string;
  studentName?: string;
  isViewed: boolean;
  viewedTime?: string;
  createdTime: string;
  parentNote?: string; // Note từ phụ huynh khi đặt lịch
}

export interface PagedActivitiesResponse {
  items: StaffActivityResponse[];
  pageIndex: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

class ActivityService {
  /**
   * Get activities for a student slot
   * Endpoint: GET /api/Activity/my-children-activities
   * @param params Query parameters: studentId, pageIndex, pageSize, studentSlotId
   * @returns Paginated response with activity items
   */
  async getMyChildrenActivities(params: {
    studentId: string;
    pageIndex?: number;
    pageSize?: number;
    studentSlotId: string;
  }): Promise<MyChildrenActivitiesResponse> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('studentId', params.studentId);
      queryParams.append('studentSlotId', params.studentSlotId);
      if (params.pageIndex !== undefined) {
        queryParams.append('pageIndex', params.pageIndex.toString());
      }
      if (params.pageSize !== undefined) {
        queryParams.append('pageSize', params.pageSize.toString());
      }

      const response = await axiosInstance.get<MyChildrenActivitiesResponse>(
        `/api/Activity/my-children-activities?${queryParams.toString()}`
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch activities';
    }
  }

  /**
   * Get all activities for staff
   * Endpoint: GET /api/Activity
   * @returns Array of activities created by staff
   */
  async getStaffActivities(): Promise<StaffActivityResponse[]> {
    try {
      const response = await axiosInstance.get<StaffActivityResponse[]>('/api/Activity');
      return response.data || [];
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch staff activities';
    }
  }

  /**
   * Get student activities
   * Endpoint: GET /api/Activity/student-activities
   * @param params Query parameters: studentId, pageIndex, pageSize, studentSlotId (optional)
   * @returns Paginated response with activity items
   */
  async getStudentActivities(params: {
    studentId: string;
    pageIndex?: number;
    pageSize?: number;
    studentSlotId?: string;
    FromDate?: string;
    ToDate?: string;
  }): Promise<PagedActivitiesResponse> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('studentId', params.studentId);
      if (params.pageIndex !== undefined) {
        queryParams.append('pageIndex', params.pageIndex.toString());
      } else {
        queryParams.append('pageIndex', '1');
      }
      if (params.pageSize !== undefined) {
        queryParams.append('pageSize', params.pageSize.toString());
      } else {
        queryParams.append('pageSize', '20');
      }
      // Chỉ thêm studentSlotId nếu được cung cấp và không phải empty string
      if (params.studentSlotId && params.studentSlotId.trim() !== '') {
        queryParams.append('studentSlotId', params.studentSlotId);
      }
      // Thêm FromDate và ToDate nếu có
      if (params.FromDate) {
        queryParams.append('FromDate', params.FromDate);
      }
      if (params.ToDate) {
        queryParams.append('ToDate', params.ToDate);
      }

      const url = `/api/Activity/student-activities?${queryParams.toString()}`;
      
      const response = await axiosInstance.get<PagedActivitiesResponse>(url);
      
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch student activities';
    }
  }

  /**
   * Get paginated activities with filters
   * Endpoint: GET /api/Activity/paged
   * @param params Query parameters: pageIndex, pageSize, StudentSlotId, ActivityTypeId, CreatedById, FromDate, ToDate, IsViewed, Keyword
   * @returns Paginated response with activity items
   */
  async getPagedActivities(params?: {
    pageIndex?: number;
    pageSize?: number;
    StudentSlotId?: string;
    StudentId?: string;
    ActivityTypeId?: string;
    CreatedById?: string;
    FromDate?: string;
    ToDate?: string;
    IsViewed?: boolean;
    Keyword?: string;
  }): Promise<PagedActivitiesResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.pageIndex !== undefined) {
        queryParams.append('pageIndex', params.pageIndex.toString());
      }
      if (params?.pageSize !== undefined) {
        queryParams.append('pageSize', params.pageSize.toString());
      }
      if (params?.StudentSlotId) {
        queryParams.append('StudentSlotId', params.StudentSlotId);
      }
      if (params?.StudentId) {
        queryParams.append('StudentId', params.StudentId);
      }
      if (params?.ActivityTypeId) {
        queryParams.append('ActivityTypeId', params.ActivityTypeId);
      }
      if (params?.CreatedById) {
        queryParams.append('CreatedById', params.CreatedById);
      }
      if (params?.FromDate) {
        queryParams.append('FromDate', params.FromDate);
      }
      if (params?.ToDate) {
        queryParams.append('ToDate', params.ToDate);
      }
      if (params?.IsViewed !== undefined) {
        queryParams.append('IsViewed', params.IsViewed.toString());
      }
      if (params?.Keyword) {
        queryParams.append('Keyword', params.Keyword);
      }

      const url = `/api/Activity/paged?${queryParams.toString()}`;
      
      const response = await axiosInstance.get<PagedActivitiesResponse>(url);
      
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch paged activities';
    }
  }

  /**
   * Mark an activity as viewed
   * Endpoint: POST /api/Activity/{id}/mark-viewed
   * @param activityId Activity ID (UUID)
   * @returns Updated activity response with isViewed = true and viewedTime
   */
  async markActivityAsViewed(activityId: string): Promise<ActivityResponse> {
    try {
      const response = await axiosInstance.post<ActivityResponse>(`/api/Activity/${activityId}/mark-viewed`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to mark activity as viewed';
    }
  }

  /**
   * Create a new activity
   * Endpoint: POST /api/Activity
   * @param payload Activity data: note, imageUrl (optional), activityTypeId, studentSlotId, createdById
   * @returns Created activity response
   */
  async createActivity(payload: {
    note: string;
    imageUrl?: string;
    activityTypeId: string;
    studentSlotId: string;
    createdById: string;
  }): Promise<ActivityResponse> {
    try {
      const response = await axiosInstance.post<ActivityResponse>('/api/Activity', payload);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to create activity';
    }
  }

  /**
   * Get activity by ID
   * Endpoint: GET /api/Activity/{id}
   * @param activityId Activity ID (UUID)
   * @returns Activity details
   */
  async getActivityById(activityId: string): Promise<ActivityResponse> {
    try {
      const response = await axiosInstance.get<ActivityResponse>(`/api/Activity/${activityId}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to fetch activity';
    }
  }

  /**
   * Update an activity
   * Endpoint: PUT /api/Activity/{id}
   * @param activityId Activity ID (UUID)
   * @param payload Updated activity data: note, imageUrl (optional), activityTypeId
   * @returns Updated activity response
   */
  async updateActivity(
    activityId: string,
    payload: {
      note: string;
      imageUrl?: string;
      activityTypeId: string;
    }
  ): Promise<ActivityResponse> {
    try {
      const response = await axiosInstance.put<ActivityResponse>(`/api/Activity/${activityId}`, payload);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to update activity';
    }
  }

  /**
   * Delete an activity
   * Endpoint: DELETE /api/Activity/{id}
   * @param activityId Activity ID (UUID)
   * @returns void
   */
  async deleteActivity(activityId: string): Promise<void> {
    try {
      await axiosInstance.delete(`/api/Activity/${activityId}`);
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to delete activity';
    }
  }

  /**
   * Check-in student activity (staff)
   * Endpoint: POST /api/Activity/checkin/staff/{studentId}
   * @param studentId Student ID (UUID)
   * @returns Created activity response with check-in information
   */
  async checkInStudent(studentId: string): Promise<ActivityResponse> {
    try {
      const response = await axiosInstance.post<ActivityResponse>(
        `/api/Activity/checkin/staff/${studentId}`
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to check-in student';
    }
  }

  /**
   * Check-in student activity with image (staff)
   * Endpoint: POST /api/Activity/checkin/staff/{studentId}/with-image
   * @param studentId Student ID (UUID)
   * @param imageUri Local file URI from image picker/camera
   * @returns Created activity response with check-in information
   */
  async checkInStudentWithImage(studentId: string, imageUri: string): Promise<ActivityResponse> {
    try {
      // Create FormData for multipart/form-data
      const formData = new FormData();

      // Fix URI for Android - remove 'file://' prefix if exists
      let fixedUri = imageUri;
      if (imageUri.startsWith('file://')) {
        fixedUri = imageUri.replace('file://', '');
      }

      // Get file extension and mime type
      const fileExtension = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';

      // Append image file to FormData
      // @ts-ignore - FormData type issue with React Native
      const imageData = {
        uri: Platform.OS === 'android' ? fixedUri : imageUri,
        type: mimeType,
        name: `checkin_${studentId}_${Date.now()}.${fileExtension}`,
      } as any;

      // Backend expects 'image' field name for the file
      formData.append('image', imageData);

      const response = await axiosInstance.post<ActivityResponse>(
        `/api/Activity/checkin/staff/${studentId}/with-image`,
        formData,
        {
          timeout: 60000, // 60 seconds timeout for file upload
        }
      );

      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message || 'Failed to check-in student with image';
    }
  }
}

export default new ActivityService();

