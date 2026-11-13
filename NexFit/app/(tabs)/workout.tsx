import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS } from "../../constants/theme";
import {
  Exercise,
  FitnessLevel,
  PlanMode,
  WorkoutDay,
  WorkoutGoal,
  WorkoutLocation,
  generateWorkoutPlan,
  getExerciseLibrary,
} from "../../constants/workouts";
import { useAuth } from "../../context/AuthContext";
import { fetchWorkout, saveWorkout } from "../../services/workoutApi";

type Choice<T extends string> = {
  label: string;
  value: T;
  description?: string;
};

const GOALS: Choice<WorkoutGoal>[] = [
  { label: "Build Muscle", value: "muscle", description: "Build muscle and size" },
  { label: "Lose Fat", value: "fat", description: "Focus on activity and conditioning" },
  { label: "Build Strength", value: "strength", description: "Improve strength" },
  { label: "Stay Fit", value: "fitness", description: "Improve general fitness" },
];

const LEVELS: Choice<FitnessLevel>[] = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
];

const LOCATIONS: Choice<WorkoutLocation>[] = [
  { label: "Gym", value: "gym", description: "Machines and weights" },
  { label: "Home", value: "home", description: "Bodyweight and dumbbells" },
];

const DAYS = [2, 3, 4, 5, 6];
const DURATIONS = [20, 30, 45, 60, 90];

