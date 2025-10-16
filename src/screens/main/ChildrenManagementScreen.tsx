import React, { useState } from 'react';
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

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

// Mock data for demo
const MOCK_CHILDREN = [
  {
    id: '1',
    name: 'Nguyễn Minh Anh',
    age: 8,
    grade: 'Lớp 3',
    avatar: '👦',
    status: 'active',
    classes: ['Toán học', 'Tiếng Anh'],
    attendance: 95,
    lastActivity: '2 giờ trước',
  },
  {
    id: '2',
    name: 'Nguyễn Thị Lan',
    age: 10,
    grade: 'Lớp 5',
    avatar: '👧',
    status: 'active',
    classes: ['Toán học', 'Tiếng Việt', 'Khoa học'],
    attendance: 88,
    lastActivity: '1 ngày trước',
  },
];

const ChildrenManagementScreen: React.FC = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState(MOCK_CHILDREN);
  const [loading, setLoading] = useState(false);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const handleAddChild = () => {
    Alert.alert(
      'Thêm con',
      'Tính năng đang được phát triển.\nSẽ có sớm trong phiên bản tiếp theo.',
      [{ text: 'Đóng', style: 'default' }]
    );
  };

  const handleEditChild = (child: any) => {
    setSelectedChild(child);
    setModalVisible(true);
  };

  const handleViewDetails = (child: any) => {
    Alert.alert(
      'Chi tiết con',
      `Tên: ${child.name}\nTuổi: ${child.age}\nLớp: ${child.grade}\nLớp học: ${child.classes.join(', ')}\nĐiểm danh: ${child.attendance}%`,
      [{ text: 'Đóng', style: 'default' }]
    );
  };

  const handleAttendance = (child: any) => {
    Alert.alert(
      'Điểm danh',
      `Xem lịch điểm danh của ${child.name}`,
      [{ text: 'Đóng', style: 'default' }]
    );
  };

  const handleClasses = (child: any) => {
    Alert.alert(
      'Lớp học',
      `${child.name} đang học:\n${child.classes.map((cls: string) => `• ${cls}`).join('\n')}`,
      [{ text: 'Đóng', style: 'default' }]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return COLORS.SUCCESS;
      case 'inactive': return COLORS.ERROR;
      case 'pending': return COLORS.WARNING;
      default: return COLORS.TEXT_SECONDARY;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Hoạt động';
      case 'inactive': return 'Tạm nghỉ';
      case 'pending': return 'Chờ duyệt';
      default: return 'Không xác định';
    }
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
            <Text style={styles.statNumber}>{children.length}</Text>
            <Text style={styles.statLabel}>Tổng số con</Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialIcons name="school" size={24} color={COLORS.SECONDARY} />
            <Text style={styles.statNumber}>
              {children.reduce((sum, child) => sum + child.classes.length, 0)}
            </Text>
            <Text style={styles.statLabel}>Lớp học</Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialIcons name="check-circle" size={24} color={COLORS.SUCCESS} />
            <Text style={styles.statNumber}>
              {Math.round(children.reduce((sum, child) => sum + child.attendance, 0) / children.length)}%
            </Text>
            <Text style={styles.statLabel}>Điểm danh TB</Text>
          </View>
        </View>

        {/* Children List */}
        <View style={styles.childrenContainer}>
          <Text style={styles.sectionTitle}>Danh sách con</Text>
          
          {children.map((child) => (
            <View key={child.id} style={styles.childCard}>
              <View style={styles.childHeader}>
                <View style={styles.childAvatar}>
                  <Text style={styles.avatarText}>{child.avatar}</Text>
                </View>
                <View style={styles.childInfo}>
                  <Text style={styles.childName}>{child.name}</Text>
                  <Text style={styles.childDetails}>
                    {child.age} tuổi • {child.grade}
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
                  <Text style={styles.statItemText}>{child.classes.length} lớp học</Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialIcons name="check-circle" size={16} color={COLORS.TEXT_SECONDARY} />
                  <Text style={styles.statItemText}>{child.attendance}% điểm danh</Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialIcons name="schedule" size={16} color={COLORS.TEXT_SECONDARY} />
                  <Text style={styles.statItemText}>{child.lastActivity}</Text>
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
          ))}
        </View>

        {/* Empty State */}
        {children.length === 0 && (
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
                  Tính năng đang được phát triển
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
