
import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import {
  getNutritionLog,
  saveNutritionLog,
  addNutritionMeal,
  updateNutritionMeal,
  deleteNutritionMeal,
  updateFoodItem,
  getNutritionHistory,
} from "../controllers/nutritionController";
import {
  getCustomFoods,
  createCustomFood,
  updateCustomFood,
  deleteCustomFood,
  getNutritionTargets,
  updateNutritionTargets,
} from "../controllers/customFoodController";

const router = Router();

interface AuthRequest extends Request {
  userId?: string;
}

const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;

  if (!token) {
    res.status(401).json({ success: false, message: "Authentication token required" });
    return;
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ success: false, message: "JWT_SECRET is not configured" });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret);

    if (typeof decoded === "string") {
      res.status(401).json({ success: false, message: "Invalid token payload" });
      return;
    }

    const payload = decoded as jwt.JwtPayload;
    const id = payload.userId ?? payload.id ?? payload._id ?? payload.sub;

    if (!id || typeof id !== "string" || !mongoose.isValidObjectId(id)) {
      res.status(401).json({ success: false, message: "Invalid user in token" });
      return;
    }

    req.userId = id;
    (req as any).user = { id, _id: id };
    next();
  } catch (err: any) {
    const isExpired = err?.name === "TokenExpiredError";
    res.status(401).json({
      success: false,
      message: isExpired ? "Your session has expired. Please log in again." : "Invalid or expired token",
    });
  }
};

router.get("/", authenticate, getNutritionLog);
router.get("/history", authenticate, getNutritionHistory);
router.put("/", authenticate, saveNutritionLog);

// Targets
router.get("/targets", authenticate, getNutritionTargets);
router.put("/targets", authenticate, updateNutritionTargets);
router.patch("/targets", authenticate, updateNutritionTargets);

// Meals
router.post("/meal", authenticate, addNutritionMeal);
router.put("/meal/:mealId", authenticate, updateNutritionMeal);
router.patch("/meal/:mealId", authenticate, updateNutritionMeal);
router.patch("/meal/:mealId/food/:foodId", authenticate, updateFoodItem);
router.delete("/meal/:mealId", authenticate, deleteNutritionMeal);

// Custom foods
router.get("/custom-foods", authenticate, getCustomFoods);
router.post("/custom-foods", authenticate, createCustomFood);
router.put("/custom-foods/:id", authenticate, updateCustomFood);
router.patch("/custom-foods/:id", authenticate, updateCustomFood);
router.delete("/custom-foods/:id", authenticate, deleteCustomFood);

export default router;
