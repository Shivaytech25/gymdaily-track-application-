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

const MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"];
const WATER_GOAL_ML = 2500;
const CALORIE_GOAL = 2000;

type FoodEntry = {
  id: string | number;
  name: string;
  meal: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

type NutritionResponse = {
  foods?: FoodEntry[];
  entries?: FoodEntry[];
  data?: FoodEntry[] | { foods?: FoodEntry[]; entries?: FoodEntry[] };
  waterIntake?: number;
  water?: number | { amount?: number; totalMl?: number };
};

export default function NutritionScreen() {
  const { accessToken } = useAuth();

  const [activeMeal, setActiveMeal] = useState("Breakfast");
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [waterMl, setWaterMl] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingFood, setSavingFood] = useState(false);
  const [savingWater, setSavingWater] = useState(false);
  const [error, setError] = useState("");

  const [foodName, setFoodName] = useState("");
  const [foodCalories, setFoodCalories] = useState("");
  const [foodProtein, setFoodProtein] = useState("");
  const [foodCarbs, setFoodCarbs] = useState("");
  const [foodFats, setFoodFats] = useState("");
  const [showFoodForm, setShowFoodForm] = useState(false);

  const request = useCallback(
    async (path: string, options: RequestInit = {}) => {
      if (!accessToken) {
        throw new Error("Please log in to access nutrition tracking.");
      }

      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          ...options.headers,
        },
      });

      const text = await response.text();
      let result: any = {};

      if (text) {
        try {
          result = JSON.parse(text);
        } catch {
          throw new Error("Server returned an invalid response.");
        }
      }

      if (!response.ok) {
        throw new Error(
          result.message ||
            result.error ||
            `Request failed (${response.status})`,
        );
      }

      return result;
    },
    [accessToken],
  );

  const loadNutrition = useCallback(async () => {
    if (!accessToken) {
      setFoods([]);
      setWaterMl(0);
      setLoading(false);
      setError("Please log in to view your nutrition data.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [nutritionResult, waterResult] = await Promise.all([
        request("/nutrition"),
        request("/water"),
      ]);

      const nutritionData: NutritionResponse =
        nutritionResult.data ?? nutritionResult;

      const rawFoods =
        nutritionData.foods ??
        nutritionData.entries ??
        (Array.isArray(nutritionData.data)
          ? nutritionData.data
          : (nutritionData.data?.foods ?? nutritionData.data?.entries)) ??
        [];

      setFoods(
        rawFoods.map((food: any, index: number) => ({
          id: food.id ?? food._id ?? index,
          name: food.name ?? food.foodName ?? "Food",
          meal: food.meal ?? food.mealType ?? "Breakfast",
          calories: Number(food.calories ?? 0),
          protein: Number(food.protein ?? 0),
          carbs: Number(food.carbs ?? 0),
          fats: Number(food.fats ?? 0),
        })),
      );

      const waterData = waterResult.data ?? waterResult;
      const rawWater =
        waterData.totalMl ??
        waterData.waterIntake ??
        waterData.amount ??
        waterData.water?.totalMl ??
        waterData.water?.amount ??
        (typeof waterData.water === "number" ? waterData.water : 0);

      setWaterMl(Math.max(0, Number(rawWater) || 0));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load nutrition data.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, request]);

  useEffect(() => {
    loadNutrition();
  }, [loadNutrition]);

  const calories = foods.reduce((sum, food) => sum + food.calories, 0);
  const protein = foods.reduce((sum, food) => sum + food.protein, 0);
  const carbs = foods.reduce((sum, food) => sum + food.carbs, 0);
  const fats = foods.reduce((sum, food) => sum + food.fats, 0);

  const mealFoods = foods.filter((food) => food.meal === activeMeal);
  const waterProgress = Math.min(100, (waterMl / WATER_GOAL_ML) * 100);

  async function addFood() {
    const name = foodName.trim();
    const numericCalories = Number(foodCalories);
    const numericProtein = Number(foodProtein || 0);
    const numericCarbs = Number(foodCarbs || 0);
    const numericFats = Number(foodFats || 0);

    if (!name || foodCalories.trim() === "") {
      Alert.alert("Missing information", "Enter the food name and calories.");
      return;
    }

    const values = [numericCalories, numericProtein, numericCarbs, numericFats];

    if (
      values.some((value) => !Number.isFinite(value) || value < 0) ||
      values.some((value) => value > 100000)
    ) {
      Alert.alert(
        "Invalid values",
        "Enter valid non-negative nutrition values.",
      );
      return;
    }

    setSavingFood(true);

    try {
      const result = await request("/nutrition", {
        method: "POST",
        body: JSON.stringify({
          name,
          meal: activeMeal,
          calories: numericCalories,
          protein: numericProtein,
          carbs: numericCarbs,
          fats: numericFats,
        }),
      });

      const saved = result.data ?? result.food ?? result.entry ?? result;

      if (saved && (saved.id || saved._id)) {
        const newFood: FoodEntry = {
          id: saved.id ?? saved._id,
          name: saved.name ?? saved.foodName ?? name,
          meal: saved.meal ?? saved.mealType ?? activeMeal,
          calories: Number(saved.calories ?? numericCalories),
          protein: Number(saved.protein ?? numericProtein),
          carbs: Number(saved.carbs ?? numericCarbs),
          fats: Number(saved.fats ?? numericFats),
        };

        setFoods((current) => [...current, newFood]);
      } else {
        await loadNutrition();
      }

      setFoodName("");
      setFoodCalories("");
      setFoodProtein("");
      setFoodCarbs("");
      setFoodFats("");
      setShowFoodForm(false);
    } catch (err) {
      Alert.alert(
        "Could not save food",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSavingFood(false);
    }
  }

  async function changeWater(amount: number) {
    const nextAmount = Math.max(0, waterMl + amount);

    if (nextAmount === waterMl || savingWater) return;

    const previousAmount = waterMl;
    setWaterMl(nextAmount);
    setSavingWater(true);

    try {
      await request("/water", {
        method: "POST",
        body: JSON.stringify({
          amount: nextAmount,
          totalMl: nextAmount,
        }),
      });
    } catch (err) {
      setWaterMl(previousAmount);
      Alert.alert(
        "Could not update water",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSavingWater(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>FUEL YOUR PROGRESS</Text>
        <Text style={styles.title}>Nutrition</Text>
        <Text style={styles.subtitle}>Eat with purpose. Recover stronger.</Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.mutedText}>Loading your nutrition...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Unable to load your data</Text>
            <Text style={styles.mutedText}>{error}</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={loadNutrition}
            >
              <Text style={styles.primaryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.calorieCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.label}>CALORIES CONSUMED</Text>
                  <View style={styles.valueRow}>
                    <Text style={styles.calorieValue}>
                      {Math.round(calories)}
                    </Text>
                    <Text style={styles.unit}>kcal</Text>
                  </View>
                </View>
                <View style={styles.calorieIcon}>
                  <Text style={styles.iconText}>KCAL</Text>
                </View>
              </View>

              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.min(
                        100,
                        (calories / CALORIE_GOAL) * 100,
                      )}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.cardHeader}>
                <Text style={styles.mutedText}>
                  Daily target: {CALORIE_GOAL.toLocaleString()} kcal
                </Text>
                <Text style={styles.remaining}>
                  {Math.max(0, CALORIE_GOAL - calories)} left
                </Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Macronutrients</Text>
              <Text style={styles.sectionMeta}>DAILY TOTALS</Text>
            </View>

            <View style={styles.macroCard}>
              <MacroRow
                name="Protein"
                amount={protein}
                target={150}
                color={COLORS.primary}
              />
              <MacroRow
                name="Carbohydrates"
                amount={carbs}
                target={220}
                color="#65B8FF"
              />
              <MacroRow name="Fats" amount={fats} target={65} color="#FFAD66" />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Food diary</Text>
              <Text style={styles.sectionMeta}>{foods.length} ENTRIES</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mealList}
            >
              {MEALS.map((meal) => {
                const selected = activeMeal === meal;
                const count = foods.filter((food) => food.meal === meal).length;

                return (
                  <TouchableOpacity
                    key={meal}
                    onPress={() => setActiveMeal(meal)}
                    style={[styles.mealChip, selected && styles.mealChipActive]}
                  >
                    <Text
                      style={[
                        styles.mealText,
                        selected && styles.mealTextActive,
                      ]}
                    >
                      {meal}
                    </Text>
                    <Text
                      style={[
                        styles.mealCount,
                        selected && styles.mealTextActive,
                      ]}
                    >
                      {count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.foodSection}>
              {mealFoods.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>＋</Text>
                  <Text style={styles.emptyTitle}>Nothing logged yet</Text>
                  <Text style={styles.mutedText}>
                    Add food to track calories and macros for{" "}
                    {activeMeal.toLowerCase()}.
                  </Text>
                </View>
              ) : (
                mealFoods.map((food) => (
                  <View key={food.id} style={styles.foodRow}>
                    <View style={styles.foodIcon}>
                      <Text style={styles.iconText}>F</Text>
                    </View>
                    <View style={styles.foodInfo}>
                      <Text style={styles.foodName}>{food.name}</Text>
                      <Text style={styles.mutedText}>
                        P {food.protein} g · C {food.carbs} g · F {food.fats} g
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.foodCalories}>{food.calories}</Text>
                      <Text style={styles.mutedText}>kcal</Text>
                    </View>
                  </View>
                ))
              )}

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setShowFoodForm((visible) => !visible)}
              >
                <Text style={styles.primaryButtonText}>
                  {showFoodForm ? "Cancel" : "+ Add food"}
                </Text>
              </TouchableOpacity>

              {showFoodForm && (
                <View style={styles.form}>
                  <Text style={styles.formTitle}>Add to {activeMeal}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Food name (e.g. Paneer)"
                    placeholderTextColor={COLORS.textSecondary}
                    value={foodName}
                    onChangeText={setFoodName}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Calories (kcal)"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="numeric"
                    value={foodCalories}
                    onChangeText={setFoodCalories}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Protein (g)"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="numeric"
                    value={foodProtein}
                    onChangeText={setFoodProtein}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Carbohydrates (g)"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="numeric"
                    value={foodCarbs}
                    onChangeText={setFoodCarbs}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Fats (g)"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="numeric"
                    value={foodFats}
                    onChangeText={setFoodFats}
                  />
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      savingFood && styles.disabled,
                    ]}
                    onPress={addFood}
                    disabled={savingFood}
                  >
                    {savingFood ? (
                      <ActivityIndicator color={COLORS.background} />
                    ) : (
                      <Text style={styles.primaryButtonText}>Save food</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Hydration</Text>
              <Text style={styles.sectionMeta}>GOAL 2.5 L</Text>
            </View>

            <View style={styles.waterCard}>
              <Text style={styles.label}>WATER INTAKE</Text>
              <View style={styles.valueRow}>
                <Text style={styles.waterValue}>
                  {(waterMl / 1000).toFixed(2)}
                </Text>
                <Text style={styles.unit}>L</Text>
              </View>
              <Text style={styles.mutedText}>
                {waterMl.toLocaleString()} ml of{" "}
                {WATER_GOAL_ML.toLocaleString()} ml
              </Text>

              <View style={styles.track}>
                <View
                  style={[styles.waterFill, { width: `${waterProgress}%` }]}
                />
              </View>

              <View style={styles.waterButtons}>
                <TouchableOpacity
                  style={styles.waterMinus}
                  onPress={() => changeWater(-250)}
                  disabled={waterMl === 0 || savingWater}
                >
                  <Text style={styles.waterButtonText}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.waterAdd, savingWater && styles.disabled]}
                  onPress={() => changeWater(250)}
                  disabled={savingWater}
                >
                  {savingWater ? (
                    <ActivityIndicator color="#65B8FF" />
                  ) : (
                    <Text style={styles.waterAddText}>+ Add 250 ml</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        <Text style={styles.footer}>NEXFIT · EAT SMARTER</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MacroRow({
  name,
  amount,
  target,
  color,
}: {
  name: string;
  amount: number;
  target: number;
  color: string;
}) {
  return (
    <View style={styles.macroRow}>
      <View style={styles.cardHeader}>
        <Text style={styles.macroName}>{name}</Text>
        <Text style={styles.macroAmount}>
          {Math.round(amount)}{" "}
          <Text style={styles.mutedText}>/ {target} g</Text>
        </Text>
      </View>
      <View style={styles.macroTrack}>
        <View
          style={[
            styles.macroFill,
            {
              backgroundColor: color,
              width: `${Math.min(100, (amount / target) * 100)}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: SPACING.lg, paddingBottom: 36 },
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
    marginTop: 8,
    marginBottom: SPACING.xl,
  },
  calorieCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    marginBottom: SPACING.xxl,
    gap: SPACING.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
  },
  valueRow: { flexDirection: "row", alignItems: "baseline", gap: 7 },
  calorieValue: {
    color: COLORS.text,
    fontSize: 39,
    fontWeight: "900",
    letterSpacing: -1,
  },
  unit: { color: COLORS.textSecondary, fontSize: 13 },
  calorieIcon: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconText: { color: COLORS.primary, fontSize: 10, fontWeight: "900" },
  track: {
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    overflow: "hidden",
    marginVertical: 8,
  },
  fill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  remaining: { color: COLORS.primary, fontSize: 11, fontWeight: "800" },
  mutedText: { color: COLORS.textSecondary, fontSize: 11 },
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
  macroCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xxl,
    gap: SPACING.xl,
  },
  macroRow: { gap: 9 },
  macroName: { color: COLORS.text, fontSize: 12, fontWeight: "700" },
  macroAmount: { color: COLORS.text, fontSize: 12, fontWeight: "800" },
  macroTrack: {
    height: 6,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.full,
    overflow: "hidden",
  },
  macroFill: { height: "100%", borderRadius: RADIUS.full },
  mealList: { gap: 8, paddingBottom: SPACING.lg },
  mealChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mealChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  mealText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: "700" },
  mealTextActive: { color: COLORS.background },
  mealCount: { color: COLORS.textSecondary, fontSize: 10, fontWeight: "800" },
  foodSection: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  emptyState: { alignItems: "center", paddingVertical: SPACING.xl, gap: 10 },
  emptyIcon: {
    color: COLORS.primary,
    fontSize: 30,
    backgroundColor: COLORS.surfaceElevated,
    width: 46,
    height: 46,
    textAlign: "center",
    textAlignVertical: "center",
    borderRadius: RADIUS.full,
    overflow: "hidden",
  },
  emptyTitle: { color: COLORS.text, fontSize: 14, fontWeight: "800" },
  foodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  foodIcon: {
    width: 39,
    height: 39,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  foodInfo: { flex: 1, gap: 5 },
  foodName: { color: COLORS.text, fontSize: 12, fontWeight: "800" },
  foodCalories: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "right",
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginTop: SPACING.lg,
  },
  primaryButtonText: {
    color: COLORS.background,
    fontSize: 13,
    fontWeight: "900",
  },
  form: { marginTop: SPACING.lg, gap: 10 },
  formTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  input: {
    color: COLORS.text,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 13,
  },
  waterCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  waterValue: { color: COLORS.text, fontSize: 31, fontWeight: "900" },
  waterFill: {
    height: "100%",
    backgroundColor: "#65B8FF",
    borderRadius: RADIUS.full,
  },
  waterButtons: {
    flexDirection: "row",
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  waterMinus: {
    width: 47,
    height: 45,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  waterButtonText: { color: COLORS.text, fontSize: 23, fontWeight: "500" },
  waterAdd: {
    flex: 1,
    height: 45,
    borderRadius: RADIUS.md,
    backgroundColor: "#203044",
    alignItems: "center",
    justifyContent: "center",
  },
  waterAddText: { color: "#65B8FF", fontSize: 12, fontWeight: "800" },
  loadingBox: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  errorCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  errorTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 8,
  },
  disabled: { opacity: 0.55 },
  footer: {
    color: COLORS.textSecondary,
    textAlign: "center",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: SPACING.xxl,
  },
});
