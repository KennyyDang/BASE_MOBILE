/**
 * Staff role unit tests that focus on slot management and attendance workflows
 */

import studentSlotService from '../../../src/services/studentSlotService';
import axiosInstance from '../../../src/config/axios.config';

jest.mock('../../../src/config/axios.config', () => {
  const mockAxios = {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  };

  return {
    __esModule: true,
    default: mockAxios,
    STORAGE_KEYS: {
      ACCESS_TOKEN: '@base_access_token',
      REFRESH_TOKEN: '@base_refresh_token',
      USER: '@base_user',
    },
  };
});

type MockedAxios = {
  get: jest.Mock;
  post: jest.Mock;
  delete: jest.Mock;
  patch: jest.Mock;
};

const mockedAxios = axiosInstance as unknown as MockedAxios;

describe('Staff Role - Schedule and attendance flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches staff slots with correct params', async () => {
    const mockResponse = {
      items: [{ id: 'slot-1', status: 'BOOKED' }],
      pageIndex: 1,
      totalPages: 1,
    };

    mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

    const filters = { pageIndex: 2, pageSize: 50, upcomingOnly: true };
    const result = await studentSlotService.getStaffSlots(filters);

    expect(mockedAxios.get).toHaveBeenCalledWith('/api/StudentSlot/staff-slots', {
      params: filters,
    });
    expect(result).toEqual(mockResponse);
  });

  it('propagates API errors for staff slot loads', async () => {
    const networkError = { response: { data: 'Unauthorized access' } };
    mockedAxios.get.mockRejectedValueOnce(networkError);

    await expect(studentSlotService.getStaffSlots()).rejects.toEqual('Unauthorized access');
  });

  it('cancels student slots through staff tooling', async () => {
    mockedAxios.delete.mockResolvedValueOnce({ data: { success: true } });

    const result = await studentSlotService.cancelSlot('slot-1', 'student-1');

    expect(mockedAxios.delete).toHaveBeenCalledWith('/api/StudentSlot/cancel', {
      params: {
        slotId: 'slot-1',
        studentId: 'student-1',
      },
    });
    expect(result).toEqual({ success: true });
  });

  it('surfaces cancellation errors for staff flow', async () => {
    const error = { response: { data: 'Slot not found' } };
    mockedAxios.delete.mockRejectedValueOnce(error);

    await expect(studentSlotService.cancelSlot('slot-1', 'student-1')).rejects.toEqual('Slot not found');
  });
});
