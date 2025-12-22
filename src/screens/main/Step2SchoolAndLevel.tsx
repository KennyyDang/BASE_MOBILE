import React, { useEffect, useState, useMemo, forwardRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import CustomPicker from '../../components/CustomPicker';
import { StudentResponse } from '../../types/api';
import { COLORS } from '../../constants';
import schoolService from '../../services/schoolService';
import studentLevelService from '../../services/studentLevelService';

interface Branch {
  id: string;
  branchName: string;
  schools?: Array<{ id: string; schoolName: string }>;
  studentLevels?: Array<{ id: string; levelName: string }>;
}

interface School {
  id: string;
  schoolName?: string;
  name?: string;
  address?: string;
  description?: string;
}

interface StudentLevel {
  id: string;
  levelName: string;
  name?: string;
  description?: string;
}

interface Step2SchoolAndLevelProps {
  data: any;
  updateData: (data: any) => void;
  schools: School[];
  studentLevels: StudentLevel[];
  children: StudentResponse[];
  branches: Branch[];
  isLoading?: boolean;
}

const Step2SchoolAndLevel = forwardRef<any, Step2SchoolAndLevelProps>(({
  data = {},
  updateData,
  schools = [],
  studentLevels = [],
  children = [],
  branches = [],
  isLoading = false
}, ref) => {
  const selectedChild = data.studentId ? children.find(c => c.id === data.studentId) : null;
  const [filteredSchools, setFilteredSchools] = useState<School[]>([]);
  const [filteredLevels, setFilteredLevels] = useState<StudentLevel[]>([]);
  const [allSchools, setAllSchools] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);

  // Load all schools on component mount
  useEffect(() => {
    const loadSchools = async () => {
      try {
        setLoadingSchools(true);
        const response = await schoolService.getSchoolsPaged({ 
          pageSize: 200, // Get large page to include all schools
          includeDeleted: false 
        });
        const schoolsData = response.items || [];
        setAllSchools(schoolsData);
      } catch (error) {
        console.warn('[Step2] Failed to load schools:', error);
        setAllSchools([]);
      } finally {
        setLoadingSchools(false);
      }
    };

    loadSchools();
  }, []);

  // Filter schools and levels based on targetBranchId
  useEffect(() => {
    if (data.targetBranchId && branches.length > 0) {
      const targetBranch = branches.find(b => b.id === data.targetBranchId);

      // Filter schools that the target branch supports
      if (targetBranch?.schools && targetBranch.schools.length > 0) {
        const branchSchoolIds = targetBranch.schools.map(s => s.id);
        const filtered = allSchools.filter(school => branchSchoolIds.includes(school.id));
        setFilteredSchools(filtered);
      } else {
        // If branch doesn't have school restrictions, show all schools
        setFilteredSchools(allSchools);
      }

      // Filter student levels that the target branch supports
      if (targetBranch?.studentLevels) {
        const branchLevelIds = targetBranch.studentLevels.map(l => l.id);
        setFilteredLevels(studentLevels.filter(level => branchLevelIds.includes(level.id)));
      } else {
        setFilteredLevels(studentLevels);
      }
    } else {
      // If no target branch selected, show all schools and levels
      setFilteredSchools(allSchools);
      setFilteredLevels(studentLevels);
    }
  }, [data.targetBranchId, branches, allSchools, studentLevels]);

  const handleChangeSchoolToggle = (value: boolean) => {
    updateData({
      ...(data || {}),
      changeSchool: value,
      targetSchoolId: value ? data?.targetSchoolId : ''
    });
  };

  const handleChangeLevelToggle = (value: boolean) => {
    updateData({
      ...(data || {}),
      changeLevel: value,
      targetStudentLevelId: value ? data?.targetStudentLevelId : ''
    });
  };

  const handleSchoolChange = (targetSchoolId: string) => {
    updateData({
      ...(data || {}),
      targetSchoolId
    });
  };

  const handleLevelChange = (targetStudentLevelId: string) => {
    updateData({
      ...(data || {}),
      targetStudentLevelId
    });
  };

  const currentSchool = useMemo(() => {
    if (!selectedChild) return null;

    // First try to get school info directly from child data
    const schoolNameFromChild = selectedChild.schoolName;
    const schoolIdFromChild = selectedChild.schoolId;

    // If we have school info from child, return it as is
    if (schoolNameFromChild && schoolIdFromChild) {
      return {
        id: schoolIdFromChild,
        schoolName: schoolNameFromChild,
        name: schoolNameFromChild,
        description: 'Mô tả chưa cập nhật'
      };
    }

    // Otherwise, try to find in schools array
    return schoolIdFromChild ? schools.find(s => s.id === schoolIdFromChild) : null;
  }, [selectedChild?.schoolId, selectedChild?.schoolName, schools]);

  const currentLevel = useMemo(() => {
    if (!selectedChild) return null;

    // First try to get level info directly from child data
    const levelNameFromChild = selectedChild.studentLevelName;
    const levelIdFromChild = selectedChild.studentLevelId;

    // If we have level info from child, return it as is
    if (levelNameFromChild && levelIdFromChild) {
      return {
        id: levelIdFromChild,
        levelName: levelNameFromChild,
        name: levelNameFromChild,
        description: 'Mô tả chưa cập nhật'
      };
    }

    // Otherwise, try to find in studentLevels array
    return levelIdFromChild ? studentLevels.find(l => l.id === levelIdFromChild) : null;
  }, [selectedChild?.studentLevelId, selectedChild?.studentLevelName, studentLevels]);

  const targetSchool = useMemo(() => {
    if (!data.targetSchoolId) return null;

    // First priority: Find in filteredSchools (schools available for selection)
    const schoolFromFiltered = filteredSchools.find(s => s.id === data.targetSchoolId);
    if (schoolFromFiltered) {
      return schoolFromFiltered;
    }

    // Fallback: Find in allSchools (from API)
    const schoolFromAPI = allSchools.find(s => s.id === data.targetSchoolId);
    if (schoolFromAPI) {
      return schoolFromAPI;
    }

    // Final fallback: Find in schools prop
    return schools.find(s => s.id === data.targetSchoolId) || null;
  }, [data.targetSchoolId, filteredSchools, allSchools, schools]);

  const targetLevel = useMemo(() =>
    data.targetStudentLevelId ? studentLevels.find(l => l.id === data.targetStudentLevelId) : null,
    [data.targetStudentLevelId, studentLevels]
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Thay đổi trường học và cấp độ (tùy chọn)</Text>

      <View style={styles.alert}>
        <MaterialIcons name="info" size={20} color={COLORS.WARNING} />
        <Text style={styles.alertText}>
          Bạn có thể giữ nguyên trường học và cấp độ hiện tại, hoặc thay đổi chúng.
          Nếu thay đổi, bạn sẽ cần tải lên tài liệu hỗ trợ ở bước tiếp theo.
        </Text>
      </View>

      {/* Current Information */}
      <View style={styles.currentInfoSection}>
        <Text style={styles.currentInfoTitle}>
          Thông tin hiện tại của {selectedChild?.name || selectedChild?.userName || 'học sinh'}
        </Text>
        <View style={styles.currentInfoChips}>
          {currentSchool ? (
            <View style={[styles.chip, styles.primaryChip]}>
              <MaterialIcons name="school" size={16} color={COLORS.SURFACE} />
              <Text style={styles.chipText}>Trường: {currentSchool.schoolName}</Text>
            </View>
          ) : (
            <View style={[styles.chip, styles.defaultChip]}>
              <MaterialIcons name="school" size={16} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.chipText}>
                {selectedChild?.schoolId ? "Đang tải thông tin trường..." : "Trường: Chưa cập nhật"}
              </Text>
            </View>
          )}
          {currentLevel ? (
            <View style={[styles.chip, styles.secondaryChip]}>
              <MaterialIcons name="grade" size={16} color={COLORS.SURFACE} />
              <Text style={styles.chipText}>Cấp độ: {currentLevel.levelName}</Text>
            </View>
          ) : (
            <View style={[styles.chip, styles.defaultChip]}>
              <MaterialIcons name="grade" size={16} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.chipText}>
                {selectedChild?.studentLevelId ? "Đang tải thông tin cấp độ..." : "Cấp độ: Chưa cập nhật"}
              </Text>
            </View>
          )}
        </View>
        {!selectedChild && (
          <Text style={styles.warningText}>
            Vui lòng chọn học sinh ở bước trước
          </Text>
        )}
        {selectedChild && (!selectedChild.schoolId || !selectedChild.studentLevelId) && (
          <View style={styles.warningAlert}>
            <MaterialIcons name="warning" size={16} color={COLORS.WARNING} />
            <Text style={styles.warningAlertText}>
              Thông tin trường học hoặc cấp độ của học sinh chưa được cập nhật đầy đủ.
              Bạn vẫn có thể tiếp tục tạo yêu cầu chuyển chi nhánh.
            </Text>
          </View>
        )}
      </View>

      {/* Change School */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="school" size={24} color={COLORS.PRIMARY} />
          <Text style={styles.sectionTitle}>Thay đổi trường học</Text>
          <Switch
            value={data.changeSchool || false}
            onValueChange={handleChangeSchoolToggle}
            disabled={isLoading}
            trackColor={{ false: COLORS.BORDER, true: COLORS.PRIMARY + '80' }}
            thumbColor={data.changeSchool ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY}
          />
        </View>

        {data.changeSchool && (
          <View>
            <CustomPicker
              selectedValue={data.targetSchoolId || ''}
              onValueChange={handleSchoolChange}
              items={filteredSchools.map(school => ({
                label: school.schoolName || school.name || `School ${school.id}`,
                value: school.id
              }))}
              placeholder={loadingSchools ? "Đang tải danh sách trường học..." : "Chọn trường học đích"}
              enabled={!isLoading && !loadingSchools && filteredSchools.length > 0}
            />
          </View>
        )}

        {data.changeSchool && targetSchool && (
          <View style={styles.targetInfoCard}>
            <Text style={styles.targetInfoTitle}>Sẽ chuyển sang:</Text>
            <View style={[styles.chip, styles.successChip]}>
              <MaterialIcons name="school" size={16} color={COLORS.SURFACE} />
              <Text style={styles.chipText}>
                {targetSchool.schoolName || targetSchool.name || `Trường ${targetSchool.id}`}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Change Student Level */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="grade" size={24} color={COLORS.PRIMARY} />
          <Text style={styles.sectionTitle}>Thay đổi cấp độ học sinh</Text>
          <Switch
            value={data.changeLevel || false}
            onValueChange={handleChangeLevelToggle}
            disabled={isLoading}
            trackColor={{ false: COLORS.BORDER, true: COLORS.PRIMARY + '80' }}
            thumbColor={data.changeLevel ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY}
          />
        </View>

        {data.changeLevel && (
          <View>
            <CustomPicker
              selectedValue={data.targetStudentLevelId || ''}
              onValueChange={handleLevelChange}
              items={filteredLevels.map(level => ({
                label: level.levelName || level.name || `Level ${level.id}`,
                value: level.id
              }))}
              placeholder="Chọn cấp độ học sinh đích"
              enabled={!isLoading && filteredLevels.length > 0}
            />
          </View>
        )}

        {data.changeLevel && targetLevel && (
          <View style={styles.targetInfoCard}>
            <Text style={styles.targetInfoTitle}>Sẽ chuyển sang:</Text>
            <View style={[styles.chip, styles.successChip]}>
              <MaterialIcons name="grade" size={16} color={COLORS.SURFACE} />
              <Text style={styles.chipText}>
                {targetLevel.levelName || targetLevel.name || `Level ${targetLevel.id}`}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Summary */}
      {(data.changeSchool || data.changeLevel) && (
        <View style={styles.summaryAlert}>
          <MaterialIcons name="warning" size={20} color={COLORS.WARNING} />
          <Text style={styles.summaryAlertText}>
            Bạn đã chọn thay đổi {data.changeSchool && data.changeLevel ? 'trường học và cấp độ' :
                                  data.changeSchool ? 'trường học' : 'cấp độ học sinh'}.
            Bạn sẽ cần tải lên tài liệu hỗ trợ ở bước tiếp theo.
          </Text>
        </View>
      )}
    </ScrollView>
  );
});

Step2SchoolAndLevel.displayName = 'Step2SchoolAndLevel';

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
  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.WARNING + '15',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 20,
  },
  currentInfoSection: {
    backgroundColor: COLORS.SURFACE,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  currentInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 12,
  },
  currentInfoChips: {
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
    gap: 6,
  },
  primaryChip: {
    backgroundColor: COLORS.PRIMARY,
  },
  secondaryChip: {
    backgroundColor: COLORS.SECONDARY,
  },
  successChip: {
    backgroundColor: COLORS.SUCCESS,
  },
  defaultChip: {
    backgroundColor: COLORS.BORDER,
  },
  chipText: {
    color: COLORS.SURFACE,
    fontSize: 14,
    fontWeight: '500',
  },
  warningText: {
    fontSize: 14,
    color: COLORS.WARNING,
    fontStyle: 'italic',
    marginTop: 8,
  },
  warningAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.WARNING + '15',
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  warningAlertText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.WARNING,
    lineHeight: 20,
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
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  targetInfoCard: {
    marginTop: 16,
    padding: 12,
    backgroundColor: COLORS.SUCCESS + '15',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.SUCCESS + '30',
  },
  targetInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.SUCCESS,
    marginBottom: 8,
  },
  summaryAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.WARNING + '15',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  summaryAlertText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.WARNING,
    lineHeight: 20,
  },
});

export default Step2SchoolAndLevel;
