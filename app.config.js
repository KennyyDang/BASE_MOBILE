const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
function loadEnvFile() {
  const envPath = path.resolve(__dirname, '.env');
  const env = {};
  
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    const lines = envFile.split('\n');
    
    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key) {
          const value = valueParts.join('=').trim();
          // Remove quotes if present
          const cleanValue = value.replace(/^["']|["']$/g, '');
          env[key.trim()] = cleanValue;
        }
      }
    });
  }
  
  return env;
}

const env = loadEnvFile();

module.exports = {
  expo: {
    name: "BASE Mobile",
    slug: "base-mobile",
    owner: "kennydangg",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    scheme: "baseapp",
    splash: {
      resizeMode: "contain",
      backgroundColor: "#5cbdb9"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    plugins: [
      [
        "expo-notifications",
        {
          color: "#5cbdb9"
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Ứng dụng cần quyền truy cập vị trí để thêm thông tin xác thực vào ảnh chụp.",
          locationWhenInUsePermission: "Ứng dụng cần quyền truy cập vị trí để thêm thông tin xác thực vào ảnh chụp."
        }
      ]
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.base.mobile",
      infoPlist: {
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              "baseapp"
            ]
          }
        ],
        NSLocationWhenInUseUsageDescription: "Ứng dụng cần quyền truy cập vị trí để thêm thông tin xác thực vào ảnh chụp.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "Ứng dụng cần quyền truy cập vị trí để thêm thông tin xác thực vào ảnh chụp."
      }
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#5cbdb9"
      },
      package: "com.brightway.base",
      googleServicesFile: "./google-services.json",
      permissions: [
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ],
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "baseapp"
            }
          ],
          category: [
            "BROWSABLE",
            "DEFAULT"
          ]
        }
      ]
    },
    notification: {
      color: "#5cbdb9",
      androidMode: "default",
      androidCollapsedTitle: "#{unread_notifications} thong bao moi"
    },
    extra: {
      eas: {
        projectId: "6235e5e0-da08-4aaf-935e-1dcb8596059a"
      },
      // Inject environment variables into app config
      // These will be available via Constants.expoConfig.extra
      apiBaseUrl: env.API_BASE_URL || "http://192.168.2.7:5160",
      nodeEnv: env.NODE_ENV || "production",
      googleVisionApiKey: env.GOOGLE_VISION_API_KEY || ""
    }
  }
};

