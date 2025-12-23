# 📱 BASE MOBILE - Ứng dụng Quản lý Trung tâm Đào tạo

[![React Native](https://img.shields.io/badge/React%20Native-0.72.6-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-~49.0.15-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9.4-blue.svg)](https://www.typescriptlang.org/)

Ứng dụng di động toàn diện cho việc quản lý trung tâm đào tạo, nhà trẻ với các tính năng quản lý học sinh, đặt lịch, thanh toán, và báo cáo thông minh.

## 🎯 Tổng quan

BASE MOBILE là giải pháp mobile hoàn chỉnh cho các trung tâm đào tạo với:

- **👨‍👩‍👧‍👦 Quản lý học sinh**: Đăng ký, cập nhật thông tin, theo dõi tiến độ
- **📅 Đặt lịch thông minh**: Real-time booking với conflict detection
- **💳 Thanh toán điện tử**: Ví điện tử, thanh toán tự động, hóa đơn điện tử
- **📊 Báo cáo thống kê**: Analytics chi tiết cho quản lý
- **🔄 Chuyển chi nhánh**: Workflow tự động với phê duyệt
- **📱 Push Notifications**: Thông báo real-time cho phụ huynh và nhân viên
- **👥 Multi-role**: Parent, Staff, Manager với quyền hạn riêng biệt

## 🛠️ Tech Stack

### Frontend
- **React Native 0.72.6** - Cross-platform mobile development
- **Expo ~49.0.15** - Development platform & build tools
- **TypeScript 4.9.4** - Type safety & better DX
- **React Navigation** - Navigation & routing

### UI/UX
- **Custom Components** - Consistent design system
- **Material Icons** - Icon library
- **Responsive Design** - Adaptive layouts for all screen sizes
- **Dark/Light Theme** - Theme support (configurable)

### State Management
- **React Hooks** - Local state management
- **Context API** - Global state (Auth, Theme)
- **AsyncStorage** - Persistent storage

### Networking
- **Axios** - HTTP client with interceptors
- **Environment Config** - Dynamic API endpoints
- **Auto Token Refresh** - JWT token management
- **Error Handling** - Comprehensive error boundaries

### Integrations
- **Push Notifications** - Firebase/Expo notifications
- **Image Processing** - Watermark, compression
- **OCR Service** - Document scanning
- **Payment Gateway** - PayOS integration
- **File Upload** - Multipart form data

## 🚀 Cài đặt & Chạy

### Prerequisites
```bash
Node.js >= 20.18.0
npm >= 8.0.0
Expo CLI
```

### Setup
```bash
# Clone repository
git clone <repository-url>
cd BASE_MOBILE

# Install dependencies
npm install

# Start development server
npm start
# or
npx expo start
```

### Environment Configuration
Tạo file `.env` trong root directory:
```env
API_BASE_URL=https://your-api-domain.com/api
NODE_ENV=development
```

## 📱 Tính năng Chi tiết

### 👨‍👩‍👧‍👦 Parent Features

#### 1. Authentication & Profile
- ✅ Đăng nhập/Đăng ký với email/phone
- ✅ Quản lý hồ sơ cá nhân
- ✅ Đổi mật khẩu bảo mật
- ✅ Multi-device login management

#### 2. Student Management
- ✅ Đăng ký học sinh mới
- ✅ Cập nhật thông tin học sinh
- ✅ Upload ảnh hồ sơ
- ✅ Quản lý nhiều học sinh trong gia đình

#### 3. Booking System
- ✅ Xem lịch trống theo thời gian thực
- ✅ Đặt lịch học theo slot
- ✅ Conflict detection tự động
- ✅ Hủy/Đổi lịch với policy

#### 4. Payment & Wallet
- ✅ Nạp tiền vào ví điện tử
- ✅ Thanh toán tự động khi đặt lịch
- ✅ Lịch sử giao dịch chi tiết
- ✅ Xuất hóa đơn điện tử

#### 5. Progress Tracking
- ✅ Xem lịch học đã đặt
- ✅ Check-in/out tự động
- ✅ Xem hoạt động hàng ngày
- ✅ Nhận thông báo từ giáo viên

#### 6. Branch Transfer
- ✅ Yêu cầu chuyển chi nhánh
- ✅ Upload giấy tờ hỗ trợ
- ✅ Theo dõi trạng thái phê duyệt
- ✅ Workflow tự động

### 👨‍🏫 Staff Features

#### 1. Daily Operations
- ✅ Check-in học sinh
- ✅ Ghi nhận hoạt động học tập
- ✅ Upload hình ảnh hoạt động
- ✅ Gửi thông báo cho phụ huynh

#### 2. Schedule Management
- ✅ Xem lịch làm việc
- ✅ Quản lý slot học
- ✅ Xem báo cáo attendance
- ✅ Điều chỉnh lịch khi cần

### 👔 Manager Features

#### 1. Analytics & Reports
- ✅ Báo cáo doanh thu theo tháng/quý
- ✅ Thống kê tỷ lệ tham gia
- ✅ Báo cáo hiệu suất nhân viên
- ✅ Xuất báo cáo Excel/PDF

#### 2. User Management
- ✅ Quản lý tài khoản nhân viên
- ✅ Phân quyền theo role
- ✅ Reset password
- ✅ Activity logs

#### 3. System Configuration
- ✅ Cài đặt chi nhánh
- ✅ Quản lý gói dịch vụ
- ✅ Cấu hình thanh toán
- ✅ Maintenance mode

## 🔧 API Integration

### Authentication
```typescript
// Login
POST /api/Auth/mobile-login
{
  "phoneNumber": "string",
  "password": "string",
  "deviceToken": "string"
}

// Auto refresh token
POST /api/Auth/refresh
{
  "refreshToken": "string"
}
```

### Student Management
```typescript
// Get my children
GET /api/Student/my-children

// Register new child
POST /api/Student/register-child
{
  "name": "string",
  "dateOfBirth": "2023-01-01",
  "gender": "Male/Female",
  "branchId": "uuid"
}
```

### Booking System
```typescript
// Get available slots
GET /api/Slot/available?date=2024-01-01&branchId=uuid

// Create booking
POST /api/Booking/create
{
  "studentId": "uuid",
  "slotId": "uuid",
  "notes": "string"
}
```

### Payment Integration
```typescript
// Create payment
POST /api/Deposit/create
{
  "amount": 100000,
  "description": "Nạp tiền vào ví"
}

// PayOS webhook
POST /api/Deposit/webhook/payos
```

### Branch Transfer
```typescript
// Create transfer request
POST /Student/branch-transfer/request
{
  "studentId": "uuid",
  "targetBranchId": "uuid",
  "changeSchool": true,
  "targetSchoolId": "uuid",
  "documentFile": "multipart/form-data"
}

// Get transfer requests with pagination
GET /Student/branch-transfer/requests?pageIndex=1&pageSize=20

// Cancel request
DELETE /Student/branch-transfer/requests/{id}
```

## 📁 Cấu trúc Project

```
BASE_MOBILE/
├── android/                 # Android native code
├── ios/                     # iOS native code
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── CustomPicker.tsx
│   │   └── WatermarkImageProcessor.tsx
│   ├── constants/           # App constants & configs
│   │   ├── index.ts         # API endpoints, colors, etc.
│   ├── contexts/            # React contexts
│   │   └── AuthContext.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useChildrenApi.ts
│   │   └── useMyChildren.ts
│   ├── navigation/          # Navigation configuration
│   │   └── AppNavigator.tsx
│   ├── screens/             # Screen components
│   │   ├── auth/            # Authentication screens
│   │   ├── main/            # Main app screens (Parent)
│   │   ├── staff/           # Staff screens
│   │   └── manager/         # Manager screens
│   ├── services/            # API services
│   │   ├── auth.service.ts
│   │   ├── childrenService.ts
│   │   ├── branchTransferService.ts
│   │   └── notificationService.ts
│   ├── types/               # TypeScript type definitions
│   │   ├── api.ts
│   │   └── index.ts
│   └── utils/               # Utility functions
│       ├── authHandler.ts
│       └── imageWatermarkHelper.tsx
├── app.config.js           # Expo configuration
├── babel.config.js         # Babel configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies & scripts
└── README.md               # This file
```

## 🔧 Development Scripts

```bash
# Start development server
npm start
# or
npx expo start

# Start with cache reset
npm start --reset-cache

# Run on specific platform
npm run android
npm run ios

# Build for production
npx expo build:android
npx expo build:ios

# Run tests
npm test

# Lint code
npm run lint

# Type check
npx tsc --noEmit
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Metro Bundler Issues
```bash
# Clear Metro cache
npx react-native start --reset-cache

# Clear node_modules cache
rm -rf node_modules/.cache
npm install
```

#### 2. Authentication Problems
- ✅ Kiểm tra API_BASE_URL trong .env
- ✅ Verify JWT token format
- ✅ Check network connectivity
- ✅ Clear AsyncStorage if needed

#### 3. Build Issues
```bash
# Clear Expo cache
npx expo install --fix

# Rebuild native code
npx expo prebuild --clean
```

#### 4. Image Upload Issues
- ✅ Check file size limits (< 10MB)
- ✅ Verify image formats (JPG, PNG)
- ✅ Check network stability
- ✅ Validate multipart form data

### Debug Tips

#### Enable Debug Logging
```typescript
// In development, enable detailed logs
if (__DEV__) {
  console.log('Debug info:', data);
}
```

#### Network Debugging
```bash
# Use Flipper or Charles Proxy to inspect network requests
# Check API responses and error codes
```

## 📊 Performance Optimization

### Code Splitting
- ✅ Lazy loading screens
- ✅ Component code splitting
- ✅ Image optimization with compression

### Caching Strategy
- ✅ API response caching
- ✅ Image caching with react-native-fast-image
- ✅ AsyncStorage for offline data

### Memory Management
- ✅ Proper cleanup in useEffect
- ✅ Image memory optimization
- ✅ List virtualization for large datasets

## 🚀 Deployment

### Build Commands
```bash
# Build APK for Android
npx expo build:android --type apk

# Build AAB for Google Play
npx expo build:android --type app-bundle

# Build IPA for iOS
npx expo build:ios --type archive
```

### Environment Setup
```bash
# Production environment variables
API_BASE_URL=https://api.production-domain.com/api
NODE_ENV=production
SENTRY_DSN=your-sentry-dsn
```

### App Store Deployment
1. **Android**: Upload AAB to Google Play Console
2. **iOS**: Upload IPA to App Store Connect
3. **OTA Updates**: Configure EAS Update for hotfixes

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### E2E Tests (Future)
```bash
# Detox or Maestro for E2E testing
npx detox test
```

## 🤝 Contributing

### Code Standards
- ✅ TypeScript strict mode
- ✅ ESLint configuration
- ✅ Prettier code formatting
- ✅ Conventional commits

### Branch Strategy
```bash
main      # Production releases
develop   # Development branch
feature/* # Feature branches
hotfix/*  # Bug fixes
```

## 📈 Roadmap

### Phase 1 (Current)
- ✅ Core authentication & user management
- ✅ Student registration & management
- ✅ Booking system with real-time availability
- ✅ Payment integration
- ✅ Branch transfer workflow

### Phase 2 (Next)
- 🔄 Advanced analytics dashboard
- 🔄 AI-powered scheduling
- 🔄 Parent-teacher messaging
- 🔄 Mobile check-in with NFC/QR
- 🔄 Offline mode support

### Phase 3 (Future)
- 🔄 Multi-language support
- 🔄 Advanced reporting with ML insights
- 🔄 Integration with learning management systems
- 🔄 Parent mobile app companion
- 🔄 Staff scheduling optimization

## 📞 Support

### Contact Information
- **Email**: support@basemobile.com
- **Phone**: +84 xxx xxx xxx
- **Website**: https://basemobile.com

### Documentation
- [API Documentation](./docs/api.md)
- [User Guide](./docs/user-guide.md)
- [Developer Guide](./docs/developer-guide.md)

## 📄 License

Copyright © 2024 BASE MOBILE. All rights reserved.

---

**Made with ❤️ by the BASE MOBILE Team**

*Transforming early childhood education through technology* 🎓✨