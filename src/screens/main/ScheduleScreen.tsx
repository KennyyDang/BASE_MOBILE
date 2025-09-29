import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../../constants';

const ScheduleScreen: React.FC = () => {
  const handleClassPress = (classId: string) => {
    console.log('Navigate to class details:', classId);
    // TODO: Navigate to class details screen
  };

  const handleRegisterClass = () => {
    console.log('Navigate to register class');
    // TODO: Navigate to register class screen
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Actions */}
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.registerButton}
            onPress={handleRegisterClass}
          >
            <MaterialIcons name="add" size={20} color={COLORS.SURFACE} />
            <Text style={styles.registerButtonText}>Đăng ký lớp mới</Text>
          </TouchableOpacity>
        </View>

        {/* Week Navigation */}
        <View style={styles.weekNavigation}>
          <TouchableOpacity style={styles.weekNavButton}>
            <MaterialIcons name="chevron-left" size={24} color={COLORS.PRIMARY} />
          </TouchableOpacity>
          
          <View style={styles.currentWeek}>
            <Text style={styles.currentWeekText}>Tuần 14 - 20 Tháng 9</Text>
            <Text style={styles.currentYear}>2024</Text>
          </View>
          
          <TouchableOpacity style={styles.weekNavButton}>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.PRIMARY} />
          </TouchableOpacity>
        </View>

        {/* Weekly Schedule */}
        <View style={styles.scheduleContainer}>
          {/* Monday */}
          <View style={styles.dayContainer}>
            <Text style={styles.dayTitle}>Thứ 2</Text>
            <View style={styles.classCard}>
              <View style={styles.classTimeContainer}>
                <Text style={styles.classTime}>14:00</Text>
                <Text style={styles.classDuration}>90 phút</Text>
              </View>
              <View style={styles.classInfo}>
                <Text style={styles.className}>Toán học nâng cao</Text>
                <Text style={styles.classRoom}>Phòng A101</Text>
                <Text style={styles.classTeacher}>Cô Nguyễn Thị Lan</Text>
              </View>
              <TouchableOpacity 
                style={styles.classAction}
                onPress={() => handleClassPress('math-101')}
              >
                <MaterialIcons name="chevron-right" size={20} color={COLORS.PRIMARY} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tuesday */}
          <View style={styles.dayContainer}>
            <Text style={styles.dayTitle}>Thứ 3</Text>
            <View style={styles.classCard}>
              <View style={styles.classTimeContainer}>
                <Text style={styles.classTime}>16:00</Text>
                <Text style={styles.classDuration}>60 phút</Text>
              </View>
              <View style={styles.classInfo}>
                <Text style={styles.className}>Tiếng Anh giao tiếp</Text>
                <Text style={styles.classRoom}>Phòng B202</Text>
                <Text style={styles.classTeacher}>Thầy John Smith</Text>
              </View>
              <TouchableOpacity 
                style={styles.classAction}
                onPress={() => handleClassPress('english-201')}
              >
                <MaterialIcons name="chevron-right" size={20} color={COLORS.PRIMARY} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Wednesday */}
          <View style={styles.dayContainer}>
            <Text style={styles.dayTitle}>Thứ 4</Text>
            <View style={styles.classCard}>
              <View style={styles.classTimeContainer}>
                <Text style={styles.classTime}>15:00</Text>
                <Text style={styles.classDuration}>90 phút</Text>
              </View>
              <View style={styles.classInfo}>
                <Text style={styles.className}>Khoa học thực hành</Text>
                <Text style={styles.classRoom}>Phòng Lab C301</Text>
                <Text style={styles.classTeacher}>Cô Trần Thị Mai</Text>
              </View>
              <TouchableOpacity 
                style={styles.classAction}
                onPress={() => handleClassPress('science-lab')}
              >
                <MaterialIcons name="chevron-right" size={20} color={COLORS.PRIMARY} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Thursday */}
          <View style={styles.dayContainer}>
            <Text style={styles.dayTitle}>Thứ 5</Text>
            <View style={styles.emptyDay}>
              <MaterialIcons name="event-busy" size={48} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.emptyDayText}>Không có lớp học</Text>
            </View>
          </View>

          {/* Friday */}
          <View style={styles.dayContainer}>
            <Text style={styles.dayTitle}>Thứ 6</Text>
            <View style={styles.classCard}>
              <View style={styles.classTimeContainer}>
                <Text style={styles.classTime}>14:30</Text>
                <Text style={styles.classDuration}>60 phút</Text>
              </View>
              <View style={styles.classInfo}>
                <Text style={styles.className}>Nghệ thuật & Thủ công</Text>
                <Text style={styles.classRoom}>Phòng D401</Text>
                <Text style={styles.classTeacher}>Cô Lê Thị Hoa</Text>
              </View>
              <TouchableOpacity 
                style={styles.classAction}
                onPress={() => handleClassPress('art-craft')}
              >
                <MaterialIcons name="chevron-right" size={20} color={COLORS.PRIMARY} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Weekend */}
          <View style={styles.weekendContainer}>
            <View style={styles.dayContainer}>
              <Text style={styles.dayTitle}>Thứ 7</Text>
              <View style={styles.emptyDay}>
                <MaterialIcons name="weekend" size={48} color={COLORS.TEXT_SECONDARY} />
                <Text style={styles.emptyDayText}>Cuối tuần</Text>
              </View>
            </View>
            
            <View style={styles.dayContainer}>
              <Text style={styles.dayTitle}>Chủ nhật</Text>
              <View style={styles.emptyDay}>
                <MaterialIcons name="weekend" size={48} color={COLORS.TEXT_SECONDARY} />
                <Text style={styles.emptyDayText}>Cuối tuần</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.statisticsContainer}>
          <Text style={styles.sectionTitle}>Thống kê tuần này</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>4</Text>
              <Text style={styles.statLabel}>Lớp học</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>6h</Text>
              <Text style={styles.statLabel}>Tổng thời gian</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>100%</Text>
              <Text style={styles.statLabel}>Điểm danh</Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  headerActions: {
    marginBottom: SPACING.LG,
  },
  registerButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    color: COLORS.SURFACE,
    fontSize: FONTS.SIZES.MD,
    fontWeight: 'bold',
    marginLeft: SPACING.SM,
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.LG,
  },
  weekNavButton: {
    padding: SPACING.SM,
  },
  currentWeek: {
    alignItems: 'center',
  },
  currentWeekText: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  currentYear: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  scheduleContainer: {
    marginBottom: SPACING.LG,
  },
  dayContainer: {
    marginBottom: SPACING.LG,
  },
  dayTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  classCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  classTimeContainer: {
    alignItems: 'center',
    marginRight: SPACING.MD,
    minWidth: 60,
  },
  classTime: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  classDuration: {
    fontSize: FONTS.SIZES.XS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: FONTS.SIZES.MD,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  classRoom: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
  },
  classTeacher: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  classAction: {
    padding: SPACING.SM,
  },
  emptyDay: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.XL,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderStyle: 'dashed',
  },
  emptyDayText: {
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.SM,
  },
  weekendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statisticsContainer: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.LG,
    marginBottom: SPACING.LG,
  },
  sectionTitle: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FONTS.SIZES.XXL,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: SPACING.XS,
  },
  statLabel: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
});

export default ScheduleScreen;
