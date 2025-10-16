import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Child } from '../types';

// Inline constants
const COLORS = {
  SURFACE: '#FFFFFF',
  PRIMARY: '#2E7D32',
  TEXT_PRIMARY: '#212121',
  TEXT_SECONDARY: '#757575',
  BORDER: '#E0E0E0',
  ACCENT: '#2196F3',
  BACKGROUND: '#F5F5F5',
  SHADOW: '#000000',
};

const SPACING = {
  SM: 8,
  MD: 16,
  LG: 24,
};

const FONTS = {
  SIZES: {
    XS: 12,
    SM: 14,
    MD: 16,
    LG: 18,
  },
};

interface ChildCardProps {
  child: Child;
  onPress: () => void;
  onEditPress: () => void;
}

const ChildCard: React.FC<ChildCardProps> = ({ child, onPress, onEditPress }) => {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.avatarContainer}>
        {child.avatar ? (
          <Image source={{ uri: child.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {getInitials(child.firstName, child.lastName)}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.childInfo}>
        <Text style={styles.childName}>
          {child.firstName} {child.lastName}
        </Text>
        <Text style={styles.childDetails}>
          {getAge(child.dateOfBirth)} tuổi • Lớp {child.grade}
        </Text>
        <Text style={styles.childSchool}>{child.school}</Text>
        
        {child.nfcCardId && (
          <View style={styles.nfcBadge}>
            <Ionicons name="card" size={12} color={COLORS.PRIMARY} />
            <Text style={styles.nfcText}>NFC Card</Text>
          </View>
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.editButton} 
        onPress={(e) => {
          e.stopPropagation();
          onEditPress();
        }}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.TEXT_SECONDARY} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    padding: SPACING.MD,
    marginHorizontal: SPACING.MD,
    marginBottom: SPACING.SM,
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
  avatarContainer: {
    marginRight: SPACING.MD,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.SURFACE,
    fontSize: FONTS.SIZES.MD,
    fontWeight: 'bold',
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  childDetails: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 2,
  },
  childSchool: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 4,
  },
  nfcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  nfcText: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.PRIMARY,
    marginLeft: 4,
    fontWeight: '500',
  },
  editButton: {
    padding: SPACING.SM,
  },
});

export default ChildCard;
