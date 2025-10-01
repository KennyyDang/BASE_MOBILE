# BASE Mobile App

**BASE** - Brighway After-School Management System

![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

## 📱 Giới thiệu

BASE Mobile là ứng dụng quản lý trung tâm đào tạo Brighway, được xây dựng bằng React Native và Expo. Ứng dụng giúp phụ huynh quản lý lịch học, ví tiền, và thông tin cá nhân của con em.

## ✨ Tính năng chính

- 🔐 **Hệ thống đăng nhập** - Xác thực người dùng an toàn
- 🏠 **Dashboard** - Tổng quan thông tin và thao tác nhanh
- 📅 **Quản lý lịch học** - Xem và đăng ký lớp học
- 💰 **Ví tiền** - Quản lý tài chính và giao dịch
- 👤 **Hồ sơ cá nhân** - Thông tin phụ huynh và con em
- 🎨 **Giao diện đẹp** - Theme màu xanh lá chuyên nghiệp

## 🚀 Cài đặt và chạy

### Yêu cầu hệ thống
- **Node.js**: Version 20.18.0 (sử dụng file `.nvmrc`)
- **npm**: Version mới nhất
- **Expo CLI**: `npm install -g @expo/cli`
- **Expo Go app**: Cài đặt từ App Store/Play Store

### 🛠️ Setup cho Developer mới

#### Bước 1: Clone repository
```bash
git clone <repository-url>
cd BASE_MOBILE
```

#### Bước 2: Cài đặt Node.js đúng version
```bash
# Nếu có nvm (Node Version Manager)
nvm use

# Hoặc cài đặt Node.js 20.18.0 trực tiếp
# Download từ: https://nodejs.org/
```

#### Bước 3: Cài đặt dependencies
```bash
# Xóa cache cũ (nếu có)
rm -rf node_modules package-lock.json

# Cài đặt dependencies
npm install
```

#### Bước 4: Khởi động ứng dụng
```bash
# Khởi động development server
npm start

# Hoặc chạy trên port cụ thể
npx expo start --port 8083
```

### 📱 Chạy ứng dụng

#### Trên điện thoại (Expo Go)
1. Cài đặt **Expo Go** từ App Store/Play Store
2. Quét QR code hiển thị trong terminal
3. Ứng dụng sẽ tự động load

#### Trên máy tính
```bash
# Chạy trên Web
npm run web

# Chạy trên Android (cần Android Studio)
npm run android

# Chạy trên iOS (cần macOS + Xcode)
npm run ios
```

### ⚠️ Troubleshooting

#### Lỗi dependencies conflicts
```bash
# Nếu gặp lỗi ERESOLVE
npm install --legacy-peer-deps

# Hoặc xóa cache và cài lại
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

#### Lỗi PlatformConstants
```bash
# Đảm bảo đúng Node.js version
node --version  # Phải là 20.18.0

# Reset Expo cache
npx expo start --clear
```

#### Port đã được sử dụng
```bash
# Sử dụng port khác
npx expo start --port 8084
```

### 🔧 Cấu hình tự động
Project đã được cấu hình với:
- **`.nvmrc`**: Đảm bảo Node.js version đúng
- **`.npmrc`**: Cấu hình npm để tránh peer dependency conflicts
- **`package.json`**: Tất cả dependencies đã được test và hoạt động ổn định

## 📁 Cấu trúc project

```
src/
├── components/          # Components tái sử dụng
├── constants/           # Hằng số và cấu hình
├── context/            # React Context (Auth, etc.)
├── hooks/              # Custom hooks
├── navigation/         # Navigation configuration
├── screens/            # Màn hình ứng dụng
│   ├── auth/          # Đăng nhập, đăng ký
│   └── main/          # Dashboard, Schedule, Wallet, Profile
├── services/           # API services
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## 🛠️ Công nghệ sử dụng

- **React Native** - Framework mobile
- **Expo** - Development platform
- **TypeScript** - Type safety
- **React Navigation** - Navigation system
- **Expo Vector Icons** - Icon library
- **React Context** - State management

## 📱 Screenshots

*Screenshots sẽ được thêm sau*

## 🤝 Đóng góp

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Liên hệ

**Brighway Education**
- Website: [brighway.edu.vn](https://brighway.edu.vn)
- Email: support@brighway.edu.vn

---

Made with ❤️ by Brighway Team