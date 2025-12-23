import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { ImageWithWatermark, WatermarkInfo } from '../utils/imageWatermark';

interface WatermarkImageProcessorProps {
  imageUri: string;
  watermarkInfo: WatermarkInfo;
  onReady?: (ref: React.RefObject<View | null>) => void;
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
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (viewRef.current && onReady && isReady) {
      // Đợi một chút để View render xong
      setTimeout(() => {
        onReady(viewRef);
      }, 100);
    }
  }, [onReady, isReady]);

  const handleImageLoad = () => {
    setIsReady(true);
  };

  return (
    <View ref={viewRef} style={styles.hiddenView} collapsable={false}>
      <ImageWithWatermark
        imageUri={imageUri}
        timestamp={watermarkInfo.timestamp}
        location={watermarkInfo.location}
        onImageLoad={handleImageLoad}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  hiddenView: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    // Prevent React Native from optimizing this view away
    opacity: 0.01,
  },
});

