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

  /**
   * Refund a package subscription
   * Endpoint: POST /api/PackageSubscription/{id}/refund
   * @param subscriptionId Package subscription ID (UUID)
   * @returns Refunded subscription details
   */
  async refundSubscription(subscriptionId: string): Promise<StudentPackageSubscription> {
    const endpoint = `/api/PackageSubscription/${subscriptionId}/refund`;
    const response = await axiosInstance.post<StudentPackageSubscription>(endpoint);
    return response.data;
  }

  /**
   * Upgrade student's current active subscription to a higher package
   * Endpoint: POST /api/PackageSubscription/upgrade/{studentId}/{newPackageId}
   * @param studentId Student ID (UUID)
   * @param newPackageId New package ID to upgrade to (UUID)
   * @returns Upgrade response with subscription ID
   */
  async upgradePackage(studentId: string, newPackageId: string): Promise<{ id: string }> {
    try {
      const endpoint = `/api/PackageSubscription/upgrade/${studentId}/${newPackageId}`;
      const response = await axiosInstance.post<{ id: string }>(endpoint);
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.response?.data?.title ||
        error?.message ||
        'Không thể nâng cấp gói';
      throw new Error(errorMessage);
    }
  }

  /**
   * Renew student's current active subscription
   * Endpoint: POST /api/PackageSubscription/renew/{studentId}
   * @param studentId Student ID (UUID)
   * @returns Renewed subscription details
   */
  async renewSubscription(studentId: string): Promise<StudentPackageSubscription> {
    try {
      const endpoint = `/api/PackageSubscription/renew/${studentId}`;
      const response = await axiosInstance.post<StudentPackageSubscription>(endpoint);
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.response?.data?.title ||
        error?.message ||
        'Không thể gia hạn gói';
      throw new Error(errorMessage);
    }
  }
}

export const packageService = new PackageService();
export default packageService;


