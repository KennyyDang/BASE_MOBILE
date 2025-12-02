import axiosInstance from '../config/axios.config';
import { Platform } from 'react-native';

export interface UploadImageResponse {
  imageUrl: string;
}

class ImageService {
  /**
   * Upload an image file
   * Endpoint: POST /api/Image/upload
   * @param fileUri Local file URI from image picker
   * @param fileName Optional file name (defaults to timestamp-based name)
   * @param mimeType MIME type (defaults to 'image/jpeg')
   * @returns Upload response with imageUrl
   */
  async uploadImage(
    fileUri: string,
    fileName?: string,
    mimeType: string = 'image/jpeg'
  ): Promise<UploadImageResponse> {
    try {
      if (!fileUri) {
        throw new Error('Không tìm thấy ảnh để upload.');
      }

      // Create FormData for multipart/form-data
      const formData = new FormData();
      
      // Extract filename from URI if not provided
      const fileExtension = mimeType.split('/')[1] || 'jpg';
      const defaultFileName = fileName || `image_${Date.now()}.${fileExtension}`;
      
      // Fix URI for Android - remove 'file://' prefix if exists
      let fixedUri = fileUri;
      if (fileUri.startsWith('file://')) {
        fixedUri = fileUri.replace('file://', '');
      }
      
      // Append file to FormData
      // @ts-ignore - FormData type issue with React Native
      formData.append('file', {
        uri: Platform.OS === 'android' ? fixedUri : fileUri,
        type: mimeType,
        name: defaultFileName,
      } as any);

      // Don't set Content-Type header manually - axios will set it with boundary automatically
      const response = await axiosInstance.post(
        '/api/Image/upload',
        formData,
        {
          timeout: 60000, // 60 seconds timeout for file upload
        }
      );
      
      // Handle different response formats
      const responseData = response.data;
      
      // If response is a string (URL), return it as imageUrl
      if (typeof responseData === 'string') {
        return { imageUrl: responseData };
      }
      
      // If response has imageUrl property
      if (responseData?.imageUrl) {
        return { imageUrl: responseData.imageUrl };
      }
      
      // If response has url property
      if (responseData?.url) {
        return { imageUrl: responseData.url };
      }
      
      // If response has data property
      if (responseData?.data) {
        if (typeof responseData.data === 'string') {
          return { imageUrl: responseData.data };
        }
        if (responseData.data?.imageUrl) {
          return { imageUrl: responseData.data.imageUrl };
        }
        if (responseData.data?.url) {
          return { imageUrl: responseData.data.url };
        }
      }
      
      // If none of the above, throw error
      throw new Error('Không nhận được URL ảnh từ server. Format response không hợp lệ.');
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Không thể upload ảnh. Vui lòng thử lại.';
      throw new Error(errorMessage);
    }
  }
}

export default new ImageService();

