
import { Platform } from "react-native";

const ANDROID_API_URL = "http://10.0.2.2:5000/api";
const IOS_API_URL = "http://localhost:5000/api";
const WEB_API_URL = "http://localhost:5000/api";
const DEVICE_API_URL = "http://192.168.1.10:5000/api";

export const API_BASE_URL =
  Platform.OS === "android"
    ? ANDROID_API_URL
    : Platform.OS === "ios"
      ? IOS_API_URL
      : Platform.OS === "web"
        ? WEB_API_URL
        : DEVICE_API_URL;
