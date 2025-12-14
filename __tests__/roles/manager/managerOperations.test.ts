/**
 * Manager role unit tests that validate administrative data flows
 */

import branchService from '../../../src/services/branchService';
import axiosInstance from '../../../src/config/axios.config';

jest.mock('../../../src/config/axios.config', () => {
  const mockAxios = {
    get: jest.fn(),
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
};

const mockedAxios = axiosInstance as unknown as MockedAxios;

describe('Manager Role - Branch administration flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads all branches with nested metadata', async () => {
    const mockBranches = [
      {
        id: 'branch-1',
        branchName: 'District 1',
        studentLevels: [],
        schools: [],
      },
    ];

    mockedAxios.get.mockResolvedValueOnce({ data: mockBranches });

    const result = await branchService.getBranches();

    expect(mockedAxios.get).toHaveBeenCalledWith('/api/Branch');
    expect(result).toEqual(mockBranches);
  });

  it('surfaces descriptive errors when branch list fails', async () => {
    const error = { response: { data: { message: 'Unauthorized' } } };
    mockedAxios.get.mockRejectedValueOnce(error);

    await expect(branchService.getBranches()).rejects.toThrow('Unauthorized');
  });

  it('applies pagination filters when managers search branches', async () => {
    const mockPagedResponse = {
      items: [],
      pageIndex: 2,
      pageSize: 20,
      totalPages: 10,
      hasNextPage: true,
    };

    mockedAxios.get.mockResolvedValueOnce({ data: mockPagedResponse });

    const params = {
      branchName: 'Hanoi',
      pageIndex: 2,
      pageSize: 20,
      includeDeleted: false,
    };

    const result = await branchService.getBranchesPaged(params);

    expect(mockedAxios.get).toHaveBeenCalledWith('/api/Branch/paged', {
      params: {
        pageIndex: 2,
        pageSize: 20,
        IncludeDeleted: false,
        BranchName: 'Hanoi',
      },
    });
    expect(result).toEqual(mockPagedResponse);
  });
});
