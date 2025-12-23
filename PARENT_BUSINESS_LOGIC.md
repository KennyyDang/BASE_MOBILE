# 📱 NGHIỆP VỤ PARENT FLOW - Ứng dụng Quản lý Trung tâm Đào tạo

## 🎯 Tổng quan

Luồng Parent (Phụ huynh) là luồng chính của ứng dụng, phục vụ cho việc quản lý toàn diện các hoạt động của con em trong trung tâm đào tạo.

---

## 🔐 1. QUẢN LÝ TÀI KHOẢN & XÁC THỰC

### 1.1 Đăng ký tài khoản
**Endpoint:** `POST /api/Auth/register`

**Input:**
```json
{
  "fullName": "Nguyễn Văn A",
  "email": "nguyenvana@email.com",
  "phoneNumber": "0912345678",
  "password": "password123",
  "confirmPassword": "password123"
}
```

**Business Rules:**
- ✅ Email phải unique trong hệ thống
- ✅ Phone number format: 10-11 số, bắt đầu bằng 0
- ✅ Password: tối thiểu 6 ký tự
- ✅ Auto tạo username từ email
- ✅ Gửi email xác nhận (tùy chọn)

**Success Flow:**
1. Tạo tài khoản với status "Pending"
2. Gửi OTP về email/SMS
3. Redirect đến màn hình xác nhận OTP
4. Kích hoạt tài khoản → status "Active"

### 1.2 Đăng nhập
**Endpoint:** `POST /api/Auth/mobile-login`

**Input:**
```json
{
  "phoneNumber": "0912345678",
  "password": "password123",
  "deviceToken": "expo-push-token-xxx",
  "deviceInfo": {
    "platform": "ios/android",
    "version": "1.0.0",
    "model": "iPhone 12"
  }
}
```

**Business Rules:**
- ✅ Tài khoản phải có status "Active"
- ✅ Lưu device token cho push notification
- ✅ Tạo access_token & refresh_token
- ✅ Log login history

**Success Flow:**
1. Validate credentials
2. Generate JWT tokens
3. Store tokens in AsyncStorage
4. Update user last_login
5. Redirect to Dashboard

### 1.3 Quên mật khẩu
**Business Flow:**
1. Nhập email/phone number
2. Gửi OTP về email/SMS
3. Nhập OTP để verify
4. Reset password mới
5. Đăng nhập với password mới

---

## 👶 2. QUẢN LÝ HỌC SINH

### 2.1 Đăng ký học sinh mới
**Endpoint:** `POST /api/Student/register-child`

**Input:**
```json
{
  "parentId": "uuid-parent",
  "fullName": "Nguyễn Văn Bé",
  "dateOfBirth": "2020-01-15",
  "gender": "Male",
  "branchId": "uuid-branch",
  "schoolId": "uuid-school",
  "studentLevelId": "uuid-level",
  "avatar": "base64-image",
  "medicalInfo": {
    "allergies": "Hải sản",
    "medications": "Vitamin D",
    "emergencyContact": "0912345678"
  },
  "pickupPersons": [
    {
      "name": "Nguyễn Thị Mẹ",
      "relationship": "Mother",
      "phoneNumber": "0912345679",
      "avatar": "base64-image"
    }
  ]
}
```

**Business Rules:**
- ✅ Học sinh phải >= 1 tuổi và <= 18 tuổi
- ✅ Branch phải active và có slot trống
- ✅ Auto generate student code: `STU{branch_code}{sequence_number}`
- ✅ Tạo relationship parent-child
- ✅ Upload avatar với watermark
- ✅ Gửi notification cho staff

**Success Flow:**
1. Validate input data
2. Check branch capacity
3. Create student record
4. Generate student code
5. Upload & process avatar
6. Send welcome notification
7. Update parent dashboard

### 2.2 Cập nhật thông tin học sinh
**Endpoint:** `PUT /api/Student/{id}`

