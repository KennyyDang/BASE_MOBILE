/**
 * Suppress expo-notifications warnings/errors in Expo Go
 * This allows the app to use local notifications without seeing console warnings
 */

if (typeof console !== 'undefined') {
  const originalWarn = console.warn;
  const originalError = console.error;

  // List of patterns to suppress
  const suppressPatterns = [
    'expo-notifications',
    'Expo Go',
    'development build',
    'Android Push notifications',
    'remote notifications',
    'SDK 53',
    'functionality is not fully supported',
    'was removed from Expo Go',
  ];

  const shouldSuppress = (message: any): boolean => {
    if (!message) return false;
    
    const messageStr = typeof message === 'string' 
      ? message 
      : String(message);
    
    return suppressPatterns.some(pattern => 
      messageStr.toLowerCase().includes(pattern.toLowerCase())
    );
  };

  // Override console.warn
  console.warn = (...args: any[]) => {
    if (!shouldSuppress(args[0])) {
      originalWarn.apply(console, args);
    }
  };

  // Override console.error for expo-notifications related errors
  console.error = (...args: any[]) => {
    if (!shouldSuppress(args[0])) {
      originalError.apply(console, args);
    }
  };
}

