import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import LoginScreen from '../../src/screens/auth/LoginScreen';
import authService from '../../src/services/auth.service';

const mockLogin = jest.fn();
const mockLogout = jest.fn();
const mockNavigate = jest.fn();
const mockRegisterForPushNotifications = jest.fn().mockResolvedValue({ token: 'mock-push-token' });
const mockAsyncStorage = {
  multiRemove: jest.fn().mockResolvedValue(undefined),
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
};

jest.mock('../../src/services/auth.service');

jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    logout: mockLogout,
    user: null,
  }),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../src/services/pushNotificationService', () => ({
  __esModule: true,
  default: {
    registerForPushNotifications: mockRegisterForPushNotifications,
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: mockAsyncStorage,
  ...mockAsyncStorage,
}));

jest.mock('expo-device', () => ({
  deviceName: 'Test Device',
  modelName: 'Test Model',
  brand: 'Expo',
}));

describe('LoginScreen', () => {
  let alertSpy: jest.SpyInstance;

  const fillCredentials = async (
    utils: ReturnType<typeof render>,
    email = 'parent@example.com',
    password = 'password123'
  ) => {
    const emailInput = utils.getByTestId('login-email-input');
    const passwordInput = utils.getByTestId('login-password-input');

    await act(async () => {
      fireEvent.changeText(emailInput, email);
      fireEvent.changeText(passwordInput, password);
    });

    await waitFor(() => {
      expect(emailInput.props.value).toBe(email);
      expect(passwordInput.props.value).toBe(password);
    });
  };

  const pressLoginButton = async (utils: ReturnType<typeof render>) => {
    await act(async () => {
      fireEvent.press(utils.getByTestId('login-submit-button'));
    });
  };

  beforeAll(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterAll(() => {
    alertSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogin.mockResolvedValue(undefined);
    mockRegisterForPushNotifications.mockResolvedValue({ token: 'mock-push-token' });
    mockAsyncStorage.multiRemove.mockResolvedValue(undefined);
    alertSpy.mockClear();
  });

  it('renders login form inputs and actions', () => {
    const { getByTestId, getByText } = render(<LoginScreen />);

    expect(getByText(/chào mừng/i)).toBeTruthy();
    expect(getByTestId('login-email-input')).toBeTruthy();
    expect(getByTestId('login-password-input')).toBeTruthy();
    expect(getByTestId('login-submit-button')).toBeTruthy();
  });

  it('prevents login when email is missing', async () => {
    const utils = render(<LoginScreen />);

    await act(async () => {
      fireEvent.changeText(utils.getByPlaceholderText(/mật khẩu/i), 'password123');
    });

    await pressLoginButton(utils);

    expect(alertSpy).toHaveBeenLastCalledWith('Lỗi', 'Vui lòng nhập email.');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('prevents login when password is missing', async () => {
    const utils = render(<LoginScreen />);

    await act(async () => {
      fireEvent.changeText(utils.getByPlaceholderText(/email/i), 'parent@example.com');
    });

    await pressLoginButton(utils);

    expect(alertSpy).toHaveBeenLastCalledWith('Lỗi', 'Vui lòng nhập mật khẩu.');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('validates email format before submitting', async () => {
    const utils = render(<LoginScreen />);

    await fillCredentials(utils, 'invalid-email', 'password123');
    await pressLoginButton(utils);

    expect(alertSpy).toHaveBeenLastCalledWith('Lỗi', 'Email không đúng định dạng. Vui lòng kiểm tra lại.');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('logs in successfully when credentials and role match', async () => {
    (authService.login as jest.Mock).mockResolvedValueOnce({
      user: { role: 'PARENT' },
    });

    const utils = render(<LoginScreen />);
    await fillCredentials(utils);
    await pressLoginButton(utils);

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'parent@example.com',
          password: 'password123',
        })
      );
    });

    expect(mockLogin).toHaveBeenCalledWith({
      email: 'parent@example.com',
      password: 'password123',
    });
  });

  it('shows role mismatch alert when selected role differs from actual role', async () => {
    (authService.login as jest.Mock).mockResolvedValueOnce({
      user: { role: 'STAFF' },
    });

    const utils = render(<LoginScreen />);
    await fillCredentials(utils);
    await pressLoginButton(utils);

    expect(alertSpy).toHaveBeenLastCalledWith(
      'Vai trò không khớp',
      expect.stringContaining('"Phụ huynh"'),
      [{ text: 'OK' }]
    );
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockAsyncStorage.multiRemove).toHaveBeenCalled();
  });

  it('allows selecting manager role and logging in', async () => {
    (authService.login as jest.Mock).mockResolvedValueOnce({
      user: { role: 'MANAGER' },
    });

    const utils = render(<LoginScreen />);

    await act(async () => {
      fireEvent.press(utils.getByTestId('role-card-manager'));
    });

    await fillCredentials(utils, 'manager@example.com', 'securePass!');
    await pressLoginButton(utils);

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalled();
    });

    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockLogin).toHaveBeenCalledWith({
      email: 'manager@example.com',
      password: 'securePass!',
    });
  });

  it('navigates to forgot password screen', async () => {
    const utils = render(<LoginScreen />);

    await act(async () => {
      fireEvent.press(utils.getByTestId('login-forgot-password-button'));
    });

    expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword');
  });

  it('toggles password visibility', async () => {
    const utils = render(<LoginScreen />);
    const passwordInput = utils.getByPlaceholderText(/mật khẩu/i);

    expect(passwordInput.props.secureTextEntry).toBe(true);

    await act(async () => {
      fireEvent.press(utils.getByTestId('password-visibility-toggle'));
    });

    expect(passwordInput.props.secureTextEntry).toBe(false);

    await act(async () => {
      fireEvent.press(utils.getByTestId('password-visibility-toggle'));
    });

    expect(passwordInput.props.secureTextEntry).toBe(true);
  });

  it('shows alert when server returns an error', async () => {
    (authService.login as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));

    const utils = render(<LoginScreen />);
    await fillCredentials(utils);
    await pressLoginButton(utils);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenLastCalledWith('Lỗi đăng nhập', 'Network Error');
    });
  });
});
