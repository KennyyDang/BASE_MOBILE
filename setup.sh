#!/bin/bash

# BASE Mobile App - Setup Script
# Tự động setup project cho developer mới

echo "🚀 BASE Mobile App - Setup Script"
echo "================================="

# Kiểm tra Node.js version
echo "📋 Kiểm tra Node.js version..."
NODE_VERSION=$(node --version 2>/dev/null)
REQUIRED_VERSION="v20.18.0"

if [ "$NODE_VERSION" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version không đúng!"
    echo "   Hiện tại: $NODE_VERSION"
    echo "   Yêu cầu:  $REQUIRED_VERSION"
    echo ""
    echo "💡 Giải pháp:"
    echo "   1. Cài đặt nvm: https://github.com/nvm-sh/nvm"
    echo "   2. Chạy: nvm install 20.18.0 && nvm use 20.18.0"
    echo "   3. Hoặc download từ: https://nodejs.org/"
    exit 1
else
    echo "✅ Node.js version đúng: $NODE_VERSION"
fi

# Kiểm tra npm
echo ""
echo "📋 Kiểm tra npm..."
NPM_VERSION=$(npm --version 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ npm version: $NPM_VERSION"
else
    echo "❌ npm không được cài đặt!"
    exit 1
fi

# Kiểm tra Expo CLI
echo ""
echo "📋 Kiểm tra Expo CLI..."
if command -v expo &> /dev/null; then
    EXPO_VERSION=$(expo --version 2>/dev/null)
    echo "✅ Expo CLI: $EXPO_VERSION"
else
    echo "⚠️  Expo CLI chưa được cài đặt"
    echo "💡 Đang cài đặt Expo CLI..."
    npm install -g @expo/cli
    if [ $? -eq 0 ]; then
        echo "✅ Expo CLI đã được cài đặt"
    else
        echo "❌ Không thể cài đặt Expo CLI"
        exit 1
    fi
fi

# Clean install
echo ""
echo "🧹 Đang clean install dependencies..."
rm -rf node_modules package-lock.json
echo "✅ Đã xóa cache cũ"

# Cài đặt dependencies
echo ""
echo "📦 Đang cài đặt dependencies..."
npm install --legacy-peer-deps

if [ $? -eq 0 ]; then
    echo "✅ Dependencies đã được cài đặt thành công"
else
    echo "❌ Lỗi khi cài đặt dependencies"
    exit 1
fi

# Kiểm tra Expo Go
echo ""
echo "📱 Kiểm tra Expo Go..."
echo "💡 Đảm bảo bạn đã cài đặt Expo Go trên điện thoại:"
echo "   - iOS: https://apps.apple.com/app/expo-go/id982107779"
echo "   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent"

# Hoàn thành
echo ""
echo "🎉 Setup hoàn tất!"
echo "=================="
echo ""
echo "🚀 Để chạy ứng dụng:"
echo "   npm start"
echo ""
echo "📱 Để test trên điện thoại:"
echo "   1. Mở Expo Go"
echo "   2. Quét QR code từ terminal"
echo ""
echo "🌐 Để chạy trên web:"
echo "   npm run web"
echo ""
echo "✨ Chúc bạn code vui vẻ!"
