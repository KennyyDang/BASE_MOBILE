import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import schoolService, { SchoolResponse } from '../../services/schoolService';
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

type SchoolsNavigationProp = StackNavigationProp<RootStackParamList, 'Schools'>;

const SchoolsScreen: React.FC = () => {
  const navigation = useNavigation<SchoolsNavigationProp>();
  const [schools, setSchools] = useState<SchoolResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const fetchSchools = useCallback(async (page: number = 1, searchName?: string, silent: boolean = false) => {
    if (!silent) {
      if (page === 1) {
        setLoading(true);
      }
      setError(null);
    }

    try {
      const response = await schoolService.getSchoolsPaged({
        schoolName: searchName || undefined,
        pageIndex: page,
        pageSize: 10,
        includeDeleted: false,
      });

      if (page === 1) {
        setSchools(response.items || []);
      } else {
        setSchools(prev => [...prev, ...(response.items || [])]);
      }

      setPageIndex(response.pageIndex || page);
      setTotalPages(response.totalPages || 1);
      setHasNextPage(response.hasNextPage || false);
    } catch (err: any) {
      const errorMessage = 
        err?.message || 
        err?.data?.message || 
        'Không thể tải danh sách trường học';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSchools(1, searchQuery);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPageIndex(1);
      fetchSchools(1, searchQuery.trim() || undefined);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchSchools]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setPageIndex(1);
    fetchSchools(1, searchQuery, false);
  }, [searchQuery, fetchSchools]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !loading) {
      fetchSchools(pageIndex + 1, searchQuery, true);
    }
  }, [hasNextPage, loading, pageIndex, searchQuery, fetchSchools]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setPageIndex(1);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setPageIndex(1);
    fetchSchools(1, '', false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={COLORS.TEXT_SECONDARY} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm trường học..."
            placeholderTextColor={COLORS.TEXT_SECONDARY}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <MaterialIcons name="clear" size={20} color={COLORS.TEXT_SECONDARY} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          if (
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - paddingToBottom
          ) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {/* Error State */}
        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color={COLORS.ERROR} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading State */}
        {loading && schools.length === 0 && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            <Text style={styles.loadingText}>Đang tải danh sách trường học...</Text>
          </View>
        )}

        {/* Schools List */}
        {!loading && !error && (
          <>
            {schools.length > 0 ? (
              <>
                <View style={styles.headerInfo}>
                  <Text style={styles.headerInfoText}>
                    Tìm thấy {schools.length} trường học
                    {searchQuery && ` cho "${searchQuery}"`}
                  </Text>
                </View>

                {schools.map((school) => (
                  <View key={school.id} style={styles.schoolCard}>
                    <View style={styles.schoolHeader}>
                      <View style={styles.schoolIcon}>
                        <MaterialIcons name="school" size={24} color={COLORS.PRIMARY} />
                      </View>
                      <View style={styles.schoolInfo}>
                        <Text style={styles.schoolName}>{school.name}</Text>
                        {school.address && (
                          <View style={styles.schoolDetail}>
                            <MaterialIcons name="location-on" size={14} color={COLORS.TEXT_SECONDARY} />
                            <Text style={styles.schoolDetailText}>{school.address}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {(school.phoneNumber || school.email) && (
                      <View style={styles.schoolContact}>
                        {school.phoneNumber && (
                          <View style={styles.contactItem}>
                            <MaterialIcons name="phone" size={16} color={COLORS.TEXT_SECONDARY} />
                            <Text style={styles.contactText}>{school.phoneNumber}</Text>
                          </View>
                        )}
                        {school.email && (
                          <View style={styles.contactItem}>
                            <MaterialIcons name="email" size={16} color={COLORS.TEXT_SECONDARY} />
                            <Text style={styles.contactText}>{school.email}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                ))}

                {/* Load More Indicator */}
                {hasNextPage && (
                  <View style={styles.loadMoreContainer}>
                    <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                    <Text style={styles.loadMoreText}>Đang tải thêm...</Text>
                  </View>
                )}

                {/* End of List */}
                {!hasNextPage && schools.length > 0 && (
                  <View style={styles.endContainer}>
                    <Text style={styles.endText}>Đã hiển thị tất cả trường học</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="school" size={64} color={COLORS.TEXT_SECONDARY} />
                <Text style={styles.emptyTitle}>
                  {searchQuery ? 'Không tìm thấy trường học' : 'Chưa có trường học nào'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery
                    ? `Không có trường học nào khớp với "${searchQuery}"`
                    : 'Danh sách trường học trống'}
                </Text>
              </View>
            )}
          </>
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
  searchContainer: {
    padding: SPACING.MD,
    backgroundColor: COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.SM,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_PRIMARY,
  },
  clearButton: {
    padding: SPACING.XS,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.MD,
  },
  headerInfo: {
    marginBottom: SPACING.MD,
  },
  headerInfoText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  schoolCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  schoolHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.SM,
  },
  schoolIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  schoolInfo: {
    flex: 1,
  },
  schoolName: {
    fontSize: FONTS.SIZES.LG,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  schoolDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.XS,
  },
  schoolDetailText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.XS,
    flex: 1,
  },
  schoolContact: {
    marginTop: SPACING.SM,
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS,
  },
  contactText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.SM,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: SPACING.XL,
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.TEXT_SECONDARY,
  },
  errorContainer: {
    alignItems: 'center',
    padding: SPACING.XL,
  },
  errorText: {
    marginTop: SPACING.MD,
    fontSize: FONTS.SIZES.MD,
    color: COLORS.ERROR,
    textAlign: 'center',
    marginBottom: SPACING.MD,
  },
  retryButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.SURFACE,
    fontSize: FONTS.SIZES.MD,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: SPACING.XL,
    marginTop: SPACING.XL,
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
  },
  loadMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.MD,
  },
  loadMoreText: {
    marginLeft: SPACING.SM,
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
  endContainer: {
    alignItems: 'center',
    padding: SPACING.MD,
  },
  endText: {
    fontSize: FONTS.SIZES.SM,
    color: COLORS.TEXT_SECONDARY,
  },
});

export default SchoolsScreen;

