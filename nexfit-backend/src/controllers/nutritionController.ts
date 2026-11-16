
import { Request, Response } from "express";
import mongoose from "mongoose";
import NutritionLog from "../models/NutritionLog";

interface AuthRequest extends Request {
  userId?: string;
}

const validDate = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) &&
  new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;

const dateRange = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, month - 1, day)),
    end: new Date(Date.UTC(year, month - 1, day + 1)),
  };
};

const isNonNegative = (value: unknown): boolean =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

const isValidTargets = (targets: Record<string, unknown>): boolean =>
  ["calories", "protein", "carbs", "fats", "fiber"].every(
    (key) => targets[key] === undefined || isNonNegative(targets[key])
  );

const isValidFood = (food: Record<string, unknown>): boolean => {
  if (food.fiber === undefined || food.fiber === null) {
    food.fiber = 0;
  }
  return (
    typeof food.name === "string" &&
    food.name.trim().length > 0 &&
    typeof food.unit === "string" &&
    food.unit.trim().length > 0 &&
    isNonNegative(food.quantity) &&
    ["calories", "protein", "carbs", "fats", "fiber"].every((key) =>
      isNonNegative(food[key])
    )
  );
};

const isValidMeals = (meals: unknown): boolean =>
  Array.isArray(meals) &&
  meals.every(
    (meal: Record<string, unknown>) =>
      typeof meal.name === "string" &&
      meal.name.trim().length > 0 &&
      Array.isArray(meal.foods) &&
      meal.foods.every(
        (food: Record<string, unknown>) => isValidFood(food)
      )
  );

const getUserId = (req: AuthRequest): string | null =>
  req.userId && mongoose.isValidObjectId(req.userId) ? req.userId : null;

// GET /api/nutrition?date=2026-10-18
export const getNutritionLog = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const date = req.query.date;

    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (!validDate(date)) {
      res.status(400).json({
        success: false,
        message: "Provide date in YYYY-MM-DD format",
      });
      return;
    }

    const { start, end } = dateRange(date);
    const log = await NutritionLog.findOne({
      userId,
      logDate: { $gte: start, $lt: end },
    });

    const meals = log?.meals ?? [];
    const totals = meals.reduce(
      (total, meal) => {
        for (const food of meal.foods) {
          total.calories += food.calories;
          total.protein += food.protein;
          total.carbs += food.carbs;
          total.fats += food.fats;
          total.fiber += food.fiber;
        }
        return total;
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
    );

    res.status(200).json({
      success: true,
      date,
      log,
      totals,
      targets: log?.dailyTargets ?? {
        calories: 2000,
        protein: 100,
        carbs: 250,
        fats: 65,
        fiber: 25,
      },
    });
  } catch (error) {
    console.error("Get nutrition log error:", error);
    res.status(500).json({ success: false, message: "Failed to get nutrition log" });
  }
};

// PUT /api/nutrition?date=2026-10-18
// Replace that day's meals and/or update its daily targets.
export const saveNutritionLog = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const date = req.query.date;

    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (!validDate(date)) {
      res.status(400).json({
        success: false,
        message: "Provide date in YYYY-MM-DD format",
      });
      return;
    }

    const { meals, dailyTargets } = req.body;

    if (meals !== undefined && !isValidMeals(meals)) {
      res.status(400).json({ success: false, message: "Invalid meals or food items" });
      return;
    }

    if (
      dailyTargets !== undefined &&
      (!dailyTargets ||
        typeof dailyTargets !== "object" ||
        !isValidTargets(dailyTargets))
    ) {
      res.status(400).json({ success: false, message: "Invalid daily targets" });
      return;
    }

    if (meals === undefined && dailyTargets === undefined) {
      res.status(400).json({
        success: false,
        message: "Provide meals or dailyTargets",
      });
      return;
    }

    const { start, end } = dateRange(date);
    const update: Record<string, unknown> = {};

    if (meals !== undefined) update.meals = meals;
    if (dailyTargets !== undefined) {
      update.dailyTargets = dailyTargets;
    }

    const log = await NutritionLog.findOneAndUpdate(
      { userId, logDate: { $gte: start, $lt: end } },
      {
        $set: update,
        $setOnInsert: { userId, logDate: start },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Nutrition log saved",
      log,
    });
  } catch (error) {
    console.error("Save nutrition log error:", error);
    res.status(500).json({ success: false, message: "Failed to save nutrition log" });
  }
};

