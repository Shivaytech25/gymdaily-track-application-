
import { Platform } from "react-native";
import Constants from "expo-constants";

function getBaseUrl(): string {
  // If running in Expo (development server / Expo Go), extract the host IP dynamically
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(":")[0];
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:5000/api`;
    }
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000/api";
  }

  return "http://localhost:5000/api";
}

export const API_BASE_URL = getBaseUrl();
