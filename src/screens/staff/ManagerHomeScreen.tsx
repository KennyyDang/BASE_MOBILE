import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';

const ManagerHomeScreen: React.FC = () => {
	const navigation = useNavigation<any>();
	const { logout } = useAuth();

	return (
		<View style={styles.container}>
			<Text variant="titleLarge" style={styles.title}>Trang quản lý</Text>
			<Text style={styles.subtitle}>Tạo tài khoản phụ huynh bằng OCR CCCD</Text>
			<Button
				mode="contained"
				onPress={() => navigation.navigate('ManagerRegisterParent')}
				style={styles.btn}
			>
				Quét CCCD và tạo tài khoản phụ huynh
			</Button>
			<Button
				mode="outlined"
				onPress={logout}
				style={styles.btn}
			>
				Đăng xuất
			</Button>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
		justifyContent: 'center',
	},
	title: {
		textAlign: 'center',
		marginBottom: 8,
	},
	subtitle: {
		textAlign: 'center',
		marginBottom: 24,
	},
	btn: {
		marginTop: 8,
	},
});

export default ManagerHomeScreen;

