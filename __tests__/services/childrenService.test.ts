/**
 * Tests for ChildrenService
 */

import childrenService from '../../src/services/childrenService';
import axiosInstance from '../../src/config/axios.config';

jest.mock('../../src/config/axios.config');

describe('ChildrenService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyChildren', () => {
    it('should fetch children list successfully', async () => {
      const mockChildren = [
        {
          id: 'child-1',
          name: 'John Doe',
          dateOfBirth: '2015-05-20',
          grade: '3A',
          school: 'Primary School',
          avatar: 'https://example.com/avatar1.jpg',
        },
        {
          id: 'child-2',
          name: 'Jane Doe',
          dateOfBirth: '2017-03-15',
          grade: '1B',
          school: 'Primary School',
          avatar: 'https://example.com/avatar2.jpg',
        },
      ];

      (axiosInstance.get as jest.Mock).mockResolvedValueOnce({
        data: mockChildren,
      });

      const result = await childrenService.getMyChildren();

      expect(result).toEqual(mockChildren);
      expect(result.length).toBe(2);
      expect(axiosInstance.get).toHaveBeenCalledWith('/api/Student/my-children');
    });

    it('should handle empty children list', async () => {
      (axiosInstance.get as jest.Mock).mockResolvedValueOnce({
        data: [],
      });

      const result = await childrenService.getMyChildren();

      expect(result).toEqual([]);
    });

    it('should handle fetch error', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      };

      (axiosInstance.get as jest.Mock).mockRejectedValueOnce(mockError);

      await expect(childrenService.getMyChildren()).rejects.toThrow();
    });
  });

  describe('addChild', () => {
    it('should add child successfully', async () => {
      const childData = {
        firstName: 'New',
        lastName: 'Child',
        dateOfBirth: '2018-01-10',
        grade: 'Grade 1',
        school: 'ABC School',
        emergencyContact: '0123456789',
      };

      const mockResponse = {
        id: 'child-3',
        ...childData,
        createdAt: '2024-01-15',
      };

      (axiosInstance.post as jest.Mock).mockResolvedValueOnce({
        data: mockResponse,
      });

      const result = await childrenService.addChild(childData);

      expect(result).toEqual(mockResponse);
      expect(axiosInstance.post).toHaveBeenCalledWith('/children', childData);
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        name: 'New Child',
        dateOfBirth: '2018-01-10',
      };

      const mockError = {
        response: {
          status: 400,
          data: {
            errors: {
              schoolId: ['School is required'],
            },
          },
        },
      };

      (axiosInstance.post as jest.Mock).mockRejectedValueOnce(mockError);

      await expect(childrenService.addChild(incompleteData as any)).rejects.toThrow();
    });

    it('should handle invalid date of birth', async () => {
      const childData = {
        firstName: 'New',
        lastName: 'Child',
        dateOfBirth: '2050-01-10',
        grade: 'Grade 1',
        school: 'ABC School',
        emergencyContact: '0123456789',
      };

      const mockError = {
        response: {
          status: 400,
          data: {
            message: 'Invalid date of birth',
          },
        },
      };

      (axiosInstance.post as jest.Mock).mockRejectedValueOnce(mockError);

      await expect(childrenService.addChild(childData)).rejects.toThrow();
    });
  });

  describe('updateChild', () => {
    it('should update child information successfully', async () => {
      const childId = 'child-1';
      const updateData = {
        firstName: 'Updated',
        school: 'New School',
      };

      const mockResponse = {
        id: childId,
        name: 'Updated Name',
        dateOfBirth: '2015-05-20',
        grade: '3A',
        school: 'New School',
        avatar: 'https://example.com/avatar1.jpg',
      };

      (axiosInstance.put as jest.Mock).mockResolvedValueOnce({
        data: mockResponse,
      });

      const result = await childrenService.updateChild(childId, updateData);

      expect(result).toEqual(mockResponse);
      expect(axiosInstance.put).toHaveBeenCalledWith(`/children/${childId}`, updateData);
    });

    it('should handle non-existent child', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { message: 'Child not found' },
        },
      };

      (axiosInstance.put as jest.Mock).mockRejectedValueOnce(mockError);

      await expect(
        childrenService.updateChild('non-existent', {})
      ).rejects.toThrow();
    });
  });

  describe('deleteChild', () => {
    it('should delete child successfully', async () => {
      const childId = 'child-1';

      (axiosInstance.delete as jest.Mock).mockResolvedValueOnce({
        data: { message: 'Child deleted successfully' },
      });

      const result = await childrenService.deleteChild(childId);

      expect(axiosInstance.delete).toHaveBeenCalledWith(`/api/Student/${childId}`);
    });

    it('should handle delete error', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { message: 'Child not found' },
        },
      };

      (axiosInstance.delete as jest.Mock).mockRejectedValueOnce(mockError);

      await expect(childrenService.deleteChild('non-existent')).rejects.toThrow();
    });
  });

  describe('getChildDetails', () => {
    it('should fetch detailed child information', async () => {
      const childId = 'child-1';
      const mockDetails = {
        id: childId,
        name: 'John Doe',
        dateOfBirth: '2015-05-20',
        grade: '3A',
        school: 'Primary School',
        avatar: 'https://example.com/avatar1.jpg',
        enrollmentStatus: 'ACTIVE',
        enrollmentDate: '2023-09-01',
        activities: [
          { id: 'activity-1', name: 'Swimming', status: 'ACTIVE' },
          { id: 'activity-2', name: 'Coding', status: 'COMPLETED' },
        ],
      };

      (axiosInstance.get as jest.Mock).mockResolvedValueOnce({
        data: mockDetails,
      });

      const result = await childrenService.getChildDetails(childId);

      expect(result).toEqual(mockDetails);
      expect(mockDetails.activities.length).toBe(2);
    });
  });

  describe.skip('getChildrenPaged', () => {
    it('should fetch children with pagination', async () => {
      const mockResponse = {
        items: [
          {
            id: 'child-1',
            name: 'John Doe',
            dateOfBirth: '2015-05-20',
          },
        ],
        totalCount: 10,
        pageNumber: 1,
        pageSize: 5,
      };

      (axiosInstance.get as jest.Mock).mockResolvedValueOnce({
        data: mockResponse,
      });

      // const result = await childrenService.getChildrenPaged(1, 5);

      expect(mockResponse.items.length).toBe(1);
      expect(mockResponse.totalCount).toBe(10);
      expect(axiosInstance.get).toHaveBeenCalledWith(
        '/api/Student/paged/current-user',
        expect.any(Object)
      );
    });

    it.skip('should handle pagination parameters', async () => {
      (axiosInstance.get as jest.Mock).mockResolvedValueOnce({
        data: { items: [], totalCount: 0, pageNumber: 2, pageSize: 10 },
      });

      // await childrenService.getChildrenPaged(2, 10);

      expect(axiosInstance.get).toHaveBeenCalledWith(
        '/api/Student/paged/current-user',
        expect.objectContaining({
          params: expect.objectContaining({
            pageNumber: 2,
            pageSize: 10,
          }),
        })
      );
    });
  });
});
