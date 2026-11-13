import { router } from "expo-router";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
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

export default function RegisterScreen() {
  const { signIn } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister() {
    setError("");

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: normalizedName,
          email: normalizedEmail,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        setError(result.message || "Unable to create your account.");
        return;
      }

      const data = result.data ?? result;
      const accessToken = data.accessToken ?? data.token;
      const user = data.user;

      if (accessToken && user) {
        signIn(accessToken, user);
        router.replace("/(tabs)");
        return;
      }

      // Some registration APIs create the account without logging the
      // user in. In that case, return to login.
      router.replace("/login");
    } catch {
      setError(
        "Cannot connect to NexFit. Please check your connection and try again.",
      );
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
        <Pressable
          style={styles.backButton}
          onPress={() => router.replace("/login")}
          disabled={loading}
        >
          <ArrowLeft size={20} color={WHITE} />
          <Text style={styles.backText}>Back to login</Text>
        </Pressable>

        <View style={styles.logo}>
          <Activity size={30} color={LIME} strokeWidth={2.5} />
        </View>

        <Text style={styles.brand}>
          NEX<Text style={styles.brandAccent}>FIT</Text>
        </Text>

        <Text style={styles.tagline}>START YOUR FITNESS JOURNEY</Text>

        <View style={styles.headingContainer}>
          <Text style={styles.heading}>Create account.</Text>
          <Text style={styles.subtitle}>
            Build better habits. Get stronger. Track your progress.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>FULL NAME</Text>

          <View style={styles.inputContainer}>
            <User size={19} color={MUTED} />
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#62675F"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              editable={!loading}
              returnKeyType="next"
            />
          </View>

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
              placeholder="Minimum 8 characters"
              placeholderTextColor="#62675F"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!loading}
              returnKeyType="next"
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

          <Text style={styles.label}>CONFIRM PASSWORD</Text>

          <View style={styles.inputContainer}>
            <Lock size={19} color={MUTED} />
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor="#62675F"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!loading}
              onSubmitEditing={handleRegister}
              returnKeyType="go"
            />
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <AlertCircle size={17} color="#FF7777" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.registerButton,
              pressed && !loading ? styles.buttonPressed : null,
              loading ? styles.buttonDisabled : null,
            ]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={BACKGROUND} />
            ) : (
              <Text style={styles.registerButtonText}>CREATE ACCOUNT →</Text>
            )}
          </Pressable>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Pressable
              onPress={() => router.replace("/login")}
              disabled={loading}
            >
              <Text style={styles.loginLink}>Sign In</Text>
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
    paddingTop: 35,
    paddingBottom: 32,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    marginBottom: 28,
  },
  backText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "600",
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
    letterSpacing: 2.5,
    textAlign: "center",
    marginTop: 8,
  },
  headingContainer: {
    marginTop: 35,
    marginBottom: 25,
  },
  heading: {
    color: WHITE,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
  },
  subtitle: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 9,
  },
  form: {
    gap: 12,
  },
  label: {
    color: "#C1C6BC",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 5,
  },
  inputContainer: {
    minHeight: 55,
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
    fontSize: 14,
    paddingVertical: 14,
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
  registerButton: {
    minHeight: 57,
    borderRadius: 15,
    backgroundColor: LIME,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  registerButtonText: {
    color: BACKGROUND,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 12,
  },
  loginText: {
    color: MUTED,
    fontSize: 13,
  },
  loginLink: {
    color: LIME,
    fontSize: 13,
    fontWeight: "800",
  },
  footer: {
    alignItems: "center",
    marginTop: 35,
  },
  footerLine: {
    width: 42,
    height: 3,
    borderRadius: 3,
    backgroundColor: LIME,
    marginBottom: 18,
  },
  footerText: {
    color: "#B5BAAF",
    fontSize: 9,
    letterSpacing: 1.2,
    textAlign: "center",
  },
  version: {
    color: "#62675F",
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 12,
  },
});
