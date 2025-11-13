import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Alert,
  Modal,
  ActivityIndicator,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useMyChildren } from '../../hooks/useChildrenApi';
import { StudentResponse, StudentPackageSubscription } from '../../types/api';
import { RootStackParamList } from '../../types';
import packageService from '../../services/packageService';
import childrenService from '../../services/childrenService';

// Inline constants
const COLORS = {
  PRIMARY: '#2E7D32',
  PRIMARY_LIGHT: '#4CAF50',
  SECONDARY: '#FF6F00',
  BACKGROUND: '#F5F5F5',
  SURFACE: '#FFFFFF',
  TEXT_PRIMARY: '#212121',
  TEXT_SECONDARY: '#757575',
  BORDER: '#E0E0E0',
  SUCCESS: '#4CAF50',
  WARNING: '#FF9800',
  ERROR: '#F44336',
  ACCENT: '#2196F3',
  SHADOW: '#000000',
};

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

const ChildrenManagementScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { students, loading, error, refetch } = useMyChildren();
  const [selectedChild, setSelectedChild] = useState<StudentResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDateOfBirth, setEditDateOfBirth] = useState('');
  const [editNote, setEditNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [studentPackages, setStudentPackages] = useState<
    Record<
      string,
      {
        loading: boolean;
        data: StudentPackageSubscription[];
        error: string | null;
      }
    >
  >({});

  // Show error alert
  useEffect(() => {
    if (error) {
      Alert.alert('Lỗi', error, [
        { text: 'Thử lại', onPress: () => refetch() },
        { text: 'Đóng', style: 'cancel' },
      ]);
    }
  }, [error, refetch]);

  const handleRefresh = async () => {
    await refetch();
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const handleAddChild = () => {
    Alert.alert(
      'Thêm con',
      'Tính năng đang được phát triển.\nSẽ có sớm trong phiên bản tiếp theo.',
      [{ text: 'Đóng', style: 'default' }]
    );
  };

  const handleEditChild = (child: StudentResponse) => {
    setSelectedChild(child);
    setEditName(child.name || '');
    setEditDateOfBirth(child.dateOfBirth ? new Date(child.dateOfBirth).toISOString().split('T')[0] : '');
    setEditNote(child.note || '');
    setModalVisible(true);
  };

  const handleUpdateChild = async () => {
    if (!selectedChild) return;

    if (!editName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên của con.');
      return;
    }

    setUpdating(true);
    try {
      const updateData: {
        name?: string;
        dateOfBirth?: string;
        note?: string;
      } = {};

      if (editName.trim() !== selectedChild.name) {
        updateData.name = editName.trim();
      }

      if (editDateOfBirth && editDateOfBirth !== new Date(selectedChild.dateOfBirth).toISOString().split('T')[0]) {
        // Convert date to ISO string
        const date = new Date(editDateOfBirth);
        updateData.dateOfBirth = date.toISOString();
      }

      if (editNote.trim() !== (selectedChild.note || '')) {
        updateData.note = editNote.trim();
      }

      if (Object.keys(updateData).length === 0) {
        Alert.alert('Thông báo', 'Không có thay đổi nào để cập nhật.');
        setUpdating(false);
        return;
      }

      await childrenService.updateChildByParent(selectedChild.id, updateData);
      Alert.alert('Thành công', 'Cập nhật thông tin con thành công.');
      setModalVisible(false);
      refetch();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Không thể cập nhật thông tin con. Vui lòng thử lại.';
      Alert.alert('Lỗi', message);
    } finally {
      setUpdating(false);
    }
  };

  const handleViewDetails = (child: StudentResponse) => {
    Alert.alert(
      'Chi tiết học sinh',
      `Tên: ${child.name}\nNgày sinh: ${formatDate(child.dateOfBirth)}\nTrường: ${child.schoolName || 'Chưa có'}\nCấp độ: ${child.studentLevelName || 'Chưa có'}\nChi nhánh: ${child.branchName || 'Chưa có'}`,
      [{ text: 'Đóng', style: 'default' }]
    );
  };

  const handleAttendance = (child: StudentResponse) => {
    Alert.alert(
      'Điểm danh',
      `Xem lịch điểm danh của ${child.name}`,
      [{ text: 'Đóng', style: 'default' }]
    );
  };

  const handleClasses = (child: StudentResponse) => {
    Alert.alert(
      'Lớp học',
      `${child.name}\nTrường: ${child.schoolName || 'Chưa có'}\nCấp độ: ${child.studentLevelName || 'Chưa có'}`,
      [{ text: 'Đóng', style: 'default' }]
    );
  };

  const handleViewPackages = (child: StudentResponse) => {
    navigation.navigate('StudentPackages', {
      studentId: child.id,
      studentName: child.name,
      branchName: child.branchName || '',
      studentLevelName: child.studentLevelName || '',
    });
  };

  // Track which students have been fetched to prevent duplicate fetches
  const fetchedStudentsRef = useRef<Set<string>>(new Set());

  const fetchStudentPackages = useCallback(async (studentId: string) => {
    // Mark as fetching
    fetchedStudentsRef.current.add(studentId);
    
    setStudentPackages((prev) => ({
      ...prev,
      [studentId]: {
        data: prev[studentId]?.data || [],
        loading: true,
        error: null,
      },
    }));

    try {
      const data = await packageService.getStudentSubscriptions(studentId);
      setStudentPackages((prev) => ({
        ...prev,
        [studentId]: {
          data,
          loading: false,
          error: null,
        },
      }));
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể tải gói đã đăng ký. Vui lòng thử lại.';
      setStudentPackages((prev) => ({
        ...prev,
        [studentId]: {
          data: prev[studentId]?.data || [],
          loading: false,
          error: message,
        },
      }));
    }
  }, []);

  useEffect(() => {
    if (!students.length) {
      setStudentPackages({});
      fetchedStudentsRef.current.clear();
      return;
    }

    // Fetch packages for students that haven't been fetched yet
    students.forEach((student) => {
      if (!fetchedStudentsRef.current.has(student.id)) {
        fetchStudentPackages(student.id);
      }
    });
  }, [students, fetchStudentPackages]);

  const handleRetryPackages = (studentId: string) => {
    // Remove from fetched set to allow retry
    fetchedStudentsRef.current.delete(studentId);
    fetchStudentPackages(studentId);
  };


  const getStatusColor = (status: boolean) => {
    return status ? COLORS.SUCCESS : COLORS.ERROR;
  };

  const getStatusText = (status: boolean) => {
    return status ? 'Hoạt động' : 'Tạm nghỉ';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Quản lý con</Text>
            <Text style={styles.headerSubtitle}>
              Quản lý thông tin và hoạt động của con bạn
            </Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleAddChild}>
            <MaterialIcons name="add" size={24} color={COLORS.SURFACE} />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialIcons name="child-care" size={24} color={COLORS.PRIMARY} />
            {loading && !students.length ? (
              <ActivityIndicator size="small" color={COLORS.PRIMARY} style={{ marginTop: SPACING.SM }} />
            ) : (
              <Text style={styles.statNumber}>{students.length}</Text>
            )}
            <Text style={styles.statLabel}>Tổng số con</Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialIcons name="school" size={24} color={COLORS.SECONDARY} />
            {loading && !students.length ? (
              <ActivityIndicator size="small" color={COLORS.SECONDARY} style={{ marginTop: SPACING.SM }} />
            ) : (
              <Text style={styles.statNumber}>
                {students.filter(s => s.schoolName).length}
              </Text>
            )}
            <Text style={styles.statLabel}>Có trường học</Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialIcons name="check-circle" size={24} color={COLORS.SUCCESS} />
            {loading && !students.length ? (
              <ActivityIndicator size="small" color={COLORS.SUCCESS} style={{ marginTop: SPACING.SM }} />
            ) : (
              <Text style={styles.statNumber}>
                {students.filter(s => s.status).length}
              </Text>
            )}
            <Text style={styles.statLabel}>Đang hoạt động</Text>
          </View>
        </View>

        {/* Children List */}
        <View style={styles.childrenContainer}>
          <Text style={styles.sectionTitle}>Danh sách con</Text>
          
          {loading && !students.length ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
              <Text style={styles.loadingText}>Đang tải danh sách học sinh...</Text>
            </View>
          ) : (
            students.map((child) => (
              <View key={child.id} style={styles.childCard}>
                <View style={styles.childHeader}>
                  <View style={styles.childAvatar}>
                    <Text style={styles.avatarText}>
                      {child.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.childInfo}>
                    <Text style={styles.childName}>{child.name}</Text>
                    <Text style={styles.childDetails}>
                      {child.studentLevelName || 'Chưa có cấp độ'}
                    </Text>
                    <View style={styles.statusContainer}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(child.status) }]} />
                      <Text style={styles.statusText}>{getStatusText(child.status)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.moreButton}
                    onPress={() => handleEditChild(child)}
                  >
                    <MaterialIcons name="more-vert" size={24} color={COLORS.TEXT_SECONDARY} />
                  </TouchableOpacity>
                </View>

                <View style={styles.childStats}>
                  <View style={styles.statItem}>
                    <MaterialIcons name="school" size={16} color={COLORS.TEXT_SECONDARY} />
                    <Text style={styles.statItemText} numberOfLines={1}>
                      {child.schoolName || 'Chưa có trường'}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <MaterialIcons name="location-on" size={16} color={COLORS.TEXT_SECONDARY} />
                    <Text style={styles.statItemText} numberOfLines={1}>
                      {child.branchName || 'Chưa có chi nhánh'}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <MaterialIcons name="date-range" size={16} color={COLORS.TEXT_SECONDARY} />
                    <Text style={styles.statItemText} numberOfLines={1}>
                      {formatDate(child.dateOfBirth)}
                    </Text>
                  </View>
                </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={() => handleViewDetails(child)}
                >
                  <MaterialIcons name="visibility" size={16} color={COLORS.SURFACE} />
                  <Text style={styles.actionButtonText}>Chi tiết</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.secondaryButton]}
                  onPress={() => handleAttendance(child)}
                >
                  <MaterialIcons name="check-circle" size={16} color={COLORS.PRIMARY} />
                  <Text style={[styles.actionButtonText, { color: COLORS.PRIMARY }]}>Điểm danh</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.secondaryButton]}
                  onPress={() => handleClasses(child)}
                >
                  <MaterialIcons name="school" size={16} color={COLORS.SECONDARY} />
                  <Text style={[styles.actionButtonText, { color: COLORS.SECONDARY }]}>Lớp học</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.tertiaryButton]}
                  onPress={() => handleViewPackages(child)}
                >
                  <MaterialIcons name="shopping-cart" size={16} color={COLORS.PRIMARY} />
                  <Text style={[styles.actionButtonText, { color: COLORS.PRIMARY }]}>Gói học</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.packageContainer}>
                <View style={styles.packageHeader}>
                  <MaterialIcons name="card-membership" size={18} color={COLORS.PRIMARY} />
                  <Text style={styles.packageTitle}>Gói đã đăng ký</Text>
                </View>
                {studentPackages[child.id]?.loading ? (
                  <View style={styles.packageStateRow}>
                    <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                    <Text style={styles.packageStateText}>Đang tải gói đã đăng ký...</Text>
                  </View>
                ) : studentPackages[child.id]?.error ? (
                  <View>
                    <View style={styles.packageStateRow}>
                      <MaterialIcons name="error-outline" size={18} color={COLORS.ERROR} />
                      <Text style={[styles.packageStateText, { color: COLORS.ERROR }]}>
                        {studentPackages[child.id]?.error}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.packageRetryButton}
                      onPress={() => handleRetryPackages(child.id)}
                    >
                      <Text style={styles.packageRetryText}>Thử lại</Text>
                    </TouchableOpacity>
                  </View>
                ) : studentPackages[child.id]?.data?.length ? (
                  studentPackages[child.id].data.map((subscription) => (
                    <View key={subscription.id} style={styles.packageCard}>
                      <View style={styles.packageCardHeader}>
                        <Text style={styles.packageName}>{subscription.packageName}</Text>
                        <View
                          style={[
                            styles.packageStatusBadge,
                            subscription.status === 'Active'
                              ? styles.packageStatusActive
                              : styles.packageStatusInactive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.packageStatusText,
                              subscription.status === 'Active'
                                ? { color: COLORS.SURFACE }
                                : { color: COLORS.TEXT_PRIMARY },
                            ]}
                          >
                            {subscription.status === 'Active' ? 'Đang hiệu lực' : subscription.status}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.packageDate}>
                        Bắt đầu: {formatDate(subscription.startDate)} • Kết thúc: {formatDate(subscription.endDate)}
                      </Text>
                      <Text style={styles.packageUsedSlot}>
                        {(() => {
                          const total = subscription.totalSlotsSnapshot ?? subscription.totalSlots ?? subscription.remainingSlots;
                          let totalDisplay: number | string = '?';
                          if (typeof total === 'number') {
                            totalDisplay = total;
                          } else {
                            // Try to parse from packageName
                            const nameMatch = subscription.packageName?.match(/(\d+)/);
                            if (nameMatch) {
                              totalDisplay = parseInt(nameMatch[1], 10);
                            }
                          }
                          const used = subscription.usedSlot || 0;
                          const remaining = typeof totalDisplay === 'number' 
                            ? Math.max(totalDisplay - used, 0) 
                            : undefined;
                          
                          return `Số buổi đã dùng: ${used}${typeof totalDisplay === 'number' ? ` / ${totalDisplay}` : ''}${remaining !== undefined ? ` • Còn lại: ${remaining}` : ''}`;
                        })()}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.packageStateText}>
                    Chưa có gói nào được đăng ký cho học sinh này.
                  </Text>
                )}
              </View>
            </View>
            ))
          )}
        </View>

        {/* Empty State */}
        {!loading && students.length === 0 && (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="child-care" size={64} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.emptyTitle}>Chưa có con nào</Text>
            <Text style={styles.emptySubtitle}>
              Thêm con đầu tiên để bắt đầu quản lý
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddChild}>
              <Text style={styles.emptyButtonText}>Thêm con</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setModalVisible(false);
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa thông tin</Text>
              <TouchableOpacity 
                onPress={() => {
                  Keyboard.dismiss();
                  setModalVisible(false);
                }}
              >
                <MaterialIcons name="close" size={24} color={COLORS.TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>
            
            {selectedChild && (
              <ScrollView 
                style={styles.modalBody}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalFormGroup}>
                  <Text style={styles.modalLabel}>Tên *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Nhập tên của con"
                    placeholderTextColor={COLORS.TEXT_SECONDARY}
                  />
                </View>

                <View style={styles.modalFormGroup}>
                  <Text style={styles.modalLabel}>Ngày sinh</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editDateOfBirth}
                    onChangeText={setEditDateOfBirth}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.TEXT_SECONDARY}
                  />
                  <Text style={styles.modalHint}>Định dạng: YYYY-MM-DD (ví dụ: 2010-01-15)</Text>
                </View>

                <View style={styles.modalFormGroup}>
                  <Text style={styles.modalLabel}>Ghi chú</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextArea]}
                    value={editNote}
                    onChangeText={setEditNote}
                    placeholder="Nhập ghi chú (nếu có)"
                    placeholderTextColor={COLORS.TEXT_SECONDARY}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <Text style={styles.modalSubtext}>
                  Trường: {selectedChild.schoolName || 'Chưa có'}{'\n'}
                  Cấp độ: {selectedChild.studentLevelName || 'Chưa có'}
                </Text>
              </ScrollView>
            )}
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  Keyboard.dismiss();
                  setModalVisible(false);
                }}
                disabled={updating}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonCancelText]}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, updating && styles.modalButtonDisabled]}
                onPress={() => {
                  Keyboard.dismiss();
                  handleUpdateChild();
                }}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color={COLORS.SURFACE} />
                ) : (
                  <Text style={styles.modalButtonText}>Cập nhật</Text>
                )}
              </TouchableOpacity>
            </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FONTS.SIZES.XXL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  headerSubtitle: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  addButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    padding: SPACING.MD,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.LG,
  },
  statCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: SPACING.XS,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.SM,
  },
  statLabel: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.XS,
  },
  childrenContainer: {
    marginBottom: SPACING.LG,
  },
  sectionTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  childCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  childAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  avatarText: {
    fontSize: 24,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  childDetails: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.XS,
  },
  statusText: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
  moreButton: {
    padding: SPACING.SM,
  },
  childStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.MD,
    paddingHorizontal: SPACING.SM,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statItemText: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.XS,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: SPACING.XS,
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  secondaryButton: {
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  tertiaryButton: {
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY + '33',
  },
  actionButtonText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    marginLeft: SPACING.XS,
  },
  packageContainer: {
    marginTop: SPACING.MD,
    padding: SPACING.MD,
    borderRadius: 12,
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  packageTitle: {
    marginLeft: SPACING.SM,
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  packageStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  packageStateText: {
    marginLeft: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    flex: 1,
  },
  packageRetryButton: {
    alignSelf: 'flex-start',
    marginTop: SPACING.XS,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  packageRetryText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  packageCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.SM,
    marginBottom: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  packageCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.XS,
  },
  packageName: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    marginRight: SPACING.SM,
  },
  packageStatusBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 10,
  },
  packageStatusActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  packageStatusInactive: {
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  packageStatusText: {
    fontSize: FONTS.SIZES.XS,
    fontWeight: '600',
  },
  packageDate: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
  packageUsedSlot: {
    marginTop: SPACING.XS,
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: SPACING.XL,
  },
  emptyTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  emptySubtitle: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.LG,
  },
  emptyButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: SPACING.XL,
  },
  loadingText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.MD,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.LG,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  modalTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  modalBody: {
    marginBottom: SPACING.LG,
    maxHeight: 400,
  },
  modalText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  modalSubtext: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  modalFormGroup: {
    marginBottom: SPACING.MD,
  },
  modalLabel: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.SURFACE,
  },
  modalTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalHint: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS,
  },
  modalButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.LG,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginLeft: SPACING.SM,
  },
  modalButtonCancel: {
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginLeft: 0,
  },
  modalButtonCancelText: {
    color: COLORS.TEXT_PRIMARY,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.MD,
  },
});

export default ChildrenManagementScreen;
