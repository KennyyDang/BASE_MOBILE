import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { COLORS } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import ProfileScreenComponent from '../../components/ProfileScreen';

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();

  const handleEditProfile = () => {
    Alert.alert('Chỉnh sửa hồ sơ', 'Tính năng đang được phát triển');
  };

  const handleAddChild = () => {
    Alert.alert('Thêm con em', 'Tính năng đang được phát triển');
  };

  const handleEditChild = (childId: string) => {
    Alert.alert('Chỉnh sửa con em', `Chỉnh sửa thông tin con em ID: ${childId}`);
  };

  const handleViewChild = (childId: string) => {
    Alert.alert('Xem chi tiết', `Xem thông tin chi tiết con em ID: ${childId}`);
  };

  const handleSettings = () => {
    Alert.alert('Cài đặt', 'Tính năng đang được phát triển');
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
          onPress: logout,
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        {/* Loading component would go here */}
      </View>
    );
  }

  return (
    <ProfileScreenComponent
      user={user}
      onEditProfile={handleEditProfile}
      onAddChild={handleAddChild}
      onEditChild={handleEditChild}
      onViewChild={handleViewChild}
      onSettings={handleSettings}
      onLogout={handleLogout}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProfileScreen;