// POST /api/nutrition/meal?date=2026-10-18
export const addNutritionMeal = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const date = req.query.date;
    const meal = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (!validDate(date)) {
      res.status(400).json({ success: false, message: "Invalid date; use YYYY-MM-DD" });
      return;
    }

    if (!isValidMeals([meal])) {
      res.status(400).json({ success: false, message: "Invalid meal or food items" });
      return;
    }

    const { start, end } = dateRange(date);

    let log = await NutritionLog.findOne({
      userId,
      logDate: { $gte: start, $lt: end },
    });

    if (!log) {
      log = await NutritionLog.create({
        userId,
        logDate: start,
        meals: [meal],
      });
    } else {
      const existingMeal = log.meals.find(
        (m: any) => m.name.trim().toLowerCase() === meal.name.trim().toLowerCase()
      );
      if (existingMeal && Array.isArray(meal.foods)) {
        existingMeal.foods.push(...meal.foods);
      } else {
        log.meals.push(meal);
      }
      await log.save();
    }

    res.status(201).json({
      success: true,
      message: "Meal added",
      log,
    });
  } catch (error) {
    console.error("Add nutrition meal error:", error);
    res.status(500).json({ success: false, message: "Failed to add meal" });
  }
};

// PATCH /api/nutrition/meal/:mealId?date=2026-10-18
export const updateNutritionMeal = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const date = req.query.date;
    const { mealId } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (
      !validDate(date) ||
      typeof mealId !== "string" ||
      !mongoose.isValidObjectId(mealId)
    ) {
      res.status(400).json({ success: false, message: "Invalid date or meal ID" });
      return;
    }

    if (!isValidMeals([req.body])) {
      res.status(400).json({ success: false, message: "Invalid meal or food items" });
      return;
    }

    const { start, end } = dateRange(date);
    const log = await NutritionLog.findOne({
      userId,
      logDate: { $gte: start, $lt: end },
    });

    if (!log) {
      res.status(404).json({ success: false, message: "Nutrition log not found" });
      return;
    }

    const meal = log.meals.id(mealId);

    if (!meal) {
      res.status(404).json({ success: false, message: "Meal not found" });
      return;
    }

    meal.set({
      name: req.body.name,
      time: req.body.time,
      foods: req.body.foods,
      notes: req.body.notes,
    });

    await log.save();

    res.status(200).json({ success: true, message: "Meal updated", log });
  } catch (error) {
    console.error("Update nutrition meal error:", error);
    res.status(500).json({ success: false, message: "Failed to update meal" });
  }
};

// DELETE /api/nutrition/meal/:mealId?date=2026-10-18&foodId=...
export const deleteNutritionMeal = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const date = req.query.date;
    const foodId = req.query.foodId as string | undefined;
    const { mealId } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (
      !validDate(date) ||
      typeof mealId !== "string" ||
      !mongoose.isValidObjectId(mealId)
    ) {
      res.status(400).json({ success: false, message: "Invalid date or meal ID" });
      return;
    }

    const { start, end } = dateRange(date);
    const log = await NutritionLog.findOne({
      userId,
      logDate: { $gte: start, $lt: end },
    });

    if (!log) {
      res.status(404).json({ success: false, message: "Nutrition log not found" });
      return;
    }

    const meal = log.meals.id(mealId);

    if (!meal) {
      res.status(404).json({ success: false, message: "Meal not found" });
      return;
    }

    // If foodId is specified, delete only that specific food item from the meal
    if (foodId) {
      const foodItem = (meal.foods as any).id?.(foodId);
      const exists = foodItem || meal.foods.some((f: any) => String(f._id || f.id) === foodId);

      if (!exists) {
        res.status(404).json({ success: false, message: "Food item not found in meal" });
        return;
      }

      (meal.foods as any).pull({ _id: foodId });

      // If no foods remain in the meal after removing the item, remove the meal container
      if (meal.foods.length === 0) {
        meal.deleteOne();
      }

      await log.save();
      res.status(200).json({ success: true, message: "Food item deleted", log });
      return;
    }

    // Existing contract preserved: deleting the meal removes the whole meal
    meal.deleteOne();
    await log.save();

    res.status(200).json({ success: true, message: "Meal deleted", log });
  } catch (error) {
    console.error("Delete nutrition meal error:", error);
    res.status(500).json({ success: false, message: "Failed to delete meal" });
  }
};

