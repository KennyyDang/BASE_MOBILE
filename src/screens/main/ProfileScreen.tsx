import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  SafeAreaView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Image,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../contexts/AuthContext';
import { RootStackParamList } from '../../types';
import parentProfileService, { CurrentUserResponse, FamilyProfileResponse } from '../../services/parentProfileService';
import { COLORS } from '../../constants';

const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
};

const FONTS = {
  SIZES: {
    XS: 12,
    SM: 14,
    MD: 16,
    LG: 18,
    XL: 20,
    XXL: 24,
  },
};

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { user, logout } = useAuth();
  const [currentUser, setCurrentUser] = useState<CurrentUserResponse | null>(null);
  const [familyProfiles, setFamilyProfiles] = useState<FamilyProfileResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [updating, setUpdating] = useState(false);
  const [loadingFamilyProfiles, setLoadingFamilyProfiles] = useState(false);
  
  // Add Family Profile Modal States
  const [addFamilyModalVisible, setAddFamilyModalVisible] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newFamilyPhone, setNewFamilyPhone] = useState('');
  const [newFamilyRela, setNewFamilyRela] = useState<string>('');
  const [newFamilyAvatarUri, setNewFamilyAvatarUri] = useState<string | null>(null);
  const [creatingFamilyProfile, setCreatingFamilyProfile] = useState(false);
  
  // Edit Family Profile Modal States
  const [editFamilyModalVisible, setEditFamilyModalVisible] = useState(false);
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null);
  const [editFamilyName, setEditFamilyName] = useState('');
  const [editFamilyPhone, setEditFamilyPhone] = useState('');
  const [editFamilyRela, setEditFamilyRela] = useState<string>('');
  const [editFamilyAvatarUri, setEditFamilyAvatarUri] = useState<string | null>(null);
  const [editFamilyAvatarUrl, setEditFamilyAvatarUrl] = useState<string | null>(null);
  const [updatingFamilyProfile, setUpdatingFamilyProfile] = useState(false);
  const [deletingFamilyId, setDeletingFamilyId] = useState<string | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    try {
      setError(null);
      const userData = await parentProfileService.getCurrentUser();
      setCurrentUser(userData);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Không thể tải thông tin người dùng';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchFamilyProfiles = useCallback(async () => {
    try {
      setLoadingFamilyProfiles(true);
      const profiles = await parentProfileService.getFamilyProfiles();
      setFamilyProfiles(profiles);
    } catch (err: any) {
      // Don't show error for family profiles, just log it
      console.warn('Failed to fetch family profiles:', err?.message || err);
      setFamilyProfiles([]);
    } finally {
      setLoadingFamilyProfiles(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
    fetchFamilyProfiles();
  }, [fetchCurrentUser, fetchFamilyProfiles]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCurrentUser();
    fetchFamilyProfiles();
  }, [fetchCurrentUser, fetchFamilyProfiles]);

  const handleEditProfile = () => {
    if (currentUser) {
      setEditName(currentUser.name || '');
      setEditPhoneNumber(currentUser.phoneNumber || '');
      setEditing(true);
    }
  };

  const handleCloseEdit = () => {
    setEditing(false);
    setEditName('');
    setEditPhoneNumber('');
    setError(null);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên');
      return;
    }

    if (!editPhoneNumber.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
      return;
    }

    // Validate phone number format (basic check)
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(editPhoneNumber.trim())) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ. Vui lòng nhập 10-11 chữ số');
      return;
    }

    try {
      setUpdating(true);
      setError(null);
      const updatedUser = await parentProfileService.updateMyProfile(
        editName.trim(),
        editPhoneNumber.trim()
      );
      setCurrentUser(updatedUser);
      setEditing(false);
      Alert.alert('Thành công', 'Đã cập nhật thông tin profile thành công!');
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Không thể cập nhật profile';
      setError(errorMessage);
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const handlePickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập',
          'Cần quyền truy cập thư viện ảnh để upload ảnh profile.'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        await handleUploadImage(asset.uri, asset.mimeType || 'image/jpeg');
      }
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  const handleUploadImage = async (uri: string, mimeType: string) => {
    try {
      setUploading(true);
      setError(null);

      const updatedUser = await parentProfileService.uploadProfilePicture(uri, undefined, mimeType);
      
      // Update local state with new profile picture URL
      setCurrentUser(updatedUser);
      
      Alert.alert('Thành công', 'Đã cập nhật ảnh profile thành công!');
    } catch (err: any) {
      const errorMessage = err?.message || 'Không thể upload ảnh profile';
      
      // Check if it's an adult/racy content error
      if (errorMessage.includes('Adult content') || errorMessage.includes('Racy content') || errorMessage.includes('không phù hợp')) {
        Alert.alert(
          'Ảnh không phù hợp',
          errorMessage,
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        Alert.alert('Lỗi', errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleNotifications = () => {
    navigation.navigate('Notifications');
  };

  const handleMySubscriptions = () => {
    navigation.navigate('MySubscriptions');
  };

  const handleOrderHistory = () => {
    navigation.navigate('OrderHistory');
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Student Relationship Options
  const STUDENT_RELATIONSHIPS = [
    'Bố',
    'Mẹ',
    'Anh',
    'Chị',
    'Cô',
    'Dì',
    'Chú',
    'Bác',
    'Ông',
    'Bà',
    'Người giám hộ',
    'Khác',
  ];

  const handleOpenAddFamilyModal = () => {
    setNewFamilyName('');
    setNewFamilyPhone('');
    setNewFamilyRela('');
    setNewFamilyAvatarUri(null);
    setError(null);
    setAddFamilyModalVisible(true);
  };

  const handleCloseAddFamilyModal = () => {
    setAddFamilyModalVisible(false);
    setNewFamilyName('');
    setNewFamilyPhone('');
    setNewFamilyRela('');
    setNewFamilyAvatarUri(null);
    setError(null);
  };

  const handlePickFamilyAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập',
          'Cần quyền truy cập thư viện ảnh để chọn ảnh đại diện.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setNewFamilyAvatarUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  const handleRemoveFamilyAvatar = () => {
    setNewFamilyAvatarUri(null);
  };

  const handleSelectRelationship = () => {
    Alert.alert(
      'Chọn mối quan hệ',
      'Vui lòng chọn mối quan hệ với học sinh',
      [
        ...STUDENT_RELATIONSHIPS.map((rela) => ({
          text: rela,
          onPress: () => setNewFamilyRela(rela),
        })),
        {
          text: 'Hủy',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const handleCreateFamilyProfile = async () => {
    // Validation
    if (!newFamilyName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên thành viên');
      return;
    }

    if (!newFamilyPhone.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
      return;
    }

    // Validate phone number format
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(newFamilyPhone.trim())) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ. Vui lòng nhập 10-11 chữ số');
      return;
    }

    if (!newFamilyRela.trim()) {
      Alert.alert('Lỗi', 'Vui lòng chọn mối quan hệ với học sinh');
      return;
    }

    try {
      setCreatingFamilyProfile(true);
      setError(null);

      await parentProfileService.createFamilyProfile(
        newFamilyName.trim(),
        newFamilyPhone.trim(),
        newFamilyRela.trim(),
        newFamilyAvatarUri || undefined
      );

      Alert.alert('Thành công', 'Đã thêm thành viên gia đình thành công!');
      handleCloseAddFamilyModal();
      fetchFamilyProfiles(); // Refresh list
    } catch (err: any) {
      const errorMessage = err?.message || 'Không thể tạo family profile. Vui lòng thử lại.';
      setError(errorMessage);
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setCreatingFamilyProfile(false);
    }
  };

  const handleOpenEditFamilyModal = async (profileId: string) => {
    try {
      setError(null);
      const profile = await parentProfileService.getFamilyProfileById(profileId);
      
      setEditingFamilyId(profileId);
      setEditFamilyName(profile.name);
      setEditFamilyPhone(profile.phone);
      setEditFamilyRela(profile.studentRela || '');
      setEditFamilyAvatarUri(null);
      setEditFamilyAvatarUrl(profile.avatar || null);
      setEditFamilyModalVisible(true);
    } catch (err: any) {
      const errorMessage = err?.message || 'Không thể tải thông tin thành viên. Vui lòng thử lại.';
      Alert.alert('Lỗi', errorMessage);
    }
  };

  const handleCloseEditFamilyModal = () => {
    setEditFamilyModalVisible(false);
    setEditingFamilyId(null);
    setEditFamilyName('');
    setEditFamilyPhone('');
    setEditFamilyRela('');
    setEditFamilyAvatarUri(null);
    setEditFamilyAvatarUrl(null);
    setError(null);
  };

  const handlePickEditFamilyAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập',
          'Cần quyền truy cập thư viện ảnh để chọn ảnh đại diện.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setEditFamilyAvatarUri(result.assets[0].uri);
        setEditFamilyAvatarUrl(null); // Clear old URL when new image is selected
      }
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  const handleRemoveEditFamilyAvatar = () => {
    setEditFamilyAvatarUri(null);
    setEditFamilyAvatarUrl(null);
  };

  const handleSelectEditRelationship = () => {
    Alert.alert(
      'Chọn mối quan hệ',
      'Vui lòng chọn mối quan hệ với học sinh',
      [
        ...STUDENT_RELATIONSHIPS.map((rela) => ({
          text: rela,
          onPress: () => setEditFamilyRela(rela),
        })),
        {
          text: 'Hủy',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const handleUpdateFamilyProfile = async () => {
    if (!editingFamilyId) return;

    // Validation
    if (!editFamilyName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên thành viên');
      return;
    }

    if (!editFamilyPhone.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
      return;
    }

    // Validate phone number format
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(editFamilyPhone.trim())) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ. Vui lòng nhập 10-11 chữ số');
      return;
    }

    if (!editFamilyRela.trim()) {
      Alert.alert('Lỗi', 'Vui lòng chọn mối quan hệ với học sinh');
      return;
    }

    try {
      setUpdatingFamilyProfile(true);
      setError(null);

      await parentProfileService.updateFamilyProfile(
        editingFamilyId,
        editFamilyName.trim(),
        editFamilyPhone.trim(),
        editFamilyRela.trim(),
        editFamilyAvatarUri || undefined
      );

      Alert.alert('Thành công', 'Đã cập nhật thành viên gia đình thành công!');
      handleCloseEditFamilyModal();
      fetchFamilyProfiles(); // Refresh list
    } catch (err: any) {
      const errorMessage = err?.message || 'Không thể cập nhật family profile. Vui lòng thử lại.';
      setError(errorMessage);
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setUpdatingFamilyProfile(false);
    }
  };

  const handleDeleteFamilyProfile = (profileId: string, profileName: string) => {
    Alert.alert(
      'Xóa thành viên',
      `Bạn có chắc chắn muốn xóa thành viên "${profileName}"?`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingFamilyId(profileId);
              await parentProfileService.deleteFamilyProfile(profileId);
              Alert.alert('Thành công', 'Đã xóa thành viên gia đình thành công!');
              fetchFamilyProfiles(); // Refresh list
            } catch (err: any) {
              const errorMessage = err?.message || 'Không thể xóa family profile. Vui lòng thử lại.';
              Alert.alert('Lỗi', errorMessage);
            } finally {
              setDeletingFamilyId(null);
            }
          },
        },
      ]
    );
  };

  if (loading && !currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={48} color={COLORS.ERROR} />
          <Text style={styles.errorText}>Không tìm thấy thông tin người dùng</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* User Info Card */}
        <View style={styles.userCard}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handlePickImage}
            disabled={uploading}
            activeOpacity={0.7}
          >
            {uploading ? (
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            ) : currentUser?.profilePictureUrl ? (
              <Image
                source={{ uri: currentUser.profilePictureUrl }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <MaterialIcons name="person" size={60} color={COLORS.PRIMARY} />
            )}
            <View style={styles.avatarEditOverlay}>
              <MaterialIcons name="camera-alt" size={24} color={COLORS.SURFACE} />
            </View>
          </TouchableOpacity>
          
          <Text style={styles.userName}>
            {currentUser?.name || user.email}
          </Text>
          
          <View style={styles.userBadge}>
            <MaterialIcons name="badge" size={16} color={COLORS.PRIMARY} />
            <Text style={styles.userRole}>
              {currentUser?.roleName || user.role}
            </Text>
          </View>

          {currentUser?.branchName && (
            <View style={styles.userInfoRow}>
              <MaterialIcons name="location-on" size={16} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.userInfoText}>{currentUser.branchName}</Text>
            </View>
          )}
        </View>

        {/* User Details Section */}
        {currentUser && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin chi tiết</Text>
            
            {error && (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error" size={20} color={COLORS.ERROR} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <MaterialIcons name="email" size={20} color={COLORS.PRIMARY} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{currentUser.email}</Text>
                </View>
              </View>

              {currentUser.phoneNumber && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="phone" size={20} color={COLORS.PRIMARY} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Số điện thoại</Text>
                    <Text style={styles.detailValue}>{currentUser.phoneNumber}</Text>
                  </View>
                </View>
              )}

              {currentUser.branchName && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="business" size={20} color={COLORS.PRIMARY} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Chi nhánh</Text>
                    <Text style={styles.detailValue}>{currentUser.branchName}</Text>
                  </View>
                </View>
              )}

              <View style={styles.detailRow}>
                <MaterialIcons name="calendar-today" size={20} color={COLORS.PRIMARY} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Ngày tạo tài khoản</Text>
                  <Text style={styles.detailValue}>{formatDate(currentUser.createdAt)}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <MaterialIcons 
                  name={currentUser.isActive ? 'check-circle' : 'cancel'} 
                  size={20} 
                  color={currentUser.isActive ? COLORS.SUCCESS : COLORS.ERROR} 
                />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Trạng thái</Text>
                  <Text style={[styles.detailValue, { color: currentUser.isActive ? COLORS.SUCCESS : COLORS.ERROR }]}>
                    {currentUser.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Family Profiles Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Thành viên gia đình</Text>
            <View style={styles.sectionHeaderRight}>
              {loadingFamilyProfiles && (
                <ActivityIndicator size="small" color={COLORS.PRIMARY} style={{ marginRight: SPACING.SM }} />
              )}
              <TouchableOpacity
                style={styles.addFamilyButton}
                onPress={handleOpenAddFamilyModal}
                activeOpacity={0.7}
              >
                <MaterialIcons name="add" size={20} color={COLORS.SURFACE} />
                <Text style={styles.addFamilyButtonText}>Thêm</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {loadingFamilyProfiles && familyProfiles.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.PRIMARY} />
              <Text style={styles.familyLoadingText}>Đang tải danh sách thành viên...</Text>
            </View>
          ) : familyProfiles.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="people-outline" size={48} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.emptyText}>Chưa có thành viên gia đình nào</Text>
            </View>
          ) : (
            <View style={styles.familyProfilesList}>
              {familyProfiles.map((profile) => (
                <View key={profile.id} style={styles.familyProfileCard}>
                  <View style={styles.familyProfileHeader}>
                    {profile.avatar ? (
                      <Image
                        source={{ uri: profile.avatar }}
                        style={styles.familyProfileAvatar}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.familyProfileAvatarPlaceholder}>
                        <MaterialIcons name="person" size={32} color={COLORS.PRIMARY} />
                      </View>
                    )}
                    <View style={styles.familyProfileInfo}>
                      <Text style={styles.familyProfileName}>{profile.name}</Text>
                      <View style={styles.familyProfileMeta}>
                        <MaterialIcons name="phone" size={14} color={COLORS.TEXT_SECONDARY} />
                        <Text style={styles.familyProfilePhone}>{profile.phone}</Text>
                      </View>
                      {profile.studentRela && (
                        <View style={styles.familyProfileRelation}>
                          <MaterialIcons name="family-restroom" size={14} color={COLORS.PRIMARY} />
                          <Text style={styles.familyProfileRelationText}>
                            {profile.studentRela}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {profile.students && profile.students.length > 0 && (
                    <View style={styles.familyProfileStudents}>
                      <Text style={styles.familyProfileStudentsLabel}>
                        Học sinh: {profile.students.length}
                      </Text>
                    </View>
                  )}
                  
                  {/* Action Buttons */}
                  <View style={styles.familyProfileActions}>
                    <TouchableOpacity
                      style={styles.familyProfileActionButton}
                      onPress={() => handleOpenEditFamilyModal(profile.id)}
                      disabled={deletingFamilyId === profile.id}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="edit" size={18} color={COLORS.PRIMARY} />
                      <Text style={styles.familyProfileActionText}>Sửa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.familyProfileActionButton, styles.familyProfileDeleteButton]}
                      onPress={() => handleDeleteFamilyProfile(profile.id, profile.name)}
                      disabled={deletingFamilyId === profile.id || deletingFamilyId !== null}
                      activeOpacity={0.7}
                    >
                      {deletingFamilyId === profile.id ? (
                        <ActivityIndicator size="small" color={COLORS.ERROR} />
                      ) : (
                        <>
                          <MaterialIcons name="delete" size={18} color={COLORS.ERROR} />
                          <Text style={[styles.familyProfileActionText, styles.familyProfileDeleteText]}>Xóa</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
            <MaterialIcons name="edit" size={24} color={COLORS.PRIMARY} />
            <Text style={styles.menuText}>Chỉnh sửa hồ sơ</Text>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
            <MaterialIcons name="settings" size={24} color={COLORS.PRIMARY} />
            <Text style={styles.menuText}>Cài đặt</Text>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleNotifications}>
            <MaterialIcons name="notifications" size={24} color={COLORS.PRIMARY} />
            <Text style={styles.menuText}>Thông báo</Text>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleMySubscriptions}>
            <MaterialIcons name="card-membership" size={24} color={COLORS.PRIMARY} />
            <Text style={styles.menuText}>Gói đăng ký của tôi</Text>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleOrderHistory}>
            <MaterialIcons name="receipt-long" size={24} color={COLORS.PRIMARY} />
            <Text style={styles.menuText}>Lịch sử đơn hàng</Text>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <MaterialIcons name="logout" size={24} color={COLORS.ERROR} />
            <Text style={[styles.menuText, { color: COLORS.ERROR }]}>Đăng xuất</Text>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editing}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseEdit}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Chỉnh sửa hồ sơ</Text>
                    <TouchableOpacity onPress={handleCloseEdit} disabled={updating}>
                      <MaterialIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                    {error && (
                      <View style={styles.errorContainer}>
                        <MaterialIcons name="error" size={20} color={COLORS.ERROR} />
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    )}

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Tên *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editName}
                        onChangeText={setEditName}
                        placeholder="Nhập tên của bạn"
                        placeholderTextColor={COLORS.TEXT_SECONDARY}
                        editable={!updating}
                        autoCapitalize="words"
                        returnKeyType="next"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Số điện thoại *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editPhoneNumber}
                        onChangeText={setEditPhoneNumber}
                        placeholder="Nhập số điện thoại (10-11 chữ số)"
                        placeholderTextColor={COLORS.TEXT_SECONDARY}
                        keyboardType="phone-pad"
                        editable={!updating}
                        maxLength={11}
                        returnKeyType="done"
                        onSubmitEditing={handleSaveProfile}
                      />
                    </View>
                  </ScrollView>

                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={handleCloseEdit}
                      disabled={updating}
                    >
                      <Text style={styles.cancelButtonText}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.saveButton, updating && styles.disabledButton]}
                      onPress={handleSaveProfile}
                      disabled={updating}
                    >
                      {updating ? (
                        <ActivityIndicator size="small" color={COLORS.SURFACE} />
                      ) : (
                        <Text style={styles.saveButtonText}>Lưu</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Family Profile Modal */}
      <Modal
        visible={addFamilyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseAddFamilyModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Thêm thành viên gia đình</Text>
                    <TouchableOpacity onPress={handleCloseAddFamilyModal} disabled={creatingFamilyProfile}>
                      <MaterialIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                    {error && (
                      <View style={styles.errorContainer}>
                        <MaterialIcons name="error" size={20} color={COLORS.ERROR} />
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    )}

                    {/* Avatar */}
                    <View style={styles.avatarSection}>
                      <Text style={styles.inputLabel}>Ảnh đại diện (tùy chọn)</Text>
                      {newFamilyAvatarUri ? (
                        <View style={styles.avatarPreviewContainer}>
                          <Image
                            source={{ uri: newFamilyAvatarUri }}
                            style={styles.avatarPreview}
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            style={styles.removeAvatarButton}
                            onPress={handleRemoveFamilyAvatar}
                            disabled={creatingFamilyProfile}
                          >
                            <MaterialIcons name="close" size={20} color={COLORS.SURFACE} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.avatarPickerButton}
                          onPress={handlePickFamilyAvatar}
                          disabled={creatingFamilyProfile}
                        >
                          <MaterialIcons name="camera-alt" size={32} color={COLORS.PRIMARY} />
                          <Text style={styles.avatarPickerText}>Chọn ảnh đại diện</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Name */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Tên thành viên *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={newFamilyName}
                        onChangeText={setNewFamilyName}
                        placeholder="Nhập tên thành viên"
                        placeholderTextColor={COLORS.TEXT_SECONDARY}
                        editable={!creatingFamilyProfile}
                        autoCapitalize="words"
                        returnKeyType="next"
                      />
                    </View>

                    {/* Phone */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Số điện thoại *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={newFamilyPhone}
                        onChangeText={setNewFamilyPhone}
                        placeholder="Nhập số điện thoại (10-11 chữ số)"
                        placeholderTextColor={COLORS.TEXT_SECONDARY}
                        keyboardType="phone-pad"
                        editable={!creatingFamilyProfile}
                        maxLength={11}
                        returnKeyType="next"
                      />
                    </View>

                    {/* Relationship Dropdown */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Mối quan hệ với học sinh *</Text>
                      <TouchableOpacity
                        style={styles.dropdownButton}
                        onPress={handleSelectRelationship}
                        disabled={creatingFamilyProfile}
                      >
                        <Text style={[
                          styles.dropdownText,
                          !newFamilyRela && styles.dropdownPlaceholder
                        ]}>
                          {newFamilyRela || 'Chọn mối quan hệ'}
                        </Text>
                        <MaterialIcons name="arrow-drop-down" size={24} color={COLORS.TEXT_SECONDARY} />
                      </TouchableOpacity>
                    </View>
                  </ScrollView>

                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={handleCloseAddFamilyModal}
                      disabled={creatingFamilyProfile}
                    >
                      <Text style={styles.cancelButtonText}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.saveButton, creatingFamilyProfile && styles.disabledButton]}
                      onPress={handleCreateFamilyProfile}
                      disabled={creatingFamilyProfile}
                    >
                      {creatingFamilyProfile ? (
                        <ActivityIndicator size="small" color={COLORS.SURFACE} />
                      ) : (
                        <Text style={styles.saveButtonText}>Thêm</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Family Profile Modal */}
      <Modal
        visible={editFamilyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseEditFamilyModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Chỉnh sửa thành viên gia đình</Text>
                    <TouchableOpacity onPress={handleCloseEditFamilyModal} disabled={updatingFamilyProfile}>
                      <MaterialIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                    {error && (
                      <View style={styles.errorContainer}>
                        <MaterialIcons name="error" size={20} color={COLORS.ERROR} />
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    )}

                    {/* Avatar */}
                    <View style={styles.avatarSection}>
                      <Text style={styles.inputLabel}>Ảnh đại diện (tùy chọn)</Text>
                      {editFamilyAvatarUri || editFamilyAvatarUrl ? (
                        <View style={styles.avatarPreviewContainer}>
                          <Image
                            source={{ uri: editFamilyAvatarUri || editFamilyAvatarUrl || '' }}
                            style={styles.avatarPreview}
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            style={styles.removeAvatarButton}
                            onPress={handleRemoveEditFamilyAvatar}
                            disabled={updatingFamilyProfile}
                          >
                            <MaterialIcons name="close" size={20} color={COLORS.SURFACE} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.avatarPickerButton}
                          onPress={handlePickEditFamilyAvatar}
                          disabled={updatingFamilyProfile}
                        >
                          <MaterialIcons name="camera-alt" size={32} color={COLORS.PRIMARY} />
                          <Text style={styles.avatarPickerText}>Chọn ảnh đại diện</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Name */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Tên thành viên *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editFamilyName}
                        onChangeText={setEditFamilyName}
                        placeholder="Nhập tên thành viên"
                        placeholderTextColor={COLORS.TEXT_SECONDARY}
                        editable={!updatingFamilyProfile}
                        autoCapitalize="words"
                        returnKeyType="next"
                      />
                    </View>

                    {/* Phone */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Số điện thoại *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editFamilyPhone}
                        onChangeText={setEditFamilyPhone}
                        placeholder="Nhập số điện thoại (10-11 chữ số)"
                        placeholderTextColor={COLORS.TEXT_SECONDARY}
                        keyboardType="phone-pad"
                        editable={!updatingFamilyProfile}
                        maxLength={11}
                        returnKeyType="next"
                      />
                    </View>

                    {/* Relationship Dropdown */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Mối quan hệ với học sinh *</Text>
                      <TouchableOpacity
                        style={styles.dropdownButton}
                        onPress={handleSelectEditRelationship}
                        disabled={updatingFamilyProfile}
                      >
                        <Text style={[
                          styles.dropdownText,
                          !editFamilyRela && styles.dropdownPlaceholder
                        ]}>
                          {editFamilyRela || 'Chọn mối quan hệ'}
                        </Text>
                        <MaterialIcons name="arrow-drop-down" size={24} color={COLORS.TEXT_SECONDARY} />
                      </TouchableOpacity>
                    </View>
                  </ScrollView>

                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={handleCloseEditFamilyModal}
                      disabled={updatingFamilyProfile}
                    >
                      <Text style={styles.cancelButtonText}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.saveButton, updatingFamilyProfile && styles.disabledButton]}
                      onPress={handleUpdateFamilyProfile}
                      disabled={updatingFamilyProfile}
                    >
                      {updatingFamilyProfile ? (
                        <ActivityIndicator size="small" color={COLORS.SURFACE} />
                      ) : (
                        <Text style={styles.saveButtonText}>Cập nhật</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
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
  scrollContent: {
    padding: SPACING.MD,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  errorText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.ERROR,
    textAlign: 'center',
  },
  userCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.LG,
    alignItems: 'center',
    marginBottom: SPACING.LG,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.MD,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: COLORS.PRIMARY_LIGHT,
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarEditOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: SPACING.XS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: FONTS.SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
    textAlign: 'center',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY_LIGHT + '20',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS,
    borderRadius: 16,
    marginBottom: SPACING.SM,
  },
  userRole: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
    marginLeft: SPACING.XS,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.XS,
  },
  userInfoText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.XS,
  },
  section: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.MD,
    marginBottom: SPACING.LG,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addFamilyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 12,
    gap: SPACING.XS,
  },
  addFamilyButtonText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.LG,
    gap: SPACING.SM,
  },
  familyLoadingText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: SPACING.XL,
  },
  emptyText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  familyProfilesList: {
    gap: SPACING.SM,
  },
  familyProfileCard: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    padding: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  familyProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  familyProfileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: SPACING.MD,
  },
  familyProfileAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.PRIMARY_LIGHT + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  familyProfileInfo: {
    flex: 1,
  },
  familyProfileName: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  familyProfileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS,
    gap: SPACING.XS,
  },
  familyProfilePhone: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  familyProfileRelation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY_LIGHT + '20',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: SPACING.XS,
  },
  familyProfileRelationText: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  familyProfileStudents: {
    marginTop: SPACING.SM,
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  familyProfileStudentsLabel: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  familyProfileActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.SM,
    marginTop: SPACING.SM,
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  familyProfileActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 8,
    backgroundColor: COLORS.PRIMARY_LIGHT + '20',
    gap: SPACING.XS,
  },
  familyProfileDeleteButton: {
    backgroundColor: COLORS.ERROR + '20',
  },
  familyProfileActionText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  familyProfileDeleteText: {
    color: COLORS.ERROR,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: SPACING.SM,
    borderRadius: 8,
    marginBottom: SPACING.MD,
  },
  detailCard: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    padding: SPACING.MD,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.MD,
    paddingBottom: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  detailContent: {
    flex: 1,
    marginLeft: SPACING.MD,
  },
  detailLabel: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  detailValue: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  menuContainer: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: SPACING.LG,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  menuText: {
    flex: 1,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.MD,
  },
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
    paddingBottom: Platform.OS === 'ios' ? SPACING.XL : SPACING.MD,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  modalTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  modalBody: {
    padding: SPACING.MD,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: SPACING.MD,
  },
  inputLabel: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.BACKGROUND,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    gap: SPACING.SM,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.MD,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  cancelButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  saveButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  saveButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  disabledButton: {
    opacity: 0.6,
  },
  avatarSection: {
    marginBottom: SPACING.MD,
  },
  avatarPreviewContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginTop: SPACING.SM,
  },
  avatarPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  removeAvatarButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.ERROR,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPickerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: SPACING.LG,
    marginTop: SPACING.SM,
    backgroundColor: COLORS.BACKGROUND,
  },
  avatarPickerText: {
    marginTop: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.BACKGROUND,
    minHeight: 48,
  },
  dropdownText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  dropdownPlaceholder: {
    color: COLORS.TEXT_SECONDARY,
  },
});

export default ProfileScreen;
