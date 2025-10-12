// Children Management Service
import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../constants';
import { Child, ChildForm, ApiResponse } from '../types';

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
  ): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const url = `${API_ENDPOINTS.CHILDREN}/${childId}/attendance${queryString ? `?${queryString}` : ''}`;
    
    return await apiClient.get(url);
  }
}

export const childrenService = new ChildrenService();
export default childrenService;
