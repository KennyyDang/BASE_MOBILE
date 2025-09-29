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
- Node.js >= 20
- npm hoặc yarn
- Expo CLI
- Expo Go app (cho mobile testing)

### Cài đặt dependencies
```bash
npm install
```

### Chạy ứng dụng
```bash
# Khởi động development server
npm start

# Chạy trên Android
npm run android

# Chạy trên iOS
npm run ios

# Chạy trên Web
npm run web
```

### Sử dụng Expo Go
1. Cài đặt Expo Go từ App Store/Play Store
2. Quét QR code hiển thị trong terminal
3. Ứng dụng sẽ tự động load trên điện thoại

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