export default function WorkoutsScreen() {
  const { accessToken } = useAuth();

  const [goal, setGoal] = useState<WorkoutGoal>("muscle");
  const [level, setLevel] = useState<FitnessLevel>("beginner");
  const [location, setLocation] = useState<WorkoutLocation>("gym");
  const [days, setDays] = useState(4);
  const [duration, setDuration] = useState(45);
  const [mode, setMode] = useState<PlanMode>("automatic");

  const [plan, setPlan] = useState<WorkoutDay[] | null>(null);
  const [activeDay, setActiveDay] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);

  const [isLoadingWorkout, setIsLoadingWorkout] = useState(true);
  const [isSavingWorkout, setIsSavingWorkout] = useState(false);
  const [workoutLoaded, setWorkoutLoaded] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadFinished = useRef(false);

  const library = useMemo(() => getExerciseLibrary(), []);

  // Local plan generator expects durationMinutes.
  const preferences = {
    goal,
    level,
    location,
    daysPerWeek: days,
    durationMinutes: duration,
    mode,
  };

  const currentDay = plan?.[activeDay];

  // Load the user's saved workout from the backend.
  useEffect(() => {
    let cancelled = false;

    async function loadSavedWorkout() {
      if (!accessToken) {
        setIsLoadingWorkout(false);
        setWorkoutLoaded(true);
        initialLoadFinished.current = true;
        return;
      }

      setIsLoadingWorkout(true);

      try {
        const saved = await fetchWorkout(accessToken);

        if (cancelled) return;

        if (saved) {
          const p = saved.preferences;
          const savedPlan = Array.isArray(saved.plan)
            ? (saved.plan as WorkoutDay[])
            : [];

          // Handle incomplete or older saved records safely.
          if (p) {
            setGoal((p.goal || "muscle") as WorkoutGoal);
            setLevel((p.level || "beginner") as FitnessLevel);
            setLocation((p.location || "gym") as WorkoutLocation);
            setDays(Number(p.daysPerWeek) || 4);
            setDuration(Number(p.duration) || 45);
            setMode((p.mode || "automatic") as PlanMode);
          }

          setPlan(savedPlan.length > 0 ? savedPlan : null);
          setCompleted(
            Array.isArray(saved.completedExercises)
              ? saved.completedExercises
              : [],
          );
          setActiveDay(0);
          setSaveMessage("Your saved plan is ready.");
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Could not load workout:", error);
          setSaveMessage("Could not load your saved plan.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingWorkout(false);
          setWorkoutLoaded(true);
          initialLoadFinished.current = true;
        }
      }
    }

    initialLoadFinished.current = false;
    loadSavedWorkout();

    return () => {
      cancelled = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [accessToken]);

  // Save plan and progress after changes, with a short debounce.
  useEffect(() => {
    if (
      !workoutLoaded ||
      !initialLoadFinished.current ||
      !accessToken ||
      !plan
    ) {
      return;
    }

    if (plan.length === 0) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(async () => {
      setIsSavingWorkout(true);
      setSaveMessage("");

      try {
        await saveWorkout(
          accessToken,
          {
            goal,
            level,
            location,
            daysPerWeek: days,
            duration,
            mode,
          },
          plan,
          completed,
        );

        setSaveMessage("All changes saved.");
      } catch (error) {
        console.error("Save workout error:", error);
        setSaveMessage(
          error instanceof Error ? error.message : "Could not save changes.",
        );
      } finally {
        setIsSavingWorkout(false);
      }
    }, 700);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [
    accessToken,
    workoutLoaded,
    plan,
    completed,
    goal,
    level,
    location,
    days,
    duration,
    mode,
  ]);

  const updateCurrentDay = (updatedDay: WorkoutDay) => {
    setPlan((previous) =>
      previous
        ? previous.map((day, index) => (index === activeDay ? updatedDay : day))
        : previous,
    );
  };

  const generatePlan = () => {
    const generated = generateWorkoutPlan(preferences);

    if (generated.every((day) => day.exercises.length === 0)) {
      Alert.alert(
        "No exercises found",
        "Try a different goal or training location.",
      );
      return;
    }

    setPlan(generated);
    setActiveDay(0);
    setCompleted([]);
    setShowLibrary(false);
    setSaveMessage("Saving your plan...");
  };

  const addExercise = (exercise: Exercise) => {
    if (!currentDay) return;

    if (currentDay.exercises.some((item) => item.id === exercise.id)) {
      Alert.alert(
        "Already added",
        "This exercise is already in today's workout.",
      );
      return;
    }

    updateCurrentDay({
      ...currentDay,
      exercises: [...currentDay.exercises, { ...exercise }],
    });

    setShowLibrary(false);
  };

  const removeExercise = (id: string) => {
    if (!currentDay) return;

    updateCurrentDay({
      ...currentDay,
      exercises: currentDay.exercises.filter((exercise) => exercise.id !== id),
    });

    setCompleted((previous) =>
      previous.filter((item) => item !== `${currentDay.id}:${id}`),
    );
  };

  const toggleExercise = (id: string) => {
    if (!currentDay) return;

    const key = `${currentDay.id}:${id}`;

    setCompleted((previous) =>
      previous.includes(key)
        ? previous.filter((item) => item !== key)
        : [...previous, key],
    );
  };

  const updateExercise = (
    exerciseId: string,
    field: "sets" | "reps",
    amount: number,
  ) => {
    if (!currentDay) return;

    updateCurrentDay({
      ...currentDay,
      exercises: currentDay.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? { ...exercise, [field]: Math.max(1, exercise[field] + amount) }
          : exercise,
      ),
    });
  };

  const dayCompleted = currentDay
    ? currentDay.exercises.filter((exercise) =>
        completed.includes(`${currentDay.id}:${exercise.id}`),
      ).length
    : 0;

  const totalExercises =
    plan?.reduce((total, day) => total + day.exercises.length, 0) ?? 0;

  const totalCompleted = completed.filter((key) => {
    const [dayId, exerciseId] = key.split(":");
    return plan?.some(
      (day) =>
        day.id === dayId &&
        day.exercises.some((exercise) => exercise.id === exerciseId),
    );
  }).length;

  const renderChoices = <T extends string>(
    choices: Choice<T>[],
    value: T,
    onChange: (next: T) => void,
  ) => (
    <View style={styles.choiceList}>
      {choices.map((choice) => {
        const active = value === choice.value;

        return (
          <Pressable
            key={choice.value}
            onPress={() => onChange(choice.value)}
            style={[styles.choiceCard, active && styles.choiceActive]}
          >
            <View style={styles.choiceText}>
              <Text style={[styles.choiceTitle, active && styles.activeText]}>
                {choice.label}
              </Text>
              {choice.description ? (
                <Text style={styles.mutedText}>{choice.description}</Text>
              ) : null}
            </View>

            <View style={[styles.radio, active && styles.radioActive]}>
              {active ? <View style={styles.radioDot} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  const renderNumbers = (
    values: number[],
    selected: number,
    onChange: (next: number) => void,
    suffix: string,
  ) => (
    <View style={styles.numberRow}>
      {values.map((value) => {
        const active = selected === value;

        return (
          <Pressable
            key={value}
            onPress={() => onChange(value)}
            style={[styles.numberCard, active && styles.choiceActive]}
          >
            <Text style={[styles.numberValue, active && styles.activeText]}>
              {value}
            </Text>
            <Text style={[styles.numberSuffix, active && styles.activeText]}>
              {suffix}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
  if (isLoadingWorkout) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.mutedText}>Loading your workout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>NEXFIT TRAINING</Text>
          <Text style={styles.title}>
            {plan ? "Your workout plan" : "Build your plan."}
          </Text>
          <Text style={styles.subtitle}>
            {plan
              ? "Your routine, your rules. Customize it anytime."
              : "Choose your preferences to get started."}
          </Text>

          {plan ? (
            <View style={styles.saveStatus}>
              {isSavingWorkout ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <View
                  style={[
                    styles.statusDot,
                    saveMessage.includes("Could not") && styles.statusDotError,
                  ]}
                />
              )}
              <Text style={styles.saveStatusText}>
                {isSavingWorkout ? "Saving changes..." : saveMessage}
              </Text>
            </View>
          ) : null}
        </View>

        {!plan ? (
          <>
            <View style={styles.banner}>
              <Text style={styles.bannerEmoji}>⚡</Text>
              <View style={styles.bannerContent}>
                <Text style={styles.bannerTitle}>Made for your goals</Text>
                <Text style={styles.mutedText}>
                  Select your preferences. NexFit will recommend a plan you can
                  customize.
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>01. What's your goal?</Text>
              {renderChoices(GOALS, goal, setGoal)}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>02. Experience level</Text>
              {renderChoices(LEVELS, level, setLevel)}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>03. Where do you train?</Text>
              {renderChoices(LOCATIONS, location, setLocation)}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>04. Days per week</Text>
              {renderNumbers(DAYS, days, setDays, "days")}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>05. Session duration</Text>
              {renderNumbers(DURATIONS, duration, setDuration, "min")}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>06. Choose your approach</Text>

              <Pressable
                onPress={() => setMode("automatic")}
                style={[
                  styles.modeCard,
                  mode === "automatic" && styles.choiceActive,
                ]}
              >
                <Text style={styles.modeEmoji}>✨</Text>
                <View style={styles.modeContent}>
                  <Text
                    style={[
                      styles.choiceTitle,
                      mode === "automatic" && styles.activeText,
                    ]}
                  >
                    Recommend a plan
                  </Text>
                  <Text style={styles.mutedText}>
                    Get a plan based on your preferences.
                  </Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    mode === "automatic" && styles.radioActive,
                  ]}
                >
                  {mode === "automatic" ? (
                    <View style={styles.radioDot} />
                  ) : null}
                </View>
              </Pressable>

              <Pressable
                onPress={() => setMode("manual")}
                style={[
                  styles.modeCard,
                  mode === "manual" && styles.choiceActive,
                ]}
              >
                <Text style={styles.modeEmoji}>⚙️</Text>
                <View style={styles.modeContent}>
                  <Text
                    style={[
                      styles.choiceTitle,
                      mode === "manual" && styles.activeText,
                    ]}
                  >
                    Build my own plan
                  </Text>
                  <Text style={styles.mutedText}>
                    Start with a suggested plan and edit exercises yourself.
                  </Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    mode === "manual" && styles.radioActive,
                  ]}
                >
                  {mode === "manual" ? <View style={styles.radioDot} /> : null}
                </View>
              </Pressable>
            </View>

            <Pressable style={styles.primaryButton} onPress={generatePlan}>
              <Text style={styles.primaryButtonText}>
                {mode === "automatic"
                  ? "GENERATE MY PLAN"
                  : "CUSTOMIZE MY PLAN"}
              </Text>
              <Text style={styles.buttonArrow}>→</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.planHero}>
              <View style={styles.planHeroTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eyebrow}>YOUR PERSONAL PLAN</Text>
                  <Text style={styles.planHeroTitle}>
                    {GOALS.find((item) => item.value === goal)?.label}
                  </Text>
                  <Text style={styles.mutedText}>
                    {level} • {location} • {duration} min
                  </Text>
                  <Text style={styles.mutedText}>
                    {days} training days per week
                  </Text>
                </View>
                <Text style={styles.heroEmoji}>🏋️</Text>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${
                        currentDay && currentDay.exercises.length
                          ? (dayCompleted / currentDay.exercises.length) * 100
                          : 0
                      }%`,
                    },
                  ]}
                />
              </View>

              <Text style={styles.mutedText}>
                Today: {dayCompleted}/{currentDay?.exercises.length ?? 0}{" "}
                exercises completed
              </Text>
              <Text style={styles.totalProgress}>
                Overall: {totalCompleted}/{totalExercises} exercises completed
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayRow}
            >
              {plan.map((day, index) => {
                const active = activeDay === index;

                return (
                  <Pressable
                    key={day.id}
                    onPress={() => {
                      setActiveDay(index);
                      setShowLibrary(false);
                    }}
                    style={[styles.dayChip, active && styles.dayChipActive]}
                  >
                    <Text
                      style={[styles.dayChipLabel, active && styles.activeText]}
                    >
                      {day.title}
                    </Text>
                    <Text
                      style={[styles.dayChipFocus, active && styles.activeText]}
                    >
                      {day.focus}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {currentDay ? (
              <>
                <View style={styles.exerciseHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>{currentDay.focus}</Text>
                    <Text style={styles.mutedText}>
                      {currentDay.exercises.length} exercises
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => setShowLibrary((previous) => !previous)}
                    style={styles.addButton}
                  >
                    <Text style={styles.addButtonText}>
                      {showLibrary ? "CLOSE" : "+ ADD"}
                    </Text>
                  </Pressable>
                </View>

                {showLibrary ? (
                  <View style={styles.libraryCard}>
                    <Text style={styles.libraryTitle}>Exercise library</Text>
                    {library
                      .filter((exercise) =>
                        exercise.locations.includes(location),
                      )
                      .filter(
                        (exercise) =>
                          !currentDay.exercises.some(
                            (item) => item.id === exercise.id,
                          ),
                      )
                      .map((exercise) => (
                        <Pressable
                          key={exercise.id}
                          onPress={() => addExercise(exercise)}
                          style={styles.libraryItem}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.choiceTitle}>
                              {exercise.name}
                            </Text>
                            <Text style={styles.mutedText}>
                              {exercise.muscle}
                            </Text>
                          </View>
                          <Text style={styles.addIcon}>+</Text>
                        </Pressable>
                      ))}
                  </View>
                ) : null}

                {currentDay.exercises.map((exercise, index) => {
                  const key = `${currentDay.id}:${exercise.id}`;
                  const isDone = completed.includes(key);

                  return (
                    <View
                      key={exercise.id}
                      style={[
                        styles.exerciseCard,
                        isDone && styles.exerciseCardDone,
                      ]}
                    >
                      <View style={styles.exerciseTop}>
                        <View style={styles.exerciseNumber}>
                          <Text style={styles.exerciseNumberText}>
                            {String(index + 1).padStart(2, "0")}
                          </Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.exerciseName}>
                            {exercise.name}
                          </Text>
                          <Text style={styles.mutedText}>
                            {exercise.muscle}
                          </Text>
                        </View>

                        <Pressable
                          onPress={() => toggleExercise(exercise.id)}
                          style={[
                            styles.checkbox,
                            isDone && styles.checkboxDone,
                          ]}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: isDone }}
                        >
                          <Text style={styles.checkmark}>
                            {isDone ? "✓" : ""}
                          </Text>
                        </Pressable>
                      </View>

                      <View style={styles.exerciseStats}>
                        <View style={styles.statBlock}>
                          <Text style={styles.statLabel}>SETS</Text>
                          <View style={styles.stepper}>
                            <Pressable
                              onPress={() =>
                                updateExercise(exercise.id, "sets", -1)
                              }
                              style={styles.stepButton}
                            >
                              <Text style={styles.stepButtonText}>−</Text>
                            </Pressable>
                            <Text style={styles.statValue}>
                              {exercise.sets}
                            </Text>
                            <Pressable
                              onPress={() =>
                                updateExercise(exercise.id, "sets", 1)
                              }
                              style={styles.stepButton}
                            >
                              <Text style={styles.stepButtonText}>+</Text>
                            </Pressable>
                          </View>
                        </View>

                        <View style={styles.statBlock}>
                          <Text style={styles.statLabel}>REPS</Text>
                          <View style={styles.stepper}>
                            <Pressable
                              onPress={() =>
                                updateExercise(exercise.id, "reps", -1)
                              }
                              style={styles.stepButton}
                            >
                              <Text style={styles.stepButtonText}>−</Text>
                            </Pressable>
                            <Text style={styles.statValue}>
                              {exercise.reps}
                            </Text>
                            <Pressable
                              onPress={() =>
                                updateExercise(exercise.id, "reps", 1)
                              }
                              style={styles.stepButton}
                            >
                              <Text style={styles.stepButtonText}>+</Text>
                            </Pressable>
                          </View>
                        </View>

                        <Pressable
                          onPress={() => removeExercise(exercise.id)}
                          style={styles.removeButton}
                        >
                          <Text style={styles.removeButtonText}>REMOVE</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}

                {currentDay.exercises.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No exercises yet</Text>
                    <Text style={styles.mutedText}>
                      Tap + ADD to choose exercises for this day.
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}

            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                Alert.alert(
                  "Regenerate plan?",
                  "This will replace your current plan and reset exercise completion.",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Regenerate", onPress: generatePlan },
                  ],
                );
              }}
            >
              <Text style={styles.secondaryButtonText}>REGENERATE PLAN</Text>
            </Pressable>

            <Pressable
              style={styles.textButton}
              onPress={() => {
                setPlan(null);
                setCompleted([]);
                setActiveDay(0);
                setShowLibrary(false);
              }}
            >
              <Text style={styles.textButtonText}>← EDIT PREFERENCES</Text>
            </Pressable>
          </>
        )}

        <Text style={styles.footerText}>
          TRAIN SMART. STAY CONSISTENT. GET STRONGER.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 35,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 10,
  },
  title: {
    color: COLORS.text,
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: -0.7,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 7,
    lineHeight: 19,
  },
  saveStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  statusDotError: {
    backgroundColor: "#FF7777",
  },
  saveStatusText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bannerEmoji: {
    fontSize: 28,
    marginRight: 13,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 5,
  },
  section: {
    marginHorizontal: SPACING.lg,
    marginTop: 25,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },
  mutedText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  choiceList: {
    gap: 9,
    marginTop: 12,
  },
  choiceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  choiceActive: {
    borderColor: COLORS.primary,
  },
  choiceText: {
    flex: 1,
  },
  choiceTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },
  activeText: {
    color: COLORS.primary,
  },
  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  radioActive: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  numberRow: {
    flexDirection: "row",
    gap: 7,
    marginTop: 12,
  },
  numberCard: {
    flex: 1,
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  numberValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
  },
  numberSuffix: {
    color: COLORS.textSecondary,
    fontSize: 9,
    marginTop: 3,
  },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 10,
  },
  modeEmoji: {
    fontSize: 23,
    marginRight: 12,
  },
  modeContent: {
    flex: 1,
  },
  primaryButton: {
    marginHorizontal: SPACING.lg,
    marginTop: 26,
    minHeight: 56,
    paddingHorizontal: 18,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#101010",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  buttonArrow: {
    color: "#101010",
    fontSize: 22,
    fontWeight: "800",
    marginLeft: 12,
  },
  planHero: {
    marginHorizontal: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  planHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  planHeroTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 5,
  },
  heroEmoji: {
    fontSize: 40,
    marginLeft: 10,
  },
  progressTrack: {
    height: 7,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  totalProgress: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 7,
  },
  dayRow: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 20,
    paddingBottom: 5,
    gap: 9,
  },
  dayChip: {
    minWidth: 105,
    padding: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayChipActive: {
    borderColor: COLORS.primary,
  },
  dayChipLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
  dayChipFocus: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 5,
  },
  exerciseHeader: {
    marginHorizontal: SPACING.lg,
    marginTop: 23,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  addButtonText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  libraryCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: 12,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  libraryTitle: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  libraryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  addIcon: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: "700",
    paddingHorizontal: 8,
  },
  exerciseCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: 12,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exerciseCardDone: {
    borderColor: COLORS.primary,
  },
  exerciseTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  exerciseNumber: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  exerciseNumberText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  exerciseName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: "#101010",
    fontSize: 17,
    fontWeight: "900",
  },
  exerciseStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 17,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statBlock: {
    marginRight: 18,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 6,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepButton: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  stepButtonText: {
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: "800",
  },
  statValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  removeButton: {
    marginLeft: "auto",
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  removeButtonText: {
    color: "#FF7777",
    fontSize: 9,
    fontWeight: "900",
  },
  emptyCard: {
    marginHorizontal: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: "center",
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    marginHorizontal: SPACING.lg,
    marginTop: 20,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  textButton: {
    alignItems: "center",
    padding: 17,
  },
  textButtonText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
  },
  footerText: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 9,
    letterSpacing: 1.1,
    marginTop: 23,
    marginHorizontal: SPACING.lg,
  },
});