
import { Request, Response } from "express";
import mongoose from "mongoose";
import WorkoutSession from "../models/WorkoutSession";
import NutritionLog from "../models/NutritionLog";
import WaterLog from "../models/WaterLog";
import BodyMeasurement from "../models/BodyMeasurement";

function getUserId(req: Request): string | null {
  const userId = (req as Request & { userId?: string }).userId;
  return userId && mongoose.Types.ObjectId.isValid(userId)
    ? userId
    : null;
}

function getDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? date
    : null;
}

function dateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

// GET /api/dashboard?date=YYYY-MM-DD
export async function getDashboard(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const selectedDate = req.query.date
      ? getDate(req.query.date)
      : new Date(`${dateString(new Date())}T00:00:00.000Z`);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!selectedDate) {
      return res.status(400).json({
        success: false,
        message: "date must use YYYY-MM-DD format",
      });
    }

    const nextDay = addDays(selectedDate, 1);
    const weekStart = addDays(selectedDate, -6);
    const weekEnd = addDays(selectedDate, 1);

    const [todaySessions, weekSessions, nutrition, water, latestMeasurement] =
      await Promise.all([
        WorkoutSession.find({
          userId,
          workoutDate: { $gte: selectedDate, $lt: nextDay },
        }).sort({ workoutDate: 1 }).lean(),

        WorkoutSession.find({
          userId,
          workoutDate: { $gte: weekStart, $lt: weekEnd },
        }).sort({ workoutDate: 1 }).lean(),

        NutritionLog.findOne({
          userId,
          logDate: selectedDate,
        }).lean(),

        WaterLog.findOne({
          userId,
          logDate: selectedDate,
        }).lean(),

        BodyMeasurement.findOne({ userId })
          .sort({ measuredAt: -1 })
          .lean(),
      ]);

    const weekMap = new Map<
      string,
      { date: string; sessions: number; durationMinutes: number; caloriesBurned: number }
    >();

    for (let i = 0; i < 7; i++) {
      const day = dateString(addDays(weekStart, i));
      weekMap.set(day, {
        date: day,
        sessions: 0,
        durationMinutes: 0,
        caloriesBurned: 0,
      });
    }

    for (const session of weekSessions) {
      const key = dateString(new Date(session.workoutDate));
      const entry = weekMap.get(key);
      if (!entry) continue;

      entry.sessions += 1;
      entry.durationMinutes += session.durationMinutes || 0;
      entry.caloriesBurned += session.caloriesBurned || 0;
    }

    const totalDurationMinutes = todaySessions.reduce(
      (total, session) => total + (session.durationMinutes || 0),
      0
    );

    const caloriesBurned = todaySessions.reduce(
      (total, session) => total + (session.caloriesBurned || 0),
      0
    );

    const completedSets = todaySessions.reduce(
      (total, session) =>
        total +
        session.exercises.reduce(
          (exerciseTotal, exercise) =>
            exerciseTotal +
            exercise.sets.filter((set) => set.completed).length,
          0
        ),
      0
    );

    const nutritionTotals = (nutrition?.meals || []).reduce(
      (totals, meal) => {
        for (const food of meal.foods || []) {
          totals.calories += food.calories || 0;
          totals.protein += food.protein || 0;
          totals.carbs += food.carbs || 0;
          totals.fats += food.fats || 0;
          totals.fiber += food.fiber || 0;
        }
        return totals;
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
    );

    const waterConsumedMl = (water?.entries || []).reduce(
      (total, entry) => total + entry.amountMl,
      0
    );

    const waterTargetMl = water?.dailyTargetMl ?? 2500;

    return res.status(200).json({
      success: true,
      data: {
        date: dateString(selectedDate),
        workout: {
          sessions: todaySessions.length,
          durationMinutes: totalDurationMinutes,
          caloriesBurned,
          completedSets,
          items: todaySessions,
        },
        nutrition: {
          consumed: nutritionTotals,
          targets: nutrition?.dailyTargets ?? {
            calories: 2000,
            protein: 100,
            carbs: 250,
            fats: 65,
            fiber: 25,
          },
        },
        hydration: {
          consumedMl: waterConsumedMl,
          targetMl: waterTargetMl,
          remainingMl: Math.max(0, waterTargetMl - waterConsumedMl),
          progressPercentage: waterTargetMl > 0
            ? Math.min(100, Math.round((waterConsumedMl / waterTargetMl) * 100))
            : 0,
        },
        body: {
          latestMeasurement,
        },
        weeklyActivity: Array.from(weekMap.values()),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard",
      error: getErrorMessage(error),
    });
  }
}
