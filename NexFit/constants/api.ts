import { Platform } from 'react-native';

// Android emulator: use http://10.0.2.2:5000/api
// iOS simulator: use http://localhost:5000/api
// Physical phone: use your computer's local network IP.

const API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:5000/api',
  ios: 'http://localhost:5000/api',
  default: 'http://localhost:5000/api',
});

export default API_BASE_URL;