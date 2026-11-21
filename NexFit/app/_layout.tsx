import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../context/AuthContext";
import { admobService } from "../services/ads/admobService";

export default function RootLayout() {
  useEffect(() => {
    // Non-blocking Google AdMob & UMP consent initialization on app startup
    admobService.initialize().catch((err) => {
      console.warn("[RootLayout] AdMob initialization error:", err);
    });
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  );
}
