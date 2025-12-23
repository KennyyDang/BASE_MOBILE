import React, { useRef, forwardRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS } from '../../constants';

interface Step3DocumentAndReasonProps {
  data: any;
  updateData: (data: any) => void;
  isLoading?: boolean;
}

const Step3DocumentAndReason = forwardRef<any, Step3DocumentAndReasonProps>(({
  data = {},
  updateData,
  isLoading = false
}, ref) => {

  const handleReasonChange = (requestReason: string) => {
    updateData({
      ...(data || {}),
      requestReason
    });
  };

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (asset.size && asset.size > maxSize) {
          Alert.alert('Lỗi', 'Kích thước file không được vượt quá 10MB');
          return;
        }

        updateData({
          ...(data || {}),
          documentFile: asset
        });
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn file. Vui lòng thử lại.');
    }
  };

  const handleRemoveFile = () => {
    updateData({
      ...(data || {}),
      documentFile: null
    });
  };

  const needsDocument = data.changeSchool || data.changeLevel;

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Tài liệu hỗ trợ và lý do chuyển chi nhánh</Text>

      {/* Document Upload */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="description" size={24} color={COLORS.PRIMARY} />
          <Text style={styles.sectionTitle}>Tài liệu hỗ trợ</Text>
          {needsDocument && <Text style={styles.requiredText}>Bắt buộc</Text>}
        </View>

        {needsDocument ? (
          <View style={styles.alert}>
            <MaterialIcons name="info" size={20} color={COLORS.INFO} />
            <Text style={styles.alertText}>
              Vì bạn đã chọn thay đổi trường học hoặc cấp độ học sinh,
              vui lòng tải lên tài liệu chứng minh (học bạ, giấy chuyển trường, v.v.)
            </Text>
          </View>
        ) : (
          <View style={styles.alert}>
            <MaterialIcons name="info" size={20} color={COLORS.INFO} />
            <Text style={styles.alertText}>
              Tài liệu hỗ trợ là tùy chọn nếu bạn chỉ chuyển chi nhánh mà không thay đổi trường học hoặc cấp độ.
            </Text>
          </View>
        )}

        {!data.documentFile ? (
          <View>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleFilePick}
              disabled={isLoading}
            >
              <MaterialIcons name="cloud-upload" size={24} color={COLORS.PRIMARY} />
              <Text style={styles.uploadButtonText}>Chọn file tài liệu</Text>
            </TouchableOpacity>
            <Text style={styles.uploadHint}>
              Chấp nhận: JPEG, PNG, PDF. Kích thước tối đa: 10MB
            </Text>
            {needsDocument && !data.documentFile && (
              <Text style={styles.errorText}>
                Vui lòng tải lên tài liệu hỗ trợ
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.fileCard}>
            <View style={styles.fileInfo}>
              <MaterialIcons name="description" size={24} color={COLORS.SUCCESS} />
              <View style={styles.fileDetails}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {data.documentFile.name || 'Tài liệu'}
                </Text>
                <Text style={styles.fileSize}>
                  {formatFileSize(data.documentFile.size)}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={handleRemoveFile}
              disabled={isLoading}
            >
              <MaterialIcons name="close" size={20} color={COLORS.ERROR} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Request Reason */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lý do chuyển chi nhánh (tùy chọn)</Text>

        <TextInput
          style={styles.reasonInput}
          multiline
          numberOfLines={4}
          placeholder="Hãy mô tả lý do bạn muốn chuyển chi nhánh cho con (ví dụ: chuyển nơi ở, điều kiện học tập, v.v.)"
          value={data.requestReason || ''}
          onChangeText={handleReasonChange}
          editable={!isLoading}
          textAlignVertical="top"
        />
        <Text style={styles.reasonHint}>
          Lý do sẽ giúp quản lý hiểu rõ hơn về yêu cầu của bạn
        </Text>
      </View>

      {/* Summary */}
      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>Tóm tắt yêu cầu</Text>
        <View style={styles.summaryContent}>
          <Text style={styles.summaryItem}>
            • Chuyển chi nhánh: {data.changeSchool || data.changeLevel ? 'Có thay đổi bổ sung' : 'Chỉ chuyển chi nhánh'}
          </Text>
          {data.changeSchool && (
            <Text style={styles.summaryItem}>
              • Thay đổi trường học: Có
            </Text>
          )}
          {data.changeLevel && (
            <Text style={styles.summaryItem}>
              • Thay đổi cấp độ: Có
            </Text>
          )}
          {data.documentFile && (
            <Text style={styles.summaryItem}>
              • Tài liệu: Đã tải lên ({data.documentFile.name})
            </Text>
          )}
          {data.requestReason && (
            <Text style={styles.summaryItem}>
              • Lý do: Đã cung cấp
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
});

Step3DocumentAndReason.displayName = 'Step3DocumentAndReason';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginVertical: 20,
  },
  section: {
    backgroundColor: COLORS.SURFACE,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  requiredText: {
    fontSize: 12,
    color: COLORS.ERROR,
    fontWeight: '600',
    backgroundColor: COLORS.ERROR + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.INFO + '15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 20,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 12,
  },
  uploadButtonText: {
    fontSize: 16,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  uploadHint: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.ERROR,
    textAlign: 'center',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SUCCESS + '15',
    borderWidth: 1,
    borderColor: COLORS.SUCCESS + '30',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    color: COLORS.SUCCESS,
    fontWeight: '600',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  removeButton: {
    padding: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.SURFACE,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  reasonHint: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 8,
    fontStyle: 'italic',
  },
  summarySection: {
    backgroundColor: COLORS.SURFACE,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 12,
  },
  summaryContent: {
    gap: 8,
  },
  summaryItem: {
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 20,
  },
});

export default Step3DocumentAndReason;
