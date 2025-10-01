@echo off
REM BASE Mobile App - Setup Script for Windows
REM Tự động setup project cho developer mới

echo 🚀 BASE Mobile App - Setup Script
echo =================================

REM Kiểm tra Node.js version
echo 📋 Kiểm tra Node.js version...
for /f "tokens=*" %%i in ('node --version 2^>nul') do set NODE_VERSION=%%i
set REQUIRED_VERSION=v20.18.0

if "%NODE_VERSION%" neq "%REQUIRED_VERSION%" (
    echo ❌ Node.js version không đúng!
    echo    Hiện tại: %NODE_VERSION%
    echo    Yêu cầu:  %REQUIRED_VERSION%
    echo.
    echo 💡 Giải pháp:
    echo    1. Download Node.js 20.18.0 từ: https://nodejs.org/
    echo    2. Hoặc sử dụng nvm-windows: https://github.com/coreybutler/nvm-windows
    pause
    exit /b 1
) else (
    echo ✅ Node.js version đúng: %NODE_VERSION%
)

REM Kiểm tra npm
echo.
echo 📋 Kiểm tra npm...
for /f "tokens=*" %%i in ('npm --version 2^>nul') do set NPM_VERSION=%%i
if errorlevel 1 (
    echo ❌ npm không được cài đặt!
    pause
    exit /b 1
) else (
    echo ✅ npm version: %NPM_VERSION%
)

REM Kiểm tra Expo CLI
echo.
echo 📋 Kiểm tra Expo CLI...
expo --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Expo CLI chưa được cài đặt
    echo 💡 Đang cài đặt Expo CLI...
    npm install -g @expo/cli
    if errorlevel 1 (
        echo ❌ Không thể cài đặt Expo CLI
        pause
        exit /b 1
    ) else (
        echo ✅ Expo CLI đã được cài đặt
    )
) else (
    for /f "tokens=*" %%i in ('expo --version 2^>nul') do set EXPO_VERSION=%%i
    echo ✅ Expo CLI: %EXPO_VERSION%
)

REM Clean install
echo.
echo 🧹 Đang clean install dependencies...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
echo ✅ Đã xóa cache cũ

REM Cài đặt dependencies
echo.
echo 📦 Đang cài đặt dependencies...
npm install --legacy-peer-deps
if errorlevel 1 (
    echo ❌ Lỗi khi cài đặt dependencies
    pause
    exit /b 1
) else (
    echo ✅ Dependencies đã được cài đặt thành công
)

REM Kiểm tra Expo Go
echo.
echo 📱 Kiểm tra Expo Go...
echo 💡 Đảm bảo bạn đã cài đặt Expo Go trên điện thoại:
echo    - iOS: https://apps.apple.com/app/expo-go/id982107779
echo    - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

REM Hoàn thành
echo.
echo 🎉 Setup hoàn tất!
echo ==================
echo.
echo 🚀 Để chạy ứng dụng:
echo    npm start
echo.
echo 📱 Để test trên điện thoại:
echo    1. Mở Expo Go
echo    2. Quét QR code từ terminal
echo.
echo 🌐 Để chạy trên web:
echo    npm run web
echo.
echo ✨ Chúc bạn code vui vẻ!
pause
