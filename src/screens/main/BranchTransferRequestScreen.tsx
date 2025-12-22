import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { COLORS } from '../../constants';
import branchTransferService from '../../services/branchTransferService';
import { useMyChildren } from '../../hooks/useChildrenApi';
import branchService from '../../services/branchService';
import schoolService from '../../services/schoolService';
import studentLevelService from '../../services/studentLevelService';

// Import step components
import Step1ChildAndBranch from './Step1ChildAndBranch';
import Step2SchoolAndLevel from './Step2SchoolAndLevel';
import Step3DocumentAndReason from './Step3DocumentAndReason';

const TRANSFER_DEFAULT_VALUES = {
  studentId: '',
  targetBranchId: '',
  changeSchool: false,
  targetSchoolId: '',
  changeLevel: false,
  targetStudentLevelId: '',
  documentFile: null,
  requestReason: ''
};

const BranchTransferRequestScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { students } = useMyChildren();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(TRANSFER_DEFAULT_VALUES);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Data states
  const [children, setChildren] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [studentLevels, setStudentLevels] = useState<any[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [students]); // Add students dependency

  const loadInitialData = async () => {
    setLoading(true);

    try {
      // Set children from hook (ensure students is loaded)
      if (students && students.length > 0) {
        setChildren(students);
      }

      // Load branches
      const branchesResponse: any = await branchService.getBranches();
      const branchesList = Array.isArray(branchesResponse)
        ? branchesResponse
        : (Array.isArray(branchesResponse?.items) ? branchesResponse.items : []);
      setBranches(branchesList);

      // Load schools
      const schoolsResponse = await schoolService.getSchoolsPaged({ pageSize: 100 }); // Get all schools
      const schoolsList = schoolsResponse.items || [];
      setSchools(schoolsList);

      // Load student levels
      const levelsResponse = await studentLevelService.getStudentLevelsPaged({ pageSize: 100 }); // Get all levels
      const levelsList = levelsResponse.items || [];
      setStudentLevels(levelsList);

      setDataLoaded(true);

    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể tải dữ liệu ban đầu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep1Complete = useCallback(async () => {
    if (!formData.studentId) {
      Alert.alert('Lỗi', 'Vui lòng chọn con');
      return false;
    }

    if (!formData.targetBranchId) {
      Alert.alert('Lỗi', 'Vui lòng chọn chi nhánh đích');
      return false;
    }

    const child = children.find((c: any) => c.id === formData.studentId);
    if (!child) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin con');
      return false;
    }

    if (child.branchId === formData.targetBranchId) {
      Alert.alert('Lỗi', 'Chi nhánh đích phải khác với chi nhánh hiện tại');
      return false;
    }

    return true;
  }, [formData.studentId, formData.targetBranchId, children]);

  const handleStep2Complete = useCallback(async () => {
    // Validate if changing school
    if (formData.changeSchool && !formData.targetSchoolId) {
      Alert.alert('Lỗi', 'Vui lòng chọn trường học đích');
      return false;
    }

    // Validate if changing level
    if (formData.changeLevel && !formData.targetStudentLevelId) {
      Alert.alert('Lỗi', 'Vui lòng chọn cấp độ học sinh đích');
      return false;
    }

    // Check if target branch supports the selected school/level
    if (formData.changeSchool || formData.changeLevel) {
      const targetBranch = branches.find((b: any) => b.id === formData.targetBranchId);
      if (targetBranch) {
        if (formData.changeSchool && !targetBranch.schools?.some((s: any) => s.id === formData.targetSchoolId)) {
          Alert.alert('Lỗi', 'Chi nhánh đích không hỗ trợ trường học đã chọn');
          return false;
        }
        if (formData.changeLevel && !targetBranch.studentLevels?.some((l: any) => l.id === formData.targetStudentLevelId)) {
          Alert.alert('Lỗi', 'Chi nhánh đích không hỗ trợ cấp độ học sinh đã chọn');
          return false;
        }
      }
    }

    return true;
  }, [formData, branches]);

  const handleStep3Complete = useCallback(async () => {
    // Validate document if changing school/level
    if ((formData.changeSchool || formData.changeLevel) && !formData.documentFile) {
      Alert.alert('Lỗi', 'Vui lòng tải lên tài liệu hỗ trợ khi thay đổi trường học hoặc cấp độ');
      return false;
    }

    return true;
  }, [formData]);

  const handleNext = async () => {
    let canProceed = false;

    switch (currentStep) {
      case 0:
        canProceed = await handleStep1Complete();
        break;
      case 1:
        canProceed = await handleStep2Complete();
        break;
      case 2:
        canProceed = await handleStep3Complete();
        break;
      default:
        canProceed = true;
    }

    if (canProceed) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleComplete();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = useCallback(async () => {
    // Final validation
    if (!formData.studentId) {
      Alert.alert('Lỗi', 'Vui lòng chọn học sinh');
      return;
    }

    if (!formData.targetBranchId) {
      Alert.alert('Lỗi', 'Vui lòng chọn chi nhánh đích');
      return;
    }

    setSubmitting(true);
    try {
      const requestData = {
        studentId: formData.studentId,
        targetBranchId: formData.targetBranchId,
        changeSchool: formData.changeSchool,
        targetSchoolId: formData.changeSchool ? formData.targetSchoolId : undefined,
        changeLevel: formData.changeLevel,
        targetStudentLevelId: formData.changeLevel ? formData.targetStudentLevelId : undefined,
        documentFile: formData.documentFile,
        requestReason: formData.requestReason || undefined
      };

      await branchTransferService.createTransferRequest(requestData);

      // Reset form after successful submission
      setFormData(TRANSFER_DEFAULT_VALUES);
      setCurrentStep(0);

      Alert.alert(
        'Thành công',
        'Tạo yêu cầu chuyển chi nhánh thành công!',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('BranchTransferRequests')
          }
        ]
      );
    } catch (err: any) {
      let errorMessage = 'Không thể tạo yêu cầu chuyển chi nhánh';

      if (err.response?.status === 401) {
        errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Bạn không có quyền thực hiện thao tác này.';
      } else if (err.response?.status === 400) {
        errorMessage = err.response?.data?.detail || err.response?.data?.message || 'Dữ liệu không hợp lệ.';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      Alert.alert('Lỗi', errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [formData, navigation]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc chắn muốn hủy tạo yêu cầu?',
      [
        { text: 'Tiếp tục tạo', style: 'cancel' },
        { text: 'Hủy', style: 'destructive', onPress: () => navigation.goBack() }
      ]
    );
  }, [navigation]);

  const updateFormData = useCallback((data: any) => {
    setFormData(prev => ({ ...prev, ...data }));
  }, []);

  const steps = useMemo(() => [
    {
      title: 'Chọn con & Chi nhánh',
      component: Step1ChildAndBranch,
    },
    {
      title: 'Trường học & Cấp độ',
      component: Step2SchoolAndLevel,
    },
    {
      title: 'Tài liệu & Lý do',
      component: Step3DocumentAndReason,
    }
  ], []);

  const CurrentStepComponent = steps[currentStep]?.component;

  if (loading && !dataLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  // Show message if no children available
  if (dataLoaded && (!children || children.length === 0)) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Không có thông tin học sinh. Vui lòng thêm học sinh trước khi tạo yêu cầu chuyển chi nhánh.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo yêu cầu chuyển chi nhánh</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        {steps.map((step, index) => (
          <View key={index} style={styles.stepContainer}>
            <View style={[
              styles.stepCircle,
              index <= currentStep && styles.stepCircleActive
            ]}>
              <Text style={[
                styles.stepNumber,
                index <= currentStep && styles.stepNumberActive
              ]}>
                {index + 1}
              </Text>
            </View>
            <Text style={[
              styles.stepTitle,
              index <= currentStep && styles.stepTitleActive
            ]}>
              {step.title}
            </Text>
            {index < steps.length - 1 && (
              <View style={[
                styles.stepLine,
                index < currentStep && styles.stepLineActive
              ]} />
            )}
          </View>
        ))}
      </View>

      {/* Step Content */}
      <View style={styles.content}>
        {CurrentStepComponent && (
          <CurrentStepComponent
            data={formData}
            updateData={updateFormData}
            children={children}
            branches={branches}
            schools={schools}
            studentLevels={studentLevels}
            isLoading={loading}
          />
        )}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={currentStep === 0 ? handleCancel : handlePrevious}
          disabled={loading || submitting}
        >
          <Text style={styles.cancelButtonText}>
            {currentStep === 0 ? 'Hủy' : 'Quay lại'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.nextButton]}
          onPress={handleNext}
          disabled={loading || submitting}
        >
          {loading || submitting ? (
            <ActivityIndicator size="small" color={COLORS.SURFACE} />
          ) : (
            <Text style={styles.nextButtonText}>
              {currentStep === steps.length - 1 ? 'Hoàn thành' : 'Tiếp tục'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.SURFACE,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  stepIndicator: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.SURFACE,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT_SECONDARY,
  },
  stepNumberActive: {
    color: COLORS.SURFACE,
  },
  stepTitle: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  stepTitleActive: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  stepLine: {
    position: 'absolute',
    top: 20,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: COLORS.BORDER,
    zIndex: -1,
  },
  stepLineActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  content: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    backgroundColor: COLORS.SURFACE,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  nextButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
});

export default BranchTransferRequestScreen;
