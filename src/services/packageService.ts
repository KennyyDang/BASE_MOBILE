import axiosInstance from '../config/axios.config';
import { API_ENDPOINTS } from '../constants';
import {
  RegisterPackageRequest,
  RegisterPackageResponse,
  StudentPackageResponse,
  StudentPackageSubscription,
} from '../types/api';

class PackageService {
  async getSuitablePackages(studentId: string): Promise<StudentPackageResponse[]> {
    const endpoint = API_ENDPOINTS.STUDENT_SUITABLE_PACKAGES.replace(':studentId', studentId);
    const response = await axiosInstance.get<StudentPackageResponse[]>(endpoint);
    const data = response.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray((data as any)?.items)) {
      return (data as any).items;
    }
    return [];
  }

  async registerPackage(payload: RegisterPackageRequest): Promise<RegisterPackageResponse> {
    const body = {
      ...payload,
      startDate: payload.startDate ?? new Date().toISOString(),
    };
    const response = await axiosInstance.post<RegisterPackageResponse>(
      API_ENDPOINTS.PACKAGE_BUY_FOR_CHILD,
      body
    );
    return response.data;
  }

  async getStudentSubscriptions(studentId: string): Promise<StudentPackageSubscription[]> {
    const endpoint = `/api/PackageSubscription/by-student/${studentId}`;
    const response = await axiosInstance.get<StudentPackageSubscription[]>(endpoint);
    const data = response.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray((data as any)?.items)) {
      return (data as any).items;
    }
    return [];
  }
}

export const packageService = new PackageService();
export default packageService;


