/**
 * Central API exports
 * Import all services and export them for easy access
 */

export { default as authService } from '../services/auth.service';

// Export axios instance for custom requests
export { default as axiosInstance } from '../config/axios.config';

// Export storage keys
export { STORAGE_KEYS } from '../config/axios.config';

// Export types
export * from '../types/api';

// You can add more services here as you create them
// export { default as userService } from '../services/user.service';
// export { default as walletService } from '../services/wallet.service';
// export { default as scheduleService } from '../services/schedule.service';

