/**
 * Test Utilities and Helpers
 * Common testing utilities for all tests
 */

import { render, RenderAPI } from '@testing-library/react-native';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';

/**
 * Mock data generators for testing
 */
export const mockDataGenerator = {
  mockUser: (overrides?: any) => ({
    id: '1',
    email: 'parent@example.com',
    name: 'Parent User',
    role: 'PARENT',
    avatar: 'https://example.com/avatar.jpg',
    ...overrides,
  }),

  mockChild: (overrides?: any) => ({
    id: 'child-1',
    name: 'John Doe',
    dateOfBirth: '2015-05-20',
    grade: '3A',
    school: 'Primary School',
    avatar: 'https://example.com/avatar1.jpg',
    ...overrides,
  }),

  mockLoginCredentials: (overrides?: any) => ({
    email: 'parent@example.com',
    password: 'password123',
    firebaseToken: 'firebase-token',
    deviceName: 'iPhone',
    ...overrides,
  }),

  mockWalletBalance: (overrides?: any) => ({
    mainBalance: 1000000,
    allowanceBalance: 500000,
    totalBalance: 1500000,
    currency: 'VND',
    ...overrides,
  }),

  mockTransaction: (overrides?: any) => ({
    id: 'txn-1',
    amount: 100000,
    type: 'CREDIT',
    description: 'Top up',
    date: '2024-01-15',
    status: 'COMPLETED',
    ...overrides,
  }),

  mockService: (overrides?: any) => ({
    id: 'service-1',
    name: 'Swimming Class',
    description: 'Professional swimming lessons',
    price: 500000,
    image: 'https://example.com/swimming.jpg',
    rating: 4.5,
    reviews: 120,
    isActive: true,
    ...overrides,
  }),

  mockActivity: (overrides?: any) => ({
    id: 'activity-1',
    name: 'Morning Swimming',
    type: 'SWIMMING',
    startTime: '2024-01-20T08:00:00',
    endTime: '2024-01-20T09:00:00',
    location: 'Pool A',
    maxCapacity: 20,
    enrolledCount: 15,
    status: 'ACTIVE',
    ...overrides,
  }),

  mockSchedule: (overrides?: any) => ({
    id: 'schedule-1',
    childId: 'child-1',
    activityId: 'activity-1',
    status: 'ENROLLED',
    enrollmentDate: '2024-01-15',
    attendanceCount: 5,
    totalSessions: 10,
    ...overrides,
  }),
};

/**
 * Mock API responses
 */
export const mockApiResponses = {
  success: (data: any) => ({
    status: 200,
    data,
  }),

  created: (data: any) => ({
    status: 201,
    data,
  }),

  badRequest: (message: string) => ({
    status: 400,
    data: { message, errors: {} },
  }),

  unauthorized: () => ({
    status: 401,
    data: { message: 'Unauthorized' },
  }),

  forbidden: () => ({
    status: 403,
    data: { message: 'Forbidden' },
  }),

  notFound: (message: string = 'Not found') => ({
    status: 404,
    data: { message },
  }),

  serverError: (message: string = 'Internal Server Error') => ({
    status: 500,
    data: { message },
  }),
};

/**
 * Custom render function with common providers
 */
export const renderWithNavigation = (
  component: React.ReactElement,
  options?: any
): RenderAPI => {
  const WrapperComponent = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(NavigationContainer, null, children);
  };
  return render(component, { wrapper: WrapperComponent, ...options });
};

/**
 * Wait for async operations
 */
export const waitForAsync = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Common test assertions
 */
export const assertions = {
  expectErrorMessage: (component: any, message: string) => {
    const text = component.getByText(new RegExp(message, 'i'));
    expect(text).toBeTruthy();
  },

  expectInputValue: (input: any, value: string) => {
    expect(input.props.value).toBe(value);
  },

  expectButtonDisabled: (button: any) => {
    expect(button.props.disabled).toBe(true);
  },

  expectButtonEnabled: (button: any) => {
    expect(button.props.disabled).toBeFalsy();
  },
};

/**
 * Mock AsyncStorage for testing
 */
export const mockAsyncStorage = {
  setup: () => {
    const store: any = {};

    return {
      getItem: jest.fn((key: string) => {
        return Promise.resolve(store[key] || null);
      }),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
        return Promise.resolve();
      }),
      multiRemove: jest.fn((keys: string[]) => {
        keys.forEach((key) => delete store[key]);
        return Promise.resolve();
      }),
      multiSet: jest.fn((pairs: [string, string][]) => {
        pairs.forEach(([key, value]) => {
          store[key] = value;
        });
        return Promise.resolve();
      }),
      getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
      clear: jest.fn(() => {
        Object.keys(store).forEach((key) => delete store[key]);
        return Promise.resolve();
      }),
    };
  },
};

/**
 * Mock axios for API testing
 */
export const mockAxios = {
  setup: () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    request: jest.fn(),
  }),
};

/**
 * Test data constants
 */
export const TEST_CONSTANTS = {
  VALID_EMAIL: 'test@example.com',
  INVALID_EMAIL: 'invalid-email',
  VALID_PASSWORD: 'Password123!@#',
  SHORT_PASSWORD: 'Pass123',
  VALID_PHONE: '+84912345678',
  INVALID_PHONE: '123',
  VALID_URL: 'https://example.com',
  VALID_CURRENCY: 'VND',
  DEFAULT_TIMEOUT: 5000,
  API_DELAY: 100,
};

/**
 * Error handling utilities
 */
export const errorHandling = {
  createNetworkError: (message: string = 'Network Error') => ({
    message,
    code: 'NETWORK_ERROR',
  }),

  createValidationError: (field: string, message: string) => ({
    response: {
      status: 400,
      data: {
        errors: {
          [field]: [message],
        },
      },
    },
  }),

  createAuthError: () => ({
    response: {
      status: 401,
      data: { message: 'Unauthorized' },
    },
  }),

  createNotFoundError: (resource: string) => ({
    response: {
      status: 404,
      data: { message: `${resource} not found` },
    },
  }),
};

/**
 * Async test utilities
 */
export const asyncTestUtils = {
  flushPromises: () =>
    new Promise((resolve) => setImmediate(resolve)),

  wait: (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms)),

  createDelayedPromise: <T,>(data: T, delay: number = 100) =>
    new Promise((resolve) => {
      setTimeout(() => resolve(data), delay);
    }),

  createRejectedPromise: (error: any, delay: number = 100) =>
    new Promise((_, reject) => {
      setTimeout(() => reject(error), delay);
    }),
};

/**
 * Form testing utilities
 */
export const formTestUtils = {
  fillFormField: (getByPlaceholder: any, placeholder: string, value: string) => {
    const input = getByPlaceholder(placeholder);
    return { fireEvent: { changeText: (v: string) => (input.props.value = v) }, input };
  },

  getFormValues: (component: any) => {
    const inputs = component.queryAllByType('TextInput');
    return inputs.map((input: any) => input.props.value);
  },

  submitForm: (getByText: any, buttonText: string) => {
    const button = getByText(new RegExp(buttonText, 'i'));
    return button;
  },
};
