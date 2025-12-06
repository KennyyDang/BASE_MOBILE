import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ImageWithWatermark, WatermarkInfo } from '../utils/imageWatermark';

interface WatermarkImageProcessorProps {
  imageUri: string;
  watermarkInfo: WatermarkInfo;
  onReady?: (ref: React.RefObject<View>) => void;
}

/**
 * Component để render ảnh với watermark (ẩn, dùng để capture)
 */
export const WatermarkImageProcessor: React.FC<WatermarkImageProcessorProps> = ({
  imageUri,
  watermarkInfo,
  onReady,
}) => {
  const viewRef = useRef<View>(null);

  useEffect(() => {
    if (viewRef.current && onReady) {
      // Đợi một chút để View render xong
      setTimeout(() => {
        onReady(viewRef);
      }, 100);
    }
  }, [onReady]);

  return (
    <View ref={viewRef} style={styles.hiddenView} collapsable={false}>
      <ImageWithWatermark
        imageUri={imageUri}
        timestamp={watermarkInfo.timestamp}
        location={watermarkInfo.location}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  hiddenView: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    width: 1,
    height: 1,
    overflow: 'hidden',
  },
});

