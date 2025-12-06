import * as Location from 'expo-location';
// Tạm thời comment để tránh lỗi native module chưa được build
// Sẽ uncomment sau khi rebuild app
let captureRef: any = null;
try {
  const viewShot = require('react-native-view-shot');
  captureRef = viewShot.captureRef;
} catch (error) {
  console.warn('react-native-view-shot chưa được cài đặt hoặc chưa rebuild app');
}
import { View, Image, Text, StyleSheet, Dimensions } from 'react-native';
import React, { useState, useEffect } from 'react';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface LocationInfo {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface WatermarkInfo {
  timestamp: string;
  location: LocationInfo | null;
}

/**
 * Lấy vị trí hiện tại của thiết bị
 * @returns LocationInfo hoặc null nếu không lấy được
 */
export async function getCurrentLocation(): Promise<LocationInfo | null> {
  try {
    // Yêu cầu quyền truy cập location
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Location permission not granted');
      return null;
    }

    // Kiểm tra xem location services có bật không
    const isEnabled = await Location.hasServicesEnabledAsync();
    if (!isEnabled) {
      console.warn('Location services are not enabled');
      return null;
    }

    // Lấy vị trí hiện tại với độ chính xác cao
    // Sử dụng Balanced thay vì High để tránh timeout trên một số thiết bị
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    if (!location) {
      return null;
    }

    const locationInfo: LocationInfo = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    // Thử lấy địa chỉ từ tọa độ (reverse geocoding)
    // Sử dụng timeout để tránh chờ quá lâu
    try {
      const addresses = await Promise.race([
        Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Geocoding timeout')), 5000)
        )
      ]);

      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        // Format địa chỉ: Số nhà, Đường, Phường/Xã, Quận/Huyện, Thành phố
        const addressParts: string[] = [];
        if (address.streetNumber) addressParts.push(address.streetNumber);
        if (address.street) addressParts.push(address.street);
        if (address.district) addressParts.push(address.district);
        if (address.city) addressParts.push(address.city);
        
        if (addressParts.length > 0) {
          locationInfo.address = addressParts.join(', ');
        } else {
          // Fallback: chỉ hiển thị tọa độ
          locationInfo.address = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
        }
      } else {
        // Fallback: chỉ hiển thị tọa độ
        locationInfo.address = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
      }
    } catch (geocodeError) {
      // Nếu không lấy được địa chỉ, chỉ hiển thị tọa độ
      locationInfo.address = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
    }

    return locationInfo;
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
}

/**
 * Format thời gian theo định dạng Việt Nam
 * @param date Date object
 * @returns String format: "DD/MM/YYYY HH:mm:ss"
 */
export function formatTimestamp(date: Date = new Date()): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Tạo component watermark overlay để vẽ lên ảnh
 */
const WatermarkOverlay: React.FC<{ timestamp: string; location: LocationInfo | null }> = ({ 
  timestamp, 
  location 
}) => {
  return (
    <View style={watermarkStyles.overlay}>
      <View style={watermarkStyles.watermarkContainer}>
        <Text style={watermarkStyles.watermarkText}>{timestamp}</Text>
        {location && (
          <Text style={watermarkStyles.watermarkText}>
            📍 {location.address || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`}
          </Text>
        )}
      </View>
    </View>
  );
};

const watermarkStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
  },
  watermarkContainer: {
    gap: 4,
  },
  watermarkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

/**
 * Lấy thông tin watermark (thời gian + vị trí)
 * @param location Vị trí (optional, sẽ tự động lấy nếu không cung cấp)
 * @returns WatermarkInfo
 */
export async function getWatermarkInfo(
  location?: LocationInfo | null
): Promise<WatermarkInfo> {
  const timestamp = formatTimestamp();
  let finalLocation: LocationInfo | null = location || null;
  
  if (!finalLocation) {
    finalLocation = await getCurrentLocation();
  }

  return {
    timestamp,
    location: finalLocation,
  };
}

/**
 * Tạo component View để render ảnh với watermark (dùng với react-native-view-shot)
 * Component này sẽ được render và capture bằng captureRef
 */
export const ImageWithWatermark: React.FC<{
  imageUri: string;
  timestamp: string;
  location: LocationInfo | null;
  style?: any;
  onImageLoad?: () => void;
}> = ({ imageUri, timestamp, location, style, onImageLoad }) => {
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Lấy kích thước thực tế của ảnh
  useEffect(() => {
    if (imageUri) {
      Image.getSize(
        imageUri,
        (width, height) => {
          // Tính toán kích thước để giữ tỷ lệ và fit vào màn hình
          const screenWidth = SCREEN_WIDTH;
          const aspectRatio = height / width;
          const calculatedHeight = screenWidth * aspectRatio;
          setImageDimensions({ width: screenWidth, height: calculatedHeight });
        },
        (error) => {
          console.warn('Error getting image size:', error);
          // Fallback: dùng kích thước mặc định
          setImageDimensions({ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.33 });
        }
      );
    }
  }, [imageUri]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    if (onImageLoad) {
      onImageLoad();
    }
  };

  const containerStyle = imageDimensions 
    ? { width: imageDimensions.width, height: imageDimensions.height }
    : { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.33 };

  return (
    <View 
      style={[containerStyle, { backgroundColor: '#000' }, style]} 
      collapsable={false}
      removeClippedSubviews={false}
    >
      {imageUri && (
        <Image
          source={{ uri: imageUri }}
          style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
          onLoad={handleImageLoad}
          onLoadEnd={handleImageLoad}
          resizeMethod="resize"
        />
      )}
      {imageLoaded && (
        <WatermarkOverlay timestamp={timestamp} location={location} />
      )}
    </View>
  );
};

/**
 * Capture ảnh với watermark sử dụng react-native-view-shot
 * @param viewRef Ref của View chứa ImageWithWatermark component
 * @returns URI của ảnh đã có watermark
 */
export async function captureImageWithWatermark(viewRef: React.RefObject<View>): Promise<string | null> {
  try {
    // Kiểm tra xem captureRef có sẵn không
    if (!captureRef) {
      console.warn('react-native-view-shot chưa được setup, không thể capture watermark');
      return null;
    }

    if (!viewRef.current) {
      console.warn('View ref is not available for watermark capture');
      return null;
    }

    // Thêm timeout để tránh chờ quá lâu
    const uri = await Promise.race([
      captureRef(viewRef, {
        format: 'jpg',
        quality: 0.9,
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Capture timeout')), 10000)
      )
    ]);

    return uri;
  } catch (error: any) {
    console.error('Error capturing image with watermark:', error?.message || error);
    return null;
  }
}

/**
 * Helper function đơn giản: xử lý ảnh với watermark
 * Sử dụng cách tiếp cận đơn giản: tạo View ẩn, render, capture
 * @param imageUri URI của ảnh gốc
 * @returns Promise<string> URI của ảnh đã có watermark
 */
export async function processImageWithWatermark(imageUri: string): Promise<string> {
  try {
    // Lấy thông tin watermark
    const watermarkInfo = await getWatermarkInfo();
    
    // Tạo một View ẩn để render watermark
    // Sử dụng một cách tiếp cận khác: tạo View component và capture nó
    // Nhưng điều này yêu cầu render View thực tế trong component tree
    
    // Giải pháp tạm thời: trả về ảnh gốc
    // Các màn hình sẽ tự xử lý việc render và capture
    return imageUri;
  } catch (error) {
    console.error('Error processing image with watermark:', error);
    return imageUri;
  }
}

