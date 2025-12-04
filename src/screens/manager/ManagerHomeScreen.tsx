import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, FONTS } from '../../constants';

const ManagerHomeScreen: React.FC = () => {
	const navigation = useNavigation<any>();
	const { logout, user } = useAuth();
	
	const userRole = (user?.role || '').toUpperCase();
	const isManager = userRole.includes('MANAGER') || userRole === 'ADMIN';

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			<Text variant="titleLarge" style={styles.title}>
				Trang quản lý
			</Text>
			<Text style={styles.subtitle}>Tạo tài khoản phụ huynh bằng OCR CCCD</Text>
			
			{/* Navigation Menu */}
			<View style={styles.menuSection}>
				<Text style={styles.menuTitle}>Chức năng</Text>
				
				<TouchableOpacity
					style={styles.menuItem}
					onPress={() => navigation.navigate('ManagerRegisterParent')}
					activeOpacity={0.7}
				>
					<View style={styles.menuItemLeft}>
						<View style={[styles.menuIcon, { backgroundColor: COLORS.PRIMARY + '20' }]}>
							<MaterialIcons name="qr-code-scanner" size={24} color={COLORS.PRIMARY} />
						</View>
						<View style={styles.menuItemTextContainer}>
							<Text style={styles.menuItemTitle}>Đăng ký phụ huynh</Text>
							<Text style={styles.menuItemSubtitle}>Quét CCCD và tạo tài khoản</Text>
						</View>
					</View>
					<MaterialIcons name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.menuItem}
					onPress={() => navigation.navigate('ManagerProfile')}
					activeOpacity={0.7}
				>
					<View style={styles.menuItemLeft}>
						<View style={[styles.menuIcon, { backgroundColor: COLORS.ACCENT + '20' }]}>
							<MaterialIcons name="person" size={24} color={COLORS.ACCENT} />
						</View>
						<View style={styles.menuItemTextContainer}>
							<Text style={styles.menuItemTitle}>Hồ sơ</Text>
							<Text style={styles.menuItemSubtitle}>Xem và chỉnh sửa thông tin</Text>
						</View>
					</View>
					<MaterialIcons name="chevron-right" size={24} color={COLORS.TEXT_SECONDARY} />
				</TouchableOpacity>
			</View>

			<Button
				mode="outlined"
				onPress={logout}
				style={styles.btn}
				icon="logout"
			>
				Đăng xuất
			</Button>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.BACKGROUND,
	},
	content: {
		padding: SPACING.LG,
		paddingBottom: SPACING.XL,
	},
	title: {
		textAlign: 'center',
		marginBottom: SPACING.SM,
		color: COLORS.TEXT_PRIMARY,
	},
	subtitle: {
		textAlign: 'center',
		marginBottom: SPACING.XL,
		color: COLORS.TEXT_SECONDARY,
		fontSize: FONTS.SIZES.SM,
	},
	menuSection: {
		marginBottom: SPACING.XL,
	},
	menuTitle: {
		fontSize: FONTS.SIZES.LG,
		fontWeight: '600',
		color: COLORS.TEXT_PRIMARY,
		marginBottom: SPACING.MD,
	},
	menuItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: COLORS.SURFACE,
		padding: SPACING.MD,
		borderRadius: 12,
		marginBottom: SPACING.MD,
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
	},
	menuItemLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	menuIcon: {
		width: 48,
		height: 48,
		borderRadius: 24,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: SPACING.MD,
	},
	menuItemTextContainer: {
		flex: 1,
	},
	menuItemTitle: {
		fontSize: FONTS.SIZES.MD,
		fontWeight: '600',
		color: COLORS.TEXT_PRIMARY,
		marginBottom: SPACING.XS / 2,
	},
	menuItemSubtitle: {
		fontSize: FONTS.SIZES.SM,
		color: COLORS.TEXT_SECONDARY,
	},
	btn: {
		marginTop: SPACING.MD,
	},
});

export default ManagerHomeScreen;

