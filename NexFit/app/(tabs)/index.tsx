import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";

import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../services/apiConfig";
import { fetchWorkout } from "../../services/workoutApi";
import { createWorkoutSession } from "../../services/workoutSessionApi";

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
  const { user, accessToken, isAuthenticated, isInitializing } = useAuth();

  const [isWorkoutRunning, setIsWorkoutRunning] = useState(false);
  const [workoutSeconds, setWorkoutSeconds] = useState(0);
  const [completedExercises, setCompletedExercises] = useState(0);
  const [isSavingSession, setIsSavingSession] = useState(false);

  const [dashboard, setDashboard] = useState<DashboardData>(DEFAULT_DASHBOARD);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState("");

  const loadDashboard = useCallback(async () => {
    // If not authenticated after initialization, show default dashboard
    if (!isAuthenticated) {
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

      // Extract nested structures returned by backend GET /api/dashboard
      const nutritionConsumed = payload.nutrition?.consumed;
      const nutritionTargets = payload.nutrition?.targets;
      const hydration = payload.hydration;
      const body = payload.body;
      const workout = payload.workout;
      const weekly = payload.weeklyActivity;

      const weight =
        body?.latestMeasurement?.weightKg != null
          ? Number(body.latestMeasurement.weightKg)
          : readNumber(payload, ["bodyWeight", "weight", "latestWeight"], -1);

      const caloriesConsumed =
        nutritionConsumed?.calories != null
          ? Number(nutritionConsumed.calories)
          : readNumber(
              payload,
              ["caloriesConsumed", "consumedCalories", "calories"],
              0,
            );

      const calorieGoal =
        nutritionTargets?.calories != null
          ? Number(nutritionTargets.calories)
          : readNumber(
              payload,
              ["calorieGoal", "dailyCalorieGoal", "targetCalories"],
              2000,
            );

      const proteinConsumed =
        nutritionConsumed?.protein != null
          ? Number(nutritionConsumed.protein)
          : readNumber(payload, ["proteinConsumed", "protein"], 0);

      const proteinGoal =
        nutritionTargets?.protein != null
          ? Number(nutritionTargets.protein)
          : readNumber(payload, ["proteinGoal", "targetProtein"], 150);

      const carbsConsumed =
        nutritionConsumed?.carbs != null
          ? Number(nutritionConsumed.carbs)
          : readNumber(
              payload,
              ["carbsConsumed", "carbs", "carbohydrates"],
              0,
            );

      const carbsGoal =
        nutritionTargets?.carbs != null
          ? Number(nutritionTargets.carbs)
          : readNumber(
              payload,
              ["carbsGoal", "targetCarbs", "targetCarbohydrates"],
              220,
            );

      const fatsConsumed =
        nutritionConsumed?.fats != null
          ? Number(nutritionConsumed.fats)
          : readNumber(payload, ["fatsConsumed", "fats", "fat"], 0);

      const fatsGoal =
        nutritionTargets?.fats != null
          ? Number(nutritionTargets.fats)
          : readNumber(
              payload,
              ["fatsGoal", "targetFats", "targetFat"],
              65,
            );

      const waterLitres =
        hydration?.consumedMl != null
          ? Number((hydration.consumedMl / 1000).toFixed(1))
          : readNumber(
              payload,
              ["waterLitres", "waterIntakeLitres", "waterIntake"],
              0,
            );

      const waterGoalLitres =
        hydration?.targetMl != null
          ? Number((hydration.targetMl / 1000).toFixed(1))
          : readNumber(
              payload,
              ["waterGoalLitres", "waterGoal", "targetWater"],
              2.5,
            );

      const activeDaysFromWeekly = Array.isArray(weekly)
        ? weekly.filter((d: any) => d.sessions > 0).map((d: any) => d.date)
        : [];

      const activeDays =
        activeDaysFromWeekly.length > 0
          ? activeDaysFromWeekly
          : Array.isArray(payload.activeDays)
            ? payload.activeDays
            : [];

      const streakDays = readNumber(
        payload,
        ["streakDays", "streak"],
        activeDays.length,
      );

      const completedExercises =
        workout?.completedSets != null
          ? Number(workout.completedSets)
          : readNumber(
              payload,
              ["completedExercises", "exercisesCompleted"],
              0,
            );

      const totalExercises =
        workout?.sessions != null && workout.sessions > 0
          ? Math.max(1, workout.sessions * 5)
          : Math.max(
              1,
              readNumber(payload, ["totalExercises", "exerciseCount"], 6),
            );

      setDashboard({
        caloriesConsumed,
        calorieGoal,
        proteinConsumed,
        proteinGoal,
        carbsConsumed,
        carbsGoal,
        fatsConsumed,
        fatsGoal,
        waterLitres,
        waterGoalLitres,
        bodyWeight: weight >= 0 ? weight : null,
        streakDays,
        completedExercises,
        totalExercises,
        activeDays,
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
  }, [accessToken, isAuthenticated]);

  // Wait for auth initialization, then load dashboard
  useEffect(() => {
    if (!isInitializing) {
      void loadDashboard();
    }
  }, [isInitializing, loadDashboard]);

  // Restore active workout session across tab switches
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function restoreActiveWorkout() {
        try {
          const raw = await AsyncStorage.getItem("@nexfit_active_workout");
          if (!raw) return;

          const saved = JSON.parse(raw);
          if (!isMounted) return;

          if (saved.isWorkoutRunning && saved.lastTickTimestamp) {
            const elapsed = Math.max(0, Math.floor((Date.now() - saved.lastTickTimestamp) / 1000));
            setWorkoutSeconds((saved.workoutSeconds || 0) + elapsed);
            setIsWorkoutRunning(true);
          } else {
            setWorkoutSeconds(saved.workoutSeconds || 0);
            setIsWorkoutRunning(false);
          }

          if (typeof saved.completedExercises === "number") {
            setCompletedExercises(saved.completedExercises);
          }
        } catch (e) {
          console.warn("Failed to restore active workout:", e);
        }
      }

      restoreActiveWorkout();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  // Timer interval with continuous state persistence
  useEffect(() => {
    if (!isWorkoutRunning) return;

    const interval = setInterval(() => {
      setWorkoutSeconds((prev) => {
        const next = prev + 1;
        AsyncStorage.setItem(
          "@nexfit_active_workout",
          JSON.stringify({
            isWorkoutRunning: true,
            workoutSeconds: next,
            lastTickTimestamp: Date.now(),
            completedExercises,
          })
        ).catch(() => {});
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isWorkoutRunning, completedExercises]);

  const toggleWorkoutTimer = async () => {
    const nextRunning = !isWorkoutRunning;
    setIsWorkoutRunning(nextRunning);

    try {
      await AsyncStorage.setItem(
        "@nexfit_active_workout",
        JSON.stringify({
          isWorkoutRunning: nextRunning,
          workoutSeconds,
          lastTickTimestamp: Date.now(),
          completedExercises,
        })
      );
    } catch {
      // Ignore storage error
    }
  };

  const handleCompleteExercise = async () => {
    const nextCount = Math.min(totalExercises, (completedExercises > 0 ? completedExercises : dashboard.completedExercises) + 1);
    setCompletedExercises(nextCount);

    try {
      await AsyncStorage.setItem(
        "@nexfit_active_workout",
        JSON.stringify({
          isWorkoutRunning,
          workoutSeconds,
          lastTickTimestamp: Date.now(),
          completedExercises: nextCount,
        })
      );
    } catch {
      // Ignore storage error
    }
  };

  const handleSaveWorkoutSession = async () => {
    if (!accessToken) {
      Alert.alert("Login Required", "Please log in to save your workout session.");
      return;
    }

    if (isSavingSession) return;

    const durationMinutes = Math.max(1, Math.round(workoutSeconds / 60));
    const exercisesCount = Math.max(1, completedExercises > 0 ? completedExercises : dashboard.completedExercises);
    const estimatedCalories = Math.round(durationMinutes * 7.5);

    setIsSavingSession(true);

    try {
      let sessionTitle = "Daily Workout Session";
      let sessionExercises: Array<{
        exerciseName: string;
        machineName: string;
        equipmentType?: string;
        sets: Array<{
          setNumber: number;
          weightKg: number;
          reps: number;
          completed: boolean;
        }>;
      }> = [];

      try {
        const userWorkout = await fetchWorkout(accessToken);
        if (userWorkout && Array.isArray(userWorkout.plan) && userWorkout.plan.length > 0) {
          const firstDay: any = userWorkout.plan[0];
          if (firstDay?.title) {
            sessionTitle = firstDay.title;
          }
          if (Array.isArray(firstDay?.exercises) && firstDay.exercises.length > 0) {
            const planExercises = firstDay.exercises.slice(0, exercisesCount);
            sessionExercises = planExercises.map((ex: any, idx: number) => ({
              exerciseName: ex.name || `Exercise ${idx + 1}`,
              machineName: ex.muscle || "General",
              equipmentType: (Array.isArray(ex.equipment) && ex.equipment[0]) || "Standard",
              sets: Array.from({ length: Math.max(1, ex.sets || 3) }).map((_, sIdx) => ({
                setNumber: sIdx + 1,
                weightKg: 20,
                reps: ex.reps || 10,
                completed: true,
              })),
            }));
          }
        }
      } catch {
        // Fall back to default exercise library
      }

      if (sessionExercises.length === 0) {
        const standardExercises = [
          { name: "Push-ups", muscle: "Chest", reps: 12 },
          { name: "Bodyweight Squats", muscle: "Legs", reps: 15 },
          { name: "Plank", muscle: "Core", reps: 1 },
          { name: "Dumbbell Rows", muscle: "Back", reps: 10 },
          { name: "Shoulder Press", muscle: "Shoulders", reps: 10 },
          { name: "Bicep Curls", muscle: "Arms", reps: 12 },
        ];
        sessionExercises = Array.from({ length: exercisesCount }).map((_, idx) => {
          const ex = standardExercises[idx % standardExercises.length];
          return {
            exerciseName: ex.name,
            machineName: ex.muscle,
            equipmentType: "Standard",
            sets: [
              {
                setNumber: 1,
                weightKg: 20,
                reps: ex.reps,
                completed: true,
              },
            ],
          };
        });
      }

      await createWorkoutSession(accessToken, {
        workoutDate: new Date().toISOString(),
        title: sessionTitle,
        durationMinutes,
        caloriesBurned: estimatedCalories,
        exercises: sessionExercises,
      });

      await AsyncStorage.removeItem("@nexfit_active_workout");

      setIsWorkoutRunning(false);
      setWorkoutSeconds(0);
      setCompletedExercises(0);

      await loadDashboard();

      Alert.alert("Workout Saved", "Your workout session has been saved to MongoDB and added to your activity!");
    } catch (error) {
      console.warn("Failed to save workout session:", error);
      Alert.alert(
        "Save Failed",
        error instanceof Error ? error.message : "Could not save workout session. Please try again."
      );
    } finally {
      setIsSavingSession(false);
    }
  };

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

  const handleReset = async () => {
    setIsWorkoutRunning(false);
    setWorkoutSeconds(0);
    setCompletedExercises(0);
    try {
      await AsyncStorage.removeItem("@nexfit_active_workout");
    } catch {
      // Ignore storage error
    }
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
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {user?.name
                ? `Let's get stronger, ${user.name.split(" ")[0]}.`
                : "Let's get stronger."}
            </Text>
            <Text style={styles.title}>YOUR FITNESS JOURNEY</Text>
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
              <Text style={styles.heroStatValue}>
                {dashboard.streakDays}
              </Text>
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
            onPress={toggleWorkoutTimer}
          >
            <Text style={styles.primaryButtonText}>
              {isWorkoutRunning ? "Ⅱ  PAUSE WORKOUT" : "▶  START WORKOUT"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.secondaryButton}
            onPress={handleCompleteExercise}
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

          {(workoutSeconds > 0 || displayedCompletedExercises > 0) && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.primaryButton,
                {
                  marginTop: 10,
                  backgroundColor: COLORS.surfaceElevated,
                  borderWidth: 1,
                  borderColor: COLORS.primary,
                },
              ]}
              onPress={handleSaveWorkoutSession}
              disabled={isSavingSession}
            >
              {isSavingSession ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={[styles.primaryButtonText, { color: COLORS.primary }]}>
                  💾  FINISH & SAVE SESSION
                </Text>
              )}
            </TouchableOpacity>
          )}

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
              ).toLocaleString()}{" "}kcal remaining
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

        <Text style={styles.footer}>
          NEXFIT · BUILD YOUR BEST
        </Text>
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