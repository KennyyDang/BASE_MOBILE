import axiosInstance from '../config/axios.config';
import { Platform } from 'react-native';

export interface OcrCccdResponse {
  identityCardNumber: string;
  fullName: string;
  dateOfBirth: string; // ISO 8601 format
  gender: string;
  address: string;
  issuedDate: string | null; // ISO 8601 format or null
  issuedPlace: string | null;
  identityCardPublicId: string;
}

/**
 * Upload CCCD image and extract data using OCR API
 * @param imageUri - Local file URI from camera or gallery
 * @returns Extracted CCCD data
 */
export const extractCccdData = async (imageUri: string): Promise<OcrCccdResponse> => {
  try {
    // Validate imageUri
    if (!imageUri) {
      throw new Error('Không tìm thấy ảnh để upload.');
    }

    // Create FormData for multipart/form-data upload
    const filename = imageUri.split('/').pop() || 'cccd.jpg';
    const fileExtension = filename.split('.').pop() || 'jpg';
    const fileType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;

    // Use FormData with React Native
    const formData = new FormData();
    
    // Append file to FormData
    // Fix URI for Android/BlueStacks - remove 'file://' prefix if exists
    let fixedUri = imageUri;
    if (imageUri.startsWith('file://')) {
      fixedUri = imageUri.replace('file://', '');
    }
    
    // @ts-ignore - React Native FormData has different type structure
    formData.append('file', {
      uri: Platform.OS === 'android' ? fixedUri : imageUri,
      type: fileType,
      name: filename,
    } as any);

    // Make request with multipart/form-data
    // The axios interceptor will automatically remove Content-Type for FormData
    // so axios can set it with the correct boundary
    // OCR API có thể mất thời gian xử lý AI, tăng timeout lên 60s
    const response = await axiosInstance.post<OcrCccdResponse>(
      '/api/ocr/extract-and-store-cccd',
      formData,
      {
        headers: {
          'Accept': 'text/plain',
        },
        timeout: 60000, // 60 seconds cho OCR processing
        validateStatus: (status) => {
          // Don't throw error for status codes < 500, let us handle them
          return status < 500;
        },
      }
    );

    // Check response status manually
    if (response.status >= 400) {
      throw new Error(response.data?.message || `Server error: ${response.status}`);
    }

    return response.data;
  } catch (error: any) {
    // Handle different error types
    let errorMessage = 'Không thể nhận dạng CCCD. Vui lòng thử lại.';
    
    if (error?.code === 'NETWORK_ERROR' || error?.message === 'Network Error') {
      errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.';
    } else if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      errorMessage = 'OCR xử lý quá lâu. Vui lòng thử lại với ảnh rõ hơn.';
    } else if (error?.response?.status === 400) {
      errorMessage = error?.response?.data?.message || 'Ảnh không hợp lệ. Vui lòng chụp lại.';
    } else if (error?.response?.status === 401) {
      errorMessage = 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
    } else if (error?.response?.status === 413) {
      errorMessage = 'Ảnh quá lớn. Vui lòng chụp ảnh nhỏ hơn.';
    } else if (error?.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error?.response?.data?.title) {
      errorMessage = error.response.data.title;
    } else if (error?.message) {
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }
};

/**
 * Convert ISO 8601 date to dd/MM/yyyy format
 */
export const formatDateToDDMMYYYY = (isoDate: string | null): string => {
  if (!isoDate) return '';
  
  try {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
};

/**
 * Convert dd/MM/yyyy to ISO 8601 format
 */
export const formatDateToISO = (ddmmyyyy: string): string => {
  if (!ddmmyyyy) return '';
  
  try {
    const parts = ddmmyyyy.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toISOString();
    }
  } catch {
    // Fallback: try to parse as-is
  }
  
  return ddmmyyyy;
};

