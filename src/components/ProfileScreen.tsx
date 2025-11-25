import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Parent, Child } from '../types';
import ProfileHeader from './ProfileHeader';
import ChildCard from './ChildCard';
import { COLORS } from '../constants';

const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
};

const FONTS = {
  SIZES: {
    SM: 14,
    MD: 16,
    LG: 18,
  },
};

interface ProfileScreenProps {
  user: Parent;
  onEditProfile: () => void;
  onAddChild: () => void;
  onEditChild: (childId: string) => void;
  onViewChild: (childId: string) => void;
  onSettings: () => void;
  onLogout: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onEditProfile,
  onAddChild,
  onEditChild,
  onViewChild,
  onSettings,
  onLogout,
}) => {
  const menuItems = [
    {
      id: 'settings',
      title: 'Cài đặt',
      icon: 'settings-outline',
      onPress: onSettings,
    },
    {
      id: 'notifications',
      title: 'Thông báo',
      icon: 'notifications-outline',
      onPress: () => {},
    },
    {
      id: 'help',
      title: 'Trợ giúp',
      icon: 'help-circle-outline',
      onPress: () => {},
    },
    {
      id: 'about',
      title: 'Giới thiệu',
      icon: 'information-circle-outline',
      onPress: () => {},
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <ProfileHeader user={user} onEditPress={onEditProfile} />
      
      {/* Children Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Con em ({user.children.length})</Text>
          <TouchableOpacity style={styles.addButton} onPress={onAddChild}>
            <Ionicons name="add" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.addButtonText}>Thêm con</Text>
          </TouchableOpacity>
        </View>
        
        {user.children.length > 0 ? (
          user.children.map((child) => (
            <ChildCard
              key={child.id}
              child={child}
              onPress={() => onViewChild(child.id)}
              onEditPress={() => onEditChild(child.id)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.emptyStateTitle}>Chưa có con em nào</Text>
            <Text style={styles.emptyStateSubtitle}>
              Thêm thông tin con em để quản lý lịch học và ví tiền
            </Text>
            <TouchableOpacity style={styles.emptyStateButton} onPress={onAddChild}>
              <Text style={styles.emptyStateButtonText}>Thêm con em</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Menu Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tài khoản</Text>
        {menuItems.map((item) => (
          <TouchableOpacity key={item.id} style={styles.menuItem} onPress={item.onPress}>
            <View style={styles.menuItemLeft}>
              <Ionicons name={item.icon as any} size={24} color={COLORS.TEXT_PRIMARY} />
              <Text style={styles.menuItemText}>{item.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Ionicons name="log-out-outline" size={24} color={COLORS.ERROR} />
        <Text style={styles.logoutButtonText}>Đăng xuất</Text>
      </TouchableOpacity>
      
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  section: {
    marginTop: SPACING.LG,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  sectionTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  addButtonText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    marginLeft: 4,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.XL,
    marginHorizontal: SPACING.MD,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
  },
  emptyStateTitle: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  emptyStateSubtitle: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.LG,
  },
  emptyStateButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: COLORS.SURFACE,
    fontSize: FONTS.SIZES.SM,
    fontWeight: '500',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    padding: SPACING.MD,
    marginHorizontal: SPACING.MD,
    marginBottom: SPACING.XS,
    borderRadius: 12,
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.MD,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.SURFACE,
    padding: SPACING.MD,
    marginHorizontal: SPACING.MD,
    marginTop: SPACING.LG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.ERROR,
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  logoutButtonText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.ERROR,
    marginLeft: SPACING.SM,
    fontWeight: '500',
  },
  bottomSpacing: {
    height: SPACING.XL,
  },
});

export default ProfileScreen;
