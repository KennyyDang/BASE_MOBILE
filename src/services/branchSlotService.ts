import axiosInstance from '../config/axios.config';
import { PaginatedResponse, BranchSlotResponse, BranchSlotRoomResponse } from '../types/api';

class BranchSlotService {
  async getAvailableSlotsForStudent(
    studentId: string,
    pageIndex: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<BranchSlotResponse>> {
    const response = await axiosInstance.get<PaginatedResponse<BranchSlotResponse>>(
      `/api/BranchSlot/available-for-student/${studentId}`,
      {
        params: {
          pageIndex,
          pageSize,
        },
      }
    );
    return response.data;
  }

  async getRoomsBySlot(
    branchSlotId: string,
    pageIndex: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedResponse<BranchSlotRoomResponse>> {
    const response = await axiosInstance.get<PaginatedResponse<BranchSlotRoomResponse>>(
      `/api/BranchSlot/${branchSlotId}/rooms`,
      {
        params: {
          pageIndex,
          pageSize,
        },
      }
    );
    return response.data;
  }
}

export const branchSlotService = new BranchSlotService();
export default branchSlotService;

