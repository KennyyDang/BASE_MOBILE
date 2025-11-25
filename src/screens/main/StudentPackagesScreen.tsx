import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import packageService from '../../services/packageService';
import { RootStackParamList } from '../../types';
import { StudentPackageResponse } from '../../types/api';
import { COLORS } from '../../constants';

type StudentPackagesRouteProp = RouteProp<RootStackParamList, 'StudentPackages'>;

const SPACING = {
  XS: 6,
  SM: 12,
  MD: 16,
  LG: 24,
};

const FONTS = {
  SIZES: {
    XS: 12,
    SM: 14,
    MD: 16,
    LG: 18,
    XL: 20,
  },
};

const StudentPackagesScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const {
    params: { studentId, studentName, branchName, studentLevelName },
  } = useRoute<StudentPackagesRouteProp>();

  const [packages, setPackages] = useState<StudentPackageResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await packageService.getSuitablePackages(studentId);
      setPackages(data);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách gói phù hợp');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handlePurchase = (pkg: StudentPackageResponse) => {
    Alert.alert(
      'Xác nhận mua gói',
      `Bạn muốn đăng ký gói "${pkg.name}" cho ${studentName}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đồng ý',
          onPress: async () => {
            try {
              setProcessingId(pkg.id);
              const response = await packageService.registerPackage({
                packageId: pkg.id,
                studentId,
              });
              Alert.alert('Thành công', response?.message || 'Đăng ký gói thành công.');
              navigation.goBack();
            } catch (err: any) {
              Alert.alert(
                'Lỗi',
                err?.response?.data?.message || err?.message || 'Không thể đăng ký gói.'
              );
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.PRIMARY} />
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Gói học phù hợp</Text>
          <Text style={styles.subtitle}>
            Phụ huynh đang chọn gói cho {studentName}
          </Text>
          <View style={styles.metaRow}>
            {studentLevelName ? (
              <View style={styles.metaChip}>
                <MaterialIcons name="star" size={16} color={COLORS.PRIMARY} />
                <Text style={styles.metaChipText}>{studentLevelName}</Text>
              </View>
            ) : null}
            {branchName ? (
              <View style={styles.metaChip}>
                <MaterialIcons name="location-on" size={16} color={COLORS.PRIMARY} />
                <Text style={styles.metaChipText}>{branchName}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {loading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            <Text style={styles.stateText}>Đang tải danh sách gói...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateContainer}>
            <MaterialIcons name="error-outline" size={40} color={COLORS.ERROR} />
            <Text style={[styles.stateText, { color: COLORS.ERROR, textAlign: 'center' }]}>
              {error}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchPackages}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : packages.length === 0 ? (
          <View style={styles.stateContainer}>
            <MaterialIcons name="info-outline" size={40} color={COLORS.TEXT_SECONDARY} />
            <Text style={[styles.stateText, { textAlign: 'center' }]}>
              Chưa có gói phù hợp cho học sinh này. Vui lòng liên hệ trung tâm để được tư vấn thêm.
            </Text>
          </View>
        ) : (
          packages.map((pkg) => {
            const isProcessing = processingId === pkg.id;
            return (
              <View key={pkg.id} style={styles.packageCard}>
                <View style={styles.packageHeader}>
                  <Text style={styles.packageName}>{pkg.name}</Text>
                  <Text style={styles.packagePrice}>{formatCurrency(pkg.price)}</Text>
                </View>
                <Text style={styles.packageMeta}>
                  Thời hạn: {pkg.durationInMonths} tháng • {pkg.totalSlots} buổi
                </Text>
                {pkg.desc ? <Text style={styles.packageDescription}>{pkg.desc}</Text> : null}
                {pkg.branch?.branchName ? (
                  <Text style={styles.packageMeta}>Chi nhánh: {pkg.branch.branchName}</Text>
                ) : null}
                {pkg.studentLevel?.name ? (
                  <Text style={styles.packageMeta}>Cấp độ: {pkg.studentLevel.name}</Text>
                ) : null}
                <View style={styles.benefitContainer}>
                  <Text style={styles.benefitTitle}>Quyền lợi</Text>
                  {pkg.benefits?.length ? (
                    pkg.benefits.map((benefit) => (
                      <View key={benefit.id} style={styles.benefitItem}>
                        <View style={styles.benefitDot} />
                        <Text style={styles.benefitText}>{benefit.name}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.packageMeta}>Chưa có thông tin quyền lợi</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[
                    styles.purchaseButton,
                    isProcessing && { opacity: 0.75 },
                  ]}
                  onPress={() => handlePurchase(pkg)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons
                        name="shopping-bag"
                        size={20}
                        color="#fff"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.purchaseText}>Đăng ký gói này</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
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
  content: {
    padding: SPACING.MD,
    paddingBottom: SPACING.LG,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  backButtonText: {
    marginLeft: 6,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  header: {
    marginTop: SPACING.SM,
    marginBottom: SPACING.LG,
  },
  title: {
    fontSize: FONTS.SIZES.XL,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  subtitle: {
    marginTop: 6,
    color: COLORS.TEXT_SECONDARY,
    fontSize: FONTS.SIZES.MD,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.SM,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  metaChipText: {
    marginLeft: 6,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  stateContainer: {
    marginTop: SPACING.LG,
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
  },
  stateText: {
    marginTop: SPACING.SM,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  retryButton: {
    marginTop: SPACING.MD,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.LG,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  packageCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.SM,
  },
  packageName: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    marginRight: SPACING.SM,
  },
  packagePrice: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '700',
    color: COLORS.PRIMARY,
  },
  packageMeta: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
  },
  packageDescription: {
    marginTop: 6,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
  },
  benefitContainer: {
    marginTop: SPACING.MD,
  },
  benefitTitle: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  benefitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.PRIMARY,
    marginRight: SPACING.SM,
  },
  benefitText: {
    flex: 1,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
  },
  purchaseButton: {
    marginTop: SPACING.MD,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    paddingVertical: SPACING.SM,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  purchaseText: {
    color: '#fff',
    fontSize: FONTS.SIZES.MD,
    fontWeight: '700',
  },
});

export default StudentPackagesScreen;


