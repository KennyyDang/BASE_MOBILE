import React from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, SafeAreaView, TouchableOpacity, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../contexts/AuthContext';
import { useParentProfile } from '../../hooks/useParentProfile';
import { RootStackParamList } from '../../types';

// Inline constants
const COLORS = {
  PRIMARY: '#2E7D32',
  BACKGROUND: '#F5F5F5',
  SURFACE: '#FFFFFF',
  TEXT_PRIMARY: '#212121',
  TEXT_SECONDARY: '#757575',
  BORDER: '#E0E0E0',
  ERROR: '#F44336',
};

const SPACING = {
  SM: 8,
  MD: 16,
  LG: 24,
};

const FONTS = {
  SIZES: {
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
  const { parents, loading, error, refetch } = useParentProfile();

  const handleEditProfile = () => {
    Alert.alert('Chinh sua ho so', 'Tinh nang dang duoc phat trien');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleNotifications = () => {
    navigation.navigate('Notifications');
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

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} />
        }
      >
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <MaterialIcons name="person" size={60} color={COLORS.PRIMARY} />
          </View>
          <Text style={styles.userName}>{user.email}</Text>
          <Text style={styles.userRole}>{user.role}</Text>
          <Text style={styles.userId}>ID: {user.id}</Text>
        </View>

        {/* Parent Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin phụ huynh</Text>
          
          {error && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error" size={20} color={COLORS.ERROR} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          {parents.length > 0 ? (
            parents.map((parent, index) => (
              <View key={parent.id} style={styles.parentCard}>
                <View style={styles.parentHeader}>
                  <MaterialIcons name="person" size={24} color={COLORS.PRIMARY} />
                  <Text style={styles.parentName}>{parent.parentName}</Text>
                </View>
                
                <View style={styles.parentInfo}>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="email" size={16} color={COLORS.TEXT_SECONDARY} />
                    <Text style={styles.infoText}>{parent.email}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <MaterialIcons name="phone" size={16} color={COLORS.TEXT_SECONDARY} />
                    <Text style={styles.infoText}>{parent.phone}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <MaterialIcons name="location-on" size={16} color={COLORS.TEXT_SECONDARY} />
                    <Text style={styles.infoText}>{parent.address}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <MaterialIcons name="family-restroom" size={16} color={COLORS.TEXT_SECONDARY} />
                    <Text style={styles.infoText}>{parent.relationshipToStudent}</Text>
                  </View>
                  
                  {parent.note && (
                    <View style={styles.infoRow}>
                      <MaterialIcons name="note" size={16} color={COLORS.TEXT_SECONDARY} />
                      <Text style={styles.infoText}>{parent.note}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          ) : (
            !loading && (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="person-off" size={48} color={COLORS.TEXT_SECONDARY} />
                <Text style={styles.emptyText}>Chưa có thông tin phụ huynh</Text>
              </View>
            )
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

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <MaterialIcons name="logout" size={24} color={COLORS.ERROR} />
            <Text style={[styles.menuText, { color: COLORS.ERROR }]}>Đăng xuất</Text>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.LG,
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  userName: {
    fontSize: FONTS.SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  userRole: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.PRIMARY,
    marginBottom: SPACING.SM,
  },
  userId: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  menuContainer: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    overflow: 'hidden',
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
  section: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.MD,
    marginBottom: SPACING.LG,
  },
  sectionTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: SPACING.SM,
    borderRadius: 8,
    marginBottom: SPACING.MD,
  },
  errorText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.ERROR,
    marginLeft: SPACING.SM,
    flex: 1,
  },
  parentCard: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
  },
  parentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  parentName: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.SM,
  },
  parentInfo: {
    paddingLeft: 32,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  infoText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.SM,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: SPACING.LG,
  },
  emptyText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.SM,
  },
});

export default ProfileScreen;