**Business Rules:**
- ✅ Chỉ parent của học sinh mới được update
- ✅ Date of birth không được thay đổi sau 30 ngày
- ✅ Branch transfer cần approval workflow
- ✅ Avatar tối đa 5MB, format JPG/PNG
- ✅ Log tất cả changes cho audit

### 2.3 Xem danh sách học sinh
**Endpoint:** `GET /api/Student/my-children`

**Response:**
```json
[
  {
    "id": "uuid",
    "studentCode": "STU001001",
    "fullName": "Nguyễn Văn Bé",
    "dateOfBirth": "2020-01-15",
    "gender": "Male",
    "avatar": "https://cdn.com/avatar.jpg",
    "branchName": "Chi nhánh Quận 1",
    "schoolName": "Mầm non ABC",
    "studentLevelName": "Lớp Lá",
    "status": "Active",
    "totalBookings": 45,
    "totalSpent": 4500000
  }
]
```

---

## 📅 3. HỆ THỐNG ĐẶT LỊCH

### 3.1 Xem lịch trống
**Endpoint:** `GET /api/Slot/available`

**Query Params:**
```
?date=2024-01-15
&branchId=uuid
&schoolId=uuid
&pageSize=50
```

**Business Rules:**
- ✅ Chỉ show slots trong tương lai
- ✅ Filter theo branch/school mà học sinh đang học
- ✅ Exclude slots đã full capacity
- ✅ Show real-time availability

### 3.2 Đặt lịch học
**Endpoint:** `POST /api/Booking/create`

**Input:**
```json
{
  "studentId": "uuid-student",
  "slotId": "uuid-slot",
  "bookingType": "Regular", // Regular, Trial, Makeup
  "notes": "Học thêm toán",
  "specialRequests": "Cần giáo viên nữ",
  "autoPayment": true
}
```

**Business Rules:**
- ✅ Học sinh phải active
- ✅ Slot phải available
- ✅ Không được đặt trùng với slot đã có
- ✅ Check conflict với lịch khác
- ✅ Auto calculate price dựa trên service package

**Success Flow:**
1. Validate slot availability
2. Check student eligibility
3. Calculate total amount
4. Create booking record (status: "Confirmed")
5. If autoPayment: auto charge từ wallet
6. Send confirmation notification
7. Update calendar

### 3.3 Hủy/Đổi lịch
**Endpoint:** `PUT /api/Booking/{id}/cancel`

**Business Rules:**
- ✅ Policy hủy: >24h free, 12-24h: 50% phí, <12h: 100% phí
- ✅ Chỉ được hủy trước giờ học 1 giờ
- ✅ Auto refund về wallet
- ✅ Send notification cho staff
- ✅ Log cancellation reason

---

## 💳 4. HỆ THỐNG THANH TOÁN

### 4.1 Nạp tiền vào ví
**Endpoint:** `POST /api/Deposit/create`

**Input:**
```json
{
  "amount": 500000,
  "paymentMethod": "PayOS", // PayOS, Momo, ZaloPay
  "description": "Nạp tiền học phí tháng 1",
  "redirectUrl": "exp://app/wallet"
}
```

**Business Rules:**
- ✅ Amount tối thiểu: 50,000 VND
- ✅ Amount tối đa: 10,000,000 VND/lần
- ✅ Auto generate transaction code
- ✅ Expire time: 15 phút
- ✅ Webhook để confirm payment

**Payment Flow:**
1. Create deposit request
2. Generate PayOS payment URL
3. Redirect to payment gateway
4. User complete payment
5. PayOS send webhook
6. Update wallet balance
7. Send success notification

### 4.2 Thanh toán tự động
**Business Rules:**
- ✅ Auto charge khi đặt lịch thành công
- ✅ Priority: Wallet → Linked card
- ✅ Insufficient balance → Cancel booking
- ✅ Send payment reminder 24h trước

