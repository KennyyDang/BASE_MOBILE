import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface BadgeIconProps {
  iconName: keyof typeof MaterialIcons.glyphMap;
  badgeCount?: number;
  onPress?: () => void;
  size?: number;
  color?: string;
  badgeColor?: string;
  badgeTextColor?: string;
}

const BadgeIcon: React.FC<BadgeIconProps> = ({
  iconName,
  badgeCount = 0,
  onPress,
  size = 24,
  color = '#FFFFFF',
  badgeColor = '#F44336',
  badgeTextColor = '#FFFFFF',
}) => {
  const showBadge = badgeCount > 0;
  const displayCount = badgeCount > 99 ? '99+' : badgeCount.toString();

  return (
    <TouchableOpacity onPress={onPress} style={styles.container} activeOpacity={0.7}>
      <MaterialIcons name={iconName} size={size} color={color} />
      {showBadge && (
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={[styles.badgeText, { color: badgeTextColor }]} numberOfLines={1}>
            {displayCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default BadgeIcon;

