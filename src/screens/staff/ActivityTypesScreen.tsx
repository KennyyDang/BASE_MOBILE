import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import { COLORS } from '../../constants';
import activityTypeService, { ActivityType, CreateActivityTypeRequest, UpdateActivityTypeRequest } from '../../services/activityTypeService';

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

const ActivityTypesScreen: React.FC = () => {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingType, setEditingType] = useState<ActivityType | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const fetchActivityTypes = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await activityTypeService.getAllActivityTypes();
      setActivityTypes(data);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Không thể tải danh sách loại hoạt động.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActivityTypes();
  }, [fetchActivityTypes]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchActivityTypes(true);
  }, [fetchActivityTypes]);

  const handleOpenCreateModal = () => {
    setEditingType(null);
    setFormData({ name: '', description: '' });
    setModalVisible(true);
  };

  const handleOpenEditModal = (type: ActivityType) => {
    setEditingType(type);
    setFormData({ name: type.name, description: type.description });
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingType(null);
    setFormData({ name: '', description: '' });
    setError(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên loại hoạt động');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (editingType) {
        // Update
        const payload: UpdateActivityTypeRequest = {
          name: formData.name.trim(),
          description: formData.description.trim(),
        };
        await activityTypeService.updateActivityType(editingType.id, payload);
        Alert.alert('Thành công', 'Cập nhật loại hoạt động thành công');
      } else {
        // Create
        const payload: CreateActivityTypeRequest = {
          name: formData.name.trim(),
          description: formData.description.trim(),
        };
        await activityTypeService.createActivityType(payload);
        Alert.alert('Thành công', 'Tạo loại hoạt động thành công');
      }
      
      handleCloseModal();
      fetchActivityTypes(true);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        editingType
          ? 'Không thể cập nhật loại hoạt động'
          : 'Không thể tạo loại hoạt động';
      Alert.alert('Lỗi', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (type: ActivityType) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa loại hoạt động "${type.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setDeleteLoading(type.id);
            try {
              await activityTypeService.deleteActivityType(type.id);
              Alert.alert('Thành công', 'Xóa loại hoạt động thành công');
              fetchActivityTypes(true);
            } catch (error: any) {
              const message =
                error?.response?.data?.message ||
                error?.message ||
                'Không thể xóa loại hoạt động';
              Alert.alert('Lỗi', message);
            } finally {
              setDeleteLoading(null);
            }
          },
        },
      ]
    );
  };

  if (loading && activityTypes.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Đang tải loại hoạt động...</Text>
        </View>
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
            colors={[COLORS.PRIMARY]}
            tintColor={COLORS.PRIMARY}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Loại Hoạt Động</Text>
              <Text style={styles.headerSubtitle}>
                Quản lý các loại hoạt động có thể tạo cho học sinh
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleOpenCreateModal}
              activeOpacity={0.7}
            >
              <MaterialIcons name="add" size={24} color={COLORS.SURFACE} />
            </TouchableOpacity>
          </View>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={42} color={COLORS.ERROR} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchActivityTypes()}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : activityTypes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="category" size={64} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.emptyText}>Chưa có loại hoạt động nào</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {activityTypes.map((type) => (
              <View key={type.id} style={styles.typeCard}>
                <View style={styles.typeIcon}>
                  <MaterialIcons name="category" size={24} color={COLORS.PRIMARY} />
                </View>
                <View style={styles.typeContent}>
                  <Text style={styles.typeName}>{type.name}</Text>
                  {type.description && (
                    <Text style={styles.typeDescription}>{type.description}</Text>
                  )}
                </View>
                <View style={styles.typeActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleOpenEditModal(type)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="edit" size={20} color={COLORS.PRIMARY} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDelete(type)}
                    activeOpacity={0.7}
                    disabled={deleteLoading === type.id}
                  >
                    {deleteLoading === type.id ? (
                      <ActivityIndicator size="small" color={COLORS.ERROR} />
                    ) : (
                      <MaterialIcons name="delete" size={20} color={COLORS.ERROR} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={handleCloseModal}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingType ? 'Chỉnh sửa loại hoạt động' : 'Thêm loại hoạt động mới'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.label}>Tên loại hoạt động *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Nhập tên loại hoạt động"
                  placeholderTextColor={COLORS.TEXT_SECONDARY}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Mô tả</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Nhập mô tả (tùy chọn)"
                  placeholderTextColor={COLORS.TEXT_SECONDARY}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <MaterialIcons name="error-outline" size={20} color={COLORS.ERROR} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                mode="outlined"
                onPress={handleCloseModal}
                style={styles.cancelButton}
                disabled={submitting}
              >
                Hủy
              </Button>
              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={submitting}
                disabled={submitting || !formData.name.trim()}
                style={styles.submitButton}
              >
                {editingType ? 'Cập nhật' : 'Tạo mới'}
              </Button>
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
  content: {
    padding: SPACING.MD,
    paddingBottom: SPACING.XL,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  header: {
    marginBottom: SPACING.LG,
  },
  headerTitle: {
    fontSize: FONTS.SIZES.XXL,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  headerSubtitle: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  errorContainer: {
    alignItems: 'center',
    padding: SPACING.LG,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  errorText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.ERROR,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SPACING.MD,
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    borderRadius: 12,
  },
  retryButtonText: {
    color: COLORS.SURFACE,
    fontWeight: '600',
    fontSize: FONTS.SIZES.SM,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: SPACING.XL,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderStyle: 'dashed',
  },
  emptyText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  listContainer: {
    gap: SPACING.SM,
  },
  typeCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.INFO_BG,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  typeContent: {
    flex: 1,
  },
  typeName: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  typeDescription: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTextContainer: {
    flex: 1,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  typeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.INFO_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: COLORS.ERROR_BG,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 0 : SPACING.MD,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  modalTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  closeButton: {
    padding: SPACING.XS,
  },
  modalBody: {
    padding: SPACING.MD,
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: SPACING.MD,
  },
  label: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    padding: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.SURFACE,
  },
  textArea: {
    minHeight: 100,
    paddingTop: SPACING.MD,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.ERROR_BG,
    padding: SPACING.MD,
    borderRadius: 12,
    marginTop: SPACING.SM,
    gap: SPACING.SM,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: SPACING.SM,
    padding: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});

export default ActivityTypesScreen;

