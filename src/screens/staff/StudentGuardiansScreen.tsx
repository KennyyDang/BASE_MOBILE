import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { COLORS, SPACING, FONTS } from '../../constants';
import parentProfileService, { FamilyProfileResponse } from '../../services/parentProfileService';
import { RootStackParamList } from '../../types';


type StudentGuardiansRouteProp = RouteProp<RootStackParamList, 'StudentGuardians'>;
type StudentGuardiansNavigationProp = StackNavigationProp<RootStackParamList, 'StudentGuardians'>;

const StudentGuardiansScreen: React.FC = () => {
  const navigation = useNavigation<StudentGuardiansNavigationProp>();
  const route = useRoute<StudentGuardiansRouteProp>();
  const { studentId, studentName } = route.params;

  const [guardians, setGuardians] = useState<FamilyProfileResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGuardians = useCallback(async (silent = false) => {
    if (!studentId) {
      setError('Không tìm thấy thông tin học sinh');
      setLoading(false);
      return;
    }

    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await parentProfileService.getFamilyProfilesByStudentId(studentId);
      setGuardians(data);
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể tải danh sách người giám hộ. Vui lòng thử lại.';
      setError(errorMessage);
      setGuardians([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchGuardians();
  }, [fetchGuardians]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGuardians(true);
  }, [fetchGuardians]);

  const handleCall = useCallback((phoneNumber: string, guardianName: string) => {
    if (!phoneNumber) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ');
      return;
    }

    // Remove any non-digit characters except +
    const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
    
    Alert.alert(
      'Gọi điện thoại',
      `Bạn có muốn gọi cho ${guardianName}?\n${phoneNumber}`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Gọi',
          onPress: () => {
            Linking.openURL(`tel:${cleanPhone}`).catch((err) => {
              Alert.alert('Lỗi', 'Không thể mở ứng dụng gọi điện. Vui lòng thử lại.');
              console.error('Error opening phone dialer:', err);
            });
          },
        },
      ]
    );
  }, []);


  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.SURFACE} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Người giám hộ
          </Text>
          {studentName && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {studentName}
            </Text>
          )}
        </View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            colors={[COLORS.PRIMARY]}
            tintColor={COLORS.PRIMARY}
          />
        }
      >
        {loading && guardians.length === 0 ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            <Text style={styles.stateText}>Đang tải danh sách người giám hộ...</Text>
          </View>
        ) : error && guardians.length === 0 ? (
          <View style={styles.stateContainer}>
            <MaterialIcons name="error-outline" size={48} color={COLORS.ERROR} />
            <Text style={[styles.stateText, styles.errorText]}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchGuardians()}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : guardians.length === 0 ? (
          <View style={styles.stateContainer}>
            <MaterialIcons name="people-outline" size={64} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.stateText}>Chưa có người giám hộ nào</Text>
            <Text style={styles.stateSubtext}>
              Danh sách người được phép đón học sinh này sẽ hiển thị tại đây
            </Text>
          </View>
        ) : (
          <View style={styles.guardiansList}>
            {guardians.map((guardian) => (
              <View key={guardian.id} style={styles.guardianCard}>
                <View style={styles.guardianHeader}>
                  {guardian.avatar ? (
                    <Image
                      source={{ uri: guardian.avatar }}
                      style={styles.guardianAvatar}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.guardianAvatarPlaceholder}>
                      <MaterialIcons name="person" size={36} color={COLORS.PRIMARY} />
                    </View>
                  )}
                  <View style={styles.guardianInfo}>
                    <Text style={styles.guardianName}>{guardian.name}</Text>
                    {guardian.studentRela && (
                      <View style={styles.guardianRelation}>
                        <MaterialIcons name="family-restroom" size={14} color={COLORS.PRIMARY} />
                        <Text style={styles.guardianRelationText}>
                          {guardian.studentRela}
                        </Text>
                      </View>
                    )}
                    <View style={styles.guardianMeta}>
                      <MaterialIcons name="phone" size={16} color={COLORS.TEXT_SECONDARY} />
                      <Text style={styles.guardianPhone}>{guardian.phone}</Text>
                    </View>
                    {guardian.identityCardPublicId && (
                      <View style={styles.guardianMeta}>
                        <MaterialIcons name="badge" size={16} color={COLORS.TEXT_SECONDARY} />
                        <Text style={styles.guardianIdCard}>CCCD: {guardian.identityCardPublicId}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => handleCall(guardian.phone, guardian.name)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="phone" size={20} color={COLORS.SURFACE} />
                  <Text style={styles.callButtonText}>Gọi ngay</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.XL * 2,
    paddingHorizontal: SPACING.LG,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    marginTop: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderStyle: 'dashed',
  },
  stateText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    fontWeight: '600',
  },
  stateSubtext: {
    marginTop: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    height: 64,
    elevation: 4,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: SPACING.SM,
  },
  headerTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '700',
    color: COLORS.SURFACE,
  },
  headerSubtitle: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.SURFACE,
    opacity: 0.9,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.MD,
    paddingBottom: SPACING.XL,
  },
  errorText: {
    color: COLORS.ERROR,
  },
  retryButton: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    elevation: 2,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  retryButtonText: {
    color: COLORS.SURFACE,
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
  },
  guardiansList: {
    gap: SPACING.MD,
  },
  guardianCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.LG,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  guardianHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.MD,
  },
  guardianAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginRight: SPACING.MD,
    borderWidth: 3,
    borderColor: COLORS.PRIMARY_LIGHT,
  },
  guardianAvatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.PRIMARY_50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
    borderWidth: 3,
    borderColor: COLORS.PRIMARY_LIGHT,
  },
  guardianInfo: {
    flex: 1,
  },
  guardianName: {
    fontSize: FONTS.SIZES.XL,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  guardianRelation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY_50,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS + 2,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: SPACING.XS,
    marginBottom: SPACING.SM,
  },
  guardianRelationText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY_DARK,
    fontWeight: '600',
  },
  guardianMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS,
    gap: SPACING.SM,
  },
  guardianPhone: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  guardianIdCard: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.SUCCESS,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    borderRadius: 12,
    gap: SPACING.SM,
    marginTop: SPACING.SM,
    elevation: 2,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  callButtonText: {
    color: COLORS.SURFACE,
    fontSize: FONTS.SIZES.MD,
    fontWeight: '700',
  },
});

export default StudentGuardiansScreen;

