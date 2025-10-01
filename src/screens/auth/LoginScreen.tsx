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
import { COLORS, FONTS, SPACING } from '../../constants';
import { LoginForm, Parent } from '../../types';
import { useAuth } from '../../context/AuthContext';

const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const theme = useTheme();
  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement actual login logic
      console.log('Login attempt:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock user data for development
      const mockUser: Parent = {
        id: '1',
        email: formData.email,
        firstName: 'Nguyễn',
        lastName: 'Văn A',
        phone: '0123456789',
        role: 'PARENT',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        children: [
          {
            id: '1',
            parentId: '1',
            firstName: 'Nguyễn',
            lastName: 'Thị B',
            dateOfBirth: '2015-03-15',
            grade: '3',
            school: 'Trường Tiểu học ABC',
            emergencyContact: '0123456789',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            nfcCardId: 'NFC001',
          },
          {
            id: '2',
            parentId: '1',
            firstName: 'Nguyễn',
            lastName: 'Văn C',
            dateOfBirth: '2018-07-20',
            grade: '1',
            school: 'Trường Tiểu học XYZ',
            emergencyContact: '0123456789',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        wallets: [],
      };
      
      // Login successful - navigate to main app
      login(mockUser);
    } catch (error) {
      Alert.alert('Lỗi', 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    // TODO: Navigate to register screen
    console.log('Navigate to register');
  };

  const handleForgotPassword = () => {
    // TODO: Navigate to forgot password screen
    console.log('Navigate to forgot password');
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

              <View style={styles.registerContainer}>
                <Text variant="bodyMedium" style={styles.registerText}>
                  Chưa có tài khoản?{' '}
                </Text>
                <Button
                  mode="text"
                  onPress={handleRegister}
                  textColor={theme.colors.primary}
                  compact
                >
                  Đăng ký ngay
                </Button>
              </View>
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
