import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../../constants/theme";
import { API_BASE_URL } from "../../services/apiConfig";
import { useAuth } from "../../context/AuthContext";

const measurements = [
  { label: "Chest", placeholder: "e.g. 98" },
  { label: "Waist", placeholder: "e.g. 82" },
  { label: "Arms", placeholder: "e.g. 35" },
  { label: "Thighs", placeholder: "e.g. 55" },
];

async function parseResponse(response: Response) {
  const text = await response.text();
  let data: any = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Invalid response from server.");
    }
  }

  if (!response.ok) {
    throw new Error(
      data.message || data.error || `API error: ${response.status}`,
    );
  }

  return data;
}

export default function ProgressScreen() {
  const { accessToken } = useAuth();

  const [weight, setWeight] = useState("");
  const [goalWeight, setGoalWeight] = useState("");
  const [savedWeight, setSavedWeight] = useState("");
  const [savedGoal, setSavedGoal] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [activeDates, setActiveDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const headers = useCallback(
    () => ({
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    [accessToken],
  );

  const loadProgress = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setError("Please log in to view your progress.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // LIVE API: GET /body-measurements
      const response = await fetch(`${API_BASE_URL}/body-measurements`, {
        headers: headers(),
      });

      const result = await parseResponse(response);
      const record = result.data ?? result.progress ?? result;

      const current =
        record.currentWeight != null ? String(record.currentWeight) : "";
      const goal = record.goalWeight != null ? String(record.goalWeight) : "";

      setWeight(current);
      setGoalWeight(goal);
      setSavedWeight(current);
      setSavedGoal(goal);

      const body = record.measurements ?? {};

      setValues({
        Chest: String(body.Chest ?? body.chest ?? ""),
        Waist: String(body.Waist ?? body.waist ?? ""),
        Arms: String(body.Arms ?? body.arms ?? ""),
        Thighs: String(body.Thighs ?? body.thighs ?? ""),
      });

      // LIVE API: GET /workout-history
      const historyResponse = await fetch(`${API_BASE_URL}/workout-history`, {
        headers: headers(),
      });

      const historyResult = await parseResponse(historyResponse);
      const history = Array.isArray(historyResult)
        ? historyResult
        : (historyResult.data ?? historyResult.history ?? []);

      const dates = history
        .filter((item: any) => item.completed !== false)
        .map((item: any) => {
          const date = item.completedAt ?? item.date ?? item.createdAt;
          if (!date) return null;

          const parsed = new Date(date);
          return Number.isNaN(parsed.getTime()) ? null : parsed.toDateString();
        })
        .filter(Boolean);

      setActiveDates([...new Set(dates)] as string[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load progress from the server.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, headers]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  async function saveProgress() {
    if (!accessToken) {
      Alert.alert("Login required", "Please log in first.");
      return;
    }

    const current = Number(weight);
    const goal = Number(goalWeight);

    if (!weight.trim() || !Number.isFinite(current) || current <= 0) {
      Alert.alert("Invalid weight", "Enter a valid current weight.");
      return;
    }

    if (goalWeight.trim() && (!Number.isFinite(goal) || goal <= 0)) {
      Alert.alert("Invalid target", "Enter a valid target weight.");
      return;
    }

    const bodyMeasurements: Record<string, number> = {};

    for (const item of measurements) {
      const value = values[item.label]?.trim();

      if (!value) continue;

      const numberValue = Number(value);

      if (!Number.isFinite(numberValue) || numberValue <= 0) {
        Alert.alert(
          "Invalid measurement",
          `Enter a valid ${item.label.toLowerCase()} measurement.`,
        );
        return;
      }

      bodyMeasurements[item.label] = numberValue;
    }

    setSaving(true);
    setError("");

    try {
      // LIVE API: PUT /body-measurements
      const response = await fetch(`${API_BASE_URL}/body-measurements`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({
          currentWeight: current,
          goalWeight: goalWeight.trim() ? goal : null,
          measurements: bodyMeasurements,
        }),
      });

      await parseResponse(response);

      setSavedWeight(String(current));
      setSavedGoal(goalWeight.trim() ? String(goal) : "");

      Alert.alert("Success", "Your progress has been saved.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to save progress.";

      setError(message);
      Alert.alert(
        "Save failed",
        `${message}\n\nCheck that PUT /body-measurements exists in your backend and accepts this request format.`,
      );
    } finally {
      setSaving(false);
    }
  }

  const today = new Date();
  const mondayOffset = (today.getDay() + 6) % 7;

  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - mondayOffset + index);
    return date;
  });

  const weekCount = week.filter((date) =>
    activeDates.includes(date.toDateString()),
  ).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>SMALL STEPS. BIG CHANGES.</Text>
        <Text style={styles.title}>Your progress</Text>
        <Text style={styles.subtitle}>
          Measure what matters. Celebrate consistency.
        </Text>

        {loading && (
          <View style={styles.statusCard}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.helperText}>Loading live progress...</Text>
          </View>
        )}

        {!!error && (
          <View style={styles.statusCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadProgress}>
              <Text style={styles.buttonText}>Retry API</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.heroCard}>
          <Text style={styles.cardLabel}>CURRENT BODY WEIGHT</Text>
          <View style={styles.weightRow}>
            <Text style={styles.weightValue}>{savedWeight || "—"}</Text>
            <Text style={styles.weightUnit}>kg</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.cardLabel}>TARGET WEIGHT</Text>
          <Text style={styles.goalValue}>
            {savedGoal ? `${savedGoal} kg` : "Not set"}
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Weight & goals</Text>
          <Text style={styles.sectionMeta}>KG</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Current weight</Text>
          <View style={styles.inputContainer}>
            <TextInput
              value={weight}
              onChangeText={setWeight}
              placeholder="Enter current weight"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <Text style={styles.inputUnit}>kg</Text>
          </View>

          <Text style={styles.inputLabel}>Target weight</Text>
          <View style={styles.inputContainer}>
            <TextInput
              value={goalWeight}
              onChangeText={setGoalWeight}
              placeholder="Enter target weight"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <Text style={styles.inputUnit}>kg</Text>
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveProgress}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.buttonText}>Save progress</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Body measurements</Text>
          <Text style={styles.sectionMeta}>CM</Text>
        </View>

        <View style={styles.measurementCard}>
          <Text style={styles.measurementIntro}>
            Track changes beyond the scale.
          </Text>

          {measurements.map((item) => (
            <View key={item.label} style={styles.measurementRow}>
              <Text style={styles.measurementLabel}>{item.label}</Text>
              <View style={styles.measurementInputWrap}>
                <TextInput
                  value={values[item.label] ?? ""}
                  onChangeText={(value) =>
                    setValues((old) => ({
                      ...old,
                      [item.label]: value,
                    }))
                  }
                  placeholder={item.placeholder}
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="decimal-pad"
                  style={styles.measurementInput}
                />
                <Text style={styles.inputUnit}>cm</Text>
              </View>
            </View>
          ))}

          <Text style={styles.helperText}>
            Save progress above to submit all measurements.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Weekly consistency</Text>
          <Text style={styles.sectionMeta}>THIS WEEK</Text>
        </View>

        <View style={styles.weekCard}>
          <Text style={styles.weekValue}>{weekCount} / 7</Text>
          <Text style={styles.weekDescription}>active days logged</Text>

          <View style={styles.weekDays}>
            {week.map((date, index) => {
              const active = activeDates.includes(date.toDateString());

              return (
                <View key={date.toDateString()} style={styles.dayItem}>
                  <View
                    style={[styles.dayCircle, active && styles.activeDayCircle]}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        active && styles.activeDayNumber,
                      ]}
                    >
                      {active ? "✓" : "—"}
                    </Text>
                  </View>
                  <Text style={styles.dayLabel}>
                    {["M", "T", "W", "T", "F", "S", "S"][index]}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.helperText}>
            Activity comes from the workout-history API.
          </Text>
        </View>

        <View style={styles.privacyCard}>
          <Text style={styles.privacyTitle}>Your progress, your privacy</Text>
          <Text style={styles.privacyText}>
            Requests use your signed-in account token. Your backend must
            authorize each request for the current user.
          </Text>
        </View>

        <Text style={styles.footer}>NEXFIT · PROGRESS OVER PERFECTION</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: SPACING.lg,
    paddingBottom: 36,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: SPACING.md,
    marginBottom: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.heading,
    fontWeight: "900",
    letterSpacing: -0.7,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: SPACING.xl,
  },
  statusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    alignItems: "center",
    gap: SPACING.sm,
  },
  errorText: {
    color: "#FF8A8A",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  retryButton: {
    minHeight: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },
  heroCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
  cardLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 9,
  },
  weightRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 7,
  },
  weightValue: {
    color: COLORS.text,
    fontSize: 40,
    fontWeight: "900",
  },
  weightUnit: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.lg,
  },
  goalValue: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.subheading,
    fontWeight: "800",
  },
  sectionMeta: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  inputLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 9,
    marginTop: SPACING.sm,
  },
  inputContainer: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    paddingVertical: 12,
  },
  inputUnit: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  saveButton: {
    minHeight: 47,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.md,
  },
  buttonText: {
    color: COLORS.background,
    fontSize: 13,
    fontWeight: "900",
  },
  helperText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    lineHeight: 16,
    marginTop: SPACING.md,
  },
  measurementCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  measurementIntro: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  measurementRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  measurementLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  measurementInputWrap: {
    width: 120,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
  },
  measurementInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 12,
    paddingVertical: 10,
  },
  weekCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  weekValue: {
    color: COLORS.primary,
    fontSize: 25,
    fontWeight: "900",
  },
  weekDescription: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 5,
    marginBottom: SPACING.xl,
  },
  weekDays: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayItem: {
    alignItems: "center",
    gap: 8,
  },
  dayCircle: {
    width: 33,
    height: 33,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  activeDayCircle: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayNumber: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  activeDayNumber: {
    color: COLORS.background,
  },
  dayLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: "700",
  },
  privacyCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  privacyTitle: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  privacyText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 18,
  },
  footer: {
    color: COLORS.textSecondary,
    textAlign: "center",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginTop: SPACING.xxl,
  },
});