### 4.3 Lịch sử giao dịch
**Endpoint:** `GET /api/Transaction/history`

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "type": "Deposit", // Deposit, Payment, Refund
      "amount": 500000,
      "balanceBefore": 200000,
      "balanceAfter": 700000,
      "description": "Nạp tiền học phí",
      "createdAt": "2024-01-15T10:00:00Z",
      "paymentMethod": "PayOS"
    }
  ],
  "totalCount": 25,
  "totalIncome": 12500000,
  "totalExpense": 8500000
}
```

---

## 📊 5. THEO DÕI TIẾN ĐỘ

### 5.1 Xem lịch học
**Endpoint:** `GET /api/Booking/my-bookings`

**Query Params:**
```
?pageIndex=1
&pageSize=20
&status=Confirmed
&fromDate=2024-01-01
&toDate=2024-01-31
```

**Business Rules:**
- ✅ Show upcoming bookings first
- ✅ Color code theo status
- ✅ Show check-in/out status
- ✅ Allow filter theo date range

### 5.2 Xem hoạt động hàng ngày
**Endpoint:** `GET /api/Activity/student/{studentId}`

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "activityType": "Learning",
      "title": "Học vẽ tranh",
      "description": "Bé đã hoàn thành bài vẽ hoa đẹp",
      "images": ["url1", "url2"],
      "staffName": "Cô Mai",
      "createdAt": "2024-01-15T14:30:00Z",
      "isViewed": false
    }
  ],
  "totalUnread": 3
}
```

### 5.3 Check-in/Check-out
**Business Rules:**
- ✅ Auto update khi staff check-in
- ✅ Push notification cho parent
- ✅ Late check-in: send alert
- ✅ Emergency contact nếu có vấn đề

---

## 🔄 6. CHUYỂN CHI NHÁNH

### 6.1 Tạo yêu cầu chuyển chi nhánh
**Endpoint:** `POST /Student/branch-transfer/request`

**Input:**
```json
{
  "studentId": "uuid-student",
  "targetBranchId": "uuid-target-branch",
  "changeSchool": true,
  "targetSchoolId": "uuid-target-school",
  "changeLevel": false,
  "targetStudentLevelId": null,
  "documentFile": "multipart-form-data",
  "requestReason": "Chuyển nhà về quận khác"
}
```

**Business Rules:**
- ✅ Target branch khác current branch
- ✅ Check capacity của target branch
- ✅ Nếu change school: required document
- ✅ Upload document với OCR validation
- ✅ Auto calculate transfer fee

**Approval Workflow:**
1. **Pending** → Submit request
2. **Manager Review** → Check documents & capacity
3. **Approved/Rejected** → Send notification
4. **Transfer Complete** → Update student record

### 6.2 Theo dõi trạng thái
**Endpoint:** `GET /Student/branch-transfer/requests`

**Status Flow:**
```
Pending → Manager Review → Approved/Rejected
     ↓              ↓              ↓
  Draft        Reviewing      Completed
```

### 6.3 Hủy yêu cầu
**Endpoint:** `DELETE /Student/branch-transfer/requests/{id}`

**Business Rules:**
- ✅ Chỉ được hủy khi status = "Pending"
- ✅ Refund transfer fee nếu đã thanh toán
- ✅ Send cancellation notification

---

## 📱 7. PUSH NOTIFICATIONS

### 7.1 Đăng ký device token
**Endpoint:** `POST /api/Notification/register-token`

**Input:**
```json
{
  "token": "ExponentPushToken[xxx]",
  "platform": "ios",
  "appVersion": "1.0.0"
}
```

### 7.2 Notification Types
```json
{
  "booking_reminder": "Nhắc nhở lịch học 1h trước",
  "checkin_alert": "Thông báo check-in/out",
  "activity_update": "Cập nhật hoạt động học tập",
  "payment_due": "Nhắc nhở thanh toán",
  "transfer_status": "Cập nhật trạng thái chuyển chi nhánh",
  "emergency_alert": "Cảnh báo khẩn cấp"
}
```

