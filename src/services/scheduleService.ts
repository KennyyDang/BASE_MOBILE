// Schedule Service
import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../constants';
import { ClassSession, Course, Schedule, ApiResponse, PaginatedResponse } from '../types';

class ScheduleService {
  // Get weekly schedule
  async getWeeklySchedule(week?: string): Promise<ApiResponse<ClassSession[]>> {
    const params = week ? `?week=${week}` : '';
    return await apiClient.get<ClassSession[]>(`${API_ENDPOINTS.WEEKLY_SCHEDULE}${params}`);
  }

  // Get schedule by date range
  async getScheduleByDateRange(
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<ClassSession[]>> {
    const params = new URLSearchParams({
      startDate,
      endDate,
    });
    
    return await apiClient.get<ClassSession[]>(`${API_ENDPOINTS.SCHEDULE}?${params.toString()}`);
  }

  // Register for a class
  async registerClass(classId: string, childId: string): Promise<ApiResponse<ClassSession>> {
    return await apiClient.post<ClassSession>(API_ENDPOINTS.REGISTER_CLASS, {
      classId,
      childId,
    });
  }

  // Cancel class registration
  async cancelClass(classId: string): Promise<ApiResponse<void>> {
    return await apiClient.post(`${API_ENDPOINTS.CANCEL_CLASS.replace(':id', classId)}`);
  }

  // Get available courses
  async getAvailableCourses(): Promise<ApiResponse<Course[]>> {
    return await apiClient.get<Course[]>(API_ENDPOINTS.AVAILABLE_COURSES);
  }

  // Get course details
  async getCourseDetails(courseId: string): Promise<ApiResponse<Course>> {
    return await apiClient.get<Course>(API_ENDPOINTS.COURSE_DETAILS.replace(':id', courseId));
  }

  // Get upcoming classes
  async getUpcomingClasses(limit: number = 10): Promise<ApiResponse<ClassSession[]>> {
    return await apiClient.get<ClassSession[]>(`${API_ENDPOINTS.SCHEDULE}/upcoming?limit=${limit}`);
  }

  // Get class attendance
  async getClassAttendance(classId: string): Promise<ApiResponse<any[]>> {
    return await apiClient.get(`${API_ENDPOINTS.SCHEDULE}/${classId}/attendance`);
  }
}

export const scheduleService = new ScheduleService();
export default scheduleService;
