import React, { useState, useEffect } from 'react';
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
  Platform,
  KeyboardAvoidingView,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONTS } from '../../constants';
import childrenService from '../../services/childrenService';
import schoolService from '../../services/schoolService';
import studentLevelService from '../../services/studentLevelService';
import branchService from '../../services/branchService';
import { useAuth } from '../../contexts/AuthContext';

interface Branch {
  id: string;
  branchName: string;
  address: string;
  phone: string;
  districtName: string;
  provinceName: string;
  status: string;
  studentLevels: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  schools: Array<{
    id: string;
    name: string;
    address: string;
    phoneNumber: string;
    email: string;
  }>;
}

interface School {
  id: string;
  name: string;
}

interface StudentLevel {
  id: string;
  name: string;
}

const DOCUMENT_TYPES = [
  { value: 'BirthCertificate', label: 'Giấy khai sinh' },
  { value: 'IdentityCard', label: 'CMND/CCCD' },
  { value: 'Passport', label: 'Hộ chiếu' },
];

const RegisterChildScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  // Form states
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [note, setNote] = useState('');
  const [branchId, setBranchId] = useState<string>('');
  const [schoolId, setSchoolId] = useState<string>('');
  const [studentLevelId, setStudentLevelId] = useState<string>('');
  const [documentType, setDocumentType] = useState<string>('');
  const [issuedBy, setIssuedBy] = useState('');
  const [issuedDate, setIssuedDate] = useState<Date | null>(null);
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);

  // File states
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [documentFileUri, setDocumentFileUri] = useState<string | null>(null);

  // Date picker states - using @react-native-community/datetimepicker
  const [showDateOfBirthPicker, setShowDateOfBirthPicker] = useState(false);
  const [showIssuedDatePicker, setShowIssuedDatePicker] = useState(false);
  const [showExpirationDatePicker, setShowExpirationDatePicker] = useState(false);

  // Dropdown data
  const [branches, setBranches] = useState<Branch[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [studentLevels, setStudentLevels] = useState<StudentLevel[]>([]);
  
  // Store full branch data for selected branch
  const [selectedBranchData, setSelectedBranchData] = useState<Branch | null>(null);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  // Dropdown visibility
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [showStudentLevelDropdown, setShowStudentLevelDropdown] = useState(false);
  const [showDocumentTypeDropdown, setShowDocumentTypeDropdown] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoadingData(true);
      
      // Fetch all branches with their student levels and schools
      const branchesData = await branchService.getBranches();
      setBranches(branchesData);
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể tải dữ liệu. Vui lòng thử lại.');
      console.error('Failed to fetch initial data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Update schools and student levels when branch is selected
  useEffect(() => {
    if (branchId && selectedBranchData) {
      // Update schools from selected branch
      setSchools(selectedBranchData.schools.map(s => ({ id: s.id, name: s.name })));
      
      // Update student levels from selected branch
      setStudentLevels(selectedBranchData.studentLevels.map(l => ({ id: l.id, name: l.name })));
      
      // Reset selections when branch changes
      setSchoolId('');
      setStudentLevelId('');
      // Close dropdowns when branch changes
      setShowSchoolDropdown(false);
      setShowStudentLevelDropdown(false);
    } else {
      setSchools([]);
      setStudentLevels([]);
      setSchoolId('');
      setStudentLevelId('');
      setShowSchoolDropdown(false);
      setShowStudentLevelDropdown(false);
    }
  }, [branchId, selectedBranchData]);

  // Date picker handlers using @react-native-community/datetimepicker
  const handleDateOfBirthChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDateOfBirthPicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const handleIssuedDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowIssuedDatePicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      setIssuedDate(selectedDate);
    }
  };

  const handleExpirationDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowExpirationDatePicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      setExpirationDate(selectedDate);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Cần quyền truy cập camera.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể chụp ảnh. Vui lòng thử lại.');
    }
  };

  const handlePickDocument = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setDocumentFileUri(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể chọn tài liệu. Vui lòng thử lại.');
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateTimeISO = (date: Date | null): string | undefined => {
    if (!date) return undefined;
    return date.toISOString();
  };

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên học sinh.');
      return;
    }

    if (!branchId) {
      Alert.alert('Lỗi', 'Vui lòng chọn chi nhánh.');
      return;
    }

    if (!dateOfBirth) {
      Alert.alert('Lỗi', 'Vui lòng chọn ngày sinh.');
      return;
    }

    try {
      setLoading(true);

      await childrenService.registerChild({
        name: name.trim(),
        dateOfBirth: formatDateTimeISO(dateOfBirth),
        note: note.trim() || undefined,
        image: imageUri || undefined,
        branchId,
        schoolId: schoolId || undefined,
        studentLevelId: studentLevelId || undefined,
        documentType: documentType || undefined,
        issuedBy: issuedBy.trim() || undefined,
        issuedDate: formatDateTimeISO(issuedDate),
        expirationDate: formatDateTimeISO(expirationDate),
        documentFile: documentFileUri || undefined,
      });

      Alert.alert(
        'Thành công',
        'Đăng ký học sinh thành công!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Không thể đăng ký học sinh. Vui lòng thử lại.';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedBranchName = () => {
    return branches.find(b => b.id === branchId)?.branchName || 'Chọn chi nhánh';
  };

  const getSelectedSchoolName = () => {
    if (!schoolId) return 'Chọn trường học';
    return schools.find(s => s.id === schoolId)?.name || 'Chọn trường học';
  };

  const getSelectedStudentLevelName = () => {
    if (!studentLevelId) return 'Chọn cấp độ';
    return studentLevels.find(l => l.id === studentLevelId)?.name || 'Chọn cấp độ';
  };

  const getSelectedDocumentTypeName = () => {
    return DOCUMENT_TYPES.find(d => d.value === documentType)?.label || 'Chọn loại giấy tờ';
  };

  if (loadingData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Đăng ký học sinh</Text>
          </View>

          {/* Name */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Tên học sinh <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Nhập tên học sinh"
              placeholderTextColor={COLORS.TEXT_SECONDARY}
            />
          </View>

          {/* Date of Birth */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Ngày sinh <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDateOfBirthPicker(true)}
            >
              <MaterialIcons name="calendar-today" size={20} color={COLORS.PRIMARY} />
              <Text style={[styles.dateButtonText, !dateOfBirth && styles.placeholder]}>
                {dateOfBirth ? formatDate(dateOfBirth) : 'Chọn ngày sinh'}
              </Text>
            </TouchableOpacity>
            {showDateOfBirthPicker && Platform.OS === 'ios' && (
              <View style={styles.iosDatePickerContainer}>
                <DateTimePicker
                  value={dateOfBirth || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={handleDateOfBirthChange}
                  maximumDate={new Date()}
                  minimumDate={new Date(1950, 0, 1)}
                />
                <TouchableOpacity
                  style={styles.iosDatePickerButton}
                  onPress={() => setShowDateOfBirthPicker(false)}
                >
                  <Text style={styles.iosDatePickerButtonText}>Xác nhận</Text>
                </TouchableOpacity>
              </View>
            )}
            {showDateOfBirthPicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={dateOfBirth || new Date()}
                mode="date"
                display="default"
                onChange={handleDateOfBirthChange}
                maximumDate={new Date()}
                minimumDate={new Date(1950, 0, 1)}
              />
            )}
          </View>

          {/* Note */}
          <View style={styles.section}>
            <Text style={styles.label}>Ghi chú</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={note}
              onChangeText={setNote}
              placeholder="Nhập ghi chú (tùy chọn)"
              placeholderTextColor={COLORS.TEXT_SECONDARY}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Branch */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Chi nhánh <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => {
                setShowBranchDropdown(!showBranchDropdown);
                // Close other dropdowns
                setShowSchoolDropdown(false);
                setShowStudentLevelDropdown(false);
                setShowDocumentTypeDropdown(false);
              }}
            >
              <Text style={[styles.dropdownText, !branchId && styles.placeholder]}>
                {getSelectedBranchName()}
              </Text>
              <MaterialIcons
                name={showBranchDropdown ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={24}
                color={COLORS.TEXT_SECONDARY}
              />
            </TouchableOpacity>
            {showBranchDropdown && (
              <View style={styles.dropdownList}>
                {branches.map((branch) => (
                  <TouchableOpacity
                    key={branch.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setBranchId(branch.id);
                      setSelectedBranchData(branch);
                      setShowBranchDropdown(false);
                      // Close other dropdowns when branch changes
                      setShowSchoolDropdown(false);
                      setShowStudentLevelDropdown(false);
                      // Schools and student levels will be updated automatically via useEffect
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{branch.branchName}</Text>
                    {branchId === branch.id && (
                      <MaterialIcons name="check" size={20} color={COLORS.PRIMARY} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* School */}
          <View style={styles.section}>
            <Text style={styles.label}>Trường học</Text>
            <TouchableOpacity
              style={[styles.dropdown, !branchId && styles.dropdownDisabled]}
              onPress={() => {
                if (branchId) {
                  setShowSchoolDropdown(!showSchoolDropdown);
                  // Close other dropdowns
                  setShowStudentLevelDropdown(false);
                  setShowDocumentTypeDropdown(false);
                  setShowBranchDropdown(false);
                } else {
                  Alert.alert('Thông báo', 'Vui lòng chọn chi nhánh trước.');
                }
              }}
              disabled={!branchId}
            >
              <Text style={[styles.dropdownText, !schoolId && styles.placeholder, !branchId && styles.disabledText]}>
                {!branchId ? 'Vui lòng chọn chi nhánh trước' : getSelectedSchoolName()}
              </Text>
              <MaterialIcons
                name={showSchoolDropdown ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={24}
                color={COLORS.TEXT_SECONDARY}
              />
            </TouchableOpacity>
            {showSchoolDropdown && branchId && (
              <View style={styles.dropdownList}>
                <ScrollView 
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                  style={styles.dropdownScrollView}
                >
                  {schools.length > 0 ? (
                    <>
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSchoolId('');
                          setShowSchoolDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>Không chọn</Text>
                        {!schoolId && (
                          <MaterialIcons name="check" size={20} color={COLORS.PRIMARY} />
                        )}
                      </TouchableOpacity>
                      {schools.map((school) => (
                        <TouchableOpacity
                          key={school.id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setSchoolId(school.id);
                            setShowSchoolDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{school.name}</Text>
                          {schoolId === school.id && (
                            <MaterialIcons name="check" size={20} color={COLORS.PRIMARY} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </>
                  ) : (
                    <View style={styles.dropdownItem}>
                      <Text style={[styles.dropdownItemText, styles.emptyText]}>
                        Chi nhánh này chưa có trường học
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Student Level */}
          <View style={styles.section}>
            <Text style={styles.label}>Cấp độ học sinh</Text>
            <TouchableOpacity
              style={[styles.dropdown, !branchId && styles.dropdownDisabled]}
              onPress={() => {
                if (branchId) {
                  setShowStudentLevelDropdown(!showStudentLevelDropdown);
                  // Close other dropdowns
                  setShowSchoolDropdown(false);
                  setShowDocumentTypeDropdown(false);
                } else {
                  Alert.alert('Thông báo', 'Vui lòng chọn chi nhánh trước.');
                }
              }}
              disabled={!branchId}
            >
              <Text style={[styles.dropdownText, !studentLevelId && styles.placeholder, !branchId && styles.disabledText]}>
                {!branchId ? 'Vui lòng chọn chi nhánh trước' : getSelectedStudentLevelName()}
              </Text>
              <MaterialIcons
                name={showStudentLevelDropdown ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={24}
                color={COLORS.TEXT_SECONDARY}
              />
            </TouchableOpacity>
            {showStudentLevelDropdown && branchId && (
              <View style={styles.dropdownList}>
                <ScrollView 
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                  style={styles.dropdownScrollView}
                >
                  {studentLevels.length > 0 ? (
                    <>
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => {
                          setStudentLevelId('');
                          setShowStudentLevelDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>Không chọn</Text>
                        {!studentLevelId && (
                          <MaterialIcons name="check" size={20} color={COLORS.PRIMARY} />
                        )}
                      </TouchableOpacity>
                      {studentLevels.map((level) => (
                        <TouchableOpacity
                          key={level.id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setStudentLevelId(level.id);
                            setShowStudentLevelDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{level.name}</Text>
                          {studentLevelId === level.id && (
                            <MaterialIcons name="check" size={20} color={COLORS.PRIMARY} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </>
                  ) : (
                    <View style={styles.dropdownItem}>
                      <Text style={[styles.dropdownItemText, styles.emptyText]}>
                        Chi nhánh này chưa có cấp độ học sinh
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Image Upload */}
          <View style={styles.section}>
            <Text style={styles.label}>Ảnh học sinh</Text>
            {imageUri ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImageUri(null)}
                >
                  <MaterialIcons name="close" size={20} color={COLORS.SURFACE} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imagePickerContainer}>
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={handlePickImage}
                >
                  <MaterialIcons name="photo-library" size={32} color={COLORS.PRIMARY} />
                  <Text style={styles.imagePickerText}>Chọn ảnh từ thư viện</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={handleTakePhoto}
                >
                  <MaterialIcons name="camera-alt" size={32} color={COLORS.PRIMARY} />
                  <Text style={styles.imagePickerText}>Chụp ảnh</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Document Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin giấy tờ</Text>

            {/* Document Type */}
            <View style={styles.subSection}>
              <Text style={styles.label}>Loại giấy tờ</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => {
                  setShowDocumentTypeDropdown(!showDocumentTypeDropdown);
                  // Close other dropdowns
                  setShowBranchDropdown(false);
                  setShowSchoolDropdown(false);
                  setShowStudentLevelDropdown(false);
                }}
              >
                <Text style={[styles.dropdownText, !documentType && styles.placeholder]}>
                  {getSelectedDocumentTypeName()}
                </Text>
                <MaterialIcons
                  name={showDocumentTypeDropdown ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={24}
                  color={COLORS.TEXT_SECONDARY}
                />
              </TouchableOpacity>
              {showDocumentTypeDropdown && (
                <View style={styles.dropdownList}>
                  <ScrollView 
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    style={styles.dropdownScrollView}
                  >
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setDocumentType('');
                        setShowDocumentTypeDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>Không chọn</Text>
                      {!documentType && (
                        <MaterialIcons name="check" size={20} color={COLORS.PRIMARY} />
                      )}
                    </TouchableOpacity>
                    {DOCUMENT_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setDocumentType(type.value);
                          setShowDocumentTypeDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{type.label}</Text>
                        {documentType === type.value && (
                          <MaterialIcons name="check" size={20} color={COLORS.PRIMARY} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Issued By */}
            <View style={styles.subSection}>
              <Text style={styles.label}>Nơi cấp</Text>
              <TextInput
                style={styles.input}
                value={issuedBy}
                onChangeText={setIssuedBy}
                placeholder="Nhập nơi cấp"
                placeholderTextColor={COLORS.TEXT_SECONDARY}
              />
            </View>

            {/* Issued Date */}
            <View style={styles.subSection}>
              <Text style={styles.label}>Ngày cấp</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowIssuedDatePicker(true)}
              >
                <MaterialIcons name="calendar-today" size={20} color={COLORS.PRIMARY} />
                <Text style={[styles.dateButtonText, !issuedDate && styles.placeholder]}>
                  {issuedDate ? formatDate(issuedDate) : 'Chọn ngày cấp'}
                </Text>
              </TouchableOpacity>
              {showIssuedDatePicker && Platform.OS === 'ios' && (
                <View style={styles.iosDatePickerContainer}>
                  <DateTimePicker
                    value={issuedDate || new Date()}
                    mode="date"
                    display="spinner"
                    onChange={handleIssuedDateChange}
                    maximumDate={new Date()}
                    minimumDate={new Date(1950, 0, 1)}
                  />
                  <TouchableOpacity
                    style={styles.iosDatePickerButton}
                    onPress={() => setShowIssuedDatePicker(false)}
                  >
                    <Text style={styles.iosDatePickerButtonText}>Xác nhận</Text>
                  </TouchableOpacity>
                </View>
              )}
              {showIssuedDatePicker && Platform.OS === 'android' && (
                <DateTimePicker
                  value={issuedDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={handleIssuedDateChange}
                  maximumDate={new Date()}
                  minimumDate={new Date(1950, 0, 1)}
                />
              )}
            </View>

            {/* Expiration Date */}
            <View style={styles.subSection}>
              <Text style={styles.label}>Ngày hết hạn</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowExpirationDatePicker(true)}
              >
                <MaterialIcons name="calendar-today" size={20} color={COLORS.PRIMARY} />
                <Text style={[styles.dateButtonText, !expirationDate && styles.placeholder]}>
                  {expirationDate ? formatDate(expirationDate) : 'Chọn ngày hết hạn'}
                </Text>
              </TouchableOpacity>
              {showExpirationDatePicker && Platform.OS === 'ios' && (
                <View style={styles.iosDatePickerContainer}>
                  <DateTimePicker
                    value={expirationDate || new Date()}
                    mode="date"
                    display="spinner"
                    onChange={handleExpirationDateChange}
                    minimumDate={new Date()}
                  />
                  <TouchableOpacity
                    style={styles.iosDatePickerButton}
                    onPress={() => setShowExpirationDatePicker(false)}
                  >
                    <Text style={styles.iosDatePickerButtonText}>Xác nhận</Text>
                  </TouchableOpacity>
                </View>
              )}
              {showExpirationDatePicker && Platform.OS === 'android' && (
                <DateTimePicker
                  value={expirationDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={handleExpirationDateChange}
                  minimumDate={new Date()}
                />
              )}
            </View>

            {/* Document File */}
            <View style={styles.subSection}>
              <Text style={styles.label}>File giấy tờ</Text>
              {documentFileUri ? (
                <View style={styles.imageContainer}>
                  <Image source={{ uri: documentFileUri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setDocumentFileUri(null)}
                  >
                    <MaterialIcons name="close" size={20} color={COLORS.SURFACE} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.documentPickerButton}
                  onPress={handlePickDocument}
                >
                  <MaterialIcons name="attach-file" size={24} color={COLORS.PRIMARY} />
                  <Text style={styles.documentPickerText}>Chọn file giấy tờ</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.SURFACE} />
            ) : (
              <>
                <MaterialIcons name="check-circle" size={20} color={COLORS.SURFACE} />
                <Text style={styles.submitButtonText}>Đăng ký</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: SPACING.MD,
    paddingBottom: SPACING.XL,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  headerTitle: {
    fontSize: FONTS.SIZES.XL,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  section: {
    marginBottom: SPACING.LG,
  },
  sectionTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  subSection: {
    marginBottom: SPACING.MD,
  },
  label: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  required: {
    color: COLORS.ERROR,
  },
  input: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    gap: SPACING.SM,
  },
  dateButtonText: {
    flex: 1,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
  },
  placeholder: {
    color: COLORS.TEXT_SECONDARY,
  },
  iosDatePickerContainer: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    marginTop: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  iosDatePickerButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    padding: SPACING.MD,
    alignItems: 'center',
    marginTop: SPACING.MD,
  },
  iosDatePickerButtonText: {
    color: COLORS.SURFACE,
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  dropdownText: {
    flex: 1,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
  },
  dropdownList: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    marginTop: SPACING.XS,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  dropdownItemText: {
    flex: 1,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
  },
  dropdownDisabled: {
    opacity: 0.6,
    backgroundColor: COLORS.BACKGROUND,
  },
  disabledText: {
    color: COLORS.TEXT_SECONDARY,
  },
  emptyText: {
    color: COLORS.TEXT_SECONDARY,
    fontStyle: 'italic',
  },
  imagePickerContainer: {
    flexDirection: 'row',
    gap: SPACING.SM,
  },
  imagePickerButton: {
    flex: 1,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderStyle: 'dashed',
  },
  imagePickerText: {
    marginTop: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: SPACING.SM,
    right: SPACING.SM,
    backgroundColor: COLORS.ERROR,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderStyle: 'dashed',
    gap: SPACING.SM,
  },
  documentPickerText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    padding: SPACING.MD,
    marginTop: SPACING.LG,
    gap: SPACING.SM,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
});

export default RegisterChildScreen;

