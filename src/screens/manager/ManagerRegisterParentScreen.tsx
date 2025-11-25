import React, { useState } from 'react';
import { View, Image, ScrollView, StyleSheet, Alert, Modal, TouchableOpacity, TextInput as RNTextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, Text, TextInput, HelperText, ActivityIndicator } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { extractCccdData, formatDateToDDMMYYYY, formatDateToISO, OcrCccdResponse } from '../../services/ocrService';
import axiosInstance from '../../config/axios.config';
import { useAuth } from '../../contexts/AuthContext';

const ManagerRegisterParentScreen: React.FC = () => {
	const { user } = useAuth();
	const [imageUri, setImageUri] = useState<string | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [ocrData, setOcrData] = useState<OcrCccdResponse | null>(null);
	const [form, setForm] = useState({
		email: '',
		password: '',
		fullName: '',
		phoneNumber: '',
		cccdNumber: '',
		dateOfBirth: '',
		gender: '',
		address: '',
		issuedDate: '',
		issuedPlace: '',
	});
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	
	// Date picker states for issued date
	const [showIssuedDatePicker, setShowIssuedDatePicker] = useState(false);
	const [issuedDayInput, setIssuedDayInput] = useState('');
	const [issuedMonthInput, setIssuedMonthInput] = useState('');
	const [issuedYearInput, setIssuedYearInput] = useState('');

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
			allowsEditing: false,
		});
		if (!result.canceled && result.assets?.[0]) {
			const asset = result.assets[0];
			setImageUri(asset.uri);
			await onOcr(asset.uri);
		}
	};

	const onOcr = async (imageUri: string) => {
		if (!imageUri) return;
		const startTime = Date.now();
		setLoading(true);
		setError(null);
		setSuccess(null);
		setSuccess('Đang xử lý OCR... Vui lòng đợi.');
		
		try {
			// Call OCR API to extract CCCD data
			const ocrResult = await extractCccdData(imageUri);
			
			const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
			console.log(`[OCR] Hoàn thành sau ${processingTime}s`);
			
			setOcrData(ocrResult);
			
			// Auto-fill form with OCR data (xử lý nhanh)
			setForm((prev) => ({
				...prev,
				fullName: ocrResult.fullName || prev.fullName,
				cccdNumber: ocrResult.identityCardNumber || prev.cccdNumber,
				dateOfBirth: formatDateToDDMMYYYY(ocrResult.dateOfBirth) || prev.dateOfBirth,
				gender: ocrResult.gender || prev.gender,
				address: ocrResult.address || prev.address,
				issuedDate: formatDateToDDMMYYYY(ocrResult.issuedDate) || prev.issuedDate,
				issuedPlace: ocrResult.issuedPlace || prev.issuedPlace,
				password: prev.password || generateDefaultPassword(ocrResult),
			}));
			
			setSuccess(`Đã nhận dạng CCCD thành công! (${processingTime}s) Vui lòng kiểm tra và điền thêm thông tin.`);
		} catch (e: any) {
			// Hiển thị error message từ service đã được format
			setError(e?.message || 'Không thể nhận dạng CCCD. Vui lòng thử lại.');
		} finally {
			setLoading(false);
		}
	};

	const generateDefaultPassword = (ocrData: OcrCccdResponse) => {
		// Generate default password: 6 last digits of CCCD + birth year
		const last6 = (ocrData.identityCardNumber || '').slice(-6);
		const birthYear = ocrData.dateOfBirth ? new Date(ocrData.dateOfBirth).getFullYear() : '';
		return (last6 + birthYear) || 'Base@1234';
	};

	const handleConfirmIssuedDate = () => {
		const day = issuedDayInput.padStart(2, '0');
		const month = issuedMonthInput.padStart(2, '0');
		const year = issuedYearInput;
		
		if (day && month && year && year.length === 4) {
			const dateStr = `${day}/${month}/${year}`;
			setForm((prev) => ({ ...prev, issuedDate: dateStr }));
		}
		setShowIssuedDatePicker(false);
	};

	const openIssuedDatePicker = () => {
		// Parse current date if exists
		const currentDate = form.issuedDate;
		if (currentDate) {
			const parts = currentDate.split('/');
			if (parts.length === 3) {
				setIssuedDayInput(parts[0]);
				setIssuedMonthInput(parts[1]);
				setIssuedYearInput(parts[2]);
			}
		}
		setShowIssuedDatePicker(true);
	};

	const onSubmit = async () => {
		// Validation
		if (!form.email) {
			setError('Vui lòng nhập email.');
			return;
		}
		if (!form.password) {
			setError('Vui lòng nhập mật khẩu.');
			return;
		}
		if (!form.fullName) {
			setError('Vui lòng nhập họ và tên.');
			return;
		}
		if (!form.cccdNumber) {
			setError('Vui lòng nhập số CCCD.');
			return;
		}
		if (!ocrData?.identityCardPublicId) {
			setError('Vui lòng chụp ảnh CCCD trước.');
			return;
		}

		setLoading(true);
		setError(null);
		setSuccess(null);
		try {
			// Prepare payload for API
			const payload = {
				email: form.email,
				password: form.password,
				name: form.fullName,
				branchId: user?.branchId || '00000000-0000-0000-0000-000000000000', // TODO: Get from user context or require input
				identityCardNumber: form.cccdNumber,
				dateOfBirth: formatDateToISO(form.dateOfBirth) || ocrData.dateOfBirth,
				gender: form.gender || ocrData.gender,
				address: form.address,
				issuedDate: form.issuedDate ? formatDateToISO(form.issuedDate) : ocrData.issuedDate,
				issuedPlace: form.issuedPlace || ocrData.issuedPlace,
				identityCardPublicId: ocrData.identityCardPublicId,
			};

			const res = await axiosInstance.post('/api/User/parent-with-cccd', payload);
			if (res?.status >= 200 && res?.status < 300) {
				setSuccess('Tạo tài khoản phụ huynh thành công!');
				// Reset form after success
				setTimeout(() => {
					setForm({
						email: '',
						password: '',
						fullName: '',
						phoneNumber: '',
						cccdNumber: '',
						dateOfBirth: '',
						gender: '',
						address: '',
						issuedDate: '',
						issuedPlace: '',
					});
					setImageUri(null);
					setOcrData(null);
				}, 2000);
			} else {
				setError('Không tạo được tài khoản. Vui lòng thử lại.');
			}
		} catch (e: any) {
			const errorMsg = e?.response?.data?.message || 
			                 e?.response?.data?.title || 
			                 e?.message || 
			                 'Không tạo được tài khoản.';
			setError(errorMsg);
		} finally {
			setLoading(false);
		}
	};

	return (
		<KeyboardAvoidingView 
			style={styles.container}
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
		>
		<ScrollView 
			contentContainerStyle={styles.scrollContent}
			keyboardShouldPersistTaps="handled"
			showsVerticalScrollIndicator={false}
		>
			<Text variant="titleLarge" style={styles.title}>Quét CCCD và tạo tài khoản</Text>
			<Button mode="contained" onPress={onPickImage} style={styles.btn} disabled={loading}>
				Chụp CCCD
			</Button>

			{imageUri ? (
				<Image source={{ uri: imageUri }} style={styles.preview} />
			) : null}

			{loading ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" style={{ marginVertical: 12 }} />
					<Text style={styles.loadingText}>
						Đang xử lý OCR... Vui lòng đợi.
						{'\n'}Quá trình này có thể mất 30-60 giây.
					</Text>
				</View>
			) : null}
			{error ? <HelperText type="error" visible>{error}</HelperText> : null}
			{success ? <HelperText type="info" visible>{success}</HelperText> : null}

			<View style={styles.form}>
				<TextInput
					label="Email *"
					value={form.email}
					onChangeText={(t) => setForm((p) => ({ ...p, email: t }))}
					mode="outlined"
					keyboardType="email-address"
					autoCapitalize="none"
					style={styles.input}
					required
				/>
				<TextInput
					label="Mật khẩu tạm *"
					value={form.password}
					onChangeText={(t) => setForm((p) => ({ ...p, password: t }))}
					mode="outlined"
					secureTextEntry
					style={styles.input}
					required
				/>
				<TextInput
					label="Họ và tên *"
					value={form.fullName}
					onChangeText={(t) => setForm((p) => ({ ...p, fullName: t }))}
					mode="outlined"
					style={styles.input}
					required
				/>
				<TextInput
					label="Số CCCD *"
					value={form.cccdNumber}
					onChangeText={(t) => setForm((p) => ({ ...p, cccdNumber: t }))}
					mode="outlined"
					keyboardType="number-pad"
					style={styles.input}
					required
				/>
				<TextInput
					label="Ngày sinh (dd/MM/yyyy) *"
					value={form.dateOfBirth}
					onChangeText={(t) => setForm((p) => ({ ...p, dateOfBirth: t }))}
					mode="outlined"
					placeholder="dd/MM/yyyy"
					style={styles.input}
					required
				/>
				<TextInput
					label="Giới tính"
					value={form.gender}
					onChangeText={(t) => setForm((p) => ({ ...p, gender: t }))}
					mode="outlined"
					style={styles.input}
					placeholder="Nam/Nữ"
				/>
				<TextInput
					label="Địa chỉ"
					value={form.address}
					onChangeText={(t) => setForm((p) => ({ ...p, address: t }))}
					mode="outlined"
					style={styles.input}
					multiline
					numberOfLines={3}
				/>
				<TextInput
					label="Ngày cấp (dd/MM/yyyy)"
					value={form.issuedDate}
					onChangeText={(t) => setForm((p) => ({ ...p, issuedDate: t }))}
					mode="outlined"
					placeholder="dd/MM/yyyy"
					style={styles.input}
				/>
				<TextInput
					label="Nơi cấp"
					value={form.issuedPlace}
					onChangeText={(t) => setForm((p) => ({ ...p, issuedPlace: t }))}
					mode="outlined"
					style={styles.input}
				/>
			</View>

			<Button mode="contained" onPress={onSubmit} disabled={loading} style={styles.btn}>
				Tạo tài khoản phụ huynh
			</Button>

			{/* Issued Date Picker Modal */}
			<Modal
				visible={showIssuedDatePicker}
				transparent={true}
				animationType="slide"
				onRequestClose={() => setShowIssuedDatePicker(false)}
				hardwareAccelerated={true}
				presentationStyle="overFullScreen"
			>
				<View style={styles.datePickerModalOverlay}>
					<TouchableOpacity 
						style={StyleSheet.absoluteFill} 
						activeOpacity={1}
						onPress={() => setShowIssuedDatePicker(false)}
					/>
					<View style={styles.datePickerModalContent} pointerEvents="box-none">
						<View style={styles.datePickerModalHeader}>
							<Text style={styles.datePickerModalTitle}>Chọn ngày cấp</Text>
							<TouchableOpacity onPress={() => setShowIssuedDatePicker(false)}>
								<MaterialIcons name="close" size={24} color="#6B7280" />
							</TouchableOpacity>
						</View>
						<View style={styles.simpleDatePickerContainer}>
							<View style={styles.dateInputRow}>
								<View style={styles.dateInputGroup}>
									<Text style={styles.dateInputLabel}>Ngày</Text>
									<RNTextInput
										style={styles.dateInput}
										value={issuedDayInput}
										onChangeText={(text) => {
											const numericText = text.replace(/[^0-9]/g, '');
											if (numericText === '' || (parseInt(numericText) >= 1 && parseInt(numericText) <= 31)) {
												setIssuedDayInput(numericText);
											}
										}}
										placeholder="DD"
										placeholderTextColor="#6B7280"
										keyboardType="number-pad"
										maxLength={2}
									/>
								</View>
								<View style={styles.dateInputGroup}>
									<Text style={styles.dateInputLabel}>Tháng</Text>
									<RNTextInput
										style={styles.dateInput}
										value={issuedMonthInput}
										onChangeText={(text) => {
											const numericText = text.replace(/[^0-9]/g, '');
											if (numericText === '' || (parseInt(numericText) >= 1 && parseInt(numericText) <= 12)) {
												setIssuedMonthInput(numericText);
											}
										}}
										placeholder="MM"
										placeholderTextColor="#6B7280"
										keyboardType="number-pad"
										maxLength={2}
									/>
								</View>
								<View style={styles.dateInputGroup}>
									<Text style={styles.dateInputLabel}>Năm</Text>
									<RNTextInput
										style={styles.dateInput}
										value={issuedYearInput}
										onChangeText={(text) => {
											const numericText = text.replace(/[^0-9]/g, '');
											const currentYear = new Date().getFullYear();
											const numValue = parseInt(numericText);
											// Allow empty, or allow typing (less than 4 digits), or validate full year
											if (numericText === '' || 
												numericText.length < 4 || 
												(numericText.length === 4 && numValue >= 1950 && numValue <= currentYear)) {
												setIssuedYearInput(numericText);
											}
										}}
										placeholder="YYYY"
										placeholderTextColor="#6B7280"
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
								onPress={() => setShowIssuedDatePicker(false)}
							>
								<Text style={styles.datePickerModalButtonCancelText}>Hủy</Text>
							</TouchableOpacity>
							<TouchableOpacity 
								style={[styles.datePickerModalButton, styles.datePickerModalButtonConfirm]} 
								onPress={handleConfirmIssuedDate}
							>
								<Text style={styles.datePickerModalButtonConfirmText}>Xác nhận</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</ScrollView>
		</KeyboardAvoidingView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
	},
	scrollContent: {
		padding: 16,
		paddingBottom: 32,
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
	loadingContainer: {
		alignItems: 'center',
		marginVertical: 16,
		padding: 16,
		backgroundColor: '#F3F4F6',
		borderRadius: 8,
	},
	loadingText: {
		textAlign: 'center',
		color: '#6B7280',
		fontSize: 14,
		marginTop: 8,
	},
	datePickerModalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'flex-end',
	},
	datePickerModalContent: {
		backgroundColor: '#FFFFFF',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		padding: 24,
		maxHeight: '50%',
		marginBottom: Platform.OS === 'ios' ? 0 : 20,
	},
	datePickerModalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
	},
	datePickerModalTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#1A1A1A',
	},
	simpleDatePickerContainer: {
		marginVertical: 16,
	},
	dateInputRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 12,
		marginBottom: 8,
	},
	dateInputGroup: {
		flex: 1,
	},
	dateInputLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1A1A1A',
		marginBottom: 8,
	},
	dateInput: {
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderRadius: 8,
		padding: 12,
		fontSize: 16,
		textAlign: 'center',
		backgroundColor: '#FFFFFF',
	},
	dateInputHint: {
		fontSize: 12,
		color: '#6B7280',
		textAlign: 'center',
		marginTop: 8,
	},
	datePickerModalFooter: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		gap: 12,
		marginTop: 16,
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: '#E5E7EB',
	},
	datePickerModalButton: {
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
		minWidth: 100,
		alignItems: 'center',
	},
	datePickerModalButtonCancel: {
		backgroundColor: '#F3F4F6',
	},
	datePickerModalButtonConfirm: {
		backgroundColor: '#5cbdb9',
	},
	datePickerModalButtonCancelText: {
		color: '#6B7280',
		fontSize: 16,
		fontWeight: '600',
	},
	datePickerModalButtonConfirmText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},
});

export default ManagerRegisterParentScreen;

