
import { Request, Response } from "express";
import mongoose from "mongoose";
import WorkoutSession from "../models/WorkoutSession";
import WorkoutPlan from "../models/WorkoutPlan";
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

// GET /api/dashboard?date=YYYY-MM-DD OR /api/dashboard/summary
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

    const [
      todaySessions,
      weekSessions,
      nutrition,
      water,
      latestMeasurement,
      workoutPlan,
      allUserSessions,
      lastPrevSession,
    ] = await Promise.all([
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

      WorkoutPlan.findOne({ userId }).lean(),

      WorkoutSession.find({ userId })
        .select("workoutDate status")
        .sort({ workoutDate: -1 })
        .lean(),

      WorkoutSession.findOne({
        userId,
        workoutDate: { $lt: selectedDate },
      })
        .sort({ workoutDate: -1 })
        .select("workoutDate")
        .lean(),
    ]);

    // 1. Calculate Real Workout Streak based on actual records
    const sessionDateSet = new Set<string>();
    for (const s of allUserSessions) {
      if (s.workoutDate) {
        sessionDateSet.add(dateString(new Date(s.workoutDate)));
      }
    }

    const todayStr = dateString(selectedDate);
    let streakDays = 0;
    let checkDate: Date;

    if (sessionDateSet.has(todayStr)) {
      streakDays = 1;
      checkDate = addDays(selectedDate, -1);
      while (sessionDateSet.has(dateString(checkDate))) {
        streakDays += 1;
        checkDate = addDays(checkDate, -1);
      }
    } else {
      const yesterdayStr = dateString(addDays(selectedDate, -1));
      if (sessionDateSet.has(yesterdayStr)) {
        streakDays = 1;
        checkDate = addDays(selectedDate, -2);
        while (sessionDateSet.has(dateString(checkDate))) {
          streakDays += 1;
          checkDate = addDays(checkDate, -1);
        }
      } else {
        streakDays = 0;
      }
    }

    const lastWorkoutDate = lastPrevSession
      ? dateString(new Date(lastPrevSession.workoutDate))
      : allUserSessions.length > 0 && sessionDateSet.has(todayStr)
      ? todayStr
      : null;

    // 2. Weekly Activity Map
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

    // 3. Workout Statistics Today
    const totalDurationMinutes = todaySessions.reduce(
      (total, session) => total + (session.durationMinutes || 0),
      0
    );

    const caloriesBurned = todaySessions.reduce(
      (total, session) => total + (session.caloriesBurned || 0),
      0
    );

    let completedSets = 0;
    let totalReps = 0;
    const completedExercisesList: Array<any> = [];

    for (const session of todaySessions) {
      for (const ex of session.exercises || []) {
        completedExercisesList.push(ex);
        for (const set of ex.sets || []) {
          if (set.completed) {
            completedSets += 1;
            totalReps += set.reps || 0;
          }
        }
      }
    }

    // Today's workout status
    let todayWorkoutStatus: "not_started" | "in_progress" | "completed" = "not_started";
    if (todaySessions.some((s: any) => s.status === "completed")) {
      todayWorkoutStatus = "completed";
    } else if (todaySessions.some((s: any) => s.status === "in_progress")) {
      todayWorkoutStatus = "in_progress";
    } else if (todaySessions.length > 0) {
      todayWorkoutStatus = "completed";
    }

    // Total planned exercises
    let totalPlannedExercises = 6;
    if (workoutPlan && Array.isArray(workoutPlan.plan) && workoutPlan.plan.length > 0) {
      const dayObj = (workoutPlan.plan[0] as any);
      if (Array.isArray(dayObj?.exercises) && dayObj.exercises.length > 0) {
        totalPlannedExercises = dayObj.exercises.length;
      }
    }
    const completedExercisesCount = completedExercisesList.length;
    const workoutCompletionPercentage = Math.min(
      100,
      Math.round((completedExercisesCount / Math.max(1, totalPlannedExercises)) * 100)
    );

    // 4. Nutrition Totals
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

    const dailyTargets = nutrition?.dailyTargets ?? {
      calories: 2000,
      protein: 100,
      carbs: 250,
      fats: 65,
      fiber: 25,
    };

    const caloriesRemaining = Math.max(0, dailyTargets.calories - nutritionTotals.calories);
    const nutritionCompletionPercentage = dailyTargets.calories > 0
      ? Math.min(100, Math.round((nutritionTotals.calories / dailyTargets.calories) * 100))
      : 0;

    // 5. Water Totals
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
          status: todayWorkoutStatus,
          sessions: todaySessions.length,
          durationMinutes: totalDurationMinutes,
          caloriesBurned,
          completedSets,
          totalReps,
          completedExercises: completedExercisesCount,
          totalExercises: totalPlannedExercises,
          completionPercentage: workoutCompletionPercentage,
          lastWorkoutDate,
          streakDays,
          items: todaySessions,
          completedExercisesList,
        },
        nutrition: {
          consumed: nutritionTotals,
          targets: dailyTargets,
          consumedCalories: nutritionTotals.calories,
          targetCalories: dailyTargets.calories,
          proteinG: nutritionTotals.protein,
          carbsG: nutritionTotals.carbs,
          fatsG: nutritionTotals.fats,
          caloriesRemaining,
          completionPercentage: nutritionCompletionPercentage,
          proteinRemaining: Math.max(0, dailyTargets.protein - nutritionTotals.protein),
          carbsRemaining: Math.max(0, dailyTargets.carbs - nutritionTotals.carbs),
          fatsRemaining: Math.max(0, dailyTargets.fats - nutritionTotals.fats),
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
        // Flat top-level convenience properties
        streak: streakDays,
        streakDays,
        todayWorkoutStatus,
        lastWorkoutDate,
        completedSets,
        totalReps,
        workoutCalories: caloriesBurned,
        completedExercises: completedExercisesCount,
        totalExercises: totalPlannedExercises,
        caloriesConsumed: nutritionTotals.calories,
        calorieGoal: dailyTargets.calories,
        caloriesRemaining,
        proteinConsumed: nutritionTotals.protein,
        proteinGoal: dailyTargets.protein,
        carbsConsumed: nutritionTotals.carbs,
        carbsGoal: dailyTargets.carbs,
        fatsConsumed: nutritionTotals.fats,
        fatsGoal: dailyTargets.fats,
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
