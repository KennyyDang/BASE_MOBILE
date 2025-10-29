import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrentUserStudents } from '../../hooks/useChildrenApi';
import { StudentResponse } from '../../types/api';

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
  const { user } = useAuth();
  const { students, loading, error, refetch, pagination } = useCurrentUserStudents(1, 10);
  const [selectedChild, setSelectedChild] = useState<StudentResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

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

  // Calculate age from dateOfBirth
  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
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
    setModalVisible(true);
  };

  const handleViewDetails = (child: StudentResponse) => {
    Alert.alert(
      'Chi tiết học sinh',
      `Tên: ${child.name}\nTuổi: ${child.age} tuổi\nNgày sinh: ${formatDate(child.dateOfBirth)}\nTrường: ${child.schoolName || 'Chưa có'}\nCấp độ: ${child.studentLevelName || 'Chưa có'}\nChi nhánh: ${child.branchName || 'Chưa có'}`,
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
              <Text style={styles.statNumber}>{pagination?.totalCount || students.length}</Text>
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
                      {child.age} tuổi • {child.studentLevelName || 'Chưa có cấp độ'}
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
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa thông tin</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>
            
            {selectedChild && (
              <View style={styles.modalBody}>
                <Text style={styles.modalText}>
                  Chỉnh sửa thông tin của {selectedChild.name}
                </Text>
                <Text style={styles.modalSubtext}>
                  Tuổi: {selectedChild.age}{'\n'}
                  Trường: {selectedChild.schoolName || 'Chưa có'}{'\n'}
                  Cấp độ: {selectedChild.studentLevelName || 'Chưa có'}
                </Text>
                <Text style={[styles.modalSubtext, { marginTop: SPACING.MD }]}>
                  Tính năng chỉnh sửa đang được phát triển
                </Text>
              </View>
            )}
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  actionButtonText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    marginLeft: SPACING.XS,
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
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.LG,
    borderRadius: 8,
  },
  modalButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
});

export default ChildrenManagementScreen;
