
import { Platform } from "react-native";

// Android emulator:
const ANDROID_API_URL = "http://10.0.2.2:5000/api";

// iOS simulator:
const IOS_API_URL = "http://localhost:5000/api";

// Physical phone: replace with your computer's LAN IP.
const DEVICE_API_URL = "http://192.168.1.10:5000/api";

export const API_BASE_URL =
  Platform.OS === "android"
    ? ANDROID_API_URL
    : IOS_API_URL;

// If testing on a physical phone, use DEVICE_API_URL instead.
// Your phone and computer must be on the same Wi-Fi network.
