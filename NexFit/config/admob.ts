import { Platform } from "react-native";
import { TestIds } from "react-native-google-mobile-ads";

/**
 * Google AdMob Centralized Configuration
 *
 * NOTE:
 * - In development mode (__DEV__ === true), Google Test IDs are ALWAYS used.
 * - In production, custom AdMob ad unit IDs can be supplied via environment variables
 *   (e.g., EXPO_PUBLIC_ADMOB_BANNER_ID, EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID).
 *   If not supplied, it safely defaults to Google Test IDs to prevent app crashes or invalid requests.
 */

// Official Google AdMob Test Identifiers
export const GOOGLE_TEST_IDS = {
  androidAppId: "ca-app-pub-3940256099942544~3347511713",
  bannerAdUnitId: "ca-app-pub-3940256099942544/9214589741", // TestIds.BANNER
  interstitialAdUnitId: "ca-app-pub-3940256099942544/1033173712", // TestIds.INTERSTITIAL
};

export interface AdMobConfig {
  isDev: boolean;
  androidAppId: string;
  bannerAdUnitId: string;
  interstitialAdUnitId: string;
  flags: {
    interstitialEnabled: boolean;
    bannerEnabled: boolean;
  };
  policy: {
    interstitialCooldownMs: number; // Minimum time between consecutive interstitials (frequency cap)
  };
}

const isDev = __DEV__;

// Production Ad Unit IDs loaded from environment variables (fallback to test IDs if empty)
const PROD_BANNER_ID =
  process.env.EXPO_PUBLIC_ADMOB_BANNER_ID || GOOGLE_TEST_IDS.bannerAdUnitId;
const PROD_INTERSTITIAL_ID =
  process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID ||
  GOOGLE_TEST_IDS.interstitialAdUnitId;

export const ADMOB_CONFIG: AdMobConfig = {
  isDev,
  // Always use official Google test identifiers in dev mode
  androidAppId: GOOGLE_TEST_IDS.androidAppId,
  bannerAdUnitId: isDev ? TestIds.BANNER : PROD_BANNER_ID,
  interstitialAdUnitId: isDev ? TestIds.INTERSTITIAL : PROD_INTERSTITIAL_ID,
  flags: {
    // Phase 4: Banners are active on Dashboard, Nutrition, and History
    bannerEnabled: true,
    // Phase 5: Interstitials are initially disabled by feature flag as required
    interstitialEnabled: false,
  },
  policy: {
    // 60-second cooldown between interstitial impressions
    interstitialCooldownMs: 60 * 1000,
  },
};

/**
 * Helper to get the active banner ad unit ID
 */
export function getBannerAdUnitId(): string {
  if (Platform.OS !== "android") {
    return isDev ? TestIds.BANNER : PROD_BANNER_ID;
  }
  return ADMOB_CONFIG.bannerAdUnitId;
}

/**
 * Helper to get the active interstitial ad unit ID
 */
export function getInterstitialAdUnitId(): string {
  if (Platform.OS !== "android") {
    return isDev ? TestIds.INTERSTITIAL : PROD_INTERSTITIAL_ID;
  }
  return ADMOB_CONFIG.interstitialAdUnitId;
}
