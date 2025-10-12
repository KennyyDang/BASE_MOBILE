# 🚀 BASE Mobile - Hướng dẫn Setup cho Developer mới

## ⚠️ Lưu ý quan trọng

**Project này đã được sửa các vấn đề version conflicts và dependencies để đảm bảo chạy được ngay sau khi clone.**

## 📋 Yêu cầu hệ thống

- **Node.js**: Version 20.18.0 (bắt buộc)
- **npm**: Version mới nhất
- **Expo CLI**: `npm install -g @expo/cli`
- **Git**: Để clone repository

## 🛠️ Các bước setup

### Bước 1: Clone repository
```bash
git clone <repository-url>
cd BASE_MOBILE
```

### Bước 2: Kiểm tra Node.js version
```bash
node --version
# Phải hiển thị: v20.18.0
```

**Nếu không đúng version:**
- **Windows**: Download từ [nodejs.org](https://nodejs.org/) - chọn version 20.18.0
- **Mac/Linux**: Sử dụng nvm
  ```bash
  nvm install 20.18.0
  nvm use 20.18.0
  ```

### Bước 3: Cài đặt Expo CLI
```bash
npm install -g @expo/cli
```

### Bước 4: Clean install dependencies
```bash
# Xóa cache cũ
rm -rf node_modules package-lock.json

# Cài đặt dependencies
npm install --legacy-peer-deps
```

### Bước 5: Khởi động ứng dụng
```bash
npm start
```

## 📱 Chạy ứng dụng

### Trên điện thoại (Expo Go)
1. Cài đặt **Expo Go** từ App Store/Play Store
2. Quét QR code hiển thị trong terminal
3. Ứng dụng sẽ tự động load

### Trên máy tính
```bash
# Chạy trên Web
npm run web

# Chạy trên Android (cần Android Studio)
npm run android

# Chạy trên iOS (cần macOS + Xcode)
npm run ios
```

## 🔧 Troubleshooting

### Lỗi dependencies conflicts
```bash
# Nếu gặp lỗi ERESOLVE
npm install --legacy-peer-deps

# Hoặc xóa cache và cài lại
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Lỗi PlatformConstants
```bash
# Đảm bảo đúng Node.js version
node --version  # Phải là v20.18.0

# Reset Expo cache
npx expo start --clear
```

### Port đã được sử dụng
```bash
# Sử dụng port khác
npx expo start --port 8084
```

### Lỗi Metro bundler
```bash
# Reset Metro cache
npx expo start --clear
# Hoặc
npx react-native start --reset-cache
```

## 📦 Dependencies đã được sửa

### Version fixes:
- **React**: 19.1.0 → 18.3.1 (tương thích với RN 0.81.4)
- **@types/react**: 19.1.10 → 18.3.12
- **Node.js**: >=20 → 20.18.0 (khớp với .nvmrc)

### Dependencies đã thêm:
- `@react-native-async-storage/async-storage`: Lưu trữ local
- `react-native-reanimated`: Animation library

### Config files đã sửa:
- `tsconfig.json`: `moduleResolution: "bundler"` → `"node"`
- `package.json`: Đồng bộ Node.js version với .nvmrc

## 🎯 Kết quả mong đợi

Sau khi setup thành công:
- ✅ Terminal hiển thị QR code
- ✅ Expo Go có thể quét và load app
- ✅ Web version chạy trên browser
- ✅ Không có lỗi dependencies

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra lại Node.js version (phải là 20.18.0)
2. Chạy `npm run clean` để reset dependencies
3. Kiểm tra internet connection
4. Đảm bảo Expo Go đã được cài đặt

---

**Chúc bạn code vui vẻ! 🎉**
