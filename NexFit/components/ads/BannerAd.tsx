import React, { useState, useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import {
  BannerAd as RNGBannerAd,
  BannerAdSize,
} from "react-native-google-mobile-ads";
import { ADMOB_CONFIG, getBannerAdUnitId } from "../../config/admob";
import { admobService } from "../../services/ads/admobService";
import { AdLoadingPlaceholder } from "./AdLoadingPlaceholder";

interface BannerAdProps {
  /** Optional custom styling for the container */
  style?: any;
  /** Sizing format (defaults to ANCHORED_ADAPTIVE_BANNER) */
  size?: BannerAdSize;
}

export const BannerAd: React.FC<BannerAdProps> = ({
  style,
  size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER,
}) => {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(admobService.isReadyForAds());

  useEffect(() => {
    // If not ready yet, listen for AdMob init completion
    const unsubscribe = admobService.addListener((status) => {
      if (status.isInitialized && status.canRequestAds) {
        setIsReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // Check 1: Feature flag
  if (!ADMOB_CONFIG.flags.bannerEnabled) {
    return null;
  }

  // Check 2: Platform check (Android only per requirement)
  if (Platform.OS !== "android") {
    return null;
  }

  // Check 3: If an error or no-fill occurred, hide container completely
  if (hasError) {
    return null;
  }

  // Check 4: If AdMob is not initialized / consent not permitted yet, don't show broken ad
  if (!isReady) {
    return null;
  }

  const adUnitId = getBannerAdUnitId();

  return (
    <View style={[styles.wrapper, style]}>
      {/* Show subtle placeholder until the banner finishes loading */}
      {!isLoaded && <AdLoadingPlaceholder height={50} />}

      <View style={[styles.adContainer, !isLoaded && styles.hidden]}>
        <RNGBannerAd
          unitId={adUnitId}
          size={size}
          requestOptions={{
            requestNonPersonalizedAdsOnly: false,
          }}
          onAdLoaded={() => {
            setIsLoaded(true);
            setHasError(false);
          }}
          onAdFailedToLoad={(error) => {
            // On no-fill or network failure, hide gracefully without throwing
            console.log(
              "[BannerAd] Failed to load banner ad (hiding gracefully):",
              error?.message || error
            );
            setHasError(true);
            setIsLoaded(false);
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
    minHeight: 50,
  },
  adContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  hidden: {
    display: "none",
    position: "absolute",
    opacity: 0,
  },
});
