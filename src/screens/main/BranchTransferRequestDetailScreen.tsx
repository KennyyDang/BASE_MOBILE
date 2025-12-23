import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import { BranchTransferRequest } from '../../types/api';

const BranchTransferRequestDetailScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { requestId } = route.params as { requestId: string };

  const [request, setRequest] = useState<BranchTransferRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequestDetail();
  }, [requestId]);

  const loadRequestDetail = async () => {
    setLoading(true);
    try {
      const requestData = await branchTransferService.getMyTransferRequestById(requestId);
      setRequest(requestData);
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể tải chi tiết yêu cầu');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = () => {
    if (!request) return;

    Alert.alert(
      'Xác nhận hủy yêu cầu',
      `Bạn có chắc chắn muốn hủy yêu cầu chuyển chi nhánh của ${request.studentName}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          style: 'destructive',
          onPress: () => confirmCancelRequest()
        }
      ]
    );
  };

  const confirmCancelRequest = async () => {
    if (!request) return;

    try {
      await branchTransferService.cancelTransferRequest(request.id);
      Alert.alert('Thành công', 'Đã hủy yêu cầu chuyển chi nhánh thành công', [
        {
          text: 'OK',
          onPress: () => {
            // Refresh the list and go back
            navigation.goBack();
          }
        }
      ]);
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.response?.data?.message || error?.message || 'Không thể hủy yêu cầu';
      Alert.alert('Lỗi', message);
    }
  };

  const getStatusDisplay = (status: string) => {
    const statusConfig = {
      Pending: { label: 'Chờ duyệt', color: COLORS.WARNING, icon: 'schedule', description: 'Yêu cầu đang chờ quản lý duyệt' },
      Approved: { label: 'Đã duyệt', color: COLORS.SUCCESS, icon: 'check-circle', description: 'Yêu cầu đã được duyệt và sẽ được xử lý' },
      Rejected: { label: 'Từ chối', color: COLORS.ERROR, icon: 'cancel', description: 'Yêu cầu đã bị từ chối' },
      Cancelled: { label: 'Đã hủy', color: COLORS.TEXT_SECONDARY, icon: 'cancel', description: 'Yêu cầu đã được hủy' }
    };

    return statusConfig[status as keyof typeof statusConfig] || statusConfig.Pending;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('vi-VN', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Đang tải chi tiết...</Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={48} color={COLORS.ERROR} />
        <Text style={styles.errorText}>Không thể tải thông tin yêu cầu</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadRequestDetail}>
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusDisplay = getStatusDisplay(request.status);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết yêu cầu</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusIcon, { backgroundColor: statusDisplay.color + '20' }]}>
              <MaterialIcons name={statusDisplay.icon as any} size={24} color={statusDisplay.color} />
            </View>
            <View style={styles.statusInfo}>
              <Text style={[styles.statusLabel, { color: statusDisplay.color }]}>
                {statusDisplay.label}
              </Text>
              <Text style={styles.statusDescription}>
                {statusDisplay.description}
              </Text>
            </View>
          </View>
        </View>

        {/* Student Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="person" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.sectionTitle}>Thông tin học sinh</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Học sinh:</Text>
            <Text style={styles.infoValue}>
              {request.studentName || request.student?.name || request.student?.userName || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Transfer Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="swap-horiz" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.sectionTitle}>Thông tin chuyển nhánh</Text>
          </View>

          <View style={styles.transferCard}>
            <View style={styles.transferRow}>
              <View style={styles.transferItem}>
                <Text style={styles.transferLabel}>Từ chi nhánh:</Text>
                <Text style={styles.transferValue}>
                  {request.currentBranchName || request.currentBranch?.branchName || 'N/A'}
                </Text>
              </View>
              <MaterialIcons name="arrow-forward" size={20} color={COLORS.TEXT_SECONDARY} />
              <View style={styles.transferItem}>
                <Text style={styles.transferLabel}>Đến chi nhánh:</Text>
                <Text style={[styles.transferValue, styles.targetBranch]}>
                  {request.targetBranchName || request.targetBranch?.branchName || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Changes Info */}
        {(request.changeSchool || request.changeLevel) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="edit" size={20} color={COLORS.PRIMARY} />
              <Text style={styles.sectionTitle}>Thay đổi bổ sung</Text>
            </View>

            <View style={styles.changesCard}>
              {request.changeSchool && (
                <View style={styles.changeItem}>
                  <MaterialIcons name="school" size={16} color={COLORS.INFO} />
                  <Text style={styles.changeText}>Thay đổi trường học</Text>
                </View>
              )}
              {request.changeLevel && (
                <View style={styles.changeItem}>
                  <MaterialIcons name="grade" size={16} color={COLORS.SECONDARY} />
                  <Text style={styles.changeText}>Thay đổi cấp độ</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Request Reason */}
        {request.requestReason && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="message" size={20} color={COLORS.PRIMARY} />
              <Text style={styles.sectionTitle}>Lý do chuyển nhánh</Text>
            </View>
            <View style={styles.reasonCard}>
              <Text style={styles.reasonText}>{request.requestReason}</Text>
            </View>
          </View>
        )}

        {/* Document Info */}
        {request.documentId && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="description" size={20} color={COLORS.PRIMARY} />
              <Text style={styles.sectionTitle}>Tài liệu đính kèm</Text>
            </View>
            <View style={styles.documentCard}>
              <MaterialIcons name="attach-file" size={20} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.documentText}>Đã đính kèm tài liệu hỗ trợ</Text>
            </View>
          </View>
        )}

        {/* Timeline */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="timeline" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.sectionTitle}>Lịch sử</Text>
          </View>

          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Tạo yêu cầu</Text>
                <Text style={styles.timelineDate}>
                  {formatDate(request.createdTime || request.createdAt)}
                </Text>
              </View>
            </View>

            {request.approvedTime && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.approvedDot]} />
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineTitle, styles.approvedTitle]}>Đã duyệt</Text>
                  <Text style={styles.timelineDate}>
                    {formatDate(request.approvedTime)}
                  </Text>
                </View>
              </View>
            )}

            {request.rejectedTime && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.rejectedDot]} />
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineTitle, styles.rejectedTitle]}>Từ chối</Text>
                  <Text style={styles.timelineDate}>
                    {formatDate(request.rejectedTime)}
                  </Text>
                  {request.rejectionReason && (
                    <Text style={styles.rejectionReason}>{request.rejectionReason}</Text>
                  )}
                </View>
              </View>
            )}

            {request.cancelledTime && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.cancelledDot]} />
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineTitle, styles.cancelledTitle]}>Đã hủy</Text>
                  <Text style={styles.timelineDate}>
                    {formatDate(request.cancelledTime)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Actions */}
      {request.status === 'Pending' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancelRequest}
          >
            <MaterialIcons name="cancel" size={20} color={COLORS.SURFACE} />
            <Text style={styles.cancelButtonText}>Hủy yêu cầu</Text>
          </TouchableOpacity>
        </View>
      )}
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
    color: COLORS.ERROR,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  infoCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    padding: 12,
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  transferCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    padding: 12,
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transferItem: {
    flex: 1,
    alignItems: 'center',
  },
  transferLabel: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 4,
  },
  transferValue: {
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
    textAlign: 'center',
  },
  targetBranch: {
    color: COLORS.SUCCESS,
  },
  changesCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    padding: 12,
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  changeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  changeText: {
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
  },
  reasonCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    padding: 12,
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  reasonText: {
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 20,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    padding: 12,
    gap: 8,
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  documentText: {
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
  },
  timeline: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    padding: 16,
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.TEXT_SECONDARY,
    marginRight: 12,
    marginTop: 6,
  },
  approvedDot: {
    backgroundColor: COLORS.SUCCESS,
  },
  rejectedDot: {
    backgroundColor: COLORS.ERROR,
  },
  cancelledDot: {
    backgroundColor: COLORS.TEXT_SECONDARY,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  approvedTitle: {
    color: COLORS.SUCCESS,
  },
  rejectedTitle: {
    color: COLORS.ERROR,
  },
  cancelledTitle: {
    color: COLORS.TEXT_SECONDARY,
  },
  timelineDate: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  rejectionReason: {
    fontSize: 14,
    color: COLORS.ERROR,
    marginTop: 4,
    fontStyle: 'italic',
  },
  actions: {
    padding: 16,
    backgroundColor: COLORS.SURFACE,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: COLORS.ERROR,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
});

export default BranchTransferRequestDetailScreen;
