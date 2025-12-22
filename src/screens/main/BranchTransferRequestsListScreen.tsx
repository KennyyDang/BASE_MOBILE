import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { COLORS } from '../../constants';
import branchTransferService, { BranchTransferPaginationResponse } from '../../services/branchTransferService';
import { BranchTransferRequest } from '../../types/api';

const BranchTransferRequestsListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [requests, setRequests] = useState<BranchTransferRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<{
    pageIndex: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
  }>({
    pageIndex: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
  });

  useEffect(() => {
    loadRequests();
  }, []);


  const loadRequests = async (pageIndex: number = 1, append: boolean = false) => {
    if (pageIndex === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response: BranchTransferPaginationResponse = await branchTransferService.getMyTransferRequests({
        pageIndex,
        pageSize: 20, // Reasonable page size for mobile
      });

      if (append) {
        setRequests(prev => [...prev, ...response.items]);
      } else {
        setRequests(response.items);
      }

      setPagination({
        pageIndex: response.pageIndex,
        pageSize: response.pageSize,
        totalCount: response.totalCount,
        totalPages: response.totalPages,
        hasNextPage: response.hasNextPage,
      });

    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể tải danh sách yêu cầu chuyển chi nhánh');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRequests(1, false);
    setRefreshing(false);
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!loadingMore && pagination.hasNextPage) {
      const nextPage = pagination.pageIndex + 1;
      await loadRequests(nextPage, true);
    }
  }, [loadingMore, pagination]);

  const handleCreateRequest = () => {
    navigation.navigate('BranchTransferRequest');
  };

  const handleViewRequest = (requestId: string) => {
    navigation.navigate('BranchTransferRequestDetail', { requestId });
  };

  const handleCancelRequest = (request: BranchTransferRequest) => {
    Alert.alert(
      'Xác nhận hủy yêu cầu',
      `Bạn có chắc chắn muốn hủy yêu cầu chuyển chi nhánh của ${request.studentName}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          style: 'destructive',
          onPress: () => confirmCancelRequest(request.id)
        }
      ]
    );
  };

  const confirmCancelRequest = async (requestId: string) => {
    try {
      await branchTransferService.cancelTransferRequest(requestId);
      Alert.alert('Thành công', 'Đã hủy yêu cầu chuyển chi nhánh thành công');
      // Reload from first page to get updated data
      await loadRequests(1, false);
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.response?.data?.message || error?.message || 'Không thể hủy yêu cầu';
      Alert.alert('Lỗi', message);
    }
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      Pending: { label: 'Chờ duyệt', color: COLORS.WARNING, icon: 'schedule' },
      Approved: { label: 'Đã duyệt', color: COLORS.SUCCESS, icon: 'check-circle' },
      Rejected: { label: 'Từ chối', color: COLORS.ERROR, icon: 'cancel' },
      Cancelled: { label: 'Đã hủy', color: COLORS.TEXT_SECONDARY, icon: 'cancel' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.Pending;

    return (
      <View style={[styles.statusChip, { backgroundColor: config.color + '20' }]}>
        <MaterialIcons name={config.icon as any} size={16} color={config.color} />
        <Text style={[styles.statusText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
    );
  };

  const canCancelRequest = (request: BranchTransferRequest) => {
    return request.status === 'Pending';
  };

  const renderRequestItem = ({ item }: { item: BranchTransferRequest }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => handleViewRequest(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.requestHeader}>
        <View style={styles.studentInfo}>
          <MaterialIcons name="person" size={20} color={COLORS.PRIMARY} />
          <Text style={styles.studentName}>
            {item.studentName || item.student?.name || item.student?.userName || 'N/A'}
          </Text>
        </View>
        {getStatusChip(item.status)}
      </View>

      <View style={styles.requestDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="business" size={16} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.detailText}>
            Từ: {item.currentBranchName || item.currentBranch?.branchName || 'N/A'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialIcons name="arrow-forward" size={16} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.detailText}>
            Đến: {item.targetBranchName || item.targetBranch?.branchName || 'N/A'}
          </Text>
        </View>
      </View>

      <View style={styles.changesRow}>
        {item.changeSchool && (
          <View style={[styles.changeChip, styles.schoolChip]}>
            <MaterialIcons name="school" size={14} color={COLORS.SURFACE} />
            <Text style={styles.changeText}>Trường học</Text>
          </View>
        )}
        {item.changeLevel && (
          <View style={[styles.changeChip, styles.levelChip]}>
            <MaterialIcons name="grade" size={14} color={COLORS.SURFACE} />
            <Text style={styles.changeText}>Cấp độ</Text>
          </View>
        )}
        {!item.changeSchool && !item.changeLevel && (
          <Text style={styles.noChangesText}>Chỉ chuyển chi nhánh</Text>
        )}
      </View>

      <View style={styles.requestFooter}>
        <Text style={styles.dateText}>
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') :
           item.createdTime ? new Date(item.createdTime).toLocaleDateString('vi-VN') : 'N/A'}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleViewRequest(item.id)}
          >
            <MaterialIcons name="visibility" size={20} color={COLORS.PRIMARY} />
          </TouchableOpacity>

          {canCancelRequest(item) && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelAction]}
              onPress={() => handleCancelRequest(item)}
            >
              <MaterialIcons name="cancel" size={20} color={COLORS.ERROR} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="swap-horiz" size={64} color={COLORS.TEXT_SECONDARY} />
      <Text style={styles.emptyTitle}>Chưa có yêu cầu chuyển chi nhánh nào</Text>
      <Text style={styles.emptySubtitle}>
        Bắt đầu bằng cách tạo yêu cầu chuyển chi nhánh cho con của bạn
      </Text>
      <TouchableOpacity style={styles.createButton} onPress={handleCreateRequest}>
        <MaterialIcons name="add" size={20} color={COLORS.SURFACE} />
        <Text style={styles.createButtonText}>Tạo yêu cầu đầu tiên</Text>
      </TouchableOpacity>
    </View>
  );

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
        <Text style={styles.headerTitle}>Yêu cầu chuyển chi nhánh</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateRequest}
        >
          <MaterialIcons name="add" size={24} color={COLORS.PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading && requests.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Đang tải danh sách...</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.PRIMARY]}
            />
          }
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                <Text style={styles.loadMoreText}>Đang tải thêm...</Text>
              </View>
            ) : null
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Info Alert */}
      <View style={styles.infoAlert}>
        <MaterialIcons name="info" size={20} color={COLORS.INFO} />
        <Text style={styles.infoText}>
          {pagination.totalCount > 0 && (
            `Hiển thị ${requests.length}/${pagination.totalCount} yêu cầu. `
          )}
          Bạn chỉ có thể hủy yêu cầu khi nó đang ở trạng thái "Chờ duyệt".
          Sau khi được duyệt, yêu cầu sẽ được xử lý tự động và không thể hủy.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
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
  addButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 60, // Space for info alert
  },
  requestCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requestDetails: {
    marginBottom: 12,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  changesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  changeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  schoolChip: {
    backgroundColor: COLORS.INFO,
  },
  levelChip: {
    backgroundColor: COLORS.SECONDARY,
  },
  changeText: {
    fontSize: 12,
    color: COLORS.SURFACE,
    fontWeight: '500',
  },
  noChangesText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    fontStyle: 'italic',
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: COLORS.BACKGROUND,
  },
  cancelAction: {
    backgroundColor: COLORS.ERROR + '10',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.SURFACE,
  },
  infoAlert: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.INFO + '15',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 18,
  },
  loadMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
});

export default BranchTransferRequestsListScreen;
