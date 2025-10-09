import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Parent } from '../types';

// Inline constants
const COLORS = {
  SURFACE: '#FFFFFF',
  PRIMARY: '#2E7D32',
  TEXT_PRIMARY: '#212121',
  TEXT_SECONDARY: '#757575',
};

const SPACING = {
  MD: 16,
  LG: 24,
};

const FONTS = {
  SIZES: {
    LG: 18,
    XL: 20,
    XXL: 24,
  },
};

interface ProfileHeaderProps {
  user: Parent;
  onEditPress: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user, onEditPress }) => {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        {user.avatar ? (
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {getInitials(user.firstName, user.lastName)}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {user.firstName} {user.lastName}
        </Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <Text style={styles.userPhone}>{user.phone}</Text>
      </View>
      
      <TouchableOpacity style={styles.editButton} onPress={onEditPress}>
        <Ionicons name="pencil" size={20} color={COLORS.PRIMARY} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    padding: SPACING.MD,
    marginHorizontal: SPACING.MD,
    marginTop: SPACING.MD,
    borderRadius: 12,
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatarContainer: {
    marginRight: SPACING.MD,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.SURFACE,
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  editButton: {
    padding: SPACING.SM,
    borderRadius: 8,
    backgroundColor: COLORS.BACKGROUND,
  },
});

export default ProfileHeader;
