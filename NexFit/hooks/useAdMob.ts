import { useState, useEffect } from "react";
import { admobService, AdMobInitStatus } from "../services/ads/admobService";
import { consentService, ConsentResult } from "../services/ads/consentService";

export function useAdMob() {
  const [status, setStatus] = useState<AdMobInitStatus>(admobService.getStatus());
  const [consent, setConsent] = useState<ConsentResult | null>(consentService.getConsentResult());

  useEffect(() => {
    const unsubAdMob = admobService.addListener((newStatus) => {
      setStatus(newStatus);
    });

    const unsubConsent = consentService.addListener((newConsent) => {
      setConsent(newConsent);
    });

    return () => {
      unsubAdMob();
      unsubConsent();
    };
  }, []);

  return {
    isInitialized: status.isInitialized,
    isInitializing: status.isInitializing,
    canRequestAds: status.canRequestAds,
    error: status.error,
    consentStatus: consent?.status,
    showPrivacyOptions: () => consentService.showPrivacyOptionsForm(),
  };
}
