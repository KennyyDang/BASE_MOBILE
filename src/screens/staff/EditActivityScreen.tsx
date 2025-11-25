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
import { ActivityResponse } from '../../types/api';

type EditActivityRouteParams = {
  activityId: string;
};

const EditActivityScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: EditActivityRouteParams }, 'params'>>();
  const { activityId } = route.params || {};

  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [selectedActivityTypeId, setSelectedActivityTypeId] = useState<string>('');
  const [note, setNote] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [loadingActivityTypes, setLoadingActivityTypes] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (activityId) {
      fetchActivity();
      fetchActivityTypes();
    }
  }, [activityId]);

  const fetchActivity = async () => {
    if (!activityId) return;

    try {
      setLoadingActivity(true);
      const data = await activityService.getActivityById(activityId);
      setActivity(data);
      setNote(data.note || '');
      setSelectedActivityTypeId(data.activityTypeId);
      setUploadedImageUrl(data.imageUrl || null);
      if (data.imageUrl) {
        setImageUri(data.imageUrl);
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Không thể tải thông tin hoạt động.';
      Alert.alert('Lỗi', message, [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } finally {
      setLoadingActivity(false);
    }
  };

  const fetchActivityTypes = async () => {
    try {
      setLoadingActivityTypes(true);
      const types = await activityTypeService.getAllActivityTypes();
      setActivityTypes(types);
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
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập',
          'Cần quyền truy cập thư viện ảnh để upload ảnh hoạt động.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        setImageUri(selectedImage.uri);
        setUploadedImageUrl(null);

        await handleUploadImage(selectedImage.uri);
      }
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập',
          'Cần quyền truy cập camera để chụp ảnh hoạt động.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        setImageUri(selectedImage.uri);
        setUploadedImageUrl(null);

        await handleUploadImage(selectedImage.uri);
      }
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể chụp ảnh. Vui lòng thử lại.');
    }
  };

  const handleUploadImage = async (uri: string) => {
    try {
      setUploadingImage(true);
      setUploadedImageUrl(null);
      const fileExtension = uri.split('.').pop() || 'jpg';
      const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
      
      const response = await imageService.uploadImage(uri, undefined, mimeType);
      
      let imageUrl: string | null = null;
      if (typeof response === 'string') {
        imageUrl = response;
      } else if (response?.imageUrl) {
        imageUrl = response.imageUrl;
      } else if (response?.url) {
        imageUrl = response.url;
      } else if (response?.data?.imageUrl) {
        imageUrl = response.data.imageUrl;
      } else if (response?.data?.url) {
        imageUrl = response.data.url;
      }
      
      if (!imageUrl) {
        throw new Error('Không nhận được URL ảnh từ server.');
      }
      
      setUploadedImageUrl(imageUrl);
    } catch (error: any) {
      const message =
        error?.message ||
        error?.response?.data?.message ||
        'Không thể upload ảnh. Vui lòng thử lại.';
      Alert.alert('Lỗi', message);
      setImageUri(null);
      setUploadedImageUrl(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUri(null);
    setUploadedImageUrl(null);
  };

  const handleUpdateActivity = async () => {
    if (!activityId) {
      Alert.alert('Lỗi', 'Không tìm thấy ID hoạt động.');
      return;
    }

    if (!selectedActivityTypeId) {
      Alert.alert('Lỗi', 'Vui lòng chọn loại hoạt động.');
      return;
    }

    if (!note.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập ghi chú cho hoạt động.');
      return;
    }

    if (imageUri && uploadingImage) {
      Alert.alert('Thông báo', 'Đang upload ảnh, vui lòng đợi...');
      return;
    }

    if (imageUri && !uploadedImageUrl && !uploadingImage) {
      try {
        setUploadingImage(true);
        await handleUploadImage(imageUri);
        if (!uploadedImageUrl) {
          Alert.alert(
            'Cảnh báo',
            'Không thể upload ảnh. Bạn có muốn cập nhật hoạt động mà không có ảnh không?',
            [
              {
                text: 'Hủy',
                style: 'cancel',
              },
              {
                text: 'Cập nhật không ảnh',
                onPress: async () => {
                  await updateActivityWithoutImage();
                },
              },
            ]
          );
          setUploadingImage(false);
          return;
        }
      } catch (error) {
        Alert.alert(
          'Cảnh báo',
          'Không thể upload ảnh. Bạn có muốn cập nhật hoạt động mà không có ảnh không?',
          [
            {
              text: 'Hủy',
              style: 'cancel',
            },
            {
              text: 'Cập nhật không ảnh',
              onPress: async () => {
                await updateActivityWithoutImage();
              },
            },
          ]
        );
        setUploadingImage(false);
        return;
      } finally {
        setUploadingImage(false);
      }
    }

    try {
      setLoading(true);
      await activityService.updateActivity(activityId, {
        note: note.trim(),
        imageUrl: uploadedImageUrl || undefined,
        activityTypeId: selectedActivityTypeId,
      });

      Alert.alert(
        'Thành công',
        'Đã cập nhật hoạt động thành công!',
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
        'Không thể cập nhật hoạt động. Vui lòng thử lại.';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  const updateActivityWithoutImage = async () => {
    if (!activityId) return;

    try {
      setLoading(true);
      await activityService.updateActivity(activityId, {
        note: note.trim(),
        imageUrl: undefined,
        activityTypeId: selectedActivityTypeId,
      });

      Alert.alert(
        'Thành công',
        'Đã cập nhật hoạt động thành công!',
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
        'Không thể cập nhật hoạt động. Vui lòng thử lại.';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingActivity) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Đang tải thông tin hoạt động...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!activity) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={48} color={COLORS.ERROR} />
          <Text style={styles.errorText}>Không tìm thấy hoạt động</Text>
          <Button mode="contained" onPress={() => navigation.goBack()} style={styles.backButton}>
            Quay lại
          </Button>
        </View>
      </SafeAreaView>
    );
  }

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
            <MaterialIcons name="edit" size={24} color={COLORS.PRIMARY} />
            <View style={styles.headerInfoText}>
              <Text style={styles.headerInfoTitle}>Chỉnh sửa hoạt động</Text>
              <Text style={styles.headerInfoSubtitle}>
                Tạo bởi: {activity.staffName} - {new Date(activity.createdDate).toLocaleDateString('vi-VN')}
              </Text>
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

          {/* Update Button */}
          <Button
            mode="contained"
            onPress={handleUpdateActivity}
            loading={loading}
            disabled={loading || uploadingImage || !selectedActivityTypeId || !note.trim()}
            style={styles.updateButton}
            contentStyle={styles.updateButtonContent}
          >
            Cập nhật hoạt động
          </Button>
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
  backButton: {
    marginTop: SPACING.LG,
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
  updateButton: {
    marginTop: SPACING.MD,
    borderRadius: 12,
  },
  updateButtonContent: {
    paddingVertical: SPACING.SM,
  },
});

export default EditActivityScreen;

