import React, { useEffect, useState, useMemo, forwardRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import CustomPicker from '../../components/CustomPicker';
import { StudentResponse } from '../../types/api';
import { COLORS } from '../../constants';

interface Branch {
  id: string;
  branchName: string;
  address?: string;
}

interface Step1ChildAndBranchProps {
  data: any;
  updateData: (data: any) => void;
  children: StudentResponse[];
  branches: Branch[];
  isLoading?: boolean;
}

const Step1ChildAndBranch = forwardRef<any, Step1ChildAndBranchProps>(({
  data = {},
  updateData,
  children = [],
  branches = [],
  isLoading = false
}, ref) => {
  const selectedChild = data.studentId ? children.find(c => c.id === data.studentId) : null;

  const handleStudentChange = (studentId: string) => {
    updateData({
      ...(data || {}),
      studentId,
      targetBranchId: '' // Reset branch selection when changing child
    });
  };

  const handleBranchChange = (targetBranchId: string) => {
    updateData({
      ...(data || {}),
      targetBranchId
    });
  };

  const currentBranch = useMemo(() => {
    if (!selectedChild) return null;
    // First try to get branch info directly from child data
    const branchNameFromChild = selectedChild.branchName;
    const branchIdFromChild = selectedChild.branchId;

    // If we have branch info from child, return it as is
    if (branchNameFromChild && branchIdFromChild) {
      return {
        id: branchIdFromChild,
        branchName: branchNameFromChild,
        address: 'Địa chỉ chưa cập nhật'
      };
    }

    // Otherwise, try to find in branches array
    return branchIdFromChild ? branches.find(b => b.id === branchIdFromChild) : null;
  }, [selectedChild?.branchId, selectedChild?.branchName, branches]);

  const targetBranch = useMemo(() =>
    data.targetBranchId ? branches.find(b => b.id === data.targetBranchId) : null,
    [data.targetBranchId, branches]
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Chọn con và chi nhánh đích</Text>

      {/* Child Selection */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="child-care" size={24} color={COLORS.PRIMARY} />
          <Text style={styles.sectionTitle}>Chọn con</Text>
        </View>

        <CustomPicker
          selectedValue={data.studentId || ''}
          onValueChange={handleStudentChange}
          items={children.map(child => ({
            label: child.name || child.userName || 'Chưa có tên',
            value: child.id
          }))}
          placeholder="Chọn con"
          enabled={!isLoading}
        />

        {selectedChild && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Thông tin chi nhánh hiện tại:</Text>
            <View style={styles.branchInfo}>
              <MaterialIcons name="business" size={20} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.branchName}>
                {currentBranch?.branchName || 'Chi nhánh chưa xác định'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Branch Selection */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="business" size={24} color={COLORS.PRIMARY} />
          <Text style={styles.sectionTitle}>Chọn chi nhánh đích</Text>
        </View>

        <CustomPicker
          selectedValue={data.targetBranchId || ''}
          onValueChange={handleBranchChange}
          items={branches
            .filter(branch => branch.id !== selectedChild?.branchId)
            .map(branch => ({
              label: `${branch.branchName}${branch.address ? ` - ${branch.address}` : ''}`,
              value: branch.id
            }))}
          placeholder="Chi nhánh đích"
          enabled={!isLoading && !!selectedChild}
        />

        {targetBranch && (
          <View style={styles.targetBranchCard}>
            <Text style={styles.targetBranchTitle}>Chi nhánh đích đã chọn:</Text>
            <View style={styles.branchInfo}>
              <MaterialIcons name="business" size={20} color={COLORS.SUCCESS} />
              <Text style={styles.targetBranchName}>{targetBranch.branchName}</Text>
            </View>
            <Text style={styles.targetBranchAddress}>{targetBranch.address}</Text>
          </View>
        )}

        {selectedChild && data.targetBranchId && currentBranch && targetBranch && (
          <View style={styles.transferSummary}>
            <Text style={styles.transferText}>
              ✓ Chuyển từ {currentBranch.branchName} sang {targetBranch.branchName}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
});

Step1ChildAndBranch.displayName = 'Step1ChildAndBranch';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginVertical: 20,
  },
  section: {
    backgroundColor: COLORS.SURFACE,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  infoCard: {
    marginTop: 16,
    padding: 12,
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 8,
  },
  branchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  branchName: {
    fontSize: 16,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  targetBranchCard: {
    marginTop: 16,
    padding: 12,
    backgroundColor: COLORS.SUCCESS + '15',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.SUCCESS + '30',
  },
  targetBranchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.SUCCESS,
    marginBottom: 8,
  },
  targetBranchName: {
    fontSize: 16,
    color: COLORS.SUCCESS,
    fontWeight: '600',
  },
  targetBranchAddress: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
  },
  transferSummary: {
    marginTop: 16,
    padding: 12,
    backgroundColor: COLORS.SUCCESS + '10',
    borderRadius: 8,
  },
  transferText: {
    fontSize: 14,
    color: COLORS.SUCCESS,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default Step1ChildAndBranch;
