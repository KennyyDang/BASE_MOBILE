import axiosInstance from '../config/axios.config';
import { BookStudentSlotRequest, BookStudentSlotResponse } from '../types/api';

class StudentSlotService {
  async bookSlot(payload: BookStudentSlotRequest): Promise<BookStudentSlotResponse> {
    const response = await axiosInstance.post<BookStudentSlotResponse>('/api/StudentSlot/book', payload);
    return response.data;
  }
}

export const studentSlotService = new StudentSlotService();
export default studentSlotService;

