import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  useTheme,
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import authService from '../../services/auth.service';
import { COLORS } from '../../constants';

const SPACING = {
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
};

type ForgotPasswordNavigationProp = StackNavigationProp<RootStackParamList, 'ForgotPassword'>;

type Step = 'send-code' | 'reset-password';

const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ForgotPasswordNavigationProp>();
  const theme = useTheme();
  const [step, setStep] = useState<Step>('send-code');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const handleSendResetCode = async () => {
    if (!email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email của bạn');
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ email hợp lệ');
      return;
    }

    setLoading(true);
    try {
      await authService.sendResetCode(email.trim());
      setStep('reset-password');
      Alert.alert(
        'Thành công',
        'Mã đặt lại mật khẩu (5 ký tự) đã được gửi đến email của bạn. Vui lòng nhập mã và mật khẩu mới.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể gửi mã đặt lại mật khẩu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã đặt lại mật khẩu');
      return;
    }

    if (code.trim().length !== 5) {
      Alert.alert('Lỗi', 'Mã đặt lại mật khẩu phải có 5 ký tự');
      return;
    }

    if (!newPassword.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu mới');
      return;
    }

    if (!validatePassword(newPassword.trim())) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPasswordWithCode(email.trim(), code.trim(), newPassword.trim());
      Alert.alert(
        'Thành công',
        'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại với mật khẩu mới.',
        [
          {
            text: 'Đăng nhập',
            onPress: () => {
              // Reset về màn hình Login
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header với nút quay lại */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleBackToLogin}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color={COLORS.PRIMARY} />
            </TouchableOpacity>
          </View>

          {/* Icon và Title */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <MaterialIcons 
                name={step === 'send-code' ? 'email' : 'vpn-key'} 
                size={48} 
                color={COLORS.PRIMARY} 
              />
            </View>
            <Text variant="headlineMedium" style={styles.title}>
              {step === 'send-code' ? 'Quên mật khẩu?' : 'Đặt lại mật khẩu'}
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {step === 'send-code'
                ? 'Nhập email của bạn để nhận mã đặt lại mật khẩu 5 ký tự'
                : `Mã đã được gửi đến ${email}\nVui lòng nhập mã và mật khẩu mới`}
            </Text>
          </View>

          {/* Form Card */}
          <Card style={styles.card} elevation={4}>
            <Card.Content style={styles.cardContent}>
              {step === 'send-code' ? (
                <>
                  <TextInput
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    mode="outlined"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                    left={<TextInput.Icon icon="email" />}
                    editable={!loading}
                  />

                  <Button
                    mode="contained"
                    onPress={handleSendResetCode}
                    loading={loading}
                    disabled={loading || !email.trim()}
                    style={styles.sendButton}
                    contentStyle={styles.sendButtonContent}
                  >
                    {loading ? 'Đang gửi...' : 'Gửi mã đặt lại'}
                  </Button>

                  <View style={styles.infoBox}>
                    <MaterialIcons name="info-outline" size={20} color={COLORS.PRIMARY} />
                    <Text style={styles.infoText}>
                      Mã đặt lại mật khẩu 5 ký tự sẽ được gửi đến email của bạn. Vui lòng kiểm tra cả hộp thư spam.
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.emailDisplayBox}>
                    <MaterialIcons name="email" size={20} color={COLORS.PRIMARY} />
                    <Text style={styles.emailDisplayText}>{email}</Text>
                  </View>

                  <View style={styles.infoBox}>
                    <MaterialIcons name="info-outline" size={20} color={COLORS.PRIMARY} />
                    <Text style={styles.infoText}>
                      Vui lòng nhập mã 5 ký tự đã được gửi đến email của bạn và mật khẩu mới.
                    </Text>
                  </View>

                  <TextInput
                    label="Mã đặt lại (5 ký tự)"
                    value={code}
                    onChangeText={(text) => {
                      // Chỉ cho phép nhập tối đa 5 ký tự
                      const trimmed = text.trim().toUpperCase().slice(0, 5);
                      setCode(trimmed);
                    }}
                    mode="outlined"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={5}
                    style={styles.input}
                    left={<TextInput.Icon icon="vpn-key" />}
                    editable={!loading}
                    placeholder="Nhập mã 5 ký tự"
                  />

                  <TextInput
                    label="Mật khẩu mới"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    mode="outlined"
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    style={styles.input}
                    left={<TextInput.Icon icon="lock" />}
                    right={
                      <TextInput.Icon
                        icon={showNewPassword ? 'eye-off' : 'eye'}
                        onPress={() => setShowNewPassword(!showNewPassword)}
                      />
                    }
                    editable={!loading}
                    placeholder="Tối thiểu 6 ký tự"
                  />

                  <TextInput
                    label="Xác nhận mật khẩu mới"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    mode="outlined"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    style={styles.input}
                    left={<TextInput.Icon icon="lock-check" />}
                    right={
                      <TextInput.Icon
                        icon={showConfirmPassword ? 'eye-off' : 'eye'}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      />
                    }
                    editable={!loading}
                    placeholder="Nhập lại mật khẩu mới"
                  />

                  <Button
                    mode="contained"
                    onPress={handleResetPassword}
                    loading={loading}
                    disabled={
                      loading ||
                      !code.trim() ||
                      !newPassword.trim() ||
                      !confirmPassword.trim() ||
                      code.trim().length !== 5
                    }
                    style={styles.resetButton}
                    contentStyle={styles.resetButtonContent}
                  >
                    {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                  </Button>

                  <Button
                    mode="text"
                    onPress={() => {
                      setStep('send-code');
                      setCode('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    style={styles.backToSendCodeButton}
                    textColor={COLORS.PRIMARY}
                  >
                    Quay lại gửi mã
                  </Button>
                </>
              )}

              <Button
                mode="text"
                onPress={handleBackToLogin}
                style={styles.backToLoginButton}
                textColor={COLORS.PRIMARY}
              >
                Quay lại đăng nhập
              </Button>
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.XL,
  },
  header: {
    marginBottom: SPACING.LG,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.SURFACE,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: SPACING.XXL,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.PRIMARY_50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  title: {
    color: COLORS.TEXT_PRIMARY,
    fontWeight: 'bold',
    marginBottom: SPACING.SM,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    paddingHorizontal: SPACING.MD,
    lineHeight: 22,
  },
  card: {
    marginHorizontal: SPACING.SM,
    borderRadius: 16,
  },
  cardContent: {
    padding: SPACING.LG,
  },
  input: {
    marginBottom: SPACING.LG,
  },
  sendButton: {
    marginBottom: SPACING.MD,
    borderRadius: 8,
  },
  sendButtonContent: {
    paddingVertical: SPACING.SM,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.PRIMARY_50,
    padding: SPACING.MD,
    borderRadius: 12,
    marginBottom: SPACING.MD,
  },
  infoText: {
    flex: 1,
    marginLeft: SPACING.SM,
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 20,
  },
  emailDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY_50,
    padding: SPACING.MD,
    borderRadius: 12,
    marginBottom: SPACING.LG,
  },
  emailDisplayText: {
    flex: 1,
    marginLeft: SPACING.SM,
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  resetButton: {
    marginTop: SPACING.MD,
    marginBottom: SPACING.MD,
    borderRadius: 8,
  },
  resetButtonContent: {
    paddingVertical: SPACING.SM,
  },
  backToSendCodeButton: {
    marginTop: SPACING.SM,
  },
  backToLoginButton: {
    marginTop: SPACING.MD,
  },
});

export default ForgotPasswordScreen;