### 7.3 Notification Settings
**Endpoint:** `PUT /api/Notification/preferences`

```json
{
  "emailNotifications": true,
  "pushNotifications": true,
  "smsNotifications": false,
  "notificationTypes": {
    "booking_reminder": true,
    "checkin_alert": true,
    "activity_update": true,
    "payment_due": true,
    "transfer_status": true,
    "emergency_alert": true
  }
}
```

---

## 🏠 8. DASHBOARD & PROFILE

### 8.1 Dashboard Overview
**Data hiển thị:**
- 👶 Số học sinh đang active
- 📅 Lịch học hôm nay/ngày mai
- 💰 Số dư ví hiện tại
- 📊 Tổng chi tiêu tháng này
- 🔔 Số notification chưa đọc
- 🎯 Progress report tổng quan

### 8.2 Hồ sơ cá nhân
**Endpoint:** `PUT /api/User/profile`

**Updatable Fields:**
- Full name, avatar
- Contact information
- Emergency contacts
- Notification preferences
- Language settings

### 8.3 Đổi mật khẩu
**Endpoint:** `PUT /api/Auth/change-password`

**Security Rules:**
- ✅ Required current password
- ✅ New password != old password
- ✅ Force logout all other devices
- ✅ Send security notification

---

## 🚨 9. ERROR HANDLING & EDGE CASES

### 9.1 Network Errors
- ✅ Offline mode: Cache data locally
- ✅ Retry mechanism cho failed requests
- ✅ Graceful degradation

### 9.2 Authentication Errors
- ✅ Auto refresh token khi 401
- ✅ Logout khi refresh fail
- ✅ Clear sensitive data

### 9.3 Business Logic Validation
- ✅ Prevent double booking
- ✅ Age restrictions cho activities
- ✅ Capacity limits
- ✅ Payment validation

### 9.4 Data Consistency
- ✅ Optimistic updates
- ✅ Rollback on failure
- ✅ Sync across devices

---

## 📈 10. ANALYTICS & REPORTING

### 10.1 Parent Dashboard Analytics
- 📊 Monthly spending trends
- 📅 Attendance rate
- 🎯 Learning progress
- 💰 Wallet usage patterns

### 10.2 Export Data
**Endpoint:** `GET /api/Report/parent-export`

**Supported Formats:**
- PDF: Invoice & receipts
- Excel: Detailed transaction history
- CSV: Booking data for tax purposes

---

## 🔐 11. SECURITY & PRIVACY

### 11.1 Data Encryption
- ✅ JWT tokens cho API authentication
- ✅ AES-256 encryption cho sensitive data
- ✅ SSL/TLS cho all communications

### 11.2 Privacy Controls
- ✅ GDPR compliance
- ✅ Data retention policies
- ✅ Right to be forgotten
- ✅ Consent management

### 11.3 Access Controls
- ✅ Role-based permissions
- ✅ API rate limiting
- ✅ IP whitelisting (optional)
- ✅ Session management

---

## 🎯 12. BUSINESS RULES SUMMARY

### Core Principles
1. **Parent-Centric**: Tất cả tính năng phục vụ parent
2. **Child Safety**: Ưu tiên bảo vệ và phát triển trẻ
3. **Transparency**: Minh bạch trong pricing & activities
4. **Convenience**: Đơn giản hóa quy trình phức tạp
5. **Real-time**: Updates tức thời cho tất cả actions

### Key Metrics
- 📱 **User Engagement**: Daily active users
- 💰 **Revenue**: Monthly recurring revenue
- ⭐ **Satisfaction**: Parent feedback scores
- 📈 **Retention**: User retention rates
- ⚡ **Performance**: App response times

---

**Document Version:** 1.0
**Last Updated:** January 2024
**Business Analyst:** BASE MOBILE Team

*This document defines the complete business logic for Parent user journey in BASE MOBILE application.*
