import React, { useCallback, useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";

import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../services/apiConfig";

type DashboardData = {
  caloriesConsumed: number;
  calorieGoal: number;
  proteinConsumed: number;
  proteinGoal: number;
  carbsConsumed: number;
  carbsGoal: number;
  fatsConsumed: number;
  fatsGoal: number;
  waterLitres: number;
  waterGoalLitres: number;
  bodyWeight: number | null;
  streakDays: number;
  completedExercises: number;
  totalExercises: number;
  activeDays: number[];
};

const DEFAULT_DASHBOARD: DashboardData = {
  caloriesConsumed: 0,
  calorieGoal: 2000,
  proteinConsumed: 0,
  proteinGoal: 150,
  carbsConsumed: 0,
  carbsGoal: 220,
  fatsConsumed: 0,
  fatsGoal: 65,
  waterLitres: 0,
  waterGoalLitres: 2.5,
  bodyWeight: null,
  streakDays: 0,
  completedExercises: 0,
  totalExercises: 6,
  activeDays: [],
};

function readNumber(
  source: Record<string, any>,
  keys: string[],
  fallback: number,
): number {
  for (const key of keys) {
    const value = source?.[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (
      typeof value === "string" &&
      value.trim() !== "" &&
      Number.isFinite(Number(value))
    ) {
      return Number(value);
    }
  }

  return fallback;
}

function ProgressBar({
  progress,
  color = COLORS.primary,
}: {
  progress: number;
  color?: string;
}) {
  const safeProgress = Math.min(100, Math.max(0, progress));

  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          {
            width: `${safeProgress}%`,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

export default function HomeScreen() {
  const { user, accessToken } = useAuth();

  const [isWorkoutRunning, setIsWorkoutRunning] = useState(false);
  const [workoutSeconds, setWorkoutSeconds] = useState(0);
  const [completedExercises, setCompletedExercises] = useState(0);

  const [dashboard, setDashboard] = useState<DashboardData>(DEFAULT_DASHBOARD);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState("");

  const loadDashboard = useCallback(async () => {
    if (!accessToken) {
      setDashboard(DEFAULT_DASHBOARD);
      return;
    }

    setIsLoadingDashboard(true);
    setDashboardError("");

    try {
      const response = await fetch(`${API_BASE_URL}/dashboard`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Dashboard request failed (${response.status})`);
      }

      const result = await response.json();

      const payload =
        result?.data ?? result?.dashboard ?? result?.result ?? result;

      if (!payload || typeof payload !== "object") {
        throw new Error("Invalid dashboard response.");
      }

      const weight = readNumber(
        payload,
        ["bodyWeight", "weight", "latestWeight"],
        -1,
      );

      setDashboard({
        caloriesConsumed: readNumber(
          payload,
          ["caloriesConsumed", "consumedCalories", "calories"],
          0,
        ),
        calorieGoal: readNumber(
          payload,
          ["calorieGoal", "dailyCalorieGoal", "targetCalories"],
          2000,
        ),
        proteinConsumed: readNumber(payload, ["proteinConsumed", "protein"], 0),
        proteinGoal: readNumber(payload, ["proteinGoal", "targetProtein"], 150),
        carbsConsumed: readNumber(
          payload,
          ["carbsConsumed", "carbs", "carbohydrates"],
          0,
        ),
        carbsGoal: readNumber(
          payload,
          ["carbsGoal", "targetCarbs", "targetCarbohydrates"],
          220,
        ),
        fatsConsumed: readNumber(payload, ["fatsConsumed", "fats", "fat"], 0),
        fatsGoal: readNumber(
          payload,
          ["fatsGoal", "targetFats", "targetFat"],
          65,
        ),
        waterLitres: readNumber(
          payload,
          ["waterLitres", "waterIntakeLitres", "waterIntake"],
          0,
        ),
        waterGoalLitres: readNumber(
          payload,
          ["waterGoalLitres", "waterGoal", "targetWater"],
          2.5,
        ),
        bodyWeight: weight >= 0 ? weight : null,
        streakDays: readNumber(payload, ["streakDays", "streak"], 0),
        completedExercises: readNumber(
          payload,
          ["completedExercises", "exercisesCompleted"],
          0,
        ),
        totalExercises: Math.max(
          1,
          readNumber(payload, ["totalExercises", "exerciseCount"], 6),
        ),
        activeDays: Array.isArray(payload.activeDays) ? payload.activeDays : [],
      });
    } catch (error) {
      setDashboardError(
        error instanceof Error
          ? error.message
          : "Could not load dashboard data.",
      );
    } finally {
      setIsLoadingDashboard(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!isWorkoutRunning) return;

    const interval = setInterval(() => {
      setWorkoutSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isWorkoutRunning]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return [hours, minutes, seconds]
        .map((value) => String(value).padStart(2, "0"))
        .join(":");
    }

    return [minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  };

  const handleReset = () => {
    setIsWorkoutRunning(false);
    setWorkoutSeconds(0);
    setCompletedExercises(0);
  };

  const totalExercises = Math.max(1, dashboard.totalExercises);

  const displayedCompletedExercises =
    completedExercises > 0 ? completedExercises : dashboard.completedExercises;

  const workoutProgress = Math.min(
    100,
    Math.round((displayedCompletedExercises / totalExercises) * 100),
  );

  const calorieProgress =
    dashboard.calorieGoal > 0
      ? (dashboard.caloriesConsumed / dashboard.calorieGoal) * 100
      : 0;

  const proteinProgress =
    dashboard.proteinGoal > 0
      ? (dashboard.proteinConsumed / dashboard.proteinGoal) * 100
      : 0;

  const carbsProgress =
    dashboard.carbsGoal > 0
      ? (dashboard.carbsConsumed / dashboard.carbsGoal) * 100
      : 0;

  const fatsProgress =
    dashboard.fatsGoal > 0
      ? (dashboard.fatsConsumed / dashboard.fatsGoal) * 100
      : 0;

  const waterProgress =
    dashboard.waterGoalLitres > 0
      ? (dashboard.waterLitres / dashboard.waterGoalLitres) * 100
      : 0;

  const todayIndex = (new Date().getDay() + 6) % 7;
  const weekDayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>YOUR FITNESS JOURNEY</Text>
            <Text style={styles.title}>
              {user?.name
                ? `Let's get stronger, ${user.name.split(" ")[0]}.`
                : "Let's get stronger."}
            </Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>N</Text>
          </View>
        </View>

        {dashboardError ? (
          <TouchableOpacity
            style={styles.errorBox}
            onPress={() => void loadDashboard()}
          >
            <Text style={styles.errorText}>
              Could not refresh dashboard. Tap to retry.
            </Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroHeadingContainer}>
              <Text style={styles.heroEyebrow}>TODAY'S FOCUS</Text>
              <Text style={styles.heroTitle}>Show up. Get better.</Text>
            </View>

            <View
              style={[
                styles.liveBadge,
                isWorkoutRunning && styles.runningBadge,
              ]}
            >
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>
                {isWorkoutRunning ? "ACTIVE" : "READY"}
              </Text>
            </View>
          </View>

          <Text style={styles.heroDescription}>
            Every rep counts. Make today a step forward.
          </Text>

          <View style={styles.heroDivider} />

          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>
                {formatTime(workoutSeconds)}
              </Text>
              <Text style={styles.heroStatLabel}>WORKOUT TIME</Text>
            </View>

            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>
                {displayedCompletedExercises}
              </Text>
              <Text style={styles.heroStatLabel}>EXERCISES</Text>
            </View>

            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{dashboard.streakDays}</Text>
              <Text style={styles.heroStatLabel}>STREAK DAYS</Text>
            </View>
          </View>

          <View style={styles.workoutProgressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Workout progress</Text>
              <Text style={styles.progressPercent}>{workoutProgress}%</Text>
            </View>

            <ProgressBar progress={workoutProgress} />

            <Text style={styles.progressHint}>
              {displayedCompletedExercises} of {totalExercises} exercises
              completed
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.primaryButton}
            onPress={() => setIsWorkoutRunning((running) => !running)}
          >
            <Text style={styles.primaryButtonText}>
              {isWorkoutRunning ? "Ⅱ  PAUSE WORKOUT" : "▶  START WORKOUT"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.secondaryButton}
            onPress={() =>
              setCompletedExercises((count) =>
                Math.min(totalExercises, count + 1),
              )
            }
            disabled={displayedCompletedExercises >= totalExercises}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                displayedCompletedExercises >= totalExercises &&
                  styles.disabledButtonText,
              ]}
            >
              {displayedCompletedExercises >= totalExercises
                ? "✓  ALL EXERCISES COMPLETED"
                : "+  COMPLETE EXERCISE"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.resetButton}
            onPress={handleReset}
          >
            <Text style={styles.resetButtonText}>RESET WORKOUT</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily nutrition</Text>
          <Text style={styles.sectionCaption}>YOUR TARGETS</Text>
        </View>

        <View style={styles.nutritionCard}>
          <View style={styles.calorieRow}>
            <View>
              <Text style={styles.cardLabel}>Calories consumed</Text>
              <View style={styles.valueRow}>
                <Text style={styles.calorieValue}>
                  {Math.round(dashboard.caloriesConsumed).toLocaleString()}
                </Text>
                <Text style={styles.unit}>kcal</Text>
              </View>
            </View>

            <View style={styles.targetBox}>
              <Text style={styles.targetLabel}>DAILY GOAL</Text>
              <Text style={styles.targetValue}>
                {Math.round(dashboard.calorieGoal).toLocaleString()} kcal
              </Text>
            </View>
          </View>

          <ProgressBar progress={calorieProgress} />

          <View style={styles.remainingRow}>
            <Text style={styles.remainingText}>
              {Math.round(Math.min(100, calorieProgress))}% completed
            </Text>
            <Text style={styles.remainingText}>
              {Math.max(
                0,
                Math.round(dashboard.calorieGoal - dashboard.caloriesConsumed),
              ).toLocaleString()}{" "}
              kcal remaining
            </Text>
          </View>

          <View style={styles.macroRow}>
            <View style={styles.macroItem}>
              <View style={[styles.macroDot, { backgroundColor: "#C6FF3D" }]} />
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={styles.macroValue}>
                {Math.round(dashboard.proteinConsumed)} /{" "}
                {Math.round(dashboard.proteinGoal)} g
              </Text>
              <ProgressBar progress={proteinProgress} />
            </View>

            <View style={styles.macroItem}>
              <View style={[styles.macroDot, { backgroundColor: "#65B8FF" }]} />
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroValue}>
                {Math.round(dashboard.carbsConsumed)} /{" "}
                {Math.round(dashboard.carbsGoal)} g
              </Text>
              <ProgressBar progress={carbsProgress} color="#65B8FF" />
            </View>

            <View style={styles.macroItem}>
              <View style={[styles.macroDot, { backgroundColor: "#FFAD66" }]} />
              <Text style={styles.macroLabel}>Fats</Text>
              <Text style={styles.macroValue}>
                {Math.round(dashboard.fatsConsumed)} /{" "}
                {Math.round(dashboard.fatsGoal)} g
              </Text>
              <ProgressBar progress={fatsProgress} color="#FFAD66" />
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily essentials</Text>
        </View>

        <View style={styles.essentialsRow}>
          <View style={styles.essentialCard}>
            <Text style={styles.essentialIcon}>💧</Text>
            <Text style={styles.cardLabel}>Water intake</Text>
            <Text style={styles.essentialValue}>
              {dashboard.waterLitres.toFixed(1)} L
            </Text>
            <Text style={styles.detail}>
              Goal: {dashboard.waterGoalLitres.toFixed(1)} L
            </Text>
            <ProgressBar progress={waterProgress} />
          </View>

          <View style={styles.essentialCard}>
            <Text style={styles.essentialIcon}>⚖️</Text>
            <Text style={styles.cardLabel}>Body weight</Text>
            <Text style={styles.essentialValue}>
              {dashboard.bodyWeight != null
                ? `${dashboard.bodyWeight.toFixed(1)} kg`
                : "— kg"}
            </Text>
            <Text style={styles.detail}>
              {dashboard.bodyWeight != null
                ? "Latest recorded weight"
                : "No entry yet"}
            </Text>
            <Text style={styles.recordHint}>Track your progress</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>This week</Text>
          <Text style={styles.sectionCaption}>ACTIVITY</Text>
        </View>

        <View style={styles.weekCard}>
          <View style={styles.weekDays}>
            {weekDayLabels.map((day, index) => {
              const isActive =
                dashboard.activeDays.length > 0
                  ? dashboard.activeDays.includes(index)
                  : index === todayIndex;

              return (
                <View style={styles.dayItem} key={`${day}-${index}`}>
                  <View
                    style={[
                      styles.dayCircle,
                      isActive && styles.dayCircleActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        isActive && styles.dayNumberActive,
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </View>

                  <Text style={styles.dayLabel}>{day}</Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.weekHint}>
            {isLoadingDashboard
              ? "Syncing your dashboard..."
              : "Your activity will appear here as you log workouts."}
          </Text>

          <TouchableOpacity
            onPress={() => void loadDashboard()}
            activeOpacity={0.75}
            style={styles.syncButton}
          >
            <Text style={styles.syncButtonText}>↻ SYNC DASHBOARD</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>NEXFIT · BUILD YOUR BEST</Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  greeting: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.heading,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: COLORS.background,
    fontSize: 20,
    fontWeight: "900",
  },
  heroCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xxl,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroHeadingContainer: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  heroEyebrow: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: "800",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#29351D",
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  runningBadge: {
    backgroundColor: "#23452E",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  liveText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  heroDescription: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.body,
    marginTop: 14,
    lineHeight: 22,
  },
  heroDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xl,
  },
  heroStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroStatItem: {
    flex: 1,
  },
  heroStatValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroStatLabel: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  workoutProgressContainer: {
    marginTop: SPACING.xl,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  progressLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  progressPercent: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  progressHint: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: SPACING.sm,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.xl,
  },
  primaryButtonText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.md,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  disabledButtonText: {
    opacity: 0.65,
  },
  resetButton: {
    paddingVertical: SPACING.md,
    alignItems: "center",
  },
  resetButtonText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.subheading,
    fontWeight: "800",
  },
  sectionCaption: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  nutritionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  calorieRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  cardLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  calorieValue: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -1,
  },
  unit: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  targetBox: {
    alignItems: "flex-end",
  },
  targetLabel: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 6,
  },
  targetValue: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  progressTrack: {
    height: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceElevated,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: RADIUS.full,
  },
  remainingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: SPACING.xl,
  },
  remainingText: {
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  macroRow: {
    flexDirection: "row",
    gap: 12,
  },
  macroItem: {
    flex: 1,
    gap: 7,
  },
  macroDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  macroLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  macroValue: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 2,
  },
  essentialsRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  essentialCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  essentialIcon: {
    fontSize: 21,
    marginBottom: 14,
  },
  essentialValue: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: "900",
    marginVertical: 3,
  },
  detail: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: 12,
  },
  recordHint: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  weekCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
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
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayNumber: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  dayNumberActive: {
    color: COLORS.background,
  },
  dayLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: "700",
  },
  weekHint: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 18,
    marginTop: SPACING.lg,
  },
  syncButton: {
    paddingVertical: SPACING.md,
    alignItems: "center",
  },
  syncButtonText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  errorBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "#8A4545",
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: "#FF9B9B",
    fontSize: 12,
  },
  footer: {
    color: COLORS.textSecondary,
    textAlign: "center",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: SPACING.xxl,
  },
});
