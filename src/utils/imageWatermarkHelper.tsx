import React, { useRef, useEffect, useState } from 'react';
import { View, Modal, StyleSheet } from 'react-native';
import { ImageWithWatermark, getWatermarkInfo, WatermarkInfo } from './imageWatermark';
import { captureImageWithWatermark } from './imageWatermark';

/**
 * Hook để xử lý chụp ảnh với watermark
 * Sử dụng một Modal ẩn để render và capture ảnh với watermark
 */
export function useImageWithWatermark() {
  const [isProcessing, setIsProcessing] = useState(false);
  const watermarkViewRef = useRef<View>(null);
  const [watermarkData, setWatermarkData] = useState<{
    imageUri: string;
    watermarkInfo: WatermarkInfo | null;
  } | null>(null);

  /**
   * Xử lý ảnh với watermark
   * @param imageUri URI của ảnh gốc
   * @returns URI của ảnh đã có watermark, hoặc ảnh gốc nếu có lỗi
   */
  const processImageWithWatermark = async (imageUri: string): Promise<string> => {
    try {
      setIsProcessing(true);

      // Lấy thông tin watermark
      const watermarkInfo = await getWatermarkInfo();

      // Set data để render trong Modal
      setWatermarkData({
        imageUri,
        watermarkInfo,
      });

      // Đợi một chút để View render
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Capture View với watermark
      if (watermarkViewRef.current) {
        const watermarkedUri = await captureImageWithWatermark(watermarkViewRef);
        if (watermarkedUri) {
          return watermarkedUri;
        }
      }

      // Nếu không capture được, trả về ảnh gốc
      return imageUri;
    } catch (error) {
      console.error('Error processing image with watermark:', error);
      return imageUri; // Trả về ảnh gốc nếu có lỗi
    } finally {
      setIsProcessing(false);
      setWatermarkData(null);
    }
  };

  // Component Modal ẩn để render watermark
  const WatermarkModal = () => {
    if (!watermarkData) return null;

    return (
      <Modal visible={true} transparent={true} animationType="none">
        <View style={styles.hiddenContainer}>
          <View ref={watermarkViewRef} collapsable={false}>
            <ImageWithWatermark
              imageUri={watermarkData.imageUri}
              timestamp={watermarkData.watermarkInfo?.timestamp || ''}
              location={watermarkData.watermarkInfo?.location || null}
            />
          </View>
        </View>
      </Modal>
    );
  };

  return {
    processImageWithWatermark,
    isProcessing,
    WatermarkModal,
  };
}

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    width: 1,
    height: 1,
    overflow: 'hidden',
  },
});

