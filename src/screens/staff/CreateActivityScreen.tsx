import React, { useState, useEffect, useRef } from 'react';
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
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { TextInput, Button } from 'react-native-paper';
// Tạm thời comment để tránh lỗi native module
// import { captureRef } from 'react-native-view-shot';
let captureRef: any = null;
try {
  const viewShot = require('react-native-view-shot');
  captureRef = viewShot.captureRef;
} catch (error) {
  console.warn('react-native-view-shot chưa được setup');
}
import { COLORS, SPACING, FONTS } from '../../constants';
import activityTypeService, { ActivityType } from '../../services/activityTypeService';
import imageService from '../../services/imageService';
import activityService from '../../services/activityService';
import { useAuth } from '../../contexts/AuthContext';
import { getWatermarkInfo, ImageWithWatermark, formatTimestamp } from '../../utils/imageWatermark';

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
  const watermarkViewRef = useRef<View>(null);
  const [watermarkData, setWatermarkData] = useState<{
    imageUri: string;
    timestamp: string;
    location: any;
  } | null>(null);

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
        const originalImageUri = selectedImage.uri;
        
        // Xử lý watermark trước khi set và upload với timeout
        let finalImageUri = originalImageUri;
        try {
          // Lấy watermark info với timeout
          const watermarkInfo = await Promise.race([
            getWatermarkInfo(),
            new Promise<{ timestamp: string; location: any }>((resolve) => 
              setTimeout(() => resolve({ timestamp: formatTimestamp(), location: null }), 5000)
            )
          ]);
          
          // Set data để render watermark
          setWatermarkData({
            imageUri: originalImageUri,
            timestamp: watermarkInfo.timestamp,
            location: watermarkInfo.location,
          });

          // Đợi View render và Image load xong
          await new Promise((resolve) => setTimeout(resolve, 1000));
          
          // Đợi thêm một chút để đảm bảo Image đã render xong
          await new Promise((resolve) => setTimeout(resolve, 300));

          // Capture ảnh với watermark với timeout
          if (watermarkViewRef.current && captureRef) {
            try {
              const watermarkedUri = await Promise.race([
                captureRef(watermarkViewRef, {
                  format: 'jpg',
                  quality: 0.9,
                }),
                new Promise<string>((_, reject) => 
                  setTimeout(() => reject(new Error('Capture timeout')), 8000)
                )
              ]);
              if (watermarkedUri) {
                finalImageUri = watermarkedUri;
              }
            } catch (captureError: any) {
              console.warn('Error capturing watermark, using original image:', captureError?.message || captureError);
            }
          } else if (!captureRef) {
            console.warn('react-native-view-shot chưa được setup, sử dụng ảnh gốc');
          }
        } catch (watermarkError: any) {
          console.error('Error processing watermark:', watermarkError?.message || watermarkError);
          // Nếu có lỗi watermark, vẫn dùng ảnh gốc
        } finally {
          setWatermarkData(null);
        }

        setImageUri(finalImageUri);
        setUploadedImageUrl(null);

        // Auto upload image (có hoặc không có watermark)
        await handleUploadImage(finalImageUri);
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
      {/* Hidden View để render watermark - Phải render để capture được */}
      {watermarkData && (
        <View 
          ref={watermarkViewRef} 
          style={styles.hiddenWatermarkView} 
          collapsable={false}
          pointerEvents="none"
          removeClippedSubviews={false}
        >
          <ImageWithWatermark
            imageUri={watermarkData.imageUri}
            timestamp={watermarkData.timestamp}
            location={watermarkData.location}
          />
        </View>
      )}
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

          {/* Image Upload - Chỉ cho phép chụp ảnh để có watermark thời gian + vị trí */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ảnh (tùy chọn)</Text>
            <Text style={styles.sectionSubtitle}>
              Chụp ảnh để tự động thêm thời gian và vị trí xác thực
            </Text>
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
                  style={[styles.imagePickerButton, styles.imagePickerButtonFull]}
                  onPress={handleTakePhoto}
                  disabled={uploadingImage}
                >
                  <MaterialIcons name="camera-alt" size={32} color={COLORS.PRIMARY} />
                  <Text style={styles.imagePickerText}>Chụp ảnh</Text>
                  <Text style={styles.imagePickerSubtext}>
                    Ảnh sẽ tự động có thời gian và vị trí
                  </Text>
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
  sectionSubtitle: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.MD,
    fontStyle: 'italic',
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
  imagePickerButtonFull: {
    flex: 1,
    width: '100%',
  },
  imagePickerText: {
    marginTop: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  imagePickerSubtext: {
    marginTop: SPACING.XS,
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
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
  hiddenWatermarkView: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').width * 1.5,
    opacity: 1, // Phải là 1 để render được
    zIndex: -9999,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
});

export default CreateActivityScreen;

