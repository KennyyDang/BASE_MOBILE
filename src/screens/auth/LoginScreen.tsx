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
  Surface,
  useTheme,
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { LoginForm } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS } from '../../constants';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import authService from '../../services/auth.service';
import pushNotificationService from '../../services/pushNotificationService';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../config/axios.config';

const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
};

const FONTS = {
  SIZES: {
    XS: 10,
    SM: 12,
    MD: 14,
    LG: 16,
    XL: 18,
    XXL: 24,
  },
};

const LoginScreen: React.FC = () => {
  const { login, logout, user } = useAuth();
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);


  const handleLogin = async () => {
    // Validate input trước khi gửi
    if (!formData.email || !formData.email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email.');
      return;
    }
    
    if (!formData.password || !formData.password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu.');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      Alert.alert('Lỗi', 'Email không đúng định dạng. Vui lòng kiểm tra lại.');
      return;
    }

    setLoading(true);
    try {
      // Prepare login payload (same as AuthContext does)
      let pushToken = null;
      let firebaseToken: string | undefined;
      try {
        pushToken = await pushNotificationService.registerForPushNotifications();
        firebaseToken = pushToken?.token;
      } catch {
        // Ignore push token errors
      }

      let deviceName: string = Platform.OS;
      try {
        if (Device.deviceName) {
          deviceName = Device.deviceName;
        } else if (Device.modelName) {
          deviceName = Device.modelName;
        } else if (Device.brand && Device.modelName) {
          deviceName = `${Device.brand} ${Device.modelName}`;
        } else if (Device.brand) {
          deviceName = Device.brand;
        }
      } catch {
        deviceName = Platform.OS;
      }

      // Proceed with normal login flow via context
      await login({
        email: formData.email,
        password: formData.password,
      });
      
      // Navigation will happen automatically via AuthContext
    } catch (error: any) {
      // If error occurred, make sure to clear any tokens that might have been saved
      try {
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.ACCESS_TOKEN,
          STORAGE_KEYS.REFRESH_TOKEN,
          STORAGE_KEYS.USER,
        ]);
      } catch {
        // Ignore cleanup errors
      }
      
      let errorMessage = 'Đăng nhập thất bại. Vui lòng thử lại.';
      
      // Xử lý lỗi validation từ server (ASP.NET Core format)
      if (error?.response?.data) {
        const errorData = error.response.data;
        const status = error.response.status;
        
        // Log để debug (chỉ trong dev mode)
        if (__DEV__) {
          console.log('[Login Error] Status:', status);
          console.log('[Login Error] Data:', JSON.stringify(errorData, null, 2));
        }
        
        // Xử lý validation errors (400 Bad Request) - Format từ ASP.NET Core
        if (status === 400) {
          // ASP.NET Core trả về format: { title: "...", errors: { "Field": ["error1", "error2"] } }
          if (errorData.errors && typeof errorData.errors === 'object' && !Array.isArray(errorData.errors)) {
            // Parse validation errors từ object { "Email": ["error"], "Password": ["error"] }
            const validationMessages: string[] = [];
            
            Object.entries(errorData.errors).forEach(([field, errors]: [string, any]) => {
              if (Array.isArray(errors)) {
                errors.forEach((err: string) => {
                  // Translate field names
                  let fieldName = field;
                  if (field.toLowerCase() === 'email') fieldName = 'Email';
                  else if (field.toLowerCase() === 'password') fieldName = 'Mật khẩu';
                  
                  // Translate common error messages
                  let errMsg = err;
                  if (err.toLowerCase().includes('required')) errMsg = 'là bắt buộc';
                  else if (err.toLowerCase().includes('invalid')) errMsg = 'không hợp lệ';
                  else if (err.toLowerCase().includes('format')) errMsg = 'không đúng định dạng';
                  
                  validationMessages.push(`${fieldName}: ${errMsg}`);
                });
              } else if (typeof errors === 'string') {
                let fieldName = field;
                if (field.toLowerCase() === 'email') fieldName = 'Email';
                else if (field.toLowerCase() === 'password') fieldName = 'Mật khẩu';
                validationMessages.push(`${fieldName}: ${errors}`);
              }
            });
            
            if (validationMessages.length > 0) {
              errorMessage = validationMessages.join('\n');
            } else if (errorData.title && !errorData.title.includes('One or more validation errors occurred')) {
              errorMessage = errorData.title;
            } else if (errorData.message) {
              errorMessage = errorData.message;
            } else {
              errorMessage = 'Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại email và mật khẩu.';
            }
          } 
          // Xử lý lỗi dạng array
          else if (Array.isArray(errorData.errors)) {
            const validationErrors = errorData.errors
              .map((err: any) => {
                if (typeof err === 'string') return err;
                if (err.message) return err.message;
                if (typeof err === 'object') {
                  return Object.values(err).join(', ');
                }
                return JSON.stringify(err);
              })
              .filter((msg: string) => msg && msg.trim() !== '')
              .join('\n');
            
            if (validationErrors) {
              errorMessage = validationErrors;
            } else if (errorData.title && !errorData.title.includes('One or more validation errors occurred')) {
              errorMessage = errorData.title;
            } else if (errorData.message) {
              errorMessage = errorData.message;
            } else {
              errorMessage = 'Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại email và mật khẩu.';
            }
          }
          // Fallback cho các trường hợp khác
          else if (errorData.title && !errorData.title.includes('One or more validation errors occurred')) {
            errorMessage = errorData.title;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else {
            errorMessage = 'Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại email và mật khẩu.';
          }
        } 
        // Xử lý lỗi 401 Unauthorized
        else if (status === 401) {
          errorMessage = 'Email hoặc mật khẩu không đúng.';
        } 
        // Xử lý các lỗi khác
        else {
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.title) {
            errorMessage = errorData.title;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        }
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      Alert.alert('Lỗi đăng nhập', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    // TODO: Navigate to register screen
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text variant="displaySmall" style={styles.title}>
              BASE
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Brightway After-School Management System
            </Text>
            <Text variant="headlineSmall" style={styles.welcomeText}>
              Chào mừng bạn quay trở lại!
            </Text>
          </View>

          {/* Login Form */}
          <Card style={styles.card} elevation={4}>
            <Card.Content style={styles.cardContent}>
              <TextInput
                testID="login-email-input"
                label="Email"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Email"
                style={styles.input}
                left={<TextInput.Icon icon="email" />}
              />

              <TextInput
                testID="login-password-input"
                label="Mật khẩu"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                mode="outlined"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholder="Mật khẩu"
                style={styles.input}
                left={<TextInput.Icon icon="lock" />}
                right={
                  <TextInput.Icon
                    testID="password-visibility-toggle"
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
              />

              <Button
                testID="login-forgot-password-button"
                mode="text"
                onPress={handleForgotPassword}
                style={styles.forgotPasswordButton}
                textColor={theme.colors.primary}
              >
                Quên mật khẩu?
              </Button>

              <Button
                testID="login-submit-button"
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={styles.loginButton}
                contentStyle={styles.loginButtonContent}
              >
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
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
    justifyContent: 'center',
    paddingVertical: SPACING.XL,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.XXL,
  },
  title: {
    color: COLORS.PRIMARY,
    marginBottom: SPACING.SM,
    fontWeight: 'bold',
  },
  subtitle: {
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.MD,
  },
  welcomeText: {
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  card: {
    marginHorizontal: SPACING.SM,
    borderRadius: 16,
  },
  cardContent: {
    padding: SPACING.LG,
  },
  input: {
    marginBottom: SPACING.MD,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.LG,
  },
  loginButton: {
    marginBottom: SPACING.LG,
    borderRadius: 8,
  },
  loginButtonContent: {
    paddingVertical: SPACING.SM,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  registerText: {
    color: COLORS.TEXT_SECONDARY,
  },
});

export default LoginScreen;

