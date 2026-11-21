import { Platform } from "react-native";
import {
  AdsConsent,
  AdsConsentStatus,
  AdsConsentInfo,
  AdsConsentDebugGeography,
} from "react-native-google-mobile-ads";

export interface ConsentResult {
  canRequestAds: boolean;
  status: AdsConsentStatus | "UNKNOWN" | "NOT_APPLICABLE";
  error?: string;
}

class ConsentService {
  private isGathering: boolean = false;
  private consentResult: ConsentResult | null = null;
  private listeners: Set<(result: ConsentResult) => void> = new Set();

  /**
   * Subscribe to consent state updates
   */
  public addListener(listener: (result: ConsentResult) => void): () => void {
    this.listeners.add(listener);
    if (this.consentResult) {
      listener(this.consentResult);
    }
    return () => this.listeners.delete(listener);
  }

  private notify(result: ConsentResult): void {
    this.consentResult = result;
    this.listeners.forEach((listener) => {
      try {
        listener(result);
      } catch (err) {
        console.warn("[ConsentService] Listener error:", err);
      }
    });
  }

  /**
   * Request updated consent information and present the consent form if required
   */
  public async gatherConsent(): Promise<ConsentResult> {
    if (Platform.OS !== "android") {
      const nonAndroidResult: ConsentResult = {
        canRequestAds: true,
        status: "NOT_APPLICABLE",
      };
      this.notify(nonAndroidResult);
      return nonAndroidResult;
    }

    if (this.isGathering) {
      // If already running, return cached or wait
      if (this.consentResult) return this.consentResult;
    }

    this.isGathering = true;

    try {
      // In dev mode, we can optionally provide debug settings if needed
      const consentInfo = await AdsConsent.gatherConsent({
        debugGeography: __DEV__
          ? AdsConsentDebugGeography.DISABLED
          : undefined,
      });

      const result: ConsentResult = {
        canRequestAds: consentInfo.canRequestAds ?? true,
        status: consentInfo.status,
      };

      this.notify(result);
      return result;
    } catch (error: any) {
      console.warn("[ConsentService] Consent gathering encountered error (handled safely):", error?.message || error);

      // In offline conditions or when UMP fails, inspect existing cached consent or fallback safely
      try {
        const cachedInfo = await AdsConsent.getConsentInfo();
        const fallbackResult: ConsentResult = {
          canRequestAds: cachedInfo.canRequestAds ?? true,
          status: cachedInfo.status,
          error: error?.message,
        };
        this.notify(fallbackResult);
        return fallbackResult;
      } catch {
        const safeDefaultResult: ConsentResult = {
          canRequestAds: true, // Default to true in offline mode to allow cached/test ads without breaking app
          status: "UNKNOWN",
          error: error?.message,
        };
        this.notify(safeDefaultResult);
        return safeDefaultResult;
      }
    } finally {
      this.isGathering = false;
    }
  }

  /**
   * Present Privacy Options form (for GDPR/user consent modification in Settings/Profile if required)
   */
  public async showPrivacyOptionsForm(): Promise<ConsentResult> {
    if (Platform.OS !== "android") {
      return { canRequestAds: true, status: "NOT_APPLICABLE" };
    }

    try {
      const consentInfo = await AdsConsent.showPrivacyOptionsForm();
      const result: ConsentResult = {
        canRequestAds: consentInfo.canRequestAds ?? true,
        status: consentInfo.status,
      };
      this.notify(result);
      return result;
    } catch (error: any) {
      console.warn("[ConsentService] Failed to show privacy options form:", error?.message || error);
      return {
        canRequestAds: this.consentResult?.canRequestAds ?? true,
        status: this.consentResult?.status ?? "UNKNOWN",
        error: error?.message,
      };
    }
  }

  /**
   * Check if ads are permitted to be requested based on consent
   */
  public canRequestAds(): boolean {
    if (Platform.OS !== "android") return true;
    if (!this.consentResult) return true; // Default to true until consent explicitly denies
    return this.consentResult.canRequestAds;
  }

  /**
   * Current cached consent state
   */
  public getConsentResult(): ConsentResult | null {
    return this.consentResult;
  }
}

export const consentService = new ConsentService();
