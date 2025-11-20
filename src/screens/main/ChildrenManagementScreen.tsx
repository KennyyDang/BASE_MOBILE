import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Alert,
  Modal,
  ActivityIndicator,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { useMyChildren } from '../../hooks/useChildrenApi';
import { StudentResponse, StudentPackageSubscription } from '../../types/api';
import { RootStackParamList } from '../../types';
import packageService from '../../services/packageService';
import childrenService from '../../services/childrenService';
import studentLevelService from '../../services/studentLevelService';
import schoolService, { SchoolResponse } from '../../services/schoolService';
import parentProfileService, { CurrentUserResponse } from '../../services/parentProfileService';

// Inline constants
const COLORS = {
  PRIMARY: '#1976D2',
  PRIMARY_DARK: '#1565C0',
  PRIMARY_LIGHT: '#42A5F5',
  SECONDARY: '#2196F3',
  ACCENT: '#64B5F6',
  BACKGROUND: '#F5F7FA',
  SURFACE: '#FFFFFF',
  TEXT_PRIMARY: '#1A1A1A',
  TEXT_SECONDARY: '#6B7280',
  BORDER: '#E5E7EB',
  SUCCESS: '#4CAF50',
  WARNING: '#FF9800',
  ERROR: '#F44336',
  SHADOW: '#000000',
};

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

const ChildrenManagementScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { students, loading, error, refetch } = useMyChildren();
  const [selectedChild, setSelectedChild] = useState<StudentResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDateOfBirth, setEditDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editNote, setEditNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImageChild, setSelectedImageChild] = useState<StudentResponse | null>(null);
  
  // Add Child Form States
  const [addChildModalVisible, setAddChildModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUserResponse | null>(null);
  const [registering, setRegistering] = useState(false);
  
  // Form fields
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
  
  // Date picker states for add form - using TextInput for compatibility
  const [showAddDatePicker, setShowAddDatePicker] = useState(false);
  const [showAddIssuedDatePicker, setShowAddIssuedDatePicker] = useState(false);
  const [showAddExpirationDatePicker, setShowAddExpirationDatePicker] = useState(false);
  const [addSelectedDayInput, setAddSelectedDayInput] = useState<string>('');
  const [addSelectedMonthInput, setAddSelectedMonthInput] = useState<string>('');
  const [addSelectedYearInput, setAddSelectedYearInput] = useState<string>('');
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

  // Show error alert
  useEffect(() => {
    if (error) {
      Alert.alert('Lỗi', error, [
        { text: 'Thử lại', onPress: () => refetch() },
        { text: 'Đóng', style: 'cancel' },
      ]);
    }
  }, [error, refetch]);

  const handleRefresh = async () => {
    await refetch();
  };

  // Format date helper - handle invalid dates
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Chưa có';
    
    try {
      const date = new Date(dateString);
      // Check if date is valid (not epoch or invalid)
      if (isNaN(date.getTime()) || date.getTime() === 0) {
        return 'Chưa có';
      }
      return date.toLocaleDateString('vi-VN');
    } catch (e) {
      return 'Chưa có';
    }
  };


  // Fetch current user for branchId
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const user = await parentProfileService.getCurrentUser();
        setCurrentUser(user);
      } catch (err) {
        console.warn('Failed to fetch current user:', err);
      }
    };
    fetchCurrentUser();
  }, []);

  // Fetch schools and student levels when modal opens
  useEffect(() => {
    if (addChildModalVisible && currentUser?.branchId) {
      fetchSchools();
      fetchStudentLevels();
    }
  }, [addChildModalVisible, currentUser?.branchId]);

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
    setLoadingStudentLevels(true);
    try {
      const response = await studentLevelService.getStudentLevelsPaged({
        pageIndex: 1,
        pageSize: 100,
        branchId: currentUser?.branchId || undefined,
      });
      setStudentLevels(response.items.map(l => ({ id: l.id, name: l.name })));
    } catch (err) {
      console.warn('Failed to fetch student levels:', err);
    } finally {
      setLoadingStudentLevels(false);
    }
  };

  const handleAddChild = async () => {
    // Reset form
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
    
    // Check if user has branchId
    if (!currentUser) {
      try {
        const user = await parentProfileService.getCurrentUser();
        setCurrentUser(user);
        if (!user.branchId) {
          Alert.alert('Lỗi', 'Bạn chưa được gán vào chi nhánh nào. Vui lòng liên hệ admin.');
          return;
        }
      } catch (err) {
        Alert.alert('Lỗi', 'Không thể tải thông tin người dùng.');
        return;
      }
    }
    
    if (!currentUser?.branchId) {
      Alert.alert('Lỗi', 'Bạn chưa được gán vào chi nhánh nào. Vui lòng liên hệ admin.');
      return;
    }

    setAddChildModalVisible(true);
  };

  const handleCloseAddChildModal = () => {
    setAddChildModalVisible(false);
    // Reset form
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
    // Reset date picker states to prevent UI freeze
    setShowAddDatePicker(false);
    setShowAddIssuedDatePicker(false);
    setShowAddExpirationDatePicker(false);
    // Reset date picker input values
    setAddSelectedDayInput('');
    setAddSelectedMonthInput('');
    setAddSelectedYearInput('');
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

  const handleRegisterChild = async () => {
    if (!addName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên của con.');
      return;
    }

    if (!currentUser?.branchId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin chi nhánh.');
      return;
    }

    setRegistering(true);
    try {
      // Convert dates to ISO strings
      const dateOfBirth = addDateOfBirth 
        ? new Date(addDateOfBirth.getFullYear(), addDateOfBirth.getMonth(), addDateOfBirth.getDate(), 12, 0, 0, 0).toISOString()
        : undefined;
      
      const issuedDate = addIssuedDate 
        ? new Date(addIssuedDate.getFullYear(), addIssuedDate.getMonth(), addIssuedDate.getDate(), 12, 0, 0, 0).toISOString()
        : undefined;
      
      const expirationDate = addExpirationDate 
        ? new Date(addExpirationDate.getFullYear(), addExpirationDate.getMonth(), addExpirationDate.getDate(), 12, 0, 0, 0).toISOString()
        : undefined;

      await childrenService.registerChild({
        name: addName.trim(),
        dateOfBirth,
        note: addNote.trim() || undefined,
        image: addImageUri || undefined,
        branchId: currentUser.branchId,
        schoolId: addSchoolId || undefined,
        studentLevelId: addStudentLevelId || undefined,
        documentType: addDocumentType || undefined,
        issuedBy: addIssuedBy.trim() || undefined,
        issuedDate,
        expirationDate,
        documentFile: addDocumentFileUri || undefined,
      });

      Alert.alert('Thành công', 'Đã đăng ký con thành công!');
      handleCloseAddChildModal();
      refetch();
    } catch (error: any) {
      let message = 'Không thể đăng ký con. Vui lòng thử lại.';
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
      setRegistering(false);
    }
  };

  // Document Type Options
  const documentTypes = [
    'BirthCertificate',
    'HouseholdBook',
    'GuardianCertificate',
    'AuthorizationLetter',
    'AdoptionCertificate',
    'DivorceCustodyDecision',
    'StudentCard',
    'SchoolEnrollmentConfirmation',
    'AcademicRecordBook',
    'VnEduScreenshot',
    'TuitionReceipt',
    'CertificateOrLetter',
    'Other',
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

  // Date picker helpers for add form - using TextInput
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

  const handleMoreOptions = (child: StudentResponse) => {
    Alert.alert(
      'Tùy chọn',
      `Chọn hành động cho ${child.name}`,
      [
        {
          text: 'Chỉnh sửa',
          onPress: () => handleEditChild(child),
        },
        {
          text: 'Upload ảnh',
          onPress: () => handlePickImage(child),
        },
        {
          text: 'Xóa con',
          style: 'destructive',
          onPress: () => handleDeleteConfirm(child),
        },
        {
          text: 'Hủy',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const handlePickImage = async (child: StudentResponse) => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập',
          'Cần quyền truy cập thư viện ảnh để upload ảnh cho con.'
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
        await handleUploadPhoto(child, asset.uri, asset.mimeType || 'image/jpeg');
      }
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  const handleUploadPhoto = async (child: StudentResponse, uri: string, mimeType: string) => {
    setUploadingPhotoId(child.id);
    try {
      const updatedStudent = await childrenService.uploadStudentPhoto(
        child.id,
        uri,
        undefined,
        mimeType
      );
      
      Alert.alert('Thành công', `Đã upload ảnh cho ${child.name} thành công!`);
      refetch(); // Refresh list to show new photo
    } catch (error: any) {
      const errorMessage = error?.message || error?.data?.message || 'Không thể upload ảnh. Vui lòng thử lại.';
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setUploadingPhotoId(null);
    }
  };

  const handleViewImage = (child: StudentResponse) => {
    if (child.image) {
      setSelectedImageUrl(child.image);
      setSelectedImageChild(child);
      setImageViewerVisible(true);
    }
  };

  const handleEditChild = (child: StudentResponse) => {
    setSelectedChild(child);
    setEditName(child.name || '');
    
    // Parse date from ISO string, set to null if invalid
    // Use local time to avoid timezone issues
    if (child.dateOfBirth) {
      try {
        const dateStr = child.dateOfBirth;
        // Handle different date formats
        let date: Date;
        
        if (dateStr.includes('T')) {
          // ISO format with time - parse and use local time
          date = new Date(dateStr);
        } else {
          // Date only format (YYYY-MM-DD)
          const [year, month, day] = dateStr.split('-').map(Number);
          date = new Date(year, month - 1, day);
        }
        
        // Validate date
        if (isNaN(date.getTime())) {
          setEditDateOfBirth(null);
        } else {
          setEditDateOfBirth(date);
        }
      } catch (e) {
        setEditDateOfBirth(null);
      }
    } else {
      setEditDateOfBirth(null);
    }
    
    setEditNote(child.note || '');
    setShowDatePicker(false);
    setModalVisible(true);
  };

  const handleDeleteConfirm = (child: StudentResponse) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa con "${child.name}"?\n\nHành động này sẽ xóa (soft delete) thông tin con khỏi hệ thống.`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => handleDeleteChild(child),
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteChild = async (child: StudentResponse) => {
    setDeletingStudentId(child.id);
    try {
      await childrenService.deleteStudent(child.id);
      Alert.alert('Thành công', `Đã xóa con "${child.name}" khỏi hệ thống.`);
      refetch();
    } catch (error: any) {
      // Better error message extraction
      let message = 'Không thể xóa con. Vui lòng thử lại.';
      
      if (error?.response?.data) {
        const errorData = error.response.data;
        
        if (errorData.message) {
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
      setDeletingStudentId(null);
    }
  };

  // Simple Date Input states - using TextInput for compatibility
  const [selectedDayInput, setSelectedDayInput] = useState<string>('');
  const [selectedMonthInput, setSelectedMonthInput] = useState<string>('');
  const [selectedYearInput, setSelectedYearInput] = useState<string>('');
  
  // Get days in selected month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  // Initialize date picker values when opening
  const initializeDatePicker = () => {
    const date = editDateOfBirth || new Date();
    setSelectedDayInput(date.getDate().toString());
    setSelectedMonthInput((date.getMonth() + 1).toString());
    setSelectedYearInput(date.getFullYear().toString());
  };

  const handleConfirmDate = () => {
    const day = parseInt(selectedDayInput) || 1;
    const month = parseInt(selectedMonthInput) || 1;
    const year = parseInt(selectedYearInput) || new Date().getFullYear();
    
    // Validate date
    const maxDay = getDaysInMonth(year, month);
    const validDay = Math.min(Math.max(1, day), maxDay);
    const validMonth = Math.min(Math.max(1, month), 12);
    const validYear = Math.max(1950, Math.min(year, new Date().getFullYear()));
    
    const newDate = new Date(validYear, validMonth - 1, validDay);
    setEditDateOfBirth(newDate);
    setShowDatePicker(false);
  };

  // Helper function to normalize date to YYYY-MM-DD format (avoid timezone issues)
  const normalizeDateToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to compare dates ignoring time
  const areDatesEqual = (date1: Date | null, date2: Date | null): boolean => {
    if (!date1 || !date2) return false;
    return normalizeDateToString(date1) === normalizeDateToString(date2);
  };

  const handleUpdateChild = async () => {
    if (!selectedChild) return;

    if (!editName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên của con.');
      return;
    }

    setUpdating(true);
    try {
      const updateData: {
        name?: string;
        dateOfBirth?: string;
        note?: string;
      } = {};

      // Always include name in request (API requires name field)
      updateData.name = editName.trim();

      // Always include dateOfBirth to prevent it from being reset
      // If editDateOfBirth exists, use it; otherwise use the original date from selectedChild
      if (editDateOfBirth) {
        // Convert to ISO datetime string (API expects full ISO datetime, not just date)
        // Set time to noon UTC to avoid timezone issues when converting
        const dateForAPI = new Date(
          editDateOfBirth.getFullYear(),
          editDateOfBirth.getMonth(),
          editDateOfBirth.getDate(),
          12, 0, 0, 0
        );
        updateData.dateOfBirth = dateForAPI.toISOString();
      } else if (selectedChild.dateOfBirth) {
        // If no editDateOfBirth but original exists, keep the original date
        // Parse and reformat to ensure proper format
        try {
          const originalDate = new Date(selectedChild.dateOfBirth);
          if (!isNaN(originalDate.getTime())) {
            // Preserve the original date
            const dateForAPI = new Date(
              originalDate.getFullYear(),
              originalDate.getMonth(),
              originalDate.getDate(),
              12, 0, 0, 0
            );
            updateData.dateOfBirth = dateForAPI.toISOString();
          }
        } catch (e) {
          // If parsing fails, skip dateOfBirth
          console.warn('Failed to parse dateOfBirth:', e);
        }
      }

      if (editNote.trim() !== (selectedChild.note || '')) {
        updateData.note = editNote.trim();
      }

      if (Object.keys(updateData).length === 0) {
        Alert.alert('Thông báo', 'Không có thay đổi nào để cập nhật.');
        setUpdating(false);
        return;
      }

      await childrenService.updateChildByParent(selectedChild.id, updateData);
      Alert.alert('Thành công', 'Cập nhật thông tin con thành công.');
      setModalVisible(false);
      refetch();
    } catch (error: any) {
      // Better error message extraction - show validation errors more clearly
      let message = 'Không thể cập nhật thông tin con. Vui lòng thử lại.';
      
      if (error?.response?.data) {
        const errorData = error.response.data;
        
        // Handle validation errors - translate common errors to Vietnamese
        if (errorData.errors) {
          // Format validation errors into readable message
          const validationErrors: string[] = [];
          Object.keys(errorData.errors).forEach((key) => {
            const fieldErrors = errorData.errors[key];
            let fieldName = key;
            
            // Translate field names
            if (key.toLowerCase() === 'name') fieldName = 'Tên';
            else if (key.toLowerCase() === 'dateofbirth') fieldName = 'Ngày sinh';
            else if (key.toLowerCase() === 'note') fieldName = 'Ghi chú';
            
            if (Array.isArray(fieldErrors)) {
              fieldErrors.forEach((err: string) => {
                // Translate common error messages
                let translatedErr = err;
                if (err.toLowerCase().includes('required')) {
                  translatedErr = 'là bắt buộc';
                } else if (err.toLowerCase().includes('invalid')) {
                  translatedErr = 'không hợp lệ';
                }
                validationErrors.push(`${fieldName}: ${translatedErr}`);
              });
            } else {
              let translatedErr = fieldErrors;
              if (String(fieldErrors).toLowerCase().includes('required')) {
                translatedErr = 'là bắt buộc';
              }
              validationErrors.push(`${fieldName}: ${translatedErr}`);
            }
          });
          message = validationErrors.join('\n');
        } else if (errorData.message) {
          // Translate common API error messages
          let translatedMessage = errorData.message;
          if (errorData.message.toLowerCase().includes('student name is required')) {
            translatedMessage = 'Tên học sinh là bắt buộc';
          }
          message = translatedMessage;
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
      setUpdating(false);
    }
  };

  const handleViewDetails = (child: StudentResponse) => {
    Alert.alert(
      'Chi tiết học sinh',
      `Tên: ${child.name}\nNgày sinh: ${formatDate(child.dateOfBirth)}\nTrường: ${child.schoolName || 'Chưa có'}\nCấp độ: ${child.studentLevelName || 'Chưa có'}\nChi nhánh: ${child.branchName || 'Chưa có'}`,
      [{ text: 'Đóng', style: 'default' }]
    );
  };

  const handleAttendance = (child: StudentResponse) => {
    Alert.alert(
      'Điểm danh',
      `Xem lịch điểm danh của ${child.name}`,
      [{ text: 'Đóng', style: 'default' }]
    );
  };

  const handleClasses = (child: StudentResponse) => {
    Alert.alert(
      'Lớp học',
      `${child.name}\nTrường: ${child.schoolName || 'Chưa có'}\nCấp độ: ${child.studentLevelName || 'Chưa có'}`,
      [{ text: 'Đóng', style: 'default' }]
    );
  };

  const handleViewPackages = (child: StudentResponse) => {
    navigation.navigate('StudentPackages', {
      studentId: child.id,
      studentName: child.name,
      branchName: child.branchName || '',
      studentLevelName: child.studentLevelName || '',
    });
  };

  // Track which students have been fetched to prevent duplicate fetches
  const fetchedStudentsRef = useRef<Set<string>>(new Set());

  const fetchStudentPackages = useCallback(async (studentId: string) => {
    // Mark as fetching
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
      // Filter out cancelled and refunded subscriptions - only show Active packages
      const activeData = data.filter((sub) => {
        if (!sub.status) return false;
        const status = sub.status.trim().toUpperCase();
        // Only show packages with Active status (case-insensitive)
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
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể tải gói đã đăng ký. Vui lòng thử lại.';
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

    // Fetch packages for students that haven't been fetched yet
    students.forEach((student) => {
      if (!fetchedStudentsRef.current.has(student.id)) {
        fetchStudentPackages(student.id);
      }
    });
  }, [students, fetchStudentPackages]);

  const handleRetryPackages = (studentId: string) => {
    // Remove from fetched set to allow retry
    fetchedStudentsRef.current.delete(studentId);
    fetchStudentPackages(studentId);
  };


  const getStatusColor = (status: boolean) => {
    return status ? COLORS.SUCCESS : COLORS.ERROR;
  };

  const getStatusText = (status: boolean) => {
    return status ? 'Hoạt động' : 'Tạm nghỉ';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
        }
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={Platform.OS === 'android'}
        scrollEnabled={!showDatePicker && !showAddDatePicker && !showAddIssuedDatePicker && !showAddExpirationDatePicker}
        nestedScrollEnabled={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Quản lý con</Text>
            <Text style={styles.headerSubtitle}>
              Quản lý thông tin và hoạt động của con bạn
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.schoolsButton} 
              onPress={() => navigation.navigate('Schools')}
            >
              <MaterialIcons name="school" size={20} color={COLORS.PRIMARY} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={handleAddChild}>
              <MaterialIcons name="add" size={24} color={COLORS.SURFACE} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialIcons name="child-care" size={24} color={COLORS.PRIMARY} />
            {loading && !students.length ? (
              <ActivityIndicator size="small" color={COLORS.PRIMARY} style={{ marginTop: SPACING.SM }} />
            ) : (
              <Text style={styles.statNumber}>{students.length}</Text>
            )}
            <Text style={styles.statLabel}>Tổng số con</Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialIcons name="school" size={24} color={COLORS.SECONDARY} />
            {loading && !students.length ? (
              <ActivityIndicator size="small" color={COLORS.SECONDARY} style={{ marginTop: SPACING.SM }} />
            ) : (
              <Text style={styles.statNumber}>
                {students.filter(s => s.schoolName).length}
              </Text>
            )}
            <Text style={styles.statLabel}>Có trường học</Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialIcons name="check-circle" size={24} color={COLORS.SUCCESS} />
            {loading && !students.length ? (
              <ActivityIndicator size="small" color={COLORS.SUCCESS} style={{ marginTop: SPACING.SM }} />
            ) : (
              <Text style={styles.statNumber}>
                {students.filter(s => s.status).length}
              </Text>
            )}
            <Text style={styles.statLabel}>Đang hoạt động</Text>
          </View>
        </View>

        {/* Children List */}
        <View style={styles.childrenContainer}>
          <Text style={styles.sectionTitle}>Danh sách con</Text>
          
          {loading && !students.length ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
              <Text style={styles.loadingText}>Đang tải danh sách học sinh...</Text>
            </View>
          ) : (
            students.map((child) => (
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
                      {formatDate(child.dateOfBirth)}
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
                  onPress={() => handleAttendance(child)}
                >
                  <MaterialIcons name="check-circle" size={16} color={COLORS.PRIMARY} />
                  <Text style={[styles.actionButtonText, { color: COLORS.PRIMARY }]}>Điểm danh</Text>
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
                        Bắt đầu: {formatDate(subscription.startDate)} • Kết thúc: {formatDate(subscription.endDate)}
                      </Text>
                      <Text style={styles.packageUsedSlot}>
                        {(() => {
                          const total = subscription.totalSlotsSnapshot ?? subscription.totalSlots ?? subscription.remainingSlots;
                          let totalDisplay: number | string = '?';
                          if (typeof total === 'number') {
                            totalDisplay = total;
                          } else {
                            // Try to parse from packageName
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
            ))
          )}
        </View>

        {/* Empty State */}
        {!loading && students.length === 0 && (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="child-care" size={64} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.emptyTitle}>Chưa có con nào</Text>
            <Text style={styles.emptySubtitle}>
              Thêm con đầu tiên để bắt đầu quản lý
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddChild}>
              <Text style={styles.emptyButtonText}>Thêm con</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setModalVisible(false);
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
                  setModalVisible(false);
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
                    value={editName}
                    onChangeText={setEditName}
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
                      setShowDatePicker(true);
                    }}
                  >
                    <Text style={[
                      styles.datePickerText,
                      !editDateOfBirth && styles.datePickerPlaceholder
                    ]}>
                      {editDateOfBirth 
                        ? editDateOfBirth.toLocaleDateString('vi-VN')
                        : 'Chọn ngày sinh'}
                    </Text>
                    <MaterialIcons name="calendar-today" size={20} color={COLORS.PRIMARY} />
                  </TouchableOpacity>
                  {editDateOfBirth && (
                    <TouchableOpacity
                      style={styles.clearDateButton}
                      onPress={() => setEditDateOfBirth(null)}
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
                    value={editNote}
                    onChangeText={setEditNote}
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
                  setModalVisible(false);
                }}
                disabled={updating}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonCancelText]}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, updating && styles.modalButtonDisabled]}
                onPress={() => {
                  Keyboard.dismiss();
                  handleUpdateChild();
                }}
                disabled={updating}
              >
                {updating ? (
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

      {/* Custom Date Picker Modal - Simple Input Based */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
        hardwareAccelerated={true}
        presentationStyle="overFullScreen"
      >
        <View style={styles.datePickerModalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          />
          <View style={styles.datePickerModalContent} pointerEvents="box-none">
            <View style={styles.datePickerModalHeader}>
              <Text style={styles.datePickerModalTitle}>Chọn ngày sinh</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)} activeOpacity={0.7}>
                <MaterialIcons name="close" size={24} color={COLORS.TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>

            <View style={styles.simpleDatePickerContainer}>
              {/* Simple Text Input Date Picker - Compatible with iOS and Android */}
              <View style={styles.dateInputRow}>
                <View style={styles.dateInputGroup}>
                  <Text style={styles.dateInputLabel}>Ngày</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={selectedDayInput}
                    onChangeText={(text) => {
                      // Only allow numbers
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
                      // Only allow numbers
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
                      // Only allow numbers
                      const numericText = text.replace(/[^0-9]/g, '');
                      const currentYear = new Date().getFullYear();
                      const numValue = parseInt(numericText);
                      // Allow empty, or allow typing (less than 4 digits), or validate full year
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
                onPress={() => setShowDatePicker(false)}
                activeOpacity={0.7}
                delayPressIn={0}
              >
                <Text style={styles.datePickerModalButtonCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.datePickerModalButton, styles.datePickerModalButtonConfirm]}
                onPress={handleConfirmDate}
                activeOpacity={0.7}
                delayPressIn={0}
              >
                <Text style={styles.datePickerModalButtonConfirmText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Child Modal */}
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
                  {/* Name */}
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

                  {/* Date of Birth */}
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
                    {addDateOfBirth && (
                      <TouchableOpacity
                        style={styles.clearDateButton}
                        onPress={() => setAddDateOfBirth(null)}
                      >
                        <MaterialIcons name="clear" size={16} color={COLORS.ERROR} />
                        <Text style={styles.clearDateText}>Xóa ngày</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Image */}
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
                    {addImageUri && (
                      <TouchableOpacity
                        style={styles.clearDateButton}
                        onPress={() => setAddImageUri(null)}
                      >
                        <MaterialIcons name="clear" size={16} color={COLORS.ERROR} />
                        <Text style={styles.clearDateText}>Xóa ảnh</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* School */}
                  <View style={styles.modalFormGroup}>
                    <Text style={styles.modalLabel}>Trường học</Text>
                    {loadingSchools ? (
                      <View style={styles.dropdownLoading}>
                        <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                        <Text style={styles.dropdownLoadingText}>Đang tải danh sách trường...</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.dropdownButton}
                        onPress={() => {
                          Keyboard.dismiss();
                          if (schools.length === 0) {
                            Alert.alert('Thông báo', 'Chưa có trường học nào. Vui lòng thử lại sau.');
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
                              {
                                text: 'Xóa lựa chọn',
                                style: 'destructive',
                                onPress: () => setAddSchoolId(''),
                              },
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

                  {/* Student Level */}
                  <View style={styles.modalFormGroup}>
                    <Text style={styles.modalLabel}>Cấp độ học sinh</Text>
                    {loadingStudentLevels ? (
                      <View style={styles.dropdownLoading}>
                        <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                        <Text style={styles.dropdownLoadingText}>Đang tải cấp độ...</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.dropdownButton}
                        onPress={() => {
                          Keyboard.dismiss();
                          if (studentLevels.length === 0) {
                            Alert.alert('Thông báo', 'Chưa có cấp độ nào. Vui lòng thử lại sau.');
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
                              {
                                text: 'Xóa lựa chọn',
                                style: 'destructive',
                                onPress: () => setAddStudentLevelId(''),
                              },
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

                  {/* Note */}
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

                  {/* Document Section */}
                  <View style={styles.modalFormGroup}>
                    <Text style={[styles.modalLabel, { marginBottom: SPACING.MD }]}>Thông tin giấy tờ</Text>
                    
                    {/* Document Type */}
                    <Text style={[styles.modalLabel, { fontSize: FONTS.SIZES.XS }]}>Loại giấy tờ</Text>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => {
                        Keyboard.dismiss();
                        Alert.alert(
                          'Chọn loại giấy tờ',
                          '',
                          [
                            ...documentTypes.map(type => ({
                              text: getDocumentTypeLabel(type),
                              onPress: () => setAddDocumentType(type),
                            })),
                            {
                              text: 'Xóa lựa chọn',
                              style: 'destructive',
                              onPress: () => setAddDocumentType(''),
                            },
                            { text: 'Hủy', style: 'cancel' },
                          ],
                          { cancelable: true }
                        );
                      }}
                    >
                      <Text style={[
                        styles.dropdownText,
                        !addDocumentType && styles.dropdownPlaceholder
                      ]}>
                        {addDocumentType 
                          ? getDocumentTypeLabel(addDocumentType)
                          : 'Chọn loại giấy tờ'}
                      </Text>
                      <MaterialIcons name="arrow-drop-down" size={24} color={COLORS.TEXT_SECONDARY} />
                    </TouchableOpacity>

                    {/* Issued By */}
                    {addDocumentType && (
                      <>
                        <Text style={[styles.modalLabel, { fontSize: FONTS.SIZES.XS, marginTop: SPACING.SM }]}>Nơi cấp</Text>
                        <TextInput
                          style={styles.modalInput}
                          value={addIssuedBy}
                          onChangeText={setAddIssuedBy}
                          placeholder="Nhập nơi cấp"
                          placeholderTextColor={COLORS.TEXT_SECONDARY}
                        />

                        {/* Issued Date */}
                        <Text style={[styles.modalLabel, { fontSize: FONTS.SIZES.XS, marginTop: SPACING.SM }]}>Ngày cấp</Text>
                        <TouchableOpacity
                          style={styles.datePickerButton}
                          onPress={() => {
                            Keyboard.dismiss();
                            initializeAddDatePicker(addIssuedDate);
                            setShowAddIssuedDatePicker(true);
                          }}
                        >
                          <Text style={[
                            styles.datePickerText,
                            !addIssuedDate && styles.datePickerPlaceholder
                          ]}>
                            {addIssuedDate 
                              ? addIssuedDate.toLocaleDateString('vi-VN')
                              : 'Chọn ngày cấp'}
                          </Text>
                          <MaterialIcons name="calendar-today" size={20} color={COLORS.PRIMARY} />
                        </TouchableOpacity>
                        {addIssuedDate && (
                          <TouchableOpacity
                            style={styles.clearDateButton}
                            onPress={() => setAddIssuedDate(null)}
                          >
                            <MaterialIcons name="clear" size={16} color={COLORS.ERROR} />
                            <Text style={styles.clearDateText}>Xóa ngày</Text>
                          </TouchableOpacity>
                        )}

                        {/* Expiration Date */}
                        <Text style={[styles.modalLabel, { fontSize: FONTS.SIZES.XS, marginTop: SPACING.SM }]}>Ngày hết hạn</Text>
                        <TouchableOpacity
                          style={styles.datePickerButton}
                          onPress={() => {
                            Keyboard.dismiss();
                            initializeAddDatePicker(addExpirationDate);
                            setShowAddExpirationDatePicker(true);
                          }}
                        >
                          <Text style={[
                            styles.datePickerText,
                            !addExpirationDate && styles.datePickerPlaceholder
                          ]}>
                            {addExpirationDate 
                              ? addExpirationDate.toLocaleDateString('vi-VN')
                              : 'Chọn ngày hết hạn'}
                          </Text>
                          <MaterialIcons name="calendar-today" size={20} color={COLORS.PRIMARY} />
                        </TouchableOpacity>
                        {addExpirationDate && (
                          <TouchableOpacity
                            style={styles.clearDateButton}
                            onPress={() => setAddExpirationDate(null)}
                          >
                            <MaterialIcons name="clear" size={16} color={COLORS.ERROR} />
                            <Text style={styles.clearDateText}>Xóa ngày</Text>
                          </TouchableOpacity>
                        )}

                        {/* Document File */}
                        <Text style={[styles.modalLabel, { fontSize: FONTS.SIZES.XS, marginTop: SPACING.SM }]}>File giấy tờ</Text>
                        <TouchableOpacity
                          style={styles.documentPickerButton}
                          onPress={handlePickDocumentFile}
                        >
                          {addDocumentFileUri ? (
                            <View style={styles.documentPickerPreview}>
                              <MaterialIcons name="description" size={32} color={COLORS.PRIMARY} />
                              <Text style={styles.documentPickerText} numberOfLines={1}>Đã chọn file</Text>
                            </View>
                          ) : (
                            <View style={styles.documentPickerPlaceholder}>
                              <MaterialIcons name="attach-file" size={32} color={COLORS.TEXT_SECONDARY} />
                              <Text style={styles.documentPickerPlaceholderText}>Chọn file giấy tờ</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                        {addDocumentFileUri && (
                          <TouchableOpacity
                            style={styles.clearDateButton}
                            onPress={() => setAddDocumentFileUri(null)}
                          >
                            <MaterialIcons name="clear" size={16} color={COLORS.ERROR} />
                            <Text style={styles.clearDateText}>Xóa file</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    )}
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

      {/* Add Child Date Pickers */}
      {/* Date of Birth Picker */}
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
                      // Allow empty, or allow typing (less than 4 digits), or validate full year
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
              <TouchableOpacity style={[styles.datePickerModalButton, styles.datePickerModalButtonCancel]} onPress={() => setShowAddDatePicker(false)}>
                <Text style={styles.datePickerModalButtonCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.datePickerModalButton, styles.datePickerModalButtonConfirm]} onPress={handleConfirmAddDate}>
                <Text style={styles.datePickerModalButtonConfirmText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Issued Date Picker */}
      <Modal
        visible={showAddIssuedDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddIssuedDatePicker(false)}
        hardwareAccelerated={true}
        presentationStyle="overFullScreen"
      >
        <View style={styles.datePickerModalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1}
            onPress={() => setShowAddIssuedDatePicker(false)}
          />
          <View style={styles.datePickerModalContent} pointerEvents="box-none">
            <View style={styles.datePickerModalHeader}>
              <Text style={styles.datePickerModalTitle}>Chọn ngày cấp</Text>
              <TouchableOpacity onPress={() => setShowAddIssuedDatePicker(false)}>
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
                      // Allow empty, or allow typing (less than 4 digits), or validate full year
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
              <TouchableOpacity style={[styles.datePickerModalButton, styles.datePickerModalButtonCancel]} onPress={() => setShowAddIssuedDatePicker(false)}>
                <Text style={styles.datePickerModalButtonCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.datePickerModalButton, styles.datePickerModalButtonConfirm]} onPress={handleConfirmIssuedDate}>
                <Text style={styles.datePickerModalButtonConfirmText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Expiration Date Picker */}
      <Modal
        visible={showAddExpirationDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddExpirationDatePicker(false)}
        hardwareAccelerated={true}
        presentationStyle="overFullScreen"
      >
        <View style={styles.datePickerModalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1}
            onPress={() => setShowAddExpirationDatePicker(false)}
          />
          <View style={styles.datePickerModalContent} pointerEvents="box-none">
            <View style={styles.datePickerModalHeader}>
              <Text style={styles.datePickerModalTitle}>Chọn ngày hết hạn</Text>
              <TouchableOpacity onPress={() => setShowAddExpirationDatePicker(false)}>
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
                      // Allow empty, or allow typing (less than 4 digits), or validate full year
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
              <TouchableOpacity style={[styles.datePickerModalButton, styles.datePickerModalButtonCancel]} onPress={() => setShowAddExpirationDatePicker(false)}>
                <Text style={styles.datePickerModalButtonCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.datePickerModalButton, styles.datePickerModalButtonConfirm]} onPress={handleConfirmExpirationDate}>
                <Text style={styles.datePickerModalButtonConfirmText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={28} color={COLORS.SURFACE} />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  headerContent: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  },
  schoolsButton: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    padding: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  headerTitle: {
    fontSize: FONTS.SIZES.XXL,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  headerSubtitle: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  addButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    padding: SPACING.MD,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.LG,
  },
  statCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: SPACING.XS,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.SM,
  },
  statLabel: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.XS,
  },
  childrenContainer: {
    marginBottom: SPACING.LG,
  },
  sectionTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  childCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: COLORS.BACKGROUND,
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
    fontSize: 24,
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
    borderRadius: 30,
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
    padding: SPACING.SM,
  },
  childStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.MD,
    paddingHorizontal: SPACING.SM,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statItemText: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.XS,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: SPACING.XS,
    justifyContent: 'center',
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
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY + '33',
  },
  actionButtonText: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    marginLeft: SPACING.XS,
  },
  packageContainer: {
    marginTop: SPACING.MD,
    padding: SPACING.MD,
    borderRadius: 12,
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  packageTitle: {
    marginLeft: SPACING.SM,
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  packageStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  packageStateText: {
    marginLeft: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    flex: 1,
  },
  packageRetryButton: {
    alignSelf: 'flex-start',
    marginTop: SPACING.XS,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  packageRetryText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  packageCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.SM,
    marginBottom: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  packageCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.XS,
  },
  packageName: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    marginRight: SPACING.SM,
  },
  packageStatusBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 10,
  },
  packageStatusActive: {
    backgroundColor: COLORS.PRIMARY,
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
  },
  packageUsedSlot: {
    marginTop: SPACING.XS,
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: SPACING.XL,
  },
  emptyTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  emptySubtitle: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.LG,
  },
  emptyButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: SPACING.XL,
  },
  loadingText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.MD,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.LG,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  modalTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  modalBody: {
    marginBottom: SPACING.LG,
    maxHeight: 400,
  },
  modalText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  modalSubtext: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  modalFormGroup: {
    marginBottom: SPACING.MD,
  },
  modalLabel: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.SURFACE,
  },
  modalTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalHint: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS,
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
    backgroundColor: COLORS.SURFACE,
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
  iosDatePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.SM,
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  iosDatePickerButton: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 8,
    backgroundColor: COLORS.PRIMARY,
  },
  iosDatePickerButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
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
  datePickerWheelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    height: 200,
    marginVertical: SPACING.MD,
  },
  datePickerWheel: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: SPACING.XS,
  },
  datePickerWheelLabel: {
    fontSize: FONTS.SIZES.SM,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.SM,
  },
  datePickerScrollView: {
    flex: 1,
  },
  datePickerScrollContent: {
    paddingVertical: 80, // Add padding to center items
  },
  datePickerWheelItem: {
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderRadius: 8,
    marginVertical: SPACING.XS,
    minWidth: 60,
    alignItems: 'center',
  },
  datePickerWheelItemSelected: {
    backgroundColor: COLORS.PRIMARY,
  },
  datePickerWheelItemText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
  },
  datePickerWheelItemTextSelected: {
    color: COLORS.SURFACE,
    fontWeight: 'bold',
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
  modalButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.LG,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginLeft: SPACING.SM,
  },
  modalButtonCancel: {
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginLeft: 0,
  },
  modalButtonCancelText: {
    color: COLORS.TEXT_PRIMARY,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.MD,
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
  addChildModalContent: {
    maxHeight: '90%',
    width: '95%',
    maxWidth: 500,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.SURFACE,
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
    backgroundColor: COLORS.SURFACE,
    textAlign: 'center',
  },
  dateInputHint: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.SM,
    textAlign: 'center',
  },
});

export default ChildrenManagementScreen;
