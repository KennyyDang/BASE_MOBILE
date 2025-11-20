import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Surface,
  useTheme,
} from 'react-native-paper';
import { LoginForm } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

// Inline constants
const COLORS = {
  PRIMARY: '#1976D2',
  PRIMARY_DARK: '#1565C0',
  PRIMARY_LIGHT: '#42A5F5',
  BACKGROUND: '#F5F7FA',
  TEXT_PRIMARY: '#1A1A1A',
  TEXT_SECONDARY: '#6B7280',
};

const SPACING = {
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
};

const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const theme = useTheme();
  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'PARENT' | 'MANAGER'>('PARENT');

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setLoading(true);
    try {
      // Call actual login API
      await login({
        email: formData.email,
        password: formData.password,
      });
      // Navigation will happen automatically via AuthContext
    } catch (error: any) {
      let errorMessage = 'Đăng nhập thất bại. Vui lòng thử lại.';
      
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
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
    // TODO: Navigate to forgot password screen
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
              Brighway After-School Management System
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
                <View style={styles.roleButtons}>
                  <Button
                    mode={selectedRole === 'PARENT' ? 'contained' : 'outlined'}
                    onPress={() => setSelectedRole('PARENT')}
                    style={[styles.roleButton, selectedRole === 'PARENT' && styles.roleButtonActive]}
                    compact
                  >
                    Phụ huynh
                  </Button>
                  <Button
                    mode={selectedRole === 'MANAGER' ? 'contained' : 'outlined'}
                    onPress={() => setSelectedRole('MANAGER')}
                    style={[styles.roleButton, selectedRole === 'MANAGER' && styles.roleButtonActive]}
                    compact
                  >
                    Quản lý
                  </Button>
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
    marginBottom: SPACING.SM,
    color: COLORS.TEXT_PRIMARY,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: SPACING.SM,
    marginBottom: SPACING.SM,
  } as any,
  roleButton: {
    flex: 1,
    borderRadius: 8,
  },
  roleButtonActive: {
    borderColor: COLORS.PRIMARY,
  },
  roleHint: {
    color: COLORS.TEXT_SECONDARY,
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
