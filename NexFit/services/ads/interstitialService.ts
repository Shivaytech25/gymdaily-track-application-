import { Platform } from "react-native";
import {
  InterstitialAd,
  AdEventType,
} from "react-native-google-mobile-ads";
import {
  ADMOB_CONFIG,
  getInterstitialAdUnitId,
} from "../../config/admob";
import { admobService } from "./admobService";

export interface ShowInterstitialOptions {
  /** Natural transition name for logging and auditing (e.g. 'nav_dashboard_to_history') */
  transitionName?: string;
  /** Callback invoked when the ad is closed or skipped so navigation continues */
  onCompleted?: () => void;
}

class InterstitialService {
  private interstitial: InterstitialAd | null = null;
  private isLoaded: boolean = false;
  private isLoading: boolean = false;
  private lastShownTime: number = 0;
  private isShowing: boolean = false;
  private unsubscribeLoaded: (() => void) | null = null;
  private unsubscribeClosed: (() => void) | null = null;
  private unsubscribeError: (() => void) | null = null;

  /**
   * Preload an interstitial ad in the background.
   * If interstitials are disabled by feature flag or not permitted by consent, does nothing.
   */
  public preload(): void {
    if (Platform.OS !== "android") return;
    if (!ADMOB_CONFIG.flags.interstitialEnabled) return;
    if (!admobService.isReadyForAds()) return;
    if (this.isLoaded || this.isLoading) return;

    try {
      this.isLoading = true;
      const adUnitId = getInterstitialAdUnitId();
      this.interstitial = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: false,
      });

      this.cleanupListeners();

      this.unsubscribeLoaded = this.interstitial.addAdEventListener(
        AdEventType.LOADED,
        () => {
          this.isLoaded = true;
          this.isLoading = false;
          console.log("[InterstitialService] Interstitial ad preloaded successfully.");
        }
      );

      this.unsubscribeClosed = this.interstitial.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          this.isLoaded = false;
          this.isShowing = false;
          this.lastShownTime = Date.now();
          console.log("[InterstitialService] Interstitial closed. Preloading next ad...");
          // Preload the next ad for future natural transitions
          setTimeout(() => this.preload(), 1000);
        }
      );

      this.unsubscribeError = this.interstitial.addAdEventListener(
        AdEventType.ERROR,
        (error) => {
          this.isLoaded = false;
          this.isLoading = false;
          console.warn("[InterstitialService] Interstitial load error (ignored safely):", error);
        }
      );

      this.interstitial.load();
    } catch (err) {
      this.isLoading = false;
      this.isLoaded = false;
      console.warn("[InterstitialService] Preload exception:", err);
    }
  }

  /**
   * Safely attempt to show an interstitial at a natural navigation transition.
   *
   * STRICT SAFETY RULES:
   * 1. Disabled if feature flag is false (default is false).
   * 2. Returns immediately if not preloaded (never forces user to wait).
   * 3. Respects frequency cap / cooldown period between ads.
   * 4. Guarantees onCompleted is called so navigation continues without interruption.
   */
  public async showAtNaturalTransition(
    options: ShowInterstitialOptions = {}
  ): Promise<boolean> {
    const { onCompleted } = options;

    const continueNormally = () => {
      if (onCompleted) {
        try {
          onCompleted();
        } catch (e) {
          console.warn("[InterstitialService] onCompleted error:", e);
        }
      }
    };

    // Rule 1: Check feature flag
    if (!ADMOB_CONFIG.flags.interstitialEnabled) {
      continueNormally();
      return false;
    }

    // Rule 2: Platform check
    if (Platform.OS !== "android") {
      continueNormally();
      return false;
    }

    // Rule 3: Check frequency cap (cooldown)
    const now = Date.now();
    const elapsedSinceLastAd = now - this.lastShownTime;
    if (elapsedSinceLastAd < ADMOB_CONFIG.policy.interstitialCooldownMs) {
      console.log(`[InterstitialService] Cooldown active (${Math.round((ADMOB_CONFIG.policy.interstitialCooldownMs - elapsedSinceLastAd) / 1000)}s remaining). Skipping.`);
      continueNormally();
      return false;
    }

    // Rule 4: Never show multiple ads simultaneously
    if (this.isShowing) {
      continueNormally();
      return false;
    }

    // Rule 5: Show ONLY if preloaded and ready (no waiting for user)
    if (!this.isLoaded || !this.interstitial) {
      console.log("[InterstitialService] No preloaded interstitial available. Continuing transition without ad.");
      continueNormally();
      // Try preloading for future transitions
      this.preload();
      return false;
    }

    try {
      this.isShowing = true;
      this.isLoaded = false; // Consume current ad

      // Once shown and closed, invoke onCompleted
      const closeSub = this.interstitial.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          closeSub();
          continueNormally();
        }
      );

      await this.interstitial.show();
      return true;
    } catch (showError) {
      console.warn("[InterstitialService] Error showing interstitial. Continuing normally:", showError);
      this.isShowing = false;
      continueNormally();
      return false;
    }
  }

  private cleanupListeners(): void {
    if (this.unsubscribeLoaded) {
      this.unsubscribeLoaded();
      this.unsubscribeLoaded = null;
    }
    if (this.unsubscribeClosed) {
      this.unsubscribeClosed();
      this.unsubscribeClosed = null;
    }
    if (this.unsubscribeError) {
      this.unsubscribeError();
      this.unsubscribeError = null;
    }
  }
}

export const interstitialService = new InterstitialService();
