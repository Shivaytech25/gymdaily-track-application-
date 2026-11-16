import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSecureItem, setSecureItem, removeSecureItem } from '../utils/secureStorage';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  fitnessGoal: string;
  experienceLevel: string;
  workoutDaysPerWeek: number;
  dietPreference: string;
  heightCm?: number;
  currentWeightKg?: number;
  targetWeightKg?: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  signIn: (token: string, user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (partialUser: Partial<AuthUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function decodeBase64(str: string): string {
  if (typeof atob === 'function') {
    return atob(str);
  }
  const globalObj = globalThis as unknown as {
    Buffer?: { from: (s: string, encoding: string) => { toString: (encoding: string) => string } };
  };
  if (globalObj.Buffer) {
    return globalObj.Buffer.from(str, 'base64').toString('utf8');
  }
  return '';
}

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeBase64(base64);
    if (!jsonPayload) return false;
    const payload = JSON.parse(jsonPayload);
    if (typeof payload.exp === 'number') {
      return Date.now() >= payload.exp * 1000;
    }
    return false;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Load token and user securely on mount
  useEffect(() => {
    let isMounted = true;

    async function restoreAuthentication() {
      try {
        const storedToken = await getSecureItem('accessToken');
        const storedUser = await AsyncStorage.getItem('authUser');

        if (storedToken && storedUser) {
          if (isTokenExpired(storedToken)) {
            console.warn('Authentication token expired; clearing session.');
            await removeSecureItem('accessToken');
            await AsyncStorage.removeItem('authUser');
            if (isMounted) {
              setAccessToken(null);
              setUser(null);
            }
          } else {
            const parsedUser: AuthUser = JSON.parse(storedUser);
            if (isMounted) {
              setAccessToken(storedToken);
              setUser(parsedUser);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to restore authentication from storage:', error);
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    restoreAuthentication();

    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = useCallback(async (token: string, authenticatedUser: AuthUser) => {
    setAccessToken(token);
    setUser(authenticatedUser);

    try {
      await setSecureItem('accessToken', token);
      await AsyncStorage.setItem('authUser', JSON.stringify(authenticatedUser));
    } catch (error) {
      console.warn('Failed to persist authentication to secure storage:', error);
    }
  }, []);

  const signOut = useCallback(async () => {
    setAccessToken(null);
    setUser(null);

    try {
      await removeSecureItem('accessToken');
      await AsyncStorage.removeItem('authUser');
    } catch (error) {
      console.warn('Failed to clear authentication from storage:', error);
    }
  }, []);

  const updateUser = useCallback(async (partialUser: Partial<AuthUser>) => {
    setUser((prevUser) => {
      if (!prevUser) return null;
      const updated = { ...prevUser, ...partialUser };
      AsyncStorage.setItem('authUser', JSON.stringify(updated)).catch((err) =>
        console.warn('Failed to persist updated user to storage:', err)
      );
      return updated;
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(accessToken && user),
      isInitializing,
      signIn,
      signOut,
      updateUser,
    }),
    [user, accessToken, isInitializing, signIn, signOut, updateUser],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }

  return context;
}
