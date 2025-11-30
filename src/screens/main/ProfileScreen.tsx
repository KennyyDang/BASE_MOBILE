import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  SafeAreaView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Image,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../contexts/AuthContext';
import { RootStackParamList } from '../../types';
import parentProfileService, { CurrentUserResponse, FamilyProfileResponse } from '../../services/parentProfileService';
import { useMyChildren } from '../../hooks/useChildrenApi';
import { StudentResponse, StudentPackageSubscription } from '../../types/api';
import packageService from '../../services/packageService';
import childrenService from '../../services/childrenService';
import studentLevelService from '../../services/studentLevelService';
import schoolService from '../../services/schoolService';
import { COLORS } from '../../constants';

const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
};

const FONTS = {
  SIZES: {
    XS: 12,
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
  const [currentUser, setCurrentUser] = useState<CurrentUserResponse | null>(null);
  const [familyProfiles, setFamilyProfiles] = useState<FamilyProfileResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [updating, setUpdating] = useState(false);
  const [loadingFamilyProfiles, setLoadingFamilyProfiles] = useState(false);
  
  // Add Family Profile Modal States
  const [addFamilyModalVisible, setAddFamilyModalVisible] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newFamilyPhone, setNewFamilyPhone] = useState('');
  const [newFamilyRela, setNewFamilyRela] = useState<string>('');
  const [newFamilyAvatarUri, setNewFamilyAvatarUri] = useState<string | null>(null);
  const [creatingFamilyProfile, setCreatingFamilyProfile] = useState(false);
  
  // Edit Family Profile Modal States
  const [editFamilyModalVisible, setEditFamilyModalVisible] = useState(false);
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null);
  const [editFamilyName, setEditFamilyName] = useState('');
  const [editFamilyPhone, setEditFamilyPhone] = useState('');
  const [editFamilyRela, setEditFamilyRela] = useState<string>('');
  const [editFamilyAvatarUri, setEditFamilyAvatarUri] = useState<string | null>(null);
  const [editFamilyAvatarUrl, setEditFamilyAvatarUrl] = useState<string | null>(null);
  const [updatingFamilyProfile, setUpdatingFamilyProfile] = useState(false);
  const [deletingFamilyId, setDeletingFamilyId] = useState<string | null>(null);

  // Children Management States - Tích hợp từ ChildrenManagementScreen
  const { students, loading: studentsLoading, error: studentsError, refetch: refetchStudents } = useMyChildren();
  const [selectedChild, setSelectedChild] = useState<StudentResponse | null>(null);
  const [editChildModalVisible, setEditChildModalVisible] = useState(false);
  const [editChildName, setEditChildName] = useState('');
  const [editChildDateOfBirth, setEditChildDateOfBirth] = useState<Date | null>(null);
  const [showChildDatePicker, setShowChildDatePicker] = useState(false);
  const [editChildNote, setEditChildNote] = useState('');
  const [updatingChild, setUpdatingChild] = useState(false);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImageChild, setSelectedImageChild] = useState<StudentResponse | null>(null);
  
  // Add Child Form States
  const [addChildModalVisible, setAddChildModalVisible] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [addName, setAddName] = useState('');
  const [addDateOfBirth, setAddDateOfBirth] = useState<Date | null>(null);
  const [addNote, setAddNote] = useState('');
  const [addImageUri, setAddImageUri] = useState<string | null>(null);
  const [addSchoolId, setAddSchoolId] = useState<string>('');
  const [addStudentLevelId, setAddStudentLevelId] = useState<string>('');
  const [addDocumentType, setAddDocumentType] = useState<string>('');
  const [addIssuedBy, setAddIssuedBy] = useState('');
  const [addIssuedDate, setAddIssuedDate] = useState<Date | null>(null);
  const [addExpirationDate, setAddExpirationDate] = useState<Date | null>(null);
  const [addDocumentFileUri, setAddDocumentFileUri] = useState<string | null>(null);
  
  // Dropdown data
  const [schools, setSchools] = useState<Array<{ id: string; name: string }>>([]);
  const [studentLevels, setStudentLevels] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingStudentLevels, setLoadingStudentLevels] = useState(false);
  
  // Date picker states for add form
  const [showAddDatePicker, setShowAddDatePicker] = useState(false);
  const [showAddIssuedDatePicker, setShowAddIssuedDatePicker] = useState(false);
  const [showAddExpirationDatePicker, setShowAddExpirationDatePicker] = useState(false);
  const [addSelectedDayInput, setAddSelectedDayInput] = useState<string>('');
  const [addSelectedMonthInput, setAddSelectedMonthInput] = useState<string>('');
  const [addSelectedYearInput, setAddSelectedYearInput] = useState<string>('');
  
  // Date picker states for edit form
  const [selectedDayInput, setSelectedDayInput] = useState<string>('');
  const [selectedMonthInput, setSelectedMonthInput] = useState<string>('');
  const [selectedYearInput, setSelectedYearInput] = useState<string>('');
  
  // Student packages
  const [studentPackages, setStudentPackages] = useState<
    Record<
      string,
      {
        loading: boolean;
        data: StudentPackageSubscription[];
        error: string | null;
      }
    >
  >({});
  const fetchedStudentsRef = useRef<Set<string>>(new Set());

  const fetchCurrentUser = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const userData = await parentProfileService.getCurrentUser();
      setCurrentUser(userData);
    } catch (err: any) {
      // If 401, don't set error - authHandler will handle logout
      if (err?.response?.status === 401) {
        // Token invalid, authHandler will handle logout
        return;
      }
      const errorMessage = err?.response?.data?.message || err?.message || 'Không thể tải thông tin người dùng';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchFamilyProfiles = useCallback(async () => {
    try {
      setLoadingFamilyProfiles(true);
      const profiles = await parentProfileService.getFamilyProfiles();
      setFamilyProfiles(profiles);
    } catch (err: any) {
      // If 401, don't set error - authHandler will handle logout
      if (err?.response?.status === 401) {
        // Token invalid, authHandler will handle logout
        return;
      }
      // Don't show error for family profiles, just log it
      console.warn('Failed to fetch family profiles:', err?.message || err);
      setFamilyProfiles([]);
    } finally {
      setLoadingFamilyProfiles(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (isMounted) {
        await fetchCurrentUser();
        await fetchFamilyProfiles();
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once on mount

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchCurrentUser(),
        fetchFamilyProfiles(),
        refetchStudents(),
      ]);
    } catch (err) {
      console.warn('Error refreshing:', err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchCurrentUser, fetchFamilyProfiles, refetchStudents]);

  // Children Management Functions - Tích hợp từ ChildrenManagementScreen
  const formatDateForDisplay = useCallback((dateString: string | null | undefined) => {
    if (!dateString) return 'Chưa có';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime()) || date.getTime() === 0) {
        return 'Chưa có';
      }
      return date.toLocaleDateString('vi-VN');
    } catch (e) {
      return 'Chưa có';
    }
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  // Note: Modal is no longer used, all child registration goes through RegisterChildScreen
  // This useEffect is kept for backward compatibility but won't trigger
  useEffect(() => {
    // Modal is disabled - all registration goes through RegisterChildScreen
  }, [addChildModalVisible]);

  const fetchSchools = async () => {
    setLoadingSchools(true);
    try {
      const response = await schoolService.getSchoolsPaged({
        pageIndex: 1,
        pageSize: 100,
        includeDeleted: false,
      });
      setSchools(response.items.map(s => ({ id: s.id, name: s.name })));
    } catch (err) {
      console.warn('Failed to fetch schools:', err);
    } finally {
      setLoadingSchools(false);
    }
  };

  const fetchStudentLevels = async () => {
    // This function is no longer used - all registration goes through RegisterChildScreen
    // Kept for backward compatibility
  };

  // Children Management Handlers
  const handleAddChild = async () => {
    // Navigate to RegisterChildScreen instead of using modal
    // This allows parent to select branch when registering child
    navigation.navigate('RegisterChild' as never);
  };

  const handleCloseAddChildModal = () => {
    setAddChildModalVisible(false);
    setAddName('');
    setAddDateOfBirth(null);
    setAddNote('');
    setAddImageUri(null);
    setAddSchoolId('');
    setAddStudentLevelId('');
    setAddDocumentType('');
    setAddIssuedBy('');
    setAddIssuedDate(null);
    setAddExpirationDate(null);
    setAddDocumentFileUri(null);
    setShowAddDatePicker(false);
    setShowAddIssuedDatePicker(false);
    setShowAddExpirationDatePicker(false);
    setAddSelectedDayInput('');
    setAddSelectedMonthInput('');
    setAddSelectedYearInput('');
  };

  const handleRegisterChild = async () => {
    // All child registration now goes through RegisterChildScreen
    // Navigate to RegisterChildScreen instead of using modal
    handleCloseAddChildModal();
    navigation.navigate('RegisterChild' as never);
  };

  const handlePickAddImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        setAddImageUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  const handlePickDocumentFile = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        setAddDocumentFileUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể chọn file. Vui lòng thử lại.');
    }
  };

  const handleEditChild = (child: StudentResponse) => {
    setSelectedChild(child);
    setEditChildName(child.name || '');
    if (child.dateOfBirth) {
      try {
        const dateStr = child.dateOfBirth;
        let date: Date;
        if (dateStr.includes('T')) {
          date = new Date(dateStr);
        } else {
          const [year, month, day] = dateStr.split('-').map(Number);
          date = new Date(year, month - 1, day);
        }
        if (isNaN(date.getTime())) {
          setEditChildDateOfBirth(null);
        } else {
          setEditChildDateOfBirth(date);
        }
      } catch (e) {
        setEditChildDateOfBirth(null);
      }
    } else {
      setEditChildDateOfBirth(null);
    }
    setEditChildNote(child.note || '');
    setShowChildDatePicker(false);
    setEditChildModalVisible(true);
  };

  const handleDeleteChild = async (child: StudentResponse) => {
    setDeletingStudentId(child.id);
    try {
      await childrenService.deleteStudent(child.id);
      Alert.alert('Thành công', `Đã xóa con "${child.name}" khỏi hệ thống.`);
      refetchStudents();
    } catch (error: any) {
      let message = 'Không thể xóa con. Vui lòng thử lại.';
      if (error?.response?.data) {
        const errorData = error.response.data;
        if (errorData.message) message = errorData.message;
        else if (errorData.error) message = errorData.error;
        else if (errorData.title) message = errorData.title;
      } else if (error?.message) {
        message = error.message;
      }
      Alert.alert('Lỗi', message);
    } finally {
      setDeletingStudentId(null);
    }
  };

  const handleUpdateChild = async () => {
    if (!selectedChild) return;
    if (!editChildName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên của con.');
      return;
    }
    setUpdatingChild(true);
    try {
      const updateData: { name?: string; dateOfBirth?: string; note?: string } = {};
      updateData.name = editChildName.trim();
      if (editChildDateOfBirth) {
        const dateForAPI = new Date(
          editChildDateOfBirth.getFullYear(),
          editChildDateOfBirth.getMonth(),
          editChildDateOfBirth.getDate(),
          12, 0, 0, 0
        );
        updateData.dateOfBirth = dateForAPI.toISOString();
      } else if (selectedChild.dateOfBirth) {
        try {
          const originalDate = new Date(selectedChild.dateOfBirth);
          if (!isNaN(originalDate.getTime())) {
            const dateForAPI = new Date(
              originalDate.getFullYear(),
              originalDate.getMonth(),
              originalDate.getDate(),
              12, 0, 0, 0
            );
            updateData.dateOfBirth = dateForAPI.toISOString();
          }
        } catch (e) {
          console.warn('Failed to parse dateOfBirth:', e);
        }
      }
      if (editChildNote.trim() !== (selectedChild.note || '')) {
        updateData.note = editChildNote.trim();
      }
      if (Object.keys(updateData).length === 0) {
        Alert.alert('Thông báo', 'Không có thay đổi nào để cập nhật.');
        setUpdatingChild(false);
        return;
      }
      await childrenService.updateChildByParent(selectedChild.id, updateData);
      Alert.alert('Thành công', 'Cập nhật thông tin con thành công.');
      setEditChildModalVisible(false);
      refetchStudents();
    } catch (error: any) {
      let message = 'Không thể cập nhật thông tin con. Vui lòng thử lại.';
      if (error?.response?.data) {
        const errorData = error.response.data;
        if (errorData.errors) {
          const validationErrors: string[] = [];
          Object.keys(errorData.errors).forEach((key) => {
            const fieldErrors = errorData.errors[key];
            let fieldName = key;
            if (key.toLowerCase() === 'name') fieldName = 'Tên';
            else if (key.toLowerCase() === 'dateofbirth') fieldName = 'Ngày sinh';
            else if (key.toLowerCase() === 'note') fieldName = 'Ghi chú';
            if (Array.isArray(fieldErrors)) {
              fieldErrors.forEach((err: string) => {
                let translatedErr = err;
                if (err.toLowerCase().includes('required')) {
                  translatedErr = 'là bắt buộc';
                } else if (err.toLowerCase().includes('invalid')) {
                  translatedErr = 'không hợp lệ';
                }
                validationErrors.push(`${fieldName}: ${translatedErr}`);
              });
            } else {
              validationErrors.push(`${fieldName}: ${fieldErrors}`);
            }
          });
          message = validationErrors.join('\n');
        } else if (errorData.message) {
          message = errorData.message;
        } else if (errorData.error) {
          message = errorData.error;
        } else if (errorData.title) {
          message = errorData.title;
        }
      } else if (error?.message) {
        message = error.message;
      }
      Alert.alert('Lỗi', message);
    } finally {
      setUpdatingChild(false);
    }
  };

  const handleViewDetails = (child: StudentResponse) => {
    Alert.alert(
      'Chi tiết học sinh',
      `Tên: ${child.name}\nNgày sinh: ${formatDateForDisplay(child.dateOfBirth)}\nTrường: ${child.schoolName || 'Chưa có'}\nCấp độ: ${child.studentLevelName || 'Chưa có'}\nChi nhánh: ${child.branchName || 'Chưa có'}`,
      [{ text: 'Đóng', style: 'default' }]
    );
  };

  const handleAttendance = (child: StudentResponse) => {
    Alert.alert('Điểm danh', `Xem lịch điểm danh của ${child.name}`, [{ text: 'Đóng', style: 'default' }]);
  };

  const handleClasses = (child: StudentResponse) => {
    navigation.navigate('StudentClasses', {
      studentId: child.id,
      studentName: child.name,
    });
  };

  const handleViewPackages = (child: StudentResponse) => {
    navigation.navigate('StudentPackages', {
      studentId: child.id,
      studentName: child.name,
      branchName: child.branchName || '',
      studentLevelName: child.studentLevelName || '',
    });
  };

  const fetchStudentPackages = useCallback(async (studentId: string, forceRefresh: boolean = false) => {
    // If not forcing refresh and already fetched, skip
    if (!forceRefresh && fetchedStudentsRef.current.has(studentId)) {
      return;
    }
    
    fetchedStudentsRef.current.add(studentId);
    setStudentPackages((prev) => ({
      ...prev,
      [studentId]: {
        data: prev[studentId]?.data || [],
        loading: true,
        error: null,
      },
    }));
    try {
      const data = await packageService.getStudentSubscriptions(studentId);
      const activeData = data.filter((sub) => {
        if (!sub.status) return false;
        const status = sub.status.trim().toUpperCase();
        return status === 'ACTIVE';
      });
      setStudentPackages((prev) => ({
        ...prev,
        [studentId]: {
          data: activeData,
          loading: false,
          error: null,
        },
      }));
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Không thể tải gói đã đăng ký. Vui lòng thử lại.';
      setStudentPackages((prev) => ({
        ...prev,
        [studentId]: {
          data: prev[studentId]?.data || [],
          loading: false,
          error: message,
        },
      }));
    }
  }, []);

  useEffect(() => {
    if (!students.length) {
      setStudentPackages({});
      fetchedStudentsRef.current.clear();
      return;
    }
    
    // Only fetch for new students that haven't been fetched
    const studentsToFetch = students.filter(
      (student) => !fetchedStudentsRef.current.has(student.id)
    );
    
    if (studentsToFetch.length > 0) {
      studentsToFetch.forEach((student) => {
        fetchStudentPackages(student.id);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students.length]); // Only depend on students.length to avoid infinite loop

  const handleRetryPackages = (studentId: string) => {
    // Force refresh for this student
    fetchStudentPackages(studentId, true);
  };

  const handlePickChildImage = async (child: StudentResponse) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh để upload ảnh cho con.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setUploadingPhotoId(child.id);
        try {
          const updatedStudent = await childrenService.uploadStudentPhoto(
            child.id,
            asset.uri,
            undefined,
            asset.mimeType || 'image/jpeg'
          );
          Alert.alert('Thành công', `Đã upload ảnh cho ${child.name} thành công!`);
          refetchStudents();
        } catch (error: any) {
          const errorMessage = error?.message || error?.data?.message || 'Không thể upload ảnh. Vui lòng thử lại.';
          Alert.alert('Lỗi', errorMessage);
        } finally {
          setUploadingPhotoId(null);
        }
      }
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  const handleViewImage = (child: StudentResponse) => {
    if (child.image) {
      setSelectedImageUrl(child.image);
      setSelectedImageChild(child);
      setImageViewerVisible(true);
    }
  };

  const handleMoreOptions = (child: StudentResponse) => {
    Alert.alert(
      'Tùy chọn',
      `Chọn hành động cho ${child.name}`,
      [
        { text: 'Chỉnh sửa', onPress: () => handleEditChild(child) },
        { text: 'Upload ảnh', onPress: () => handlePickChildImage(child) },
        { text: 'Xóa con', style: 'destructive', onPress: () => {
          Alert.alert(
            'Xác nhận xóa',
            `Bạn có chắc chắn muốn xóa con "${child.name}"?\n\nHành động này sẽ xóa (soft delete) thông tin con khỏi hệ thống.`,
            [
              { text: 'Hủy', style: 'cancel' },
              { text: 'Xóa', style: 'destructive', onPress: () => handleDeleteChild(child) },
            ],
            { cancelable: true }
          );
        }},
        { text: 'Hủy', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const getStatusColor = (status: boolean) => {
    return status ? COLORS.SUCCESS : COLORS.ERROR;
  };

  const getStatusText = (status: boolean) => {
    return status ? 'Hoạt động' : 'Tạm nghỉ';
  };

  // Document Type Options
  const documentTypes = [
    'BirthCertificate', 'HouseholdBook', 'GuardianCertificate', 'AuthorizationLetter',
    'AdoptionCertificate', 'DivorceCustodyDecision', 'StudentCard', 'SchoolEnrollmentConfirmation',
    'AcademicRecordBook', 'VnEduScreenshot', 'TuitionReceipt', 'CertificateOrLetter', 'Other',
  ];

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      BirthCertificate: 'Giấy khai sinh',
      HouseholdBook: 'Sổ hộ khẩu',
      GuardianCertificate: 'Giấy chứng nhận người giám hộ',
      AuthorizationLetter: 'Giấy ủy quyền',
      AdoptionCertificate: 'Giấy chứng nhận nhận nuôi',
      DivorceCustodyDecision: 'Quyết định quyền nuôi con sau ly hôn',
      StudentCard: 'Thẻ học sinh',
      SchoolEnrollmentConfirmation: 'Xác nhận nhập học',
      AcademicRecordBook: 'Sổ học bạ',
      VnEduScreenshot: 'Ảnh chụp VnEdu',
      TuitionReceipt: 'Biên lai học phí',
      CertificateOrLetter: 'Giấy chứng nhận/Thư',
      Other: 'Khác',
    };
    return labels[type] || type;
  };

  // Date picker helpers
  const initializeDatePicker = () => {
    const date = editChildDateOfBirth || new Date();
    setSelectedDayInput(date.getDate().toString());
    setSelectedMonthInput((date.getMonth() + 1).toString());
    setSelectedYearInput(date.getFullYear().toString());
  };

  const handleConfirmDate = () => {
    const day = parseInt(selectedDayInput) || 1;
    const month = parseInt(selectedMonthInput) || 1;
    const year = parseInt(selectedYearInput) || new Date().getFullYear();
    const maxDay = getDaysInMonth(year, month);
    const validDay = Math.min(Math.max(1, day), maxDay);
    const validMonth = Math.min(Math.max(1, month), 12);
    const validYear = Math.max(1950, Math.min(year, new Date().getFullYear()));
    const newDate = new Date(validYear, validMonth - 1, validDay);
    setEditChildDateOfBirth(newDate);
    setShowChildDatePicker(false);
  };

  const initializeAddDatePicker = (date: Date | null) => {
    const targetDate = date || new Date();
    setAddSelectedDayInput(targetDate.getDate().toString());
    setAddSelectedMonthInput((targetDate.getMonth() + 1).toString());
    setAddSelectedYearInput(targetDate.getFullYear().toString());
  };

  const handleConfirmAddDate = () => {
    const day = parseInt(addSelectedDayInput) || 1;
    const month = parseInt(addSelectedMonthInput) || 1;
    const year = parseInt(addSelectedYearInput) || new Date().getFullYear();
    const maxDay = getDaysInMonth(year, month);
    const validDay = Math.min(Math.max(1, day), maxDay);
    const validMonth = Math.min(Math.max(1, month), 12);
    const validYear = Math.max(1950, Math.min(year, new Date().getFullYear()));
    const newDate = new Date(validYear, validMonth - 1, validDay);
    setAddDateOfBirth(newDate);
    setShowAddDatePicker(false);
  };

  const handleConfirmIssuedDate = () => {
    const day = parseInt(addSelectedDayInput) || 1;
    const month = parseInt(addSelectedMonthInput) || 1;
    const year = parseInt(addSelectedYearInput) || new Date().getFullYear();
    const maxDay = getDaysInMonth(year, month);
    const validDay = Math.min(Math.max(1, day), maxDay);
    const validMonth = Math.min(Math.max(1, month), 12);
    const validYear = Math.max(1950, Math.min(year, new Date().getFullYear()));
    const newDate = new Date(validYear, validMonth - 1, validDay);
    setAddIssuedDate(newDate);
    setShowAddIssuedDatePicker(false);
  };

  const handleConfirmExpirationDate = () => {
    const day = parseInt(addSelectedDayInput) || 1;
    const month = parseInt(addSelectedMonthInput) || 1;
    const year = parseInt(addSelectedYearInput) || new Date().getFullYear();
    const maxDay = getDaysInMonth(year, month);
    const validDay = Math.min(Math.max(1, day), maxDay);
    const validMonth = Math.min(Math.max(1, month), 12);
    const validYear = Math.max(1950, Math.min(year, new Date().getFullYear()));
    const newDate = new Date(validYear, validMonth - 1, validDay);
    setAddExpirationDate(newDate);
    setShowAddExpirationDatePicker(false);
  };

  const handleEditProfile = () => {
    if (currentUser) {
      setEditName(currentUser.name || '');
      setEditPhoneNumber(currentUser.phoneNumber || '');
      setEditing(true);
    }
  };

  const handleCloseEdit = () => {
    setEditing(false);
    setEditName('');
    setEditPhoneNumber('');
    setError(null);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên');
      return;
    }

    if (!editPhoneNumber.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
      return;
    }

    // Validate phone number format (basic check)
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(editPhoneNumber.trim())) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ. Vui lòng nhập 10-11 chữ số');
      return;
    }

    try {
      setUpdating(true);
      setError(null);
      const updatedUser = await parentProfileService.updateMyProfile(
        editName.trim(),
        editPhoneNumber.trim()
      );
      setCurrentUser(updatedUser);
      setEditing(false);
      Alert.alert('Thành công', 'Đã cập nhật thông tin profile thành công!');
      // Refresh lại để đảm bảo có dữ liệu mới nhất
      await fetchCurrentUser();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Không thể cập nhật profile';
      setError(errorMessage);
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const handlePickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập',
          'Cần quyền truy cập thư viện ảnh để upload ảnh profile.'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        await handleUploadImage(asset.uri, asset.mimeType || 'image/jpeg');
      }
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  const handleUploadImage = async (uri: string, mimeType: string) => {
    try {
      setUploading(true);
      setError(null);

      const updatedUser = await parentProfileService.uploadProfilePicture(uri, undefined, mimeType);
      
      // Update local state with new profile picture URL
      setCurrentUser(updatedUser);
      
      Alert.alert('Thành công', 'Đã cập nhật ảnh profile thành công!');
      // Refresh lại để đảm bảo có dữ liệu mới nhất
      await fetchCurrentUser();
    } catch (err: any) {
      const errorMessage = err?.message || 'Không thể upload ảnh profile';
      
      // Check if it's an adult/racy content error
      if (errorMessage.includes('Adult content') || errorMessage.includes('Racy content') || errorMessage.includes('không phù hợp')) {
        Alert.alert(
          'Ảnh không phù hợp',
          errorMessage,
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        Alert.alert('Lỗi', errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleNotifications = () => {
    navigation.navigate('Notifications');
  };

  const handleMySubscriptions = () => {
    navigation.navigate('MySubscriptions');
  };

  const handleOrderHistory = () => {
    navigation.navigate('OrderHistory');
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

  // Student Relationship Options
  const STUDENT_RELATIONSHIPS = [
    'Bố',
    'Mẹ',
    'Anh',
    'Chị',
    'Cô',
    'Dì',
    'Chú',
    'Bác',
    'Ông',
    'Bà',
    'Người giám hộ',
    'Khác',
  ];

  const handleOpenAddFamilyModal = () => {
    setNewFamilyName('');
    setNewFamilyPhone('');
    setNewFamilyRela('');
    setNewFamilyAvatarUri(null);
    setError(null);
    setAddFamilyModalVisible(true);
  };

  const handleCloseAddFamilyModal = () => {
    setAddFamilyModalVisible(false);
    setNewFamilyName('');
    setNewFamilyPhone('');
    setNewFamilyRela('');
    setNewFamilyAvatarUri(null);
    setError(null);
  };

  const handlePickFamilyAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập',
          'Cần quyền truy cập thư viện ảnh để chọn ảnh đại diện.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setNewFamilyAvatarUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  const handleRemoveFamilyAvatar = () => {
    setNewFamilyAvatarUri(null);
  };

  const handleSelectRelationship = () => {
    Alert.alert(
      'Chọn mối quan hệ',
      'Vui lòng chọn mối quan hệ với học sinh',
      [
        ...STUDENT_RELATIONSHIPS.map((rela) => ({
          text: rela,
          onPress: () => setNewFamilyRela(rela),
        })),
        {
          text: 'Hủy',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const handleCreateFamilyProfile = async () => {
    // Validation
    if (!newFamilyName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên thành viên');
      return;
    }

    if (!newFamilyPhone.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
      return;
    }

    // Validate phone number format
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(newFamilyPhone.trim())) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ. Vui lòng nhập 10-11 chữ số');
      return;
    }

    if (!newFamilyRela.trim()) {
      Alert.alert('Lỗi', 'Vui lòng chọn mối quan hệ với học sinh');
      return;
    }

    try {
      setCreatingFamilyProfile(true);
      setError(null);

      await parentProfileService.createFamilyProfile(
        newFamilyName.trim(),
        newFamilyPhone.trim(),
        newFamilyRela.trim(),
        newFamilyAvatarUri || undefined
      );

      Alert.alert('Thành công', 'Đã thêm thành viên gia đình thành công!');
      handleCloseAddFamilyModal();
      fetchFamilyProfiles(); // Refresh list
    } catch (err: any) {
      const errorMessage = err?.message || 'Không thể tạo family profile. Vui lòng thử lại.';
      setError(errorMessage);
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setCreatingFamilyProfile(false);
    }
  };

  const handleOpenEditFamilyModal = async (profileId: string) => {
    try {
      setError(null);
      const profile = await parentProfileService.getFamilyProfileById(profileId);
      
      setEditingFamilyId(profileId);
      setEditFamilyName(profile.name);
      setEditFamilyPhone(profile.phone);
      setEditFamilyRela(profile.studentRela || '');
      setEditFamilyAvatarUri(null);
      setEditFamilyAvatarUrl(profile.avatar || null);
      setEditFamilyModalVisible(true);
    } catch (err: any) {
      const errorMessage = err?.message || 'Không thể tải thông tin thành viên. Vui lòng thử lại.';
      Alert.alert('Lỗi', errorMessage);
    }
  };

  const handleCloseEditFamilyModal = () => {
    setEditFamilyModalVisible(false);
    setEditingFamilyId(null);
    setEditFamilyName('');
    setEditFamilyPhone('');
    setEditFamilyRela('');
    setEditFamilyAvatarUri(null);
    setEditFamilyAvatarUrl(null);
    setError(null);
  };

  const handlePickEditFamilyAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập',
          'Cần quyền truy cập thư viện ảnh để chọn ảnh đại diện.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setEditFamilyAvatarUri(result.assets[0].uri);
        setEditFamilyAvatarUrl(null); // Clear old URL when new image is selected
      }
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  const handleRemoveEditFamilyAvatar = () => {
    setEditFamilyAvatarUri(null);
    setEditFamilyAvatarUrl(null);
  };

  const handleSelectEditRelationship = () => {
    Alert.alert(
      'Chọn mối quan hệ',
      'Vui lòng chọn mối quan hệ với học sinh',
      [
        ...STUDENT_RELATIONSHIPS.map((rela) => ({
          text: rela,
          onPress: () => setEditFamilyRela(rela),
        })),
        {
          text: 'Hủy',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const handleUpdateFamilyProfile = async () => {
    if (!editingFamilyId) return;

    // Validation
    if (!editFamilyName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên thành viên');
      return;
    }

    if (!editFamilyPhone.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
      return;
    }

    // Validate phone number format
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(editFamilyPhone.trim())) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ. Vui lòng nhập 10-11 chữ số');
      return;
    }

    if (!editFamilyRela.trim()) {
      Alert.alert('Lỗi', 'Vui lòng chọn mối quan hệ với học sinh');
      return;
    }

    try {
      setUpdatingFamilyProfile(true);
      setError(null);

      await parentProfileService.updateFamilyProfile(
        editingFamilyId,
        editFamilyName.trim(),
        editFamilyPhone.trim(),
        editFamilyRela.trim(),
        editFamilyAvatarUri || undefined
      );

      Alert.alert('Thành công', 'Đã cập nhật thành viên gia đình thành công!');
      handleCloseEditFamilyModal();
      fetchFamilyProfiles(); // Refresh list
    } catch (err: any) {
      const errorMessage = err?.message || 'Không thể cập nhật family profile. Vui lòng thử lại.';
      setError(errorMessage);
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setUpdatingFamilyProfile(false);
    }
  };

  const handleDeleteFamilyProfile = (profileId: string, profileName: string) => {
    Alert.alert(
      'Xóa thành viên',
      `Bạn có chắc chắn muốn xóa thành viên "${profileName}"?`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingFamilyId(profileId);
              await parentProfileService.deleteFamilyProfile(profileId);
              Alert.alert('Thành công', 'Đã xóa thành viên gia đình thành công!');
              fetchFamilyProfiles(); // Refresh list
            } catch (err: any) {
              const errorMessage = err?.message || 'Không thể xóa family profile. Vui lòng thử lại.';
              Alert.alert('Lỗi', errorMessage);
            } finally {
              setDeletingFamilyId(null);
            }
          },
        },
      ]
    );
  };

  if (loading && !currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={48} color={COLORS.ERROR} />
          <Text style={styles.errorText}>Không tìm thấy thông tin người dùng</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* User Info Card */}
        <View style={styles.userCard}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handlePickImage}
            disabled={uploading}
            activeOpacity={0.7}
          >
            {uploading ? (
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            ) : currentUser?.profilePictureUrl ? (
              <Image
                source={{ uri: currentUser.profilePictureUrl }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <MaterialIcons name="person" size={60} color={COLORS.PRIMARY} />
            )}
            <View style={styles.avatarEditOverlay}>
              <MaterialIcons name="camera-alt" size={24} color={COLORS.SURFACE} />
            </View>
          </TouchableOpacity>
          
          <Text style={styles.userName}>
            {currentUser?.name || user.email}
          </Text>
          
          <View style={styles.userBadge}>
            <MaterialIcons name="badge" size={16} color={COLORS.PRIMARY} />
            <Text style={styles.userRole}>
              {currentUser?.roleName || user.role}
            </Text>
          </View>

          {currentUser?.branchName && (
            <View style={styles.userInfoRow}>
              <MaterialIcons name="location-on" size={16} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.userInfoText}>{currentUser.branchName}</Text>
            </View>
          )}
        </View>

        {/* User Details Section */}
        {currentUser && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin chi tiết</Text>
            
            {error && (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error" size={20} color={COLORS.ERROR} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <MaterialIcons name="email" size={20} color={COLORS.PRIMARY} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{currentUser.email}</Text>
                </View>
              </View>

              {currentUser.phoneNumber && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="phone" size={20} color={COLORS.PRIMARY} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Số điện thoại</Text>
                    <Text style={styles.detailValue}>{currentUser.phoneNumber}</Text>
                  </View>
                </View>
              )}

              {currentUser.branchName && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="business" size={20} color={COLORS.PRIMARY} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Chi nhánh</Text>
                    <Text style={styles.detailValue}>{currentUser.branchName}</Text>
                  </View>
                </View>
              )}

              <View style={styles.detailRow}>
                <MaterialIcons name="calendar-today" size={20} color={COLORS.PRIMARY} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Ngày tạo tài khoản</Text>
                  <Text style={styles.detailValue}>{formatDate(currentUser.createdAt)}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <MaterialIcons 
                  name={currentUser.isActive ? 'check-circle' : 'cancel'} 
                  size={20} 
                  color={currentUser.isActive ? COLORS.SUCCESS : COLORS.ERROR} 
                />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Trạng thái</Text>
                  <Text style={[styles.detailValue, { color: currentUser.isActive ? COLORS.SUCCESS : COLORS.ERROR }]}>
                    {currentUser.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Family Profiles Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Thành viên gia đình</Text>
            <View style={styles.sectionHeaderRight}>
              {loadingFamilyProfiles && (
                <ActivityIndicator size="small" color={COLORS.PRIMARY} style={{ marginRight: SPACING.SM }} />
              )}
              <TouchableOpacity
                style={styles.addFamilyButton}
                onPress={handleOpenAddFamilyModal}
                activeOpacity={0.7}
              >
                <MaterialIcons name="add" size={20} color={COLORS.SURFACE} />
                <Text style={styles.addFamilyButtonText}>Thêm</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {loadingFamilyProfiles && familyProfiles.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.PRIMARY} />
              <Text style={styles.familyLoadingText}>Đang tải danh sách thành viên...</Text>
            </View>
          ) : familyProfiles.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="people-outline" size={48} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.emptyText}>Chưa có thành viên gia đình nào</Text>
            </View>
          ) : (
            <View style={styles.familyProfilesList}>
              {familyProfiles.map((profile) => (
                <View key={profile.id} style={styles.familyProfileCard}>
                  <View style={styles.familyProfileHeader}>
                    {profile.avatar ? (
                      <Image
                        source={{ uri: profile.avatar }}
                        style={styles.familyProfileAvatar}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.familyProfileAvatarPlaceholder}>
                        <MaterialIcons name="person" size={32} color={COLORS.PRIMARY} />
                      </View>
                    )}
                    <View style={styles.familyProfileInfo}>
                      <Text style={styles.familyProfileName}>{profile.name}</Text>
                      <View style={styles.familyProfileMeta}>
                        <MaterialIcons name="phone" size={14} color={COLORS.TEXT_SECONDARY} />
                        <Text style={styles.familyProfilePhone}>{profile.phone}</Text>
                      </View>
                      {profile.studentRela && (
                        <View style={styles.familyProfileRelation}>
                          <MaterialIcons name="family-restroom" size={14} color={COLORS.PRIMARY} />
                          <Text style={styles.familyProfileRelationText}>
                            {profile.studentRela}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {profile.students && profile.students.length > 0 && (
                    <View style={styles.familyProfileStudents}>
                      <Text style={styles.familyProfileStudentsLabel}>
                        Học sinh: {profile.students.length}
                      </Text>
                    </View>
                  )}
                  
                  {/* Action Buttons */}
                  <View style={styles.familyProfileActions}>
                    <TouchableOpacity
                      style={styles.familyProfileActionButton}
                      onPress={() => handleOpenEditFamilyModal(profile.id)}
                      disabled={deletingFamilyId === profile.id}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="edit" size={18} color={COLORS.PRIMARY} />
                      <Text style={styles.familyProfileActionText}>Sửa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.familyProfileActionButton, styles.familyProfileDeleteButton]}
                      onPress={() => handleDeleteFamilyProfile(profile.id, profile.name)}
                      disabled={deletingFamilyId === profile.id || deletingFamilyId !== null}
                      activeOpacity={0.7}
                    >
                      {deletingFamilyId === profile.id ? (
                        <ActivityIndicator size="small" color={COLORS.ERROR} />
                      ) : (
                        <>
                          <MaterialIcons name="delete" size={18} color={COLORS.ERROR} />
                          <Text style={[styles.familyProfileActionText, styles.familyProfileDeleteText]}>Xóa</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Children Management Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quản lý con ({students.length})</Text>
            <TouchableOpacity
              style={styles.addChildButton}
              onPress={handleAddChild}
              activeOpacity={0.7}
            >
              <MaterialIcons name="add" size={20} color={COLORS.SURFACE} />
              <Text style={styles.addChildButtonText}>Thêm con</Text>
            </TouchableOpacity>
          </View>

          {studentsLoading && students.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.PRIMARY} />
              <Text style={styles.familyLoadingText}>Đang tải danh sách con...</Text>
            </View>
          ) : students.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="child-care" size={48} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.emptyText}>Chưa có con nào</Text>
              <Text style={styles.emptySubtext}>Thêm con đầu tiên để bắt đầu quản lý</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={handleAddChild}>
                <Text style={styles.emptyButtonText}>Thêm con</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.childrenList}>
              {students.map((child) => (
                <View key={child.id} style={styles.childCard}>
                  <View style={styles.childHeader}>
                    <TouchableOpacity 
                      style={styles.childAvatar}
                      onPress={() => handleViewImage(child)}
                      disabled={!child.image || uploadingPhotoId === child.id}
                      activeOpacity={child.image ? 0.7 : 1}
                    >
                      {child.image ? (
                        <Image 
                          source={{ uri: child.image }} 
                          style={styles.avatarImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.avatarText}>
                          {child.name.charAt(0).toUpperCase()}
                        </Text>
                      )}
                      {uploadingPhotoId === child.id && (
                        <View style={styles.avatarOverlay}>
                          <ActivityIndicator size="small" color={COLORS.SURFACE} />
                        </View>
                      )}
                    </TouchableOpacity>
                    <View style={styles.childInfo}>
                      <Text style={styles.childName}>{child.name}</Text>
                      <Text style={styles.childDetails}>
                        {child.studentLevelName || 'Chưa có cấp độ'}
                      </Text>
                      <View style={styles.statusContainer}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(child.status) }]} />
                        <Text style={styles.statusText}>{getStatusText(child.status)}</Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={styles.moreButton}
                      onPress={() => handleMoreOptions(child)}
                      disabled={deletingStudentId === child.id || uploadingPhotoId === child.id}
                    >
                      {deletingStudentId === child.id || uploadingPhotoId === child.id ? (
                        <ActivityIndicator size="small" color={COLORS.TEXT_SECONDARY} />
                      ) : (
                        <MaterialIcons name="more-vert" size={24} color={COLORS.TEXT_SECONDARY} />
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.childStats}>
                    <View style={styles.statItem}>
                      <MaterialIcons name="school" size={16} color={COLORS.TEXT_SECONDARY} />
                      <Text style={styles.statItemText} numberOfLines={1}>
                        {child.schoolName || 'Chưa có trường'}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <MaterialIcons name="location-on" size={16} color={COLORS.TEXT_SECONDARY} />
                      <Text style={styles.statItemText} numberOfLines={1}>
                        {child.branchName || 'Chưa có chi nhánh'}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <MaterialIcons name="date-range" size={16} color={COLORS.TEXT_SECONDARY} />
                      <Text style={styles.statItemText} numberOfLines={1}>
                        {formatDateForDisplay(child.dateOfBirth)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.primaryButton]}
                      onPress={() => handleViewDetails(child)}
                    >
                      <MaterialIcons name="visibility" size={16} color={COLORS.SURFACE} />
                      <Text style={styles.actionButtonText}>Chi tiết</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.secondaryButton]}
                      onPress={() => handleClasses(child)}
                    >
                      <MaterialIcons name="school" size={16} color={COLORS.SECONDARY} />
                      <Text style={[styles.actionButtonText, { color: COLORS.SECONDARY }]}>Lớp học</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.tertiaryButton]}
                      onPress={() => handleViewPackages(child)}
                    >
                      <MaterialIcons name="shopping-cart" size={16} color={COLORS.PRIMARY} />
                      <Text style={[styles.actionButtonText, { color: COLORS.PRIMARY }]}>Gói học</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.packageContainer}>
                    <View style={styles.packageHeader}>
                      <MaterialIcons name="card-membership" size={18} color={COLORS.PRIMARY} />
                      <Text style={styles.packageTitle}>Gói đã đăng ký</Text>
                      <TouchableOpacity 
                        onPress={() => fetchStudentPackages(child.id, true)} 
                        style={styles.packageRefresh}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="refresh" size={20} color={COLORS.PRIMARY} />
                      </TouchableOpacity>
                    </View>
                    {studentPackages[child.id]?.loading ? (
                      <View style={styles.packageStateRow}>
                        <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                        <Text style={styles.packageStateText}>Đang tải gói đã đăng ký...</Text>
                      </View>
                    ) : studentPackages[child.id]?.error ? (
                      <View>
                        <View style={styles.packageStateRow}>
                          <MaterialIcons name="error-outline" size={18} color={COLORS.ERROR} />
                          <Text style={[styles.packageStateText, { color: COLORS.ERROR }]}>
                            {studentPackages[child.id]?.error}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.packageRetryButton}
                          onPress={() => handleRetryPackages(child.id)}
                        >
                          <Text style={styles.packageRetryText}>Thử lại</Text>
                        </TouchableOpacity>
                      </View>
                    ) : studentPackages[child.id]?.data?.length ? (
                      studentPackages[child.id].data.map((subscription) => (
                        <View key={subscription.id} style={styles.packageCard}>
                          <View style={styles.packageCardHeader}>
                            <Text style={styles.packageName}>{subscription.packageName}</Text>
                            <View
                              style={[
                                styles.packageStatusBadge,
                                subscription.status === 'Active'
                                  ? styles.packageStatusActive
                                  : styles.packageStatusInactive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.packageStatusText,
                                  subscription.status === 'Active'
                                    ? { color: COLORS.SURFACE }
                                    : { color: COLORS.TEXT_PRIMARY },
                                ]}
                              >
                                {subscription.status === 'Active' ? 'Đang hiệu lực' : subscription.status}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.packageDate}>
                            Bắt đầu: {formatDateForDisplay(subscription.startDate)} • Kết thúc: {formatDateForDisplay(subscription.endDate)}
                          </Text>
                          <Text style={styles.packageUsedSlot}>
                            {(() => {
                              const total = subscription.totalSlotsSnapshot ?? subscription.totalSlots ?? subscription.remainingSlots;
                              let totalDisplay: number | string = '?';
                              if (typeof total === 'number') {
                                totalDisplay = total;
                              } else {
                                const nameMatch = subscription.packageName?.match(/(\d+)/);
                                if (nameMatch) {
                                  totalDisplay = parseInt(nameMatch[1], 10);
                                }
                              }
                              const used = subscription.usedSlot || 0;
                              const remaining = typeof totalDisplay === 'number' 
                                ? Math.max(totalDisplay - used, 0) 
                                : undefined;
                              
                              return `Số buổi đã dùng: ${used}${typeof totalDisplay === 'number' ? ` / ${totalDisplay}` : ''}${remaining !== undefined ? ` • Còn lại: ${remaining}` : ''}`;
                            })()}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.packageStateText}>
                        Chưa có gói nào được đăng ký cho học sinh này.
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
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

          <TouchableOpacity style={styles.menuItem} onPress={handleMySubscriptions}>
            <MaterialIcons name="card-membership" size={24} color={COLORS.PRIMARY} />
            <Text style={styles.menuText}>Gói đăng ký của tôi</Text>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleOrderHistory}>
            <MaterialIcons name="receipt-long" size={24} color={COLORS.PRIMARY} />
            <Text style={styles.menuText}>Lịch sử đơn hàng</Text>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <MaterialIcons name="logout" size={24} color={COLORS.ERROR} />
            <Text style={[styles.menuText, { color: COLORS.ERROR }]}>Đăng xuất</Text>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editing}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseEdit}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Chỉnh sửa hồ sơ</Text>
                    <TouchableOpacity onPress={handleCloseEdit} disabled={updating}>
                      <MaterialIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                    {error && (
                      <View style={styles.errorContainer}>
                        <MaterialIcons name="error" size={20} color={COLORS.ERROR} />
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    )}

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Tên *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editName}
                        onChangeText={setEditName}
                        placeholder="Nhập tên của bạn"
                        placeholderTextColor={COLORS.TEXT_SECONDARY}
                        editable={!updating}
                        autoCapitalize="words"
                        returnKeyType="next"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Số điện thoại *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editPhoneNumber}
                        onChangeText={setEditPhoneNumber}
                        placeholder="Nhập số điện thoại (10-11 chữ số)"
                        placeholderTextColor={COLORS.TEXT_SECONDARY}
                        keyboardType="phone-pad"
                        editable={!updating}
                        maxLength={11}
                        returnKeyType="done"
                        onSubmitEditing={handleSaveProfile}
                      />
                    </View>
                  </ScrollView>

                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={handleCloseEdit}
                      disabled={updating}
                    >
                      <Text style={styles.cancelButtonText}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.saveButton, updating && styles.disabledButton]}
                      onPress={handleSaveProfile}
                      disabled={updating}
                    >
                      {updating ? (
                        <ActivityIndicator size="small" color={COLORS.SURFACE} />
                      ) : (
                        <Text style={styles.saveButtonText}>Lưu</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Family Profile Modal */}
      <Modal
        visible={addFamilyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseAddFamilyModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Thêm thành viên gia đình</Text>
                    <TouchableOpacity onPress={handleCloseAddFamilyModal} disabled={creatingFamilyProfile}>
                      <MaterialIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                    {error && (
                      <View style={styles.errorContainer}>
                        <MaterialIcons name="error" size={20} color={COLORS.ERROR} />
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    )}

                    {/* Avatar */}
                    <View style={styles.avatarSection}>
                      <Text style={styles.inputLabel}>Ảnh đại diện (tùy chọn)</Text>
                      {newFamilyAvatarUri ? (
                        <View style={styles.avatarPreviewContainer}>
                          <Image
                            source={{ uri: newFamilyAvatarUri }}
                            style={styles.avatarPreview}
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            style={styles.removeAvatarButton}
                            onPress={handleRemoveFamilyAvatar}
                            disabled={creatingFamilyProfile}
                          >
                            <MaterialIcons name="close" size={20} color={COLORS.SURFACE} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.avatarPickerButton}
                          onPress={handlePickFamilyAvatar}
                          disabled={creatingFamilyProfile}
                        >
                          <MaterialIcons name="camera-alt" size={32} color={COLORS.PRIMARY} />
                          <Text style={styles.avatarPickerText}>Chọn ảnh đại diện</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Name */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Tên thành viên *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={newFamilyName}
                        onChangeText={setNewFamilyName}
                        placeholder="Nhập tên thành viên"
                        placeholderTextColor={COLORS.TEXT_SECONDARY}
                        editable={!creatingFamilyProfile}
                        autoCapitalize="words"
                        returnKeyType="next"
                      />
                    </View>

                    {/* Phone */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Số điện thoại *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={newFamilyPhone}
                        onChangeText={setNewFamilyPhone}
                        placeholder="Nhập số điện thoại (10-11 chữ số)"
                        placeholderTextColor={COLORS.TEXT_SECONDARY}
                        keyboardType="phone-pad"
                        editable={!creatingFamilyProfile}
                        maxLength={11}
                        returnKeyType="next"
                      />
                    </View>

                    {/* Relationship Dropdown */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Mối quan hệ với học sinh *</Text>
                      <TouchableOpacity
                        style={styles.dropdownButton}
                        onPress={handleSelectRelationship}
                        disabled={creatingFamilyProfile}
                      >
                        <Text style={[
                          styles.dropdownText,
                          !newFamilyRela && styles.dropdownPlaceholder
                        ]}>
                          {newFamilyRela || 'Chọn mối quan hệ'}
                        </Text>
                        <MaterialIcons name="arrow-drop-down" size={24} color={COLORS.TEXT_SECONDARY} />
                      </TouchableOpacity>
                    </View>
                  </ScrollView>

                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={handleCloseAddFamilyModal}
                      disabled={creatingFamilyProfile}
                    >
                      <Text style={styles.cancelButtonText}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.saveButton, creatingFamilyProfile && styles.disabledButton]}
                      onPress={handleCreateFamilyProfile}
                      disabled={creatingFamilyProfile}
                    >
                      {creatingFamilyProfile ? (
                        <ActivityIndicator size="small" color={COLORS.SURFACE} />
                      ) : (
                        <Text style={styles.saveButtonText}>Thêm</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Child Modal */}
      <Modal
        visible={editChildModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setEditChildModalVisible(false);
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Chỉnh sửa thông tin</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      Keyboard.dismiss();
                      setEditChildModalVisible(false);
                    }}
                  >
                    <MaterialIcons name="close" size={24} color={COLORS.TEXT_SECONDARY} />
                  </TouchableOpacity>
                </View>
                
                {selectedChild && (
                  <ScrollView 
                    style={styles.modalBody}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.modalFormGroup}>
                      <Text style={styles.modalLabel}>Tên *</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={editChildName}
                        onChangeText={setEditChildName}
                        placeholder="Nhập tên của con"
                        placeholderTextColor={COLORS.TEXT_SECONDARY}
                      />
                    </View>

                    <View style={styles.modalFormGroup}>
                      <Text style={styles.modalLabel}>Ngày sinh</Text>
                      <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => {
                          Keyboard.dismiss();
                          initializeDatePicker();
                          setShowChildDatePicker(true);
                        }}
                      >
                        <Text style={[
                          styles.datePickerText,
                          !editChildDateOfBirth && styles.datePickerPlaceholder
                        ]}>
                          {editChildDateOfBirth 
                            ? editChildDateOfBirth.toLocaleDateString('vi-VN')
                            : 'Chọn ngày sinh'}
                        </Text>
                        <MaterialIcons name="calendar-today" size={20} color={COLORS.PRIMARY} />
                      </TouchableOpacity>
                      {editChildDateOfBirth && (
                        <TouchableOpacity
                          style={styles.clearDateButton}
                          onPress={() => setEditChildDateOfBirth(null)}
                        >
                          <MaterialIcons name="clear" size={16} color={COLORS.ERROR} />
                          <Text style={styles.clearDateText}>Xóa ngày</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.modalFormGroup}>
                      <Text style={styles.modalLabel}>Ghi chú</Text>
                      <TextInput
                        style={[styles.modalInput, styles.modalTextArea]}
                        value={editChildNote}
                        onChangeText={setEditChildNote}
                        placeholder="Nhập ghi chú (nếu có)"
                        placeholderTextColor={COLORS.TEXT_SECONDARY}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    </View>

                    <Text style={styles.modalSubtext}>
                      Trường: {selectedChild.schoolName || 'Chưa có'}{'\n'}
                      Cấp độ: {selectedChild.studentLevelName || 'Chưa có'}
                    </Text>
                  </ScrollView>
                )}
                
                <View style={styles.modalFooter}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => {
                      Keyboard.dismiss();
                      setEditChildModalVisible(false);
                    }}
                    disabled={updatingChild}
                  >
                    <Text style={[styles.modalButtonText, styles.modalButtonCancelText]}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalButton, updatingChild && styles.modalButtonDisabled]}
                    onPress={() => {
                      Keyboard.dismiss();
                      handleUpdateChild();
                    }}
                    disabled={updatingChild}
                  >
                    {updatingChild ? (
                      <ActivityIndicator size="small" color={COLORS.SURFACE} />
                    ) : (
                      <Text style={styles.modalButtonText}>Cập nhật</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Add Child Modal - sẽ thêm sau */}
      <Modal
        visible={addChildModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          handleCloseAddChildModal();
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[styles.modalContent, styles.addChildModalContent]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Đăng ký con mới</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      Keyboard.dismiss();
                      handleCloseAddChildModal();
                    }}
                    disabled={registering}
                  >
                    <MaterialIcons name="close" size={24} color={COLORS.TEXT_SECONDARY} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView 
                  style={styles.modalBody}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.modalFormGroup}>
                    <Text style={styles.modalLabel}>Tên *</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={addName}
                      onChangeText={setAddName}
                      placeholder="Nhập tên của con"
                      placeholderTextColor={COLORS.TEXT_SECONDARY}
                    />
                  </View>

                  <View style={styles.modalFormGroup}>
                    <Text style={styles.modalLabel}>Ngày sinh</Text>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => {
                        Keyboard.dismiss();
                        initializeAddDatePicker(addDateOfBirth);
                        setShowAddDatePicker(true);
                      }}
                    >
                      <Text style={[
                        styles.datePickerText,
                        !addDateOfBirth && styles.datePickerPlaceholder
                      ]}>
                        {addDateOfBirth 
                          ? addDateOfBirth.toLocaleDateString('vi-VN')
                          : 'Chọn ngày sinh'}
                      </Text>
                      <MaterialIcons name="calendar-today" size={20} color={COLORS.PRIMARY} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalFormGroup}>
                    <Text style={styles.modalLabel}>Ảnh đại diện</Text>
                    <TouchableOpacity
                      style={styles.imagePickerButton}
                      onPress={handlePickAddImage}
                    >
                      {addImageUri ? (
                        <Image source={{ uri: addImageUri }} style={styles.imagePickerPreview} />
                      ) : (
                        <View style={styles.imagePickerPlaceholder}>
                          <MaterialIcons name="add-photo-alternate" size={32} color={COLORS.TEXT_SECONDARY} />
                          <Text style={styles.imagePickerPlaceholderText}>Chọn ảnh</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalFormGroup}>
                    <Text style={styles.modalLabel}>Trường học</Text>
                    {loadingSchools ? (
                      <View style={styles.dropdownLoading}>
                        <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                        <Text style={styles.dropdownLoadingText}>Đang tải...</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.dropdownButton}
                        onPress={() => {
                          Keyboard.dismiss();
                          if (schools.length === 0) {
                            Alert.alert('Thông báo', 'Chưa có trường học nào.');
                            return;
                          }
                          Alert.alert(
                            'Chọn trường học',
                            '',
                            [
                              ...schools.map(school => ({
                                text: school.name,
                                onPress: () => setAddSchoolId(school.id),
                              })),
                              { text: 'Xóa lựa chọn', style: 'destructive', onPress: () => setAddSchoolId('') },
                              { text: 'Hủy', style: 'cancel' },
                            ],
                            { cancelable: true }
                          );
                        }}
                      >
                        <Text style={[
                          styles.dropdownText,
                          !addSchoolId && styles.dropdownPlaceholder
                        ]}>
                          {addSchoolId 
                            ? schools.find(s => s.id === addSchoolId)?.name || 'Đã chọn'
                            : 'Chọn trường học'}
                        </Text>
                        <MaterialIcons name="arrow-drop-down" size={24} color={COLORS.TEXT_SECONDARY} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.modalFormGroup}>
                    <Text style={styles.modalLabel}>Cấp độ học sinh</Text>
                    {loadingStudentLevels ? (
                      <View style={styles.dropdownLoading}>
                        <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                        <Text style={styles.dropdownLoadingText}>Đang tải...</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.dropdownButton}
                        onPress={() => {
                          Keyboard.dismiss();
                          if (studentLevels.length === 0) {
                            Alert.alert('Thông báo', 'Chưa có cấp độ nào.');
                            return;
                          }
                          Alert.alert(
                            'Chọn cấp độ',
                            '',
                            [
                              ...studentLevels.map(level => ({
                                text: level.name,
                                onPress: () => setAddStudentLevelId(level.id),
                              })),
                              { text: 'Xóa lựa chọn', style: 'destructive', onPress: () => setAddStudentLevelId('') },
                              { text: 'Hủy', style: 'cancel' },
                            ],
                            { cancelable: true }
                          );
                        }}
                      >
                        <Text style={[
                          styles.dropdownText,
                          !addStudentLevelId && styles.dropdownPlaceholder
                        ]}>
                          {addStudentLevelId 
                            ? studentLevels.find(l => l.id === addStudentLevelId)?.name || 'Đã chọn'
                            : 'Chọn cấp độ'}
                        </Text>
                        <MaterialIcons name="arrow-drop-down" size={24} color={COLORS.TEXT_SECONDARY} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.modalFormGroup}>
                    <Text style={styles.modalLabel}>Ghi chú</Text>
                    <TextInput
                      style={[styles.modalInput, styles.modalTextArea]}
                      value={addNote}
                      onChangeText={setAddNote}
                      placeholder="Nhập ghi chú (nếu có)"
                      placeholderTextColor={COLORS.TEXT_SECONDARY}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </ScrollView>
                
                <View style={styles.modalFooter}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => {
                      Keyboard.dismiss();
                      handleCloseAddChildModal();
                    }}
                    disabled={registering}
                  >
                    <Text style={[styles.modalButtonText, styles.modalButtonCancelText]}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalButton, registering && styles.modalButtonDisabled]}
                    onPress={() => {
                      Keyboard.dismiss();
                      handleRegisterChild();
                    }}
                    disabled={registering}
                  >
                    {registering ? (
                      <ActivityIndicator size="small" color={COLORS.SURFACE} />
                    ) : (
                      <Text style={styles.modalButtonText}>Đăng ký</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        visible={imageViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageViewerVisible(false)}
      >
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity
            style={styles.imageViewerCloseButton}
            onPress={() => setImageViewerVisible(false)}
          >
            <MaterialIcons name="close" size={24} color={COLORS.SURFACE} />
          </TouchableOpacity>
          
          {selectedImageUrl && (
            <View style={styles.imageViewerContainer}>
              <Image 
                source={{ uri: selectedImageUrl }} 
                style={styles.imageViewerImage}
                resizeMode="contain"
              />
              {selectedImageChild && (
                <View style={styles.imageViewerInfo}>
                  <Text style={styles.imageViewerName}>{selectedImageChild.name}</Text>
                  {selectedImageChild.studentLevelName && (
                    <Text style={styles.imageViewerLevel}>{selectedImageChild.studentLevelName}</Text>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>

      {/* Date Pickers */}
      {/* Edit Child Date Picker */}
      <Modal
        visible={showChildDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowChildDatePicker(false)}
        hardwareAccelerated={true}
        presentationStyle="overFullScreen"
      >
        <View style={styles.datePickerModalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1}
            onPress={() => setShowChildDatePicker(false)}
          />
          <View style={styles.datePickerModalContent} pointerEvents="box-none">
            <View style={styles.datePickerModalHeader}>
              <Text style={styles.datePickerModalTitle}>Chọn ngày sinh</Text>
              <TouchableOpacity onPress={() => setShowChildDatePicker(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>
            <View style={styles.simpleDatePickerContainer}>
              <View style={styles.dateInputRow}>
                <View style={styles.dateInputGroup}>
                  <Text style={styles.dateInputLabel}>Ngày</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={selectedDayInput}
                    onChangeText={(text) => {
                      const numericText = text.replace(/[^0-9]/g, '');
                      if (numericText === '' || (parseInt(numericText) >= 1 && parseInt(numericText) <= 31)) {
                        setSelectedDayInput(numericText);
                      }
                    }}
                    placeholder="DD"
                    placeholderTextColor={COLORS.TEXT_SECONDARY}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View style={styles.dateInputGroup}>
                  <Text style={styles.dateInputLabel}>Tháng</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={selectedMonthInput}
                    onChangeText={(text) => {
                      const numericText = text.replace(/[^0-9]/g, '');
                      if (numericText === '' || (parseInt(numericText) >= 1 && parseInt(numericText) <= 12)) {
                        setSelectedMonthInput(numericText);
                      }
                    }}
                    placeholder="MM"
                    placeholderTextColor={COLORS.TEXT_SECONDARY}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View style={styles.dateInputGroup}>
                  <Text style={styles.dateInputLabel}>Năm</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={selectedYearInput}
                    onChangeText={(text) => {
                      const numericText = text.replace(/[^0-9]/g, '');
                      const currentYear = new Date().getFullYear();
                      const numValue = parseInt(numericText);
                      if (numericText === '' || 
                          numericText.length < 4 || 
                          (numericText.length === 4 && numValue >= 1950 && numValue <= currentYear)) {
                        setSelectedYearInput(numericText);
                      }
                    }}
                    placeholder="YYYY"
                    placeholderTextColor={COLORS.TEXT_SECONDARY}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
              </View>
              <Text style={styles.dateInputHint}>
                Nhập ngày (1-31), tháng (1-12), năm (1950-{new Date().getFullYear()})
              </Text>
            </View>
            <View style={styles.datePickerModalFooter}>
              <TouchableOpacity
                style={[styles.datePickerModalButton, styles.datePickerModalButtonCancel]}
                onPress={() => setShowChildDatePicker(false)}
              >
                <Text style={styles.datePickerModalButtonCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.datePickerModalButton, styles.datePickerModalButtonConfirm]}
                onPress={handleConfirmDate}
              >
                <Text style={styles.datePickerModalButtonConfirmText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Child Date Picker */}
      <Modal
        visible={showAddDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddDatePicker(false)}
        hardwareAccelerated={true}
        presentationStyle="overFullScreen"
      >
        <View style={styles.datePickerModalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1}
            onPress={() => setShowAddDatePicker(false)}
          />
          <View style={styles.datePickerModalContent} pointerEvents="box-none">
            <View style={styles.datePickerModalHeader}>
              <Text style={styles.datePickerModalTitle}>Chọn ngày sinh</Text>
              <TouchableOpacity onPress={() => setShowAddDatePicker(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>
            <View style={styles.simpleDatePickerContainer}>
              <View style={styles.dateInputRow}>
                <View style={styles.dateInputGroup}>
                  <Text style={styles.dateInputLabel}>Ngày</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={addSelectedDayInput}
                    onChangeText={(text) => {
                      const numericText = text.replace(/[^0-9]/g, '');
                      if (numericText === '' || (parseInt(numericText) >= 1 && parseInt(numericText) <= 31)) {
                        setAddSelectedDayInput(numericText);
                      }
                    }}
                    placeholder="DD"
                    placeholderTextColor={COLORS.TEXT_SECONDARY}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View style={styles.dateInputGroup}>
                  <Text style={styles.dateInputLabel}>Tháng</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={addSelectedMonthInput}
                    onChangeText={(text) => {
                      const numericText = text.replace(/[^0-9]/g, '');
                      if (numericText === '' || (parseInt(numericText) >= 1 && parseInt(numericText) <= 12)) {
                        setAddSelectedMonthInput(numericText);
                      }
                    }}
                    placeholder="MM"
                    placeholderTextColor={COLORS.TEXT_SECONDARY}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View style={styles.dateInputGroup}>
                  <Text style={styles.dateInputLabel}>Năm</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={addSelectedYearInput}
                    onChangeText={(text) => {
                      const numericText = text.replace(/[^0-9]/g, '');
                      const currentYear = new Date().getFullYear();
                      const numValue = parseInt(numericText);
                      if (numericText === '' || 
                          numericText.length < 4 || 
                          (numericText.length === 4 && numValue >= 1950 && numValue <= currentYear)) {
                        setAddSelectedYearInput(numericText);
                      }
                    }}
                    placeholder="YYYY"
                    placeholderTextColor={COLORS.TEXT_SECONDARY}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
              </View>
              <Text style={styles.dateInputHint}>
                Nhập ngày (1-31), tháng (1-12), năm (1950-{new Date().getFullYear()})
              </Text>
            </View>
            <View style={styles.datePickerModalFooter}>
              <TouchableOpacity
                style={[styles.datePickerModalButton, styles.datePickerModalButtonCancel]}
                onPress={() => setShowAddDatePicker(false)}
              >
                <Text style={styles.datePickerModalButtonCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.datePickerModalButton, styles.datePickerModalButtonConfirm]}
                onPress={handleConfirmAddDate}
              >
                <Text style={styles.datePickerModalButtonConfirmText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Family Profile Modal */}
      <Modal
        visible={editFamilyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseEditFamilyModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Chỉnh sửa thành viên gia đình</Text>
                    <TouchableOpacity onPress={handleCloseEditFamilyModal} disabled={updatingFamilyProfile}>
                      <MaterialIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                    {error && (
                      <View style={styles.errorContainer}>
                        <MaterialIcons name="error" size={20} color={COLORS.ERROR} />
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    )}

                    {/* Avatar */}
                    <View style={styles.avatarSection}>
                      <Text style={styles.inputLabel}>Ảnh đại diện (tùy chọn)</Text>
                      {editFamilyAvatarUri || editFamilyAvatarUrl ? (
                        <View style={styles.avatarPreviewContainer}>
                          <Image
                            source={{ uri: editFamilyAvatarUri || editFamilyAvatarUrl || '' }}
                            style={styles.avatarPreview}
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            style={styles.removeAvatarButton}
                            onPress={handleRemoveEditFamilyAvatar}
                            disabled={updatingFamilyProfile}
                          >
                            <MaterialIcons name="close" size={20} color={COLORS.SURFACE} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.avatarPickerButton}
                          onPress={handlePickEditFamilyAvatar}
                          disabled={updatingFamilyProfile}
                        >
                          <MaterialIcons name="camera-alt" size={32} color={COLORS.PRIMARY} />
                          <Text style={styles.avatarPickerText}>Chọn ảnh đại diện</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Name */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Tên thành viên *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editFamilyName}
                        onChangeText={setEditFamilyName}
                        placeholder="Nhập tên thành viên"
                        placeholderTextColor={COLORS.TEXT_SECONDARY}
                        editable={!updatingFamilyProfile}
                        autoCapitalize="words"
                        returnKeyType="next"
                      />
                    </View>

                    {/* Phone */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Số điện thoại *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editFamilyPhone}
                        onChangeText={setEditFamilyPhone}
                        placeholder="Nhập số điện thoại (10-11 chữ số)"
                        placeholderTextColor={COLORS.TEXT_SECONDARY}
                        keyboardType="phone-pad"
                        editable={!updatingFamilyProfile}
                        maxLength={11}
                        returnKeyType="next"
                      />
                    </View>

                    {/* Relationship Dropdown */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Mối quan hệ với học sinh *</Text>
                      <TouchableOpacity
                        style={styles.dropdownButton}
                        onPress={handleSelectEditRelationship}
                        disabled={updatingFamilyProfile}
                      >
                        <Text style={[
                          styles.dropdownText,
                          !editFamilyRela && styles.dropdownPlaceholder
                        ]}>
                          {editFamilyRela || 'Chọn mối quan hệ'}
                        </Text>
                        <MaterialIcons name="arrow-drop-down" size={24} color={COLORS.TEXT_SECONDARY} />
                      </TouchableOpacity>
                    </View>
                  </ScrollView>

                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={handleCloseEditFamilyModal}
                      disabled={updatingFamilyProfile}
                    >
                      <Text style={styles.cancelButtonText}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.saveButton, updatingFamilyProfile && styles.disabledButton]}
                      onPress={handleUpdateFamilyProfile}
                      disabled={updatingFamilyProfile}
                    >
                      {updatingFamilyProfile ? (
                        <ActivityIndicator size="small" color={COLORS.SURFACE} />
                      ) : (
                        <Text style={styles.saveButtonText}>Cập nhật</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  errorText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.ERROR,
    textAlign: 'center',
  },
  userCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.LG,
    alignItems: 'center',
    marginBottom: SPACING.LG,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.MD,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: COLORS.PRIMARY_LIGHT,
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarEditOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: SPACING.XS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: FONTS.SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
    textAlign: 'center',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY_LIGHT + '20',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS,
    borderRadius: 16,
    marginBottom: SPACING.SM,
  },
  userRole: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
    marginLeft: SPACING.XS,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.XS,
  },
  userInfoText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.XS,
  },
  section: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.MD,
    marginBottom: SPACING.LG,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addFamilyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 12,
    gap: SPACING.XS,
  },
  addFamilyButtonText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.LG,
    gap: SPACING.SM,
  },
  familyLoadingText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: SPACING.XL,
  },
  emptyText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  familyProfilesList: {
    gap: SPACING.SM,
  },
  familyProfileCard: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    padding: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  familyProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  familyProfileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: SPACING.MD,
  },
  familyProfileAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.PRIMARY_LIGHT + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  familyProfileInfo: {
    flex: 1,
  },
  familyProfileName: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  familyProfileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS,
    gap: SPACING.XS,
  },
  familyProfilePhone: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  familyProfileRelation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY_LIGHT + '20',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: SPACING.XS,
  },
  familyProfileRelationText: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  familyProfileStudents: {
    marginTop: SPACING.SM,
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  familyProfileStudentsLabel: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  familyProfileActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.SM,
    marginTop: SPACING.SM,
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  familyProfileActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 8,
    backgroundColor: COLORS.PRIMARY_LIGHT + '20',
    gap: SPACING.XS,
  },
  familyProfileDeleteButton: {
    backgroundColor: COLORS.ERROR + '20',
  },
  familyProfileActionText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  familyProfileDeleteText: {
    color: COLORS.ERROR,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: SPACING.SM,
    borderRadius: 8,
    marginBottom: SPACING.MD,
  },
  detailCard: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    padding: SPACING.MD,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.MD,
    paddingBottom: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  detailContent: {
    flex: 1,
    marginLeft: SPACING.MD,
  },
  detailLabel: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  detailValue: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  menuContainer: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: SPACING.LG,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? SPACING.XL : SPACING.MD,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  modalTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  modalBody: {
    padding: SPACING.MD,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: SPACING.MD,
  },
  inputLabel: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.BACKGROUND,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    gap: SPACING.SM,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.MD,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  cancelButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  saveButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  saveButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  disabledButton: {
    opacity: 0.6,
  },
  avatarSection: {
    marginBottom: SPACING.MD,
  },
  avatarPreviewContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginTop: SPACING.SM,
  },
  avatarPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  removeAvatarButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.ERROR,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPickerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: SPACING.LG,
    marginTop: SPACING.SM,
    backgroundColor: COLORS.BACKGROUND,
  },
  avatarPickerText: {
    marginTop: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.BACKGROUND,
    minHeight: 48,
  },
  dropdownText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  dropdownPlaceholder: {
    color: COLORS.TEXT_SECONDARY,
  },
  // Children Management Styles
  addChildButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 12,
    gap: SPACING.XS,
  },
  addChildButtonText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  childrenList: {
    gap: SPACING.MD,
  },
  childCard: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 16,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  childAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.PRIMARY_LIGHT + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarText: {
    fontSize: FONTS.SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  childDetails: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.XS,
  },
  statusText: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
  moreButton: {
    padding: SPACING.XS,
  },
  childStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.SM,
    marginBottom: SPACING.MD,
    paddingBottom: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: '30%',
  },
  statItemText: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.XS,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.SM,
    marginBottom: SPACING.MD,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.SM,
    borderRadius: 8,
    gap: SPACING.XS,
  },
  primaryButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  secondaryButton: {
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  tertiaryButton: {
    backgroundColor: COLORS.PRIMARY_LIGHT + '20',
  },
  actionButtonText: {
    fontSize: FONTS.SIZES.XS,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  packageContainer: {
    marginTop: SPACING.MD,
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
    gap: SPACING.XS,
  },
  packageTitle: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  packageRefresh: {
    padding: SPACING.SM,
    marginLeft: SPACING.SM,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
    minHeight: 40,
  },
  packageStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
    paddingVertical: SPACING.SM,
  },
  packageStateText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  packageRetryButton: {
    marginTop: SPACING.SM,
    paddingVertical: SPACING.XS,
    paddingHorizontal: SPACING.MD,
    backgroundColor: COLORS.PRIMARY_LIGHT + '20',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  packageRetryText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  packageCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    padding: SPACING.SM,
    marginBottom: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  packageCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.XS,
  },
  packageName: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  packageStatusBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 12,
  },
  packageStatusActive: {
    backgroundColor: COLORS.SUCCESS,
  },
  packageStatusInactive: {
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  packageStatusText: {
    fontSize: FONTS.SIZES.XS,
    fontWeight: '600',
  },
  packageDate: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  packageUsedSlot: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
  emptySubtext: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.XS,
  },
  emptyButton: {
    marginTop: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  modalSubtext: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.SM,
    padding: SPACING.SM,
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 8,
  },
  modalTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.BACKGROUND,
  },
  datePickerText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  datePickerPlaceholder: {
    color: COLORS.TEXT_SECONDARY,
  },
  clearDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.XS,
    alignSelf: 'flex-start',
  },
  clearDateText: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.ERROR,
    marginLeft: SPACING.XS,
  },
  imagePickerButton: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    padding: SPACING.MD,
    backgroundColor: COLORS.BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  imagePickerPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerPlaceholderText: {
    marginTop: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  imagePickerPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  documentPickerButton: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    padding: SPACING.MD,
    backgroundColor: COLORS.BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  documentPickerPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentPickerPlaceholderText: {
    marginTop: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  documentPickerPreview: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentPickerText: {
    marginTop: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  addChildModalContent: {
    maxHeight: '90%',
    width: '95%',
    maxWidth: 500,
  },
  dropdownLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
  },
  dropdownLoadingText: {
    marginLeft: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerImage: {
    width: '100%',
    height: '80%',
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: SPACING.MD,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: SPACING.SM,
  },
  imageViewerInfo: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
  },
  imageViewerName: {
    fontSize: FONTS.SIZES.XL,
    fontWeight: 'bold',
    color: COLORS.SURFACE,
    marginBottom: SPACING.XS,
    textAlign: 'center',
  },
  imageViewerLevel: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.SURFACE,
    opacity: 0.8,
    textAlign: 'center',
  },
  // Date Picker Modal Styles
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    backgroundColor: COLORS.SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.LG,
    maxHeight: '70%',
  },
  datePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
    paddingBottom: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  datePickerModalTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  simpleDatePickerContainer: {
    paddingVertical: SPACING.MD,
  },
  dateInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.SM,
  },
  dateInputGroup: {
    flex: 1,
  },
  dateInputLabel: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.BACKGROUND,
    textAlign: 'center',
  },
  dateInputHint: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.SM,
    textAlign: 'center',
  },
  datePickerModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.MD,
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  datePickerModalButton: {
    flex: 1,
    paddingVertical: SPACING.MD,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: SPACING.XS,
  },
  datePickerModalButtonCancel: {
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  datePickerModalButtonConfirm: {
    backgroundColor: COLORS.PRIMARY,
  },
  datePickerModalButtonCancelText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  datePickerModalButtonConfirmText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
});

export default ProfileScreen;