// PATCH /api/nutrition/meal/:mealId/food/:foodId?date=2026-10-18
export const updateFoodItem = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);
    const date = req.query.date;
    const { mealId, foodId } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (!validDate(date) || !mongoose.isValidObjectId(mealId)) {
      res.status(400).json({ success: false, message: "Invalid date or meal ID" });
      return;
    }

    const { start, end } = dateRange(date);
    const log = await NutritionLog.findOne({
      userId,
      logDate: { $gte: start, $lt: end },
    });

    if (!log) {
      res.status(404).json({ success: false, message: "Nutrition log not found" });
      return;
    }

    const mealIdStr = Array.isArray(mealId) ? mealId[0] : String(mealId);
    const foodIdStr = Array.isArray(foodId) ? foodId[0] : String(foodId);

    const meal = log.meals.id(mealIdStr);
    if (!meal) {
      res.status(404).json({ success: false, message: "Meal not found" });
      return;
    }

    const food = (meal.foods as any).id?.(foodIdStr) || meal.foods.find((f: any) => String(f._id || f.id) === foodIdStr);
    if (!food) {
      res.status(404).json({ success: false, message: "Food item not found in meal" });
      return;
    }

    if (req.body.name !== undefined) food.name = String(req.body.name).trim();
    if (req.body.unit !== undefined) food.unit = String(req.body.unit).trim();
    if (req.body.quantity !== undefined) food.quantity = Number(req.body.quantity);
    if (req.body.calories !== undefined) food.calories = Number(req.body.calories);
    if (req.body.protein !== undefined) food.protein = Number(req.body.protein);
    if (req.body.carbs !== undefined) food.carbs = Number(req.body.carbs);
    if (req.body.fats !== undefined) food.fats = Number(req.body.fats);
    if (req.body.fiber !== undefined) food.fiber = Number(req.body.fiber);

    await log.save();

    res.status(200).json({
      success: true,
      message: "Food item updated successfully",
      log,
      food,
    });
  } catch (error) {
    console.error("Update food item error:", error);
    res.status(500).json({ success: false, message: "Failed to update food item" });
  }
};

// GET /api/nutrition/history?from=YYYY-MM-DD&to=YYYY-MM-DD&month=YYYY-MM&page=1&limit=20
export const getNutritionHistory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const { from, to, month } = req.query;
    const filter: Record<string, unknown> = { userId };

    if (typeof month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      const [year, mNum] = month.split("-").map(Number);
      const start = new Date(Date.UTC(year, mNum - 1, 1));
      const end = new Date(Date.UTC(year, mNum, 1));
      filter.logDate = { $gte: start, $lt: end };
    } else if (from || to) {
      const range: Record<string, Date> = {};
      if (typeof from === "string" && validDate(from)) {
        range.$gte = new Date(`${from}T00:00:00.000Z`);
      }
      if (typeof to === "string" && validDate(to)) {
        const toDate = new Date(`${to}T00:00:00.000Z`);
        toDate.setUTCDate(toDate.getUTCDate() + 1);
        range.$lt = toDate;
      }
      if (Object.keys(range).length > 0) {
        filter.logDate = range;
      }
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const [logs, total] = await Promise.all([
      NutritionLog.find(filter)
        .sort({ logDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      NutritionLog.countDocuments(filter),
    ]);

    const historyItems = logs.map((log) => {
      const dateStr = log.logDate.toISOString().slice(0, 10);
      const totals = (log.meals || []).reduce(
        (acc, meal) => {
          for (const food of meal.foods || []) {
            acc.calories += food.calories || 0;
            acc.protein += food.protein || 0;
            acc.carbs += food.carbs || 0;
            acc.fats += food.fats || 0;
            acc.fiber += food.fiber || 0;
          }
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
      );

      return {
        _id: log._id,
        date: dateStr,
        totals,
        targets: log.dailyTargets,
        mealsCount: log.meals?.length || 0,
        foodsCount: (log.meals || []).reduce((acc, m) => acc + (m.foods?.length || 0), 0),
        meals: log.meals,
      };
    });

    res.status(200).json({
      success: true,
      data: historyItems,
      history: historyItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get nutrition history error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch nutrition history" });
  }
};
