import { Request, Response } from "express";
import mongoose from "mongoose";
import CustomFood from "../models/CustomFood";
import User from "../models/User";
import NutritionLog from "../models/NutritionLog";

interface AuthRequest extends Request {
  userId?: string;
}

const getUserId = (req: any): string | null => {
  const id = req.userId ?? req.user?.id ?? req.user?._id;
  return id && mongoose.isValidObjectId(id) ? String(id) : null;
};

// GET /api/nutrition/custom-foods
export const getCustomFoods = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const foods = await CustomFood.find({ userId })
      .sort({ name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: foods,
      foods,
    });
  } catch (error) {
    console.error("Get custom foods error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve custom foods",
    });
  }
};

// POST /api/nutrition/custom-foods
export const createCustomFood = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const { name, calories, protein, carbs, fats, fiber, servingSize, servingUnit } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({
        success: false,
        message: "Food name is required",
      });
      return;
    }

    const parsedCalories = Number(calories);
    const parsedProtein = Number(protein ?? 0);
    const parsedCarbs = Number(carbs ?? 0);
    const parsedFats = Number(fats ?? 0);
    const parsedFiber = Number(fiber ?? 0);
    const parsedServingSize = Number(servingSize ?? 1);

    if (!Number.isFinite(parsedCalories) || parsedCalories < 0) {
      res.status(400).json({
        success: false,
        message: "Calories must be a valid non-negative number",
      });
      return;
    }

    if ([parsedProtein, parsedCarbs, parsedFats, parsedFiber].some((n) => !Number.isFinite(n) || n < 0)) {
      res.status(400).json({
        success: false,
        message: "Macros must be valid non-negative numbers",
      });
      return;
    }

    const food = await CustomFood.create({
      userId,
      name: name.trim(),
      calories: parsedCalories,
      protein: parsedProtein,
      carbs: parsedCarbs,
      fats: parsedFats,
      fiber: parsedFiber,
      servingSize: parsedServingSize > 0 ? parsedServingSize : 1,
      servingUnit: typeof servingUnit === "string" && servingUnit.trim() ? servingUnit.trim() : "serving",
      isCustom: true,
    });

    res.status(201).json({
      success: true,
      message: "Custom food created successfully",
      food,
      data: food,
    });
  } catch (error) {
    console.error("Create custom food error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create custom food",
    });
  }
};

// PUT or PATCH /api/nutrition/custom-foods/:id
export const updateCustomFood = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Valid food ID required" });
      return;
    }

    const food = await CustomFood.findOne({ _id: id, userId });
    if (!food) {
      res.status(404).json({
        success: false,
        message: "Custom food not found or unauthorized",
      });
      return;
    }

    const { name, calories, protein, carbs, fats, fiber, servingSize, servingUnit } = req.body;

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        res.status(400).json({ success: false, message: "Valid name required" });
        return;
      }
      food.name = name.trim();
    }

    if (calories !== undefined) {
      const c = Number(calories);
      if (!Number.isFinite(c) || c < 0) {
        res.status(400).json({ success: false, message: "Calories must be non-negative" });
        return;
      }
      food.calories = c;
    }

    if (protein !== undefined) {
      const p = Number(protein);
      if (!Number.isFinite(p) || p < 0) {
        res.status(400).json({ success: false, message: "Protein must be non-negative" });
        return;
      }
      food.protein = p;
    }

    if (carbs !== undefined) {
      const c = Number(carbs);
      if (!Number.isFinite(c) || c < 0) {
        res.status(400).json({ success: false, message: "Carbs must be non-negative" });
        return;
      }
      food.carbs = c;
    }

    if (fats !== undefined) {
      const f = Number(fats);
      if (!Number.isFinite(f) || f < 0) {
        res.status(400).json({ success: false, message: "Fats must be non-negative" });
        return;
      }
      food.fats = f;
    }

    if (fiber !== undefined) {
      const fb = Number(fiber);
      if (!Number.isFinite(fb) || fb < 0) {
        res.status(400).json({ success: false, message: "Fiber must be non-negative" });
        return;
      }
      food.fiber = fb;
    }

    if (servingSize !== undefined) {
      const ss = Number(servingSize);
      if (!Number.isFinite(ss) || ss <= 0) {
        res.status(400).json({ success: false, message: "Serving size must be greater than 0" });
        return;
      }
      food.servingSize = ss;
    }

    if (servingUnit !== undefined) {
      food.servingUnit = String(servingUnit).trim() || "serving";
    }

    await food.save();

    res.status(200).json({
      success: true,
      message: "Custom food updated successfully",
      food,
      data: food,
    });
  } catch (error) {
    console.error("Update custom food error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update custom food",
    });
  }
};

// DELETE /api/nutrition/custom-foods/:id
export const deleteCustomFood = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Valid food ID required" });
      return;
    }

    const food = await CustomFood.findOneAndDelete({ _id: id, userId });
    if (!food) {
      res.status(404).json({
        success: false,
        message: "Custom food not found or unauthorized",
      });
      return;
    }

    // Historical nutrition logs are untouched
    res.status(200).json({
      success: true,
      message: "Custom food deleted successfully. Historical meals remain preserved.",
    });
  } catch (error) {
    console.error("Delete custom food error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete custom food",
    });
  }
};

// GET /api/nutrition/targets
export const getNutritionTargets = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const user = await User.findById(userId).select("nutritionTargets").lean();
    const defaultTargets = {
      calories: 2000,
      protein: 100,
      carbs: 250,
      fats: 65,
      fiber: 25,
    };

    const targets = (user as any)?.nutritionTargets || defaultTargets;

    res.status(200).json({
      success: true,
      targets,
      data: targets,
    });
  } catch (error) {
    console.error("Get nutrition targets error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get nutrition targets",
    });
  }
};

// PUT or PATCH /api/nutrition/targets
export const updateNutritionTargets = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const { calories, protein, carbs, fats, fiber, date } = req.body;

    const parsedCalories = Number(calories);
    if (!Number.isFinite(parsedCalories) || parsedCalories < 0) {
      res.status(400).json({
        success: false,
        message: "Daily calories target must be a non-negative number",
      });
      return;
    }

    const targetsObj = {
      calories: parsedCalories,
      protein: typeof protein === "number" && protein >= 0 ? protein : 100,
      carbs: typeof carbs === "number" && carbs >= 0 ? carbs : 250,
      fats: typeof fats === "number" && fats >= 0 ? fats : 65,
      fiber: typeof fiber === "number" && fiber >= 0 ? fiber : 25,
    };

    // 1. Update user's personalized default targets
    await User.findByIdAndUpdate(userId, {
      $set: { nutritionTargets: targetsObj },
    });

    // 2. Also update today's or target date's NutritionLog dailyTargets without touching meals!
    const targetDateStr = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : new Date().toISOString().slice(0, 10);

    const [year, month, day] = targetDateStr.split("-").map(Number);
    const start = new Date(Date.UTC(year, month - 1, day));
    const end = new Date(Date.UTC(year, month - 1, day + 1));

    await NutritionLog.findOneAndUpdate(
      { userId, logDate: { $gte: start, $lt: end } },
      {
        $set: { dailyTargets: targetsObj },
        $setOnInsert: { userId, logDate: start, meals: [] },
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: "Nutrition targets updated successfully",
      targets: targetsObj,
      data: targetsObj,
    });
  } catch (error) {
    console.error("Update nutrition targets error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update nutrition targets",
    });
  }
};
