import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import {
  fetchHistoryRange,
  fetchMonthlyHistory,
  fetchDayHistory,
  DayActivityItem,
  MonthlyHistoryResponse,
  DayHistoryDetail,
} from "../../services/historyApi";
import { fetchWorkoutHistory, WorkoutHistorySession } from "../../services/workoutHistoryApi";
import { fetchNutritionHistory } from "../../services/nutritionApi";
import { formatDisplayDate, getLocalDateString } from "../../utils/dateUtils";
import { BannerAd } from "../../components/ads/BannerAd";

type TabMode = "activity" | "workouts" | "nutrition" | "monthly";

export default function HistoryScreen() {
  const { accessToken, isAuthenticated, isInitializing } = useAuth();

  const [activeTab, setActiveTab] = useState<TabMode>("activity");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Month navigation
  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(now.getUTCFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getUTCMonth() + 1);
  const [monthlyData, setMonthlyData] = useState<MonthlyHistoryResponse | null>(null);

  // Daily Activity List (Paginated)
  const [activities, setActivities] = useState<DayActivityItem[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [hasMoreActivities, setHasMoreActivities] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Workouts Dedicated History
  const [workoutSessions, setWorkoutSessions] = useState<any[]>([]);

  // Nutrition Dedicated History
  const [nutritionLogs, setNutritionLogs] = useState<any[]>([]);

  // Selected Day Detail Modal
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<DayHistoryDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Load Monthly Overview
  const loadMonthly = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await fetchMonthlyHistory(accessToken, currentYear, currentMonth);
      setMonthlyData(data);
    } catch (e) {
      console.warn("Failed to load monthly history:", e);
    }
  }, [accessToken, currentYear, currentMonth]);

  // Load Activity Range
  const loadActivities = useCallback(
    async (pageToLoad = 1, append = false) => {
      if (!accessToken) return;
      try {
        if (pageToLoad === 1) setLoading(true);
        else setLoadingMore(true);
        setError("");

        const result = await fetchHistoryRange(accessToken, {
          page: pageToLoad,
          limit: 15,
        });

        if (append) {
          setActivities((prev) => [...prev, ...result.data]);
        } else {
          setActivities(result.data);
        }

        setActivityPage(pageToLoad);
        setHasMoreActivities(pageToLoad < result.pagination.totalPages);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load activity history");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [accessToken]
  );

  // Load Dedicated Workouts
  const loadWorkouts = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetchWorkoutHistory(accessToken, { limit: 30 });
      const items = Array.isArray(res.data)
        ? res.data
        : (res.data as any)?.sessions || res.sessions || [];
      setWorkoutSessions(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workout history");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Load Dedicated Nutrition
  const loadNutrition = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetchNutritionHistory(accessToken, { limit: 30 });
      setNutritionLogs(res.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load nutrition history");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Refresh all based on active tab
  const refreshCurrentTab = useCallback(async () => {
    if (!accessToken) return;
    setRefreshing(true);
    try {
      await Promise.all([
        loadMonthly(),
        activeTab === "activity"
          ? loadActivities(1, false)
          : activeTab === "workouts"
          ? loadWorkouts()
          : activeTab === "nutrition"
          ? loadNutrition()
          : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [accessToken, activeTab, loadMonthly, loadActivities, loadWorkouts, loadNutrition]);

  useFocusEffect(
    useCallback(() => {
      if (!isInitializing && isAuthenticated) {
        void refreshCurrentTab();
      }
    }, [isInitializing, isAuthenticated, refreshCurrentTab])
  );

  useEffect(() => {
    if (!isInitializing && isAuthenticated) {
      if (activeTab === "activity") {
        void loadActivities(1, false);
      } else if (activeTab === "workouts") {
        void loadWorkouts();
      } else if (activeTab === "nutrition") {
        void loadNutrition();
      } else if (activeTab === "monthly") {
        void loadMonthly();
      }
    }
  }, [activeTab, isInitializing, isAuthenticated, loadActivities, loadWorkouts, loadNutrition, loadMonthly]);

  // Handle Month Changing
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Open Day Detail Modal
  const openDayDetail = async (dateStr: string) => {
    setSelectedDate(dateStr);
    setDetailModalVisible(true);
    setLoadingDetail(true);
    setDayDetail(null);
    if (!accessToken) return;
    try {
      const detail = await fetchDayHistory(accessToken, dateStr);
      setDayDetail(detail);
    } catch (e) {
      console.warn("Failed to load day detail:", e);
      Alert.alert("Notice", "Could not load full detail for this date.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" />

      {/* Screen Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>YOUR ACTIVITY LOGS</Text>
          <Text style={styles.headerTitle}>History</Text>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => void refreshCurrentTab()}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.refreshButtonText}>↻ REFRESH</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Mode Navigation Bar */}
      <View style={styles.tabNav}>
        {(["activity", "workouts", "nutrition", "monthly"] as TabMode[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === "activity"
                ? "Daily Log"
                : tab === "workouts"
                ? "Workouts"
                : tab === "nutrition"
                ? "Nutrition"
                : "Calendar"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshCurrentTab}
            tintColor={COLORS.primary}
          />
        }
      >
        {error ? (
          <TouchableOpacity style={styles.errorBox} onPress={() => void refreshCurrentTab()}>
            <Text style={styles.errorText}>{error}. Tap to retry.</Text>
          </TouchableOpacity>
        ) : null}

        {/* ============================================================== */}
        {/* TAB 1: DAILY ACTIVITY SUMMARY LOG                               */}
        {/* ============================================================== */}
        {activeTab === "activity" && (
          <View>
            <Text style={styles.sectionHeading}>COMPLETE ACTIVITY TIMELINE</Text>

            {loading && activities.length === 0 ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.mutedText}>Loading your history...</Text>
              </View>
            ) : activities.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📅</Text>
                <Text style={styles.emptyTitle}>No activity records yet</Text>
                <Text style={styles.mutedText}>
                  Complete workouts or log meals to view your fitness history here.
                </Text>
              </View>
            ) : (
              activities.map((item) => (
                <TouchableOpacity
                  key={item.date}
                  style={styles.activityCard}
                  activeOpacity={0.8}
                  onPress={() => openDayDetail(item.date)}
                >
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardDate}>{formatDisplayDate(item.date)}</Text>
                      <Text style={styles.cardDateSub}>{item.date}</Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        item.workout.status === "completed"
                          ? styles.statusBadgeCompleted
                          : item.workout.status === "in_progress"
                          ? styles.statusBadgeInProgress
                          : styles.statusBadgeNone,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          item.workout.status === "completed"
                            ? styles.statusTextCompleted
                            : item.workout.status === "in_progress"
                            ? styles.statusTextInProgress
                            : styles.statusTextNone,
                        ]}
                      >
                        {item.workout.status === "completed"
                          ? "WORKOUT COMPLETED"
                          : item.workout.status === "in_progress"
                          ? "WORKOUT IN PROGRESS"
                          : "REST DAY"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metricsRow}>
                    <View style={styles.metricBlock}>
                      <Text style={styles.metricLabel}>WORKOUT</Text>
                      <Text style={styles.metricValue}>
                        {item.workout.durationMinutes} min
                      </Text>
                      <Text style={styles.metricSub}>
                        {item.workout.exercisesCount} exercises · {item.workout.setsCount} sets
                      </Text>
                    </View>

                    <View style={styles.metricDivider} />

                    <View style={styles.metricBlock}>
                      <Text style={styles.metricLabel}>CALORIES</Text>
                      <Text style={styles.metricValue}>
                        {Math.round(item.nutrition.consumed.calories)} kcal
                      </Text>
                      <Text style={styles.metricSub}>
                        P: {Math.round(item.nutrition.consumed.protein)}g · C:{" "}
                        {Math.round(item.nutrition.consumed.carbs)}g · F:{" "}
                        {Math.round(item.nutrition.consumed.fats)}g
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.detailLink}>Tap to view details & exercises →</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}

            {hasMoreActivities && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => void loadActivities(activityPage + 1, true)}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Text style={styles.loadMoreText}>LOAD EARLIER DATES</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* TAB 2: DEDICATED WORKOUT HISTORY                                */}
        {/* ============================================================== */}
        {activeTab === "workouts" && (
          <View>
            <Text style={styles.sectionHeading}>RECORDED WORKOUT SESSIONS</Text>

            {loading && workoutSessions.length === 0 ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.mutedText}>Loading workouts...</Text>
              </View>
            ) : workoutSessions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🏋️</Text>
                <Text style={styles.emptyTitle}>No workouts recorded</Text>
                <Text style={styles.mutedText}>
                  Start or finish a workout session to see your training records here.
                </Text>
              </View>
            ) : (
              workoutSessions.map((session, sIdx) => {
                const sDate = session.workoutDate
                  ? String(session.workoutDate).slice(0, 10)
                  : "Unknown Date";

                return (
                  <View key={session._id || sIdx} style={styles.workoutCard}>
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.cardDate}>{formatDisplayDate(sDate)}</Text>
                        <Text style={styles.sessionTitle}>
                          {session.title || "Workout Session"}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          session.status === "completed"
                            ? styles.statusBadgeCompleted
                            : styles.statusBadgeInProgress,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            session.status === "completed"
                              ? styles.statusTextCompleted
                              : styles.statusTextInProgress,
                          ]}
                        >
                          {session.status ? session.status.toUpperCase() : "COMPLETED"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.workoutMetaRow}>
                      <Text style={styles.metaBadge}>
                        ⏱ {session.durationMinutes || 0} min
                      </Text>
                      <Text style={styles.metaBadge}>
                        🔥 {session.caloriesBurned || 0} kcal
                      </Text>
                      <Text style={styles.metaBadge}>
                        📋 {session.exercises?.length || 0} exercises
                      </Text>
                    </View>

                    {Array.isArray(session.exercises) && session.exercises.length > 0 && (
                      <View style={styles.exerciseListContainer}>
                        {session.exercises.map((ex: any, eIdx: number) => {
                          const completedSets = (ex.sets || []).filter(
                            (st: any) => st.completed
                          ).length;
                          const totalSets = ex.sets?.length || 0;
                          const firstSet = ex.sets?.[0];

                          return (
                            <View key={eIdx} style={styles.exerciseItemRow}>
                              <View style={styles.exerciseNumberPill}>
                                <Text style={styles.exerciseNumberText}>
                                  {eIdx + 1}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.exerciseItemName}>
                                  {ex.exerciseName}
                                </Text>
                                <Text style={styles.exerciseItemDetails}>
                                  {completedSets}/{totalSets} sets
                                  {firstSet
                                    ? ` · ${firstSet.reps} reps @ ${firstSet.weightKg} kg`
                                    : ""}
                                  {ex.category ? ` · ${ex.category}` : ""}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* TAB 3: DEDICATED NUTRITION HISTORY                              */}
        {/* ============================================================== */}
        {activeTab === "nutrition" && (
          <View>
            <Text style={styles.sectionHeading}>RECORDED NUTRITION DAYS</Text>

            {loading && nutritionLogs.length === 0 ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.mutedText}>Loading nutrition history...</Text>
              </View>
            ) : nutritionLogs.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🥗</Text>
                <Text style={styles.emptyTitle}>No nutrition records yet</Text>
                <Text style={styles.mutedText}>
                  Log meals in the Nutrition tab to track your history over time.
                </Text>
              </View>
            ) : (
              nutritionLogs.map((log) => {
                const targetCals = log.targets?.calories || 2000;
                const consumedCals = Math.round(log.totals?.calories || 0);
                const remainingCals = Math.max(0, targetCals - consumedCals);
                const pct = Math.min(100, Math.round((consumedCals / targetCals) * 100));

                return (
                  <View key={log._id || log.date} style={styles.nutritionCard}>
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.cardDate}>{formatDisplayDate(log.date)}</Text>
                        <Text style={styles.cardDateSub}>{log.date}</Text>
                      </View>
                      <Text style={styles.calorieHighlight}>
                        {consumedCals} / {targetCals} kcal
                      </Text>
                    </View>

                    {/* Macro pills */}
                    <View style={styles.macroPillsRow}>
                      <View style={[styles.macroPill, { borderColor: "#C6FF3D" }]}>
                        <Text style={styles.macroPillLabel}>PROTEIN</Text>
                        <Text style={styles.macroPillValue}>
                          {Math.round(log.totals?.protein || 0)}g
                        </Text>
                      </View>

                      <View style={[styles.macroPill, { borderColor: "#65B8FF" }]}>
                        <Text style={styles.macroPillLabel}>CARBS</Text>
                        <Text style={styles.macroPillValue}>
                          {Math.round(log.totals?.carbs || 0)}g
                        </Text>
                      </View>

                      <View style={[styles.macroPill, { borderColor: "#FFAD66" }]}>
                        <Text style={styles.macroPillLabel}>FATS</Text>
                        <Text style={styles.macroPillValue}>
                          {Math.round(log.totals?.fats || 0)}g
                        </Text>
                      </View>
                    </View>

                    {/* Meal items breakdown */}
                    {Array.isArray(log.meals) && log.meals.length > 0 && (
                      <View style={styles.mealsContainer}>
                        {log.meals.map((meal: any, mIdx: number) => {
                          const foodNames = (meal.foods || [])
                            .map((f: any) => f.name)
                            .join(", ");
                          const mealCalories = (meal.foods || []).reduce(
                            (sum: number, f: any) => sum + (f.calories || 0),
                            0
                          );

                          return (
                            <View key={mIdx} style={styles.mealSummaryRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.mealNameText}>{meal.name}</Text>
                                <Text style={styles.mealFoodList} numberOfLines={1}>
                                  {foodNames || "No items"}
                                </Text>
                              </View>
                              <Text style={styles.mealCaloriesText}>
                                {mealCalories} kcal
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* TAB 4: MONTHLY CALENDAR VIEW                                    */}
        {/* ============================================================== */}
        {activeTab === "monthly" && (
          <View>
            {/* Month & Year Navigation Bar */}
            <View style={styles.monthNavRow}>
              <TouchableOpacity style={styles.monthNavArrow} onPress={handlePrevMonth}>
                <Text style={styles.monthNavArrowText}>◀</Text>
              </TouchableOpacity>

              <View style={{ alignItems: "center" }}>
                <Text style={styles.monthNavTitle}>
                  {monthNames[currentMonth - 1]} {currentYear}
                </Text>
                <Text style={styles.monthNavSub}>
                  {monthlyData?.totals?.totalWorkoutDays || 0} active days
                </Text>
              </View>

              <TouchableOpacity style={styles.monthNavArrow} onPress={handleNextMonth}>
                <Text style={styles.monthNavArrowText}>▶</Text>
              </TouchableOpacity>
            </View>

            {/* Monthly Totals Stats Bar */}
            {monthlyData && (
              <View style={styles.monthlyStatsBar}>
                <View style={styles.monthlyStatItem}>
                  <Text style={styles.monthlyStatValue}>
                    {monthlyData.totals.totalWorkoutDays}
                  </Text>
                  <Text style={styles.monthlyStatLabel}>WORKOUT DAYS</Text>
                </View>

                <View style={styles.monthlyStatItem}>
                  <Text style={styles.monthlyStatValue}>
                    {monthlyData.totals.totalDurationMinutes}m
                  </Text>
                  <Text style={styles.monthlyStatLabel}>TRAINING TIME</Text>
                </View>

                <View style={styles.monthlyStatItem}>
                  <Text style={styles.monthlyStatValue}>
                    {monthlyData.totals.totalCaloriesBurned}
                  </Text>
                  <Text style={styles.monthlyStatLabel}>BURNED</Text>
                </View>
              </View>
            )}

            {/* Days Grid */}
            <View style={styles.monthGrid}>
              {monthlyData?.days.map((day) => {
                const isSelected = selectedDate === day.date;
                const isToday = day.date === getLocalDateString();

                return (
                  <TouchableOpacity
                    key={day.date}
                    style={[
                      styles.dayCell,
                      day.active && styles.dayCellActive,
                      isToday && styles.dayCellToday,
                      isSelected && styles.dayCellSelected,
                    ]}
                    onPress={() => openDayDetail(day.date)}
                  >
                    <Text
                      style={[
                        styles.dayCellNumber,
                        day.active && styles.dayCellNumberActive,
                        isToday && styles.dayCellNumberToday,
                      ]}
                    >
                      {day.dayNumber}
                    </Text>

                    <View style={styles.indicatorDots}>
                      {day.hasWorkout && <View style={styles.dotWorkout} />}
                      {day.hasNutrition && <View style={styles.dotNutrition} />}
                      {day.hasWater && <View style={styles.dotWater} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={styles.dotWorkout} />
                <Text style={styles.legendText}>Workout</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.dotNutrition} />
                <Text style={styles.legendText}>Nutrition</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.dotWater} />
                <Text style={styles.legendText}>Water</Text>
              </View>
            </View>
          </View>
        )}

        <BannerAd />

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ============================================================== */}
      {/* DAY DETAIL MODAL                                                */}
      {/* ============================================================== */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalSheetHeader}>
              <View>
                <Text style={styles.modalSheetEyebrow}>DAILY RECORD</Text>
                <Text style={styles.modalSheetTitle}>
                  {selectedDate ? formatDisplayDate(selectedDate) : "Activity Detail"}
                </Text>
                <Text style={styles.modalSheetSub}>{selectedDate}</Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => setDetailModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {loadingDetail ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.mutedText}>Retrieving records...</Text>
                </View>
              ) : !dayDetail ? (
                <Text style={styles.mutedText}>No details available.</Text>
              ) : (
                <>
                  {/* Workout Section */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>🏋️ WORKOUTS</Text>
                    {dayDetail.workout.sessions.length === 0 ? (
                      <Text style={styles.mutedText}>No workouts recorded for this day.</Text>
                    ) : (
                      dayDetail.workout.sessions.map((sess: any, idx: number) => (
                        <View key={sess._id || idx} style={styles.detailWorkoutBox}>
                          <View style={styles.cardHeader}>
                            <Text style={styles.detailSessionTitle}>
                              {sess.title || "Workout Session"}
                            </Text>
                            <Text style={styles.metaBadge}>
                              {sess.durationMinutes || 0} min · {sess.caloriesBurned || 0} kcal
                            </Text>
                          </View>

                          {(sess.exercises || []).map((ex: any, eIdx: number) => (
                            <View key={eIdx} style={styles.detailExerciseRow}>
                              <Text style={styles.detailExerciseName}>
                                • {ex.exerciseName} ({ex.category || "General"})
                              </Text>
                              <Text style={styles.detailExerciseSets}>
                                {(ex.sets || [])
                                  .filter((s: any) => s.completed)
                                  .map((s: any) => `${s.reps}r @ ${s.weightKg}kg`)
                                  .join(" | ") || "Sets recorded"}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ))
                    )}
                  </View>

                  {/* Nutrition Section */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>🥗 NUTRITION</Text>
                    <View style={styles.nutritionSummaryBox}>
                      <Text style={styles.detailCalorieTotal}>
                        {Math.round(dayDetail.nutrition.consumed.calories)} /{" "}
                        {dayDetail.nutrition.targets.calories} kcal
                      </Text>
                      <Text style={styles.detailMacroRow}>
                        Protein: {Math.round(dayDetail.nutrition.consumed.protein)}g · Carbs:{" "}
                        {Math.round(dayDetail.nutrition.consumed.carbs)}g · Fats:{" "}
                        {Math.round(dayDetail.nutrition.consumed.fats)}g
                      </Text>
                    </View>

                    {dayDetail.nutrition.meals.length === 0 ? (
                      <Text style={styles.mutedText}>No food entries logged.</Text>
                    ) : (
                      dayDetail.nutrition.meals.map((meal: any, mIdx: number) => (
                        <View key={mIdx} style={styles.detailMealCard}>
                          <Text style={styles.detailMealName}>{meal.name}</Text>
                          {(meal.foods || []).map((food: any, fIdx: number) => (
                            <View key={fIdx} style={styles.detailFoodItem}>
                              <Text style={styles.foodItemName}>{food.name}</Text>
                              <Text style={styles.foodItemCals}>
                                {food.calories} kcal (P: {food.protein}g · C: {food.carbs}g · F:{" "}
                                {food.fats}g)
                              </Text>
                            </View>
                          ))}
                        </View>
                      ))
                    )}
                  </View>

                  {/* Water Section */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>💧 WATER INTAKE</Text>
                    <Text style={styles.detailWaterValue}>
                      {dayDetail.hydration.consumedMl} ml / {dayDetail.hydration.targetMl} ml
                    </Text>
                  </View>
                </>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  headerEyebrow: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "800",
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: "rgba(198, 255, 77, 0.08)",
  },
  refreshButtonText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  tabNav: {
    flexDirection: "row",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabButtonActive: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: 40,
  },
  sectionHeading: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  mutedText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 24,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 4,
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
  errorBox: {
    backgroundColor: "rgba(255, 119, 119, 0.15)",
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
  },
  activityCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardDate: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
  cardDateSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  statusBadgeCompleted: {
    backgroundColor: "rgba(198, 255, 77, 0.15)",
    borderColor: COLORS.primary,
  },
  statusBadgeInProgress: {
    backgroundColor: "rgba(255, 173, 102, 0.15)",
    borderColor: "#FFAD66",
  },
  statusBadgeNone: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  statusTextCompleted: {
    color: COLORS.primary,
  },
  statusTextInProgress: {
    color: "#FFAD66",
  },
  statusTextNone: {
    color: COLORS.textSecondary,
  },
  metricsRow: {
    flexDirection: "row",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: 12,
  },
  metricBlock: {
    flex: 1,
  },
  metricDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 10,
  },
  metricLabel: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  metricValue: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
    marginVertical: 4,
  },
  metricSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  cardFooter: {
    marginTop: 10,
    alignItems: "flex-end",
  },
  detailLink: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  loadMoreButton: {
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: "center",
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loadMoreText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  workoutCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sessionTitle: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  workoutMetaRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  metaBadge: {
    backgroundColor: COLORS.surfaceElevated,
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  exerciseListContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    gap: 8,
  },
  exerciseItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  exerciseNumberPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(198, 255, 77, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseNumberText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  exerciseItemName: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "600",
  },
  exerciseItemDetails: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  nutritionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calorieHighlight: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "800",
  },
  macroPillsRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 12,
  },
  macroPill: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.sm,
    padding: 8,
    borderLeftWidth: 3,
  },
  macroPillLabel: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  macroPillValue: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  mealsContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    gap: 6,
  },
  mealSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mealNameText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "600",
  },
  mealFoodList: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  mealCaloriesText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  monthNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: RADIUS.lg,
    marginBottom: 12,
  },
  monthNavArrow: {
    padding: 8,
  },
  monthNavArrowText: {
    color: COLORS.primary,
    fontSize: 16,
  },
  monthNavTitle: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "800",
  },
  monthNavSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  monthlyStatsBar: {
    flexDirection: "row",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 16,
  },
  monthlyStatItem: {
    flex: 1,
    alignItems: "center",
  },
  monthlyStatValue: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  monthlyStatLabel: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  dayCell: {
    width: "13%",
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  dayCellActive: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: "rgba(198, 255, 77, 0.3)",
  },
  dayCellToday: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  dayCellSelected: {
    backgroundColor: "rgba(198, 255, 77, 0.2)",
    borderColor: COLORS.primary,
  },
  dayCellNumber: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  dayCellNumberActive: {
    color: COLORS.white,
    fontWeight: "700",
  },
  dayCellNumberToday: {
    color: COLORS.primary,
    fontWeight: "800",
  },
  indicatorDots: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
  },
  dotWorkout: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  dotNutrition: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#65B8FF",
  },
  dotWater: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFAD66",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: "85%",
    padding: SPACING.lg,
  },
  modalSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 12,
  },
  modalSheetEyebrow: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  modalSheetTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  modalSheetSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: {
    color: COLORS.white,
    fontSize: 14,
  },
  modalScroll: {
    marginTop: 12,
  },
  modalLoading: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 8,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
  },
  detailWorkoutBox: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 8,
  },
  detailSessionTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
  },
  detailExerciseRow: {
    marginTop: 6,
  },
  detailExerciseName: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  detailExerciseSets: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginLeft: 8,
  },
  nutritionSummaryBox: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 8,
  },
  detailCalorieTotal: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "800",
  },
  detailMacroRow: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  detailMealCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: 10,
    marginBottom: 6,
  },
  detailMealName: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  detailFoodItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  foodItemName: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  foodItemCals: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  detailWaterValue: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },
});
