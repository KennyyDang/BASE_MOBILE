import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act, RenderAPI } from '@testing-library/react-native';
import ForgotPasswordScreen from '../../src/screens/auth/ForgotPasswordScreen';
import authService from '../../src/services/auth.service';

const mockGoBack = jest.fn();
const mockReset = jest.fn();

jest.mock('../../src/services/auth.service');

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      goBack: mockGoBack,
      reset: mockReset,
    }),
  };
});

describe('ForgotPasswordScreen', () => {
  let alertSpy: jest.SpyInstance;

  const transitionToResetStep = async (utils: RenderAPI) => {
    const sendButton = utils.getByTestId('forgot-send-code-button');

    await act(async () => {
      fireEvent.changeText(utils.getByTestId('forgot-email-input'), 'parent@example.com');
    });

    await act(async () => {
      fireEvent.press(sendButton);
    });

    await waitFor(() => {
      expect(utils.getByTestId('forgot-code-input')).toBeTruthy();
    });

    alertSpy.mockClear();
  };

  beforeAll(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterAll(() => {
    alertSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGoBack.mockReset();
    mockReset.mockReset();
    alertSpy.mockClear();
  });

  it('renders send code UI by default', () => {
    const { getByTestId, getByText } = render(<ForgotPasswordScreen />);

    expect(getByTestId('forgot-email-input')).toBeTruthy();
    expect(getByText(/gửi mã đặt lại/i)).toBeTruthy();
    expect(getByText(/quên mật khẩu/i)).toBeTruthy();
  });

  it('requires email before sending code', () => {
    const { getByTestId } = render(<ForgotPasswordScreen />);

    const sendButton = getByTestId('forgot-send-code-button');

    expect(sendButton.props.accessibilityState?.disabled).toBe(true);
    expect(authService.sendResetCode).not.toHaveBeenCalled();
  });

  it('validates email format', async () => {
    const { getByTestId } = render(<ForgotPasswordScreen />);

    await act(async () => {
      fireEvent.changeText(getByTestId('forgot-email-input'), 'invalid-email');
    });

    const sendButton = getByTestId('forgot-send-code-button');
    expect(sendButton.props.accessibilityState?.disabled).toBe(false);

    await act(async () => {
      fireEvent.press(sendButton);
    });

    expect(alertSpy).toHaveBeenLastCalledWith('Lỗi', 'Vui lòng nhập địa chỉ email hợp lệ');
  });

  it('sends reset code successfully and shows reset form', async () => {
    (authService.sendResetCode as jest.Mock).mockResolvedValueOnce({});

    const utils = render(<ForgotPasswordScreen />);
    const emailInput = utils.getByTestId('forgot-email-input');
    const sendButton = utils.getByTestId('forgot-send-code-button');

    await act(async () => {
      fireEvent.changeText(emailInput, 'parent@example.com');
    });

    await act(async () => {
      fireEvent.press(sendButton);
    });

    await waitFor(() => {
      expect(authService.sendResetCode).toHaveBeenCalledWith('parent@example.com');
      expect(utils.getByTestId('forgot-code-input')).toBeTruthy();
    });

    expect(alertSpy).toHaveBeenLastCalledWith(
      'Thành công',
      expect.stringContaining('Mã đặt lại mật khẩu'),
      [{ text: 'OK' }]
    );

    expect(utils.getByTestId('forgot-new-password-input')).toBeTruthy();
    expect(utils.getByTestId('forgot-confirm-password-input')).toBeTruthy();
  });

  it('keeps reset button disabled when code has fewer than 5 characters', async () => {
    (authService.sendResetCode as jest.Mock).mockResolvedValueOnce({});

    const utils = render(<ForgotPasswordScreen />);
    await transitionToResetStep(utils);

    await act(async () => {
      fireEvent.changeText(utils.getByTestId('forgot-code-input'), 'abc');
    });

    await act(async () => {
      fireEvent.changeText(utils.getByTestId('forgot-new-password-input'), 'password123');
      fireEvent.changeText(utils.getByTestId('forgot-confirm-password-input'), 'password123');
    });

    const submitButton = utils.getByTestId('forgot-submit-button');
    expect(submitButton.props.accessibilityState?.disabled).toBe(true);
    expect(authService.resetPasswordWithCode).not.toHaveBeenCalled();
  });

  it('validates password confirmation', async () => {
    (authService.sendResetCode as jest.Mock).mockResolvedValueOnce({});

    const utils = render(<ForgotPasswordScreen />);
    await transitionToResetStep(utils);

    await act(async () => {
      fireEvent.changeText(utils.getByTestId('forgot-code-input'), 'abcde');
    });

    await act(async () => {
      fireEvent.changeText(utils.getByTestId('forgot-new-password-input'), 'password123');
      fireEvent.changeText(utils.getByTestId('forgot-confirm-password-input'), 'mismatch123');
    });

    const submitButton = utils.getByTestId('forgot-submit-button');
    expect(submitButton.props.accessibilityState?.disabled).toBe(false);

    await act(async () => {
      fireEvent.press(submitButton);
    });

    expect(alertSpy).toHaveBeenLastCalledWith('Lỗi', 'Mật khẩu xác nhận không khớp');
    expect(authService.resetPasswordWithCode).not.toHaveBeenCalled();
  });

  it('resets password successfully and navigates to login', async () => {
    (authService.sendResetCode as jest.Mock).mockResolvedValueOnce({});
    (authService.resetPasswordWithCode as jest.Mock).mockResolvedValueOnce({});

    const utils = render(<ForgotPasswordScreen />);
    await transitionToResetStep(utils);

    await act(async () => {
      fireEvent.changeText(utils.getByTestId('forgot-code-input'), 'abcde');
    });

    await act(async () => {
      fireEvent.changeText(utils.getByTestId('forgot-new-password-input'), 'StrongPass123');
      fireEvent.changeText(utils.getByTestId('forgot-confirm-password-input'), 'StrongPass123');
    });

    const submitButton = utils.getByTestId('forgot-submit-button');
    expect(submitButton.props.accessibilityState?.disabled).toBe(false);

    await act(async () => {
      fireEvent.press(submitButton);
    });

    await waitFor(() => {
      expect(authService.resetPasswordWithCode).toHaveBeenCalledWith(
        'parent@example.com',
        'ABCDE',
        'StrongPass123'
      );
    });

    const successAlert = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
    const actions = successAlert[2];

    expect(successAlert[0]).toBe('Thành công');
    expect(successAlert[1]).toContain('Đặt lại mật khẩu thành công');

    actions?.[0]?.onPress?.();

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  });

  it('navigates back when tapping "Quay lại đăng nhập"', async () => {
    const { getByTestId } = render(<ForgotPasswordScreen />);

    await act(async () => {
      fireEvent.press(getByTestId('forgot-back-login-button'));
    });

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('returns to send code form when pressing "Quay lại gửi mã"', async () => {
    (authService.sendResetCode as jest.Mock).mockResolvedValueOnce({});

    const utils = render(<ForgotPasswordScreen />);
    await transitionToResetStep(utils);

    await act(async () => {
      fireEvent.press(utils.getByTestId('forgot-back-send-code-button'));
    });

    await waitFor(() => {
      expect(utils.queryByTestId('forgot-code-input')).toBeNull();
    });

    expect(utils.getByTestId('forgot-email-input')).toBeTruthy();
  });
});



