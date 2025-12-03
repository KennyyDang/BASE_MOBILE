import React, { useEffect, useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import parentProfileService, { CurrentUserResponse } from '../../services/parentProfileService';
import authService from '../../services/auth.service';
import { COLORS, SPACING, FONTS } from '../../constants';

const StaffProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentUser, setCurrentUser] = useState<CurrentUserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Change Password Modal States
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [passwordStep, setPasswordStep] = useState<'send-code' | 'reset-password'>('send-code');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Edit Profile Modal States
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editAvatarUri, setEditAvatarUri] = useState<string | null>(null);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const fetchCurrentUser = useCallback(async () => {
    setError(null);
    try {
      const response = await parentProfileService.getCurrentUser();
      setCurrentUser(response);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể tải thông tin người dùng.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCurrentUser();
  };

  const handleChangePassword = () => {
    // Tự động điền email từ user context
    const userEmail = currentUser?.email || user?.email || '';
    setEmail(userEmail);
    setPasswordStep('send-code');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setChangePasswordModalVisible(true);
  };

  const handleCloseChangePasswordModal = () => {
    setChangePasswordModalVisible(false);
    setPasswordStep('send-code');
    setEmail('');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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

    setSendingCode(true);
    try {
      await authService.sendResetCode(email.trim());
      setPasswordStep('reset-password');
      Alert.alert(
        'Thành công',
        'Mã đặt lại mật khẩu (5 ký tự) đã được gửi đến email của bạn. Vui lòng nhập mã và mật khẩu mới.',
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể gửi mã đặt lại mật khẩu. Vui lòng thử lại.');
    } finally {
      setSendingCode(false);
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

    if (newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

    setChangingPassword(true);
    try {
      await authService.resetPasswordWithCode(email.trim(), code.trim(), newPassword.trim());
      Alert.alert(
        'Thành công',
        'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại với mật khẩu mới.',
        [
          {
            text: 'OK',
            onPress: () => {
              handleCloseChangePasswordModal();
              // Logout để user đăng nhập lại
              logout();
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại.');
            }
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    setEditName(currentUser?.name || '');
    setEditPhoneNumber(currentUser?.phoneNumber || '');
    setEditAvatarUri(null);
    setEditProfileModalVisible(true);
  };

  const handleCloseEditProfileModal = () => {
    setEditProfileModalVisible(false);
    setEditName('');
    setEditPhoneNumber('');
    setEditAvatarUri(null);
  };

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setEditAvatarUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  const handleSubmitEditProfile = async () => {
    // Validation
    if (!editName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên.');
      return;
    }

    if (!editPhoneNumber.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại.');
      return;
    }

    setUpdatingProfile(true);
    try {
      const updatedUser = await parentProfileService.updateMyProfile(
        editName.trim(),
        editPhoneNumber.trim(),
        editAvatarUri || undefined
      );
      
      setCurrentUser(updatedUser);
      Alert.alert('Thành công', 'Đã cập nhật hồ sơ thành công!');
      handleCloseEditProfileModal();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể cập nhật hồ sơ. Vui lòng thử lại.';
      Alert.alert('Lỗi', message);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const displayName = currentUser?.name || user?.email || 'Nhân viên';
  const displayEmail = currentUser?.email || user?.email || '';
  const displayRole = currentUser?.roleName || user?.role || 'Staff';
  const displayBranch = currentUser?.branchName || 'Chưa có chi nhánh';

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Đang tải hồ sơ...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.PRIMARY}
            colors={[COLORS.PRIMARY]}
          />
        }
      >
        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.avatar}>
            {currentUser?.profilePictureUrl ? (
              <Image
                source={{ uri: currentUser.profilePictureUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <MaterialIcons name="person" size={40} color={COLORS.SURFACE} />
            )}
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.role}>{displayRole}</Text>
            {!!displayEmail && <Text style={styles.email}>{displayEmail}</Text>}
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Thông tin làm việc</Text>

          <View style={styles.infoRow}>
            <MaterialIcons name="badge" size={20} color={COLORS.PRIMARY} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Mã nhân viên</Text>
              <Text style={styles.infoValue}>{currentUser?.id || '-'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="location-city" size={20} color={COLORS.PRIMARY} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Chi nhánh</Text>
              <Text style={styles.infoValue}>{displayBranch}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="phone" size={20} color={COLORS.PRIMARY} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Số điện thoại</Text>
              <Text style={styles.infoValue}>{currentUser?.phoneNumber || 'Chưa cập nhật'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="event" size={20} color={COLORS.PRIMARY} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Ngày tạo tài khoản</Text>
              <Text style={styles.infoValue}>
                {currentUser?.createdAt
                  ? new Date(currentUser.createdAt).toLocaleDateString('vi-VN')
                  : 'Chưa có'}
              </Text>
            </View>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <MaterialIcons name="error-outline" size={20} color={COLORS.ERROR} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        {/* Edit Profile Button */}
        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={handleEditProfile}
          activeOpacity={0.7}
        >
          <MaterialIcons name="edit" size={20} color={COLORS.SURFACE} />
          <Text style={styles.editProfileButtonText}>Chỉnh sửa hồ sơ</Text>
        </TouchableOpacity>

        {/* Change Password Button */}
        <TouchableOpacity
          style={styles.changePasswordButton}
          onPress={handleChangePassword}
          activeOpacity={0.7}
        >
          <MaterialIcons name="lock" size={20} color={COLORS.SURFACE} />
          <Text style={styles.changePasswordButtonText}>Đổi mật khẩu</Text>
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <MaterialIcons name="logout" size={20} color={COLORS.SURFACE} />
          <Text style={styles.logoutButtonText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={changePasswordModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseChangePasswordModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
              <TouchableOpacity
                onPress={handleCloseChangePasswordModal}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {passwordStep === 'send-code' ? (
                <>
                  <View style={styles.infoBox}>
                    <MaterialIcons name="info-outline" size={20} color={COLORS.PRIMARY} />
                    <Text style={styles.infoText}>
                      Nhập email của bạn để nhận mã đặt lại mật khẩu 5 ký tự. Mã sẽ được gửi đến email của bạn.
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Nhập email của bạn"
                      placeholderTextColor={COLORS.TEXT_SECONDARY}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!sendingCode}
                    />
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

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Mã đặt lại (5 ký tự)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Nhập mã 5 ký tự"
                      placeholderTextColor={COLORS.TEXT_SECONDARY}
                      value={code}
                      onChangeText={(text) => {
                        // Chỉ cho phép nhập tối đa 5 ký tự và tự động chuyển sang chữ hoa
                        const trimmed = text.trim().toUpperCase().slice(0, 5);
                        setCode(trimmed);
                      }}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      maxLength={5}
                      editable={!changingPassword}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Mật khẩu mới</Text>
                    <View style={styles.passwordInputWrapper}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Tối thiểu 6 ký tự"
                        placeholderTextColor={COLORS.TEXT_SECONDARY}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showNewPassword}
                        autoCapitalize="none"
                        editable={!changingPassword}
                      />
                      <TouchableOpacity
                        onPress={() => setShowNewPassword(!showNewPassword)}
                        style={styles.eyeButton}
                      >
                        <MaterialIcons
                          name={showNewPassword ? 'visibility' : 'visibility-off'}
                          size={20}
                          color={COLORS.TEXT_SECONDARY}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Xác nhận mật khẩu mới</Text>
                    <View style={styles.passwordInputWrapper}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Nhập lại mật khẩu mới"
                        placeholderTextColor={COLORS.TEXT_SECONDARY}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        editable={!changingPassword}
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={styles.eyeButton}
                      >
                        <MaterialIcons
                          name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                          size={20}
                          color={COLORS.TEXT_SECONDARY}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.backToStepButton}
                    onPress={() => {
                      setPasswordStep('send-code');
                      setCode('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    disabled={changingPassword}
                  >
                    <Text style={styles.backToStepButtonText}>Quay lại gửi mã</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={handleCloseChangePasswordModal}
                disabled={sendingCode || changingPassword}
              >
                <Text style={styles.modalButtonCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={passwordStep === 'send-code' ? handleSendResetCode : handleResetPassword}
                disabled={
                  sendingCode ||
                  changingPassword ||
                  (passwordStep === 'send-code' ? !email.trim() : !code.trim() || !newPassword.trim() || !confirmPassword.trim() || code.trim().length !== 5)
                }
              >
                {sendingCode || changingPassword ? (
                  <ActivityIndicator size="small" color={COLORS.SURFACE} />
                ) : (
                  <Text style={styles.modalButtonSubmitText}>
                    {passwordStep === 'send-code' ? 'Gửi mã' : 'Đặt lại mật khẩu'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={editProfileModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseEditProfileModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa hồ sơ</Text>
              <TouchableOpacity
                onPress={handleCloseEditProfileModal}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Avatar Section */}
              <View style={styles.avatarSection}>
                <TouchableOpacity
                  style={styles.avatarPicker}
                  onPress={handlePickAvatar}
                  activeOpacity={0.7}
                >
                  {editAvatarUri || currentUser?.profilePictureUrl ? (
                    <Image
                      source={{ uri: editAvatarUri || currentUser?.profilePictureUrl || '' }}
                      style={styles.avatarPreview}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <MaterialIcons name="camera-alt" size={32} color={COLORS.TEXT_SECONDARY} />
                    </View>
                  )}
                  <View style={styles.avatarOverlay}>
                    <MaterialIcons name="edit" size={20} color={COLORS.SURFACE} />
                  </View>
                </TouchableOpacity>
                <Text style={styles.avatarHint}>Chạm để chọn ảnh đại diện</Text>
              </View>

              {/* Name Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Tên</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập tên"
                  placeholderTextColor={COLORS.TEXT_SECONDARY}
                  value={editName}
                  onChangeText={setEditName}
                  autoCapitalize="words"
                />
              </View>

              {/* Phone Number Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Số điện thoại</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập số điện thoại"
                  placeholderTextColor={COLORS.TEXT_SECONDARY}
                  value={editPhoneNumber}
                  onChangeText={setEditPhoneNumber}
                  keyboardType="phone-pad"
                />
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={handleCloseEditProfileModal}
                disabled={updatingProfile}
              >
                <Text style={styles.modalButtonCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={handleSubmitEditProfile}
                disabled={updatingProfile}
              >
                {updatingProfile ? (
                  <ActivityIndicator size="small" color={COLORS.SURFACE} />
                ) : (
                  <Text style={styles.modalButtonSubmitText}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  content: {
    padding: SPACING.LG,
    paddingBottom: SPACING.XL,
    gap: SPACING.LG,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.LG,
    borderRadius: 16,
    backgroundColor: COLORS.PRIMARY,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: FONTS.SIZES.XL,
    fontWeight: '700',
    color: COLORS.SURFACE,
    marginBottom: SPACING.XS,
  },
  role: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.SURFACE,
    opacity: 0.9,
    marginBottom: SPACING.XS,
  },
  email: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.SURFACE,
    opacity: 0.9,
  },
  infoCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.LG,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    gap: SPACING.MD,
  },
  sectionTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.MD,
    marginTop: SPACING.XS,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
    padding: SPACING.SM,
    borderRadius: 8,
    backgroundColor: COLORS.ERROR_BG,
    marginTop: SPACING.SM,
  },
  errorText: {
    flex: 1,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.ERROR,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.ACCENT,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    borderRadius: 12,
    gap: SPACING.SM,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: SPACING.MD,
  },
  editProfileButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    borderRadius: 12,
    gap: SPACING.SM,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  changePasswordButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.ERROR,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    borderRadius: 12,
    gap: SPACING.SM,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginTop: SPACING.MD,
  },
  logoutButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.LG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  modalTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  modalCloseButton: {
    padding: SPACING.XS,
  },
  modalBody: {
    padding: SPACING.LG,
    maxHeight: 400,
  },
  inputContainer: {
    marginBottom: SPACING.MD,
  },
  inputLabel: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    backgroundColor: COLORS.BACKGROUND,
  },
  passwordInput: {
    flex: 1,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
  },
  eyeButton: {
    padding: SPACING.MD,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    gap: SPACING.MD,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.MD,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  modalButtonSubmit: {
    backgroundColor: COLORS.PRIMARY,
  },
  modalButtonCancelText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  modalButtonSubmitText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  // Edit Profile Modal Styles
  avatarSection: {
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  avatarPicker: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.SM,
    position: 'relative',
    borderWidth: 2,
    borderColor: COLORS.BORDER,
  },
  avatarPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.SURFACE,
  },
  avatarHint: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    backgroundColor: COLORS.BACKGROUND,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.PRIMARY_50 || '#E3F2FD',
    padding: SPACING.MD,
    borderRadius: 12,
    marginBottom: SPACING.MD,
    gap: SPACING.SM,
  },
  infoText: {
    flex: 1,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 20,
  },
  emailDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY_50 || '#E3F2FD',
    padding: SPACING.MD,
    borderRadius: 12,
    marginBottom: SPACING.MD,
    gap: SPACING.SM,
  },
  emailDisplayText: {
    flex: 1,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  backToStepButton: {
    marginTop: SPACING.SM,
    paddingVertical: SPACING.SM,
    alignItems: 'center',
  },
  backToStepButtonText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
});

export default StaffProfileScreen;


