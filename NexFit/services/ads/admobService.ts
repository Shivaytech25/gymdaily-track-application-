import { Platform } from "react-native";
import mobileAds, {
  MaxAdContentRating,
} from "react-native-google-mobile-ads";
import { consentService } from "./consentService";

export interface AdMobInitStatus {
  isInitialized: boolean;
  isInitializing: boolean;
  canRequestAds: boolean;
  error?: string;
}

class AdMobService {
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private initPromise: Promise<boolean> | null = null;
  private initError: string | null = null;
  private listeners: Set<(status: AdMobInitStatus) => void> = new Set();

  public getStatus(): AdMobInitStatus {
    return {
      isInitialized: this.isInitialized,
      isInitializing: this.isInitializing,
      canRequestAds: consentService.canRequestAds(),
      error: this.initError ?? undefined,
    };
  }

  public addListener(listener: (status: AdMobInitStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const status = this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        console.warn("[AdMobService] Status listener error:", err);
      }
    });
  }

  /**
   * Initializes Google AdMob and gathers UMP consent.
   * Safe to call multiple times - runs exactly once and caches result.
   * Non-blocking for the UI.
   */
  public async initialize(): Promise<boolean> {
    // If already initialized, return immediately
    if (this.isInitialized) {
      return true;
    }

    // If an initialization is already in progress, reuse the existing promise
    if (this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.notify();

    this.initPromise = (async () => {
      try {
        // Step 1: Request UMP Consent update (User Messaging Platform)
        console.log("[AdMobService] Gathering UMP consent...");
        const consent = await consentService.gatherConsent();
        console.log("[AdMobService] Consent result:", consent);

        // Step 2: Configure general ad request settings
        try {
          await mobileAds().setRequestConfiguration({
            maxAdContentRating: MaxAdContentRating.G,
            tagForChildDirectedTreatment: false,
            tagForUnderAgeOfConsent: false,
          });
        } catch (configError) {
          console.warn("[AdMobService] setRequestConfiguration warning:", configError);
        }

        // Step 3: Initialize Google Mobile Ads SDK if consent permits ad requests
        if (consent.canRequestAds) {
          console.log("[AdMobService] Initializing Google Mobile Ads SDK...");
          const adapterStatuses = await mobileAds().initialize();
          console.log("[AdMobService] SDK initialized successfully. Adapters:", Object.keys(adapterStatuses || {}));
        } else {
          console.log("[AdMobService] Consent does not allow requesting ads at this time.");
        }

        this.isInitialized = true;
        this.initError = null;
        return true;
      } catch (error: any) {
        // In offline conditions or unexpected native errors, log and fail gracefully without crashing
        const errorMessage = error?.message || "Failed to initialize AdMob";
        console.warn("[AdMobService] Initialization warning (handled safely):", errorMessage);
        this.initError = errorMessage;
        // Even if an error occurred (e.g. offline), mark as initialized so we don't spam retries
        this.isInitialized = true;
        return false;
      } finally {
        this.isInitializing = false;
        this.notify();
      }
    })();

    return this.initPromise;
  }

  /**
   * Check if AdMob is ready and permitted to serve ads
   */
  public isReadyForAds(): boolean {
    return this.isInitialized && consentService.canRequestAds();
  }
}

export const admobService = new AdMobService();
