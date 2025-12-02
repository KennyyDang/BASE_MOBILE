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
  const [selectedRole, setSelectedRole] = useState<'PARENT' | 'STAFF' | 'MANAGER'>('PARENT');

  const getRoleDisplayName = (role: string): string => {
    const roleUpper = role.toUpperCase();
    if (roleUpper.includes('PARENT') || roleUpper === 'USER') return 'Phụ huynh';
    if (roleUpper.includes('STAFF')) return 'Nhân viên';
    if (roleUpper.includes('MANAGER') || roleUpper === 'ADMIN') return 'Quản lý';
    return role;
  };

  const validateRole = (actualRole: string, expectedRole: string): boolean => {
    const actual = actualRole.toUpperCase();
    const expected = expectedRole.toUpperCase();
    
    // Map role names for comparison
    const roleMapping: Record<string, string[]> = {
      'PARENT': ['PARENT', 'USER'],
      'STAFF': ['STAFF'],
      'MANAGER': ['MANAGER', 'ADMIN'],
    };
    
    const expectedRoles = roleMapping[expected] || [expected];
    return expectedRoles.some(role => 
      actual.includes(role) || actual === role
    );
  };

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

      // Call authService.login directly to get user info before setting state
      const loginResponse = await authService.login({
        email: formData.email,
        password: formData.password,
        firebaseToken,
        deviceName,
      });
      
      // Validate role immediately from login response, before setting authenticated state
      const actualRole = (loginResponse.user.role || '').toUpperCase();
      const expectedRole = selectedRole.toUpperCase();
      
      if (!validateRole(actualRole, expectedRole)) {
        // Role doesn't match - clear tokens that were saved by authService.login
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.ACCESS_TOKEN,
          STORAGE_KEYS.REFRESH_TOKEN,
          STORAGE_KEYS.USER,
        ]);
        
        Alert.alert(
          'Vai trò không khớp',
          `Tài khoản này có vai trò "${getRoleDisplayName(actualRole)}" nhưng bạn đã chọn "${getRoleDisplayName(expectedRole)}".\n\nVui lòng chọn lại vai trò đúng và đăng nhập lại.`,
          [{ text: 'OK' }]
        );
        setLoading(false);
        return; // Don't proceed with login - user stays on login screen
      }
      
      // Role matches - proceed with normal login flow via context
      // The tokens are already saved by authService.login, so we just need to set user state
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
              {/* Role Selector */}
              <View style={styles.roleContainer}>
                <Text variant="bodyMedium" style={styles.roleLabel}>
                  Chọn vai trò đăng nhập
                </Text>
                <View style={styles.roleCardsContainer}>
                  {/* Phụ huynh */}
                  <TouchableOpacity
                    style={[
                      styles.roleCard,
                      selectedRole === 'PARENT' && styles.roleCardActive,
                    ]}
                    onPress={() => setSelectedRole('PARENT')}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.roleIconContainer,
                        selectedRole === 'PARENT' && styles.roleIconContainerActive,
                      ]}
                    >
                      <MaterialIcons
                        name="family-restroom"
                        size={28}
                        color={selectedRole === 'PARENT' ? COLORS.SURFACE : COLORS.PRIMARY}
                      />
                    </View>
                    <Text
                      style={[
                        styles.roleCardTitle,
                        selectedRole === 'PARENT' && styles.roleCardTitleActive,
                      ]}
                    >
                      Phụ huynh
                    </Text>
                    <Text style={styles.roleCardDescription}>
                      Quản lý con và lịch học
                    </Text>
                    {selectedRole === 'PARENT' && (
                      <View style={styles.roleCheckmark}>
                        <MaterialIcons name="check-circle" size={20} color={COLORS.SURFACE} />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Nhân viên */}
                  <TouchableOpacity
                    style={[
                      styles.roleCard,
                      selectedRole === 'STAFF' && styles.roleCardActive,
                    ]}
                    onPress={() => setSelectedRole('STAFF')}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.roleIconContainer,
                        selectedRole === 'STAFF' && styles.roleIconContainerActive,
                      ]}
                    >
                      <MaterialIcons
                        name="work"
                        size={28}
                        color={selectedRole === 'STAFF' ? COLORS.SURFACE : COLORS.PRIMARY}
                      />
                    </View>
                    <Text
                      style={[
                        styles.roleCardTitle,
                        selectedRole === 'STAFF' && styles.roleCardTitleActive,
                      ]}
                    >
                      Nhân viên
                    </Text>
                    <Text style={styles.roleCardDescription}>
                      Xem lịch và điểm danh
                    </Text>
                    {selectedRole === 'STAFF' && (
                      <View style={styles.roleCheckmark}>
                        <MaterialIcons name="check-circle" size={20} color={COLORS.SURFACE} />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Quản lý */}
                  <TouchableOpacity
                    style={[
                      styles.roleCard,
                      selectedRole === 'MANAGER' && styles.roleCardActive,
                    ]}
                    onPress={() => setSelectedRole('MANAGER')}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.roleIconContainer,
                        selectedRole === 'MANAGER' && styles.roleIconContainerActive,
                      ]}
                    >
                      <MaterialIcons
                        name="admin-panel-settings"
                        size={28}
                        color={selectedRole === 'MANAGER' ? COLORS.SURFACE : COLORS.PRIMARY}
                      />
                    </View>
                    <Text
                      style={[
                        styles.roleCardTitle,
                        selectedRole === 'MANAGER' && styles.roleCardTitleActive,
                      ]}
                    >
                      Quản lý
                    </Text>
                    <Text style={styles.roleCardDescription}>
                      Quản lý hệ thống
                    </Text>
                    {selectedRole === 'MANAGER' && (
                      <View style={styles.roleCheckmark}>
                        <MaterialIcons name="check-circle" size={20} color={COLORS.SURFACE} />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
                <Text variant="labelSmall" style={styles.roleHint}>
                  Lưu ý: Quyền truy cập sẽ dựa trên role thật trong tài khoản của bạn.
                </Text>
              </View>

              <TextInput
                label="Email"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                left={<TextInput.Icon icon="email" />}
              />

              <TextInput
                label="Mật khẩu"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                mode="outlined"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={styles.input}
                left={<TextInput.Icon icon="lock" />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
              />

              <Button
                mode="text"
                onPress={handleForgotPassword}
                style={styles.forgotPasswordButton}
                textColor={theme.colors.primary}
              >
                Quên mật khẩu?
              </Button>

              <Button
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
  roleContainer: {
    marginBottom: SPACING.LG,
  },
  roleLabel: {
    marginBottom: SPACING.MD,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
    textAlign: 'center',
  },
  roleCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.SM,
    marginBottom: SPACING.SM,
    justifyContent: 'space-between',
  },
  roleCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    alignItems: 'center',
    position: 'relative',
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  roleCardActive: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY,
    shadowColor: COLORS.PRIMARY,
    shadowOpacity: 0.3,
    elevation: 4,
  },
  roleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.PRIMARY + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  roleIconContainerActive: {
    backgroundColor: COLORS.SURFACE + '40',
  },
  roleCardTitle: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
    textAlign: 'center',
  },
  roleCardTitleActive: {
    color: COLORS.SURFACE,
  },
  roleCardDescription: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 16,
  },
  roleCheckmark: {
    position: 'absolute',
    top: SPACING.XS,
    right: SPACING.XS,
  },
  roleHint: {
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.SM,
    fontSize: 11,
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
