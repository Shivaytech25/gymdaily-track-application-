import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

let isSecureStoreAvailable: boolean | null = null;

async function checkSecureStore(): Promise<boolean> {
  if (isSecureStoreAvailable !== null) {
    return isSecureStoreAvailable;
  }
  try {
    isSecureStoreAvailable = await SecureStore.isAvailableAsync();
  } catch {
    isSecureStoreAvailable = false;
  }
  return isSecureStoreAvailable;
}

/**
 * Saves a sensitive key-value pair into hardware-backed SecureStore when available,
 * falling back to AsyncStorage on platforms without SecureStore support (e.g. web).
 */
export async function setSecureItem(key: string, value: string): Promise<void> {
  const available = await checkSecureStore();
  if (available) {
    await SecureStore.setItemAsync(key, value);
    // Ensure no stale plain-text copy exists in AsyncStorage
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignore cleanup error
    }
  } else {
    await AsyncStorage.setItem(key, value);
  }
}

/**
 * Retrieves a sensitive value from SecureStore, with transparent fallback
 * and one-time migration from plain-text AsyncStorage if an existing session is found.
 */
export async function getSecureItem(key: string): Promise<string | null> {
  const available = await checkSecureStore();
  if (available) {
    try {
      const secureValue = await SecureStore.getItemAsync(key);
      if (secureValue) {
        return secureValue;
      }
    } catch (e) {
      console.warn('SecureStore retrieval error:', e);
    }

    // Migration path: Check if legacy unencrypted session exists in AsyncStorage
    try {
      const legacyValue = await AsyncStorage.getItem(key);
      if (legacyValue) {
        // Migrate to SecureStore and purge unencrypted copy
        await SecureStore.setItemAsync(key, legacyValue);
        await AsyncStorage.removeItem(key);
        return legacyValue;
      }
    } catch {
      // Ignore legacy read error
    }

    return null;
  }

  // Fallback for non-supported platforms (e.g. web)
  return AsyncStorage.getItem(key);
}

/**
 * Removes a sensitive key from both SecureStore and AsyncStorage.
 */
export async function removeSecureItem(key: string): Promise<void> {
  const available = await checkSecureStore();
  if (available) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn('SecureStore deletion error:', e);
    }
  }
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Ignore AsyncStorage removal error
  }
}
