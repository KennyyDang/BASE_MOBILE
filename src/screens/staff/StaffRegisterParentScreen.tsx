import React, { useState } from 'react';
import { View, Image, ScrollView, StyleSheet } from 'react-native';
import { Button, Text, TextInput, HelperText, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import visionService from '../../services/visionService';
import { parseCccdTextToParent } from '../../utils/cccdParser';
import axiosInstance from '../../config/axios.config';

const StaffRegisterParentScreen: React.FC = () => {
	const [imageUri, setImageUri] = useState<string | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [form, setForm] = useState({
		fullName: '',
		email: '',
		phoneNumber: '',
		cccdNumber: '',
		dateOfBirth: '',
		address: '',
		password: '',
	});
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const onPickImage = async () => {
		setError(null);
		setSuccess(null);
		const { status } = await ImagePicker.requestCameraPermissionsAsync();
		if (status !== 'granted') {
			setError('Cần quyền camera để chụp CCCD.');
			return;
		}
		const result = await ImagePicker.launchCameraAsync({
			quality: 0.8,
			base64: true,
		});
		if (!result.canceled && result.assets?.[0]) {
			setImageUri(result.assets[0].uri);
			await onOcr(result.assets[0].base64 || null);
		}
	};

	const onOcr = async (base64: string | null) => {
		if (!base64) return;
		setLoading(true);
		setError(null);
		setSuccess(null);
		try {
			const text = await visionService.textDetectionBase64(base64);
			const parsed = parseCccdTextToParent(text);
			setForm((prev) => ({
				...prev,
				...parsed,
				password: prev.password || generateDefaultPassword(parsed),
			}));
		} catch (e: any) {
			setError(e?.message || 'Không thể nhận dạng CCCD. Vui lòng thử lại.');
		} finally {
			setLoading(false);
		}
	};

	const generateDefaultPassword = (parsed: { cccdNumber?: string; dateOfBirth?: string }) => {
		// Ví dụ: 6 số cuối CCCD + ngày sinh ddMM => demo
		const last6 = (parsed.cccdNumber || '').slice(-6);
		const dobCompact = (parsed.dateOfBirth || '').replaceAll('/', '').slice(0, 4);
		return (last6 + dobCompact || 'Base@1234');
	};

	const onSubmit = async () => {
		setLoading(true);
		setError(null);
		setSuccess(null);
		try {
			// Demo: gọi endpoint đăng ký chung
			const payload = {
				email: form.email,
				password: form.password || 'Base@1234',
				name: form.fullName,
				phoneNumber: form.phoneNumber,
				cccdNumber: form.cccdNumber,
				dateOfBirth: form.dateOfBirth,
				address: form.address,
			};
			const res = await axiosInstance.post('/auth/register', payload);
			if (res?.status >= 200 && res?.status < 300) {
				setSuccess('Tạo tài khoản phụ huynh thành công.');
			} else {
				setError('Không tạo được tài khoản. Vui lòng thử lại.');
			}
		} catch (e: any) {
			setError(e?.response?.data?.message || e?.message || 'Không tạo được tài khoản.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Text variant="titleLarge" style={styles.title}>Quét CCCD và tạo tài khoản</Text>
			<Button mode="contained" onPress={onPickImage} style={styles.btn} disabled={loading}>
				Chụp CCCD
			</Button>

			{imageUri ? (
				<Image source={{ uri: imageUri }} style={styles.preview} />
			) : null}

			{loading ? <ActivityIndicator style={{ marginVertical: 12 }} /> : null}
			{error ? <HelperText type="error" visible>{error}</HelperText> : null}
			{success ? <HelperText type="info" visible>{success}</HelperText> : null}

			<View style={styles.form}>
				<TextInput
					label="Họ và tên"
					value={form.fullName}
					onChangeText={(t) => setForm((p) => ({ ...p, fullName: t }))}
					mode="outlined"
					style={styles.input}
				/>
				<TextInput
					label="Email"
					value={form.email}
					onChangeText={(t) => setForm((p) => ({ ...p, email: t }))}
					mode="outlined"
					keyboardType="email-address"
					autoCapitalize="none"
					style={styles.input}
				/>
				<TextInput
					label="Số điện thoại"
					value={form.phoneNumber}
					onChangeText={(t) => setForm((p) => ({ ...p, phoneNumber: t }))}
					mode="outlined"
					keyboardType="phone-pad"
					style={styles.input}
				/>
				<TextInput
					label="Số CCCD"
					value={form.cccdNumber}
					onChangeText={(t) => setForm((p) => ({ ...p, cccdNumber: t }))}
					mode="outlined"
					keyboardType="number-pad"
					style={styles.input}
				/>
				<TextInput
					label="Ngày sinh (dd/MM/yyyy)"
					value={form.dateOfBirth}
					onChangeText={(t) => setForm((p) => ({ ...p, dateOfBirth: t }))}
					mode="outlined"
					placeholder="dd/MM/yyyy"
					style={styles.input}
				/>
				<TextInput
					label="Địa chỉ"
					value={form.address}
					onChangeText={(t) => setForm((p) => ({ ...p, address: t }))}
					mode="outlined"
					style={styles.input}
					multiline
				/>
				<TextInput
					label="Mật khẩu tạm"
					value={form.password}
					onChangeText={(t) => setForm((p) => ({ ...p, password: t }))}
					mode="outlined"
					secureTextEntry
					style={styles.input}
				/>
			</View>

			<Button mode="contained" onPress={onSubmit} disabled={loading} style={styles.btn}>
				Tạo tài khoản phụ huynh
			</Button>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		padding: 16,
	},
	title: {
		textAlign: 'center',
		marginBottom: 12,
	},
	btn: {
		marginVertical: 8,
	},
	preview: {
		width: '100%',
		height: 220,
		borderRadius: 8,
		marginVertical: 8,
	},
	form: {
		marginTop: 8,
	},
	input: {
		marginBottom: 12,
	},
});

export default StaffRegisterParentScreen;


