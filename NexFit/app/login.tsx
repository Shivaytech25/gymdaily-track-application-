import { router } from "expo-router";
import {
  Activity,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
} from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import API_BASE_URL from "../constants/api";
import { useAuth } from "../context/AuthContext";

const LIME = "#C6FF4D";
const BACKGROUND = "#0B0D0B";
const SURFACE = "#151815";
const MUTED = "#858B82";
const WHITE = "#F5F7F2";

export default function LoginScreen() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message || "Unable to log in. Please try again.");
        return;
      }

      const { accessToken, user } = result.data ?? {};

      if (!accessToken || !user) {
        setError("Invalid response from server. Please try again.");
        return;
      }

      signIn(accessToken, user);
      router.replace("/(tabs)");
    } catch {
      setError("Cannot connect to NexFit. Check your connection and API URL.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logo}>
          <Activity size={30} color={LIME} strokeWidth={2.5} />
        </View>

        <Text style={styles.brand}>
          NEX<Text style={styles.brandAccent}>FIT</Text>
        </Text>

        <Text style={styles.tagline}>YOUR GOALS. YOUR DISCIPLINE.</Text>

        <View style={styles.headingContainer}>
          <Text style={styles.heading}>Welcome back.</Text>
          <Text style={styles.subtitle}>
            Sign in and get back to becoming your strongest self.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>EMAIL ADDRESS</Text>

          <View style={styles.inputContainer}>
            <Mail size={19} color={MUTED} />

            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#62675F"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              editable={!loading}
              returnKeyType="next"
            />
          </View>

          <Text style={styles.label}>PASSWORD</Text>

          <View style={styles.inputContainer}>
            <Lock size={19} color={MUTED} />

            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#62675F"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              editable={!loading}
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />

            <Pressable
              onPress={() => setShowPassword((current) => !current)}
              hitSlop={10}
              accessibilityLabel={
                showPassword ? "Hide password" : "Show password"
              }
            >
              {showPassword ? (
                <EyeOff size={20} color={MUTED} />
              ) : (
                <Eye size={20} color={MUTED} />
              )}
            </Pressable>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <AlertCircle size={17} color="#FF7777" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              pressed && !loading ? styles.buttonPressed : null,
              loading ? styles.buttonDisabled : null,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={BACKGROUND} />
            ) : (
              <Text style={styles.loginButtonText}>SIGN IN →</Text>
            )}
          </Pressable>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>New to NexFit? </Text>

            <Pressable
              onPress={() => router.push("/register")}
              disabled={loading}
              accessibilityRole="button"
            >
              <Text style={styles.registerLink}>Create Account</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLine} />

          <Text style={styles.footerText}>
            BUILT FOR PROGRESS. DESIGNED FOR YOU.
          </Text>

          <Text style={styles.version}>NEXFIT • FITNESS TRACKING</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingTop: 54,
    paddingBottom: 32,
  },
  logo: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "#1D2813",
    borderWidth: 1,
    borderColor: "#354A20",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 17,
  },
  brand: {
    color: WHITE,
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: 3,
    textAlign: "center",
  },
  brandAccent: {
    color: LIME,
  },
  tagline: {
    color: MUTED,
    fontSize: 10,
    letterSpacing: 3,
    textAlign: "center",
    marginTop: 8,
  },
  headingContainer: {
    marginTop: 55,
    marginBottom: 32,
  },
  heading: {
    color: WHITE,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
  },
  subtitle: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  form: {
    gap: 13,
  },
  label: {
    color: "#C1C6BC",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 8,
  },
  inputContainer: {
    minHeight: 57,
    borderRadius: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: "#292E28",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  input: {
    flex: 1,
    color: WHITE,
    fontSize: 15,
    paddingVertical: 15,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    marginTop: 5,
  },
  errorText: {
    flex: 1,
    color: "#FF7777",
    fontSize: 13,
    lineHeight: 19,
  },
  loginButton: {
    minHeight: 58,
    borderRadius: 15,
    backgroundColor: LIME,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  loginButtonText: {
    color: BACKGROUND,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 12,
  },
  registerText: {
    color: MUTED,
    fontSize: 14,
  },
  registerLink: {
    color: LIME,
    fontSize: 14,
    fontWeight: "800",
  },
  footer: {
    alignItems: "center",
    marginTop: 48,
  },
  footerLine: {
    width: 42,
    height: 3,
    borderRadius: 3,
    backgroundColor: LIME,
    marginBottom: 20,
  },
  footerText: {
    color: "#B5BAAF",
    fontSize: 10,
    letterSpacing: 1.5,
    textAlign: "center",
  },
  version: {
    color: "#62675F",
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 12,
  },
});
