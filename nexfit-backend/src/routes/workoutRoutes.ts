
import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import WorkoutPlan from "../models/WorkoutPlan";
import {
  completeExercise,
  completeSession,
  startWorkoutSession,
} from "../controllers/workoutSessionController";
import { getWorkoutHistory } from "../controllers/workoutHistoryController";
import {
  getCustomExercises,
  createCustomExercise,
  updateCustomExercise,
  deleteCustomExercise,
} from "../controllers/customExerciseController";

const router = Router();

interface AuthRequest extends Request {
  userId?: string;
}

const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication token required" });
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(500).json({ success: false, message: "JWT_SECRET is not configured" });
  }

  try {
    const decoded = jwt.verify(token, secret);

    if (typeof decoded === "string") {
      return res.status(401).json({ success: false, message: "Invalid token payload" });
    }

    const payload = decoded as jwt.JwtPayload;
    const id = payload.userId ?? payload.id ?? payload._id ?? payload.sub;

    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(401).json({ success: false, message: "Invalid user in token" });
    }

    req.userId = id;
    (req as any).user = { id, _id: id };
    next();
  } catch (err: any) {
    if (err?.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Session expired. Please sign in again.", expired: true });
    }
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

// GET /api/workouts/me
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const workout = await WorkoutPlan.findOne({ userId: req.userId });

    return res.status(200).json({
      success: true,
      workout,
    });
  } catch (error) {
    console.error("Get workout error:", error);
    return res.status(500).json({ message: "Failed to retrieve workout" });
  }
});

// POST /api/workouts
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { preferences, plan, completedExercises } = req.body;

    if (
      !preferences ||
      !Array.isArray(plan) ||
      typeof preferences.goal !== "string" ||
      typeof preferences.level !== "string" ||
      typeof preferences.location !== "string" ||
      typeof preferences.mode !== "string" ||
      !Number.isInteger(preferences.daysPerWeek) ||
      !Number.isFinite(preferences.duration) ||
      preferences.daysPerWeek < 1 ||
      preferences.daysPerWeek > 7 ||
      preferences.duration < 10 ||
      preferences.duration > 180
    ) {
      return res.status(400).json({
        message: "Valid preferences and workout plan are required",
      });
    }

    const existing = await WorkoutPlan.findOne({ userId: req.userId });
    const updateOps: any = {
      $set: {
        preferences,
        plan,
      },
    };

    if (
      existing?.preferences &&
      JSON.stringify(existing.preferences) !== JSON.stringify(preferences)
    ) {
      updateOps.$push = {
        preferenceHistory: {
          preferences: existing.preferences,
          effectiveDate: new Date(),
          createdAt: new Date(),
        },
      };
    }

    if (Array.isArray(completedExercises) && completedExercises.length > 0) {
      updateOps.$set.completedExercises = completedExercises;
    } else if (existing?.completedExercises && existing.completedExercises.length > 0) {
      // Preserve existing completed exercises
      updateOps.$set.completedExercises = existing.completedExercises;
    }

    const workout = await WorkoutPlan.findOneAndUpdate(
      { userId: req.userId },
      updateOps,
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Workout plan saved successfully",
      workout,
    });
  } catch (error) {
    console.error("Save workout error:", error);
    return res.status(500).json({ message: "Failed to save workout plan" });
  }
});

// PATCH /api/workouts/completed
router.patch(
  "/completed",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { completedExercises } = req.body;

      if (
        !Array.isArray(completedExercises) ||
        !completedExercises.every((item) => typeof item === "string")
      ) {
        return res.status(400).json({
          message: "completedExercises must be an array of strings",
        });
      }

      const workout = await WorkoutPlan.findOneAndUpdate(
        { userId: req.userId },
        { $set: { completedExercises } },
        { new: true, runValidators: true }
      );

      if (!workout) {
        return res.status(404).json({
          message: "Create a workout plan before updating progress",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Workout progress updated",
        workout,
      });
    } catch (error) {
      console.error("Update workout progress error:", error);
      return res.status(500).json({
        message: "Failed to update workout progress",
      });
    }
  }
);

// Connected workout routes for dashboard and sessions
router.post("/start", authenticate, startWorkoutSession);
router.post("/complete-exercise", authenticate, completeExercise);
router.post("/complete-session", authenticate, completeSession);
router.get("/history", authenticate, getWorkoutHistory);

// Custom exercises routes
router.get("/custom-exercises", authenticate, getCustomExercises);
router.post("/custom-exercises", authenticate, createCustomExercise);
router.put("/custom-exercises/:id", authenticate, updateCustomExercise);
router.patch("/custom-exercises/:id", authenticate, updateCustomExercise);
router.delete("/custom-exercises/:id", authenticate, deleteCustomExercise);

export default router;
