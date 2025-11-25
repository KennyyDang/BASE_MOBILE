import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { TextInput, Button } from 'react-native-paper';
import { COLORS, SPACING, FONTS } from '../../constants';
import activityTypeService, { ActivityType } from '../../services/activityTypeService';
import imageService from '../../services/imageService';
import activityService from '../../services/activityService';
import { useAuth } from '../../contexts/AuthContext';

type CreateActivityRouteParams = {
  studentSlotId: string;
  studentId: string;
  studentName: string;
  slotDate?: string;
  slotTimeframe?: string;
};

const CreateActivityScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: CreateActivityRouteParams }, 'params'>>();
  const { user } = useAuth();
  const { studentSlotId, studentId, studentName, slotDate, slotTimeframe } = route.params || {};

  // Kiểm tra quyền truy cập - chỉ dành cho staff, không phải manager
  useEffect(() => {
    const userRole = (user?.role || '').toUpperCase();
    const isManager = userRole.includes('MANAGER') || userRole === 'ADMIN';
    if (isManager) {
      Alert.alert(
        'Không có quyền truy cập',
        'Chức năng này chỉ dành cho nhân viên. Quản lý chỉ có quyền tạo tài khoản phụ huynh.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  }, [user, navigation]);

  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [selectedActivityTypeId, setSelectedActivityTypeId] = useState<string>('');
  const [note, setNote] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingActivityTypes, setLoadingActivityTypes] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    fetchActivityTypes();
  }, []);

  const fetchActivityTypes = async () => {
    try {
      setLoadingActivityTypes(true);
      const types = await activityTypeService.getAllActivityTypes();
      setActivityTypes(types);
      if (types.length > 0 && !selectedActivityTypeId) {
        setSelectedActivityTypeId(types[0].id);
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Không thể tải danh sách loại hoạt động.';
      Alert.alert('Lỗi', message);
    } finally {
      setLoadingActivityTypes(false);
    }
  };

  const handlePickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập',
          'Cần quyền truy cập thư viện ảnh để upload ảnh hoạt động.'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        setImageUri(selectedImage.uri);
        setUploadedImageUrl(null); // Reset uploaded URL when new image is selected

        // Auto upload image
        await handleUploadImage(selectedImage.uri);
      }
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập',
          'Cần quyền truy cập camera để chụp ảnh hoạt động.'
        );
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        setImageUri(selectedImage.uri);
        setUploadedImageUrl(null);

        // Auto upload image
        await handleUploadImage(selectedImage.uri);
      }
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể chụp ảnh. Vui lòng thử lại.');
    }
  };

  const handleUploadImage = async (uri: string): Promise<string | null> => {
    try {
      setUploadingImage(true);
      setUploadedImageUrl(null); // Reset trước khi upload
      const fileExtension = uri.split('.').pop() || 'jpg';
      const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
      
      const response = await imageService.uploadImage(uri, undefined, mimeType);
      
      // Response từ imageService luôn trả về UploadImageResponse với imageUrl
      if (!response?.imageUrl) {
        throw new Error('Không nhận được URL ảnh từ server.');
      }
      
      setUploadedImageUrl(response.imageUrl);
      return response.imageUrl; // Trả về URL để có thể dùng ngay
    } catch (error: any) {
      const message =
        error?.message ||
        error?.response?.data?.message ||
        'Không thể upload ảnh. Vui lòng thử lại.';
      Alert.alert('Lỗi', message);
      setImageUri(null);
      setUploadedImageUrl(null);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUri(null);
    setUploadedImageUrl(null);
  };

  const handleCheckIn = async () => {
    if (!studentId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin học sinh.');
      return;
    }

    try {
      setCheckingIn(true);
      await activityService.checkInStudent(studentId);
      
      Alert.alert(
        'Thành công',
        'Đã check-in học sinh thành công!',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Không thể check-in học sinh. Vui lòng thử lại.';
      Alert.alert('Lỗi', message);
    } finally {
      setCheckingIn(false);
    }
  };

  // Helper function to create activity without image
  const createActivityWithoutImage = async () => {
    if (!user?.id || !studentSlotId) {
      Alert.alert('Lỗi', 'Thông tin không hợp lệ.');
      return;
    }

    try {
      setLoading(true);
      await activityService.createActivity({
        note: note.trim(),
        imageUrl: undefined, // No image
        activityTypeId: selectedActivityTypeId,
        studentSlotId: studentSlotId,
        createdById: user.id,
      });

      Alert.alert(
        'Thành công',
        'Đã tạo hoạt động thành công!',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Không thể tạo hoạt động. Vui lòng thử lại.';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateActivity = async () => {
    if (!selectedActivityTypeId) {
      Alert.alert('Lỗi', 'Vui lòng chọn loại hoạt động.');
      return;
    }

    if (!note.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập ghi chú cho hoạt động.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng.');
      return;
    }

    if (!studentSlotId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin slot học sinh.');
      return;
    }

    // If image is selected but still uploading, wait for it to complete
    if (imageUri && uploadingImage) {
      Alert.alert('Thông báo', 'Đang upload ảnh, vui lòng đợi...');
      return;
    }

    // If image is selected but upload failed or not completed, try to upload again
    if (imageUri && !uploadedImageUrl && !uploadingImage) {
      const uploadedUrl = await handleUploadImage(imageUri);
      // Nếu upload thất bại, vẫn cho phép tạo hoạt động không có ảnh
      if (!uploadedUrl) {
        Alert.alert(
          'Cảnh báo',
          'Không thể upload ảnh. Bạn có muốn tạo hoạt động mà không có ảnh không?',
          [
            {
              text: 'Hủy',
              style: 'cancel',
            },
            {
              text: 'Tạo không ảnh',
              onPress: async () => {
                await createActivityWithoutImage();
              },
            },
          ]
        );
        return;
      }
    }

    // Proceed with creating activity (with or without image)
    try {
      setLoading(true);
      await activityService.createActivity({
        note: note.trim(),
        imageUrl: uploadedImageUrl || undefined,
        activityTypeId: selectedActivityTypeId,
        studentSlotId: studentSlotId,
        createdById: user.id,
      });

      Alert.alert(
        'Thành công',
        'Đã tạo hoạt động thành công!',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Không thể tạo hoạt động. Vui lòng thử lại.';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  const selectedActivityType = activityTypes.find((type) => type.id === selectedActivityTypeId);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Info */}
          <View style={styles.headerInfo}>
            <MaterialIcons name="person" size={24} color={COLORS.PRIMARY} />
            <View style={styles.headerInfoText}>
              <Text style={styles.headerInfoTitle}>Học sinh: {studentName}</Text>
              {slotDate && (
                <Text style={styles.headerInfoSubtitle}>
                  {slotDate} {slotTimeframe ? `- ${slotTimeframe}` : ''}
                </Text>
              )}
            </View>
          </View>

          {/* Activity Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Loại hoạt động *</Text>
            {loadingActivityTypes ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                <Text style={styles.loadingText}>Đang tải loại hoạt động...</Text>
              </View>
            ) : activityTypes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Chưa có loại hoạt động nào</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.activityTypesScroll}
              >
                {activityTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.activityTypeCard,
                      selectedActivityTypeId === type.id && styles.activityTypeCardSelected,
                    ]}
                    onPress={() => setSelectedActivityTypeId(type.id)}
                  >
                    <MaterialIcons
                      name="category"
                      size={24}
                      color={
                        selectedActivityTypeId === type.id
                          ? COLORS.SURFACE
                          : COLORS.PRIMARY
                      }
                    />
                    <Text
                      style={[
                        styles.activityTypeName,
                        selectedActivityTypeId === type.id &&
                          styles.activityTypeNameSelected,
                      ]}
                    >
                      {type.name}
                    </Text>
                    {type.description && (
                      <Text
                        style={[
                          styles.activityTypeDescription,
                          selectedActivityTypeId === type.id &&
                            styles.activityTypeDescriptionSelected,
                        ]}
                        numberOfLines={2}
                      >
                        {type.description}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Note Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ghi chú *</Text>
            <TextInput
              mode="outlined"
              placeholder="Nhập ghi chú về hoạt động của học sinh..."
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={4}
              style={styles.noteInput}
              maxLength={500}
            />
            <Text style={styles.charCount}>{note.length}/500</Text>
          </View>

          {/* Image Upload */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ảnh (tùy chọn)</Text>
            {imageUri ? (
              <View style={styles.imageContainer}>
                {uploadingImage ? (
                  <View style={styles.imageUploadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                    <Text style={styles.uploadingText}>Đang upload ảnh...</Text>
                  </View>
                ) : (
                  <>
                    <Image source={{ uri: imageUri }} style={styles.previewImage} />
                    {uploadedImageUrl && (
                      <View style={styles.uploadSuccessBadge}>
                        <MaterialIcons name="check-circle" size={20} color={COLORS.SUCCESS} />
                        <Text style={styles.uploadSuccessText}>Đã upload</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={handleRemoveImage}
                    >
                      <MaterialIcons name="close" size={20} color={COLORS.SURFACE} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : (
              <View style={styles.imagePickerContainer}>
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={handlePickImage}
                  disabled={uploadingImage}
                >
                  <MaterialIcons name="photo-library" size={32} color={COLORS.PRIMARY} />
                  <Text style={styles.imagePickerText}>Chọn ảnh từ thư viện</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={handleTakePhoto}
                  disabled={uploadingImage}
                >
                  <MaterialIcons name="camera-alt" size={32} color={COLORS.PRIMARY} />
                  <Text style={styles.imagePickerText}>Chụp ảnh</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Check-in Button */}
          <TouchableOpacity
            onPress={handleCheckIn}
            disabled={checkingIn || loadingActivityTypes}
            style={[
              styles.checkInButton,
              (checkingIn || loadingActivityTypes) && styles.checkInButtonDisabled,
            ]}
            activeOpacity={0.8}
          >
            {checkingIn ? (
              <View style={styles.buttonLoadingContainer}>
                <ActivityIndicator size="small" color={COLORS.SURFACE} />
                <Text style={styles.checkInButtonLabel}>Đang check-in...</Text>
              </View>
            ) : (
              <>
                <MaterialIcons name="check-circle" size={20} color={COLORS.SURFACE} />
                <Text style={styles.checkInButtonLabel}>Check-in học sinh</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Create Button */}
          {(() => {
            // Tính toán trạng thái disable
            // Chỉ disable khi đang xử lý (loading/uploading), không disable vì thiếu thông tin
            // Validation sẽ được thực hiện trong handleCreateActivity
            const shouldDisable: boolean = 
              loadingActivityTypes || // Đang load activity types
              loading || // Đang tạo hoạt động
              checkingIn || // Đang check-in
              Boolean(uploadingImage && imageUri && !uploadedImageUrl); // Đang upload ảnh
            
            const buttonText = loadingActivityTypes
              ? 'Đang tải...'
              : uploadingImage 
              ? 'Đang upload ảnh...' 
              : loading 
              ? 'Đang tạo...' 
              : 'Tạo hoạt động';
            
            return (
              <TouchableOpacity
                onPress={handleCreateActivity}
                disabled={shouldDisable}
                style={[
                  styles.createButton,
                  shouldDisable && styles.createButtonDisabled,
                ]}
                activeOpacity={0.8}
              >
                {loading || uploadingImage || loadingActivityTypes ? (
                  <View style={styles.buttonLoadingContainer}>
                    <ActivityIndicator size="small" color={COLORS.SURFACE} />
                    <Text style={styles.createButtonLabel}>
                      {buttonText}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.createButtonLabel}>
                    {buttonText}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })()}
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
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: SPACING.MD,
    paddingBottom: SPACING.XL,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    padding: SPACING.MD,
    borderRadius: 12,
    marginBottom: SPACING.LG,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  headerInfoText: {
    marginLeft: SPACING.MD,
    flex: 1,
  },
  headerInfoTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  headerInfoSubtitle: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS,
  },
  section: {
    marginBottom: SPACING.LG,
  },
  sectionTitle: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.MD,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
  },
  loadingText: {
    marginLeft: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  emptyContainer: {
    padding: SPACING.MD,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  activityTypesScroll: {
    marginHorizontal: -SPACING.MD,
  },
  activityTypeCard: {
    backgroundColor: COLORS.SURFACE,
    padding: SPACING.MD,
    borderRadius: 12,
    marginRight: SPACING.SM,
    marginLeft: SPACING.MD,
    minWidth: 150,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.BORDER,
  },
  activityTypeCardSelected: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  activityTypeName: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.XS,
    textAlign: 'center',
  },
  activityTypeNameSelected: {
    color: COLORS.SURFACE,
  },
  activityTypeDescription: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS,
    textAlign: 'center',
  },
  activityTypeDescriptionSelected: {
    color: COLORS.SURFACE,
    opacity: 0.9,
  },
  noteInput: {
    backgroundColor: COLORS.SURFACE,
  },
  charCount: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'right',
    marginTop: SPACING.XS,
  },
  imagePickerContainer: {
    flexDirection: 'row',
    gap: SPACING.SM,
  },
  imagePickerButton: {
    flex: 1,
    backgroundColor: COLORS.SURFACE,
    padding: SPACING.MD,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderStyle: 'dashed',
  },
  imagePickerText: {
    marginTop: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  imageUploadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  uploadingText: {
    marginTop: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  uploadSuccessBadge: {
    position: 'absolute',
    top: SPACING.SM,
    right: SPACING.SM,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 12,
    gap: SPACING.XS,
  },
  uploadSuccessText: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.SUCCESS,
    fontWeight: '600',
  },
  removeImageButton: {
    position: 'absolute',
    bottom: SPACING.SM,
    right: SPACING.SM,
    backgroundColor: COLORS.ERROR,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButton: {
    marginTop: SPACING.MD,
    borderRadius: 12,
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  createButtonDisabled: {
    backgroundColor: COLORS.TEXT_SECONDARY,
    opacity: 0.6,
  },
  buttonLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  },
  createButtonLabel: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  checkInButton: {
    marginTop: SPACING.MD,
    borderRadius: 12,
    backgroundColor: COLORS.SUCCESS,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    flexDirection: 'row',
    gap: SPACING.SM,
  },
  checkInButtonDisabled: {
    backgroundColor: COLORS.TEXT_SECONDARY,
    opacity: 0.6,
  },
  checkInButtonLabel: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
});

export default CreateActivityScreen;

