import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../../constants/theme";
import { API_BASE_URL } from "../../services/apiConfig";
import { useAuth } from "../../context/AuthContext";
import { getLocalDateString, useDayChangeDetector } from "../../utils/dateUtils";
import {
  CustomFoodItem,
  NutritionTargets,
  createCustomFood,
  deleteCustomFood,
  fetchCustomFoods,
  fetchNutritionTargets,
  updateCustomFood,
  updateNutritionTargets,
} from "../../services/nutritionApi";

const PRESET_MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"];
const WATER_GOAL_ML = 2500;
const DEFAULT_TARGETS: NutritionTargets = {
  calories: 2000,
  protein: 150,
  carbs: 220,
  fats: 65,
  fiber: 25,
};

type FoodEntry = {
  id: string | number;
  mealId?: string;
  foodId?: string;
  name: string;
  meal: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  quantity?: number;
  unit?: string;
};

type TempMealItem = {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  customFoodId?: string;
};

export default function NutritionScreen() {
  const { accessToken, isAuthenticated, isInitializing, signOut } = useAuth();
  const router = useRouter();

  const today = useDayChangeDetector(() => {
    void loadNutrition();
  });

  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [activeMeal, setActiveMeal] = useState("Breakfast");
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [targets, setTargets] = useState<NutritionTargets>(DEFAULT_TARGETS);
  const [customFoods, setCustomFoods] = useState<CustomFoodItem[]>([]);

  const [waterMl, setWaterMl] = useState(0);
  const [waterGoalMl, setWaterGoalMl] = useState(WATER_GOAL_ML);
  const [waterEntries, setWaterEntries] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingFood, setSavingFood] = useState(false);
  const [savingWater, setSavingWater] = useState(false);
  const [error, setError] = useState("");

  // Target editing modal
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetCalories, setTargetCalories] = useState("2000");
  const [targetProtein, setTargetProtein] = useState("150");
  const [targetCarbs, setTargetCarbs] = useState("220");
  const [targetFats, setTargetFats] = useState("65");
  const [savingTargets, setSavingTargets] = useState(false);

  // Custom Food Management modal
  const [showCustomFoodModal, setShowCustomFoodModal] = useState(false);
  const [customFoodFormOpen, setCustomFoodFormOpen] = useState(false);
  const [editingCustomFood, setEditingCustomFood] = useState<CustomFoodItem | null>(null);
  const [cfName, setCfName] = useState("");
  const [cfCalories, setCfCalories] = useState("");
  const [cfProtein, setCfProtein] = useState("");
  const [cfCarbs, setCfCarbs] = useState("");
  const [cfFats, setCfFats] = useState("");
  const [cfServingSize, setCfServingSize] = useState("100");
  const [cfServingUnit, setCfServingUnit] = useState("g");
  const [savingCustomFood, setSavingCustomFood] = useState(false);

  // Single food quick-add / edit
  const [foodName, setFoodName] = useState("");
  const [foodCalories, setFoodCalories] = useState("");
  const [foodProtein, setFoodProtein] = useState("");
  const [foodCarbs, setFoodCarbs] = useState("");
  const [foodFats, setFoodFats] = useState("");
  const [showFoodForm, setShowFoodForm] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodEntry | null>(null);

  // Add Multi-Item Meal modal
  const [showMealModal, setShowMealModal] = useState(false);
  const [mealModalName, setMealModalName] = useState("Breakfast");
  const [customMealNameInput, setCustomMealNameInput] = useState("");
  const [mealItems, setMealItems] = useState<TempMealItem[]>([]);
  const [savingMeal, setSavingMeal] = useState(false);

  // Item builder inside Meal Modal
  const [itemSource, setItemSource] = useState<"custom" | "manual">("custom");
  const [selectedCustomFoodId, setSelectedCustomFoodId] = useState<string>("");
  const [itemMultiplier, setItemMultiplier] = useState("1");
  const [manualItemName, setManualItemName] = useState("");
  const [manualItemCals, setManualItemCals] = useState("");
  const [manualItemProt, setManualItemProt] = useState("");
  const [manualItemCarbs, setManualItemCarbs] = useState("");
  const [manualItemFats, setManualItemFats] = useState("");
  const [manualItemUnit, setManualItemUnit] = useState("serving");

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
        if (response.status === 401 && result.expired) {
          void signOut();
        }
        throw new Error(
          result.message ||
            result.error ||
            `Request failed (${response.status})`,
        );
      }

      return result;
    },
    [accessToken, signOut],
  );

  const loadNutrition = useCallback(async () => {
    if (isInitializing) return;

    if (!isAuthenticated || !accessToken) {
      setFoods([]);
      setWaterMl(0);
      setWaterEntries([]);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [nutritionResult, waterResult, customFoodList, userTargets] =
        await Promise.all([
          request(`/nutrition?date=${selectedDate}`),
          request(`/water?date=${selectedDate}`),
          fetchCustomFoods(accessToken).catch(() => []),
          fetchNutritionTargets(accessToken).catch(() => DEFAULT_TARGETS),
        ]);

      setCustomFoods(customFoodList);

      const log = nutritionResult.log || nutritionResult;
      const loadedFoods: FoodEntry[] = [];

      if (Array.isArray(log?.meals)) {
        for (const meal of log.meals) {
          const mealName = meal.name || "Breakfast";
          const mealId = meal._id ? String(meal._id) : undefined;
          if (Array.isArray(meal.foods)) {
            for (const food of meal.foods) {
              const foodId = food._id ? String(food._id) : undefined;
              loadedFoods.push({
                id:
                  food.id ??
                  food._id ??
                  `${mealName}-${food.name}-${loadedFoods.length}`,
                mealId,
                foodId,
                name: food.name ?? food.foodName ?? "Food",
                meal: mealName,
                calories: Number(food.calories ?? 0),
                protein: Number(food.protein ?? 0),
                carbs: Number(food.carbs ?? 0),
                fats: Number(food.fats ?? 0),
                quantity: food.quantity,
                unit: food.unit,
              });
            }
          }
        }
      }

      setFoods(loadedFoods);

      // Use target from log or fallback to userTargets
      const activeTargets: NutritionTargets = {
        calories: Number(log?.dailyTargets?.calories || userTargets.calories || 2000),
        protein: Number(log?.dailyTargets?.protein || userTargets.protein || 150),
        carbs: Number(log?.dailyTargets?.carbs || userTargets.carbs || 220),
        fats: Number(log?.dailyTargets?.fats || userTargets.fats || 65),
        fiber: Number(log?.dailyTargets?.fiber || userTargets.fiber || 25),
      };
      setTargets(activeTargets);
      setTargetCalories(String(activeTargets.calories));
      setTargetProtein(String(activeTargets.protein));
      setTargetCarbs(String(activeTargets.carbs));
      setTargetFats(String(activeTargets.fats));

      const waterData = waterResult.data ?? waterResult;
      setWaterMl(Math.max(0, Number(waterData.totalMl ?? 0)));
      if (waterData.dailyTargetMl && Number(waterData.dailyTargetMl) > 0) {
        setWaterGoalMl(Number(waterData.dailyTargetMl));
      }
      if (Array.isArray(waterData.entries)) {
        setWaterEntries(waterData.entries);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load nutrition data.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, isAuthenticated, request, selectedDate]);

  useEffect(() => {
    if (!isInitializing) {
      void loadNutrition();
    }
  }, [isInitializing, loadNutrition]);

  useFocusEffect(
    useCallback(() => {
      if (!isInitializing && isAuthenticated) {
        void loadNutrition();
      }
    }, [isInitializing, isAuthenticated, loadNutrition])
  );

  const calories = foods.reduce((sum, food) => sum + food.calories, 0);
  const protein = foods.reduce((sum, food) => sum + food.protein, 0);
  const carbs = foods.reduce((sum, food) => sum + food.carbs, 0);
  const fats = foods.reduce((sum, food) => sum + food.fats, 0);

  const mealFoods = foods.filter((food) => food.meal === activeMeal);
  const waterProgress = Math.min(100, (waterMl / waterGoalMl) * 100);

  // Date shifting
  const shiftDate = (days: number) => {
    const parts = selectedDate.split("-");
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    d.setDate(d.getDate() + days);
    setSelectedDate(getLocalDateString(d));
  };

  const formatDisplayDate = (dateStr: string) => {
    if (dateStr === today) return "Today";
    const parts = dateStr.split("-");
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  };

  // --- TARGETS HANDLERS ---
  const handleSaveTargets = async () => {
    const cal = Number(targetCalories);
    const prot = Number(targetProtein);
    const carb = Number(targetCarbs);
    const fat = Number(targetFats);

    if (isNaN(cal) || cal <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid calorie target.");
      return;
    }

    setSavingTargets(true);
    try {
      if (!accessToken) throw new Error("Not logged in");
      const updated = await updateNutritionTargets(
        accessToken,
        {
          calories: cal,
          protein: isNaN(prot) ? 150 : prot,
          carbs: isNaN(carb) ? 220 : carb,
          fats: isNaN(fat) ? 65 : fat,
          fiber: targets.fiber || 25,
        },
        selectedDate
      );
      setTargets(updated);
      setShowTargetModal(false);
      Alert.alert("Targets Saved", "Your personalized nutrition targets have been updated.");
      await loadNutrition();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to update targets.");
    } finally {
      setSavingTargets(false);
    }
  };

  // --- CUSTOM FOOD HANDLERS ---
  const handleOpenCustomFoodForm = (food?: CustomFoodItem) => {
    if (food) {
      setEditingCustomFood(food);
      setCfName(food.name);
      setCfCalories(String(food.calories));
      setCfProtein(String(food.protein));
      setCfCarbs(String(food.carbs));
      setCfFats(String(food.fats));
      setCfServingSize(String(food.servingSize || 100));
      setCfServingUnit(food.servingUnit || "g");
    } else {
      setEditingCustomFood(null);
      setCfName("");
      setCfCalories("");
      setCfProtein("");
      setCfCarbs("");
      setCfFats("");
      setCfServingSize("100");
      setCfServingUnit("g");
    }
    setCustomFoodFormOpen(true);
  };

  const handleSaveCustomFood = async () => {
    const name = cfName.trim();
    const cals = Number(cfCalories);
    const prot = Number(cfProtein || 0);
    const carb = Number(cfCarbs || 0);
    const fat = Number(cfFats || 0);
    const size = Number(cfServingSize || 100);
    const unit = cfServingUnit.trim() || "g";

    if (!name || isNaN(cals) || cals < 0) {
      Alert.alert("Invalid Data", "Please enter a valid food name and calories.");
      return;
    }

    setSavingCustomFood(true);
    try {
      if (!accessToken) throw new Error("Not logged in");
      if (editingCustomFood?._id) {
        await updateCustomFood(accessToken, editingCustomFood._id, {
          name,
          calories: cals,
          protein: prot,
          carbs: carb,
          fats: fat,
          servingSize: size,
          servingUnit: unit,
        });
        Alert.alert("Success", "Custom food updated successfully.");
      } else {
        await createCustomFood(accessToken, {
          name,
          calories: cals,
          protein: prot,
          carbs: carb,
          fats: fat,
          servingSize: size,
          servingUnit: unit,
        });
        Alert.alert("Success", "Custom food added to your library.");
      }
      const refreshed = await fetchCustomFoods(accessToken);
      setCustomFoods(refreshed);
      setCustomFoodFormOpen(false);
      setEditingCustomFood(null);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to save custom food.");
    } finally {
      setSavingCustomFood(false);
    }
  };

  const handleDeleteCustomFood = (food: CustomFoodItem) => {
    Alert.alert(
      "Delete Custom Food",
      `Are you sure you want to delete "${food.name}"? Past meal logs using this food will remain untouched.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (!accessToken || !food._id) return;
              await deleteCustomFood(accessToken, food._id);
              const refreshed = await fetchCustomFoods(accessToken);
              setCustomFoods(refreshed);
              Alert.alert("Deleted", `"${food.name}" removed from your foods.`);
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "Failed to delete.");
            }
          },
        },
      ]
    );
  };

  // --- MULTI-ITEM MEAL BUILDER HANDLERS ---
  const handleOpenMealModal = () => {
    setMealModalName(activeMeal);
    setCustomMealNameInput("");
    setMealItems([]);
    setSelectedCustomFoodId(customFoods.length > 0 ? customFoods[0]._id || "" : "");
    setItemMultiplier("1");
    setManualItemName("");
    setManualItemCals("");
    setManualItemProt("");
    setManualItemCarbs("");
    setManualItemFats("");
    setManualItemUnit("serving");
    setShowMealModal(true);
  };

  const handleAddItemToMeal = () => {
    if (itemSource === "custom") {
      const selectedFood = customFoods.find((f) => f._id === selectedCustomFoodId);
      if (!selectedFood) {
        Alert.alert("Select Food", "Please select a custom food from your list.");
        return;
      }
      const mult = Number(itemMultiplier) || 1;
      if (mult <= 0) {
        Alert.alert("Invalid Quantity", "Multiplier must be greater than 0.");
        return;
      }

      const newItem: TempMealItem = {
        name: selectedFood.name,
        quantity: mult,
        unit: selectedFood.servingUnit || "serving",
        calories: Math.round(selectedFood.calories * mult),
        protein: Math.round(selectedFood.protein * mult * 10) / 10,
        carbs: Math.round(selectedFood.carbs * mult * 10) / 10,
        fats: Math.round(selectedFood.fats * mult * 10) / 10,
        customFoodId: selectedFood._id,
      };

      setMealItems((prev) => [...prev, newItem]);
      setItemMultiplier("1");
    } else {
      const name = manualItemName.trim();
      const cals = Number(manualItemCals);
      const prot = Number(manualItemProt || 0);
      const carb = Number(manualItemCarbs || 0);
      const fat = Number(manualItemFats || 0);

      if (!name || isNaN(cals) || cals < 0) {
        Alert.alert("Missing Info", "Please enter food name and calories.");
        return;
      }

      const newItem: TempMealItem = {
        name,
        quantity: 1,
        unit: manualItemUnit.trim() || "serving",
        calories: Math.round(cals),
        protein: Math.round(prot * 10) / 10,
        carbs: Math.round(carb * 10) / 10,
        fats: Math.round(fat * 10) / 10,
      };

      setMealItems((prev) => [...prev, newItem]);
      setManualItemName("");
      setManualItemCals("");
      setManualItemProt("");
      setManualItemCarbs("");
      setManualItemFats("");
    }
  };

  const handleRemoveItemFromMeal = (index: number) => {
    setMealItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveCompleteMeal = async () => {
    const finalMealName =
      mealModalName === "Custom"
        ? customMealNameInput.trim() || "Custom Meal"
        : mealModalName;

    if (mealItems.length === 0) {
      Alert.alert("Empty Meal", "Please add at least one food item to this meal.");
      return;
    }

    setSavingMeal(true);
    try {
      await request(`/nutrition/meal?date=${selectedDate}`, {
        method: "POST",
        body: JSON.stringify({
          name: finalMealName,
          foods: mealItems.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fats: item.fats,
            fiber: 0,
          })),
        }),
      });

      setShowMealModal(false);
      setActiveMeal(finalMealName);
      await loadNutrition();
      Alert.alert("Meal Logged", `Successfully saved ${finalMealName} with ${mealItems.length} items.`);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to save meal.");
    } finally {
      setSavingMeal(false);
    }
  };

  // --- DELETE / EDIT FOOD IN CURRENT LIST ---
  const deleteFood = async (food: FoodEntry) => {
    if (!food.mealId) {
      Alert.alert("Notice", "This entry cannot be deleted directly.");
      return;
    }

    Alert.alert("Delete Item", `Remove "${food.name}" from ${food.meal}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const queryParams = [`date=${selectedDate}`];
            if (food.foodId) {
              queryParams.push(`foodId=${encodeURIComponent(food.foodId)}`);
            }
            await request(`/nutrition/meal/${food.mealId}?${queryParams.join("&")}`, {
              method: "DELETE",
            });
            await loadNutrition();
          } catch (err) {
            Alert.alert(
              "Error",
              err instanceof Error ? err.message : "Failed to delete food item."
            );
          }
        },
      },
    ]);
  };

  const handleStartEditFood = (food: FoodEntry) => {
    setEditingFood(food);
    setActiveMeal(food.meal);
    setFoodName(food.name);
    setFoodCalories(String(food.calories));
    setFoodProtein(String(food.protein));
    setFoodCarbs(String(food.carbs));
    setFoodFats(String(food.fats));
    setShowFoodForm(true);
  };

  const handleCancelForm = () => {
    setEditingFood(null);
    setFoodName("");
    setFoodCalories("");
    setFoodProtein("");
    setFoodCarbs("");
    setFoodFats("");
    setShowFoodForm(false);
  };

  async function addQuickFood() {
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
      Alert.alert("Invalid values", "Enter valid non-negative nutrition values.");
      return;
    }

    setSavingFood(true);
    try {
      if (editingFood && editingFood.mealId && editingFood.foodId) {
        await request(
          `/nutrition/meal/${editingFood.mealId}/food/${editingFood.foodId}?date=${selectedDate}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              name,
              calories: numericCalories,
              protein: numericProtein,
              carbs: numericCarbs,
              fats: numericFats,
            }),
          }
        );
      } else {
        await request(`/nutrition/meal?date=${selectedDate}`, {
          method: "POST",
          body: JSON.stringify({
            name: activeMeal,
            foods: [
              {
                name,
                quantity: 1,
                unit: "serving",
                calories: numericCalories,
                protein: numericProtein,
                carbs: numericCarbs,
                fats: numericFats,
                fiber: 0,
              },
            ],
          }),
        });
      }

      await loadNutrition();
      handleCancelForm();
    } catch (err) {
      Alert.alert("Could not save food", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSavingFood(false);
    }
  }

  // Water tracking
  const changeWaterTarget = async (newTargetMl: number) => {
    try {
      await request(`/water/target?date=${selectedDate}`, {
        method: "PATCH",
        body: JSON.stringify({ dailyTargetMl: newTargetMl }),
      });
      setWaterGoalMl(newTargetMl);
      Alert.alert("Goal Updated", `Daily water target set to ${newTargetMl.toLocaleString()} ml.`);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to update target.");
    }
  };

  async function changeWater(amount: number) {
    if (savingWater) return;
    const previousAmount = waterMl;
    const nextAmount = Math.max(0, waterMl + amount);
    if (nextAmount === waterMl && amount <= 0) return;

    setSavingWater(true);
    try {
      if (amount > 0) {
        const result = await request(`/water/entries?date=${selectedDate}`, {
          method: "POST",
          body: JSON.stringify({ amountMl: amount }),
        });
        const data = result.data ?? result;
        setWaterMl(Math.max(0, Number(data.totalMl ?? nextAmount)));
        if (Array.isArray(data.entries)) {
          setWaterEntries(data.entries);
        }
      } else if (waterEntries.length > 0) {
        const lastEntry = waterEntries[waterEntries.length - 1];
        if (lastEntry?._id) {
          const result = await request(
            `/water/entries/${lastEntry._id}?date=${selectedDate}`,
            { method: "DELETE" }
          );
          const data = result.data ?? result;
          setWaterMl(Math.max(0, Number(data.totalMl ?? nextAmount)));
          if (Array.isArray(data.entries)) {
            setWaterEntries(data.entries);
          }
        } else {
          setWaterMl(nextAmount);
        }
      } else {
        setWaterMl(nextAmount);
      }
    } catch (err) {
      setWaterMl(previousAmount);
      Alert.alert("Could not update water", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSavingWater(false);
    }
  }

  // Active meals list including dynamic meals logged
  const existingMealNames = Array.from(new Set(foods.map((f) => f.meal)));
  const allMealTabs = Array.from(new Set([...PRESET_MEALS, ...existingMealNames]));

  // Totals in Meal Builder modal
  const modalTotalCals = mealItems.reduce((s, i) => s + i.calories, 0);
  const modalTotalProt = Math.round(mealItems.reduce((s, i) => s + i.protein, 0) * 10) / 10;
  const modalTotalCarbs = Math.round(mealItems.reduce((s, i) => s + i.carbs, 0) * 10) / 10;
  const modalTotalFats = Math.round(mealItems.reduce((s, i) => s + i.fats, 0) * 10) / 10;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topHeaderRow}>
          <View>
            <Text style={styles.eyebrow}>FUEL YOUR PROGRESS</Text>
            <Text style={styles.title}>Nutrition</Text>
          </View>

          {/* Quick Action Buttons: Targets & Custom Foods */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerPillBtn}
              onPress={() => setShowTargetModal(true)}
            >
              <Text style={styles.headerPillText}>🎯 Targets</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerPillBtn, styles.headerPillBtnPrimary]}
              onPress={() => setShowCustomFoodModal(true)}
            >
              <Text style={[styles.headerPillText, styles.headerPillTextPrimary]}>
                + My Food
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Navigation Bar */}
        <View style={styles.dateNavRow}>
          <TouchableOpacity
            style={styles.dateNavArrow}
            onPress={() => shiftDate(-1)}
          >
            <Text style={styles.dateNavArrowText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.dateCenterBox}>
            <Text style={styles.dateMainText}>{formatDisplayDate(selectedDate)}</Text>
            <Text style={styles.dateSubText}>{selectedDate}</Text>
          </View>

          <TouchableOpacity
            style={styles.dateNavArrow}
            onPress={() => shiftDate(1)}
          >
            <Text style={styles.dateNavArrowText}>›</Text>
          </TouchableOpacity>

          {selectedDate !== today && (
            <TouchableOpacity
              style={styles.todayPill}
              onPress={() => setSelectedDate(today)}
            >
              <Text style={styles.todayPillText}>TODAY</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isAuthenticated || !accessToken ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Sign in required</Text>
            <Text style={styles.mutedText}>
              Please sign in to track your meals, custom foods, and nutrition targets.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push("/login")}
            >
              <Text style={styles.primaryButtonText}>SIGN IN</Text>
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.mutedText}>Loading nutrition data...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Unable to load your data</Text>
            <Text style={styles.mutedText}>{error}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={loadNutrition}>
              <Text style={styles.primaryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Calories Card */}
            <View style={styles.calorieCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.label}>CALORIES CONSUMED</Text>
                  <View style={styles.valueRow}>
                    <Text style={styles.calorieValue}>{Math.round(calories)}</Text>
                    <Text style={styles.unit}>kcal</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.calorieIcon}
                  onPress={() => setShowTargetModal(true)}
                >
                  <Text style={styles.iconText}>EDIT TARGET</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.min(
                        100,
                        (calories / (targets.calories || 2000)) * 100
                      )}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.cardHeader}>
                <Text style={styles.mutedText}>
                  Daily target: {targets.calories.toLocaleString()} kcal
                </Text>
                <Text style={styles.remaining}>
                  {Math.max(0, targets.calories - calories)} left
                </Text>
              </View>
            </View>

            {/* Macros Card */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Macronutrients</Text>
              <TouchableOpacity onPress={() => setShowTargetModal(true)}>
                <Text style={[styles.sectionMeta, { color: COLORS.primary }]}>
                  EDIT TARGETS ✎
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.macroCard}>
              <MacroRow
                name="Protein"
                amount={protein}
                target={targets.protein}
                color={COLORS.primary}
              />
              <MacroRow
                name="Carbohydrates"
                amount={carbs}
                target={targets.carbs}
                color="#65B8FF"
              />
              <MacroRow
                name="Fats"
                amount={fats}
                target={targets.fats}
                color="#FFAD66"
              />
            </View>

            {/* Food Diary Section */}
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Food Diary</Text>
                <Text style={styles.sectionMeta}>{foods.length} ENTRIES LOGGED</Text>
              </View>

              <TouchableOpacity
                style={styles.addMealButton}
                onPress={handleOpenMealModal}
              >
                <Text style={styles.addMealButtonText}>+ Add Meal</Text>
              </TouchableOpacity>
            </View>

            {/* Meal Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mealList}
            >
              {allMealTabs.map((meal) => {
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

            {/* Meal Foods List */}
            <View style={styles.foodSection}>
              <View style={styles.mealSectionHeader}>
                <Text style={styles.mealSectionTitle}>{activeMeal}</Text>
                <Text style={styles.mealSectionCalories}>
                  {mealFoods.reduce((s, f) => s + f.calories, 0)} kcal
                </Text>
              </View>

              {mealFoods.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>＋</Text>
                  <Text style={styles.emptyTitle}>Nothing logged in {activeMeal}</Text>
                  <Text style={styles.mutedText}>
                    Use "+ Add Meal" or quick add below to log food.
                  </Text>
                </View>
              ) : (
                mealFoods.map((food) => (
                  <View key={food.id} style={styles.foodRow}>
                    <View style={styles.foodIcon}>
                      <Text style={styles.iconText}>🍽</Text>
                    </View>
                    <View style={styles.foodInfo}>
                      <Text style={styles.foodName}>{food.name}</Text>
                      <Text style={styles.mutedText}>
                        P {food.protein}g · C {food.carbs}g · F {food.fats}g
                        {food.unit ? ` (${food.quantity ?? 1} ${food.unit})` : ""}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.foodCalories}>{food.calories}</Text>
                      <Text style={styles.mutedText}>kcal</Text>
                    </View>
                    {Boolean(food.mealId && food.foodId) && (
                      <TouchableOpacity
                        onPress={() => handleStartEditFood(food)}
                        style={{ padding: 6, marginLeft: 6 }}
                        accessibilityLabel={`Edit ${food.name}`}
                      >
                        <Text style={{ color: COLORS.primary, fontSize: 16 }}>✏️</Text>
                      </TouchableOpacity>
                    )}
                    {Boolean(food.mealId) && (
                      <TouchableOpacity
                        onPress={() => deleteFood(food)}
                        style={{ padding: 6, marginLeft: 4 }}
                        accessibilityLabel={`Delete ${food.name}`}
                      >
                        <Text style={{ color: COLORS.danger, fontSize: 16 }}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}

              {/* Quick Add Single Item to Current Tab */}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() =>
                  showFoodForm ? handleCancelForm() : setShowFoodForm(true)
                }
              >
                <Text style={styles.secondaryButtonText}>
                  {showFoodForm ? "Cancel Quick Add" : `+ Quick Add Single Item to ${activeMeal}`}
                </Text>
              </TouchableOpacity>

              {showFoodForm && (
                <View style={styles.form}>
                  <Text style={styles.formTitle}>
                    {editingFood ? `Edit Food in ${activeMeal}` : `Quick Add to ${activeMeal}`}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Food name (e.g. Oatmeal)"
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
                    onPress={addQuickFood}
                    disabled={savingFood}
                  >
                    {savingFood ? (
                      <ActivityIndicator color={COLORS.background} />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        {editingFood ? "Update Item" : "Save Item"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Hydration Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Hydration</Text>
              <Text style={styles.sectionMeta}>
                GOAL {(waterGoalMl / 1000).toFixed(1)} L
              </Text>
            </View>

            <View style={styles.waterCard}>
              <Text style={styles.label}>WATER INTAKE</Text>
              <View style={styles.valueRow}>
                <Text style={styles.waterValue}>
                  {(waterMl / 1000).toFixed(2)}
                </Text>
                <Text style={styles.unit}>L</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    "Set Daily Water Target",
                    "Select your preferred daily hydration goal:",
                    [
                      { text: "2.0 L (2000 ml)", onPress: () => changeWaterTarget(2000) },
                      { text: "2.5 L (2500 ml)", onPress: () => changeWaterTarget(2500) },
                      { text: "3.0 L (3000 ml)", onPress: () => changeWaterTarget(3000) },
                      { text: "3.5 L (3500 ml)", onPress: () => changeWaterTarget(3500) },
                      { text: "Cancel", style: "cancel" },
                    ]
                  );
                }}
              >
                <Text style={styles.mutedText}>
                  {waterMl.toLocaleString()} ml of{" "}
                  <Text style={{ color: COLORS.primary, fontWeight: "700" }}>
                    {waterGoalMl.toLocaleString()} ml ✎
                  </Text>
                </Text>
              </TouchableOpacity>

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

      {/* --- MODAL 1: EDIT PERSONALIZED TARGETS --- */}
      <Modal
        visible={showTargetModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTargetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Personalized Targets</Text>
              <TouchableOpacity onPress={() => setShowTargetModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSubtitle}>
                Set your daily calorie and macronutrient targets. Updating targets preserves all historical logs.
              </Text>

              <Text style={styles.inputLabel}>Daily Calorie Target (kcal) *</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={targetCalories}
                onChangeText={setTargetCalories}
                placeholder="2000"
                placeholderTextColor={COLORS.textSecondary}
              />

              <Text style={styles.inputLabel}>Protein Target (g)</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={targetProtein}
                onChangeText={setTargetProtein}
                placeholder="150"
                placeholderTextColor={COLORS.textSecondary}
              />

              <Text style={styles.inputLabel}>Carbohydrates Target (g)</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={targetCarbs}
                onChangeText={setTargetCarbs}
                placeholder="220"
                placeholderTextColor={COLORS.textSecondary}
              />

              <Text style={styles.inputLabel}>Fats Target (g)</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={targetFats}
                onChangeText={setTargetFats}
                placeholder="65"
                placeholderTextColor={COLORS.textSecondary}
              />

              <TouchableOpacity
                style={[styles.primaryButton, savingTargets && styles.disabled]}
                onPress={handleSaveTargets}
                disabled={savingTargets}
              >
                {savingTargets ? (
                  <ActivityIndicator color={COLORS.background} />
                ) : (
                  <Text style={styles.primaryButtonText}>Save Daily Targets</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* --- MODAL 2: CUSTOM FOODS MANAGEMENT ("Add My Food") --- */}
      <Modal
        visible={showCustomFoodModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowCustomFoodModal(false);
          setCustomFoodFormOpen(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "85%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {customFoodFormOpen
                  ? editingCustomFood
                    ? "Edit Custom Food"
                    : "Add My Food"
                  : "My Custom Foods"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCustomFoodModal(false);
                  setCustomFoodFormOpen(false);
                }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {customFoodFormOpen ? (
                <View style={{ gap: 12 }}>
                  <Text style={styles.inputLabel}>Food Name *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Whey Protein Isolate"
                    placeholderTextColor={COLORS.textSecondary}
                    value={cfName}
                    onChangeText={setCfName}
                  />

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Serving Size</Text>
                      <TextInput
                        style={styles.modalInput}
                        keyboardType="numeric"
                        placeholder="100"
                        placeholderTextColor={COLORS.textSecondary}
                        value={cfServingSize}
                        onChangeText={setCfServingSize}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Serving Unit</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="g, ml, scoop, piece"
                        placeholderTextColor={COLORS.textSecondary}
                        value={cfServingUnit}
                        onChangeText={setCfServingUnit}
                      />
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Calories (kcal) *</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    placeholder="e.g. 120"
                    placeholderTextColor={COLORS.textSecondary}
                    value={cfCalories}
                    onChangeText={setCfCalories}
                  />

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Protein (g)</Text>
                      <TextInput
                        style={styles.modalInput}
                        keyboardType="numeric"
                        placeholder="24"
                        placeholderTextColor={COLORS.textSecondary}
                        value={cfProtein}
                        onChangeText={setCfProtein}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Carbs (g)</Text>
                      <TextInput
                        style={styles.modalInput}
                        keyboardType="numeric"
                        placeholder="2"
                        placeholderTextColor={COLORS.textSecondary}
                        value={cfCarbs}
                        onChangeText={setCfCarbs}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Fat (g)</Text>
                      <TextInput
                        style={styles.modalInput}
                        keyboardType="numeric"
                        placeholder="1"
                        placeholderTextColor={COLORS.textSecondary}
                        value={cfFats}
                        onChangeText={setCfFats}
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                    <TouchableOpacity
                      style={[styles.modalBtnSecondary, { flex: 1 }]}
                      onPress={() => setCustomFoodFormOpen(false)}
                    >
                      <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.primaryButton, { flex: 2 }, savingCustomFood && styles.disabled]}
                      onPress={handleSaveCustomFood}
                      disabled={savingCustomFood}
                    >
                      {savingCustomFood ? (
                        <ActivityIndicator color={COLORS.background} />
                      ) : (
                        <Text style={styles.primaryButtonText}>
                          {editingCustomFood ? "Save Changes" : "Save to My Foods"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => handleOpenCustomFoodForm()}
                  >
                    <Text style={styles.primaryButtonText}>+ Create New Custom Food</Text>
                  </TouchableOpacity>

                  <Text style={[styles.sectionMeta, { marginTop: 18, marginBottom: 10 }]}>
                    YOUR SAVED FOODS ({customFoods.length})
                  </Text>

                  {customFoods.length === 0 ? (
                    <View style={styles.emptyCustomBox}>
                      <Text style={styles.mutedText}>
                        You haven't created any custom foods yet. Click above to add your first custom food item.
                      </Text>
                    </View>
                  ) : (
                    customFoods.map((food) => (
                      <View key={food._id} style={styles.customFoodRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.customFoodName}>{food.name}</Text>
                          <Text style={styles.mutedText}>
                            {food.calories} kcal · P {food.protein}g · C {food.carbs}g · F {food.fats}g
                          </Text>
                          <Text style={[styles.mutedText, { fontSize: 10, marginTop: 2 }]}>
                            Per {food.servingSize || 100} {food.servingUnit || "g"}
                          </Text>
                        </View>

                        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                          <TouchableOpacity
                            style={styles.iconActionBtn}
                            onPress={() => handleOpenCustomFoodForm(food)}
                          >
                            <Text style={{ color: COLORS.primary, fontSize: 16 }}>✏️</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.iconActionBtn}
                            onPress={() => handleDeleteCustomFood(food)}
                          >
                            <Text style={{ color: COLORS.danger, fontSize: 16 }}>🗑️</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* --- MODAL 3: ADD MEAL WITH MULTIPLE FOODS --- */}
      <Modal
        visible={showMealModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMealModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "90%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Meal</Text>
              <TouchableOpacity onPress={() => setShowMealModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Select or Enter Meal Name</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                {[...PRESET_MEALS, "Custom"].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.mealChip,
                      mealModalName === m && styles.mealChipActive,
                    ]}
                    onPress={() => setMealModalName(m)}
                  >
                    <Text
                      style={[
                        styles.mealText,
                        mealModalName === m && styles.mealTextActive,
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {mealModalName === "Custom" && (
                <TextInput
                  style={[styles.modalInput, { marginBottom: 12 }]}
                  placeholder="Custom meal name (e.g. Post-Workout Snack)"
                  placeholderTextColor={COLORS.textSecondary}
                  value={customMealNameInput}
                  onChangeText={setCustomMealNameInput}
                />
              )}

              {/* Items currently added to this meal */}
              <View style={styles.mealSummaryCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.mealSectionTitle}>Meal Items ({mealItems.length})</Text>
                  <Text style={styles.mealSummaryTotals}>
                    {modalTotalCals} kcal | P {modalTotalProt}g · C {modalTotalCarbs}g · F {modalTotalFats}g
                  </Text>
                </View>

                {mealItems.length === 0 ? (
                  <Text style={[styles.mutedText, { marginTop: 6 }]}>
                    No food items added to this meal yet. Add items below.
                  </Text>
                ) : (
                  mealItems.map((item, idx) => (
                    <View key={idx} style={styles.tempItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.foodName}>{item.name}</Text>
                        <Text style={styles.mutedText}>
                          {item.quantity} {item.unit} · {item.calories} kcal · P {item.protein}g · C {item.carbs}g · F {item.fats}g
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveItemFromMeal(idx)}
                        style={{ padding: 4 }}
                      >
                        <Text style={{ color: COLORS.danger, fontWeight: "800" }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              {/* Food Item Selector */}
              <Text style={[styles.sectionTitle, { fontSize: 13, marginTop: 14, marginBottom: 8 }]}>
                Add Food to Meal
              </Text>

              <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                <TouchableOpacity
                  style={[
                    styles.tabSelectBtn,
                    itemSource === "custom" && styles.tabSelectBtnActive,
                  ]}
                  onPress={() => setItemSource("custom")}
                >
                  <Text
                    style={[
                      styles.tabSelectText,
                      itemSource === "custom" && styles.tabSelectTextActive,
                    ]}
                  >
                    Select From My Foods
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tabSelectBtn,
                    itemSource === "manual" && styles.tabSelectBtnActive,
                  ]}
                  onPress={() => setItemSource("manual")}
                >
                  <Text
                    style={[
                      styles.tabSelectText,
                      itemSource === "manual" && styles.tabSelectTextActive,
                    ]}
                  >
                    Enter Manually
                  </Text>
                </TouchableOpacity>
              </View>

              {itemSource === "custom" ? (
                <View style={{ gap: 10 }}>
                  {customFoods.length === 0 ? (
                    <View style={styles.emptyCustomBox}>
                      <Text style={styles.mutedText}>
                        No custom foods saved yet. You can create them in "+ My Food" or enter food manually.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.inputLabel}>Choose Food</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8, paddingBottom: 6 }}
                      >
                        {customFoods.map((cf) => {
                          const isSel = selectedCustomFoodId === cf._id;
                          return (
                            <TouchableOpacity
                              key={cf._id}
                              style={[
                                styles.foodChoiceChip,
                                isSel && styles.foodChoiceChipActive,
                              ]}
                              onPress={() => setSelectedCustomFoodId(cf._id || "")}
                            >
                              <Text
                                style={[
                                  styles.foodChoiceText,
                                  isSel && styles.foodChoiceTextActive,
                                ]}
                              >
                                {cf.name}
                              </Text>
                              <Text
                                style={[
                                  styles.foodChoiceSub,
                                  isSel && styles.foodChoiceTextActive,
                                ]}
                              >
                                {cf.calories} kcal ({cf.servingSize || 100}{cf.servingUnit || "g"})
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>

                      <Text style={styles.inputLabel}>Serving Multiplier / Quantity</Text>
                      <TextInput
                        style={styles.modalInput}
                        keyboardType="numeric"
                        placeholder="1 (e.g. 1.5 for 1.5x serving)"
                        placeholderTextColor={COLORS.textSecondary}
                        value={itemMultiplier}
                        onChangeText={setItemMultiplier}
                      />

                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={handleAddItemToMeal}
                      >
                        <Text style={styles.secondaryButtonText}>+ Add This Item</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Food Name (e.g. Scrambled Eggs)"
                    placeholderTextColor={COLORS.textSecondary}
                    value={manualItemName}
                    onChangeText={setManualItemName}
                  />

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TextInput
                      style={[styles.modalInput, { flex: 1 }]}
                      keyboardType="numeric"
                      placeholder="Calories (kcal) *"
                      placeholderTextColor={COLORS.textSecondary}
                      value={manualItemCals}
                      onChangeText={setManualItemCals}
                    />
                    <TextInput
                      style={[styles.modalInput, { flex: 1 }]}
                      placeholder="Unit (e.g. serving, 2 eggs)"
                      placeholderTextColor={COLORS.textSecondary}
                      value={manualItemUnit}
                      onChangeText={setManualItemUnit}
                    />
                  </View>

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput
                      style={[styles.modalInput, { flex: 1 }]}
                      keyboardType="numeric"
                      placeholder="Protein (g)"
                      placeholderTextColor={COLORS.textSecondary}
                      value={manualItemProt}
                      onChangeText={setManualItemProt}
                    />
                    <TextInput
                      style={[styles.modalInput, { flex: 1 }]}
                      keyboardType="numeric"
                      placeholder="Carbs (g)"
                      placeholderTextColor={COLORS.textSecondary}
                      value={manualItemCarbs}
                      onChangeText={setManualItemCarbs}
                    />
                    <TextInput
                      style={[styles.modalInput, { flex: 1 }]}
                      keyboardType="numeric"
                      placeholder="Fat (g)"
                      placeholderTextColor={COLORS.textSecondary}
                      value={manualItemFats}
                      onChangeText={setManualItemFats}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleAddItemToMeal}
                  >
                    <Text style={styles.secondaryButtonText}>+ Add This Item</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Save entire meal button */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { marginTop: 20 },
                  (mealItems.length === 0 || savingMeal) && styles.disabled,
                ]}
                onPress={handleSaveCompleteMeal}
                disabled={mealItems.length === 0 || savingMeal}
              >
                {savingMeal ? (
                  <ActivityIndicator color={COLORS.background} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Save Complete Meal ({formatDisplayDate(selectedDate)})
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  const safeTarget = target > 0 ? target : 1;
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
              width: `${Math.min(100, (amount / safeTarget) * 100)}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: SPACING.lg, paddingBottom: 40 },
  topHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: SPACING.sm,
    marginBottom: 4,
  },
  title: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.heading,
    fontWeight: "900",
    letterSpacing: -0.7,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: SPACING.sm,
  },
  headerPillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerPillBtnPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  headerPillText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "800",
  },
  headerPillTextPrimary: {
    color: COLORS.background,
  },

  // Date Navigation
  dateNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: SPACING.lg,
  },
  dateNavArrow: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  dateNavArrowText: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: "900",
  },
  dateCenterBox: {
    alignItems: "center",
  },
  dateMainText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },
  dateSubText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 1,
  },
  todayPill: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  todayPillText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: "900",
  },

  calorieCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
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
    marginBottom: 6,
  },
  valueRow: { flexDirection: "row", alignItems: "baseline", gap: 7 },
  calorieValue: {
    color: COLORS.text,
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: -1,
  },
  unit: { color: COLORS.textSecondary, fontSize: 13 },
  calorieIcon: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconText: { color: COLORS.primary, fontSize: 9, fontWeight: "900" },
  track: {
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    overflow: "hidden",
    marginVertical: 6,
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
  addMealButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  addMealButtonText: {
    color: COLORS.background,
    fontSize: 11,
    fontWeight: "800",
  },

  macroCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    gap: SPACING.lg,
  },
  macroRow: { gap: 8 },
  macroName: { color: COLORS.text, fontSize: 12, fontWeight: "700" },
  macroAmount: { color: COLORS.text, fontSize: 12, fontWeight: "800" },
  macroTrack: {
    height: 6,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.full,
    overflow: "hidden",
  },
  macroFill: { height: "100%", borderRadius: RADIUS.full },

  mealList: { gap: 8, paddingBottom: SPACING.md },
  mealChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 13,
    paddingVertical: 10,
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
    marginBottom: SPACING.xl,
  },
  mealSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
    marginBottom: 4,
  },
  mealSectionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  mealSectionCalories: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  emptyState: { alignItems: "center", paddingVertical: SPACING.lg, gap: 8 },
  emptyIcon: {
    color: COLORS.primary,
    fontSize: 26,
    backgroundColor: COLORS.surfaceElevated,
    width: 42,
    height: 42,
    textAlign: "center",
    textAlignVertical: "center",
    borderRadius: RADIUS.full,
    overflow: "hidden",
  },
  emptyTitle: { color: COLORS.text, fontSize: 13, fontWeight: "800" },

  foodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  foodIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  foodInfo: { flex: 1, gap: 4 },
  foodName: { color: COLORS.text, fontSize: 12, fontWeight: "800" },
  foodCalories: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "right",
  },

  primaryButton: {
    minHeight: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginTop: 10,
  },
  primaryButtonText: {
    color: COLORS.background,
    fontSize: 13,
    fontWeight: "900",
  },
  secondaryButton: {
    minHeight: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    marginTop: 12,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
  },

  form: { marginTop: SPACING.md, gap: 8 },
  formTitle: {
    color: COLORS.text,
    fontSize: 13,
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
    paddingVertical: 10,
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
    marginTop: SPACING.xl,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },
  modalCloseText: {
    color: COLORS.textSecondary,
    fontSize: 18,
    fontWeight: "700",
    padding: 4,
  },
  modalSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 16,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    color: COLORS.text,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  modalBtnSecondary: {
    minHeight: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginTop: 10,
  },
  modalBtnSecondaryText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },

  // Custom foods inside modal
  emptyCustomBox: {
    padding: 16,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    alignItems: "center",
    marginVertical: 10,
  },
  customFoodRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  customFoodName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },
  iconActionBtn: {
    padding: 6,
  },

  // Meal builder in modal
  mealSummaryCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginVertical: 8,
  },
  mealSummaryTotals: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
  },
  tempItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabSelectBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  tabSelectBtnActive: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.primary,
  },
  tabSelectText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  tabSelectTextActive: {
    color: COLORS.primary,
    fontWeight: "800",
  },
  foodChoiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  foodChoiceChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  foodChoiceText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
  foodChoiceTextActive: {
    color: COLORS.background,
  },
  foodChoiceSub: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
});
